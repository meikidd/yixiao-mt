const TONE_MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
}

function applyToneByRules(base: string, idx: number): string {
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

  return base
}

function convertSyllable(syllable: string): string {
  // Format 1: digit at end, e.g. "meng2"
  const lastChar = syllable.slice(-1)
  const endTone = parseInt(lastChar)
  if (!isNaN(endTone) && endTone >= 1 && endTone <= 5) {
    return applyToneByRules(syllable.slice(0, -1), endTone - 1)
  }

  // Format 2: digit embedded after the toned vowel, e.g. "me2ng"
  const m = syllable.match(/^([a-züv]*)([1-5])([a-züv]*)$/i)
  if (m) {
    const [, before, toneStr, after] = m
    const idx = parseInt(toneStr) - 1
    // The vowel immediately before the digit gets the mark
    const vowelMatch = before.match(/[aeiouüv]$/i)
    if (vowelMatch) {
      const vowel = vowelMatch[0].toLowerCase()
      if (TONE_MARKS[vowel]) {
        return before.slice(0, -1) + TONE_MARKS[vowel][idx] + after
      }
    }
    // Fallback: apply standard rules to the full base
    return applyToneByRules(before + after, idx)
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
