# Reactテスト基盤導入結果

## 1. 導入対象

- React DOMテスト用の基盤を追加した。
- 対象Phase: `未実装テストケース_コードベース_再分類.md` の Phase 4。

## 2. 追加・更新ファイル

| ファイル | 目的 |
|---|---|
| `package.json` | `test:react`, `test:react:watch` script とReactテスト用devDependenciesを追加 |
| `vitest.config.ts` | Reactテスト専用のVitest設定 |
| `tsconfig.test.json` | Reactテスト用TypeScript設定 |
| `tests/react/setup.ts` | Testing Library cleanup、jest-dom、matchMedia stub、storage cleanup |
| `tests/react/smoke.test.tsx` | jsdom上でReactコンポーネントをrenderできることを確認するスモークテスト |

## 3. 導入した依存

- `vitest` `^4.1.9`
- `jsdom` `^27.4.0`
- `@testing-library/react` `^16.3.2`
- `@testing-library/jest-dom` `^6.9.1`
- `@testing-library/user-event` `^14.6.1`

## 4. 実行状況

この環境では `npm` コマンドがPATHにないため、公式npm CLI `10.9.4` を一時フォルダへ取得し、既存Nodeで起動して依存をインストールした。

```text
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
added 97 packages, removed 45 packages, changed 24 packages
found 0 vulnerabilities
```

`package-lock.json` と `node_modules` は更新済み。

Codexシェルでは `node` もPATHにないため、バンドルNodeのディレクトリを一時的にPATHへ追加して `npm run test:react` を実行した。

```text
npm run test:react
Test Files 1 passed (1)
Tests 1 passed (1)
```

## 5. 既存検証

既存コードベーステストとアプリ型検査は継続して成功。

```text
node --test tests/code/*.test.mjs
tests 33
pass 33
fail 0
```

```text
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
exit 0
```

## 6. 次に必要な作業

1. 通常シェルで `npm run test:react` を使う場合は、Node/npmをPATHに通す。
2. Phase 4のReact DOMテスト実装へ進む。
