import { normalize } from '#capture/normalizer'

const UNITS: Record<string, number> = {
  zero: 0,
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
}

const TENS: Record<string, number> = {
  vingt: 20,
  vingts: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
}

/**
 * Words after which a spelled number is converted. Anything else is left
 * alone: « un café » stays « un café », « deux litres » becomes « 2 litres ».
 */
const FOLLOWERS =
  /^(?:euros?|€|litres?|l|km|kilom[eè]tres?|personnes?|pers|parts?|portions?|jours?|semaines?|mois|ans?|heures?|h|kg|kilos?|grammes?|g|minutes?|min|fois)\b/i

/**
 * Value of a run of number words (« vingt-cinq », « quatre-vingt-dix »,
 * « deux cents », « mille deux cents »), or null.
 */
function valueOf(words: string[]): number | null {
  let total = 0
  let current = 0
  for (const [index, word] of words.entries()) {
    if (word === 'et') continue
    /**
     * « quatre-vingt » is 4 × 20.
     */
    if ((word === 'vingt' || word === 'vingts') && words[index - 1] === 'quatre') current += 76
    else if (word in UNITS) current += UNITS[word]
    else if (word in TENS) current += TENS[word]
    else if (word === 'cent' || word === 'cents') current = (current || 1) * 100
    else if (word === 'mille') {
      total += (current || 1) * 1000
      current = 0
    } else return null
  }
  return total + current
}

const NUMBER_WORD =
  /^(?:zero|une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingts?|trente|quarante|cinquante|soixante|cents?|mille|et)$/

/**
 * Converts spelled numbers followed by a unit, or after « pour » (people):
 * « deux litres » → « 2 litres », « pour six » → « pour 6 »,
 * « quatre-vingt-dix euros » → « 90 euros ».
 */
export function wordsToDigits(text: string): string {
  const tokens = text.split(/(\s+)/)
  const output: string[] = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (/^\s+$/.test(token) || !NUMBER_WORD.test(normalize(token.split('-')[0]))) {
      output.push(token)
      continue
    }

    /**
     * Longest run of number words (hyphenated or space separated).
     */
    const words: string[] = []
    let j = i
    while (j < tokens.length) {
      if (/^\s+$/.test(tokens[j])) {
        j++
        continue
      }
      const parts = normalize(tokens[j]).split(' ')
      if (!parts.every((part) => NUMBER_WORD.test(part))) break
      words.push(...parts)
      j++
    }
    while (words.length > 0 && words[words.length - 1] === 'et') words.pop()

    const next = tokens.slice(j).join('').trimStart()
    const previous = normalize(output.join('').trim().split(/\s+/).pop() ?? '')
    const value = valueOf(words)
    const converts =
      value !== null && words.length > 0 && (FOLLOWERS.test(next) || previous === 'pour')

    if (!converts) {
      output.push(token)
      continue
    }

    output.push(String(value))
    /**
     * Keep the separator before the next word.
     */
    let k = j - 1
    while (k > i && /^\s+$/.test(tokens[k])) k--
    i = k
  }

  return output.join('')
}
