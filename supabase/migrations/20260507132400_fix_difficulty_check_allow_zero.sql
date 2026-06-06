/*
  # difficulty チェック制約を修正

  ## 変更内容
  - tasks テーブルの tasks_difficulty_check 制約を変更
  - difficulty の最小値を 1 → 0 に変更（0 = 未設定）
*/

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_difficulty_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_difficulty_check CHECK (difficulty >= 0 AND difficulty <= 5);
