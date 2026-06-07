import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Plus, Check, ChevronDown, Search, History, Trash2 } from 'lucide-react';
import { loadTitleHistory, saveTitleHistory } from './titleHistory';
import type { Task, TaskStatus, TaskPriority } from '../../lib/types';
import {
  START_DELAY_FACTORS, START_EARLY_FACTORS,
  DURATION_OVER_FACTORS, DURATION_SHORT_FACTORS,
} from '../../lib/types';
import { useTasks } from '../../contexts/TaskContext';
import { toLocalDatetimeValue, sortCategoriesByColor } from '../../lib/utils';

interface TaskFormProps {
  task?: Task | null;
  onClose: () => void;
  initialDatetime?: string; // "2024-05-08T09:00" local datetime to pre-fill on new task
}

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

const defaultForm = {
  title: '',
  category_id: '',
  priority: 'medium' as TaskPriority,
  difficulty: 0,
  quantity: 1,
  time_per_unit: 0,
  scheduled_start: '',
  scheduled_end: '',
  parent_task_id: '',
  notes: '',
  status: 'not_started' as TaskStatus,
  actual_time: 0,
  actual_memo: '',
  actual_start: '',
  actual_end: '',
  start_delay_factor: '',
  start_early_factor: '',
  duration_over_factor: '',
  duration_short_factor: '',
};

/** datetime-local string → ISO string or null */
function localToISO(val: string): string | null {
  if (!val) return null;
  return new Date(val).toISOString();
}


function CategoryDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (newId: string) => void;
}) {
  const { createCategory } = useTasks();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleOK = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const newCat = await createCategory({ name: name.trim(), color });
    setSaving(false);
    if (newCat) onCreate(newCat.id);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">新しい分類を追加</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <label className="form-label">分類名</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="form-input"
            placeholder="例：仕事、プライベート"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleOK()}
          />
        </div>
        <div>
          <label className="form-label">カラー</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">キャンセル</button>
          <button
            type="button"
            onClick={handleOK}
            disabled={!name.trim() || saving}
            className="btn-primary flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// ローカル状態で管理する中断ペア（DBとの対応IDを保持）
interface SuspendEntry {
  localId: number;           // ローカル識別子（配列インデックスの代替）
  suspendVal: string;        // datetime-local 文字列
  resumeVal: string;         // datetime-local 文字列
  suspendSessionId?: string; // 中断セッション（session_end = suspendedAt）のDB ID
  resumeSessionId?: string;  // 再開セッション（session_start = resumedAt）のDB ID
}

let _localIdCounter = 0;
const nextLocalId = () => ++_localIdCounter;

function buildEntriesFromSessions(
  taskSessions: import('../../lib/types').TaskSession[],
  actualStart: string
): SuspendEntry[] {
  const sorted = [...taskSessions].sort(
    (a, b) => new Date(a.session_start).getTime() - new Date(b.session_start).getTime()
  );
  const entries: SuspendEntry[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const suspendedAt = sorted[i].session_end;
    const resumedAt = sorted[i + 1].session_start;
    if (suspendedAt && resumedAt) {
      entries.push({
        localId: nextLocalId(),
        suspendVal: toLocalDatetimeValue(suspendedAt),
        resumeVal: toLocalDatetimeValue(resumedAt),
        suspendSessionId: sorted[i].id,
        resumeSessionId: sorted[i + 1].id,
      });
    }
  }

  // 最初のセッション開始が actual_start より後 → 中断時刻不明として補完
  if (sorted.length >= 1 && actualStart) {
    const firstStart = new Date(sorted[0].session_start);
    const actStart = new Date(actualStart);
    const alreadyCovered = entries.some(e => e.resumeSessionId === sorted[0].id);
    if (!alreadyCovered && firstStart > actStart) {
      entries.unshift({
        localId: nextLocalId(),
        suspendVal: '',
        resumeVal: toLocalDatetimeValue(sorted[0].session_start),
        suspendSessionId: undefined,
        resumeSessionId: sorted[0].id,
      });
    }
  }

  return entries;
}

