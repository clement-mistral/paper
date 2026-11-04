import { NewsSourceSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import NewsItem from '#domains/news/models/news_item'

export default class NewsSource extends NewsSourceSchema {
  @hasMany(() => NewsItem, { foreignKey: 'sourceId' })
  declare items: HasMany<typeof NewsItem>
}
