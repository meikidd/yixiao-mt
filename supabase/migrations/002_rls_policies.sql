-- Enable RLS on all user-data tables
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_words ENABLE ROW LEVEL SECURITY;

-- articles: users can only see their own
CREATE POLICY "articles_own" ON articles
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid);

-- user_words: users can only see their own
CREATE POLICY "user_words_own" ON user_words
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid);

-- article_words: accessible if user owns the article
CREATE POLICY "article_words_own" ON article_words
  FOR ALL USING (
    article_id IN (
      SELECT id FROM articles
      WHERE user_id = current_setting('app.user_id', true)::uuid
    )
  );

-- words and word_relationships are global (no RLS needed)
