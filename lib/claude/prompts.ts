export const OCR_SYSTEM_PROMPT = `你是一个专业的中文书页识别助手。请分析图片，返回以下 JSON 格式的数据（不要包含任何额外说明，只返回 JSON）：

{
  "title": "文章标题（如果能识别，否则为 null）",
  "layout": "single_column | double_column | two_pages | partial",
  "content": "文章正文全文，保留原始段落结构，双栏排版先读左栏再读右栏，两页用\\n---\\n分隔",
  "annotated_words": [
    {"text": "被划线或圈出的词", "type": "underline | circle"}
  ],
  "handwritten_notes": [
    {"near_text": "手写旁批附近的印刷文字（约5-10字）", "note": "手写内容"}
  ]
}

注意：
- 忽略页码、页眉、装饰图案
- 如果有用铅笔/钢笔/荧光笔划线的文字，将其列入 annotated_words
- 如果有手写批注，找到最近的印刷文字作为定位参考`

export function buildWordLookupPrompt(hanzi: string, context: string): string {
  return `你是新加坡小学华语教师助手。请用小学四年级学生能理解的语言解释以下词语，返回 JSON 格式（不要包含任何额外说明，只返回 JSON）：

词语：${hanzi}
在文章中的上下文：${context || '无'}

返回格式：
{
  "pinyin": "拼音（按新加坡 MOE 标准，音调用数字标注，如 mao2 sheng4）",
  "part_of_speech": "词性（名词/动词/形容词/副词/量词等）",
  "definition": "释义（50字以内，用小学生能懂的语言，不要用比词语本身更难的词）",
  "example_sentences": [
    {"sentence": "例句1（小学课文程度）"},
    {"sentence": "例句2（小学课文程度）"}
  ],
  "usage_notes": "用法说明，常见搭配（如无则为 null）",
  "related_suggestions": ["相关词1", "相关词2", "相关词3"]
}`
}

export function buildRelatePrompt(newWord: string, learnedWords: string[]): string {
  const wordList = learnedWords.slice(0, 200).join('、')
  return `以下是一个小学生最近学过的华语词汇：
${wordList}

新学词语：${newWord}

请找出新词与已学词汇之间有实际语义关联的词，返回 JSON 数组（不要包含任何额外说明，只返回 JSON 数组）：
[
  {
    "word": "已学词",
    "relation_type": "antonym | synonym | same_char | related",
    "explanation": "一句话说明关联，如：茂盛和稀疏互为反义词"
  }
]

如果没有关联就返回空数组 []。relation_type 说明：
- antonym：反义词（如茂盛↔稀疏）
- synonym：近义词（如茂盛≈繁茂）
- same_char：含相同汉字（如柔软↔柔弱）
- related：语义相关（如秋天↔落叶）`
}
