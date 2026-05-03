const TONE_MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
}

function convertSyllable(syllable: string): string {
  const lastChar = syllable.slice(-1)
  const tone = parseInt(lastChar)
  if (isNaN(tone) || tone < 1 || tone > 5) return syllable

  const base = syllable.slice(0, -1)
  const idx = tone - 1

  // Rule 1: a or e takes the mark
  if (base.includes('a')) return base.replace('a', TONE_MARKS.a[idx])
  if (base.includes('e')) return base.replace('e', TONE_MARKS.e[idx])

  // Rule 2: ou → o takes the mark
  if (base.includes('ou')) return base.replace('o', TONE_MARKS.o[idx])

  // Rule 3: last vowel in the syllable
  const vowels = 'aeiouv'
  for (let i = base.length - 1; i >= 0; i--) {
    const v = base[i]
    if (vowels.includes(v) && TONE_MARKS[v]) {
      return base.slice(0, i) + TONE_MARKS[v][idx] + base.slice(i + 1)
    }
  }

  return syllable
}

// Convert numbered pinyin like "quan2 sheng4" → "quán shèng"
export function formatPinyin(pinyin: string): string {
  return pinyin
    .trim()
    .split(/\s+/)
    .map(convertSyllable)
    .join(' ')
}
