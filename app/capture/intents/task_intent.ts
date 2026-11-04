import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CaptureIntent, IntentDraft } from '#capture/intent'
import {
  cleanLabel,
  cleanTitle,
  cutSpans,
  extractAmount,
  extractDate,
  extractRecurrence,
  extractTime,
} from '#capture/extractors'
import { numberField, pick, read, selectField, textField } from '#capture/fields'
import { normalize, type NormalizedInput } from '#capture/normalizer'
import TaskService from '#domains/lists/services/task_service'
import { taskValidator } from '#domains/lists/validators/task'
import { fromIsoDate, now, today } from '#support/dates'
import { formatDate, formatLongDate } from '#support/format'
import type { CaptureEffect, CaptureField, CaptureOverrides } from '#shared/types/capture'
import type { Domain } from '#shared/types/domain'
import type { Recurrence } from '#shared/types/lists'

/**
 * Words that announce a task, tested on the normalized text.
 */
const MARKERS =
  /\b(?:a faire|todo|rappel(?:le|ler|er)?(?: moi)?|penser a|pense a|n oublie pas|oublie pas|ne pas oublier|tache|rdv|rendez vous|appeler|telephoner|prendre rendez|il faut)\b/

/**
 * Leading phrases removed from the title.
 */
const PREFIX =
  /^\s*(?:(?:[àa]\s+faire|todo|rappel|t[âa]che)\s*:\s*|(?:rappelle[- ]moi\s+(?:de\s+|d['’]\s*)?|penser\s+[àa]\s+|pense\s+[àa]\s+|n['’]oublie\s+pas\s+(?:de\s+|d['’]\s*)?|ne\s+pas\s+oublier\s+(?:de\s+|d['’]\s*)?|il\s+faut\s+))/i

const MEAL_WORDS = /\b(?:midi|soir|dejeuner|diner|souper|repas|manger|mange)\b/

const DOMAIN_WORDS: Array<[Domain, RegExp]> = [
  [
    'auto',
    /\b(?:voiture|garage|vidange|pneus?|controle technique|carrosserie|parebrise|permis|carte grise)\b/,
  ],
  [
    'maison',
    /\b(?:plombier|electricien|ampoules?|menage|poubelles?|jardin|chaudiere|maison|appart(?:ement)?|linge|lessive|aspirateur|bricolage|syndic|proprio)\b/,
  ],
  ['budget', /\b(?:banque|impots?|virement|compte|epargne|banquier|assurance|mutuelle)\b/],
  ['menu', /\b(?:cuisine|frigo|congelateur|recette|four|repas)\b/],
]

/**
 * A recurring household chore lands in the « Ménage » section of the home.
 */
export const CHORE_WORDS =
  /\b(?:menage|aspirateur|aspirer|sols?|serpilliere|poussiere|vitres?|carreaux|draps|linge|lessive|repassage|poubelles?|salle de bain|toilettes|wc|frigo|four|congelateur|degivrer|detartrer|arroser|plantes|litiere|vaisselle)\b/

const RECURRENCE_LABELS: Record<Recurrence, [string, string]> = {
  daily: ['jour', 'jours'],
  weekly: ['semaine', 'semaines'],
  monthly: ['mois', 'mois'],
  yearly: ['an', 'ans'],
}

export type ParsedTask = {
  title: string
  dueOn: DateTime | null
  dueTime: string | null
  recurrence: Recurrence | null
  interval: number
  domain: Domain | null
  items: string[]
}

/**
 * Pure extraction step of the task intent.
 */
export function parseTask(raw: string, reference: DateTime = now()): ParsedTask {
  let text = raw.replace(PREFIX, '')

  /**
   * Checklist: « préparer les vacances : valises, passeports » or
   * « vider le garage (cartons, vélo) ».
   */
  let items: string[] = []
  const list = /\s*(?::\s*(.+)$|\(([^)]+)\))/.exec(text)
  if (list && /[,;]|\bet\b/.test(list[1] ?? list[2])) {
    items = (list[1] ?? list[2])
      .split(/,|;|\bet\b/)
      .map((item) => cleanLabel(item))
      .filter((item) => item.length > 0)
    text = text.slice(0, list.index) + text.slice(list.index + list[0].length)
  }

  const recurrence = extractRecurrence(text)
  if (recurrence) text = cutSpans(text, [recurrence])
  const time = extractTime(text)
  if (time) text = cutSpans(text, [time])
  const date = extractDate(text, 'future', reference)
  if (date) text = cutSpans(text, [date])

  let dueOn = date?.date ?? null
  if (!dueOn && recurrence) {
    const start = reference.startOf('day')
    dueOn =
      recurrence.weekday === null
        ? start
        : start.plus({ days: (recurrence.weekday - start.weekday + 7) % 7 })
  }

  const normalized = normalize(raw)
  const domain = DOMAIN_WORDS.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null

  return {
    title: cleanTitle(text),
    dueOn,
    dueTime: time?.time ?? null,
    recurrence: recurrence?.recurrence ?? null,
    interval: recurrence?.interval ?? 1,
    domain,
    items,
  }
}

