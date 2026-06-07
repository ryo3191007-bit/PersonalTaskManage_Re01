import { useState, useMemo } from 'react';
import { Plus, Download, X, Check, PauseCircle, PlayCircle, FileText, Copy, CheckCheck } from 'lucide-react';
import { useTasks } from '../contexts/TaskContext';
import type { Task, TaskStatus, TaskPriority } from '../lib/types';
import RecurrenceForm from '../components/tasks/RecurrenceForm';
import {
  PRIORITY_ORDER,
  START_DELAY_FACTORS, START_EARLY_FACTORS,
  DURATION_OVER_FACTORS, DURATION_SHORT_FACTORS,
} from '../lib/types';
import TaskCard from '../components/tasks/TaskCard';
import TaskForm from '../components/tasks/TaskForm';
import TaskFilters from '../components/tasks/TaskFilters';
import { buildTree, exportToCSV, exportTodayTasksAsText, getWorkloadMinsForDay, DEFAULT_TEXT_EXPORT_FIELDS } from '../lib/utils';
import type { TextExportFields } from '../lib/utils';
import { useWorkHours } from '../lib/useWorkHours';

/** ISO文字列またはnullを datetime-local 文字列に変換 */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowDatetime() {
  return toLocalInput(new Date().toISOString());
}

