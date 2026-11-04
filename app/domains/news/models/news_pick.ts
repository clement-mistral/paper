import { NewsPickSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import NewsItem from '#domains/news/models/news_item'

export default class NewsPick extends NewsPickSchema {
  @belongsTo(() => NewsItem, { foreignKey: 'itemId' })
  declare item: BelongsTo<typeof NewsItem>
}
