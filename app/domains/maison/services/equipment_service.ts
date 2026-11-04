import Equipment from '#domains/maison/models/equipment'
import Home from '#domains/maison/models/home'
import { byUrgency, toMaintenanceRow } from '#domains/maison/services/equipment_maintenance_service'
import { fromIsoDate, toIsoDate, today } from '#support/dates'
import type {
  EquipmentCategory,
  EquipmentDetail,
  EquipmentRow,
  WarrantyStatus,
} from '#shared/types/maison'

export type EquipmentInput = {
  name: string
  category: EquipmentCategory
  brand?: string | null
  model?: string | null
  room?: string | null
  purchasedOn?: string | null
  priceCents?: number | null
  warrantyUntil?: string | null
  notes?: string | null
}

/**
 * Public service of the Maison domain for the equipment of a home.
 */
export default class EquipmentService {
  async forHome(homeId: number): Promise<EquipmentRow[]> {
    const equipment = await Equipment.query()
      .where('home_id', homeId)
      .preload('maintenances', (query) => query.whereNull('done_on'))
      .orderBy('name')
    return equipment.map((item) => this.toRow(item))
  }

  async detail(id: number): Promise<EquipmentDetail> {
    const equipment = await Equipment.query()
      .where('id', id)
      .preload('home')
      .preload('maintenances', (query) => query.orderBy('done_on', 'desc').orderBy('id', 'desc'))
      .firstOrFail()
    const rows = equipment.maintenances.map((maintenance) => toMaintenanceRow(maintenance))
    return {
      ...this.toRow(equipment),
      homeName: equipment.home.name,
      purchasedOn: equipment.purchasedOn ? toIsoDate(equipment.purchasedOn) : null,
      priceCents: equipment.priceCents,
      notes: equipment.notes,
      maintenances: {
        costCents: rows.reduce((total, row) => total + (row.costCents ?? 0), 0),
        planned: byUrgency(rows.filter((row) => row.status !== 'done')),
        history: rows.filter((row) => row.status === 'done'),
      },
    }
  }

  async create(homeId: number, input: EquipmentInput): Promise<Equipment> {
    const home = await Home.findOrFail(homeId)
    const equipment = new Equipment()
    equipment.homeId = home.id
    this.fill(equipment, input)
    await equipment.save()
    return equipment
  }

  async update(id: number, input: EquipmentInput): Promise<Equipment> {
    const equipment = await Equipment.findOrFail(id)
    this.fill(equipment, input)
    await equipment.save()
    return equipment
  }

  /**
   * Removes the equipment and its maintenances; their expenses stay in
   * Budget.
   */
  async delete(id: number): Promise<Equipment> {
    const equipment = await Equipment.findOrFail(id)
    await equipment.delete()
    return equipment
  }

  private fill(equipment: Equipment, input: EquipmentInput) {
    equipment.merge({
      name: input.name,
      category: input.category,
      brand: input.brand || null,
      model: input.model || null,
      room: input.room || null,
      purchasedOn: input.purchasedOn ? fromIsoDate(input.purchasedOn) : null,
      priceCents: input.priceCents || null,
      warrantyUntil: input.warrantyUntil ? fromIsoDate(input.warrantyUntil) : null,
      notes: input.notes || null,
    })
  }

  private toRow(equipment: Equipment): EquipmentRow {
    let warrantyStatus: WarrantyStatus = 'none'
    if (equipment.warrantyUntil) {
      warrantyStatus = equipment.warrantyUntil >= today() ? 'active' : 'expired'
    }
    const planned = byUrgency(
      equipment.maintenances
        .filter((maintenance) => !maintenance.doneOn)
        .map((maintenance) => toMaintenanceRow(maintenance))
    )
    return {
      id: equipment.id,
      homeId: equipment.homeId,
      name: equipment.name,
      category: equipment.category,
      brand: equipment.brand,
      model: equipment.model,
      room: equipment.room,
      warrantyUntil: equipment.warrantyUntil ? toIsoDate(equipment.warrantyUntil) : null,
      warrantyStatus,
      nextMaintenance: planned[0] ?? null,
    }
  }
}
