# テストコードレビュー結果（TaskForm DOM入力 / UI状態）

## 1. レビュー対象

- テストコード: `tests/react/taskForm.dom.test.tsx`
- 対象コード: `src/components/tasks/TaskForm.tsx`
- 実装済みTC: TC-CB-097〜TC-CB-100、TC-CB-109〜TC-CB-112、TC-CB-220〜TC-CB-221
- 未実装として残したTC: TC-CB-222
- 成果物: `テスト成果物/テストコード実装結果.md`, `テスト成果物/未実装テストケース_コードベース.md`, `テスト成果物/未実装テストケース_コードベース_再分類.md`

## 2. 参照資料

- `テスト成果物/テストケース_コードベース.md`
- `テスト成果物/未実装テストケース_コードベース_再分類.md`
- `src/components/tasks/TaskForm.tsx`
- `src/contexts/TaskContext.tsx`
- `tests/react/setup.ts`

## 3. レビュー観点

- TC/TD/TV/TA/R のテスト名トレース
- `TaskForm` 実体を描画しているか
- 保存モックが呼ばれない/呼ばれる条件の強さ
- jsdomで不安定なlabel関連付けへ依存していないか
- 未実装ケースを隠していないか

## 4. 指摘と修正

| 優先度 | 観点 | 問題 | 場所 | 影響 | 修正方針 |
|---|---|---|---|---|---|
| P2 | 保守性 | `label` が `htmlFor` を持たないため `getByLabelText` が失敗する | `tests/react/taskForm.dom.test.tsx` | DOMテストが実行不能 | placeholder、現在値、`input[type=datetime-local]` 取得へ変更 |
| P2 | 失敗診断 | エラー文の曖昧な正規表現がラベルや選択肢にも一致する | `tests/react/taskForm.dom.test.tsx` | 誤検出またはmultiple match | 必須エラー文をexactまたは複数件許容で確認 |
| P1 | 未実装管理 | `TC-CB-222` は現行TaskForm単体ではPass可能な根拠がない | `TaskForm.tsx`, 未実装台帳 | unsupported assertion化のリスク | 未実装として残し、DB/FK検証または実装修正判断が必要と記録 |

## 5. 最終レビュー結果

- P0/P1/P2 の修正可能な指摘は解消済み。
- `TC-CB-222` は修正可能なテストコード問題ではなく、現行仕様/実装判断が必要なため未実装台帳に残した。
- 実装済み管理ID数: 54件
- 未実装管理ID数: 305件

## 6. 実行結果

```text
npm run test:react -- taskForm.dom.test.tsx
Test Files 1 passed
Tests 10 passed
```

```text
npm run test:react
Test Files 4 passed
Tests 25 passed
```

```text
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.test.json
exit 0
```

## 7. 残課題

- TC-CB-222: 削除済み親IDの保存拒否は、DB/FK検証または `TaskForm` の送信payload補正を伴う実装修正判断が必要。