function calcSuspendMins(suspendVal: string, resumeVal: string): number {
  if (!suspendVal || !resumeVal) return 0;
  return Math.max(0, Math.round(
    (new Date(resumeVal).getTime() - new Date(suspendVal).getTime()) / 60000
  ));
}

function fmtSuspendMins(mins: number): string {
  if (mins <= 0) return '0分';
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  }
  return `${mins}分`;
}

interface SuspendEntryRowProps {
  entry: SuspendEntry;
  index: number;
  total: number;
  taskId: string;
  actualStart: string;
  onChange: (localId: number, patch: Partial<SuspendEntry>) => void;
  onDelete: (localId: number) => void;
}

function SuspendEntryRow({ entry, index, total, taskId, actualStart, onChange, onDelete }: SuspendEntryRowProps) {
  const { updateSession, createSession, deleteSession } = useTasks();

  const mins = calcSuspendMins(entry.suspendVal, entry.resumeVal);

  const handleSuspendBlur = async () => {
    if (!entry.suspendVal) return;
    const iso = new Date(entry.suspendVal).toISOString();
    if (entry.suspendSessionId) {
      await updateSession(entry.suspendSessionId, { session_end: iso });
    } else if (taskId && actualStart) {
      // 前のセッション（actual_start → この中断）がなければ作成
      const created = await createSession(taskId, new Date(actualStart).toISOString(), iso);
      if (created) onChange(entry.localId, { suspendSessionId: created.id });
    }
  };

  const handleResumeBlur = async () => {
    if (!entry.resumeVal) return;
    const iso = new Date(entry.resumeVal).toISOString();
    if (entry.resumeSessionId) {
      await updateSession(entry.resumeSessionId, { session_start: iso });
    } else if (taskId && entry.suspendVal) {
      // 再開後のセッション（この再開 → 次の中断 or actual_end）を作成
      const created = await createSession(taskId, iso, null);
      if (created) onChange(entry.localId, { resumeSessionId: created.id });
    }
  };

  const handleDelete = async () => {
    // 関連するDBセッションを削除
    if (entry.suspendSessionId) await deleteSession(entry.suspendSessionId);
    if (entry.resumeSessionId) await deleteSession(entry.resumeSessionId);
    onDelete(entry.localId);
  };

  return (
    <div className="sm:col-span-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          中断 / 再開{total > 1 ? ` #${index + 1}` : ''}
        </p>
        <button
          type="button"
          onClick={handleDelete}
          className="p-1 rounded-lg text-amber-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="この中断を削除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5 block">中断時刻</label>
          <input
            type="datetime-local"
            value={entry.suspendVal}
            max={entry.resumeVal || undefined}
            onChange={e => onChange(entry.localId, { suspendVal: e.target.value })}
            onBlur={handleSuspendBlur}
            className="form-input text-xs py-1"
          />
        </div>
        <div>
          <label className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5 block">再開時刻</label>
          <input
            type="datetime-local"
            value={entry.resumeVal}
            min={entry.suspendVal || undefined}
            onChange={e => onChange(entry.localId, { resumeVal: e.target.value })}
            onBlur={handleResumeBlur}
            className="form-input text-xs py-1"
          />
        </div>
        <div className="flex flex-col justify-end pb-1">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">中断時間</p>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            {fmtSuspendMins(mins)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ActualsSectionProps {
  task: import('../../lib/types').Task | null | undefined;
  form: typeof defaultForm;
  set: (key: string, val: unknown) => void;
  childrenActualTimeMins?: number | null;
  onEntriesChange?: (entries: SuspendEntry[]) => void;
}

function ActualsSection({ task, form, set, childrenActualTimeMins, onEntriesChange }: ActualsSectionProps) {
  const { sessions, createSession } = useTasks();
  const taskSessions = task ? sessions.filter(s => s.task_id === task.id) : [];

  const [entries, setEntries] = useState<SuspendEntry[]>(() =>
    buildEntriesFromSessions(taskSessions, form.actual_start)
  );

  const updateEntries = useCallback((updater: SuspendEntry[] | ((prev: SuspendEntry[]) => SuspendEntry[])) => {
    setEntries(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onEntriesChange?.(next);
      return next;
    });
  }, [onEntriesChange]);

  // セッションがロードされてきたら再初期化（初回ロード後にセッションが入ってくる場合）
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    if (taskSessions.length > 0) {
      initializedRef.current = true;
      const built = buildEntriesFromSessions(taskSessions, form.actual_start);
      updateEntries(built);
    }
  }, [taskSessions.length]);

  const totalSuspendMins = entries.reduce(
    (sum, e) => sum + calcSuspendMins(e.suspendVal, e.resumeVal), 0
  );

  const formActualStartISO = form.actual_start ? new Date(form.actual_start).toISOString() : null;
  const formActualEndISO = form.actual_end ? new Date(form.actual_end).toISOString() : null;
  const grossMins = formActualStartISO && formActualEndISO
    ? Math.max(0, Math.round(
        (new Date(formActualEndISO).getTime() - new Date(formActualStartISO).getTime()) / 60000
      ))
    : null;
  const netMins = grossMins !== null ? Math.max(0, grossMins - totalSuspendMins) : null;

  useEffect(() => {
    if (netMins !== null) set('actual_time', netMins);
  }, [netMins]);

  const handleEntryChange = useCallback((localId: number, patch: Partial<SuspendEntry>) => {
    updateEntries(prev => prev.map(e => e.localId === localId ? { ...e, ...patch } : e));
  }, [updateEntries]);

  const handleEntryDelete = useCallback((localId: number) => {
    updateEntries(prev => prev.filter(e => e.localId !== localId));
  }, [updateEntries]);

  const handleAddEntry = async () => {
    const newEntry: SuspendEntry = { localId: nextLocalId(), suspendVal: '', resumeVal: '' };
    // 新規タスク（taskId不明）の場合はDBセッションは後で登録するためローカルのみ追加
    if (task?.id) {
      // 空エントリとして追加（blurで実際に作成）
    }
    updateEntries(prev => [...prev, newEntry]);
  };

  const scheduledStart = form.scheduled_start ? new Date(form.scheduled_start) : null;
  const actualStartDate = form.actual_start ? new Date(form.actual_start) : null;
  const isStartLate = !!(scheduledStart && actualStartDate && actualStartDate > scheduledStart);
  const isStartEarly = !!(scheduledStart && actualStartDate && actualStartDate < scheduledStart);

  const plannedMins = form.scheduled_start && form.scheduled_end
    ? Math.round((new Date(form.scheduled_end).getTime() - new Date(form.scheduled_start).getTime()) / 60000)
    : null;
  const isDurationOver = plannedMins !== null && netMins !== null && netMins > plannedMins;
  const isDurationShort = plannedMins !== null && netMins !== null && netMins < plannedMins;

  const showSuspendArea = form.status === 'suspended' || form.status === 'completed';

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-5 space-y-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">実績</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">開始実績日時</label>
          <input
            type="datetime-local"
            value={form.actual_start}
            onChange={e => set('actual_start', e.target.value)}
            className="form-input"
          />
        </div>

        {isStartLate && (
          <div>
            <label className="form-label">遅延要因</label>
            <select value={form.start_delay_factor} onChange={e => set('start_delay_factor', e.target.value)} className="form-input">
              <option value="">選択してください</option>
              {START_DELAY_FACTORS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        )}
        {isStartEarly && (
          <div>
            <label className="form-label">前倒し要因</label>
            <select value={form.start_early_factor} onChange={e => set('start_early_factor', e.target.value)} className="form-input">
              <option value="">選択してください</option>
              {START_EARLY_FACTORS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        )}

        {showSuspendArea && (
          <>
            {entries.map((entry, i) => (
              <SuspendEntryRow
                key={entry.localId}
                entry={entry}
                index={i}
                total={entries.length}
                taskId={task?.id ?? ''}
                actualStart={form.actual_start}
                onChange={handleEntryChange}
                onDelete={handleEntryDelete}
              />
            ))}

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleAddEntry}
                className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium px-3 py-2 rounded-lg border border-dashed border-amber-300 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors w-full justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
                中断時間を追加
              </button>
            </div>
          </>
        )}

        {form.status === 'completed' && (
          <>
            {childrenActualTimeMins == null && (
            <div>
              <label className="form-label">終了実績日時</label>
              <input
                type="datetime-local"
                value={form.actual_end}
                onChange={e => set('actual_end', e.target.value)}
                className="form-input"
              />
            </div>
            )}

            {childrenActualTimeMins != null ? (
              <div className="sm:col-span-2">
                <label className="form-label">所要時間（子タスク合計）</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {childrenActualTimeMins >= 60
                      ? `${Math.floor(childrenActualTimeMins / 60)}時間${childrenActualTimeMins % 60 > 0 ? `${childrenActualTimeMins % 60}分` : ''}`
                      : `${childrenActualTimeMins}分`}
                  </span>
                  <span className="text-xs text-blue-500 dark:text-blue-400">（子タスクの実績時間の合計・編集不可）</span>
                </div>
              </div>
            ) : netMins !== null ? (
              <div>
                <label className="form-label">所要時間</label>
                <p className="text-sm text-gray-700 dark:text-gray-300 px-1 py-2">
                  <span className="font-semibold">{netMins}分</span>
                  {totalSuspendMins > 0 && (
                    <span className="ml-2 text-[11px] text-amber-600 dark:text-amber-400">
                      （総{grossMins}分 − 中断{totalSuspendMins}分）
                    </span>
                  )}
                </p>
              </div>
            ) : null}

            {isDurationOver && (
              <div>
                <label className="form-label">見積超過要因</label>
                <select value={form.duration_over_factor} onChange={e => set('duration_over_factor', e.target.value)} className="form-input">
                  <option value="">選択してください</option>
                  {DURATION_OVER_FACTORS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            )}
            {isDurationShort && (
              <div>
                <label className="form-label">見積短縮要因</label>
                <select value={form.duration_short_factor} onChange={e => set('duration_short_factor', e.target.value)} className="form-input">
                  <option value="">選択してください</option>
                  {DURATION_SHORT_FACTORS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="form-label">実績メモ</label>
              <textarea value={form.actual_memo} onChange={e => set('actual_memo', e.target.value)} rows={2} className="form-input resize-none" placeholder="実績メモ" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TaskForm({ task, onClose, initialDatetime }: TaskFormProps) {
  const { categories: rawCategories, tasks, createTask, updateTask } = useTasks();
  const categories = useMemo(() => sortCategoriesByColor(rawCategories), [rawCategories]);

  // 子タスクを持つ親タスクの場合、子タスクの actual_time 合計を算出
  const childrenActualTimeMins = useMemo(() => {
    if (!task) return null;
    const children = tasks.filter(t => t.parent_task_id === task.id);
    if (children.length === 0) return null;
    const total = children.reduce((sum, t) => sum + (t.actual_time ?? 0), 0);
    return total;
  }, [task, tasks]);

  // ActualsSection の entries を handleSubmit から参照するための ref
  const entriesRef = useRef<SuspendEntry[]>([]);
  const [form, setForm] = useState(() => {
    if (!task && initialDatetime) {
      return { ...defaultForm, scheduled_start: initialDatetime };
    }
    return { ...defaultForm };
  });
  const [loading, setLoading] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [titleHistory] = useState<string[]>(loadTitleHistory);
  const [titleSuggestOpen, setTitleSuggestOpen] = useState(false);
  const [titleSuggestQuery, setTitleSuggestQuery] = useState('');
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (titleRef.current && !titleRef.current.contains(e.target as Node)) {
        setTitleSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (task) {
      const scheduledStart = toLocalDatetimeValue(task.scheduled_start);
      const scheduledEnd = toLocalDatetimeValue(task.scheduled_end);
      setForm({
        title: task.title,
        category_id: task.category_id ?? '',
        priority: task.priority ?? 'medium',
        difficulty: task.difficulty,
        quantity: task.quantity,
        time_per_unit: task.time_per_unit,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        parent_task_id: task.parent_task_id ?? '',
        notes: task.notes,
        status: task.status,
        track_actual: true,
        actual_time: task.actual_time,
        actual_memo: task.actual_memo,
        actual_start: toLocalDatetimeValue(task.actual_start ?? null) || (task.status === 'not_started' ? scheduledStart : ''),
        actual_end: toLocalDatetimeValue(task.actual_end ?? null) || (task.status === 'not_started' ? scheduledEnd : ''),
        start_delay_factor: task.start_delay_factor ?? '',
        start_early_factor: task.start_early_factor ?? '',
        duration_over_factor: task.duration_over_factor ?? '',
        duration_short_factor: task.duration_short_factor ?? '',
      });
    }
  }, [task]);

  const set = <K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) =>
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // ステータスを完了に変更したとき、実績時間が未入力なら予定時間を自動コピー
      if (key === 'status' && value === 'completed') {
        if (!next.actual_start && next.scheduled_start) next.actual_start = next.scheduled_start;
        if (!next.actual_end && next.scheduled_end) next.actual_end = next.scheduled_end;
      }
      return next;
    });

  // 開始・終了が揃っていて所要時間未入力のとき、差分を time_per_unit に自動セット
  const autofillDuration = (startVal: string, endVal: string, qty: number, tpu: number) => {
    if (qty > 0 && tpu > 0) return null; // 既に入力済み
    if (!startVal || !endVal) return null;
    const s = new Date(startVal);
    const e = new Date(endVal);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    const diffMins = Math.round((e.getTime() - s.getTime()) / 60000);
    if (diffMins <= 0) return null;
    return { quantity: 1, time_per_unit: diffMins };
  };

  // 開始日時が変わったとき quantity/time_per_unit があれば終了を即時自動計算
  const recalcEnd = (startVal: string, qty: number, tpu: number) => {
    if (!startVal || qty <= 0 || tpu <= 0) return null;
    const start = new Date(startVal);
    if (isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + qty * tpu * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
  };

  const handleCategoryChange = (val: string) => {
    if (val === '__new__') {
      setShowCategoryDialog(true);
    } else {
      set('category_id', val);
    }
  };

  const handleCategoryCreated = (newId: string) => {
    setShowCategoryDialog(false);
    set('category_id', newId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);

    const payload: Partial<Task> = {
      title: form.title.trim(),
      category_id: form.category_id || null,
      priority: form.priority,
      difficulty: Number(form.difficulty),
      quantity: Number(form.quantity),
      time_per_unit: Number(form.time_per_unit),
      scheduled_start: localToISO(form.scheduled_start),
      scheduled_end: localToISO(form.scheduled_end),
      parent_task_id: form.parent_task_id || null,
      notes: form.notes,
      status: form.status,
      track_actual: true,
      actual_time: childrenActualTimeMins != null ? childrenActualTimeMins : Number(form.actual_time),
      actual_memo: form.actual_memo,
      actual_start: form.actual_start ? new Date(form.actual_start).toISOString() : null,
      actual_end: form.actual_end ? new Date(form.actual_end).toISOString() : null,
      start_delay_factor: form.start_delay_factor || null,
      start_early_factor: form.start_early_factor || null,
      duration_over_factor: form.duration_over_factor || null,
      duration_short_factor: form.duration_short_factor || null,
    };

    if (form.status === 'completed' && !task?.completed_at) {
      payload.completed_at = new Date().toISOString();
    } else if (form.status !== 'completed') {
      payload.completed_at = null;
    }

    // status=suspended のとき、entries の最後の中断時刻を suspended_at として保存する
    if (form.status === 'suspended') {
      const suspendEntries = entriesRef.current;
      const lastSuspendVal = [...suspendEntries].reverse().find(e => e.suspendVal)?.suspendVal ?? null;
      payload.suspended_at = lastSuspendVal ? new Date(lastSuspendVal).toISOString() : null;
    } else {
      // 中断解除時は suspended_at をクリア
      if (form.status !== 'suspended') payload.suspended_at = null;
    }

    if (form.title.trim()) saveTitleHistory(form.title.trim());

    if (task) {
      await updateTask(task.id, payload);
    } else {
      await createTask(payload);
    }

    setLoading(false);
    onClose();
  };

  const parentOptions = tasks.filter(t =>
    t.id !== task?.id &&
    t.parent_task_id !== task?.id &&
    t.recurrence_group_id === null
  );

  const [parentSearch, setParentSearch] = useState('');
  const [parentOpen, setParentOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (parentRef.current && !parentRef.current.contains(e.target as Node)) {
        setParentOpen(false);
        setParentSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredParentOptions = parentOptions.filter(t =>
    t.title.toLowerCase().includes(parentSearch.toLowerCase())
  );
  const selectedParentTask = parentOptions.find(t => t.id === form.parent_task_id);
  const showActuals = form.status === 'in_progress' || form.status === 'suspended' || form.status === 'completed';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {task ? 'タスクを編集' : '新規タスク'}
            </h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* タスク名 */}
            <div ref={titleRef}>
              <label className="form-label">タスク名 <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={form.title}
                  onChange={e => {
                    set('title', e.target.value);
                    setTitleSuggestQuery(e.target.value);
                    setTitleSuggestOpen(true);
                  }}
                  onFocus={() => { setTitleSuggestQuery(form.title); setTitleSuggestOpen(true); }}
                  className="form-input pr-8"
                  placeholder="タスク名を入力"
                  required
                />
                {titleHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setTitleSuggestQuery(''); setTitleSuggestOpen(o => !o); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title="入力履歴"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                )}
                {titleSuggestOpen && titleHistory.length > 0 && (() => {
                  const filtered = titleSuggestQuery
                    ? titleHistory.filter(h => h.toLowerCase().includes(titleSuggestQuery.toLowerCase()))
                    : titleHistory;
                  if (filtered.length === 0) return null;
                  return (
                    <ul className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-52 overflow-y-auto py-1">
                      {filtered.map((h, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onMouseDown={e => {
                              e.preventDefault();
                              set('title', h);
                              setTitleSuggestOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors truncate flex items-center gap-2"
                          >
                            <History className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            {h}
                          </button>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>

            {/* 分類 / ステータス / 親タスク — 3列 */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="form-label">分類</label>
                <select value={form.category_id} onChange={e => handleCategoryChange(e.target.value)} className="form-input">
                  <option value="">分類なし</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="__new__">＋ 新しい分類を追加する</option>
                </select>
              </div>

              <div>
                <label className="form-label">ステータス</label>
                <select value={form.status} onChange={e => set('status', e.target.value as TaskStatus)} className="form-input">
                  <option value="not_started">未着手</option>
                  <option value="in_progress">進行中</option>
                  <option value="suspended">中断</option>
                  <option value="completed">完了</option>
                </select>
              </div>

              <div ref={parentRef} className="relative">
                <label className="form-label">親タスク</label>
                <button
                  type="button"
                  onClick={() => { setParentOpen(o => !o); setParentSearch(''); }}
                  className="form-input w-full flex items-center justify-between gap-2 text-left"
                >
                  <span className={`truncate text-sm ${selectedParentTask ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                    {selectedParentTask ? selectedParentTask.title : 'なし'}
                  </span>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${parentOpen ? 'rotate-180' : ''}`} />
                </button>
                {parentOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <input
                          type="text"
                          autoFocus
                          value={parentSearch}
                          onChange={e => setParentSearch(e.target.value)}
                          placeholder="タスク名で検索..."
                          className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
                        />
                        {parentSearch && (
                          <button type="button" onClick={() => setParentSearch('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <ul className="max-h-52 overflow-y-auto overflow-x-auto py-1">
                      <li>
                        <button
                          type="button"
                          onClick={() => { set('parent_task_id', ''); setParentOpen(false); setParentSearch(''); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!form.parent_task_id ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                          なし
                        </button>
                      </li>
                      {filteredParentOptions.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">該当するタスクがありません</li>
                      ) : (
                        filteredParentOptions.map(t => (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => { set('parent_task_id', t.id); setParentOpen(false); setParentSearch(''); }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap ${form.parent_task_id === t.id ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/20' : 'text-gray-900 dark:text-white'}`}
                            >
                              {t.title}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* 優先度 / 数量 / 所要時間 — 3列 */}
            <div className="grid gap-3 grid-cols-3">
              <div>
                <label className="form-label">優先度</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value as TaskPriority)} className="form-input">
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>

              <div>
                <label className="form-label">数量</label>
                <input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={e => {
                    const qty = Number(e.target.value);
                    setForm(prev => {
                      // 開始・終了が両方入力済みの場合は終了時間を変更しない
                      if (prev.scheduled_start && prev.scheduled_end) {
                        return { ...prev, quantity: qty };
                      }
                      const endVal = recalcEnd(prev.scheduled_start, qty, prev.time_per_unit);
                      return { ...prev, quantity: qty, ...(endVal ? { scheduled_end: endVal } : {}) };
                    });
                  }}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">所要時間（分）</label>
                <input
                  type="number"
                  min={0}
                  value={form.time_per_unit}
                  onChange={e => {
                    const tpu = Number(e.target.value);
                    setForm(prev => {
                      // 開始・終了が両方入力済みの場合は終了時間を変更しない
                      if (prev.scheduled_start && prev.scheduled_end) {
                        return { ...prev, time_per_unit: tpu };
                      }
                      const endVal = recalcEnd(prev.scheduled_start, prev.quantity, tpu);
                      return { ...prev, time_per_unit: tpu, ...(endVal ? { scheduled_end: endVal } : {}) };
                    });
                  }}
                  className="form-input"
                />
              </div>
            </div>

            {/* 予定日時 */}
            <div>
              <span className="form-label mb-2 block">予定日時</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-1">開始</span>
                  <input
                    type="datetime-local"
                    value={form.scheduled_start}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => {
                        const endVal = recalcEnd(val, prev.quantity, prev.time_per_unit);
                        const durFill = autofillDuration(val, prev.scheduled_end, prev.quantity, prev.time_per_unit);
                        return { ...prev, scheduled_start: val, ...(endVal ? { scheduled_end: endVal } : {}), ...(durFill ?? {}) };
                      });
                    }}
                    className="form-input"
                  />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-1">
                    終了
                    {Number(form.quantity) > 0 && Number(form.time_per_unit) > 0 && (
                      <span className="ml-1.5 text-[11px] text-blue-500 font-normal">（自動入力）</span>
                    )}
                  </span>
                  <input
                    type="datetime-local"
                    value={form.scheduled_end}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => {
                        const durFill = autofillDuration(prev.scheduled_start, val, prev.quantity, prev.time_per_unit);
                        return { ...prev, scheduled_end: val, ...(durFill ?? {}) };
                      });
                    }}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* 予定メモ */}
            <div>
              <label className="form-label">予定メモ</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="form-input resize-none" placeholder="予定メモを入力" />
            </div>

            {/* 実績エリア：進行中以上で表示 */}
            {showActuals && <ActualsSection task={task} form={form} set={set} childrenActualTimeMins={childrenActualTimeMins} onEntriesChange={e => { entriesRef.current = e; }} />}

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={onClose} className="btn-secondary">キャンセル</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? '保存中...' : task ? '更新する' : '作成する'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showCategoryDialog && (
        <CategoryDialog
          onClose={() => setShowCategoryDialog(false)}
          onCreate={handleCategoryCreated}
        />
      )}
    </>
  );
}
