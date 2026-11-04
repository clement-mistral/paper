import vine from '@vinejs/vine'

export const fuelValidator = vine.create({
  vehicleId: vine.number().withoutDecimals().exists({ table: 'vehicles', column: 'id' }),
  liters: vine.number().min(0.5).max(500),
  totalCents: vine.number().withoutDecimals().min(1).max(10_000_000),
  odometerKm: vine.number().withoutDecimals().min(0).max(5_000_000).nullable(),
  filledOn: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  envelopeId: vine
    .number()
    .withoutDecimals()
    .exists({ table: 'envelopes', column: 'id' })
    .nullable(),
  accountId: vine.number().withoutDecimals().exists({ table: 'accounts', column: 'id' }).nullable(),
})
