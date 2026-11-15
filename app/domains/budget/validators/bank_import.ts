import vine from '@vinejs/vine'

export const bankLinesValidator = vine.create({
  lines: vine
    .array(
      vine.object({
        id: vine.number().withoutDecimals(),
        include: vine.boolean(),
        envelopeId: vine.number().withoutDecimals().nullable(),
      })
    )
    .maxLength(5000),
})
