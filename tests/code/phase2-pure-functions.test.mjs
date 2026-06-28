import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const buildDir = join(tmpdir(), 'personaltaskmanage-phase2-code-tests');

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
    .replace(/from ['"]\.\.\/lib\/utils['"]/g, "from '../lib/utils.js'")
    .replace(/from ['"]\.\.\/lib\/dateTime['"]/g, "from '../lib/dateTime.js'")
    .replace(/from ['"]\.\.\/lib\/supabase['"]/g, "from '../test-stubs/supabase.js'")
    .replace(/from ['"]\.\/AuthContext['"]/g, "from '../test-stubs/AuthContext.js'");
  if (relativePath === 'src/lib/useWorkHours.ts' || relativePath === 'src/contexts/TaskContext.tsx') {
    output = output
      .replace(/from ['"]react['"]/g, "from '../test-stubs/react.js'")
      .replace(/from ['"]react\/jsx-runtime['"]/g, "from '../test-stubs/jsx-runtime.js'");
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
  await writeFile(join(buildDir, 'test-stubs/react.js'), [
    'export function createContext(value) { return { Provider: function Provider() {}, _currentValue: value }; }',
    'export function useContext(ctx) { return ctx._currentValue; }',
    'export function useEffect() {}',
    'export function useCallback(fn) { return fn; }',
    'export function useState(initial) { const value = typeof initial === "function" ? initial() : initial; return [value, function setState() {}]; }',
  ].join('\n'), 'utf8');
  await writeFile(join(buildDir, 'test-stubs/jsx-runtime.js'), [
    'export function jsx(type, props) { return { type, props }; }',
    'export function jsxs(type, props) { return { type, props }; }',
    'export const Fragment = Symbol("Fragment");',
  ].join('\n'), 'utf8');
  await compileSource('src/lib/dateTime.ts');
  await compileSource('src/lib/utils.ts');
  await compileSource('src/lib/useWorkHours.ts');
  await compileSource('src/contexts/TaskContext.tsx');
  return {
    dateTime: await import(pathToFileURL(join(buildDir, 'lib/dateTime.js')).href),
    utils: await import(pathToFileURL(join(buildDir, 'lib/utils.js')).href),
    useWorkHours: await import(pathToFileURL(join(buildDir, 'lib/useWorkHours.js')).href),
    taskContext: await import(pathToFileURL(join(buildDir, 'contexts/TaskContext.js')).href),
  };
}

const targets = await loadTargets();
const d = targets.dateTime;
const u = targets.utils;
const wh = targets.useWorkHours;
const tc = targets.taskContext;

function task(overrides = {}) {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: 'Task',
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

function recurrenceGroup(overrides = {}) {
  return {
    id: 'group-1',
    user_id: 'user-1',
    title: 'recurrence',
    recurrence_type: 'daily',
    days_of_week: [],
    period_start: '2026-06-27',
    period_end: '2026-06-30',
    start_time: '09:00',
    end_time: '10:00',
    ends_next_day: false,
    priority: 'medium',
    difficulty: 1,
    quantity: 1,
    time_per_unit: 60,
    notes: '',
    track_actual: true,
    created_at: '2026-06-27T00:00:00.000Z',
    updated_at: '2026-06-27T00:00:00.000Z',
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
  };
  try {
    return fn(store);
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
}

async function captureCsvExport(tasks) {
  const originalDocument = globalThis.document;
  const originalURL = globalThis.URL;
  let capturedBlob;
  globalThis.document = {
    createElement() {
      return { href: '', download: '', click() {} };
    },
  };
  globalThis.URL = {
    createObjectURL(blob) {
      capturedBlob = blob;
      return 'blob:test-url';
    },
    revokeObjectURL() {},
  };
  try {
    u.exportToCSV(tasks);
    return capturedBlob.text();
  } finally {
    globalThis.document = originalDocument;
    globalThis.URL = originalURL;
  }
}

test('TC-CB-027 TD018 TV018 TA004 R004/R014 recurrence daily includes next day boundary', () => {
  assert.deepEqual(tc.generateDateKeys(recurrenceGroup({ period_start: '2026-06-27', period_end: '2026-06-28' })), ['2026-06-27', '2026-06-28']);
});

test('TC-CB-029 TD018 TV018 TA004 R004/R014 addJstMonths clamps month end', () => {
  assert.equal(d.addJstMonths('2026-01-31', 1), '2026-02-28');
});

test('TC-CB-030 TD018 TV018 TA004 R004/R014 addJstDays crosses year end', () => {
  assert.equal(d.addJstDays('2026-12-31', 1), '2027-01-01');
});

test('TC-CB-031 TD018 TV018 TA004 R004/R014 addJstDays crosses non-leap Feb 28', () => {
  assert.equal(d.addJstDays('2026-02-28', 1), '2026-03-01');
});

test('TC-CB-032 TD018 TV018 TA004 R004/R014 addJstDays crosses leap Feb 29', () => {
  assert.equal(d.addJstDays('2024-02-29', 1), '2024-03-01');
});

test('TC-CB-033 TD018 TV018 TA004 R004/R014 weekly recurrence includes leap-day Saturday only', () => {
  assert.deepEqual(tc.generateDateKeys(recurrenceGroup({ recurrence_type: 'weekly', days_of_week: [6], period_start: '2024-02-28', period_end: '2024-03-02' })), ['2024-03-02']);
});

test('TC-CB-034 TD024 TV024 TA005 R005/R014 workload clips one minute before midnight', () => {
  assert.equal(u.getWorkloadMinsForDay(task({ scheduled_start: '2026-06-27T14:59:00.000Z', scheduled_end: '2026-06-27T15:01:00.000Z' }), new Date(2026, 5, 27)), 1);
});

test('TC-CB-036 TD024 TV024 TA005 R005/R014 workload clips one minute after midnight', () => {
  assert.equal(u.getWorkloadMinsForDay(task({ scheduled_start: '2026-06-27T14:59:00.000Z', scheduled_end: '2026-06-27T15:01:00.000Z' }), new Date(2026, 5, 28)), 1);
});

test('TC-CB-038 TD024 TV024 TA005 R005/R014 workload counts only end-side overlap', () => {
  assert.equal(u.getWorkloadMinsForDay(task({ scheduled_start: '2026-06-26T15:00:00.000Z', scheduled_end: '2026-06-26T15:30:00.000Z' }), new Date(2026, 5, 27)), 30);
});

test('TC-CB-039 TD024 TV024 TA005 R005/R014 workload clips month-end boundary', () => {
  assert.equal(u.getWorkloadMinsForDay(task({ scheduled_start: '2026-01-31T14:30:00.000Z', scheduled_end: '2026-01-31T15:30:00.000Z' }), new Date(2026, 1, 1)), 30);
});

test('TC-CB-040 TD028 TV028 TA006 R006 workload keeps standalone task', () => {
  assert.deepEqual(u.getWorkloadTaskList([task({ id: 'solo' })]).map(t => t.id), ['solo']);
});

test('TC-CB-041 TD028 TV028 TA006 R006 workload excludes direct parent and keeps child leaf', () => {
  assert.deepEqual(u.getWorkloadTaskList([task({ id: 'parent' }), task({ id: 'child', parent_task_id: 'parent' })]).map(t => t.id), ['child']);
});

test('TC-CB-042 TD028 TV028 TA006 R006 workload treats missing parent as leaf', () => {
  assert.deepEqual(u.getWorkloadTaskList([task({ id: 'orphan', parent_task_id: 'missing' })]).map(t => t.id), ['orphan']);
});

test('TC-CB-043 TD029 TV029 TA006 R006 track_actual false returns null actual minutes', () => {
  assert.equal(u.getActualMinutes(task({ track_actual: false, status: 'completed', actual_time: 90 }), []), null);
});

test('TC-CB-044 TD029 TV029 TA006 R006 track_actual false returns null range actual minutes', () => {
  assert.equal(u.getActualMinutesForRange(task({ track_actual: false, status: 'completed', actual_time: 90 }), [], new Date('2026-06-27T00:00:00.000Z'), new Date('2026-06-28T00:00:00.000Z')), null);
});

test('TC-CB-045 TD029 TV029 TA006 R006 track_actual false yields unknown variance', () => {
  assert.equal(u.getDurationVariance(task({ track_actual: false, status: 'completed', quantity: 1, time_per_unit: 60, actual_time: 90 }), []), 'unknown');
});

test('TC-CB-046 TD029 TV029 TA006 R006 track_actual false task can remain in workload list', () => {
  assert.deepEqual(u.getWorkloadTaskList([task({ id: 'untracked', track_actual: false })]).map(t => t.id), ['untracked']);
});

test('TC-CB-047 TD030 TV030 TA006 R006 planned minutes multiplies quantity and unit minutes', () => {
  assert.equal(u.getPlannedMinutes(task({ quantity: 3, time_per_unit: 25 })), 75);
});

test('TC-CB-048 TD030 TV030 TA006 R006 planned minutes rejects zero quantity', () => {
  assert.equal(u.getPlannedMinutes(task({ quantity: 0, time_per_unit: 25 })), null);
});

test('TC-CB-049 TD030 TV030 TA006 R006 planned minutes rejects zero unit minutes', () => {
  assert.equal(u.getPlannedMinutes(task({ quantity: 3, time_per_unit: 0 })), null);
});

test('TC-CB-050 TD030 TV030 TA006 R006 planned minutes rejects negative quantity', () => {
  assert.equal(u.getPlannedMinutes(task({ quantity: -1, time_per_unit: 25 })), null);
});

test('TC-CB-051 TD030 TV030 TA006 R006 planned minutes rejects negative unit minutes', () => {
  assert.equal(u.getPlannedMinutes(task({ quantity: 3, time_per_unit: -25 })), null);
});

test('TC-CB-052 TD030 TV030 TA006 R006 planned minutes rejects non-finite quantity', () => {
  assert.equal(u.getPlannedMinutes(task({ quantity: Number.POSITIVE_INFINITY, time_per_unit: 25 })), null);
});

test('TC-CB-053 TD030 TV030 TA006 R006 planned minutes rejects non-finite unit minutes', () => {
  assert.equal(u.getPlannedMinutes(task({ quantity: 3, time_per_unit: Number.NaN })), null);
});

test('TC-CB-054 TD031 TV031 TA006 R006 not_started with sessions returns zero actual minutes', () => {
  assert.equal(u.getActualMinutes(task({ status: 'not_started', actual_time: 90 }), [session({ session_start: '2026-06-27T00:00:00.000Z', session_end: '2026-06-27T01:00:00.000Z' })]), 0);
});

test('TC-CB-055 TD031 TV031 TA006 R006 not_started with actual_time returns zero actual minutes', () => {
  assert.equal(u.getActualMinutes(task({ status: 'not_started', actual_time: 90 }), []), 0);
});

test('TC-CB-056 TD031 TV031 TA006 R006 not_started with actual range returns zero actual minutes', () => {
  assert.equal(u.getActualMinutes(task({ status: 'not_started', actual_start: '2026-06-27T00:00:00.000Z', actual_end: '2026-06-27T01:00:00.000Z' }), []), 0);
});

test('TC-CB-057 TD031 TV031 TA006 R006 not_started without actual data returns zero actual minutes', () => {
  assert.equal(u.getActualMinutes(task({ status: 'not_started' }), []), 0);
});

test('TC-CB-058 TD031 TV031 TA006 R006 in_progress open session uses provided now', () => {
  assert.equal(u.getActualMinutes(task({ status: 'in_progress' }), [session({ session_start: '2026-06-27T00:00:00.000Z', session_end: null })], new Date('2026-06-27T00:45:00.000Z')), 45);
});

test('TC-CB-059 TD031 TV031 TA006 R006 in_progress without sessions uses actual_time', () => {
  assert.equal(u.getActualMinutes(task({ status: 'in_progress', actual_time: 35 }), []), 35);
});

test('TC-CB-060 TD031 TV031 TA006 R006 in_progress without sessions uses actual range', () => {
  assert.equal(u.getActualMinutes(task({ status: 'in_progress', actual_start: '2026-06-27T00:00:00.000Z', actual_end: '2026-06-27T00:40:00.000Z' }), []), 40);
});

test('TC-CB-061 TD031 TV031 TA006 R006 in_progress without actual data returns null', () => {
  assert.equal(u.getActualMinutes(task({ status: 'in_progress' }), []), null);
});

test('TC-CB-062 TD031 TV031 TA006 R006 suspended closed session is summed', () => {
  assert.equal(u.getActualMinutes(task({ status: 'suspended' }), [session({ session_start: '2026-06-27T00:00:00.000Z', session_end: '2026-06-27T00:20:00.000Z' })]), 20);
});

test('TC-CB-064 TD031 TV031 TA006 R006 suspended without sessions uses actual range', () => {
  assert.equal(u.getActualMinutes(task({ status: 'suspended', actual_start: '2026-06-27T00:00:00.000Z', actual_end: '2026-06-27T00:25:00.000Z' }), []), 25);
});

test('TC-CB-065 TD031 TV031 TA006 R006 suspended without actual data returns null', () => {
  assert.equal(u.getActualMinutes(task({ status: 'suspended' }), []), null);
});

test('TC-CB-066 TD031 TV031 TA006 R006 completed session total wins over actual_time', () => {
  assert.equal(u.getActualMinutes(task({ status: 'completed', actual_time: 99 }), [session({ session_start: '2026-06-27T00:00:00.000Z', session_end: '2026-06-27T00:30:00.000Z' })]), 30);
});

test('TC-CB-067 TD031 TV031 TA006 R006 completed without sessions uses actual_time', () => {
  assert.equal(u.getActualMinutes(task({ status: 'completed', actual_time: 55 }), []), 55);
});

test('TC-CB-068 TD031 TV031 TA006 R006 completed without sessions uses actual range', () => {
  assert.equal(u.getActualMinutes(task({ status: 'completed', actual_start: '2026-06-27T00:00:00.000Z', actual_end: '2026-06-27T00:50:00.000Z' }), []), 50);
});

test('TC-CB-069 TD031 TV031 TA006 R006 completed without actual data returns null', () => {
  assert.equal(u.getActualMinutes(task({ status: 'completed' }), []), null);
});

test('TC-CB-071 TD032 TV032 TA006 R006/R014 range attribution includes exact midnight start', () => {
  assert.equal(u.getPlannedMinutesForRange(task({ quantity: 1, time_per_unit: 60, scheduled_start: '2026-06-26T15:00:00.000Z', scheduled_end: '2026-06-26T16:00:00.000Z' }), new Date('2026-06-26T15:00:00.000Z'), new Date('2026-06-27T15:00:00.000Z')), 60);
});

test('TC-CB-072 TD032 TV032 TA006 R006/R014 range attribution clips one minute after midnight', () => {
  assert.equal(u.getPlannedMinutesForRange(task({ quantity: 1, time_per_unit: 60, scheduled_start: '2026-06-26T14:59:00.000Z', scheduled_end: '2026-06-26T15:59:00.000Z' }), new Date('2026-06-26T15:00:00.000Z'), new Date('2026-06-27T15:00:00.000Z')), 59);
});

test('TC-CB-073 TD032 TV032 TA006 R006/R014 range attribution counts day-crossing start side', () => {
  assert.equal(u.getPlannedMinutesForRange(task({ quantity: 1, time_per_unit: 120, scheduled_start: '2026-06-27T14:00:00.000Z', scheduled_end: '2026-06-27T16:00:00.000Z' }), new Date('2026-06-26T15:00:00.000Z'), new Date('2026-06-27T15:00:00.000Z')), 60);
});

test('TC-CB-075 TD032 TV032 TA006 R006/R014 range attribution handles month end', () => {
  assert.equal(u.getPlannedMinutesForRange(task({ quantity: 1, time_per_unit: 90, scheduled_start: '2026-01-31T14:30:00.000Z', scheduled_end: '2026-01-31T16:00:00.000Z' }), new Date('2026-01-31T15:00:00.000Z'), new Date('2026-02-01T15:00:00.000Z')), 60);
});

test('TC-CB-076 TD032 TV032 TA006 R006/R014 range attribution handles leap day', () => {
  assert.equal(u.getPlannedMinutesForRange(task({ quantity: 1, time_per_unit: 120, scheduled_start: '2024-02-28T15:30:00.000Z', scheduled_end: '2024-02-28T17:30:00.000Z' }), new Date('2024-02-28T15:00:00.000Z'), new Date('2024-02-29T15:00:00.000Z')), 120);
});

test('TC-CB-077 TD032 TV032 TA006 R006/R014 range attribution handles year end', () => {
  assert.equal(u.getPlannedMinutesForRange(task({ quantity: 1, time_per_unit: 120, scheduled_start: '2026-12-31T14:00:00.000Z', scheduled_end: '2026-12-31T16:00:00.000Z' }), new Date('2026-12-31T15:00:00.000Z'), new Date('2027-01-01T15:00:00.000Z')), 60);
});

test('TC-CB-079 TD033 TV033 TA006 R006 duration variance is short just below lower tolerance', () => {
  assert.equal(u.getDurationVariance(task({ status: 'completed', quantity: 1, time_per_unit: 60, actual_time: 58.9 }), []), 'short');
});

test('TC-CB-080 TD033 TV033 TA006 R006 duration variance matches exact lower tolerance', () => {
  assert.equal(u.getDurationVariance(task({ status: 'completed', quantity: 1, time_per_unit: 60, actual_time: 59 }), []), 'match');
});

test('TC-CB-081 TD033 TV033 TA006 R006 duration variance matches exact upper tolerance', () => {
  assert.equal(u.getDurationVariance(task({ status: 'completed', quantity: 1, time_per_unit: 60, actual_time: 61 }), []), 'match');
});

test('TC-CB-082 TD033 TV033 TA006 R006 duration variance is over just above upper tolerance', () => {
  assert.equal(u.getDurationVariance(task({ status: 'completed', quantity: 1, time_per_unit: 60, actual_time: 61.1 }), []), 'over');
});

test('TC-CB-144 TD043 TV043 TA007 R007/R011 work hours clamps below minimum to 0.5', () => {
  assert.equal(wh.normalizeWorkHours(0.49), 0.5);
});

test('TC-CB-145 TD043 TV043 TA007 R007/R011 work hours clamps above maximum to 24', () => {
  assert.equal(wh.normalizeWorkHours(24.01), 24);
});

test('TC-CB-146 TD043 TV043 TA007 R007/R011 missing work hours localStorage returns default 8', () => {
  withLocalStorage(() => assert.equal(wh.loadWorkHours(), 8));
});

test('TC-CB-147 TD043 TV043 TA007 R007/R011 throwing work hours localStorage returns default 8', () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('broken storage'); } };
  try {
    assert.equal(wh.loadWorkHours(), 8);
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test('TC-CB-148 TD043 TV043 TA007 R007/R011 malformed work hours localStorage returns default 8', () => {
  withLocalStorage((store) => {
    store.set('workHoursPerDay', 'not-a-number');
    assert.equal(wh.loadWorkHours(), 8);
    store.set('workHoursPerDay', '0');
    assert.equal(wh.loadWorkHours(), 8);
    store.set('workHoursPerDay', '-1');
    assert.equal(wh.loadWorkHours(), 8);
  });
});

test('TC-CB-304 TD052 TV052 TA009 R009/R015 CSV output prefixes formula-leading cells', async () => {
  const csv = await captureCsvExport([task({ title: '=SUM(A1:A2)', actual_memo: '+cmd', notes: '@user' })]);
  assert.match(csv, /"'=SUM\(A1:A2\)"/);
  assert.match(csv, /"'\+cmd"/);
  assert.match(csv, /"'@user"/);
});
