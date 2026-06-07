# タスクマネージャー

業務の計画・実績を記録・分析する個人向けタスク管理 Web アプリです。
予定と実績の比較、中断/再開セッションによる正確な実働時間の計測、遅延要因の統計分析など、自己改善を支援する機能を備えています。

---

## 主な機能

### タスク管理
- タスクの作成・編集・削除
- ステータス管理（未着手 / 進行中 / 中断 / 完了）
- 親子タスク（階層ツリー表示）
- カテゴリ・優先度・難易度の設定
- 予定時刻・実績時刻の両方を記録
- 中断・再開ボタンによるセッション単位の実働時間計測
- 開始遅延/早期・所要時間超過/短縮の要因記録
- CSV エクスポート / テキストレポートエクスポート
- 当日の作業負荷バー（設定上限との比較）

### 定常タスク管理
- 繰り返しタスクのグループ管理（日次 / 週次）
- 期間内のタスクを一括生成
- 未完了タスクへの一括更新

### カレンダービュー
- 日・週・月の 3 ビュー
- 時間グリッド（24 時間表示）
- セッションの可視化（中断/再開インジケーター）
- 予定 vs 実績のオーバーレイ表示

### 分析ダッシュボード
- 完了率・総実績時間 KPI
- ステータス分布ドーナツチャート
- カテゴリ別作業時間バーチャート
- 月次計画 vs 実績の比較グラフ
- 開始タイミング分析（遅延 / オンタイム / 早期の要因ランキング）
- 所要時間分析（超過 / 適切 / 短縮の要因ランキング）

### 設定
- カテゴリの作成・編集・削除（カラーピッカー付き）
- ブラウザ通知の許可設定

### 認証
- Supabase メール/パスワード認証
- ユーザーごとのデータ分離（RLS）

---

## 使用技術

| 分類 | 技術 |
|---|---|
| フレームワーク | React 18 |
| 言語 | TypeScript 5 |
| ビルドツール | Vite 5 |
| CSS | Tailwind CSS 3 |
| アイコン | lucide-react |
| バックエンド / DB | Supabase（PostgreSQL + Auth） |
| クライアント | @supabase/supabase-js v2 |

---

## ディレクトリ構成

