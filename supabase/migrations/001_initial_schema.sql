-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  display_name text NOT NULL,
  grade text,
  created_at timestamptz DEFAULT now()
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  raw_image_urls text[],
  source text NOT NULL DEFAULT 'photo',
  date_read date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Global word dictionary
CREATE TABLE IF NOT EXISTS words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hanzi text UNIQUE NOT NULL,
  pinyin text NOT NULL,
  part_of_speech text,
  definition text NOT NULL,
  example_sentences jsonb,
  usage_notes text,
  hsk_level int,
  created_at timestamptz DEFAULT now()
);

-- User word learning status
CREATE TABLE IF NOT EXISTS user_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'new',
  first_seen_at timestamptz DEFAULT now(),
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  review_count int NOT NULL DEFAULT 0,
  notes text,
  UNIQUE(user_id, word_id)
);

-- Article-word junction with annotation info
CREATE TABLE IF NOT EXISTS article_words (
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  context_sentence text,
  is_annotated bool NOT NULL DEFAULT false,
  annotation_type text,
  annotation_note text,
  PRIMARY KEY (article_id, word_id)
);

-- Knowledge graph
CREATE TABLE IF NOT EXISTS word_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_a_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  word_b_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  explanation text,
  auto_generated bool NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(word_a_id, word_b_id, relation_type)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_articles_user_date ON articles(user_id, date_read DESC);
CREATE INDEX IF NOT EXISTS idx_user_words_user ON user_words(user_id);
CREATE INDEX IF NOT EXISTS idx_user_words_review ON user_words(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_article_words_article ON article_words(article_id);
CREATE INDEX IF NOT EXISTS idx_word_relationships_a ON word_relationships(word_a_id);
CREATE INDEX IF NOT EXISTS idx_word_relationships_b ON word_relationships(word_b_id);
