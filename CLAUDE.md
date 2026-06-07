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
| Edge Functions | 未使用（要確認） |

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
│   │       ├── TaskCard.tsx      # タスク一覧の1行カード
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
├── public/                       # 静的ファイル（要確認）
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

Context API 3層構成。`App.tsx` でネストして全体をラップ。

```
ThemeProvider
  └── AuthProvider
        └── TaskProvider
              └── AppShell（ページ描画）
```

| Context | ファイル | 責務 |
|---|---|---|
| `ThemeContext` | `src/contexts/ThemeContext.tsx` | ライト/ダーク切替。localStorage に保存。初回はシステム設定を参照。`<html>` に `dark` クラスを付与 |
| `AuthContext` | `src/contexts/AuthContext.tsx` | Supabase 認証状態。`user`, `session`, `loading` を公開。`signIn`, `signUp`, `signOut` メソッド |
| `TaskContext` | `src/contexts/TaskContext.tsx` | タスク・カテゴリ・定常グループの全 CRUD。セッション管理。一括操作。**データの唯一の真実** |

### ページルーティング

`react-router` 等のルーターライブラリは**未使用**。`App.tsx` が `currentPage` state を持ち、`onNavigate` を子コンポーネントに渡す。

有効なページ値: `'list' | 'recurrence' | 'calendar' | 'analytics' | 'settings'`

### API 通信

Supabase クライアント（`src/lib/supabase.ts`）を Context 内で直接呼び出す。専用の API レイヤーは存在しない。データ取得は Context の初期化時（`useEffect`）で行い、以後は Context 内の state を更新する。

### データフロー

```
Supabase DB
  ↓ 初回ロード（TaskContext useEffect）
tasks / categories / recurrenceGroups / sessions （Context state）
  ↓
Pages / Components（useContext で参照）
  ↓ ユーザー操作
Context メソッド（createTask, updateTask など）
  ↓ Supabase への書き込み
  ↓ 成功後に Context state を更新（再フェッチまたは楽観的更新）
```

### コンポーネント設計方針

- **ページコンポーネント**（`src/pages/`）: ビジネスロジックを持つ。Context から直接データを取得。
- **共通コンポーネント**（`src/components/`）: 表示・操作 UI のみ。Context へのアクセスは最小限にとどめる。
- **モーダルはページ内で定義**（`TaskForm`, `RecurrenceForm` 等）。ページをまたいで共有するモーダルは `src/components/tasks/` に配置。
- 大きなインラインダイアログ（`StartDialog`, `EndDialog`, `SuspendDialog` 等）は `TaskListPage.tsx` 内に定義されており、ファイルが長い。

---

## 6. データモデル

### Task（タスク）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string (UUID)` | PK |
| `user_id` | `string` | auth.users の FK |
| `title` | `string` | タスク名 |
| `category_id` | `string \| null` | カテゴリ FK |
| `status` | `TaskStatus` | `not_started \| in_progress \| completed \| suspended` |
| `priority` | `TaskPriority` | `low \| medium \| high` |
| `difficulty` | `number (0-5)` | 難易度（★の数） |
| `quantity` | `number \| null` | 作業量 |
| `time_per_unit` | `number \| null` | 単位あたり時間（分） |
| `scheduled_start` | `string \| null` | 予定開始日時（ISO） |
| `scheduled_end` | `string \| null` | 予定終了日時（ISO） |
| `actual_start` | `string \| null` | 実績開始日時（ISO） |
| `actual_end` | `string \| null` | 実績終了日時（ISO） |
| `actual_time` | `number \| null` | 実績時間（分）。sessions がある場合は sessions から計算 |
| `suspended_at` | `string \| null` | 中断日時（ISO） |
| `actual_memo` | `string \| null` | 実績メモ |
| `notes` | `string \| null` | 備考 |
| `parent_task_id` | `string \| null` | 親タスク FK（自己参照） |
| `recurrence_group_id` | `string \| null` | 定常タスクグループ FK |
| `track_actual` | `boolean` | 実績追跡フラグ。false の場合、分析対象外・実績フィールド非表示 |
| `completed_at` | `string \| null` | 完了日時（ISO） |
| `start_delay_factor` | `string \| null` | 開始遅延の要因コード |
| `start_early_factor` | `string \| null` | 早期開始の要因コード |
| `duration_over_factor` | `string \| null` | 所要時間超過の要因コード |
| `duration_short_factor` | `string \| null` | 所要時間短縮の要因コード |
| `children` | `Task[]` | 子タスクの配列（DB カラムなし、`buildTree()` で組み立てる） |
| `sessions` | `TaskSession[]` | セッション配列（DB カラムなし、JOIN で取得） |

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

- セッションが存在する場合、実働時間 = `Σ(session_end - session_start)`（null セッションは現在時刻まで計算）。
- 中断中のギャップは実働時間から除外される。

