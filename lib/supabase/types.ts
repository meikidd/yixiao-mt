export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          display_name: string
          grade: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          display_name: string
          grade?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string
          grade?: string | null
          created_at?: string
        }
      }
      articles: {
        Row: {
          id: string
          user_id: string
          title: string | null
          content: string
          raw_image_urls: string[] | null
          source: string
          date_read: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          content: string
          raw_image_urls?: string[] | null
          source?: string
          date_read?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          content?: string
          raw_image_urls?: string[] | null
          source?: string
          date_read?: string
          notes?: string | null
          created_at?: string
        }
      }
      words: {
        Row: {
          id: string
          hanzi: string
          pinyin: string
          part_of_speech: string | null
          definition: string
          example_sentences: Json | null
          usage_notes: string | null
          hsk_level: number | null
          created_at: string
        }
        Insert: {
          id?: string
          hanzi: string
          pinyin: string
          part_of_speech?: string | null
          definition: string
          example_sentences?: Json | null
          usage_notes?: string | null
          hsk_level?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          hanzi?: string
          pinyin?: string
          part_of_speech?: string | null
          definition?: string
          example_sentences?: Json | null
          usage_notes?: string | null
          hsk_level?: number | null
          created_at?: string
        }
      }
      user_words: {
        Row: {
          id: string
          user_id: string
          word_id: string
          status: string
          first_seen_at: string
          last_reviewed_at: string | null
          next_review_at: string | null
          review_count: number
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          word_id: string
          status?: string
          first_seen_at?: string
          last_reviewed_at?: string | null
          next_review_at?: string | null
          review_count?: number
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          word_id?: string
          status?: string
          first_seen_at?: string
          last_reviewed_at?: string | null
          next_review_at?: string | null
          review_count?: number
          notes?: string | null
        }
      }
      article_words: {
        Row: {
          article_id: string
          word_id: string
          context_sentence: string | null
          is_annotated: boolean
          annotation_type: string | null
          annotation_note: string | null
        }
        Insert: {
          article_id: string
          word_id: string
          context_sentence?: string | null
          is_annotated?: boolean
          annotation_type?: string | null
          annotation_note?: string | null
        }
        Update: {
          article_id?: string
          word_id?: string
          context_sentence?: string | null
          is_annotated?: boolean
          annotation_type?: string | null
          annotation_note?: string | null
        }
      }
      word_relationships: {
        Row: {
          id: string
          word_a_id: string
          word_b_id: string
          relation_type: string
          explanation: string | null
          auto_generated: boolean
          created_at: string
        }
        Insert: {
          id?: string
          word_a_id: string
          word_b_id: string
          relation_type: string
          explanation?: string | null
          auto_generated?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          word_a_id?: string
          word_b_id?: string
          relation_type?: string
          explanation?: string | null
          auto_generated?: boolean
          created_at?: string
        }
      }
    }
  }
}

export type UserRow = Database['public']['Tables']['users']['Row']
export type ArticleRow = Database['public']['Tables']['articles']['Row']
export type WordRow = Database['public']['Tables']['words']['Row']
export type UserWordRow = Database['public']['Tables']['user_words']['Row']
export type ArticleWordRow = Database['public']['Tables']['article_words']['Row']
export type WordRelationshipRow = Database['public']['Tables']['word_relationships']['Row']

export type WordStatus = 'new' | 'learning' | 'reviewing' | 'mastered'
export type RelationType = 'antonym' | 'synonym' | 'same_char' | 'related'
export type AnnotationType = 'underline' | 'circle' | 'note'

export interface ExampleSentence {
  sentence: string
  source?: string
}

export interface WordWithStatus extends WordRow {
  user_word?: UserWordRow
}

export interface ArticleWithWords extends ArticleRow {
  article_words?: (ArticleWordRow & { word: WordRow })[]
}
