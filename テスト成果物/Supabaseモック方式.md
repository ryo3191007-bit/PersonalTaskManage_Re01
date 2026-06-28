# Supabaseモック方式

## 1. 決定

React/Provider系テストでは、本番コードを大きく変更せず、Vitestの module mock で `src/lib/supabase.ts` の `supabase` singletonを差し替える。

```ts
import { vi } from 'vitest';
import { createSupabaseMock } from '../mocks/supabaseMock';

const mock = createSupabaseMock({
  tasks: [],
  task_categories: [],
  recurrence_groups: [],
  task_sessions: [],
}, {
  access_token: 'test-token',
  user: { id: 'user-1', email: 'user@example.test' },
});

vi.mock('../../src/lib/supabase', () => ({
  supabase: mock.supabase,
}));
```

## 2. 理由

- `AuthContext.tsx` と `TaskContext.tsx` は `import { supabase } from '../lib/supabase'` で singleton を直接参照している。
- 依存注入のためにProvider propsやrepository層を新設すると本番コードの変更量が大きくなる。
- Vitestの module mock なら、React DOMテスト内で本番のContext/Providerをそのままrenderし、Supabase境界だけを差し替えられる。
- 既存のコードベーステストで使っている一時トランスパイル方式とは分け、React DOM/ProviderテストはVitestに寄せる。

## 3. 対象範囲

| 対象 | 方針 |
|---|---|
| `TaskContext.tsx` のCRUD | `from(table).insert/update/delete/select...` チェーンをモック |
| `TaskContext.tsx` のrefetch | `tasks`, `task_categories`, `recurrence_groups`, `task_sessions` の初期テーブルを投入 |
| `suspendTask` / `resumeTask` | `task_sessions` の更新・追加と `tasks` 更新をメモリ上で検証 |
| `AuthContext.tsx` の認証 | `supabase.auth.getSession`, `onAuthStateChange`, `signInWithPassword`, `signUp`, `signOut` をモック |
| `AuthContext.updateAccount` | Supabase mockではなく `global.fetch` をモック |
| Edge Function本体 | Reactテストとは分離し、Phase 7でHTTP/APIまたはDeno実行方針を決める |
| DB/RLS/migration | Supabase mockでは検証しない。Phase 6でSQL静的検査またはローカルSupabase検証に分離 |

## 4. 追加した共通モック

- `tests/react/mocks/supabaseMock.ts`

対応チェーン:

- `from(table)`
- `select(columns?)`
- `insert(row | rows)`
- `update(patch)`
- `delete()`
- `eq(column, value)`
- `order(column, { ascending })`
- `single()`
- `maybeSingle()`
- `await query`

対応auth:

- `auth.getSession()`
- `auth.signInWithPassword()`
- `auth.signUp()`
- `auth.signOut()`
- `auth.onAuthStateChange()`
- `emitAuthStateChange()`

## 5. テスト設計上の制約

- SupabaseのRLS、FK、CHECK制約、DBトリガー、SQL型制約はこのモックでは保証しない。
- JOIN select文字列、例: `select('*, category:task_categories(*)')` は文字列として記録するだけで、JOIN結果はテストデータ側に含める。
- `.eq()` は単純な完全一致のみ対応する。
- 複雑なSupabase APIを追加で使う場合は、テスト失敗を見てモックを拡張する。

## 6. 実装順序への反映

1. Phase 3の `TaskContext` / `AuthContext` Providerテストから、このmockを使う。
2. Phase 4のReact DOMテストでContextが必要な場合も、このmockを再利用する。
3. Phase 6 DB/SQL検証とPhase 7 Edge Function/API検証は別方式に分ける。
