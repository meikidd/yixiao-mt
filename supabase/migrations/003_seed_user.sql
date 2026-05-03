-- Seed the single user for Yixiao
-- The generated UUID will be the DEFAULT_USER_ID to set in .env.local
INSERT INTO users (id, display_name, grade)
VALUES ('00000000-0000-0000-0000-000000000001', 'Yixiao', 'P4')
ON CONFLICT (id) DO NOTHING;
