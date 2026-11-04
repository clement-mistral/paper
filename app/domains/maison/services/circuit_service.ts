import ElectricalCircuit from '#domains/maison/models/electrical_circuit'
import Home from '#domains/maison/models/home'
import type { CircuitRow } from '#shared/types/maison'

export type CircuitInput = {
  reference: string
  label: string
  breakerAmps?: number | null
  differential?: string | null
  sectionMm2?: number | null
  rooms?: string | null
  powerWatts?: number | null
  notes?: string | null
}

/**
 * Public service of the Maison domain for the electrical panel of a home.
 */
export default class CircuitService {
  /**
   * Circuits in panel order: « C2 » before « C10 ».
   */
  async forHome(homeId: number): Promise<CircuitRow[]> {
    const circuits = await ElectricalCircuit.query().where('home_id', homeId)
    const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' })
    return circuits
      .sort((a, b) => collator.compare(a.reference, b.reference))
      .map((circuit) => this.toRow(circuit))
  }

  async detail(id: number): Promise<CircuitRow> {
    return this.toRow(await ElectricalCircuit.findOrFail(id))
  }

  async create(homeId: number, input: CircuitInput): Promise<ElectricalCircuit> {
    const home = await Home.findOrFail(homeId)
    const circuit = new ElectricalCircuit()
    circuit.homeId = home.id
    this.fill(circuit, input)
    await circuit.save()
    return circuit
  }

  async update(id: number, input: CircuitInput): Promise<ElectricalCircuit> {
    const circuit = await ElectricalCircuit.findOrFail(id)
    this.fill(circuit, input)
    await circuit.save()
    return circuit
  }

  async delete(id: number): Promise<ElectricalCircuit> {
    const circuit = await ElectricalCircuit.findOrFail(id)
    await circuit.delete()
    return circuit
  }

  private fill(circuit: ElectricalCircuit, input: CircuitInput) {
    circuit.merge({
      reference: input.reference,
      label: input.label,
      breakerAmps: input.breakerAmps ?? null,
      differential: input.differential || null,
      sectionSqmm: input.sectionMm2 ?? null,
      rooms: input.rooms || null,
      powerWatts: input.powerWatts ?? null,
      notes: input.notes || null,
    })
  }

  private toRow(circuit: ElectricalCircuit): CircuitRow {
    return {
      id: circuit.id,
      homeId: circuit.homeId,
      reference: circuit.reference,
      label: circuit.label,
      breakerAmps: circuit.breakerAmps,
      differential: circuit.differential,
      sectionMm2: circuit.sectionSqmm,
      rooms: circuit.rooms,
      powerWatts: circuit.powerWatts,
      notes: circuit.notes,
    }
  }
}
