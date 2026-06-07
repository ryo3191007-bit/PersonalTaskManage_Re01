/*
  # recurrence_groups に track_actual カラムを追加

  繰り返しグループ登録時に実績入力の要/不要を設定できるようにするため、
  track_actual カラムを追加します。デフォルトは true（実績入力あり）。
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurrence_groups' AND column_name = 'track_actual'
  ) THEN
    ALTER TABLE recurrence_groups ADD COLUMN track_actual boolean NOT NULL DEFAULT true;
  END IF;
END $$;
