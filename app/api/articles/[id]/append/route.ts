import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { extractTextFromImage } from '@/lib/claude/ocr'
import { lookupWord } from '@/lib/claude/lookup'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const imageFiles = formData.getAll('images') as File[]
    if (imageFiles.length === 0) {
      return NextResponse.json({ error: '未提供图片' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    // Verify article belongs to user
    const { data: article } = await supabase
      .from('articles')
      .select('id, content, raw_image_urls, title')
      .eq('id', id)
      .eq('user_id', DEFAULT_USER_ID)
      .single() as { data: { id: string; content: string; raw_image_urls: string[] | null; title: string | null } | null }

    if (!article) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }

    // Upload all new images + OCR in parallel
    const results = await Promise.all(
      imageFiles.map(async (imageFile, idx) => {
        const fileName = `${DEFAULT_USER_ID}/${Date.now()}-append-${idx}.jpg`
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

    const newContent = results.map((r) => r.ocrResult.content).filter(Boolean).join('\n---\n')
    const newImageUrls = results.map((r) => r.publicUrl)
    const newAnnotatedWords = results.flatMap((r) => r.ocrResult.annotated_words)
    const newHandwrittenNotes = results.flatMap((r) => r.ocrResult.handwritten_notes)

    // Append content and images to existing article
    const updatedContent = article.content
      ? `${article.content}\n---\n${newContent}`
      : newContent
    const updatedImageUrls = [...(article.raw_image_urls ?? []), ...newImageUrls]

    const { error: updateError } = await supabase
      .from('articles')
      .update({ content: updatedContent, raw_image_urls: updatedImageUrls })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: '更新文章失败' }, { status: 500 })
    }

    // Process any newly annotated words
    if (newAnnotatedWords.length > 0) {
      for (const annotation of newAnnotatedWords) {
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

        const note = newHandwrittenNotes.find((n) => n.near_text.includes(annotation.text))
        await supabase
          .from('article_words')
          .upsert({
            article_id: id,
            word_id: wordId,
            is_annotated: true,
            annotation_type: annotation.type ?? null,
            annotation_note: note?.note ?? null,
          }, { onConflict: 'article_id,word_id' })
      }

      // Enrich definitions in background
      enrichWordsAsync(supabase, newAnnotatedWords.map((a) => a.text)).catch(console.error)
    }

    return NextResponse.json({ success: true, addedPages: imageFiles.length })
  } catch (err) {
    console.error('Append error:', err)
    return NextResponse.json({ error: '处理失败，请重试' }, { status: 500 })
  }
}

async function enrichWordsAsync(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  hanziList: string[]
) {
  for (const hanzi of hanziList) {
    try {
      const { data: existing } = await supabase
        .from('words')
        .select('id, definition')
        .eq('hanzi', hanzi)
        .maybeSingle()

      if (existing?.definition) continue

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
}
