/*
  # Add estimate factor columns to tasks

  1. Changes
    - `tasks` テーブルに以下の列を追加
      - `start_delay_factor`   : 開始遅延要因 (text, nullable)
      - `start_early_factor`   : 開始前倒し要因 (text, nullable)
      - `duration_over_factor` : 所要時間超過要因 (text, nullable)
      - `duration_short_factor`: 所要時間短縮要因 (text, nullable)
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='start_delay_factor') THEN
    ALTER TABLE tasks ADD COLUMN start_delay_factor text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='start_early_factor') THEN
    ALTER TABLE tasks ADD COLUMN start_early_factor text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='duration_over_factor') THEN
    ALTER TABLE tasks ADD COLUMN duration_over_factor text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='duration_short_factor') THEN
    ALTER TABLE tasks ADD COLUMN duration_short_factor text;
  END IF;
END $$;
