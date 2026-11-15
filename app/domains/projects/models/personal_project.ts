import { PersonalProjectSchema } from '#database/schema'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import PersonalProjectLink from '#domains/projects/models/personal_project_link'
import PersonalProjectNote from '#domains/projects/models/personal_project_note'
import PersonalProjectTask from '#domains/projects/models/personal_project_task'
import type { ProjectStatus } from '#shared/types/projects'

export default class PersonalProject extends PersonalProjectSchema {
  @column()
  declare status: ProjectStatus

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => PersonalProjectNote)
  declare notes: HasMany<typeof PersonalProjectNote>

  @hasMany(() => PersonalProjectTask)
  declare tasks: HasMany<typeof PersonalProjectTask>

  @hasMany(() => PersonalProjectLink)
  declare links: HasMany<typeof PersonalProjectLink>
}
