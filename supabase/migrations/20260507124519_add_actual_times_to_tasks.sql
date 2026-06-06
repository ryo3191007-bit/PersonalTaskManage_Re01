/*
  # tasks テーブルに実績時間カラムを追加

  ## 変更内容
  - tasks テーブルに actual_start (実績開始日時) カラムを追加
  - tasks テーブルに actual_end (実績終了日時) カラムを追加
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'actual_start'
  ) THEN
    ALTER TABLE tasks ADD COLUMN actual_start timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'actual_end'
  ) THEN
    ALTER TABLE tasks ADD COLUMN actual_end timestamptz;
  END IF;
END $$;