```
project/
├── src/
│   ├── App.tsx                   # ルートコンポーネント・認証ガード・ページルーティング
│   ├── main.tsx                  # エントリポイント
│   ├── index.css                 # グローバル CSS（Tailwind + カスタムユーティリティ）
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Supabase 認証状態管理
│   │   ├── TaskContext.tsx       # タスク・カテゴリ・定常グループの全 CRUD
│   │   └── ThemeContext.tsx      # ライト/ダークテーマ管理
│   │
│   ├── lib/
│   │   ├── supabase.ts           # Supabase クライアント
│   │   ├── types.ts              # 全型定義・定数
│   │   ├── utils.ts              # 汎用ユーティリティ
│   │   └── useWorkHours.ts       # 1日の作業時間上限フック
│   │
│   ├── components/
│   │   ├── NavLink.tsx           # サイドバーナビゲーションリンク
│   │   ├── layout/
│   │   │   ├── Header.tsx        # ヘッダー
│   │   │   └── Sidebar.tsx       # 折りたたみ可能なサイドバー
│   │   └── tasks/
│   │       ├── TaskCard.tsx      # タスク一覧の1行カード
│   │       ├── TaskForm.tsx      # タスク作成・編集モーダル
│   │       ├── TaskFilters.tsx   # フィルターバー
│   │       ├── RecurrenceForm.tsx# 定常タスクグループ作成・編集モーダル
│   │       └── titleHistory.ts   # タスク名入力履歴管理（localStorage）
│   │
│   └── pages/
│       ├── LoginPage.tsx
│       ├── TaskListPage.tsx
│       ├── CalendarPage.tsx
│       ├── AnalyticsPage.tsx
│       ├── RecurrenceGroupsPage.tsx
│       └── SettingsPage.tsx
│
├── supabase/
│   └── migrations/               # SQL マイグレーションファイル
│
├── .env                          # 環境変数（Git 管理外）
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## 環境変数

`.env` ファイルをプロジェクトルートに作成し、以下を設定してください。

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

| 変数名 | 説明 | 取得場所 |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase プロジェクトの URL | Supabase ダッシュボード > Project Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名公開キー | 同上 |

---

## 開発環境構築手順

### 前提条件

- Node.js 18 以上
- npm 9 以上
- Supabase アカウント（無料プランで可）

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd project
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. Supabase プロジェクトの作成

1. [Supabase](https://supabase.com) にアクセスしてプロジェクトを作成
2. ダッシュボードの **Project Settings > API** から URL と anon key をコピー

### 4. 環境変数の設定

```bash
cp .env.example .env   # .env.example がない場合は直接 .env を作成
```

`.env` に Supabase の URL と anon key を記入する。

### 5. データベースのセットアップ

`supabase/migrations/` 内のファイルを番号順に Supabase の SQL Editor で実行する。

| 順序 | ファイル | 内容 |
|---|---|---|
| 1 | `20260507120154_create_tasks_schema.sql` | task_categories・tasks テーブル + RLS |
| 2 | `20260507124519_add_actual_times_to_tasks.sql` | actual_start・actual_end カラム追加 |
| 3 | `20260507132400_fix_difficulty_check_allow_zero.sql` | difficulty 制約修正 |
| 4 | `20260507135810_fix_update_updated_at_search_path.sql` | トリガーセキュリティ修正 |
| 5 | `20260507142514_add_priority_to_tasks.sql` | priority カラム追加 |
| 6 | `20260508015438_add_estimate_factors_to_tasks.sql` | 要因カラム + track_actual 追加 |
| 7 | `20260508033304_add_track_actual_to_tasks.sql` | track_actual デフォルト値修正 |
| 8 | `20260508034739_add_recurrence_groups.sql` | recurrence_groups テーブル + RLS |
| 9 | `20260508040152_add_track_actual_to_recurrence_groups.sql` | グループへ track_actual 追加 |
| 10 | `20260508052021_fix_update_recurrence_groups_updated_at_security.sql` | グループトリガーセキュリティ修正 |
| 11 | `20260512115920_add_task_sessions_and_suspended_status.sql` | task_sessions テーブル + suspended ステータス |

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開く。

---

## ビルド方法

```bash
# 本番ビルド
npm run build

# 型チェックのみ（ファイル出力なし）
npm run typecheck

# ESLint
npm run lint
```

ビルド成果物は `dist/` ディレクトリに出力されます。

---

## デプロイ方法

### Vercel

```bash
# Vercel CLI を使う場合
npm install -g vercel
vercel --prod
```

Vercel ダッシュボードで以下の環境変数を設定する:

| 変数名 | 値 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase プロジェクト URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

### Netlify

```bash
# Netlify CLI を使う場合
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Netlify ダッシュボードの **Site settings > Environment variables** で上記の環境変数を設定する。

### その他の静的ホスティング

`npm run build` で生成した `dist/` ディレクトリをホスティングサービスにアップロードする。
SPA のため、全ルートを `index.html` にリダイレクトする設定が必要。

#### Nginx の設定例

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 今後の改善予定

| 機能 | 概要 |
|---|---|
| 作業時間設定 UI | `useWorkHours` フックは実装済みだが、設定画面から変更できない。SettingsPage に UI を追加する |
| CSV インポート | エクスポートは実装済み。インポート機能を追加して過去データの一括登録に対応する |
| PWA 対応 | Service Worker + manifest を追加してオフライン閲覧・ホーム画面追加を可能にする |
| ブラウザ通知の詳細設定 | 現状は許可/拒否のみ。リマインダータイミング（5 分前・15 分前など）を設定可能にする |
| ガントチャートビュー | カレンダーの日・週・月ビューに加えて、タスク間の依存関係を可視化するガントビューを追加する |
| タグ機能 | カテゴリとは別に複数のタグをタスクに付与できるようにし、横断的な絞り込みに対応する |
| サブタスクの深さ制限 | 現状は無制限に入れ子可能。深い階層での動作を保証するために制限を設ける |
| テスト追加 | 時間計算ロジック（`getWorkloadMinsForDay` 等）を中心に Unit Test を整備する |

---

## ライセンス

要確認。
