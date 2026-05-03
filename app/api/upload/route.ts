import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { extractTextFromImage } from '@/lib/claude/ocr'
import { lookupWord } from '@/lib/claude/lookup'
import { findRelatedWords } from '@/lib/claude/relate'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFiles = formData.getAll('images') as File[]
    if (imageFiles.length === 0) {
      return NextResponse.json({ error: '未提供图片' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    // Upload all images to storage + run OCR in parallel
    const results = await Promise.all(
      imageFiles.map(async (imageFile, idx) => {
        const fileName = `${DEFAULT_USER_ID}/${Date.now()}-${idx}.jpg`
        const buffer = Buffer.from(await imageFile.arrayBuffer())

        const { error: uploadError } = await supabase.storage
          .from('article-images')
          .upload(fileName, buffer, { contentType: imageFile.type })

        if (uploadError) throw new Error('图片上传失败: ' + uploadError.message)

        const { data: { publicUrl } } = supabase.storage
          .from('article-images')
          .getPublicUrl(fileName)

        const ocrResult = await extractTextFromImage(buffer.toString('base64'), imageFile.type)
        return { publicUrl, ocrResult }
      })
    )

    // Combine multi-page results
    const title = results.find((r) => r.ocrResult.title)?.ocrResult.title ?? null
    const content = results.map((r) => r.ocrResult.content).filter(Boolean).join('\n---\n')
    const annotated_words = results.flatMap((r) => r.ocrResult.annotated_words)
    const handwritten_notes = results.flatMap((r) => r.ocrResult.handwritten_notes)
    const imageUrls = results.map((r) => r.publicUrl)

    if (!content) {
      return NextResponse.json({ error: '无法从图片中提取文字' }, { status: 422 })
    }

    // Save article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        user_id: DEFAULT_USER_ID,
        title,
        content,
        raw_image_urls: imageUrls,
        source: 'photo',
      })
      .select()
      .single()

    if (articleError || !article) {
      return NextResponse.json({ error: '保存文章失败' }, { status: 500 })
    }

    const annotatedWordsList = annotated_words.map((a) => a.text)
    if (annotatedWordsList.length > 0) {
      await processAnnotatedWords(supabase, article.id, annotated_words, handwritten_notes)
      // Lookup definitions + build relations in background (non-blocking)
      lookupAndEnrichAsync(supabase, annotatedWordsList).catch(console.error)
    }

    return NextResponse.json({
      articleId: article.id,
      title,
      pageCount: imageFiles.length,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: '处理失败，请重试' }, { status: 500 })
  }
}

async function processAnnotatedWords(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  articleId: string,
  annotatedWords: { text: string; type: string }[],
  handwrittenNotes: { near_text: string; note: string }[]
) {
  for (const annotation of annotatedWords) {
    // Upsert word stub — definition will be filled in by lookupAndEnrichAsync
    const { data: existing } = await supabase
      .from('words')
      .select('id, definition')
      .eq('hanzi', annotation.text)
      .maybeSingle()

    let wordId: string | undefined
    if (existing) {
      wordId = existing.id
    } else {
      const { data: newWord } = await supabase
        .from('words')
        .insert({ hanzi: annotation.text, pinyin: '', definition: '' })
        .select('id')
        .single()
      wordId = newWord?.id
    }

    if (!wordId) continue

    await supabase
      .from('user_words')
      .upsert({ user_id: DEFAULT_USER_ID, word_id: wordId, status: 'new' }, { onConflict: 'user_id,word_id' })

    const note = handwrittenNotes.find((n) => n.near_text.includes(annotation.text))

    await supabase
      .from('article_words')
      .upsert({
        article_id: articleId,
        word_id: wordId,
        is_annotated: true,
        annotation_type: annotation.type ?? null,
        annotation_note: note?.note ?? null,
      }, { onConflict: 'article_id,word_id' })
  }
}

// Fill in pinyin/definition for newly annotated words, then build relations
async function lookupAndEnrichAsync(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  hanziList: string[]
) {
  for (const hanzi of hanziList) {
    try {
      // Check if already has definition
      const { data: existing } = await supabase
        .from('words')
        .select('id, definition')
        .eq('hanzi', hanzi)
        .maybeSingle()

      if (existing && existing.definition) continue  // already enriched

      const result = await lookupWord(hanzi)

      if (existing) {
        await supabase
          .from('words')
          .update({
            pinyin: result.pinyin,
            part_of_speech: result.part_of_speech,
            definition: result.definition,
            example_sentences: result.example_sentences,
            usage_notes: result.usage_notes,
          })
          .eq('id', existing.id)
      }
    } catch (err) {
      console.error(`Failed to enrich word "${hanzi}":`, err)
    }
  }

  // Build knowledge relations after all words are enriched
  const { data: userWords } = await supabase
    .from('user_words')
    .select('words(hanzi)')
    .eq('user_id', DEFAULT_USER_ID)
    .limit(200)

  const learnedWords = (userWords ?? [])
    .map((uw) => (uw.words as unknown as { hanzi: string } | null)?.hanzi)
    .filter(Boolean) as string[]

  for (const hanzi of hanziList) {
    const existing = learnedWords.filter((w) => w !== hanzi)
    if (existing.length === 0) continue

    const relations = await findRelatedWords(hanzi, existing)
    const { data: wordA } = await supabase.from('words').select('id').eq('hanzi', hanzi).single()
    if (!wordA) continue

    for (const rel of relations) {
      const { data: wordB } = await supabase.from('words').select('id').eq('hanzi', rel.word).single()
      if (!wordB) continue

      await supabase.from('word_relationships').upsert({
        word_a_id: wordA.id, word_b_id: wordB.id,
        relation_type: rel.relation_type, explanation: rel.explanation, auto_generated: true,
      }, { onConflict: 'word_a_id,word_b_id,relation_type' })

      await supabase.from('word_relationships').upsert({
        word_a_id: wordB.id, word_b_id: wordA.id,
        relation_type: rel.relation_type, explanation: rel.explanation, auto_generated: true,
      }, { onConflict: 'word_a_id,word_b_id,relation_type' })
    }
  }
}
