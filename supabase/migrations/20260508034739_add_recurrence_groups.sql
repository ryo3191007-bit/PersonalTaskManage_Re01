/*
  # 繰り返しグループ機能の追加

  ## 概要
  朝の会議など定常タスクを一括登録・一括編集できる「繰り返しグループ」機能を追加します。

  ## 新規テーブル
  - `recurrence_groups`
    - `id` (uuid, PK)
    - `user_id` (uuid, FK → auth.users)
    - `title` (text) : グループ名（タスクのタイトルとして使用）
    - `category_id` (uuid, nullable, FK → task_categories)
    - `priority` (text) : low / medium / high
    - `start_time` (text) : 開始時刻 "HH:MM"
    - `end_time` (text, nullable) : 終了時刻 "HH:MM"
    - `recurrence_type` (text) : 'daily' | 'weekly'
    - `days_of_week` (int[], nullable) : 0=日,1=月,...,6=土 (weekly時に使用)
    - `period_start` (date) : 登録期間開始日
    - `period_end` (date) : 登録期間終了日
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## 変更テーブル
  - `tasks`
    - `recurrence_group_id` (uuid, nullable, FK → recurrence_groups) を追加

  ## セキュリティ
  - recurrence_groups に RLS を有効化
  - 認証ユーザーが自分のグループのみ CRUD できるポリシーを追加
*/

-- recurrence_groups テーブル作成
CREATE TABLE IF NOT EXISTS recurrence_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  category_id uuid REFERENCES task_categories(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium',
  start_time text NOT NULL DEFAULT '09:00',
  end_time text,
  recurrence_type text NOT NULL DEFAULT 'daily',
  days_of_week int[],
  period_start date NOT NULL,
  period_end date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recurrence_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own recurrence groups"
  ON recurrence_groups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurrence groups"
  ON recurrence_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurrence groups"
  ON recurrence_groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurrence groups"
  ON recurrence_groups FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- tasks に recurrence_group_id カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_group_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_group_id uuid REFERENCES recurrence_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_recurrence_groups_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_recurrence_groups_updated_at ON recurrence_groups;
CREATE TRIGGER set_recurrence_groups_updated_at
  BEFORE UPDATE ON recurrence_groups
  FOR EACH ROW EXECUTE FUNCTION update_recurrence_groups_updated_at();
