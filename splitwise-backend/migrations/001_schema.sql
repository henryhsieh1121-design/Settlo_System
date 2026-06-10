-- 分帳無痛 資料庫 Schema
-- 所有金額欄位以「分」(integer) 儲存，避免浮點數精度問題

-- 使用者資料表
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(255)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- 群組資料表
CREATE TABLE IF NOT EXISTS groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  description TEXT,
  created_by  INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- 群組成員多對多關聯表
CREATE TABLE IF NOT EXISTS group_members (
  group_id    INTEGER       NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ   DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- 費用資料表，amount 以「分」為整數單位
CREATE TABLE IF NOT EXISTS expenses (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER       NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  paid_by     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      INTEGER       NOT NULL CHECK (amount > 0),
  description VARCHAR(255)  NOT NULL,
  category    VARCHAR(50)   DEFAULT '其他',
  date        DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- 費用分攤明細表，一筆費用對應多筆分攤記錄
CREATE TABLE IF NOT EXISTS expense_splits (
  id           SERIAL PRIMARY KEY,
  expense_id   INTEGER       NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id      INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_owed  INTEGER       NOT NULL CHECK (amount_owed >= 0)
);

-- 已完成的還款記錄表
CREATE TABLE IF NOT EXISTS settlements (
  id           SERIAL PRIMARY KEY,
  group_id     INTEGER       NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user_id INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id   INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount       INTEGER       NOT NULL CHECK (amount > 0),
  settled_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- 效能索引
CREATE INDEX IF NOT EXISTS idx_group_members_user_id    ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id        ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by         ON expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id   ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group_id     ON settlements(group_id);