function describeRecurrence(recurrence: Recurrence, interval: number): string {
  const [one, many] = RECURRENCE_LABELS[recurrence]
  if (interval === 1) return recurrence === 'daily' ? 'tous les jours' : `chaque ${one}`
  return `tous les ${interval} ${many}`
}

/**
 * « appeler le plombier demain 14h », « sortir les poubelles tous les
 * mardis », « préparer les vacances : valises, passeports » → a task in
 * « À faire ».
 */
@inject()
export default class TaskIntent implements CaptureIntent {
  info = { name: 'task', label: 'Tâche', domain: 'maison' } as const
  keywords: string[] = []

  constructor(private tasks: TaskService) {}

  score(input: NormalizedInput): number {
    const marker = MARKERS.test(input.text)
    const recurring = extractRecurrence(input.raw) !== null
    const timed = extractTime(input.raw) !== null
    const dated = extractDate(input.raw, 'future') !== null
    const checklist = parseTask(input.raw).items.length > 0

    let score = (marker ? 0.6 : 0) + (recurring ? 0.6 : 0) + (checklist ? 0.5 : 0)
    score += (timed ? 0.2 : 0) + (dated ? 0.2 : 0)

    /**
     * A short dated phrase with nothing else (« dentiste jeudi 9h ») is a
     * task, unless it names a meal (« raclette samedi soir »). The user
     * can switch to another type if needed.
     */
    const meal = MEAL_WORDS.test(input.text)
    if (!marker && !recurring && !checklist && dated && !meal) {
      score = Math.max(score, timed ? 0.6 : 0.5)
    }
    if (extractAmount(input.raw)?.explicit) score -= 0.4
    return Math.max(0, Math.min(score, 1))
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = this.draft(input, overrides)
    const info = { ...this.info, domain: draft.data.domain ?? this.info.domain }
    if (draft.missing.length > 0) {
      return {
        status: 'incomplete',
        intent: info,
        fields: draft.fields,
        missing: draft.missing,
        effects: [],
      }
    }

    const { title, dueOn, dueTime, recurrence, recurrenceInterval, items } = draft.data
    const when = dueOn
      ? `${formatLongDate(fromIsoDate(dueOn))}${dueTime ? ` à ${dueTime.replace(':', 'h')}` : ''}`
      : 'Sans date'
    const effects: CaptureEffect[] = [
      {
        domain: info.domain,
        title: `À faire · ${title}`,
        detail: when,
      },
    ]
    if (recurrence) {
      effects.push({
        domain: info.domain,
        title: `Se répète ${describeRecurrence(recurrence, recurrenceInterval)}`,
        detail: 'La suivante est créée quand celle-ci est cochée',
      })
    }
    if (items.length > 0) {
      effects.push({
        domain: info.domain,
        title: `Checklist : ${items.length} élément${items.length > 1 ? 's' : ''}`,
        detail: items.join(', '),
      })
    }

    return { status: 'ready', intent: info, fields: draft.fields, missing: [], effects }
  }

