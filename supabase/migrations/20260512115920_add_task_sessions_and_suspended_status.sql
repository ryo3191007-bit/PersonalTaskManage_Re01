/*
  # タスク中断・再開機能の追加

  ## 概要
  タスクの中断・再開を複数回繰り返せる機能を追加します。
  中断中の時間を除いた純粋な作業時間を記録し、再開日にも正しくタスクが表示されます。

  ## 変更内容

  ### 1. tasks テーブル
  - `status` カラムの CHECK 制約を拡張し、`suspended`（中断）を追加
  - `suspended_at`: 最後に中断した日時（nullable）

  ### 2. 新テーブル: task_sessions
  タスクの各作業セグメント（開始〜中断 or 開始〜完了）を記録します。
  - `id`: UUID 主キー
  - `task_id`: tasks テーブルへの外部キー
  - `user_id`: ユーザー ID（RLS 用）
  - `session_start`: セグメント開始日時
  - `session_end`: セグメント終了日時（中断時刻 or 完了時刻。進行中は NULL）
  - `created_at`: 作成日時

  ## セキュリティ
  - RLS 有効化
  - 認証済みユーザーが自分のセッションのみ操作できるポリシーを設定
*/

-- tasks の status check 制約を更新
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('not_started', 'in_progress', 'completed', 'suspended'));

-- suspended_at カラム追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'suspended_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN suspended_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- task_sessions テーブル作成
CREATE TABLE IF NOT EXISTS task_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start timestamptz NOT NULL,
  session_end timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS task_sessions_task_id_idx ON task_sessions(task_id);
CREATE INDEX IF NOT EXISTS task_sessions_user_id_idx ON task_sessions(user_id);

-- RLS 有効化
ALTER TABLE task_sessions ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
CREATE POLICY "Users can select own sessions"
  ON task_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON task_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON task_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON task_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