### RecurrenceGroup（定常タスクグループ）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string (UUID)` | PK |
| `user_id` | `string` | auth.users FK |
| `title` | `string` | グループ名 |
| `category_id` | `string \| null` | カテゴリ FK |
| `priority` | `TaskPriority` | 優先度 |
| `start_time` | `string` | タスク開始時刻（`HH:MM` 形式） |
| `end_time` | `string` | タスク終了時刻（`HH:MM` 形式） |
| `recurrence_type` | `RecurrenceType` | `daily \| weekly` |
| `days_of_week` | `number[] \| null` | 週次の場合の曜日（0=日〜6=土）。日次の場合は null |
| `period_start` | `string` | 繰り返し期間の開始日（ISO date） |
| `period_end` | `string` | 繰り返し期間の終了日（ISO date） |
| `notes` | `string \| null` | 備考 |
| `track_actual` | `boolean` | 生成タスクに track_actual を適用するか |

### TaskCategory（カテゴリ）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string (UUID)` | PK |
| `user_id` | `string` | auth.users FK |
| `name` | `string` | カテゴリ名 |
| `color` | `string` | カラーコード（`#RRGGBB`） |

### 定数（`src/lib/types.ts`）

```typescript
// 開始遅延要因
START_DELAY_FACTORS: string[]

// 早期開始要因
START_EARLY_FACTORS: string[]

// 所要時間超過要因
DURATION_OVER_FACTORS: string[]

// 所要時間短縮要因
DURATION_SHORT_FACTORS: string[]
```

要因コードは UI のセレクトボックスに使用し、分析ページで集計される。

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

| キー | 管理箇所 | 説明 |
|---|---|---|
| `theme` | `ThemeContext` | `'light'` または `'dark'` |
| `workHoursPerDay` | `useWorkHours` フック | 1日の作業時間上限（分）。デフォルト 480（8時間） |
| `taskTitleHistory` | `titleHistory.ts` | タスク名入力履歴（最大 30 件の JSON 配列） |

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
- 本日の作業負荷バー（設定上限との比較）
- CSV エクスポート / テキストレポートエクスポート

**インラインダイアログ（ページ内に定義）:**

| ダイアログ | 表示タイミング | 記録内容 |
|---|---|---|
| `StartDialog` | 未着手 → 進行中 | 実績開始時刻・開始遅延/早期要因 |
| `EndDialog` | 進行中 → 完了 | 実績終了時刻・時間超過/短縮要因 |
| `FullActualDialog` | 未着手から直接完了 | 開始・終了時刻・両要因 |
| `SuspendDialog` | 進行中 → 中断 | 中断時刻・中断要因 |
| `ResumeDialog` | 中断 → 再開 | 中断期間の表示・再開確認 |

**子タスク全完了時の自動動作:** 全子タスクが完了すると親タスクを自動完了。親の実績時間 = 子の実績時間合計。

### CalendarPage（`src/pages/CalendarPage.tsx`）

- 3ビュー: 日・週・月
- 時間グリッド（24時間、56px/時間）
- 時間スロットをクリックして `TaskForm` を当該日時プリセット済みで開く
- 複数日タスクのバンド表示（重複レーン割り当てあり）
- セッションの可視化（中断/再開のインジケーター、破線コネクター）
- 予定 vs 実績のオーバーレイ（差分 5 分超で点線アウトライン表示）
- 残作業時間の表示

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

### SettingsPage（`src/pages/SettingsPage.tsx`）

- カテゴリ CRUD（色ピッカー付き）
- ブラウザ通知許可リクエスト

### TaskForm（`src/components/tasks/TaskForm.tsx`）

タスク作成・編集の主要モーダル。セクション構成:

1. **基本情報**: タスク名（入力履歴オートコンプリート）・カテゴリ（インライン新規作成可）・ステータス・親タスク
2. **計画情報**: 優先度・難易度・作業量・1単位あたり時間・予定日時（終日チェックボックスあり）
3. **実績情報**: `track_actual = true` かつ `status >= in_progress` の場合のみ表示。実績開始/終了・各要因・セッション管理・実績メモ

**自動計算:**
- 予定終了時刻の自動計算: `scheduled_start + quantity × time_per_unit`
- 作業量・単位時間が空の場合、予定開始/終了時刻から自動補完

### RecurrenceForm（`src/components/tasks/RecurrenceForm.tsx`）

定常タスクグループの作成・編集モーダル。

- 繰り返し種別（日次/週次）
- 週次の場合: 曜日ピッカー（日=赤・土=青・平日=ニュートラル）
- 期間（開始日・終了日）+ プレビュー件数
- 保存時: `generateDates()` で全対象日付を算出し、各日に `scheduled_start/end` 付きタスクを一括生成

### 主要ユーティリティ（`src/lib/utils.ts`）

