-- 為 groups 表新增邀請碼欄位
-- 邀請碼為 6 碼大寫英數字，全域唯一
ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_code VARCHAR(6) UNIQUE;
