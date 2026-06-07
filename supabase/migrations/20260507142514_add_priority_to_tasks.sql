/*
  # Add priority column to tasks

  1. Changes
    - `tasks` テーブルに `priority` 列を追加
      - 値: 'low' | 'medium' | 'high'
      - デフォルト: 'medium'
      - NOT NULL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE tasks ADD COLUMN priority text NOT NULL DEFAULT 'medium'
      CHECK (priority IN ('low', 'medium', 'high'));
  END IF;
END $$;