| 関数 | 説明 |
|---|---|
| `buildTree(tasks)` | フラットなタスク配列を `parent_task_id` に基づいてツリー構造に変換 |
| `getWorkloadMinsForDay(task, date)` | 指定日のタスク作業負荷（分）を計算。複数日タスクのクリッピング・セッションのギャップ除外・日按分を処理 |
| `getWorkloadMinsForMonth(task, year, month)` | 指定月の作業負荷（分）を集計 |
| `getWorkloadTaskList(tasks)` | 子タスクを持つ親タスクを除外（二重計上防止）した配列を返す |
| `getTotalMinutes(task)` | `quantity × time_per_unit` の合計分数 |
| `formatDate(iso, opts)` | ISO 文字列を日本語フォーマット（日時オプションあり）に変換 |
| `toLocalDatetimeValue(iso)` | ISO → `<input type="datetime-local">` 用のローカル文字列に変換 |
| `sortCategoriesByColor(categories)` | HSL 色相でカテゴリをソート |
| `exportToCSV(tasks)` | BOM 付き CSV ファイルとしてダウンロード（Excel/日本語対応） |
| `exportTodayTasksAsText(tasks, opts)` | 日付別グループ化したテキストレポートを生成 |
| `scheduleNotification(task)` | ブラウザ通知 API を使用。最大 7 日先まで予約 |
| `hasChildTasks(task, tasks)` | タスクに子タスクが存在するか確認 |

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
- DB アクセスは Context のみ（ページやコンポーネントが直接 Supabase クライアントを叩かない）
- 新しいページ → `src/pages/` に配置し、`App.tsx` の `currentPage` union 型とルーティングを更新

### TypeScript 利用ルール

- `any` 禁止。`unknown` を経由するか適切な型を定義する
- 全コンポーネントの props は明示的に型定義する（inline 型または別途 `Props` インターフェース）
- 型定義は `src/lib/types.ts` に集約する（ローカルな型は例外）
- `null` と `undefined` を区別する。DB から返る nullable フィールドは `string | null` で定義

### エラーハンドリング方針

- Supabase の全オペレーションで `error` を確認してからデータを使用する
- エラー時は `console.error` に加えて、UI にエラーメッセージを表示する（特にフォーム操作）
- ネットワークエラーや認証エラーは Context 内で処理し、ページコンポーネントには最小限の情報だけ渡す

### DBスキーマ変更時の手順

1. `supabase/migrations/` に新しいマイグレーション SQL ファイルを作成（タイムスタンプ命名）
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
| Unit Test | なし | `utils.ts` の時間計算関数は特にテストを追加すべき |
| Integration Test | なし | Context の CRUD 操作 |
| E2E Test | なし | タスクの作成〜完了フローなど主要シナリオ |

UI の動作確認は手動で行う。変更後は以下のフローを必ず手動確認すること:

1. タスクの作成・編集・削除
2. ステータス変更（未着手→進行中→完了）
3. 中断・再開フロー
4. 定常タスクグループの作成・一括生成
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
- 型定義（`types.ts`）の変更は全コードベースに波及する

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
2. `src/App.tsx` の `currentPage` 型（`'list' | 'recurrence' | ...`）に追加
3. `App.tsx` のレンダリング分岐に追加
4. `src/components/layout/Sidebar.tsx` にナビリンクを追加

`react-router` などのルーターライブラリは**導入しない**（state ベースルーティングを維持）。

### 7. 開発サーバーを起動しない

`npm run dev` は外部ハーネスが管理している。AI エージェントはこのコマンドを実行してはならない。

### 8. 不明点は TODO として残す

実装内容が確認できない場合や設計が不明な場合は、コード内に `// TODO: ` コメントを残し、ユーザーに確認を求める。推測で実装しない。

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

---

## 13. 既知の課題・技術的負債

| 課題 | 詳細 |
|---|---|
| `TaskListPage.tsx` が巨大 | インラインダイアログ（Start/End/Suspend/Resume/FullActual）が全てこのファイルに定義されており、行数が多い。専用コンポーネントへの分割が望ましい |
| `TaskContext.tsx` が巨大 | 全 CRUD と業務ロジックが 1 ファイルに集中。将来的にはデータアクセス層と状態管理層を分離する余地あり |
| titleHistory のサーバー同期なし | タスク名の入力履歴は localStorage のみで管理。ブラウザをまたいで共有されない |
| 実績時間の計算ロジックの複雑さ | `getWorkloadMinsForDay` はセッション有無・中断状態・複数日タスクを全て処理しており、バグが混入しやすい。テストがない |
| サブタスクの深さ無制限 | `buildTree` は深さ制限なし。深い入れ子での動作は未保証 |
| カレンダーのレーン割り当てアルゴリズム | `assignLanes` / `assignTimeLanes` は複雑で、エッジケースの検証が不十分 |
| エラーハンドリングの統一性不足 | 一部の Supabase 操作でエラーが `console.error` のみで UI 表示されていない箇所がある |
| アクセシビリティ未整備 | ARIA 属性・キーボードナビゲーション・スクリーンリーダー対応は未整備 |
| `completed_at` の信頼性 | 状態遷移によっては `completed_at` が設定されないパスが存在する可能性あり（要検証） |
| 通知 API の制限 | `scheduleNotification` は `setTimeout` ベースで、ページを閉じると通知されない |
