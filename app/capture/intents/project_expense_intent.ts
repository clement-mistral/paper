import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CaptureIntent, IntentDraft } from '#capture/intent'
import { cleanLabel, extractAmount } from '#capture/extractors'
import {
  amountField,
  dateField,
  hasOverride,
  isoDate,
  pick,
  read,
  selectField,
  textField,
} from '#capture/fields'
import { normalize, type NormalizedInput } from '#capture/normalizer'
import { matchedKeywords } from '#capture/scorer'
import { parseExpense } from '#capture/intents/expense_intent'
import ProjectService from '#domains/maison/services/project_service'
import { fromIsoDate, today } from '#support/dates'
import { formatAmount, formatDate } from '#support/format'
import type { CaptureOverrides } from '#shared/types/capture'

const KEYWORDS = ['travaux', 'chantier', 'projet', 'bricolage', 'renovation']

/**
 * The running project named in the text: the one sharing the most
 * distinctive words (4 letters or more) with it.
 */
export function matchProject(
  text: string,
  projects: Array<{ id: number; title: string }>
): { id: number; title: string; words: string[] } | null {
  const tokens = new Set(normalize(text).split(' '))
  let best: { id: number; title: string; words: string[] } | null = null
  for (const project of projects) {
    const words = normalize(project.title)
      .split(' ')
      .filter((word) => word.length >= 4 && tokens.has(word))
    if (words.length > 0 && (!best || words.length > best.words.length)) {
      best = { ...project, words }
    }
  }
  return best
}

/**
 * « travaux peinture 45 € », « chantier salle de bain carrelage 320 € »
 * → an expense of a home project, recorded in Budget.
 */
@inject()
export default class ProjectExpenseIntent implements CaptureIntent {
  info = { name: 'project_expense', label: 'Dépense de travaux', domain: 'maison' } as const
  keywords = KEYWORDS

  constructor(private projects: ProjectService) {}

  async score(input: NormalizedInput): Promise<number> {
    const amount = extractAmount(input.raw)
    const keyword = matchedKeywords(input, this.keywords).length > 0
    if (!amount) return keyword ? 0.4 : 0
    if (keyword) return 0.85
    const project = matchProject(input.text, await this.projects.running())
    return project && amount.explicit ? 0.7 : 0
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      return { status: 'incomplete', intent: this.info, ...draft, effects: [] }
    }
    const project = await this.projects.detail(draft.data.projectId!)
    const spent = project.spentCents + draft.data.amountCents!
    return {
      status: 'ready',
      intent: this.info,
      fields: draft.fields,
      missing: [],
      effects: [
        {
          domain: 'maison',
          title: `Dépense de ${formatAmount(draft.data.amountCents!)} · Travaux ${project.title}`,
          detail: `${draft.data.label} · ${formatDate(fromIsoDate(draft.data.occurredOn))}`,
        },
        {
          domain: 'maison',
          title: project.budgetCents
            ? `${project.title} : ${formatAmount(spent)} sur ${formatAmount(project.budgetCents)}`
            : `${project.title} : ${formatAmount(spent)} dépensés`,
          tone: project.budgetCents && spent > project.budgetCents ? 'warning' : 'default',
        },
      ],
    }
  }

  async commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ) {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0 || !draft.data.projectId) {
      throw new Exception(`Saisie incomplète : ${draft.missing.join(', ')}`, { status: 422 })
    }
    const transaction = await this.projects.addExpense(
      draft.data.projectId!,
      {
        label: draft.data.label,
        amountCents: draft.data.amountCents!,
        occurredOn: draft.data.occurredOn,
      },
      trx,
      { captureText: input.original }
    )
    return {
      message: `Dépense de travaux de ${formatAmount(draft.data.amountCents!)} enregistrée`,
      created: [{ type: 'transaction' as const, id: transaction.id }],
    }
  }

  private async draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const parsed = parseExpense(input.raw)
    const projects = await this.projects.running()
    const matched = matchProject(parsed.rest, projects)

    const projectOverridden = hasOverride(overrides, 'projectId')
    const projectId = projectOverridden
      ? read.id(overrides.projectId ?? null)
      : (matched?.id ?? (projects.length === 1 ? projects[0].id : null))

    /**
     * The label is what remains once the project words and the travaux
     * keywords are gone (« travaux peinture rouleaux 12 € » → Rouleaux).
     */
    const drop = new Set([...(matched?.words ?? []), ...KEYWORDS])
    const leftover = cleanLabel(
      parsed.rest
        .split(/\s+/)
        .filter((word) => !drop.has(normalize(word)))
        .join(' ')
    )
    const amount = pick(overrides, 'amountCents', parsed.amountCents, read.cents)
    const label = pick(overrides, 'label', leftover || 'Achat', read.text)
    const occurredOn = pick(
      overrides,
      'occurredOn',
      isoDate(parsed.occurredOn ?? today()),
      (value) => read.isoDate(value) ?? isoDate(today())
    )

    const missing: string[] = []
    if (!projectId) missing.push('Projet')
    if (amount.value === null || amount.value <= 0) missing.push('Montant')

    return {
      data: {
        projectId,
        amountCents: amount.value,
        label: label.value,
        occurredOn: occurredOn.value,
      },
      missing,
      fields: [
        selectField(
          'projectId',
          'Projet',
          projectId,
          [
            { value: null, label: '—' },
            ...projects.map(({ id, title }) => ({ value: id, label: title })),
          ],
          projectOverridden ? 'override' : matched ? 'matched' : projectId ? 'default' : 'empty',
          true
        ),
        amountField(
          'amountCents',
          'Montant',
          amount.value,
          amount.overridden,
          parsed.amountCents !== null
        ),
        textField('label', 'Libellé', label.value, label.overridden),
        dateField(
          'occurredOn',
          'Date',
          occurredOn.value,
          occurredOn.overridden,
          !!parsed.occurredOn
        ),
      ],
    }
  }
}
