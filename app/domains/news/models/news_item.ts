import { NewsItemSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import NewsSource from '#domains/news/models/news_source'

export default class NewsItem extends NewsItemSchema {
  @belongsTo(() => NewsSource, { foreignKey: 'sourceId' })
  declare source: BelongsTo<typeof NewsSource>
}
