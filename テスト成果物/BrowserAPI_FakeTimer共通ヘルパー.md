# Browser API / Fake Timer 共通テストヘルパー

## 1. 目的

React/Vitestテストで、ブラウザAPIと時刻依存を安定して制御するための共通ヘルパーを追加した。

## 2. 追加ファイル

| ファイル | 目的 |
|---|---|
| `tests/react/mocks/browserApiMock.ts` | Browser API / fake timer の共通ヘルパー |
| `tests/react/browserApiMock.test.ts` | ヘルパー自体のスモークテスト |
| `tests/react/setup.ts` | 共通初期化を `browserApiMock.ts` 経由に変更 |

## 3. 提供ヘルパー

| ヘルパー | 用途 |
|---|---|
| `installMatchMediaMock(matches)` | ThemeContextやレスポンシブ判定用の `window.matchMedia` stub |
| `installClipboardMock()` | `navigator.clipboard.writeText/readText` spy |
| `installNotificationMock(permission)` | `Notification.permission`, `requestPermission`, constructor call記録 |
| `useFakeBrowserTime(now)` | `vi.useFakeTimers()` と `vi.setSystemTime()` の共通化 |
| `resetBrowserStorage()` | `localStorage` / `sessionStorage` cleanup |
| `installDefaultBrowserMocks()` | 全Reactテスト共通の軽量browser API初期化 |

## 4. 方針

- 通知、clipboard、matchMediaはテストごとに明示的に上書きできる。
- fake timerは必要なテストだけで `useFakeBrowserTime()` を呼ぶ。
- `afterEach` で `vi.useRealTimers()` とstorage cleanupを行い、テスト間の時刻・storage汚染を防ぐ。

## 5. 検証

```text
npm run test:react
Test Files 2 passed (2)
Tests 4 passed (4)
```

## 6. 対象Phase

- Phase 4: React DOMテスト
- Phase 5: Notification/window/setTimeout/clipboard/localStorageのブラウザAPI検証
