import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const buildDir = join(tmpdir(), 'personaltaskmanage-code-tests');

async function compileSource(relativePath) {
  const sourcePath = join(repoRoot, relativePath);
  const source = await readFile(sourcePath, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      isolatedModules: true,
    },
    fileName: sourcePath,
  });
  let output = result.outputText
    .replace(/from ['"]\.\/dateTime['"]/g, "from './dateTime.js'")
    .replace(/from ['"]\.\/utils['"]/g, "from './utils.js'")
    .replace(/from ['"]\.\/titleHistory['"]/g, "from './titleHistory.js'")
    .replace(/from ['"]\.\.\/lib\/dateTime['"]/g, "from '../lib/dateTime.js'")
    .replace(/from ['"]\.\.\/lib\/utils['"]/g, "from '../lib/utils.js'")
    .replace(/from ['"]\.\.\/lib\/supabase['"]/g, "from '../test-stubs/supabase.js'")
    .replace(/from ['"]\.\/AuthContext['"]/g, "from '../test-stubs/AuthContext.js'")
    .replace(/from ['"]\.\.\/\.\.\/lib\/dateTime['"]/g, "from '../../lib/dateTime.js'")
    .replace(/from ['"]\.\.\/\.\.\/lib\/utils['"]/g, "from '../../lib/utils.js'")
    .replace(/from ['"]\.\.\/\.\.\/lib\/types['"]/g, "from '../../lib/types.js'")
    .replace(/from ['"]\.\.\/\.\.\/contexts\/TaskContext['"]/g, "from '../../test-stubs/TaskContext.js'");
  if (relativePath === 'src/lib/useWorkHours.ts') {
    output = output.replace(/from ['"]react['"]/g, "from '../test-stubs/react.js'");
  } else if (relativePath === 'src/contexts/TaskContext.tsx') {
    output = output
      .replace(/from ['"]react['"]/g, "from '../test-stubs/react.js'")
      .replace(/from ['"]react\/jsx-runtime['"]/g, "from '../test-stubs/jsx-runtime.js'");
  } else if (relativePath === 'src/components/tasks/TaskForm.tsx') {
    output = output
      .replace(/from ['"]react['"]/g, "from '../../test-stubs/react.js'")
      .replace(/from ['"]react\/jsx-runtime['"]/g, "from '../../test-stubs/jsx-runtime.js'")
      .replace(/from ['"]lucide-react['"]/g, "from '../../test-stubs/lucide-react.js'");
  }
  const outPath = join(buildDir, relativePath.replace(/^src[\\/]/, '').replace(/\.tsx?$/, '.js'));
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, output, 'utf8');
}

async function loadTargets() {
  await rm(buildDir, { recursive: true, force: true });
  await mkdir(join(buildDir, 'lib'), { recursive: true });
  await mkdir(join(buildDir, 'test-stubs'), { recursive: true });
  await writeFile(join(buildDir, 'test-stubs/supabase.js'), 'export const supabase = {};\n', 'utf8');
  await writeFile(join(buildDir, 'test-stubs/AuthContext.js'), 'export function useAuth() { return { user: { id: "user-1" } }; }\n', 'utf8');
  await writeFile(join(buildDir, 'test-stubs/TaskContext.js'), 'export function useTasks() { return { sessions: [], createCategory: async () => null }; }\n', 'utf8');
  await writeFile(join(buildDir, 'test-stubs/react.js'), [
    'export function createContext(value) { return { Provider: function Provider() {}, _currentValue: value }; }',
    'export function useContext(ctx) { return ctx._currentValue; }',
    'export function useEffect() {}',
    'export function useRef(value) { return { current: value }; }',
    'export function useMemo(factory) { return factory(); }',
    'export function useCallback(fn) { return fn; }',
    'export function useState(initial) { const value = typeof initial === "function" ? initial() : initial; return [value, function setState() {}]; }',
  ].join('\n'), 'utf8');
  await writeFile(join(buildDir, 'test-stubs/jsx-runtime.js'), [
    'export function jsx(type, props) { return { type, props }; }',
    'export function jsxs(type, props) { return { type, props }; }',
    'export const Fragment = Symbol("Fragment");',
  ].join('\n'), 'utf8');
  await writeFile(join(buildDir, 'test-stubs/lucide-react.js'), [
    'export const X = "X";',
    'export const Plus = "Plus";',
    'export const Check = "Check";',
    'export const ChevronDown = "ChevronDown";',
    'export const Search = "Search";',
    'export const History = "History";',
    'export const Trash2 = "Trash2";',
  ].join('\n'), 'utf8');
  await compileSource('src/lib/dateTime.ts');
  await compileSource('src/lib/utils.ts');
  await compileSource('src/lib/types.ts');
  await compileSource('src/lib/useWorkHours.ts');
  await compileSource('src/contexts/TaskContext.tsx');
  await compileSource('src/components/tasks/titleHistory.ts');
  await compileSource('src/components/tasks/TaskForm.tsx');
  return {
    dateTime: await import(pathToFileURL(join(buildDir, 'lib/dateTime.js')).href),
    utils: await import(pathToFileURL(join(buildDir, 'lib/utils.js')).href),
    useWorkHours: await import(pathToFileURL(join(buildDir, 'lib/useWorkHours.js')).href),
    taskContext: await import(pathToFileURL(join(buildDir, 'contexts/TaskContext.js')).href),
    taskForm: await import(pathToFileURL(join(buildDir, 'components/tasks/TaskForm.js')).href),
    titleHistory: await import(pathToFileURL(join(buildDir, 'components/tasks/titleHistory.js')).href),
  };
}

const targets = await loadTargets();
const d = targets.dateTime;
const u = targets.utils;
const wh = targets.useWorkHours;
const tc = targets.taskContext;
const tf = targets.taskForm;
const th = targets.titleHistory;

function iso(value) {
  return value.toISOString();
}

function task(overrides = {}) {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: '対象タスク',
    category_id: null,
    priority: 'medium',
    difficulty: 1,
    quantity: 1,
    time_per_unit: 60,
    scheduled_start: null,
    scheduled_end: null,
    parent_task_id: null,
    notes: '',
    status: 'not_started',
    completed_at: null,
    actual_start: null,
    actual_end: null,
    actual_time: 0,
    actual_memo: '',
    suspended_at: null,
    start_delay_factor: null,
    start_early_factor: null,
    duration_over_factor: null,
    duration_short_factor: null,
    track_actual: true,
    recurrence_group_id: null,
    created_at: '2026-06-27T00:00:00.000Z',
    updated_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

function session(overrides = {}) {
  return {
    id: 'session-1',
    task_id: 'task-1',
    user_id: 'user-1',
    session_start: '2026-06-27T00:00:00.000Z',
    session_end: '2026-06-27T01:00:00.000Z',
    created_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

function withLocalStorage(fn) {
  const originalLocalStorage = globalThis.localStorage;
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
  try {
    return fn(store);
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
}

function withNotificationHarness(fn) {
  const originalWindow = globalThis.window;
  const originalNotification = globalThis.Notification;
  const originalDateNow = Date.now;
  const calls = { set: [], clear: [], notifications: [] };
  let nextId = 1;

  class FakeNotification {
    static permission = 'granted';
    constructor(title, options) {
      calls.notifications.push({ title, options });
    }
  }

  globalThis.window = {
    setTimeout(callback, ms) {
      const id = nextId++;
      calls.set.push({ id, callback, ms });
      return id;
    },
    clearTimeout(id) {
      calls.clear.push(id);
    },
  };
  globalThis.Notification = FakeNotification;
  globalThis.window.Notification = FakeNotification;
  Date.now = () => new Date('2026-06-27T00:00:00.000Z').getTime();

  try {
    return fn(calls, FakeNotification);
  } finally {
    u.clearAllTaskNotifications();
    Date.now = originalDateNow;
    globalThis.window = originalWindow;
    globalThis.Notification = originalNotification;
  }
}

async function captureCsvExport(tasks) {
  const originalDocument = globalThis.document;
  const originalURL = globalThis.URL;
  const clicks = [];
  let capturedBlob;
  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, 'a');
      return {
        href: '',
        download: '',
        click() {
          clicks.push({ href: this.href, download: this.download });
        },
      };
    },
  };
  globalThis.URL = {
    createObjectURL(blob) {
      capturedBlob = blob;
      return 'blob:test-url';
    },
    revokeObjectURL(url) {
      assert.equal(url, 'blob:test-url');
    },
  };
  try {
    u.exportToCSV(tasks);
    return { csv: await capturedBlob.text(), clicks };
  } finally {
    globalThis.document = originalDocument;
    globalThis.URL = originalURL;
  }
}

test('TC-CB-006 TD012 TV012 TA003 R003/R014 JST入力をUTC ISOへ変換する', () => {
  assert.equal(iso(d.parseJstDateTime('2026-06-27T09:00')), '2026-06-27T00:00:00.000Z');
  assert.equal(d.jstDateTimeToIso('2026-06-27T00:00'), '2026-06-26T15:00:00.000Z');
});

test('TC-CB-007 TD012 TV012 TA003 R003/R014 不正なJST日時をnullとして扱う', () => {
  assert.equal(d.parseJstDateTime('2026-02-30T09:00'), null);
  assert.equal(d.parseJstDateTime('2026-06-27T24:00'), null);
  assert.equal(d.parseJstDateTime('not-a-date'), null);
});

test('TC-CB-008 TD012 TV012 TA003 R003/R014 UTC日時をdatetime-local用JST文字列へ変換する', () => {
  assert.equal(d.formatJstDateTimeLocal('2026-06-26T15:00:00.000Z'), '2026-06-27T00:00');
  assert.equal(d.formatJstDateTimeLocal('invalid'), '');
  assert.equal(d.getJstDateKey('2026-06-26T15:00:00.000Z'), '2026-06-27');
});

test('TC-CB-009 TD012 TV012 TA003 R003/R014 JST日の半開区間をUTC範囲で返す', () => {
  const range = d.getJstDayRange('2026-06-27');
  assert.equal(iso(range.start), '2026-06-26T15:00:00.000Z');
  assert.equal(iso(range.end), '2026-06-27T15:00:00.000Z');
  assert.equal(d.getJstDayRange('2026-02-30'), null);
});

test('TC-CB-010 TD012 TV012 TA003 R003/R014 JST月の半開区間をUTC範囲で返す', () => {
  const range = d.getJstMonthRange('2026/07');
  assert.equal(iso(range.start), '2026-06-30T15:00:00.000Z');
  assert.equal(iso(range.end), '2026-07-31T15:00:00.000Z');
  assert.equal(d.getJstMonthRange('2026/13'), null);
});

test('TC-CB-011 TD012 TV012 TA003 R003/R014 JST日付加算と月末丸めを行う', () => {
  assert.equal(d.addJstDays('2026-12-31', 1), '2027-01-01');
  assert.equal(d.addJstMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(d.addJstMonths('2025-01-31', 1), '2025-02-28');
});

test('TC-CB-012 TD012 TV012 TA003 R003/R014 JST壁時計Dateへ変換する', () => {
  const wall = d.toJstWallClockDate('2026-06-27T00:30:15.123Z');
  assert.equal(wall.getFullYear(), 2026);
  assert.equal(wall.getMonth(), 5);
  assert.equal(wall.getDate(), 27);
  assert.equal(wall.getHours(), 9);
  assert.equal(wall.getMinutes(), 30);
});

test('TC-CB-063 TD030 TV030 TA006 R006/R007 予定工数は数量と単位時間から算出し0以下は未入力にする', () => {
  assert.equal(u.getPlannedMinutes(task({ quantity: 3, time_per_unit: 45 })), 135);
  assert.equal(u.getPlannedMinutes(task({ quantity: 0, time_per_unit: 45 })), null);
  assert.equal(u.getPlannedMinutes(task({ quantity: 1, time_per_unit: -1 })), null);
});

test('TC-CB-070 TD030 TV030 TA006 R006/R007 予定工数を期間重複比率で按分する', () => {
  const target = task({
    quantity: 1,
    time_per_unit: 120,
    scheduled_start: '2026-06-27T14:00:00.000Z',
    scheduled_end: '2026-06-27T16:00:00.000Z',
  });
  const range = d.getJstDayRange('2026-06-27');
  assert.equal(u.getPlannedMinutesForRange(target, range.start, range.end), 60);
});

test('TC-CB-018 TD014 TV014 TA003 R003/R006 未着手と実績追跡対象外の実績工数を仕様どおり返す', () => {
  assert.equal(u.getActualMinutes(task({ status: 'not_started' }), []), 0);
  assert.equal(u.getActualMinutes(task({ status: 'completed', track_actual: false }), []), null);
});

test('TC-CB-019 TD014 TV014 TA003 R003/R006 終了済みセッションを合計しactual_timeより優先する', () => {
  const target = task({ status: 'completed', actual_time: 999 });
  const sessions = [
    session({ id: 's1', session_start: '2026-06-27T00:00:00.000Z', session_end: '2026-06-27T00:30:00.000Z' }),
    session({ id: 's2', session_start: '2026-06-27T01:00:00.000Z', session_end: '2026-06-27T01:45:00.000Z' }),
  ];
  assert.equal(u.getActualMinutes(target, sessions), 75);
});

test('TC-CB-020 TD014 TV014 TA003 R003/R006 進行中の開放セッションはnowまで加算する', () => {
  const target = task({ status: 'in_progress' });
  const sessions = [session({ session_start: '2026-06-27T00:00:00.000Z', session_end: null })];
  assert.equal(u.getActualMinutes(target, sessions, new Date('2026-06-27T00:40:00.000Z')), 40);
});

test('TC-CB-021 TD014 TV014 TA003 R003/R006 中断中の開放セッションは加算しない', () => {
  const target = task({ status: 'suspended' });
  const sessions = [
    session({ id: 'closed', session_start: '2026-06-27T00:00:00.000Z', session_end: '2026-06-27T00:20:00.000Z' }),
    session({ id: 'open', session_start: '2026-06-27T01:00:00.000Z', session_end: null }),
  ];
  assert.equal(u.getActualMinutes(target, sessions, new Date('2026-06-27T02:00:00.000Z')), 20);
});

test('TC-CB-074 TD032 TV032 TA006 R006/R014 実績工数を指定範囲の重複分だけ按分する', () => {
  const target = task({
    status: 'completed',
    actual_start: '2026-06-27T14:00:00.000Z',
    actual_end: '2026-06-27T16:00:00.000Z',
    actual_time: 120,
  });
  const range = d.getJstDayRange('2026-06-27');
  assert.equal(u.getActualMinutesForRange(target, [], range.start, range.end), 60);
});

test('TC-CB-078 TD033 TV033 TA006 R006 予定実績差異を1分許容で分類する', () => {
  assert.equal(u.getDurationVariance(task({ quantity: 1, time_per_unit: 60, status: 'completed', actual_time: 62 }), []), 'over');
  assert.equal(u.getDurationVariance(task({ quantity: 1, time_per_unit: 60, status: 'completed', actual_time: 59 }), []), 'match');
  assert.equal(u.getDurationVariance(task({ quantity: 1, time_per_unit: 60, status: 'completed', actual_time: 58 }), []), 'short');
});

test('TC-CB-083 TD034 TV034 TA006 R006 内部計算では小数分を丸めない', () => {
  const target = task({
    status: 'completed',
    actual_start: '2026-06-27T00:00:00.000Z',
    actual_end: '2026-06-27T00:01:30.000Z',
  });
  assert.equal(u.getActualMinutes(target, []), 1.5);
});

test('TC-CB-035 TD024 TV024 TA005 R005/R014 日跨ぎの当日分だけ作業工数を返す', () => {
  const target = task({
    status: 'in_progress',
    scheduled_start: '2026-06-27T14:00:00.000Z',
    scheduled_end: '2026-06-27T16:00:00.000Z',
  });
  assert.equal(u.getWorkloadMinsForDay(target, new Date(2026, 5, 27)), 60);
});

test('TC-CB-028 TD028 TV028 TA006 R006 子を持つ親タスクを集計対象から除外する', () => {
  const parent = task({ id: 'parent', title: '親' });
  const child = task({ id: 'child', title: '子', parent_task_id: 'parent' });
  const solo = task({ id: 'solo', title: '単独' });
  assert.deepEqual(u.getWorkloadTaskList([parent, child, solo]).map(t => t.id), ['child', 'solo']);
  assert.equal(u.hasChildTasks('parent', [parent, child, solo]), true);
});

test('TC-CB-037 TD037 TV037 TA007 R007/R015 buildTreeは親子関係を再構築する', () => {
  const parent = task({ id: 'parent', title: '親' });
  const child = task({ id: 'child', title: '子', parent_task_id: 'parent' });
  const tree = u.buildTree([child, parent]);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].id, 'parent');
  assert.equal(tree[0].children[0].id, 'child');
});

test('TC-CB-088 TD034 TV034 TA006 R006 当日テキスト出力はJST日の対象タスクだけを出力する', () => {
  const report = u.exportTodayTasksAsText([
    task({
      title: '当日対象',
      status: 'completed',
      scheduled_start: '2026-06-26T23:00:00.000Z',
      scheduled_end: '2026-06-27T00:00:00.000Z',
      actual_time: 60,
      notes: '予定メモ',
      actual_memo: '実績メモ',
    }),
    task({
      id: 'other',
      title: '前日対象外',
      scheduled_start: '2026-06-25T23:00:00.000Z',
      scheduled_end: '2026-06-26T00:00:00.000Z',
    }),
  ], '2026-06-27');
  assert.match(report, /当日対象/);
  assert.doesNotMatch(report, /前日対象外/);
});

test('TC-CB-165 TD055 TV055 TA010 R010 通知再予約時に既存タイマーを取り消す', () => {
  const calls = { set: [], clear: [] };
  let nextId = 1;
  const originalWindow = globalThis.window;
  const originalNotification = globalThis.Notification;
  globalThis.window = {
    setTimeout(callback, ms) {
      calls.set.push(ms);
      return nextId++;
    },
    clearTimeout(id) {
      calls.clear.push(id);
    },
  };
  globalThis.Notification = class {
    static permission = 'granted';
  };
  globalThis.window.Notification = globalThis.Notification;
  try {
    const target = task({
      status: 'not_started',
      scheduled_start: '2999-01-01T00:00:00.000Z',
      scheduled_end: '2999-01-01T01:00:00.000Z',
    });
    u.scheduleNotification(target);
    u.scheduleNotification(target);
    assert.equal(calls.set.length, 4);
    assert.deepEqual(calls.clear, [1, 2]);
  } finally {
    u.clearAllTaskNotifications();
    globalThis.window = originalWindow;
    globalThis.Notification = originalNotification;
  }
});

test('TC-CB-173 TD058 TV058 TA010 R010 遠い将来の通知はsetTimeout上限以内で分割予約する', () => {
  const calls = [];
  const originalWindow = globalThis.window;
  const originalNotification = globalThis.Notification;
  globalThis.window = {
    setTimeout(callback, ms) {
      calls.push(ms);
      return calls.length;
    },
    clearTimeout() {},
  };
  globalThis.Notification = class {
    static permission = 'granted';
  };
  globalThis.window.Notification = globalThis.Notification;
  try {
    u.scheduleNotification(task({
      status: 'not_started',
      scheduled_start: '2999-01-01T00:00:00.000Z',
      scheduled_end: null,
    }));
    assert.equal(calls.length, 1);
    assert.ok(calls[0] <= 2_147_000_000);
  } finally {
    u.clearAllTaskNotifications();
    globalThis.window = originalWindow;
    globalThis.Notification = originalNotification;
  }
});

test('TC-CB-138 TD043 TV043 TA007 R007/R011 作業時間上限を0.5から24時間へクランプする', () => {
  assert.equal(wh.normalizeWorkHours(0), 0.5);
  assert.equal(wh.normalizeWorkHours(0.25), 0.5);
  assert.equal(wh.normalizeWorkHours(8), 8);
  assert.equal(wh.normalizeWorkHours(25), 24);
  assert.equal(wh.normalizeWorkHours(Number.NaN), 8);
});

test('TC-CB-139 TD043 TV043 TA007 R007/R011 localStorage未設定と破損値は既定8時間で読み込む', () => {
  const originalLocalStorage = globalThis.localStorage;
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
  try {
    store.clear();
    assert.equal(wh.loadWorkHours(), 8);
    store.set('workHoursPerDay', 'abc');
    assert.equal(wh.loadWorkHours(), 8);
    store.set('workHoursPerDay', '-1');
    assert.equal(wh.loadWorkHours(), 8);
    store.set('workHoursPerDay', '6.5');
    assert.equal(wh.loadWorkHours(), 6.5);
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test('TC-CB-025 TD018 TV018 TA004 R004/R014 daily定常タスクは期間開始日と終了日を含める', () => {
  const group = {
    period_start: '2026-06-27',
    period_end: '2026-06-29',
    recurrence_type: 'daily',
    days_of_week: null,
  };
  assert.deepEqual(tc.generateDateKeys(group), ['2026-06-27', '2026-06-28', '2026-06-29']);
});

test('TC-CB-026 TD018 TV018 TA004 R004/R014 weekly定常タスクはJST曜日に合う日だけ生成する', () => {
  const group = {
    period_start: '2026-06-27',
    period_end: '2026-07-03',
    recurrence_type: 'weekly',
    days_of_week: [1, 3],
  };
  assert.deepEqual(tc.generateDateKeys(group), ['2026-06-29', '2026-07-01']);
});

test('TC-CB-013 TD013 TV013 TA003 R003/R007 中断再開ペアはセッション列へ変換される', () => {
  const result = tf.buildDesiredSessions([
    {
      localId: 1,
      suspendVal: '2026-06-27T10:00',
      resumeVal: '2026-06-27T10:30',
      suspendSessionId: 's1',
      resumeSessionId: 's2',
    },
  ], '2026-06-27T09:00', '2026-06-27T12:00', 'completed');

  assert.equal(result.error, undefined);
  assert.equal(result.actualTime, 150);
  assert.deepEqual(result.sessions, [
    {
      existingId: 's1',
      sessionStart: '2026-06-27T00:00:00.000Z',
      sessionEnd: '2026-06-27T01:00:00.000Z',
    },
    {
      existingId: 's2',
      sessionStart: '2026-06-27T01:30:00.000Z',
      sessionEnd: '2026-06-27T03:00:00.000Z',
    },
  ]);
});

test('TC-CB-014 TD013 TV013 TA003 R003/R007 中断時刻が開始以前ならエラーにする', () => {
  const result = tf.buildDesiredSessions([
    { localId: 1, suspendVal: '2026-06-27T09:00', resumeVal: '2026-06-27T10:00' },
  ], '2026-06-27T09:00', '2026-06-27T12:00', 'completed');
  assert.match(result.error, /中断時刻/);
});

test('TC-CB-015 TD013 TV013 TA003 R003/R007 再開時刻が中断以前ならエラーにする', () => {
  const result = tf.buildDesiredSessions([
    { localId: 1, suspendVal: '2026-06-27T10:00', resumeVal: '2026-06-27T09:59' },
  ], '2026-06-27T09:00', '2026-06-27T12:00', 'completed');
  assert.match(result.error, /再開時刻/);
});

test('TC-CB-016 TD013 TV013 TA003 R003/R007 中断中タスクは最後の再開時刻を空にする', () => {
  const result = tf.buildDesiredSessions([
    { localId: 1, suspendVal: '2026-06-27T10:00', resumeVal: '' },
  ], '2026-06-27T09:00', '', 'suspended');
  assert.equal(result.error, undefined);
  assert.equal(result.suspendedAt, '2026-06-27T01:00:00.000Z');
  assert.equal(result.actualTime, 60);
  assert.deepEqual(result.sessions, [
    {
      existingId: undefined,
      sessionStart: '2026-06-27T00:00:00.000Z',
      sessionEnd: '2026-06-27T01:00:00.000Z',
    },
  ]);
});

test('TC-CB-017 TD013 TV013 TA003 R003/R007 完了タスクは終了実績日時を必須にする', () => {
  const result = tf.buildDesiredSessions([], '2026-06-27T09:00', '', 'completed');
  assert.match(result.error, /終了実績日時/);
});

test('TC-CB-089 TD090 TV090 TA002 R007/R015 セッションから中断再開入力行を復元する', () => {
  const entries = tf.buildEntriesFromSessions([
    session({ id: 's1', session_start: '2026-06-27T00:00:00.000Z', session_end: '2026-06-27T01:00:00.000Z' }),
    session({ id: 's2', session_start: '2026-06-27T01:30:00.000Z', session_end: '2026-06-27T03:00:00.000Z' }),
  ], '2026-06-27T09:00');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].suspendVal, '2026-06-27T10:00');
  assert.equal(entries[0].resumeVal, '2026-06-27T10:30');
  assert.equal(entries[0].suspendSessionId, 's1');
  assert.equal(entries[0].resumeSessionId, 's2');
});

test('TC-CB-090 TD090 TV090 TA002 R007/R015 中断分数をJST入力から算出する', () => {
  assert.equal(tf.calcSuspendMins('2026-06-27T10:00', '2026-06-27T10:45'), 45);
  assert.equal(tf.calcSuspendMins('', '2026-06-27T10:45'), 0);
  assert.equal(tf.calcSuspendMins('2026-06-27T10:45', '2026-06-27T10:00'), 0);
});

test('TC-CB-176 TD090 TV090 TA002 R002/R015 タイトル履歴が未保存なら空配列を返す', () => {
  withLocalStorage(() => {
    assert.deepEqual(th.loadTitleHistory(), []);
  });
});

test('TC-CB-177 TD090 TV090 TA002 R002/R015 タイトル履歴を1件保存して復元できる', () => {
  withLocalStorage((store) => {
    th.saveTitleHistory('日次レビュー');
    assert.deepEqual(th.loadTitleHistory(), ['日次レビュー']);
    assert.equal(store.get('taskTitleHistory'), JSON.stringify(['日次レビュー']));
  });
});

test('TC-CB-178 TD090 TV090 TA002 R002/R015 タイトル履歴は30件まで保持する', () => {
  withLocalStorage(() => {
    for (let i = 1; i <= 30; i += 1) th.saveTitleHistory(`履歴${i}`);
    const history = th.loadTitleHistory();
    assert.equal(history.length, 30);
    assert.equal(history[0], '履歴30');
    assert.equal(history[29], '履歴1');
  });
});

test('TC-CB-179 TD090 TV090 TA002 R002/R015 タイトル履歴は31件目で最古を落とす', () => {
  withLocalStorage(() => {
    for (let i = 1; i <= 31; i += 1) th.saveTitleHistory(`履歴${i}`);
    const history = th.loadTitleHistory();
    assert.equal(history.length, 30);
    assert.equal(history[0], '履歴31');
    assert.equal(history.includes('履歴1'), false);
  });
});

test('TC-CB-180 TD090 TV090 TA002 R002/R015 重複タイトルは先頭へ移動して単一化する', () => {
  withLocalStorage(() => {
    th.saveTitleHistory('設計');
    th.saveTitleHistory('実装');
    th.saveTitleHistory('設計');
    assert.deepEqual(th.loadTitleHistory(), ['設計', '実装']);
  });
});

test('TC-CB-181 TD090 TV090 TA002 R002/R015 壊れたlocalStorage値は空配列として扱う', () => {
  withLocalStorage((store) => {
    store.set('taskTitleHistory', '{not json');
    assert.deepEqual(th.loadTitleHistory(), []);
  });
});

test('TC-CB-152 TD053 TV053 TA010 R010 未着手タスクは開始と終了の通知を予約する', () => {
  withNotificationHarness((calls) => {
    u.scheduleNotification(task({
      id: 'notify-152',
      title: '通知対象152',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: '2026-06-27T00:40:00.000Z',
    }));
    assert.equal(calls.set.length, 2);
    assert.deepEqual(calls.set.map(c => c.ms), [600_000, 2_400_000]);
  });
});

test('TC-CB-153/TC-CB-154 TD053 TV053 TA010 R010 進行中・中断中タスクは終了通知だけを予約する', () => {
  withNotificationHarness((calls) => {
    u.scheduleNotification(task({
      id: 'notify-153',
      status: 'in_progress',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: '2026-06-27T00:40:00.000Z',
    }));
    u.scheduleNotification(task({
      id: 'notify-154',
      status: 'suspended',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: '2026-06-27T00:40:00.000Z',
    }));
    assert.equal(calls.set.length, 2);
    assert.deepEqual(calls.set.map(c => c.ms), [2_400_000, 2_400_000]);
  });
});

test('TC-CB-155 TD053 TV053 TA010 R010 完了タスクは通知を予約しない', () => {
  withNotificationHarness((calls) => {
    u.scheduleNotification(task({
      id: 'notify-155',
      status: 'completed',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: '2026-06-27T00:40:00.000Z',
    }));
    assert.equal(calls.set.length, 0);
  });
});

test('TC-CB-156/TC-CB-157 TD053 TV053 TA010 R010 開始または終了予定がない場合は存在する側だけ予約する', () => {
  withNotificationHarness((calls) => {
    u.scheduleNotification(task({
      id: 'notify-156',
      status: 'not_started',
      scheduled_start: null,
      scheduled_end: '2026-06-27T00:40:00.000Z',
    }));
    u.scheduleNotification(task({
      id: 'notify-157',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: null,
    }));
    assert.equal(calls.set.length, 2);
    assert.deepEqual(calls.set.map(c => c.ms), [2_400_000, 600_000]);
  });
});

test('TC-CB-158 TD053 TV053 TA010 R010 Notification API非対応なら通知を予約しない', () => {
  const originalWindow = globalThis.window;
  globalThis.window = { setTimeout() { throw new Error('should not schedule'); }, clearTimeout() {} };
  try {
    u.scheduleNotification(task({
      id: 'notify-158',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: '2026-06-27T00:40:00.000Z',
    }));
  } finally {
    globalThis.window = originalWindow;
  }
});

test('TC-CB-159 TD053 TV053 TA010 R010 通知発火時にタスク名と種別タグを渡す', () => {
  withNotificationHarness((calls) => {
    u.scheduleNotification(task({
      id: 'notify-159',
      title: '通知本文タスク',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: null,
    }));
    Date.now = () => new Date('2026-06-27T00:10:00.000Z').getTime();
    calls.set[0].callback();
    assert.equal(calls.notifications.length, 1);
    assert.match(calls.notifications[0].options.body, /通知本文タスク/);
    assert.equal(calls.notifications[0].options.tag, 'notify-159:start');
  });
});

test('TC-CB-160 TD054 TV054 TA010 R010 再予約時に既存通知を取り消す', () => {
  withNotificationHarness((calls) => {
    const target = task({
      id: 'notify-160',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: '2026-06-27T00:40:00.000Z',
    });
    u.scheduleNotification(target);
    u.scheduleNotification({ ...target, scheduled_start: '2026-06-27T00:20:00.000Z' });
    assert.deepEqual(calls.clear, [1, 2]);
    assert.equal(calls.set.length, 4);
  });
});

test('TC-CB-161 TD054 TV054 TA010 R010 完了への変更で既存通知を取り消して新規予約しない', () => {
  withNotificationHarness((calls) => {
    const target = task({
      id: 'notify-161',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: '2026-06-27T00:40:00.000Z',
    });
    u.scheduleNotification(target);
    u.scheduleNotification({ ...target, status: 'completed' });
    assert.deepEqual(calls.clear, [1, 2]);
    assert.equal(calls.set.length, 2);
  });
});

test('TC-CB-162/TC-CB-163 TD054 TV054 TA010 R010 個別取消と全取消で予約済みタイマーを解除する', () => {
  withNotificationHarness((calls) => {
    u.scheduleNotification(task({
      id: 'notify-162a',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: '2026-06-27T00:40:00.000Z',
    }));
    u.scheduleNotification(task({
      id: 'notify-162b',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:20:00.000Z',
      scheduled_end: null,
    }));
    u.cancelTaskNotifications('notify-162a');
    assert.deepEqual(calls.clear, [1, 2]);
    u.clearAllTaskNotifications();
    assert.deepEqual(calls.clear, [1, 2, 3]);
  });
});

test('TC-CB-164 TD054 TV054 TA010 R010 syncTaskNotificationsは全取消後に対象を再予約する', () => {
  withNotificationHarness((calls) => {
    u.scheduleNotification(task({
      id: 'notify-164-old',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:05:00.000Z',
      scheduled_end: null,
    }));
    u.syncTaskNotifications([
      task({
        id: 'notify-164-new',
        status: 'not_started',
        scheduled_start: '2026-06-27T00:10:00.000Z',
        scheduled_end: null,
      }),
    ]);
    assert.deepEqual(calls.clear, [1]);
    assert.equal(calls.set.length, 2);
    assert.equal(calls.set[1].ms, 600_000);
  });
});

test('TC-CB-166/TC-CB-167 TD055 TV055 TA010 R010 同一タスクは重複排除し別タスクは独立予約する', () => {
  withNotificationHarness((calls) => {
    const target = task({
      id: 'notify-166',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: null,
    });
    u.scheduleNotification(target);
    u.scheduleNotification(target);
    u.scheduleNotification(task({
      id: 'notify-167',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: null,
    }));
    assert.deepEqual(calls.clear, [1]);
    assert.equal(calls.set.length, 3);
  });
});

test('TC-CB-168/TC-CB-169/TC-CB-170 TD056 TV056 TA010 R010 不正・過去日時を無視し未来日時を予約する', () => {
  withNotificationHarness((calls) => {
    u.scheduleNotification(task({
      id: 'notify-168',
      status: 'not_started',
      scheduled_start: 'not-a-date',
      scheduled_end: 'also-invalid',
    }));
    u.scheduleNotification(task({
      id: 'notify-169',
      status: 'not_started',
      scheduled_start: '2026-06-26T23:59:00.000Z',
      scheduled_end: '2026-06-26T23:59:30.000Z',
    }));
    u.scheduleNotification(task({
      id: 'notify-170',
      status: 'not_started',
      scheduled_start: '2026-06-27T01:00:00.000Z',
      scheduled_end: null,
    }));
    assert.equal(calls.set.length, 1);
    assert.equal(calls.set[0].ms, 3_600_000);
  });
});

test('TC-CB-171/TC-CB-172 TD056 TV056 TA010 R010 権限なしでは生成せず終了通知はendタグで生成する', () => {
  withNotificationHarness((calls, FakeNotification) => {
    FakeNotification.permission = 'denied';
    u.scheduleNotification(task({
      id: 'notify-171',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: null,
    }));
    Date.now = () => new Date('2026-06-27T00:10:00.000Z').getTime();
    calls.set[0].callback();
    assert.equal(calls.notifications.length, 0);

    FakeNotification.permission = 'granted';
    Date.now = () => new Date('2026-06-27T00:00:00.000Z').getTime();
    u.scheduleNotification(task({
      id: 'notify-172',
      title: '終了通知タスク',
      status: 'suspended',
      scheduled_start: null,
      scheduled_end: '2026-06-27T00:10:00.000Z',
    }));
    Date.now = () => new Date('2026-06-27T00:10:00.000Z').getTime();
    calls.set.at(-1).callback();
    assert.equal(calls.notifications.length, 1);
    assert.match(calls.notifications[0].options.body, /終了通知タスク/);
    assert.equal(calls.notifications[0].options.tag, 'notify-172:end');
  });
});

test('TC-CB-174/TC-CB-175 TD058 TV058 TA010 R010 長期通知は上限内タイマーで予約し取消できる', () => {
  withNotificationHarness((calls) => {
    u.scheduleNotification(task({
      id: 'notify-175',
      status: 'not_started',
      scheduled_start: '2026-08-01T00:00:00.000Z',
      scheduled_end: null,
    }));
    assert.equal(calls.set.length, 1);
    assert.ok(calls.set[0].ms <= 2_147_000_000);
    u.cancelTaskNotifications('notify-175');
    assert.deepEqual(calls.clear, [1]);
  });
});

test('TC-CB-329 TD084 TV084 TA017 R015 CSV export includes task fields but not user/auth identifiers', async () => {
  const { csv } = await captureCsvExport([task({
    id: 'task-private-id',
    user_id: 'user-private-id',
    title: '出力対象タスク',
    notes: '予定メモ',
    actual_memo: '実績メモ',
  })]);

  assert.match(csv, /"出力対象タスク"/);
  assert.match(csv, /"予定メモ"/);
  assert.match(csv, /"実績メモ"/);
  assert.doesNotMatch(csv, /user-private-id/);
  assert.doesNotMatch(csv, /task-private-id/);
  assert.doesNotMatch(csv, /@example\.test/);
});

test('TC-CB-330 TD084 TV084 TA017 R015 clipboard text export uses selected report fields and excludes user/auth identifiers', () => {
  const report = u.exportTodayTasksAsText([
    task({
      id: 'clipboard-task-id',
      user_id: 'clipboard-user-id',
      title: 'クリップボード対象',
      status: 'completed',
      scheduled_start: '2026-06-26T23:00:00.000Z',
      scheduled_end: '2026-06-27T00:00:00.000Z',
      actual_time: 60,
      notes: 'コピー予定メモ',
      actual_memo: 'コピー実績メモ',
    }),
  ], '2026-06-27', {
    taskName: true,
    status: true,
    timeRange: false,
    duration: false,
    durationFactor: false,
    remarks: false,
    actualMemo: false,
  });

  assert.match(report, /クリップボード対象/);
  assert.match(report, /ステータス/);
  assert.doesNotMatch(report, /コピー予定メモ/);
  assert.doesNotMatch(report, /コピー実績メモ/);
  assert.doesNotMatch(report, /clipboard-user-id/);
  assert.doesNotMatch(report, /clipboard-task-id/);
});

test('TC-CB-331 TD084 TV084 TA017 R015 notification body contains task title and status context only', () => {
  withNotificationHarness((calls) => {
    u.scheduleNotification(task({
      id: 'notify-privacy',
      user_id: 'notify-user-id',
      title: '通知公開タイトル',
      notes: '通知に出してはいけない予定メモ',
      actual_memo: '通知に出してはいけない実績メモ',
      status: 'not_started',
      scheduled_start: '2026-06-27T00:10:00.000Z',
      scheduled_end: null,
    }));
    Date.now = () => new Date('2026-06-27T00:10:00.000Z').getTime();
    calls.set[0].callback();

    assert.equal(calls.notifications.length, 1);
    assert.equal(calls.notifications[0].title, 'タスクマネージャー');
    assert.match(calls.notifications[0].options.body, /通知公開タイトル/);
    assert.doesNotMatch(calls.notifications[0].options.body, /通知に出してはいけない予定メモ/);
    assert.doesNotMatch(calls.notifications[0].options.body, /通知に出してはいけない実績メモ/);
    assert.doesNotMatch(calls.notifications[0].options.body, /notify-user-id/);
  });
});

test('TC-CB-332 TD084 TV084 TA017 R015 localStorage stores local UI settings/history but not Supabase task payloads or auth identifiers', () => {
  withLocalStorage((store) => {
    th.saveTitleHistory('履歴タイトル');
    store.set('workHoursPerDay', '7.5');

    assert.equal(store.get('taskTitleHistory'), JSON.stringify(['履歴タイトル']));
    assert.equal(store.get('workHoursPerDay'), '7.5');
    assert.equal(store.has('tasks'), false);
    assert.equal(store.has('task_sessions'), false);
    assert.equal(store.has('supabase.auth.token'), false);
    assert.equal([...store.values()].some(value => String(value).includes('@example.test')), false);
  });
});

test('TC-CB-305 TD052 TV052 TA009 R009/R015 CSV出力は通常文字列をCSVとしてダウンロードする', async () => {
  const { csv, clicks } = await captureCsvExport([task({ title: '通常タスク', notes: 'メモ' })]);
  assert.match(csv, /^"/);
  assert.match(csv, /"通常タスク"/);
  assert.equal(clicks.length, 1);
  assert.match(clicks[0].download, /^tasks_\d{4}-\d{2}-\d{2}\.csv$/);
});

test('TC-CB-306 TD052 TV052 TA009 R009/R015 CSV出力は空文字を空セルとしてクォートする', async () => {
  const { csv } = await captureCsvExport([task({ title: '空欄タスク', actual_memo: '', notes: '' })]);
  assert.match(csv, /"空欄タスク"/);
  assert.match(csv, /"",""$/m);
});

test('TC-CB-307/TC-CB-308/TC-CB-309 TD052 TV052 TA009 R009/R015 CSV出力はカンマ・改行・引用符をセル内に保持する', async () => {
  const { csv } = await captureCsvExport([task({
    title: 'カンマ,改行\n引用"タスク',
    actual_memo: '実績"メモ',
    notes: '予定,メモ',
  })]);
  assert.match(csv, /"カンマ,改行\n引用""タスク"/);
  assert.match(csv, /"実績""メモ"/);
  assert.match(csv, /"予定,メモ"/);
});
