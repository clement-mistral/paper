import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import Home from '#domains/maison/models/home'
import CircuitService from '#domains/maison/services/circuit_service'
import EquipmentService from '#domains/maison/services/equipment_service'
import MeterService from '#domains/maison/services/meter_service'
import ProjectService from '#domains/maison/services/project_service'
import ClaimService from '#domains/maison/services/claim_service'
import type { HomeDetail, HomeKind, HomeSummary, Occupancy } from '#shared/types/maison'

export type HomeInput = {
  name: string
  kind: HomeKind
  occupancy: Occupancy
  address?: string | null
  surfaceM2?: number | null
  builtYear?: number | null
  notes?: string | null
}

/**
 * Public service of the Maison domain for the home. Paper knows a single
 * home: the « Logement » fiche gathers its equipment, its electrical panel
 * and its meters.
 */
@inject()
export default class HomeService {
  constructor(
    private equipment: EquipmentService,
    private circuits: CircuitService,
    private meters: MeterService,
    private projects: ProjectService,
    private claims: ClaimService
  ) {}

  /**
   * The household's home, null until it is created.
   */
  async current(): Promise<Home | null> {
    return Home.query().orderBy('id').first()
  }

  async detail(id: number): Promise<HomeDetail> {
    const home = await Home.query()
      .where('id', id)
      .withCount('equipment')
      .withCount('circuits')
      .withCount('meters')
      .firstOrFail()
    const [equipment, circuits, meters, projects, claims] = await Promise.all([
      this.equipment.forHome(id),
      this.circuits.forHome(id),
      this.meters.forHome(id),
      this.projects.forHome(id),
      this.claims.forHome(id),
    ])
    return {
      ...this.toSummary(home),
      surfaceM2: home.surfaceSqm,
      builtYear: home.builtYear,
      notes: home.notes,
      equipment,
      circuits,
      meters,
      projects,
      claims,
    }
  }

  async create(input: HomeInput): Promise<Home> {
    if (await this.current()) {
      throw new Exception('Le logement existe déjà', { status: 409 })
    }
    const home = new Home()
    this.fill(home, input)
    await home.save()
    return home
  }

  async update(id: number, input: HomeInput): Promise<Home> {
    const home = await Home.findOrFail(id)
    this.fill(home, input)
    await home.save()
    return home
  }

  private fill(home: Home, input: HomeInput) {
    home.merge({
      name: input.name,
      kind: input.kind,
      occupancy: input.occupancy,
      address: input.address || null,
      surfaceSqm: input.surfaceM2 ?? null,
      builtYear: input.builtYear ?? null,
      notes: input.notes || null,
    })
  }

  private toSummary(home: Home): HomeSummary {
    return {
      id: home.id,
      name: home.name,
      kind: home.kind,
      occupancy: home.occupancy,
      address: home.address,
      equipmentCount: Number(home.$extras.equipment_count ?? 0),
      circuitCount: Number(home.$extras.circuits_count ?? 0),
      meterCount: Number(home.$extras.meters_count ?? 0),
    }
  }
}
