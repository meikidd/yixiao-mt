import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { extractTextFromImage } from '@/lib/claude/ocr'
import { findRelatedWords } from '@/lib/claude/relate'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    if (!imageFile) {
      return NextResponse.json({ error: '未提供图片' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    // Upload original image to Supabase Storage
    const fileExt = imageFile.name.split('.').pop() || 'jpg'
    const fileName = `${DEFAULT_USER_ID}/${Date.now()}.${fileExt}`
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('article-images')
      .upload(fileName, buffer, { contentType: imageFile.type })

    if (uploadError) {
      return NextResponse.json({ error: '图片上传失败: ' + uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('article-images')
      .getPublicUrl(fileName)

    // Run Claude Vision OCR
    const base64 = buffer.toString('base64')
    const ocrResult = await extractTextFromImage(base64, imageFile.type)

    if (!ocrResult.content) {
      return NextResponse.json({ error: '无法从图片中提取文字' }, { status: 422 })
    }

    // Save article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        user_id: DEFAULT_USER_ID,
        title: ocrResult.title,
        content: ocrResult.content,
        raw_image_urls: [publicUrl],
        source: 'photo',
      })
      .select()
      .single()

    if (articleError || !article) {
      return NextResponse.json({ error: '保存文章失败' }, { status: 500 })
    }

    // Process annotated words: look them up and save to user_words + article_words
    const annotatedWordsList = ocrResult.annotated_words.map((a) => a.text)
    if (annotatedWordsList.length > 0) {
      await processAnnotatedWords(supabase, article.id, annotatedWordsList, ocrResult)
    }

    // Async knowledge relation building (fire and forget)
    if (annotatedWordsList.length > 0) {
      buildRelationsAsync(supabase, annotatedWordsList).catch(console.error)
    }

    return NextResponse.json({
      articleId: article.id,
      title: ocrResult.title,
      content: ocrResult.content,
      layout: ocrResult.layout,
      annotatedWords: annotatedWordsList,
      handwrittenNotes: ocrResult.handwritten_notes,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: '处理失败，请重试' }, { status: 500 })
  }
}

async function processAnnotatedWords(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  articleId: string,
  words: string[],
  ocrResult: Awaited<ReturnType<typeof extractTextFromImage>>
) {
  for (const wordText of words) {
    // Get or create word in global dictionary (basic entry without AI lookup yet)
    let { data: word } = await supabase
      .from('words')
      .select('id')
      .eq('hanzi', wordText)
      .single()

    if (!word) {
      const { data: newWord } = await supabase
        .from('words')
        .insert({ hanzi: wordText, pinyin: '', definition: '' })
        .select('id')
        .single()
      word = newWord
    }

    if (!word) continue

    // Add to user's learned words
    await supabase
      .from('user_words')
      .upsert({ user_id: DEFAULT_USER_ID, word_id: word.id, status: 'new' }, { onConflict: 'user_id,word_id' })

    // Find annotation info
    const annotation = ocrResult.annotated_words.find((a) => a.text === wordText)
    const note = ocrResult.handwritten_notes.find((n) => n.near_text.includes(wordText))

    // Link word to article
    await supabase
      .from('article_words')
      .upsert({
        article_id: articleId,
        word_id: word.id,
        is_annotated: true,
        annotation_type: annotation?.type ?? null,
        annotation_note: note?.note ?? null,
      }, { onConflict: 'article_id,word_id' })
  }
}

async function buildRelationsAsync(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  newWords: string[]
) {
  // Get user's existing learned words
  const { data: userWords } = await supabase
    .from('user_words')
    .select('words(hanzi)')
    .eq('user_id', DEFAULT_USER_ID)
    .limit(200)

  const learnedWords = (userWords ?? [])
    .map((uw) => (uw.words as unknown as { hanzi: string } | null)?.hanzi)
    .filter(Boolean) as string[]

  for (const newWord of newWords) {
    const existing = learnedWords.filter((w) => w !== newWord)
    if (existing.length === 0) continue

    const relations = await findRelatedWords(newWord, existing)

    for (const rel of relations) {
      const { data: wordA } = await supabase
        .from('words')
        .select('id')
        .eq('hanzi', newWord)
        .single()
      const { data: wordB } = await supabase
        .from('words')
        .select('id')
        .eq('hanzi', rel.word)
        .single()

      if (!wordA || !wordB) continue

      await supabase
        .from('word_relationships')
        .upsert({
          word_a_id: wordA.id,
          word_b_id: wordB.id,
          relation_type: rel.relation_type,
          explanation: rel.explanation,
          auto_generated: true,
        }, { onConflict: 'word_a_id,word_b_id,relation_type' })

      // Also add reverse relationship
      await supabase
        .from('word_relationships')
        .upsert({
          word_a_id: wordB.id,
          word_b_id: wordA.id,
          relation_type: rel.relation_type,
          explanation: rel.explanation,
          auto_generated: true,
        }, { onConflict: 'word_a_id,word_b_id,relation_type' })
    }
  }
}