  async commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ) {
    const data = await taskValidator.validate(this.draft(input, overrides).data)
    const isChore =
      data.recurrence !== null &&
      data.recurrence !== undefined &&
      (data.domain ?? 'maison') === 'maison' &&
      CHORE_WORDS.test(normalize(data.title))
    const task = await this.tasks.create(
      { ...data, ...(isChore ? { isChore: true, domain: 'maison' as const } : {}) },
      trx,
      { captureText: input.original }
    )
    const when = data.dueOn ? ` pour le ${formatDate(fromIsoDate(data.dueOn))}` : ''
    return {
      message: `Tâche ajoutée${when} : ${data.title}`,
      created: [{ type: 'task' as const, id: task.id }],
    }
  }

  private draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const parsed = parseTask(input.raw)

    const title = pick(overrides, 'title', parsed.title, read.text)
    const dueOn = pick<string | null>(
      overrides,
      'dueOn',
      parsed.dueOn?.toISODate() ?? null,
      read.isoDate
    )
    const dueTime = pick<string | null>(overrides, 'dueTime', parsed.dueTime, (value) => {
      const text = read.text(value).replace('h', ':')
      const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(text)
      return match ? `${match[1].padStart(2, '0')}:${match[2] ?? '00'}` : null
    })
    const recurrence = pick<Recurrence | null>(
      overrides,
      'recurrence',
      parsed.recurrence,
      (value) =>
        value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly'
          ? value
          : null
    )
    const interval = pick(overrides, 'recurrenceInterval', parsed.interval, (value) =>
      Math.max(1, Math.round(read.number(value) ?? 1))
    )
    const domain = pick<Domain | null>(overrides, 'domain', parsed.domain, (value) =>
      value === 'budget' || value === 'maison' || value === 'auto' || value === 'menu'
        ? value
        : null
    )
    const items = pick(overrides, 'items', parsed.items.join(', '), read.text)

    const fields: CaptureField[] = [
      textField('title', 'Tâche', title.value, title.overridden),
      {
        key: 'dueOn',
        label: 'Date',
        kind: 'date',
        value: dueOn.value,
        display: dueOn.value ? formatDate(fromIsoDate(dueOn.value)) : 'Sans date',
        source: dueOn.overridden ? 'override' : parsed.dueOn ? 'parsed' : 'empty',
        required: false,
      },
      textField('dueTime', 'Heure', dueTime.value ?? '', dueTime.overridden, { required: false }),
      selectField(
        'recurrence',
        'Répétition',
        recurrence.value,
        [
          { value: null, label: 'Jamais' },
          { value: 'daily', label: 'Quotidienne' },
          { value: 'weekly', label: 'Hebdomadaire' },
          { value: 'monthly', label: 'Mensuelle' },
          { value: 'yearly', label: 'Annuelle' },
        ],
        recurrence.overridden ? 'override' : parsed.recurrence ? 'parsed' : 'empty'
      ),
      ...(recurrence.value
        ? [
            numberField('recurrenceInterval', 'Tous les', interval.value, interval.overridden, {
              parsed: parsed.interval > 1,
              suffix: RECURRENCE_LABELS[recurrence.value][interval.value > 1 ? 1 : 0],
              fallback: 'default',
            }),
          ]
        : []),
      selectField(
        'domain',
        'Domaine',
        domain.value,
        [
          { value: null, label: 'Aucun' },
          { value: 'maison', label: 'Maison' },
          { value: 'budget', label: 'Budget' },
          { value: 'auto', label: 'Auto' },
          { value: 'menu', label: 'Menu' },
        ],
        domain.overridden ? 'override' : parsed.domain ? 'matched' : 'empty'
      ),
      textField('items', 'Checklist', items.value, items.overridden, { required: false }),
    ]

    const missing: string[] = []
    if (title.value === '') missing.push('Tâche')

    const list = items.value
      .split(/,|;/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

    return {
      data: {
        title: title.value,
        /**
         * A recurring task always has a first date: today by default.
         */
        dueOn: dueOn.value ?? (recurrence.value ? (today().toISODate() ?? null) : null),
        dueTime: dueTime.value,
        recurrence: recurrence.value,
        recurrenceInterval: interval.value,
        domain: domain.value,
        items: list,
      },
      fields,
      missing,
    }
  }
}
