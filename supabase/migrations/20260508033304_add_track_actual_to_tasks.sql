/*
  # Add track_actual column to tasks

  ## Summary
  Adds a boolean column `track_actual` to the tasks table to control whether
  actual time tracking (start/end dialogs and actual fields) is required for a task.

  ## Changes
  - `tasks` table: new column `track_actual` (boolean, default true)
    - true: show actual time input dialogs and actual fields (current behavior)
    - false: hide actual time dialogs and actual fields section

  ## Notes
  - Existing tasks default to true to preserve current behavior
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'track_actual'
  ) THEN
    ALTER TABLE tasks ADD COLUMN track_actual boolean NOT NULL DEFAULT true;
  END IF;
END $$;
