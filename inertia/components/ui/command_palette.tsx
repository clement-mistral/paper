import {
  type FormEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { router } from '@inertiajs/react'
import { ArrowRight, CircleAlert, CornerDownLeft, Sparkle } from 'lucide-react'
import { urlFor } from '~/client'
import DomainTag from '~/components/ui/domain_tag'
import Kbd from '~/components/ui/kbd'
import { cn } from '~/lib/cn'
import { centsToInput } from '~/lib/format'
import { postJson } from '~/lib/http'
import { ICON_STROKE } from '~/lib/icons'
import type {
  CaptureAnswer,
  CaptureField,
  CaptureFieldSource,
  CaptureOverrides,
  CapturePreview,
  IntentInfo,
  IntentName,
  IntentPreview,
} from '#shared/types/capture'

const EXAMPLES = [
  'café 4,50 €',
  'carbonara jeudi soir pour 4',
  'appeler le plombier demain 14h',
  'sortir les poubelles tous les mardis',
  'plein 38 L 67 € et café 3 €',
  'combien en resto ce mois ?',
]

/**
 * Delay between the last keystroke and the preview request.
 */
const DEBOUNCE_MS = 150

const sourceLabels: Record<CaptureFieldSource, string> = {
  parsed: 'détecté',
  matched: 'reconnu',
  default: 'par défaut',
  override: 'corrigé',
  empty: '',
}

type SegmentChoice = { intent?: IntentName; overrides: CaptureOverrides }

/**
 * The universal capture palette (Ctrl K): a sentence, a live preview of
 * its effects, then Entrée to record. Nothing is written before that.
 * Questions get an answer instead; several captures can be typed at once.
 */
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  const [text, setText] = useState('')
  const [intent, setIntent] = useState<IntentName | undefined>()
  const [overrides, setOverrides] = useState<CaptureOverrides>({})
  const [segments, setSegments] = useState<SegmentChoice[]>([])
  const [preview, setPreview] = useState<CapturePreview>({ status: 'empty' })
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const reset = useCallback(() => {
    setText('')
    setIntent(undefined)
    setOverrides({})
    setSegments([])
    setPreview({ status: 'empty' })
    setErrors({})
    setFailed(false)
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      inputRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  /**
   * Live preview, debounced; a newer request cancels the previous one.
   */
  useEffect(() => {
    if (text.trim() === '') return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const result = await postJson<CapturePreview>(
          urlFor('capture.preview'),
          { text, intent, overrides, segments },
          controller.signal
        )
        setPreview(result)
        setFailed(false)
      } catch {
        if (!controller.signal.aborted) setFailed(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [text, intent, overrides, segments])

  const close = () => {
    onClose()
    reset()
  }

  const changeText = (value: string) => {
    setText(value)
    if (value.trim() === '') setPreview({ status: 'empty' })
    setIntent(undefined)
    setOverrides({})
    setSegments([])
    setErrors({})
  }

  const switchIntent = (name: IntentName) => {
    setIntent(name)
    setOverrides({})
  }

  const updateSegment = (index: number, patch: Partial<SegmentChoice>) => {
    setSegments((current) => {
      const next = [...current]
      while (next.length <= index) next.push({ overrides: {} })
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const ready =
    preview.status === 'ready' ||
    preview.status === 'answer' ||
    (preview.status === 'multiple' &&
      preview.segments.every((segment) => segment.preview.status === 'ready'))
  const canSubmit = ready && !loading && !processing

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    /**
     * A question has nothing to record: Entrée opens the related page.
     */
    if (preview.status === 'answer') {
      if (preview.answer.link) {
        router.visit(preview.answer.link.href)
        close()
      }
      return
    }

    router.post(
      urlFor('capture.commit'),
      {
        text,
        intent: preview.status === 'ready' ? preview.intent.name : undefined,
        overrides,
        segments,
      },
      {
        preserveScroll: true,
        onStart: () => setProcessing(true),
        onFinish: () => setProcessing(false),
        onSuccess: close,
        onError: (bag) => setErrors(bag),
      }
    )
  }

  /**
   * Clicks on the backdrop land on the dialog element itself.
   */
  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) close()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={close}
      onClick={closeOnBackdrop}
      className="m-auto mt-[10vh] w-[calc(100%-2rem)] max-w-xl rounded-card border border-border bg-bg p-0 text-ink shadow-[0_24px_60px_-20px_rgb(0_0_0/0.3)] backdrop:bg-ink/20"
    >
      <h2 id={titleId} className="sr-only">
        Saisie universelle
      </h2>
      <form onSubmit={submit}>
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Sparkle
            size={17}
            strokeWidth={ICON_STROKE}
            aria-hidden="true"
            className={cn('text-muted', loading && 'animate-pulse')}
          />
          <label htmlFor={`${titleId}-input`} className="sr-only">
            Que voulez-vous noter ?
          </label>
          <input
            ref={inputRef}
            id={`${titleId}-input`}
            value={text}
            onChange={(event) => changeText(event.target.value)}
            placeholder="Noter, planifier, demander…"
            autoComplete="off"
            spellCheck={false}
            className="h-13 flex-1 bg-transparent text-base text-ink placeholder:text-muted/70 focus:outline-none"
          />
        </div>

        <div aria-live="polite" className="max-h-[62vh] overflow-y-auto px-4 py-4">
          {failed ? (
            <Notice>La prévisualisation a échoué. Réessayez dans un instant.</Notice>
          ) : (
            <PreviewBody
              preview={preview}
              overrides={overrides}
              segments={segments}
              errors={errors}
              onExample={(example) => {
                changeText(example)
                inputRef.current?.focus()
              }}
              onIntent={switchIntent}
              onOverride={(key, value) => setOverrides((current) => ({ ...current, [key]: value }))}
              onSegment={updateSegment}
            />
          )}
        </div>

        <footer className="flex items-center justify-end gap-4 border-t border-border px-4 py-2.5 text-label text-muted">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-control px-1 text-ink disabled:text-muted"
          >
            <Kbd>
              <CornerDownLeft size={11} strokeWidth={ICON_STROKE} aria-label="Entrée" />
            </Kbd>
            {preview.status === 'answer'
              ? 'Ouvrir'
              : processing
                ? 'Enregistrement…'
                : preview.status === 'multiple'
                  ? `Tout enregistrer (${preview.segments.length})`
                  : 'Enregistrer'}
          </button>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>Échap</Kbd>
            Fermer
          </span>
        </footer>
      </form>
    </dialog>
  )
}

function Notice({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-2 rounded-card bg-callout px-3 py-3 text-label text-muted">
      <CircleAlert size={15} strokeWidth={ICON_STROKE} aria-hidden="true" className="mt-px" />
      {children}
    </p>
  )
}

function PreviewBody({
  preview,
  overrides,
  segments,
  errors,
  onExample,
  onIntent,
  onOverride,
  onSegment,
}: {
  preview: CapturePreview
  overrides: CaptureOverrides
  segments: SegmentChoice[]
  errors: Record<string, string>
  onExample: (example: string) => void
  onIntent: (intent: IntentName) => void
  onOverride: (key: string, value: string | number | null) => void
  onSegment: (index: number, patch: Partial<SegmentChoice>) => void
}) {
  if (preview.status === 'empty') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-label text-muted">Par exemple</p>
        <ul className="flex flex-col">
          {EXAMPLES.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => onExample(example)}
                className="flex h-9 w-full items-center rounded-control px-2 text-left text-sm text-ink hover:bg-hover"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (preview.status === 'unknown') {
    return (
      <div className="flex flex-col gap-3">
        <Notice>{preview.message}</Notice>
        <Alternatives
          label="C’est plutôt…"
          alternatives={preview.alternatives}
          onIntent={onIntent}
        />
      </div>
    )
  }

  if (preview.status === 'ambiguous') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-label text-muted">Qu’est-ce que c’est ?</p>
        <IntentChips intents={preview.candidates} onIntent={onIntent} />
      </div>
    )
  }

  if (preview.status === 'answer') {
    return (
      <div className="flex flex-col gap-4">
        <Answer answer={preview.answer} />
        <Alternatives
          label="Ce n’est pas une question ?"
          alternatives={preview.alternatives.slice(0, 4)}
          onIntent={onIntent}
        />
      </div>
    )
  }

  if (preview.status === 'multiple') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-label text-muted">
          {preview.segments.length} saisies, enregistrées ensemble
        </p>
        {preview.segments.map((segment, index) => (
          <div key={index} className="rounded-card border border-border p-3">
            <p className="mb-2 truncate text-label text-muted">« {segment.text} »</p>
            <IntentBody
              preview={segment.preview}
              overrides={segments[index]?.overrides ?? {}}
              errors={{}}
              onOverride={(key, value) =>
                onSegment(index, {
                  overrides: { ...(segments[index]?.overrides ?? {}), [key]: value },
                })
              }
              compact
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <IntentBody preview={preview} overrides={overrides} errors={errors} onOverride={onOverride} />
      <Alternatives
        label="Ce n’est pas ça ?"
        alternatives={preview.alternatives.slice(0, 4)}
        onIntent={onIntent}
      />
    </div>
  )
}

function IntentBody({
  preview,
  overrides,
  errors,
  onOverride,
  compact = false,
}: {
  preview: IntentPreview
  overrides: CaptureOverrides
  errors: Record<string, string>
  onOverride: (key: string, value: string | number | null) => void
  compact?: boolean
}) {
  return (
    <div className={cn('flex flex-col', compact ? 'gap-2' : 'gap-4')}>
      <div className="flex items-center gap-2">
        <DomainTag domain={preview.intent.domain} />
        <span className="text-sm font-medium">{preview.intent.label}</span>
      </div>

      <div className="flex flex-col">
        {preview.fields.map((field) => (
          <FieldRow
            key={field.key}
            field={field}
            override={overrides[field.key]}
            error={errors[field.key]}
            onChange={(value) => onOverride(field.key, value)}
          />
        ))}
      </div>

      {preview.missing.length > 0 ? (
        <Notice>{`À compléter : ${preview.missing.join(', ').toLowerCase()}.`}</Notice>
      ) : (
        <div className="flex flex-col gap-1.5">
          {!compact && <p className="text-label text-muted">Ce qui sera enregistré</p>}
          <ul className="flex flex-col gap-1.5">
            {preview.effects.map((effect) => (
              <li
                key={effect.title}
                className={cn(
                  'rounded-control px-3 py-2',
                  effect.tone === 'warning' ? 'bg-warning-soft' : 'bg-callout'
                )}
              >
                <p
                  className={cn('text-sm', effect.tone === 'warning' ? 'text-warning' : 'text-ink')}
                >
                  {effect.title}
                </p>
                {effect.detail && <p className="text-label text-muted">{effect.detail}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Answer({ answer }: { answer: CaptureAnswer }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{answer.title}</p>
      {answer.lines.length === 0 ? (
        answer.empty && <p className="text-label text-muted">{answer.empty}</p>
      ) : (
        <dl className="flex flex-col">
          {answer.lines.map((line, index) => (
            <div
              key={`${line.label}-${index}`}
              className="flex min-h-8 items-baseline justify-between gap-4 border-b border-border py-1"
            >
              <dt className="flex min-w-0 items-center gap-2 text-sm text-ink">
                {line.domain && (
                  <span
                    aria-hidden="true"
                    className={cn('size-1.5 shrink-0 rounded-full', domainDot[line.domain])}
                  />
                )}
                <span className="truncate">{line.label}</span>
              </dt>
              <dd className="text-sm whitespace-nowrap text-ink tabular-nums">{line.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {answer.link && (
        <p className="inline-flex items-center gap-1 text-label text-muted">
          <ArrowRight size={13} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Entrée : {answer.link.label.toLowerCase()}
        </p>
      )}
    </div>
  )
}

const domainDot = {
  budget: 'bg-budget',
  maison: 'bg-maison',
  auto: 'bg-auto',
  menu: 'bg-menu',
} as const

function IntentChips({
  intents,
  onIntent,
}: {
  intents: IntentInfo[]
  onIntent: (intent: IntentName) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {intents.map((info) => (
        <button
          key={info.name}
          type="button"
          onClick={() => onIntent(info.name)}
          className="inline-flex h-8 items-center gap-2 rounded-control border border-border px-2.5 text-label hover:bg-hover"
        >
          <span
            aria-hidden="true"
            className={cn('size-1.5 rounded-full', domainDot[info.domain])}
          />
          {info.label}
        </button>
      ))}
    </div>
  )
}

/**
 * « Ce n'est pas ça ? »: switch to another intent. Paper remembers the
 * choice for phrases with the same words.
 */
function Alternatives({
  label,
  alternatives,
  onIntent,
}: {
  label: string
  alternatives: IntentInfo[]
  onIntent: (intent: IntentName) => void
}) {
  if (alternatives.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-3">
      <p className="text-xs text-muted">{label}</p>
      <IntentChips intents={alternatives} onIntent={onIntent} />
    </div>
  )
}

/**
 * A preview field, editable in place. Every change becomes an override
 * sent back to the server, which recomputes the preview.
 */
function FieldRow({
  field,
  override,
  error,
  onChange,
}: {
  field: CaptureField
  override: string | number | null | undefined
  error?: string
  onChange: (value: string | number | null) => void
}) {
  const id = useId()
  const control =
    'h-8 w-full min-w-0 rounded-control border border-transparent bg-transparent px-2 text-sm text-ink hover:border-border focus:border-ink focus:outline-none'

  let input
  if (field.kind === 'select') {
    /**
     * Option values are ids or codes; map the DOM string back to the
     * original value.
     */
    input = (
      <select
        id={id}
        value={field.value === null ? '' : String(field.value)}
        onChange={(event) => {
          const option = field.options?.find(
            ({ value }) => String(value ?? '') === event.target.value
          )
          onChange(option ? option.value : null)
        }}
        className={control}
      >
        {field.options?.map((option) => (
          <option key={option.value ?? 'none'} value={option.value ?? ''}>
            {option.label}
          </option>
        ))}
      </select>
    )
  } else if (field.kind === 'date') {
    input = (
      <input
        id={id}
        type="date"
        value={typeof field.value === 'string' ? field.value : ''}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value)
          else if (!field.required) onChange(null)
        }}
        className={control}
      />
    )
  } else {
    const numeric = field.kind === 'amount' || field.kind === 'number'
    let shown = String(field.value ?? '')
    if (override !== undefined && override !== null) shown = String(override)
    else if (field.kind === 'amount' && typeof field.value === 'number') {
      shown = centsToInput(field.value)
    } else if (field.kind === 'number' && typeof field.value === 'number') {
      shown = String(field.value).replace('.', ',')
    }
    input = (
      <div className="flex items-center">
        <input
          id={id}
          value={shown}
          inputMode={numeric ? 'decimal' : undefined}
          placeholder={field.kind === 'amount' ? '0,00' : '—'}
          onChange={(event) => onChange(event.target.value)}
          className={cn(control, numeric && 'tabular-nums')}
        />
        {field.suffix && <span className="pr-2 text-label text-muted">{field.suffix}</span>}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-2 py-0.5">
      <label htmlFor={id} className="text-label text-muted">
        {field.label}
        {field.required && field.source === 'empty' && <span className="text-danger"> *</span>}
      </label>
      <div>
        {input}
        {error && <p className="px-2 text-label text-danger">{error}</p>}
      </div>
      <span className="w-16 text-right text-xs text-muted">{sourceLabels[field.source]}</span>
    </div>
  )
}
