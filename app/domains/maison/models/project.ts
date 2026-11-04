import { ProjectSchema } from '#database/schema'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import ProjectItem from '#domains/maison/models/project_item'
import type { ProjectStatus } from '#shared/types/maison'

export default class Project extends ProjectSchema {
  @column()
  declare status: ProjectStatus

  @hasMany(() => ProjectItem)
  declare items: HasMany<typeof ProjectItem>
}
