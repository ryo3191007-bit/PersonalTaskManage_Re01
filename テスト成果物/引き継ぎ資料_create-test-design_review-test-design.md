# 引き継ぎ資料: create-test-design / review-test-design

作成日: 2026-06-27  
対象リポジトリ: `PersonalTaskManage_Re01`  
作業ブランチ: `codex-fix-analytics-session-aggregation`

> 更新メモ: 本資料は作業中断時点の引き継ぎ用メモです。2026-06-27の再開作業で `create-test-design` / `review-test-design` は完了済みです。最終状態は `テスト設計.md`、`テスト設計_質問票.md`、`テスト設計レビュー結果.md` を参照してください。

## 1. 依頼内容

ユーザー依頼:

> create-test-design,review-test-design の実行

対象スキル:

- `create-test-design`
- `review-test-design`

## 2. 現在の作業状態

以下の3ファイルを新規作成済みです。ただし、まだ最終確定前の状態です。

- `テスト成果物/テスト設計.md`
- `テスト成果物/テスト設計_質問票.md`
- `テスト成果物/テスト設計レビュー結果.md`

`git status --short` では、上記3ファイルが未追跡として表示されます。

```text
?? テスト成果物/テスト設計.md
?? テスト成果物/テスト設計_質問票.md
?? テスト成果物/テスト設計レビュー結果.md
```

## 3. 参照元

主な参照元は以下です。

- `テスト成果物/テスト計画書.md`
- `テスト成果物/テスト分析.md`
- `テスト成果物/テスト分析_質問票.md`
- `テスト成果物/テスト分析_質問票_回答.md`
- `README.md`
- `FUNCTION_LIST.md`
- `SCREEN_LIST.md`
- `CLAUDE.md`
- `src/`
- `supabase/migrations/*.sql`

特に `テスト成果物/テスト分析.md` の内容を起点にしています。

確認済みの前提:

- テスト観点: `TV001` ～ `TV098`
- ソース構造識別子: `SSI001` ～ `SSI036`
- テストアプローチ: `TA001` ～ `TA019`
- 分析質問票 `Q001` ～ `Q008` は回答済み

## 4. 作成済み成果物の内容

### 4.1 テスト設計.md

`TV001` ～ `TV098` を `TD001` ～ `TD098` に展開する方針で作成しています。

主な構成:

- 設計対象
- 参照資料
- テスト設計
  - Unit
  - Integration
  - E2E
  - Security
  - Performance
  - Compatibility
  - Accessibility
  - Regression
- 期待TC数
- カバレッジ確認
- 後続工程への指示

### 4.2 テスト設計_質問票.md

現時点では追加質問なしとして作成しています。

理由:

- 分析質問票 `Q001` ～ `Q008` が回答済み
- テスト設計作成に必要な境界値・状態・環境・受入基準が既に揃っているため

### 4.3 テスト設計レビュー結果.md

レビュー結果として、初回レビューで見つかった指摘と修正方針、再レビュー結果を記載しています。

ただし、後述の未解消事項があるため、次スレッドで再検証・修正後に内容を更新してください。

## 5. 未解消事項

次スレッドでは、まず以下を修正してください。

### 5.1 テスト設計表のMarkdown列崩れ

検証上、`テスト設計.md` のテスト設計行に列数不一致があります。

原因候補:

- `条件/入力` などのセル内に、未エスケープの `|` が混入している
- `SSI` の構造値説明をそのまま展開した結果、Markdownテーブルの列として解釈されている

対応方針:

- `テスト設計.md` の全テーブルセルについて、セル内の `|` を `／` などに置換する
- 特に `条件/入力`、`期待結果/判定観点`、`仕様` のセルを確認する
- 修正後、全 `TDxxx` 行の列数が仕様どおりであることを検証する

### 5.2 期待TC総数の不整合

レビュー結果ファイルでは期待TC総数を `567件` と記載していますが、途中検証では合計値が一致していない可能性があります。

対応方針:

- `テスト設計.md` の期待TC数表を再集計する
- 実際の合計値を `テスト設計.md` と `テスト設計レビュー結果.md` の両方へ反映する
- 合計値を手入力で固定せず、表の合計と一致させる

### 5.3 TD数・Yield数の再検証

最終的に以下を満たす必要があります。

- `テスト分析.md` の `TV001` ～ `TV098` がすべて `TD001` ～ `TD098` に対応している
- 期待TC数表も `TD001` ～ `TD098` をすべて含む
- `TDxxx` の重複・欠番がない
- `TVxxx` の未対応がない

## 6. 推奨する次作業手順

1. `テスト成果物/テスト設計.md` を再生成または修正する
2. Markdownテーブルの列数を検証する
3. `期待TC数` の合計を再集計する
4. `テスト成果物/テスト設計レビュー結果.md` の総数・レビュー結果を更新する
5. `review-test-design` の観点で再レビューする
6. P0/P1/P2 の未解消指摘がない状態にする
7. `git status --short` で変更対象を確認する

## 7. 検証用PowerShell例

次スレッドで以下を使って、最低限の機械チェックを実施してください。

```powershell
$designPath = 'テスト成果物\テスト設計.md'
$analysisPath = 'テスト成果物\テスト分析.md'

$design = Get-Content -Raw -Encoding UTF8 $designPath
$analysis = Get-Content -Raw -Encoding UTF8 $analysisPath

$tvCount = ([regex]::Matches($analysis, '^\| TV\d{3} \|', 'Multiline')).Count
$tdDesignRows = ($design -split "`r?`n") | Where-Object { $_ -match '^\| TD\d{3} \| TV\d{3} \|' }
$yieldRows = ($design -split "`r?`n") | Where-Object { $_ -match '^\| TD\d{3} \| \d+ \|' }

$badDesignRows = $tdDesignRows | Where-Object { (($_ -split '\|').Count - 2) -ne 12 }
$badYieldRows = $yieldRows | Where-Object { (($_ -split '\|').Count - 2) -ne 7 }

$yieldSum = 0
foreach ($row in $yieldRows) {
  $cols = $row.Split('|') | ForEach-Object { $_.Trim() }
  $yieldSum += [int]$cols[2]
}

[pscustomobject]@{
  TVCount = $tvCount
  TDDesignRows = $tdDesignRows.Count
  YieldRows = $yieldRows.Count
  YieldSum = $yieldSum
  BadDesignRows = $badDesignRows.Count
  BadYieldRows = $badYieldRows.Count
}
```

合格目安:

```text
TVCount = 98
TDDesignRows = 98
YieldRows = 98
BadDesignRows = 0
BadYieldRows = 0
```

`YieldSum` は `テスト設計.md` と `テスト設計レビュー結果.md` に記載した期待TC総数と一致していること。

## 8. 注意点

- この作業はまだ `commit` / `push` / `PR作成` 未実施です。
- ユーザーは今回は「引き継ぎ資料」を依頼しているため、勝手にコミットしないこと。
- 既存ブランチには前工程のPR作成済み作業が含まれている可能性があります。新しいスレッドでは必ず `git status --short` と `git branch --show-current` を確認してから作業してください。
- テスト設計レビュー結果は、最終検証後の実態に合わせて更新してください。
