/*
  定常タスクの日跨ぎ終了を明示的に保持する。
  false: 開始日と同日に終了
  true:  開始日の翌日に終了
*/
ALTER TABLE recurrence_groups
  ADD COLUMN IF NOT EXISTS ends_next_day boolean NOT NULL DEFAULT false;
