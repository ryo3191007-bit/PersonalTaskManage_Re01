# CLAUDE.md

このファイルは Claude Code、Codex、ChatGPT、その他の AI エージェントがこのプロジェクトで安全に開発を継続するためのリファレンスです。
コードベースの全体像・設計意図・実装ルールを記載しています。必ず通読してから作業を開始してください。

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [技術構成](#2-技術構成)
3. [ディレクトリ構成](#3-ディレクトリ構成)
4. [開発コマンド](#4-開発コマンド)
5. [アーキテクチャ](#5-アーキテクチャ)
6. [データモデル](#6-データモデル)
7. [ページ・コンポーネント設計](#7-ページコンポーネント設計)
8. [実装ルール](#8-実装ルール)
9. [UI/UX ルール](#9-uiux-ルール)
10. [テスト方針](#10-テスト方針)
11. [AI エージェント向け注意事項](#11-ai-エージェント向け注意事項)
12. [今後の開発予定](#12-今後の開発予定)
13. [既知の課題・技術的負債](#13-既知の課題技術的負債)

---

## 1. プロジェクト概要

### アプリの目的

個人向けタスク管理 Web アプリ。単なる TODO 管理にとどまらず、**業務時間の計測・分析・改善**を支援することを目的とする。

### 想定ユーザー

- 業務の計画・実績を記録・振り返りたいシングルユーザー（個人利用）
- タスクの遅延要因・時間超過要因を分析して自己改善したいビジネスパーソン

### 解決したい課題

| 課題 | 本アプリの解決策 |
|---|---|
| 予定と実績のズレを把握できない | 予定時刻・実績時刻を両方記録し、分析ページで比較 |
| 繰り返しタスクの管理が面倒 | 定常タスクグループで一括生成・一括更新 |
| タスク中断・再開の時間を把握できない | セッション管理（中断/再開ペア）で正確な実働時間を計測 |
| 遅延の原因を振り返れない | 開始遅延・終了超過の要因を係数として記録し、統計集計 |

### UI 言語

**全 UI は日本語**。ステータスラベル・ボタン・フォームラベルはすべて日本語。英語化する必要はない。

---

## 2. 技術構成

### フロントエンド

| 項目 | 採用技術 |
|---|---|
| フレームワーク | React 18 |
| 言語 | TypeScript 5 |
| ビルドツール | Vite 5 |
| CSS | Tailwind CSS 3（`darkMode: 'class'`） |
| アイコン | lucide-react |
| ルーティング | **なし**（state ベース。react-router 未使用） |
| 日時処理 | ネイティブ `Date` + `Intl.DateTimeFormat`（`ja-JP` ロケール） |

### バックエンド

| 項目 | 採用技術 |
|---|---|
| BaaS | Supabase（PostgreSQL + Auth） |
| クライアント | `@supabase/supabase-js` v2 |
| Edge Functions | 未使用 |

### 認証方式

Supabase **メールアドレス + パスワード認証**。メール確認は OFF。ソーシャルログイン・マジックリンクは未実装。

### 外部 API

現時点で外部 API の使用なし。ブラウザの **Notification API**（プッシュ通知）を使用。

### ホスティング環境

要確認（Bolt / Vercel / Netlify 等を想定。`.env` に Supabase 接続情報を設定）。

### 環境変数

| 変数名 | 説明 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase プロジェクト URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名公開キー |

> **注意**: これらの値は `.env` に定義済み。AI エージェントはこれらを変更・削除・上書きしてはならない。

---

## 3. ディレクトリ構成

```
project/
├── src/
│   ├── App.tsx                   # ルートコンポーネント。Context プロバイダーの組み立て・認証ガード・ページルーティング
│   ├── main.tsx                  # エントリポイント
│   ├── index.css                 # グローバルCSS（Tailwind directives + カスタムユーティリティクラス）
│   ├── vite-env.d.ts             # Vite 型定義
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Supabase 認証状態管理
│   │   ├── TaskContext.tsx       # タスク・カテゴリ・定常グループの全データ管理（最も複雑）
│   │   └── ThemeContext.tsx      # ライト/ダークテーマ管理
│   │
│   ├── lib/
│   │   ├── supabase.ts           # Supabase クライアントの初期化と export
│   │   ├── types.ts              # 全型定義・インターフェース・定数
│   │   ├── utils.ts              # 汎用ユーティリティ（日時計算・ツリー構築・CSV出力など）
│   │   └── useWorkHours.ts       # 1日の作業時間上限設定を localStorage で管理するカスタムフック
│   │
│   ├── components/
│   │   ├── NavLink.tsx           # サイドバー用ナビゲーションリンク
│   │   ├── layout/
│   │   │   ├── Header.tsx        # 上部ヘッダー（ページタイトル・テーマ切替・ログアウト）
│   │   │   └── Sidebar.tsx       # 左サイドバー（折りたたみ可能なナビゲーション）
│   │   └── tasks/
│   │       ├── TaskCard.tsx      # タスク一覧の1行カード（useTasks を直接参照）
│   │       ├── TaskForm.tsx      # タスク作成・編集フォーム（モーダル）
│   │       ├── TaskFilters.tsx   # タスク一覧のフィルターバー
│   │       ├── RecurrenceForm.tsx# 定常タスクグループ作成・編集フォーム（モーダル）
│   │       └── titleHistory.ts   # タスク名の入力履歴管理（localStorage、max 30件）
│   │
│   └── pages/
│       ├── LoginPage.tsx         # ログイン・サインアップ画面
│       ├── TaskListPage.tsx      # タスク一覧（メイン画面）
│       ├── CalendarPage.tsx      # カレンダービュー（日・週・月）
│       ├── AnalyticsPage.tsx     # 分析ダッシュボード
│       ├── RecurrenceGroupsPage.tsx # 定常タスクグループ管理
│       └── SettingsPage.tsx      # 設定（カテゴリ管理・通知許可）
│
├── supabase/
│   └── migrations/               # SQL マイグレーションファイル（番号順に適用）
│
├── public/                       # 静的ファイル
├── .env                          # 環境変数（Git 管理外）
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.app.json
└── package.json
```

---

## 4. 開発コマンド

```bash
# 本番ビルド（Vite）
npm run build

# 型チェック（emit なし）
npm run typecheck

# ESLint
npm run lint

# 開発サーバー（外部ハーネスが起動するため、AI エージェントは実行しない）
# npm run dev  ← 実行禁止
```

**テストコマンドは存在しない**（自動テストなし）。

---

## 5. アーキテクチャ

### 状態管理

Context API 3層構成。**実際の初期化順序は以下のとおり（IMPORTANT）**:

```
ThemeProvider
  └── AuthProvider
        └── AppShell   ← 認証チェック・ページルーティングはここ
              └── TaskProvider   ← 認証成功後に初期化（App.tsx の AppShell 内部に配置）
                    └── ページコンポーネント
```

> **注意**: `TaskProvider` は `AuthProvider` の直下ではなく、認証ガードを通過した `AppShell` の内側に配置されている。これは `TaskProvider` が `useAuth()` で取得した `user` に依存してデータフェッチするため、認証前に初期化されないようにする設計上の意図である。新しいページを追加するときも `TaskProvider` の内側に配置すること。

| Context | ファイル | 責務 | 公開インターフェース |
|---|---|---|---|
| `ThemeContext` | `src/contexts/ThemeContext.tsx` | ライト/ダーク切替。localStorage に保存。初回はシステム設定を参照。`<html>` に `dark` クラスを付与 | `theme`, `toggleTheme` |
| `AuthContext` | `src/contexts/AuthContext.tsx` | Supabase 認証状態。 | `user`, `session`, `loading`, `signIn`, `signUp`, `signOut` |
| `TaskContext` | `src/contexts/TaskContext.tsx` | タスク・カテゴリ・定常グループ・セッションの全 CRUD。**データの唯一の真実** | 下記参照 |

#### TaskContext の公開インターフェース（`src/contexts/TaskContext.tsx`）

```typescript
interface TaskContextValue {
  // データ
  tasks: Task[];
  categories: TaskCategory[];
  recurrenceGroups: RecurrenceGroup[];
  sessions: TaskSession[];      // 全タスクのセッションをフラットに保持
  loading: boolean;
  // 操作
  refetch: () => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  createCategory: (cat: Partial<TaskCategory>) => Promise<TaskCategory | null>;
  updateCategory: (id: string, cat: Partial<TaskCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  createRecurrenceGroup: (group: Partial<RecurrenceGroup>) => Promise<RecurrenceGroup | null>;
  updateRecurrenceGroup: (id: string, group: Partial<RecurrenceGroup>) => Promise<void>;
  deleteRecurrenceGroup: (id: string) => Promise<void>;  // ★グループ配下のタスクも全削除される
  bulkCreateTasksForGroup: (group: RecurrenceGroup) => Promise<void>;
  bulkUpdateTasksForGroup: (groupId: string, updates: Partial<Task>) => Promise<void>;  // ★完了済みタスクは対象外。内部で refetch() を呼ぶ
  suspendTask: (task: Task, suspendedAt: string) => Promise<void>;
  resumeTask: (task: Task, resumedAt: string) => Promise<void>;
  updateSession: (id: string, fields: { session_start?: string; session_end?: string }) => Promise<void>;
  createSession: (taskId: string, sessionStart: string, sessionEnd: string | null) => Promise<TaskSession | null>;
  deleteSession: (id: string) => Promise<void>;
}
```

#### TaskContext の重要な内部動作

- **`deleteRecurrenceGroup(id)`**: グループ削除時に `tasks` テーブルから `recurrence_group_id = id` の**全タスクを削除**する（NULL 化ではなく削除）。
- **`bulkUpdateTasksForGroup(groupId, updates)`**: 他の更新系メソッドと異なり、カテゴリ JOIN が必要なため `await refetch()` で全データを再取得する（楽観的更新ではない）。
- **`updateRecurrenceGroup` での `track_actual` 変更**: グループの `track_actual` を変更すると、そのグループ内の未完了タスク全てにも `track_actual` が伝播される。
- **`resumeTask` の補完セッション作成**: 中断タスクを再開する際、`suspended_at` に対応する `session_end` を持つセッションが存在しない場合、`actual_start → suspended_at` の補完セッションを自動作成する。これはデータ整合性のための処理であり、意図的な設計である。削除・変更しないこと。
- **`generateDates(group)`**: `TaskContext.tsx` 内のプライベート関数。`utils.ts` には存在しない。

#### 楽観的更新 vs 再フェッチの使い分け

| メソッド | 更新方式 |
|---|---|
| `createTask` / `updateTask` / `deleteTask` | 楽観的更新（Context state を直接更新） |
| `createCategory` / `updateCategory` / `deleteCategory` | 楽観的更新 |
| `createRecurrenceGroup` / `updateRecurrenceGroup` / `deleteRecurrenceGroup` | 楽観的更新 |
| `bulkUpdateTasksForGroup` | **`refetch()` で全再取得**（カテゴリ JOIN が必要なため） |

### ページルーティング

`react-router` 等のルーターライブラリは**未使用**。`App.tsx` の `AppShell` コンポーネントが `page` state（型: `Page`）を持ち、`Sidebar` の `onNavigate` コールバックで切り替える。

```typescript
// App.tsx
type Page = 'list' | 'calendar' | 'analytics' | 'settings' | 'recurrence';
```

### API 通信

Supabase クライアント（`src/lib/supabase.ts`）を Context 内で直接呼び出す。専用の API レイヤーは存在しない。データ取得は Context の初期化時（`useEffect`）で行い、以後は Context 内の state を更新する。

コンポーネントやページが直接 `supabase` クライアントを呼び出してはならない。必ず Context 経由で操作すること。

### データフロー

```
Supabase DB
  ↓ 初回ロード（TaskContext の refetch）
tasks / categories / recurrenceGroups / sessions （Context state）
  ↓
Pages / Components（useTasks で参照）
  ↓ ユーザー操作
Context メソッド（createTask, updateTask など）
  ↓ Supabase への書き込み
  ↓ 成功後に Context state を更新（楽観的更新または refetch）
```

---

## 6. データモデル

### 型定義の注意点（誤実装防止）

`src/lib/types.ts` を必ず参照すること。以下のフィールドは **nullable ではない**（`null` を代入するとランタイムエラーになる）:

| フィールド | 型 | DB デフォルト | INSERT 時の注意 |
|---|---|---|---|
| `Task.quantity` | `number` | `1` | `0` をデフォルト値として設定 |
| `Task.time_per_unit` | `number` | `0` | `0` をデフォルト値として設定 |
| `Task.actual_time` | `number` | `0` | `0` をデフォルト値として設定 |
| `Task.actual_memo` | `string` | `''` | `''` をデフォルト値として設定 |
| `Task.notes` | `string` | `''` | `''` をデフォルト値として設定 |
| `Task.difficulty` | `number` | `0` | `0〜5` の整数 |

`RecurrenceGroup.end_time` は **`string | null`** である（`string` ではない）。`bulkCreateTasksForGroup` 内で null チェックが必要。

### Task（タスク）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string (UUID)` | PK |
| `user_id` | `string` | auth.users の FK |
| `title` | `string` | タスク名 |
| `category_id` | `string \| null` | カテゴリ FK |
| `status` | `TaskStatus` | `not_started \| in_progress \| completed \| suspended` |
| `priority` | `TaskPriority` | `low \| medium \| high` |
| `difficulty` | `number (0-5)` | 難易度（0=未設定、1〜5=★の数） |
| `quantity` | `number` | 作業量（デフォルト 1） |
| `time_per_unit` | `number` | 単位あたり時間（分、デフォルト 0） |
| `scheduled_start` | `string \| null` | 予定開始日時（ISO） |
| `scheduled_end` | `string \| null` | 予定終了日時（ISO） |
| `actual_start` | `string \| null` | 実績開始日時（ISO） |
| `actual_end` | `string \| null` | 実績終了日時（ISO） |
| `actual_time` | `number` | 実績時間（分、デフォルト 0）。sessions がある場合は sessions から計算 |
| `suspended_at` | `string \| null` | 中断日時（ISO） |
| `actual_memo` | `string` | 実績メモ（デフォルト `''`） |
| `notes` | `string` | 予定メモ（デフォルト `''`） |
| `parent_task_id` | `string \| null` | 親タスク FK（自己参照） |
| `recurrence_group_id` | `string \| null` | 定常タスクグループ FK |
| `track_actual` | `boolean` | 実績追跡フラグ。false の場合、分析対象外・実績フィールド非表示 |
| `completed_at` | `string \| null` | 完了日時（ISO） |
| `start_delay_factor` | `string \| null` | 開始遅延の要因コード |
| `start_early_factor` | `string \| null` | 早期開始の要因コード |
| `duration_over_factor` | `string \| null` | 所要時間超過の要因コード |
| `duration_short_factor` | `string \| null` | 所要時間短縮の要因コード |
| `category` | `TaskCategory \| null` | JOIN で取得（DB カラムなし） |
| `children` | `Task[]` | 子タスクの配列（DB カラムなし、`buildTree()` で組み立てる） |
| `sessions` | `TaskSession[]` | セッション配列（DB カラムなし、TaskContext から別途注入） |

#### TaskStatus の遷移

```
not_started
  → in_progress（開始時に start_delay_factor または start_early_factor を記録）
      → suspended（suspended_at 記録、セッションをクローズ）
          → in_progress（再開、新セッション開始）
      → completed（actual_end, duration_*_factor を記録）
  → completed（直接完了も可）
```

### TaskSession（作業セッション）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string (UUID)` | PK |
| `task_id` | `string` | タスク FK |
| `user_id` | `string` | auth.users FK |
| `session_start` | `string` | セッション開始日時（ISO） |
| `session_end` | `string \| null` | セッション終了日時（null = 進行中） |
| `created_at` | `string` | 作成日時 |

- セッションが存在する場合、実働時間 = `Σ(session_end - session_start)`（null セッションは `actual_end` または現在時刻まで計算）。
- 中断中のギャップは実働時間から除外される。
- `sessions` は TaskContext の state としてフラットに管理される。特定タスクのセッションを取得する場合は `sessions.filter(s => s.task_id === task.id)` で絞り込む。

### RecurrenceGroup（定常タスクグループ）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string (UUID)` | PK |
| `user_id` | `string` | auth.users FK |
| `title` | `string` | グループ名 |
| `category_id` | `string \| null` | カテゴリ FK |
| `priority` | `TaskPriority` | 優先度 |
| `start_time` | `string` | タスク開始時刻（`HH:MM` 形式） |
| `end_time` | `string \| null` | タスク終了時刻（`HH:MM` 形式、**null 許容**） |
| `recurrence_type` | `RecurrenceType` | `daily \| weekly` |
| `days_of_week` | `number[] \| null` | 週次の場合の曜日（0=日〜6=土）。日次の場合は null |
| `period_start` | `string` | 繰り返し期間の開始日（ISO date） |
| `period_end` | `string` | 繰り返し期間の終了日（ISO date） |
| `notes` | `string` | 備考 |
| `track_actual` | `boolean` | 生成タスクに track_actual を適用するか |
| `category` | `TaskCategory \| null` | JOIN で取得（DB カラムなし） |

### TaskCategory（カテゴリ）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string (UUID)` | PK |
| `user_id` | `string` | auth.users FK |
| `name` | `string` | カテゴリ名 |
| `color` | `string` | カラーコード（`#RRGGBB`） |
| `created_at` | `string` | 作成日時 |

### 定数（`src/lib/types.ts`）

これらの定数は**すでに定義済み**。重複実装しないこと。

```typescript
STATUS_LABELS: Record<TaskStatus, string>      // 'not_started' → '未着手' など
STATUS_COLORS: Record<TaskStatus, string>      // Tailwind クラス文字列
PRIORITY_LABELS: Record<TaskPriority, string>  // 'high' → '高' など
PRIORITY_ORDER: Record<TaskPriority, number>   // ソート用（high: 0, medium: 1, low: 2）
DIFFICULTY_LABELS: Record<number, string>      // 1→'★☆☆☆☆', ..., 5→'★★★★★'（0 はキーなし）
START_DELAY_FACTORS: readonly string[]         // 開始遅延要因の選択肢
START_EARLY_FACTORS: readonly string[]         // 早期開始要因の選択肢
DURATION_OVER_FACTORS: readonly string[]       // 所要時間超過要因の選択肢
DURATION_SHORT_FACTORS: readonly string[]      // 所要時間短縮要因の選択肢
```

> `DIFFICULTY_LABELS` のキーは `1〜5` のみ。難易度 `0`（未設定）のラベルは定義されていないため、レンダリング時は `DIFFICULTY_LABELS[task.difficulty] ?? ''` のように undefined ガードが必要。

### データベースマイグレーション（適用順）

| ファイル | 内容 |
|---|---|
| `20260507120154_create_tasks_schema.sql` | `task_categories`, `tasks` テーブル + RLS + `updated_at` トリガー |
| `20260507124519_add_actual_times_to_tasks.sql` | `actual_start`, `actual_end` カラム追加 |
| `20260507132400_fix_difficulty_check_allow_zero.sql` | `difficulty` 制約を 0 許容に修正 |
| `20260507135810_fix_update_updated_at_search_path.sql` | トリガーの search_path セキュリティ修正 |
| `20260507142514_add_priority_to_tasks.sql` | `priority` カラム追加 |
| `20260508015438_add_estimate_factors_to_tasks.sql` | 要因カラム4本 + `track_actual` カラム追加 |
| `20260508033304_add_track_actual_to_tasks.sql` | `track_actual` デフォルト値修正 |
| `20260508034739_add_recurrence_groups.sql` | `recurrence_groups` テーブル + タスクへの FK + RLS |
| `20260508040152_add_track_actual_to_recurrence_groups.sql` | グループへ `track_actual` カラム追加 |
| `20260508052021_fix_update_recurrence_groups_updated_at_security.sql` | グループトリガーの search_path 修正 |
| `20260512115920_add_task_sessions_and_suspended_status.sql` | `task_sessions` テーブル + `suspended` ステータス + `suspended_at` カラム |

**全テーブルで RLS を有効化済み。全ポリシーが `auth.uid()` でユーザースコープを制限している。**

### localStorage キー

| キー | 管理箇所 | 型 | 説明 |
|---|---|---|---|
| `theme` | `ThemeContext` | `'light' \| 'dark'` | テーマ設定 |
| `workHoursPerDay` | `useWorkHours` フック | `number`（**時間単位**、0.5〜24） | 1日の作業時間上限。デフォルト `8`（8時間）。**分単位ではない** |
| `taskTitleHistory` | `titleHistory.ts` | `string[]` JSON | タスク名入力履歴（最大 30 件） |

---

## 7. ページ・コンポーネント設計

### LoginPage（`src/pages/LoginPage.tsx`）

- タブ切替 UI: ログイン / サインアップ
- メールアドレス + パスワード（最低 6 文字）フォーム
- エラー表示・ローディング状態あり

### TaskListPage（`src/pages/TaskListPage.tsx`）

メイン画面。最も機能が多く、ファイルが長い。

**主要機能:**
- フィルターバー（ステータス・カテゴリ・日付範囲・優先度・キーワード）
- 階層ツリー表示（展開/折りたたみ）
- インラインステータス変更（ドロップダウン）
- 中断・再開ボタンのインライン表示
- 本日の作業負荷バー（`useWorkHours` の時間上限との比較）
- CSV エクスポート / テキストレポートエクスポート

**インラインダイアログ（ページ内に定義）:**

| ダイアログ | 表示タイミング | 記録内容 |
|---|---|---|
| `StartDialog` | 未着手 → 進行中 | 実績開始時刻・開始遅延/早期要因 |
| `EndDialog` | 進行中 → 完了 | 実績終了時刻・時間超過/短縮要因 |
| `FullActualDialog` | 未着手から直接完了 | 開始・終了時刻・両要因 |
| `SuspendDialog` | 進行中 → 中断 | 中断時刻 |
| `ResumeDialog` | 中断 → 再開 | 中断期間の表示・再開確認 |

**子タスク全完了時の自動動作:** 全子タスクが完了すると親タスクを自動完了。親の実績時間 = 子の実績時間合計。

### CalendarPage（`src/pages/CalendarPage.tsx`）

- 3ビュー: 日・週・月
- 時間グリッド（24時間、56px/時間）
- 時間スロットをクリックして `TaskForm` を当該日時プリセット済みで開く
- 複数日タスクのバンド表示（重複レーン割り当てあり）
- セッションの可視化（中断/再開のインジケーター、破線コネクター）
- 予定 vs 実績のオーバーレイ（差分 5 分超で点線アウトライン表示）
- タスクのホバー時に右上のゴミ箱アイコンを表示。1クリックで確認状態（赤）、再クリックで削除（日・週・月ビュー共通）

### AnalyticsPage（`src/pages/AnalyticsPage.tsx`）

- 集計対象: `track_actual = true` かつ `parent_task_id = null` のタスクのみ
- 期間セレクター（全期間・月次ドロップダウン）
- タブ構成:
  1. **概要**: KPI（完了率・実績時間合計）、ドーナツチャート（ステータス分布）、カテゴリ別バーチャート、月次作業量（計画 vs 実績 2 本棒グラフ）
  2. **開始タイミング分析**: 遅延/オンタイム/早期の積み上げ棒グラフ・要因ランキング
  3. **所要時間分析**: 超過/適切/短縮の積み上げ棒グラフ・要因ランキング

### RecurrenceGroupsPage（`src/pages/RecurrenceGroupsPage.tsx`）

- グループカード一覧（繰り返し頻度・期間・時間帯・未完了タスク数を表示）
- 編集・削除・一括更新（未完了タスクにのみ適用）
- **グループ削除はそのグループの全タスクを削除する**（ユーザーへ確認ダイアログを表示すること）

### SettingsPage（`src/pages/SettingsPage.tsx`）

- カテゴリ CRUD（色ピッカー付き）
- ブラウザ通知許可リクエスト
- カテゴリ追加フォーム: 名前未入力時・Supabase エラー時にインラインエラーメッセージ表示。送信中はボタンを `disabled` にしてローディングテキストを表示

### TaskForm（`src/components/tasks/TaskForm.tsx`）

タスク作成・編集の主要モーダル。セクション構成:

1. **基本情報**: タスク名（入力履歴オートコンプリート）・カテゴリ（インライン新規作成可）・ステータス・親タスク
2. **計画情報**: 優先度・作業量・1単位あたり時間・予定日時・予定メモ（※難易度プルダウンは削除済み、終日チェックボックスは削除済み）
3. **実績情報**: `track_actual = true` かつ `status >= in_progress` の場合のみ表示。実績開始/終了・各要因・セッション管理・実績メモ

**自動計算:**
- 予定終了時刻の自動計算: `scheduled_start + quantity × time_per_unit`
- 作業量・単位時間が空の場合、予定開始/終了時刻から自動補完

### RecurrenceForm（`src/components/tasks/RecurrenceForm.tsx`）

定常タスクグループの作成・編集モーダル。ダイアログタイトルは新規作成時「繰り返しタスクを登録」、編集時「定常タスクを編集」。

- 繰り返し種別（日次/週次）
- 週次の場合: 曜日ピッカー（日=赤・土=青・平日=ニュートラル）
- 期間（開始日・終了日）+ プレビュー件数
- 保存時: `TaskContext.tsx` 内の `generateDates()` で全対象日付を算出し、各日に `scheduled_start/end` 付きタスクを一括生成

### 主要ユーティリティ（`src/lib/utils.ts`）

| 関数 | シグネチャ | 説明 |
|---|---|---|
| `buildTree` | `(tasks: Task[]) => Task[]` | フラットなタスク配列を `parent_task_id` に基づいてツリー構造に変換 |
| `getWorkloadMinsForDay` | `(task: Task, dayDate: Date, sessions?: TaskSession[]) => number` | 指定日のタスク作業負荷（分）を返す。**第3引数の `sessions` は必ず渡すこと**（省略するとセッションベースの正確な計算が行われない） |
| `getWorkloadMins` | `(task: Task) => number` | タスクの総工数分数を返す（完了は実績、未完了は予定。日跨ぎのクリップなし） |
| `getWorkloadTaskList` | `(allTasks: Task[]) => Task[]` | 子タスクを持つ親タスクを除外（二重計上防止）した配列を返す |
| `getTotalMinutes` | `(task: Task) => number` | `quantity × time_per_unit` の合計分数（計画値） |
| `formatDate` | `(date: string \| null, includeTime?: boolean) => string` | ISO 文字列を日本語フォーマットに変換。null または無効値は `'—'` を返す |
| `toLocalDatetimeValue` | `(date: string \| null) => string` | ISO → `<input type="datetime-local">` 用ローカル文字列。無効値は `''` を返す |
| `sortCategoriesByColor` | `(categories: TaskCategory[]) => TaskCategory[]` | HSL 色相でカテゴリをソート |
| `exportToCSV` | `(tasks: Task[]) => void` | BOM 付き CSV ファイルをダウンロード（Excel/日本語対応） |
| `exportTodayTasksAsText` | `(tasks: Task[], dateStr: string, fields?: TextExportFields) => string` | 日付別テキストレポートを生成して文字列で返す。`TextExportFields` は `taskName`, `status`, `timeRange`, `duration`, `startFactor`, `durationFactor`, `remarks`（予定メモ）, `actualMemo`（実績メモ）の 8 フィールドを持つ |
| `scheduleNotification` | `(task: Task) => void` | ブラウザ通知 API。`scheduled_start/end` の 7 日以内を `setTimeout` で予約 |
| `hasChildTasks` | `(taskId: string, allTasks: Task[]) => boolean` | タスクに子タスクが存在するか確認 |

> `getWorkloadMinsForMonth` という関数は**存在しない**。月次集計は `AnalyticsPage` が日次ループで自前実装している。

---

## 8. 実装ルール

### 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| コンポーネント | PascalCase | `TaskCard`, `RecurrenceForm` |
| ファイル（コンポーネント） | PascalCase | `TaskCard.tsx` |
| ファイル（ユーティリティ/フック） | camelCase | `utils.ts`, `useWorkHours.ts` |
| 型・インターフェース | PascalCase | `Task`, `TaskSession`, `RecurrenceGroup` |
| 型エイリアス（Union型） | PascalCase | `TaskStatus`, `TaskPriority` |
| 定数配列 | UPPER_SNAKE_CASE | `START_DELAY_FACTORS` |
| 関数・変数 | camelCase | `buildTree`, `handleSubmit` |
| CSS クラス（カスタム） | kebab-case | `form-input`, `btn-primary` |

### ファイル配置ルール

- 複数ページで共有するコンポーネント → `src/components/tasks/` または `src/components/layout/`
- 1ページ専用のインラインダイアログ → ページファイル内に定義
- DB アクセスは Context のみ（ページやコンポーネントが直接 `supabase` クライアントを叩かない）
  - 例外: `TaskCard` は `useTasks()` を直接参照している（設計上の一貫性欠如だが現状維持）
- 新しいページ → `src/pages/` に配置し、`App.tsx` の `Page` 型とルーティングを更新

### TypeScript 利用ルール

- `any` 禁止。`unknown` を経由するか適切な型を定義する
- 全コンポーネントの props は明示的に型定義する（inline 型または別途インターフェース）
- 型定義は `src/lib/types.ts` に集約する（ローカルな型は例外）
- `null` と `undefined` を区別する。DB から返る nullable フィールドは `string | null` で定義
- `Task` を INSERT する際は nullable でないフィールドにデフォルト値を必ず設定すること（`quantity: 1`, `time_per_unit: 0`, `actual_time: 0`, `actual_memo: ''`, `notes: ''`）

### エラーハンドリング方針

- Supabase の全オペレーションで `error` を確認してからデータを使用する
- エラー時は `console.error` に加えて、UI にエラーメッセージを表示する（特にフォーム操作）
- ネットワークエラーや認証エラーは Context 内で処理し、ページコンポーネントには最小限の情報だけ渡す

### DBスキーマ変更時の手順

1. `supabase/migrations/` に新しいマイグレーション SQL ファイルを作成（タイムスタンプ命名: `YYYYMMDDHHMMSS_description.sql`）
2. `src/lib/types.ts` の型定義を更新
3. `src/contexts/TaskContext.tsx` のフェッチクエリ・CRUD メソッドを更新
4. 影響を受けるコンポーネント・ページを更新

**既存カラムの削除・型変更・テーブルリネームは禁止**（ユーザーデータ消失のリスク）。

---

## 9. UI/UX ルール

### デザイン方針

- Tailwind CSS ユーティリティクラスを基本とし、カスタム CSS は `src/index.css` の最小限のユーティリティクラスにとどめる
- 以下のカスタムクラスを統一使用:

```
.form-label     ラベル上のテキスト
.form-input     テキスト/セレクト入力（ダークモード対応済み）
.btn-primary    青色塗りつぶしボタン
.btn-secondary  白/アウトラインボタン
```

- 「新規定常タスク」ボタンは全画面で `btn-primary bg-teal-600 hover:bg-teal-700` を使用（識別色）
- カラーパレット: ライト（gray-50〜900）、ダーク（gray-800〜950）、アクセント（blue-500〜700）、中断（amber）、エラー（red）

### レスポンシブ対応方針

- サイドバーは折りたたみ可能（モバイル対応を意識）
- カレンダーページの時間グリッドは横スクロール対応
- 要確認: モバイルブレークポイントの詳細設計

### アクセシビリティ方針

- 要確認: ARIA ラベルの整備状況
- 現状、色だけで状態を区別している箇所がある（ステータスバッジなど）。アイコンやテキストでの補完が望ましい

---

## 10. テスト方針

**現状、自動テストは存在しない。**

| テスト種別 | 現状 | 将来方針 |
|---|---|---|
| Unit Test | なし | `utils.ts` の時間計算関数（特に `getWorkloadMinsForDay`）を優先 |
| Integration Test | なし | Context の CRUD 操作 |
| E2E Test | なし | タスクの作成〜完了フロー・中断再開フロー |

UI の動作確認は手動で行う。変更後は以下のフローを必ず手動確認すること:

1. タスクの作成・編集・削除
2. ステータス変更（未着手→進行中→完了）
3. 中断・再開フロー（セッションが正しく記録されること）
4. 定常タスクグループの作成・一括生成・グループ削除（タスクも消えること）
5. カレンダービューの切替
6. 分析ページの集計表示

---

## 11. AI エージェント向け注意事項

> **これらのルールはすべての AI エージェントが遵守しなければならない必須事項です。**

### 1. 既存機能を削除しない

- 機能の削除・無効化は、ユーザーから明示的に指示された場合のみ行う
- リファクタリングにおいて機能の挙動を変えることは禁止

### 2. 大規模変更前に影響範囲を調査する

- `TaskContext.tsx` は多くのページ・コンポーネントが依存している。変更前に全参照元を確認すること
- `utils.ts` の `getWorkloadMinsForDay` はカレンダーと分析の両方で使用。変更は両方への影響を検証すること
- `types.ts` の変更は全コードベースに波及する
- `resumeTask` / `suspendTask` の補完セッションロジックは壊れやすい。変更前に動作を十分理解すること

### 3. 環境変数を変更しない

- `.env` の `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` は変更・削除・上書き禁止
- 新しい環境変数が必要な場合はユーザーに確認する

### 4. DB スキーマ変更時はマイグレーションを作成する

- 既存マイグレーションファイルは変更禁止（適用済みの可能性がある）
- 新しいカラム・テーブルは必ず新規マイグレーション SQL ファイルとして作成
- 既存カラムの削除・型変更・テーブルリネームは禁止（ユーザーデータ消失）
- 全テーブルに RLS を有効化し、4 動詞（SELECT/INSERT/UPDATE/DELETE）それぞれ個別ポリシーを作成する

### 5. UI 変更時は既存画面との整合性を保つ

- カラースキーム・フォントスタイル・スペーシングは既存パターンに合わせる
- カスタムクラス（`.form-input`, `.btn-primary` 等）を統一使用する
- ダークモードの見た目を必ず確認する（Tailwind の `dark:` プレフィックス）
- 日本語 UI を維持する（ボタン・ラベル・メッセージはすべて日本語）

### 6. ルーティングの追加方法

新しいページを追加する場合:
1. `src/pages/NewPage.tsx` を作成
2. `src/App.tsx` の `Page` 型（`'list' | 'recurrence' | ...`）に追加
3. `App.tsx` の `renderPage()` switch 文に追加
4. `src/components/layout/Sidebar.tsx` の `navItems` 配列に追加

`react-router` などのルーターライブラリは**導入しない**（state ベースルーティングを維持）。

### 7. 開発サーバーを起動しない

`npm run dev` は外部ハーネスが管理している。AI エージェントはこのコマンドを実行してはならない。

### 8. 不明点は TODO として残す

実装内容が確認できない場合や設計が不明な場合は、コード内に `// TODO: ` コメントを残し、ユーザーに確認を求める。推測で実装しない。

### 9. 既存の定数・ユーティリティを再発明しない

`src/lib/types.ts` に `STATUS_LABELS`, `STATUS_COLORS`, `PRIORITY_LABELS`, `PRIORITY_ORDER`, `DIFFICULTY_LABELS` などの定数が定義済み。新しいコードを書く前に必ず既存定数の存在を確認すること。

### 10. Task を INSERT する際のデフォルト値

以下のフィールドは nullable ではないため、INSERT 時に必ずデフォルト値を設定すること:

```typescript
{
  difficulty: 0,
  quantity: 1,
  time_per_unit: 0,
  actual_time: 0,
  actual_memo: '',
  notes: '',
  status: 'not_started',
  track_actual: true,
}
```

---

## 12. 今後の開発予定

コードのコメントや構造から推測される将来機能:

| 機能 | 根拠 |
|---|---|
| タスクのコメント・添付ファイル | `notes` と `actual_memo` の分離は拡張を示唆 |
| チーム・マルチユーザー対応 | 現状シングルユーザーだが、RLS 設計はマルチユーザー対応済み |
| タグ機能 | カテゴリのみで、タグは存在しない（拡張余地あり） |
| ガントチャートビュー | カレンダーに日・週・月ビューがあるが、ガント形式はなし |
| 目標・マイルストーン管理 | 現状タスク単位のみ |
| CSV インポート | エクスポートはあるがインポートはなし |
| サブタスクの深さ制限 | 現状無制限に入れ子可能。深い階層の挙動は未検証 |
| モバイルアプリ（PWA） | `index.html` に manifest なし。PWA 化の余地あり |
| 通知の詳細設定 | SettingsPage に通知許可のみ。リマインダータイミング設定はなし |
| 作業時間設定の UI | `useWorkHours` フックは実装済みだが、SettingsPage に設定 UI が存在しない |

---

## 13. 既知の課題・技術的負債

| 課題 | 詳細 |
|---|---|
| `TaskListPage.tsx` が巨大 | インラインダイアログ（Start/End/Suspend/Resume/FullActual）が全てこのファイルに定義されており、行数が多い。専用コンポーネントへの分割が望ましい |
| `TaskContext.tsx` が巨大 | 全 CRUD と業務ロジックが 1 ファイルに集中。将来的にはデータアクセス層と状態管理層を分離する余地あり |
| `exportToCSV` の `suspended` ステータスが未対応 | `utils.ts` の CSV 出力ロジックで `suspended` が `'完了'` として扱われてしまうバグがある（`status === 'not_started' ? '未着手' : status === 'in_progress' ? '進行中' : '完了'` という実装）|
| `titleHistory` のサーバー同期なし | タスク名の入力履歴は localStorage のみで管理。ブラウザをまたいで共有されない |
| 実績時間の計算ロジックの複雑さ | `getWorkloadMinsForDay` はセッション有無・中断状態・複数日タスクを全て処理しており、バグが混入しやすい。テストがない |
| サブタスクの深さ無制限 | `buildTree` は深さ制限なし。深い入れ子での動作は未保証 |
| カレンダーのレーン割り当てアルゴリズム | `assignLanes` / `assignTimeLanes` は複雑で、エッジケースの検証が不十分 |
| エラーハンドリングの統一性不足 | 一部の Supabase 操作でエラーが `console.error` のみで UI 表示されていない箇所がある |
| アクセシビリティ未整備 | ARIA 属性・キーボードナビゲーション・スクリーンリーダー対応は未整備 |
| `completed_at` の信頼性 | 状態遷移によっては `completed_at` が設定されないパスが存在する可能性あり（要検証） |
| 通知 API の制限 | `scheduleNotification` は `setTimeout` ベースで、ページを閉じると通知されない |
| `TaskCard` が Context を直接参照 | 設計方針「共通コンポーネントは Context アクセス最小限」に対する例外として `TaskCard.tsx` が `useTasks()` を直接使用している |
| `useWorkHours` の UI がない | フックは実装済みだが `SettingsPage` に設定 UI が存在せず、localStorage を直接操作する以外に変更手段がない |

---

## 14. 変更履歴

| 日付 | 変更内容 |
|---|---|
| 2026-06-07 | `TaskForm` から難易度プルダウンを削除。計画情報グリッドを 4 列 → 3 列（優先度・数量・所要時間）に変更 |
| 2026-06-07 | `TaskForm` から終日チェックボックスを削除。予定日時の開始・終了入力を常に `datetime-local` 固定に変更 |
| 2026-06-07 | `TaskForm` の「備考」ラベルを「予定メモ」に変更（フィールド名 `notes` は変更なし） |
| 2026-06-07 | テキストエクスポートの `TextExportFields` に `actualMemo`（実績メモ）フィールドを追加。出力を「予定メモ（`notes`）」と「実績メモ（`actual_memo`）」の 2 行に分離。選択ダイアログの項目名「備考」→「予定メモ」、「実績メモ」を新規追加 |
| 2026-06-07 | `RecurrenceForm` の編集ダイアログタイトルを「繰り返しグループを編集」→「定常タスクを編集」に変更 |
| 2026-06-07 | `CalendarPage` の日・週・月ビュー全てにタスク削除機能を追加。ホバーでゴミ箱アイコン表示、1クリックで確認状態（赤）、再クリックで削除 |
| 2026-06-07 | `SettingsPage` のカテゴリ追加フォームを修正。名前未入力・Supabase エラー時に赤いエラーメッセージを表示、送信中はローディング表示。`TaskContext.createCategory` の Supabase エラーを `console.error` で記録するよう修正 |
| 2026-06-08 | `TaskListPage` の使用時間バー計算を `tasks.filter(parent_task_id === null)` から `getWorkloadTaskList(tasks)` に変更し、子タスクを持つ親タスクの二重計上を修正 |
| 2026-06-08 | `utils.ts` の `getWorkloadMinsForDay` を修正。`in_progress` タスクに `scheduled_end` をフォールバックとして使用しないよう変更（セッション作成前の一時的な予定時間誤計上を防止）。同日タスクの `actual_time` 上書きを除去し、TaskCard の表示と一致させた |
| 2026-06-08 | `TaskForm` の予定日時入力を修正。ステータスが「完了」の状態で予定開始時間・予定終了時間を入力した際、実績開始・終了が未入力であれば自動コピーするよう変更 |