// ─── 開始実績ダイアログ（未着手→進行中） ─────────────────────────────────
function StartDialog({ task, onClose, onSave }: {
  task: Task;
  onClose: () => void;
  onSave: (actualStart: string, factor: string) => void;
}) {
  const [value, setValue] = useState(() => nowDatetime());
  const [factor, setFactor] = useState('');

  const scheduledStart = task.scheduled_start ? new Date(task.scheduled_start) : null;
  const actualStart = value ? new Date(value) : null;
  const isLate = scheduledStart && actualStart && actualStart > scheduledStart;
  const isEarly = scheduledStart && actualStart && actualStart < scheduledStart;

  const factorOptions = isLate ? START_DELAY_FACTORS : isEarly ? START_EARLY_FACTORS : null;
  const factorLabel = isLate ? '遅延要因' : isEarly ? '前倒し要因' : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">開始実績時間を入力</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.title}</p>
        <div>
          <label className="form-label">開始実績日時</label>
          <input type="datetime-local" value={value} onChange={e => { setValue(e.target.value); setFactor(''); }} className="form-input" />
        </div>
        {factorOptions && (
          <div>
            <label className="form-label">{factorLabel}</label>
            <select value={factor} onChange={e => setFactor(e.target.value)} className="form-input">
              <option value="">選択してください</option>
              {factorOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button onClick={() => value && onSave(new Date(value).toISOString(), factor)} disabled={!value} className="btn-primary flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />OK
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 終了実績ダイアログ（進行中→完了） ───────────────────────────────────
function EndDialog({ task, onClose, onSave }: {
  task: Task;
  onClose: () => void;
  onSave: (actualEnd: string, memo: string, durationFactor: string) => void;
}) {
  const [value, setValue] = useState(() => nowDatetime());
  const [memo, setMemo] = useState(task.actual_memo ?? '');
  const [durationFactor, setDurationFactor] = useState('');

  // 実績所要時間（分）vs 予定所要時間（分）
  const plannedMins = task.scheduled_start && task.scheduled_end
    ? Math.round((new Date(task.scheduled_end).getTime() - new Date(task.scheduled_start).getTime()) / 60000)
    : null;
  const actualMins = task.actual_start && value
    ? Math.round((new Date(value).getTime() - new Date(task.actual_start).getTime()) / 60000)
    : null;

  const isOver = plannedMins !== null && actualMins !== null && actualMins > plannedMins;
  const isShort = plannedMins !== null && actualMins !== null && actualMins < plannedMins;

  const factorOptions = isOver ? DURATION_OVER_FACTORS : isShort ? DURATION_SHORT_FACTORS : null;
  const factorLabel = isOver ? '見積超過要因' : isShort ? '見積短縮要因' : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">終了実績時間を入力</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.title}</p>
        <div>
          <label className="form-label">終了実績日時</label>
          <input type="datetime-local" value={value} onChange={e => { setValue(e.target.value); setDurationFactor(''); }} className="form-input" />
        </div>
        {factorOptions && (
          <div>
            <label className="form-label">{factorLabel}</label>
            <select value={durationFactor} onChange={e => setDurationFactor(e.target.value)} className="form-input">
              <option value="">選択してください</option>
              {factorOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="form-label">備考</label>
          <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3} className="form-input resize-none" placeholder="実績メモを入力" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button onClick={() => value && onSave(new Date(value).toISOString(), memo, durationFactor)} disabled={!value} className="btn-primary flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />OK
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 未着手→完了 実績入力ダイアログ ─────────────────────────────────────
function FullActualDialog({ task, onClose, onSave }: {
  task: Task;
  onClose: () => void;
  onSave: (actualStart: string, actualEnd: string, memo: string, startFactor: string, durationFactor: string) => void;
}) {
  const [startVal, setStartVal] = useState(() => toLocalInput(task.scheduled_start) || nowDatetime());
  const [endVal, setEndVal] = useState(() => toLocalInput(task.scheduled_end) || nowDatetime());
  const [memo, setMemo] = useState('');
  const [startFactor, setStartFactor] = useState('');
  const [durationFactor, setDurationFactor] = useState('');

  const scheduledStart = task.scheduled_start ? new Date(task.scheduled_start) : null;
  const actualStart = startVal ? new Date(startVal) : null;
  const isStartLate = scheduledStart && actualStart && actualStart > scheduledStart;
  const isStartEarly = scheduledStart && actualStart && actualStart < scheduledStart;

  const plannedMins = task.scheduled_start && task.scheduled_end
    ? Math.round((new Date(task.scheduled_end).getTime() - new Date(task.scheduled_start).getTime()) / 60000)
    : null;
  const actualMins = startVal && endVal
    ? Math.round((new Date(endVal).getTime() - new Date(startVal).getTime()) / 60000)
    : null;
  const isDurationOver = plannedMins !== null && actualMins !== null && actualMins > plannedMins;
  const isDurationShort = plannedMins !== null && actualMins !== null && actualMins < plannedMins;

  const startFactorOptions = isStartLate ? START_DELAY_FACTORS : isStartEarly ? START_EARLY_FACTORS : null;
  const startFactorLabel = isStartLate ? '遅延要因' : isStartEarly ? '前倒し要因' : null;
  const durationFactorOptions = isDurationOver ? DURATION_OVER_FACTORS : isDurationShort ? DURATION_SHORT_FACTORS : null;
  const durationFactorLabel = isDurationOver ? '見積超過要因' : isDurationShort ? '見積短縮要因' : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">実績時間を入力</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.title}</p>
        <div>
          <label className="form-label">開始実績日時</label>
          <input type="datetime-local" value={startVal} onChange={e => { setStartVal(e.target.value); setStartFactor(''); }} className="form-input" />
        </div>
        {startFactorOptions && (
          <div>
            <label className="form-label">{startFactorLabel}</label>
            <select value={startFactor} onChange={e => setStartFactor(e.target.value)} className="form-input">
              <option value="">選択してください</option>
              {startFactorOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="form-label">終了実績日時</label>
          <input type="datetime-local" value={endVal} onChange={e => { setEndVal(e.target.value); setDurationFactor(''); }} className="form-input" />
        </div>
        {durationFactorOptions && (
          <div>
            <label className="form-label">{durationFactorLabel}</label>
            <select value={durationFactor} onChange={e => setDurationFactor(e.target.value)} className="form-input">
              <option value="">選択してください</option>
              {durationFactorOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="form-label">備考</label>
          <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3} className="form-input resize-none" placeholder="実績メモを入力" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button
            onClick={() => startVal && endVal && onSave(new Date(startVal).toISOString(), new Date(endVal).toISOString(), memo, startFactor, durationFactor)}
            disabled={!startVal || !endVal}
            className="btn-primary flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />OK
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 中断ダイアログ（進行中→中断） ───────────────────────────────────────
function SuspendDialog({ task, onClose, onSave }: {
  task: Task;
  onClose: () => void;
  onSave: (suspendedAt: string) => void;
}) {
  const [value, setValue] = useState(nowDatetime());

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PauseCircle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">タスクを中断</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.title}</p>
        <div>
          <label className="form-label">中断日時</label>
          <input type="datetime-local" value={value} onChange={e => setValue(e.target.value)} className="form-input" />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">中断中の時間は所要時間に含まれません。</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button
            onClick={() => value && onSave(new Date(value).toISOString())}
            disabled={!value}
            className="btn-primary flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700"
          >
            <PauseCircle className="w-3.5 h-3.5" />中断
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 再開ダイアログ（中断→進行中） ───────────────────────────────────────
function ResumeDialog({ task, onClose, onSave }: {
  task: Task;
  onClose: () => void;
  onSave: (resumedAt: string) => void;
}) {
  const [value, setValue] = useState(nowDatetime());

  const suspendedAt = task.suspended_at ? new Date(task.suspended_at) : null;
  const resumeAt = value ? new Date(value) : null;
  const suspendMins = suspendedAt && resumeAt
    ? Math.round((resumeAt.getTime() - suspendedAt.getTime()) / 60000)
    : null;
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}分`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">タスクを再開</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.title}</p>
        {suspendedAt && (
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            中断日時: {suspendedAt.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        <div>
          <label className="form-label">再開日時</label>
          <input type="datetime-local" value={value} onChange={e => setValue(e.target.value)} className="form-input" />
        </div>
        {suspendMins !== null && suspendMins > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            中断時間: <span className="font-medium text-amber-600 dark:text-amber-400">{formatDuration(suspendMins)}</span>（所要時間から除外されます）
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button
            onClick={() => value && onSave(new Date(value).toISOString())}
            disabled={!value}
            className="btn-primary flex items-center gap-1.5"
          >
            <PlayCircle className="w-3.5 h-3.5" />再開
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── テキスト出力項目選択ダイアログ ──────────────────────────────────────
const FIELD_DEFS: { key: keyof TextExportFields; label: string }[] = [
  { key: 'taskName', label: 'タスク名' },
  { key: 'status', label: 'ステータス' },
  { key: 'timeRange', label: '開始〜終了時間' },
  { key: 'duration', label: '所要時間' },
  { key: 'startFactor', label: '前倒し/遅延要因' },
  { key: 'durationFactor', label: '見積差異要因' },
  { key: 'remarks', label: '予定メモ' },
  { key: 'actualMemo', label: '実績メモ' },
];

function TextExportConfigDialog({ onClose, onExport }: {
  onClose: () => void;
  onExport: (fields: TextExportFields) => void;
}) {
  const [fields, setFields] = useState<TextExportFields>({ ...DEFAULT_TEXT_EXPORT_FIELDS });

  const toggle = (key: keyof TextExportFields) =>
    setFields(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-xs bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">出力項目の選択</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {FIELD_DEFS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={fields[key]}
                  onChange={() => toggle(key)}
                  className="sr-only peer"
                />
                <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 peer-checked:border-blue-500 peer-checked:bg-blue-500 dark:peer-checked:border-blue-400 dark:peer-checked:bg-blue-400 transition-colors flex items-center justify-center">
                  {fields[key] && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </div>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors select-none">
                {label}
              </span>
            </label>
          ))}
        </div>
        <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => onExport(fields)}
            className="btn-primary w-full justify-center flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />出力
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TaskRow ────────────────────────────────────────────────────────────────
function TaskRow({ task, onEdit, depth = 0, onStatusChange, onSuspend, onResume }: {
  task: Task;
  onEdit: (t: Task) => void;
  depth?: number;
  onStatusChange: (task: Task, next: TaskStatus) => void;
  onSuspend: (task: Task) => void;
  onResume: (task: Task) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = task.children && task.children.length > 0;

  const isOverdue = task.status === 'not_started' &&
    !!task.scheduled_end &&
    new Date(task.scheduled_end) < new Date();

  const statusBg: Record<TaskStatus, string> = {
    not_started: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  };

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700' : ''}>
      <div className={`flex items-start gap-1 pr-3 ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
        <div className="flex-1 min-w-0">
          <TaskCard task={task} onEdit={onEdit} />
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 pt-3 pb-2">
          {isOverdue && (
            <span className="text-[10px] font-semibold text-red-500 dark:text-red-400 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 rounded-full leading-tight">
              期限切れ
            </span>
          )}
          <div className="flex items-center gap-1.5">
            {hasChildren && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1"
              >
                {expanded ? '▲' : '▼'}
              </button>
            )}
            {/* 中断・再開ボタン */}
            {task.status === 'in_progress' && (
              <button
                onClick={() => onSuspend(task)}
                title="中断"
                className="w-6 h-6 flex items-center justify-center rounded-full text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
              >
                <PauseCircle className="w-4 h-4" />
              </button>
            )}
            {task.status === 'suspended' && (
              <button
                onClick={() => onResume(task)}
                title="再開"
                className="w-6 h-6 flex items-center justify-center rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
              </button>
            )}
            <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">ステータス：</span>
            <select
              value={task.status}
              onChange={e => onStatusChange(task, e.target.value as TaskStatus)}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${statusBg[task.status]}`}
            >
              <option value="not_started">未着手</option>
              <option value="in_progress">進行中</option>
              <option value="suspended">中断</option>
              <option value="completed">完了</option>
            </select>
          </div>
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {task.children!.map(child => (
            <TaskRow key={child.id} task={child} onEdit={onEdit} depth={depth + 1} onStatusChange={onStatusChange} onSuspend={onSuspend} onResume={onResume} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function TaskListPage() {
  const { tasks, sessions, loading, updateTask, suspendTask, resumeTask, createSession, updateSession } = useTasks();
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { from: today, to: today };
  });
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [keywordFilter, setKeywordFilter] = useState('');

  const [showRecurrenceForm, setShowRecurrenceForm] = useState(false);
  const [startDialog, setStartDialog] = useState<Task | null>(null);
  const [endDialog, setEndDialog] = useState<Task | null>(null);
  const [fullActualDialog, setFullActualDialog] = useState<Task | null>(null);
  const [suspendDialog, setSuspendDialog] = useState<Task | null>(null);
  const [resumeDialog, setResumeDialog] = useState<Task | null>(null);
  const [showTextReport, setShowTextReport] = useState(false);
  const [showTextExportConfig, setShowTextExportConfig] = useState(false);
  const [textExportFields, setTextExportFields] = useState<TextExportFields>({ ...DEFAULT_TEXT_EXPORT_FIELDS });
  const [copied, setCopied] = useState(false);

  const filteredTasks = useMemo(() => {
    const kw = keywordFilter.trim().toLowerCase();
    return tasks.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && (t.priority ?? 'medium') !== priorityFilter) return false;
      if (categoryFilter && t.category_id !== categoryFilter) return false;
      if (kw && !t.title.toLowerCase().includes(kw) && !(t.notes ?? '').toLowerCase().includes(kw)) return false;
      if (dateFilter.from || dateFilter.to) {
        const rangeStart = dateFilter.from ? new Date(dateFilter.from + 'T00:00:00') : null;
        const rangeEnd = dateFilter.to
          ? new Date(new Date(dateFilter.to + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000)
          : null;

        const inRange = (start: Date, end: Date | null) => {
          if (rangeStart && (!end || end <= rangeStart)) return false;
          if (rangeEnd && start >= rangeEnd) return false;
          return true;
        };

        const inRangeByStartOnly = (start: Date) => {
          if (rangeStart && start < rangeStart) return false;
          if (rangeEnd && start >= rangeEnd) return false;
          return true;
        };

        // 実際に使用する開始・終了（完了・進行中・中断タスクは実績優先）
        const hasActualStart = (t.status === 'completed' || t.status === 'in_progress' || t.status === 'suspended') && !!t.actual_start;

        // 進行中・中断タスクはセッション単位でもフィルタ対象に含める
        if (t.status === 'in_progress' || t.status === 'suspended') {
          const taskSessions = sessions.filter(s => s.task_id === t.id);
          if (taskSessions.length > 0) {
            const hitsSession = taskSessions.some(s => {
              const sStart = new Date(s.session_start);
              const sEnd = s.session_end ? new Date(s.session_end) : null;
              return inRange(sStart, sEnd);
            });
            if (hitsSession) return true;
          }
        }

        // completed タスクはセッション単位でもフィルタ対象に含める
        if (t.status === 'completed') {
          const taskSessions = sessions.filter(s => s.task_id === t.id);
          if (taskSessions.length > 0) {
            const hitsSession = taskSessions.some(s => {
              const sStart = new Date(s.session_start);
              const sEnd = s.session_end ? new Date(s.session_end) : (t.actual_end ? new Date(t.actual_end) : null);
              return inRange(sStart, sEnd);
            });
            if (hitsSession) return true;
          }
        }

        const effStart = hasActualStart
          ? new Date(t.actual_start!)
          : t.scheduled_start ? new Date(t.scheduled_start) : null;
        const effEnd = hasActualStart
          ? (t.status === 'completed'
              ? (t.actual_end ? new Date(t.actual_end)
                : t.actual_time > 0 ? new Date(new Date(t.actual_start!).getTime() + t.actual_time * 60000)
                : t.scheduled_end ? new Date(t.scheduled_end) : null)
              : t.status === 'suspended' && t.suspended_at
                ? new Date(t.suspended_at)
                : t.scheduled_end ? new Date(t.scheduled_end) : null)
          : (t.status === 'completed' && t.actual_end)
            ? new Date(t.actual_end)
            : t.scheduled_end ? new Date(t.scheduled_end) : null;

        if (!effStart) return false;
        if (!inRange(effStart, effEnd)) {
          if (!effEnd && !inRangeByStartOnly(effStart)) return false;
          if (effEnd) return false;
        }
      }
      return true;
    });
  }, [tasks, sessions, statusFilter, priorityFilter, categoryFilter, dateFilter, keywordFilter]);

  const sortedFilteredTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // 中断中タスクを上位に
      if (a.status === 'suspended' && b.status !== 'suspended') return -1;
      if (a.status !== 'suspended' && b.status === 'suspended') return 1;
      // 1. 優先度：高→中→低
      const pa = PRIORITY_ORDER[a.priority ?? 'medium'];
      const pb = PRIORITY_ORDER[b.priority ?? 'medium'];
      if (pa !== pb) return pa - pb;
      // 2. 終了予定日：早い順（nullは末尾）
      const ea = a.scheduled_end ?? '';
      const eb = b.scheduled_end ?? '';
      if (ea && !eb) return -1;
      if (!ea && eb) return 1;
      if (ea && eb) return ea.localeCompare(eb);
      return 0;
    });
  }, [filteredTasks]);

  // 定常タスク（recurrence_group_id あり）を同一グループでまとめ、代表1件のみ表示
  // ただし日付フィルタやキーワードが掛かっている場合は通常通り全件表示
  const collapsedTasks = useMemo(() => {
    const hasActiveFilter = !!(dateFilter.from || dateFilter.to) || !!keywordFilter.trim();
    if (hasActiveFilter) return sortedFilteredTasks;

    const seen = new Set<string>();
    return sortedFilteredTasks.filter(t => {
      if (!t.recurrence_group_id) return true;
      if (seen.has(t.recurrence_group_id)) return false;
      seen.add(t.recurrence_group_id);
      return true;
    });
  }, [sortedFilteredTasks, dateFilter, keywordFilter]);

  const treeData = useMemo(() => buildTree(collapsedTasks), [collapsedTasks]);

  const [editingWorkHours, setEditingWorkHours] = useState(false);
  const [workHoursInput, setWorkHoursInput] = useState('');
  const { workHours: WORK_HOURS, setWorkHours } = useWorkHours();

  // 当日（today）固定の使用工数：フィルタ条件によらず常に今日の全タスクから計算
  const todayDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayLabel = `${todayDate.getMonth() + 1}/${todayDate.getDate()}`;
  const todayUsedHours = useMemo(() => {
    const parentTasks = tasks.filter(t => t.parent_task_id === null);
    const totalMins = parentTasks.reduce((sum, t) => sum + getWorkloadMinsForDay(t, todayDate, sessions), 0);
    return Math.round(totalMins / 60 * 10) / 10;
  }, [tasks, todayDate, sessions]);
  const todayRemainHours = Math.round((WORK_HOURS - todayUsedHours) * 10) / 10;
  const todayUsedPct = Math.min(100, Math.round((todayUsedHours / WORK_HOURS) * 100));

  /** 子タスクが全て完了しているか確認し、完了なら親も自動完了 */
  const maybeAutoCompleteParent = async (completedTask: Task) => {
    if (!completedTask.parent_task_id) return;
    const siblings = tasks.filter(t => t.parent_task_id === completedTask.parent_task_id);
    const allDone = siblings.every(t =>
      t.id === completedTask.id ? true : t.status === 'completed'
    );
    if (!allDone) return;

    const parent = tasks.find(t => t.id === completedTask.parent_task_id);
    if (!parent || parent.status === 'completed') return;

    const starts = siblings
      .map(t => t.id === completedTask.id ? completedTask.actual_start : t.actual_start)
      .filter((s): s is string => !!s)
      .map(s => new Date(s).getTime());
    const ends = siblings
      .map(t => t.id === completedTask.id ? completedTask.actual_end : t.actual_end)
      .filter((e): e is string => !!e)
      .map(e => new Date(e).getTime());

    const actualStart = starts.length > 0 ? new Date(Math.min(...starts)).toISOString() : null;
    const actualEnd = ends.length > 0 ? new Date(Math.max(...ends)).toISOString() : null;
    const actualTime = actualStart && actualEnd
      ? Math.round((new Date(actualEnd).getTime() - new Date(actualStart).getTime()) / 60000)
      : 0;

    await updateTask(parent.id, {
      status: 'completed',
      actual_start: actualStart,
      actual_end: actualEnd,
      actual_time: actualTime > 0 ? actualTime : 0,
      actual_memo: '',
      completed_at: actualEnd ?? new Date().toISOString(),
    });
  };

  const handleStatusChange = (task: Task, next: TaskStatus) => {
    const prev = task.status;
    if (prev === next) return;

    if (prev === 'not_started' && next === 'in_progress') {
      setStartDialog(task);
      return;
    }
    if ((prev === 'in_progress' || prev === 'suspended') && next === 'completed') {
      setEndDialog(task);
      return;
    }
    if (prev === 'not_started' && next === 'completed') {
      setFullActualDialog(task);
      return;
    }
    if ((prev === 'in_progress' || prev === 'not_started') && next === 'suspended') {
      setSuspendDialog(task);
      return;
    }
    if (prev === 'suspended' && next === 'in_progress') {
      setResumeDialog(task);
      return;
    }

    const update: Partial<Task> = { status: next };
    if (next === 'completed') update.completed_at = new Date().toISOString();
    else if (next !== 'completed') update.completed_at = null;
    if (next === 'suspended') update.suspended_at = new Date().toISOString();
    else update.suspended_at = null;
    updateTask(task.id, update);
  };

  const handleStartSave = async (task: Task, actualStart: string, factor: string) => {
    const scheduledStart = task.scheduled_start ? new Date(task.scheduled_start) : null;
    const actual = new Date(actualStart);
    const isLate = scheduledStart && actual > scheduledStart;
    const isEarly = scheduledStart && actual < scheduledStart;
    await updateTask(task.id, {
      status: 'in_progress',
      actual_start: actualStart,
      start_delay_factor: isLate ? factor || null : null,
      start_early_factor: isEarly ? factor || null : null,
    });
    // セッション開始を記録（中断時に session_end を更新するために必要）
    await createSession(task.id, new Date(actualStart).toISOString(), null);
    setStartDialog(null);
  };

  const handleEndSave = async (task: Task, actualEnd: string, memo: string, durationFactor: string) => {
    // セッション履歴から正確な作業時間を計算する
    // 完了時点でのオープンセッション（session_end=null）を actualEnd で閉じた状態で合計する
    const taskSessions = sessions.filter(s => s.task_id === task.id);
    let actualTime: number;

    if (taskSessions.length > 0) {
      // セッションの合計作業時間（オープンセッションは actualEnd で閉じる）
      actualTime = taskSessions.reduce((sum, s) => {
        const start = new Date(s.session_start).getTime();
        const end = s.session_end ? new Date(s.session_end).getTime() : new Date(actualEnd).getTime();
        return sum + Math.max(0, Math.round((end - start) / 60000));
      }, 0);
    } else if (task.status === 'suspended') {
      // セッションなし・中断済み→完了: actual_time 累積 + 今セッション分
      const sessionMins = task.actual_start
        ? Math.max(0, Math.round((new Date(actualEnd).getTime() - new Date(task.actual_start).getTime()) / 60000))
        : 0;
      actualTime = (task.actual_time ?? 0) + sessionMins;
    } else {
      // セッションなし・通常完了
      actualTime = task.actual_start
        ? Math.round((new Date(actualEnd).getTime() - new Date(task.actual_start).getTime()) / 60000)
        : task.actual_time;
    }

    const plannedMins = task.scheduled_start && task.scheduled_end
      ? Math.round((new Date(task.scheduled_end).getTime() - new Date(task.scheduled_start).getTime()) / 60000)
      : null;
    const isOver = plannedMins !== null && actualTime > plannedMins;
    const isShort = plannedMins !== null && actualTime < plannedMins;
    const updated: Partial<Task> = {
      status: 'completed',
      actual_end: actualEnd,
      actual_memo: memo,
      actual_time: actualTime > 0 ? actualTime : task.actual_time,
      completed_at: actualEnd,
      suspended_at: null,
      duration_over_factor: isOver ? durationFactor || null : null,
      duration_short_factor: isShort ? durationFactor || null : null,
    };
    await updateTask(task.id, updated);
    // オープンセッション（session_end=null）を actualEnd で閉じる
    const openSession = sessions.find(s => s.task_id === task.id && s.session_end === null);
    if (openSession) {
      await updateSession(openSession.id, { session_end: actualEnd });
    }
    await maybeAutoCompleteParent({ ...task, ...updated, actual_start: task.actual_start });
    setEndDialog(null);
  };

  const handleFullActualSave = async (task: Task, actualStart: string, actualEnd: string, memo: string, startFactor: string, durationFactor: string) => {
    const actualTime = Math.round((new Date(actualEnd).getTime() - new Date(actualStart).getTime()) / 60000);
    const scheduledStart = task.scheduled_start ? new Date(task.scheduled_start) : null;
    const actual = new Date(actualStart);
    const isStartLate = scheduledStart && actual > scheduledStart;
    const isStartEarly = scheduledStart && actual < scheduledStart;
    const plannedMins = task.scheduled_start && task.scheduled_end
      ? Math.round((new Date(task.scheduled_end).getTime() - new Date(task.scheduled_start).getTime()) / 60000)
      : null;
    const isOver = plannedMins !== null && actualTime > plannedMins;
    const isShort = plannedMins !== null && actualTime < plannedMins;
    const updated: Partial<Task> = {
      status: 'completed',
      actual_start: actualStart,
      actual_end: actualEnd,
      actual_memo: memo,
      actual_time: actualTime > 0 ? actualTime : 0,
      completed_at: actualEnd,
      start_delay_factor: isStartLate ? startFactor || null : null,
      start_early_factor: isStartEarly ? startFactor || null : null,
      duration_over_factor: isOver ? durationFactor || null : null,
      duration_short_factor: isShort ? durationFactor || null : null,
    };
    await updateTask(task.id, updated);
    await maybeAutoCompleteParent({ ...task, ...updated });
    setFullActualDialog(null);
  };

  const handleSuspendSave = async (task: Task, suspendedAt: string) => {
    await suspendTask(task, suspendedAt);
    setSuspendDialog(null);
  };

  const handleResumeSave = async (task: Task, resumedAt: string) => {
    await resumeTask(task, resumedAt);
    setResumeDialog(null);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* 当日の使用工数サマリー（フィルタ上部・常時表示） */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 mb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {todayLabel} の使用時間
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">使用</span>
              <span className={`text-sm font-bold tabular-nums ${todayUsedHours > WORK_HOURS ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>
                {todayUsedHours}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">残</span>
              <span className={`text-sm font-bold tabular-nums ${todayRemainHours < 0 ? 'text-red-500' : todayRemainHours <= 1 ? 'text-amber-500' : 'text-teal-600 dark:text-teal-400'}`}>
                {todayRemainHours}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">h</span>
            </div>
            {/* 使用可能工数（クリックで編集） */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">上限</span>
              {editingWorkHours ? (
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={workHoursInput}
                  onChange={e => setWorkHoursInput(e.target.value)}
                  onBlur={() => {
                    const v = parseFloat(workHoursInput);
                    if (isFinite(v) && v > 0) setWorkHours(v);
                    setEditingWorkHours(false);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); }
                    if (e.key === 'Escape') setEditingWorkHours(false);
                  }}
                  autoFocus
                  className="w-14 text-xs font-semibold tabular-nums text-center rounded border border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 px-1 py-0.5"
                />
              ) : (
                <button
                  onClick={() => { setWorkHoursInput(String(WORK_HOURS)); setEditingWorkHours(true); }}
                  className="text-sm font-bold tabular-nums text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hover:underline underline-offset-2"
                  title="クリックして使用可能工数を変更"
                >
                  {WORK_HOURS}
                </button>
              )}
              <span className="text-[11px] text-gray-400 dark:text-gray-500">h</span>
            </div>
            <div className="flex-1 min-w-[120px]">
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${todayUsedHours > WORK_HOURS ? 'bg-red-500' : todayUsedPct > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${todayUsedPct}%` }}
                />
              </div>
            </div>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">{todayUsedPct}%</span>
          </div>
        </div>

        {/* フィルタ＋ボタンカード */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 mb-3">
          {/* フィルタ行 */}
          <div className="px-4 py-3">
            <TaskFilters
              statusFilter={statusFilter}
              categoryFilter={categoryFilter}
              dateFrom={dateFilter.from}
              dateTo={dateFilter.to}
              priorityFilter={priorityFilter}
              keywordFilter={keywordFilter}
              onStatusChange={setStatusFilter}
              onCategoryChange={setCategoryFilter}
              onDateChange={(from, to) => setDateFilter({ from, to })}
              onPriorityChange={setPriorityFilter}
              onKeywordChange={setKeywordFilter}
            />
          </div>
          {/* 区切り線 */}
          <div className="border-t border-gray-100 dark:border-gray-800" />
          {/* ボタン行（右詰め） */}
          <div className="flex items-center justify-end gap-2 px-4 py-2.5">
            <button onClick={() => setShowTextExportConfig(true)} className="btn-secondary flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />テキスト出力
            </button>
            <button onClick={() => exportToCSV(tasks)} className="btn-secondary flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />CSV出力
            </button>
            <button
              onClick={() => setShowRecurrenceForm(true)}
              className="btn-primary flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-3.5 h-3.5" />新規定常タスク
            </button>
            <button onClick={() => setEditingTask(null)} className="btn-primary flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />新規タスク
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : treeData.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm">タスクがありません</p>
            <button onClick={() => setEditingTask(null)} className="mt-3 text-sm text-blue-600 hover:underline">
              最初のタスクを作成する
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            {treeData.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onEdit={setEditingTask}
                onStatusChange={handleStatusChange}
                onSuspend={task => setSuspendDialog(task)}
                onResume={task => setResumeDialog(task)}
              />
            ))}
          </div>
        )}
      </div>

      {editingTask !== undefined && (
        <TaskForm task={editingTask} onClose={() => setEditingTask(undefined)} />
      )}
      {showRecurrenceForm && (
        <RecurrenceForm onClose={() => setShowRecurrenceForm(false)} />
      )}
      {startDialog && (
        <StartDialog task={startDialog} onClose={() => setStartDialog(null)} onSave={(s, f) => handleStartSave(startDialog, s, f)} />
      )}
      {endDialog && (
        <EndDialog task={endDialog} onClose={() => setEndDialog(null)} onSave={(e, m, df) => handleEndSave(endDialog, e, m, df)} />
      )}
      {fullActualDialog && (
        <FullActualDialog task={fullActualDialog} onClose={() => setFullActualDialog(null)} onSave={(s, e, m, sf, df) => handleFullActualSave(fullActualDialog, s, e, m, sf, df)} />
      )}
      {suspendDialog && (
        <SuspendDialog task={suspendDialog} onClose={() => setSuspendDialog(null)} onSave={t => handleSuspendSave(suspendDialog, t)} />
      )}
      {resumeDialog && (
        <ResumeDialog task={resumeDialog} onClose={() => setResumeDialog(null)} onSave={t => handleResumeSave(resumeDialog, t)} />
      )}

      {showTextExportConfig && (
        <TextExportConfigDialog
          onClose={() => setShowTextExportConfig(false)}
          onExport={fields => {
            setTextExportFields(fields);
            setShowTextExportConfig(false);
            setShowTextReport(true);
            setCopied(false);
          }}
        />
      )}

      {showTextReport && (() => {
        const reportDate = dateFilter.from || new Date().toISOString().slice(0, 10);
        const tasksWithSessions = sortedFilteredTasks.map(t => ({
          ...t,
          sessions: sessions.filter(s => s.task_id === t.id),
        }));
        const text = exportTodayTasksAsText(tasksWithSessions, reportDate, textExportFields);
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">当日タスク実績レポート</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(text).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                    className="btn-secondary flex items-center gap-1.5 text-xs py-1.5"
                  >
                    {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'コピー済み' : 'コピー'}
                  </button>
                  <button
                    onClick={() => setShowTextReport(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto px-6 py-4 text-xs leading-relaxed text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap break-words">
                {text}
              </pre>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
