ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);
UPDATE users SET nickname = name WHERE nickname IS NULL;
