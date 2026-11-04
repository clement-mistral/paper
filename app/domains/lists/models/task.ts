import { TaskSchema } from '#database/schema'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import TaskItem from '#domains/lists/models/task_item'
import type { Domain } from '#shared/types/domain'
import type { Recurrence } from '#shared/types/lists'

export default class Task extends TaskSchema {
  @column()
  declare domain: Domain | null

  @column()
  declare recurrence: Recurrence | null

  @hasMany(() => TaskItem)
  declare items: HasMany<typeof TaskItem>
}
