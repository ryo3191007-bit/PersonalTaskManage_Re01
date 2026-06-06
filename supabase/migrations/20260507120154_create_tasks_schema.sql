/*
  # タスク管理アプリ スキーマ作成

  ## 概要
  1人用タスク管理アプリのデータベーススキーマを作成します。

  ## 新規テーブル

  ### task_categories (タスク分類)
  - id: UUID主キー
  - name: 分類名
  - color: 表示色
  - user_id: ユーザーID（auth.users参照）
  - created_at: 作成日時

  ### tasks (タスク)
  - id: UUID主キー
  - user_id: ユーザーID（auth.users参照）
  - title: タスク名
  - category_id: タスク分類（task_categories参照）
  - difficulty: 難易度（1-5）
  - quantity: 数量
  - time_per_unit: 1件あたり所要時間（分）
  - scheduled_start: 開始予定日時
  - scheduled_end: 終了予定日時
  - parent_task_id: 親タスクID（自己参照）
  - notes: 備考
  - status: ステータス（not_started/in_progress/completed）
  - completed_at: 完了日時
  - actual_time: 実績時間（分）
  - actual_memo: 実績メモ
  - created_at: 作成日時
  - updated_at: 更新日時

  ## セキュリティ
  - 全テーブルにRLS有効化
  - 認証済みユーザーが自分のデータのみアクセス可能
*/

-- task_categories テーブル
CREATE TABLE IF NOT EXISTS task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own categories"
  ON task_categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON task_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON task_categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON task_categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- tasks テーブル
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category_id uuid REFERENCES task_categories(id) ON DELETE SET NULL,
  difficulty integer DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  quantity integer DEFAULT 1,
  time_per_unit integer DEFAULT 0,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  parent_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  actual_time integer DEFAULT 0,
  actual_memo text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- インデックス
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_scheduled_start_idx ON tasks(scheduled_start);
CREATE INDEX IF NOT EXISTS tasks_scheduled_end_idx ON tasks(scheduled_end);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_parent_task_id_idx ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS task_categories_user_id_idx ON task_categories(user_id);
