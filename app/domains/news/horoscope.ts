import { type DateTime } from 'luxon'
import { ZODIAC_SIGNS, zodiacDates, type HoroscopeEntry, type ZodiacSign } from '#shared/types/news'
import { shuffled } from '#support/seeded'

/**
 * Horoscope of the sheet: for amusement, written by hand and drawn by the
 * date, like the quotation (no generated text, see PROJECT.md). Each day,
 * every bank is shuffled once and the twelve signs take twelve different
 * lines of it: two signs never read the same thing the same day, and the
 * same day always reads the same, printed again or not.
 */

/** The day's climate: one sentence, no advice. */
export const CLIMATES = [
  'Une énergie tranquille vous porte du matin au soir.',
  'Les petites contrariétés glissent sur vous aujourd’hui.',
  'Une bonne nouvelle pourrait arriver par un canal inattendu.',
  'Votre sens de l’organisation fait des merveilles.',
  'Une conversation sincère éclaire une question en suspens.',
  'La journée commence lentement mais finit en beauté.',
  'Votre patience est mise à l’épreuve, et vous tenez bon.',
  'Une idée longtemps mûrie trouve enfin sa forme.',
  'Le foyer est votre meilleur refuge aujourd’hui.',
  'Votre curiosité vous mène vers une jolie découverte.',
  'Un léger vent de nostalgie souffle sur l’après-midi.',
  'Les astres favorisent les décisions simples et nettes.',
  'Vous avez plus d’influence que vous ne le pensez.',
  'Un proche compte sur vous, et vous ne le décevez pas.',
  'La fatigue de la semaine se dissipe enfin.',
  'Votre bonne humeur est contagieuse.',
  'Une tâche redoutée se révèle plus facile que prévu.',
  'Le hasard fait bien les choses, laissez-le faire.',
  'Votre intuition est particulièrement juste.',
  'Un souvenir heureux remonte à la surface.',
  'Les échanges sont vifs mais constructifs.',
  'Vous voyez clair dans une situation embrouillée.',
  'Une envie de changement pointe le bout de son nez.',
  'Le calme revient après une période agitée.',
  'Votre générosité est remarquée et appréciée.',
  'Un petit imprévu se transforme en bon moment.',
  'Vous retrouvez le goût des choses simples.',
  'Votre franchise dénoue une tension ancienne.',
  'Une rencontre fortuite égaie votre journée.',
  'Vous avancez à votre rythme, et c’est le bon.',
  'Les finances du foyer respirent un peu.',
  'Une promesse faite hier porte déjà ses fruits.',
  'L’ambiance est à la complicité.',
  'Vous êtes d’humeur créative.',
  'Une attente touche bientôt à sa fin.',
  'La journée a un petit air de vacances.',
]

/** Advice: one sentence, imperative. */
export const ADVICES = [
  'Accordez-vous une vraie pause à midi.',
  'Rangez un tiroir : l’esprit suivra.',
  'Appelez quelqu’un que vous n’avez pas entendu depuis longtemps.',
  'Ne remettez pas à demain ce petit coup de fil.',
  'Écoutez avant de répondre.',
  'Faites une promenade, même courte.',
  'Dites merci à voix haute.',
  'Couchez-vous un peu plus tôt ce soir.',
  'Notez vos idées avant qu’elles ne s’envolent.',
  'Évitez les achats sur un coup de tête.',
  'Cuisinez quelque chose de nouveau.',
  'Laissez le téléphone dans une autre pièce une heure.',
  'Commencez par la tâche la plus pénible.',
  'Acceptez l’aide qu’on vous propose.',
  'Prenez le temps d’un vrai petit-déjeuner.',
  'Ouvrez grand les fenêtres.',
  'Offrez un compliment sincère.',
  'Gardez une heure pour vous.',
  'Faites une liste, puis cochez-la.',
  'Buvez un grand verre d’eau avant le café.',
  'Ne laissez pas un malentendu s’installer.',
  'Remettez de l’ordre dans vos papiers.',
  'Préparez demain dès ce soir.',
  'Riez de vos petites maladresses.',
  'Prenez l’escalier plutôt que l’ascenseur.',
  'Lisez quelques pages avant de dormir.',
  'Proposez un repas partagé.',
  'Fixez-vous un seul objectif pour la journée.',
  'Dites non à ce qui vous pèse.',
  'Faites confiance à votre première impression.',
  'Arrosez les plantes, et vous avec.',
  'Prenez des nouvelles d’un voisin.',
  'Réglez une petite chose qui traîne.',
  'Soyez indulgent avec vous-même.',
  'Savourez votre café sans rien faire d’autre.',
  'Gardez votre énergie pour ce qui compte.',
]

/** The lucky charm of the day: something at hand in a household. */
export const CHARMS = [
  'un thé bien chaud',
  'une chanson d’autrefois',
  'la couleur bleue',
  'un plaid moelleux',
  'une pomme croquante',
  'le chiffre 7',
  'un carnet neuf',
  'une bougie allumée',
  'la couleur verte',
  'une écharpe douce',
  'un bouquet de saison',
  'le chiffre 3',
  'une tartine beurrée',
  'un vieux pull',
  'la couleur jaune',
  'une carte postale',
  'un bon livre',
  'le chiffre 9',
  'une soupe maison',
  'la radio du matin',
  'la couleur rouge',
  'un crayon bien taillé',
  'une fenêtre ouverte',
  'le chiffre 4',
  'un chocolat noir',
  'des chaussettes dépareillées',
  'la couleur orange',
  'une photo de famille',
  'un rayon de soleil',
  'le chiffre 12',
  'une plante verte',
  'un jeu de cartes',
  'la couleur violette',
  'une tisane au miel',
  'un mot doux',
  'le chiffre 1',
]

/**
 * The horoscope of `signs` for that day, in the zodiac order.
 */
export function horoscopeOf(day: DateTime, signs: readonly ZodiacSign[]): HoroscopeEntry[] {
  const iso = day.toISODate() ?? ''
  const climates = shuffled(CLIMATES, `${iso}:climate`)
  const advices = shuffled(ADVICES, `${iso}:advice`)
  const charms = shuffled(CHARMS, `${iso}:charm`)
  const wanted = new Set(signs)
  return ZODIAC_SIGNS.flatMap((sign, index) =>
    wanted.has(sign.key)
      ? [
          {
            sign: sign.key,
            label: sign.label,
            symbol: sign.symbol,
            dates: zodiacDates(sign),
            text: `${climates[index]} ${advices[index]}`,
            charm: charms[index],
          },
        ]
      : []
  )
}

/** Sign the Sun is in on that day, after the usual dates. */
export function sunSignOf(day: DateTime): string {
  const at = day.month * 100 + day.day
  const sign = ZODIAC_SIGNS.find(({ from, to }) => {
    const start = from[0] * 100 + from[1]
    const end = to[0] * 100 + to[1]
    return start <= end ? at >= start && at <= end : at >= start || at <= end
  })
  return sign?.label ?? ''
}

/** « aries,leo » as stored → the known signs, in the zodiac order. */
export function parseSigns(stored: string | null | undefined): ZodiacSign[] {
  const values = new Set((stored ?? '').split(','))
  return ZODIAC_SIGNS.filter((sign) => values.has(sign.key)).map((sign) => sign.key)
}
