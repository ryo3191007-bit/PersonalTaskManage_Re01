import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, PauseCircle, PlayCircle, X, Check, Trash2, CalendarX, CreditCard as Edit2 } from 'lucide-react';
import { useTasks } from '../contexts/TaskContext';
import type { Task, TaskSession } from '../lib/types';
import { STATUS_COLORS, STATUS_LABELS } from '../lib/types';
import TaskForm from '../components/tasks/TaskForm';
import RecurrenceForm from '../components/tasks/RecurrenceForm';
import { getTotalMinutes, getWorkloadMinsForDay, getWorkloadTaskList } from '../lib/utils';
import { useWorkHours } from '../lib/useWorkHours';

type CalView = 'day' | 'week' | 'month';

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function taskStatusStyle(t: Task) {
  if (t.status === 'completed') return { bg: '#22c55e33', color: '#16a34a', border: '#22c55e' };
  if (t.status === 'in_progress') return { bg: '#3b82f633', color: '#2563eb', border: '#3b82f6' };
  if (t.status === 'suspended') return { bg: '#f59e0b33', color: '#d97706', border: '#f59e0b' };
  return { bg: '#9ca3af22', color: '#6b7280', border: '#9ca3af' };
}

function toDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function assignLanes(
  items: { id: string; colStart: number; colEnd: number }[],
  parentOf: Record<string, string> = {}
) {
  if (items.length === 0) return { laneMap: {} as Record<string, number>, laneCount: 0 };

  const itemMap = new Map(items.map(i => [i.id, i]));

  const rootOf = (id: string): string => {
    let cur = id;
    for (let i = 0; i < 20; i++) {
      const p = parentOf[cur];
      if (!p || !itemMap.has(p)) return cur;
      cur = p;
    }
    return cur;
  };

  const depthOf = (id: string): number => {
    let d = 0; let cur = id;
    for (let i = 0; i < 20; i++) {
      const p = parentOf[cur];
      if (!p || !itemMap.has(p)) break;
      cur = p; d++;
    }
    return d;
  };

  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const root = rootOf(item.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(item);
  }

  for (const [, g] of groups) {
    g.sort((a, b) => {
      const da = depthOf(a.id), db = depthOf(b.id);
      return da !== db ? da - db : a.colStart - b.colStart;
    });
  }

  const rootItems = items.filter(i => rootOf(i.id) === i.id)
    .sort((a, b) => a.colStart - b.colStart);

  const laneEnds: number[] = [];
  const result: Record<string, number> = {};

  const findFreeLaneFrom = (minLane: number, colStart: number): number => {
    for (let li = minLane; li < laneEnds.length; li++) {
      if (colStart > laneEnds[li]) return li;
    }
    return Math.max(laneEnds.length, minLane);
  };

  const placeSingle = (item: typeof items[0], minLane: number): number => {
    const lane = findFreeLaneFrom(minLane, item.colStart);
    while (laneEnds.length <= lane) laneEnds.push(-1);
    laneEnds[lane] = Math.max(laneEnds[lane], item.colEnd);
    result[item.id] = lane;
    return lane;
  };

  const placeGroup = (id: string, minLane: number) => {
    const item = itemMap.get(id);
    if (!item) return;
    const myLane = placeSingle(item, minLane);
    const children = items.filter(i => parentOf[i.id] === id)
      .sort((a, b) => a.colStart - b.colStart);
    for (const child of children) {
      placeGroup(child.id, myLane + 1);
    }
  };

  for (const root of rootItems) {
    placeGroup(root.id, 0);
  }

  return { laneMap: result, laneCount: laneEnds.length };
}

const HOUR_H = 56;

function getDisplayTimes(t: Task): { displayStart: string; displayEnd: string | null; isActual: boolean } {
  if (t.status === 'completed' && t.actual_start) {
    let displayEnd: string | null = null;
    if (t.actual_end) {
      displayEnd = t.actual_end;
    } else if (t.actual_time > 0) {
      const end = new Date(new Date(t.actual_start).getTime() + t.actual_time * 60000);
      displayEnd = end.toISOString();
    }
    return { displayStart: t.actual_start, displayEnd, isActual: true };
  }
  return { displayStart: t.scheduled_start!, displayEnd: t.scheduled_end, isActual: false };
}

function getScheduledGeometry(t: Task, dayDate: Date): {
  hasDiff: boolean;
  scheduledTop?: number;
  scheduledHeight?: number;
  startDiffMins?: number;
  durationDiffMins?: number;
} {
  const hasActual = (t.status === 'completed' || t.status === 'suspended' || t.status === 'in_progress') && !!t.actual_start;
  if (!hasActual || !t.scheduled_start) return { hasDiff: false };
  const thisDay = toDay(dayDate);

  const sStart = new Date(t.scheduled_start);
  const sStartDay = toDay(sStart);
  // scheduled が完全に thisDay より前（前日以前に終わっている）なら点線不要
  if (t.scheduled_end && toDay(new Date(t.scheduled_end)) < thisDay) return { hasDiff: false };
  const sStartMins = sStartDay < thisDay ? 0 : sStart.getHours() * 60 + sStart.getMinutes();
  let sEndMins: number;
  if (t.scheduled_end) {
    const sEnd = new Date(t.scheduled_end);
    sEndMins = toDay(sEnd) > thisDay ? 24 * 60 : sEnd.getHours() * 60 + sEnd.getMinutes();
    if (sEndMins <= sStartMins) sEndMins = sStartMins + 30;
  } else {
    sEndMins = sStartMins + 60;
  }

  const aStart = new Date(t.actual_start!);
  const aStartDay = toDay(aStart);
  const aStartMins = aStartDay < thisDay ? 0 : aStart.getHours() * 60 + aStart.getMinutes();
  let aEndMins: number;
  if (t.actual_end) {
    const aEnd = new Date(t.actual_end);
    aEndMins = toDay(aEnd) > thisDay ? 24 * 60 : aEnd.getHours() * 60 + aEnd.getMinutes();
  } else if (t.suspended_at && t.status === 'suspended') {
    const sAt = new Date(t.suspended_at);
    aEndMins = toDay(sAt) > thisDay ? 24 * 60 : sAt.getHours() * 60 + sAt.getMinutes();
  } else if (t.actual_time > 0) {
    aEndMins = aStartMins + t.actual_time;
  } else {
    aEndMins = aStartMins + (sEndMins - sStartMins);
  }

  const startDiffMins = aStartMins - sStartMins;
  const durationDiffMins = (aEndMins - aStartMins) - (sEndMins - sStartMins);
  const THRESHOLD = 5;
  if (Math.abs(startDiffMins) < THRESHOLD && Math.abs(durationDiffMins) < THRESHOLD) return { hasDiff: false };

  return {
    hasDiff: true,
    scheduledTop: (sStartMins / 60) * HOUR_H,
    scheduledHeight: Math.max(((sEndMins - sStartMins) / 60) * HOUR_H, 20),
    startDiffMins,
    durationDiffMins,
  };
}

function taskGeometry(t: Task, dayDate: Date) {
  const thisDay = toDay(dayDate);
  const { displayStart, displayEnd } = getDisplayTimes(t);
  const start = new Date(displayStart);
  const startDay = toDay(start);

  const startMins = startDay < thisDay
    ? 0
    : start.getHours() * 60 + start.getMinutes();

  let endMins: number;
  if (displayEnd) {
    const end = new Date(displayEnd);
    const endDay = toDay(end);
    if (endDay > thisDay) {
      endMins = 24 * 60;
    } else {
      endMins = end.getHours() * 60 + end.getMinutes();
      if (endMins <= startMins) endMins = startMins + 30;
    }
  } else {
    endMins = startMins + 60;
  }

  const top = (startMins / 60) * HOUR_H;
  const height = Math.max(((endMins - startMins) / 60) * HOUR_H, 20);
  return { top, height };
}

function assignTimeLanes(
  items: { id: string; startMins: number; endMins: number }[],
  parentOf: Record<string, string> = {}
): Record<string, { col: number; totalCols: number }> {
  const depth = (id: string): number => {
    let d = 0;
    let cur = id;
    while (parentOf[cur]) { cur = parentOf[cur]; d++; if (d > 20) break; }
    return d;
  };
  const sorted = [...items].sort((a, b) => {
    const da = depth(a.id), db = depth(b.id);
    if (da !== db) return da - db;
    return a.startMins - b.startMins;
  });

  const cols: { endMins: number }[][] = [];
  const colOf: Record<string, number> = {};

  for (const item of sorted) {
    const parentId = parentOf[item.id];
    const minCol = parentId !== undefined && colOf[parentId] !== undefined
      ? colOf[parentId] + 1
      : 0;

    let placed = false;
    for (let c = minCol; c < cols.length; c++) {
      const lastEnd = cols[c][cols[c].length - 1].endMins;
      if (item.startMins >= lastEnd) {
        cols[c].push({ endMins: item.endMins });
        colOf[item.id] = c;
        placed = true;
        break;
      }
    }
    if (!placed) {
      const targetCol = Math.max(cols.length, minCol);
      while (cols.length <= targetCol) cols.push([]);
      cols[targetCol].push({ endMins: item.endMins });
      colOf[item.id] = targetCol;
    }
  }

  const result: Record<string, { col: number; totalCols: number }> = {};
  for (const item of sorted) {
    const overlapping = sorted.filter(
      other => other.startMins < item.endMins && other.endMins > item.startMins
    );
    const maxCol = Math.max(...overlapping.map(o => colOf[o.id]));
    result[item.id] = { col: colOf[item.id], totalCols: maxCol + 1 };
  }
  return result;
}

/** 中断履歴から表示セグメントを生成する（カレンダー用） */
interface TaskSegment {
  taskId: string;
  segmentKey: string;
  task: Task;
  displayStart: string;
  displayEnd: string | null;
  isSuspended: boolean;
  isResumed: boolean;
  sessionIndex: number;
  /**
   * true = 中断～再開間をつなぐ点線コネクター（縦線＋矢印）
   * false/undefined = 実際の作業帯（実線）
   */
  isConnector?: boolean;
}

function buildTaskSegments(task: Task, sessions: TaskSession[]): TaskSegment[] {
  const taskSessions = sessions
    .filter(s => s.task_id === task.id)
    .sort((a, b) => new Date(a.session_start).getTime() - new Date(b.session_start).getTime());

  if (taskSessions.length === 0) {
    // セッション履歴がない場合は getDisplayTimes と同等のロジックで実績優先
    const { displayStart, displayEnd } = getDisplayTimes(task);
    const start = displayStart || (task.scheduled_start ?? task.actual_start ?? '');
    const end = task.status === 'suspended'
      ? (task.suspended_at ?? displayEnd)
      : displayEnd;
    return [{
      taskId: task.id,
      segmentKey: task.id,
      task,
      displayStart: start,
      displayEnd: end,
      isSuspended: task.status === 'suspended',
      isResumed: false,
      sessionIndex: 0,
    }];
  }

  const result: TaskSegment[] = [];

  // 各セッション帯（実線）+ セッション間コネクター（点線）
  taskSessions.forEach((session, idx) => {
    const isLast = idx === taskSessions.length - 1;
    const isSuspended = isLast && task.status === 'suspended';
    // session_end が null の最終セッションは actual_end（完了）または suspended_at（中断）で補完
    const segEnd = session.session_end
      ?? (isLast ? (isSuspended ? task.suspended_at : task.actual_end) : null);
    result.push({
      taskId: task.id,
      segmentKey: `${task.id}_seg${idx}`,
      task,
      displayStart: session.session_start,
      displayEnd: segEnd,
      isSuspended,
      isResumed: idx > 0,
      sessionIndex: idx,
      isConnector: false,
    });

    // 次のセッションがある場合、中断～再開のコネクターを追加
    if (!isLast) {
      const nextSession = taskSessions[idx + 1];
      const connectorEnd = session.session_end;
      if (connectorEnd) {
        result.push({
          taskId: task.id,
          segmentKey: `${task.id}_conn${idx}`,
          task,
          displayStart: connectorEnd,
          displayEnd: nextSession.session_start,
          isSuspended: false,
          isResumed: false,
          sessionIndex: -1,
          isConnector: true,
        });
      }
    }
  });

  return result;
}

// ─── 中断ダイアログ（カレンダー用） ──────────────────────────────────────
function CalSuspendDialog({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (t: string) => void }) {
  const [value, setValue] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PauseCircle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">タスクを中断</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.title}</p>
        <div>
          <label className="form-label">中断日時</label>
          <input type="datetime-local" value={value} onChange={e => setValue(e.target.value)} className="form-input" />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">中断中の時間は所要時間に含まれません。</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button onClick={() => value && onSave(new Date(value).toISOString())} disabled={!value} className="btn-primary flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700">
            <PauseCircle className="w-3.5 h-3.5" />中断
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 再開ダイアログ（カレンダー用） ──────────────────────────────────────
function CalResumeDialog({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (t: string) => void }) {
  const [value, setValue] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const suspendedAt = task.suspended_at ? new Date(task.suspended_at) : null;
  const resumeAt = value ? new Date(value) : null;
  const suspendMins = suspendedAt && resumeAt ? Math.round((resumeAt.getTime() - suspendedAt.getTime()) / 60000) : null;
  const fmt = (mins: number) => mins < 60 ? `${mins}分` : `${Math.floor(mins / 60)}時間${mins % 60 > 0 ? `${mins % 60}分` : ''}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">タスクを再開</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X className="w-4 h-4" /></button>
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
          <p className="text-xs text-gray-400 dark:text-gray-500">中断時間: <span className="font-medium text-amber-600 dark:text-amber-400">{fmt(suspendMins)}</span>（所要時間から除外）</p>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button onClick={() => value && onSave(new Date(value).toISOString())} disabled={!value} className="btn-primary flex items-center gap-1.5">
            <PlayCircle className="w-3.5 h-3.5" />再開
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 完了ダイアログ（中断済みタスクから） ────────────────────────────────
function CalCompleteDialog({ task, onClose, onSave }: {
  task: Task;
  onClose: () => void;
  onSave: (actualEnd: string, memo: string) => void;
}) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const [value, setValue] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
  const [memo, setMemo] = useState(task.actual_memo ?? '');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">タスクを完了</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.title}</p>
        <div>
          <label className="form-label">終了日時</label>
          <input type="datetime-local" value={value} onChange={e => setValue(e.target.value)} className="form-input" />
        </div>
        <div>
          <label className="form-label">備考</label>
          <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} className="form-input resize-none" placeholder="実績メモ" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button onClick={() => value && onSave(new Date(value).toISOString(), memo)} disabled={!value} className="btn-primary flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />完了
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DAY VIEW ────────────────────────────────────────────────────────────────
function DayView({ date, tasks, sessions, onEdit, onCreateAt, onSuspend, onResume, onDelete }: {
  date: Date;
  tasks: Task[];
  sessions: TaskSession[];
  onEdit: (t: Task) => void;
  onCreateAt: (dt: string) => void;
  onSuspend: (t: Task) => void;
  onResume: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const target = toDay(date);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingWorkHours, setEditingWorkHours] = useState(false);
  const [workHoursInput, setWorkHoursInput] = useState('');
  const { workHours: WORK_HOURS, setWorkHours } = useWorkHours();

  const parentIdsWithChildren = useMemo(() => {
    const ids = new Set<string>();
    tasks.forEach(t => { if (t.parent_task_id) ids.add(t.parent_task_id); });
    return ids;
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.status !== 'completed' && (!t.scheduled_start || !t.scheduled_end)) return false;
      if (t.parent_task_id === null) return true;
      return expandedIds.has(t.parent_task_id);
    });
  }, [tasks, expandedIds]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // セグメントを展開してこの日に該当するものを収集
  const daySegments = useMemo(() => {
    const result: TaskSegment[] = [];
    for (const t of visibleTasks) {
      const segs = buildTaskSegments(t, sessions);
      for (const seg of segs) {
        if (!seg.displayStart) continue;
        const segStart = toDay(new Date(seg.displayStart));
        if (segStart.getTime() === target.getTime()) {
          result.push(seg);
          continue;
        }
        if (seg.displayEnd) {
          const segEnd = new Date(seg.displayEnd);
          if (segEnd.getHours() === 0 && segEnd.getMinutes() === 0 && segEnd.getSeconds() === 0) continue;
          const segEndDay = toDay(segEnd);
          if (segStart < target && target <= segEndDay) result.push(seg);
        }
      }
    }
    return result;
  }, [visibleTasks, sessions, target.getTime()]);

  const usedHours = useMemo(() => {
    const dayEnd = new Date(target.getTime() + 24 * 60 * 60 * 1000);
    // 子タスクを持つ親タスクは除外し、子タスクを集計対象とする
    const workloadList = getWorkloadTaskList(tasks);
    const eligibleTasks = workloadList.filter(t => {
      const { displayStart, displayEnd } = getDisplayTimes(t);
      if (!displayStart) return false;
      const s = new Date(displayStart);
      const e = displayEnd ? new Date(displayEnd) : new Date(s.getTime() + 60 * 60000);
      return s < dayEnd && e > target;
    });
    // getWorkloadMinsForDay で当日分のみ切り出す（セッションで正確に按分）
    const totalMins = eligibleTasks.reduce((sum, t) => {
      return sum + getWorkloadMinsForDay(t, target, sessions);
    }, 0);
    return Math.round(totalMins / 60 * 10) / 10;
  }, [tasks, sessions, target.getTime()]);

  const remainHours = Math.round((WORK_HOURS - usedHours) * 10) / 10;
  const usedPct = Math.min(100, Math.round((usedHours / WORK_HOURS) * 100));

  const timeLaneMap = useMemo(() => {
    const parentOf: Record<string, string> = {};
    daySegments.forEach(seg => { if (seg.task.parent_task_id) parentOf[seg.segmentKey] = seg.task.parent_task_id; });

    // レーン競合計算: タスク単位で代表セグメント（sessionIndex=0 or 単独）のみ使用
    // タスクの全セッション範囲を span として計算
    const taskSpan: Record<string, { startMins: number; endMins: number }> = {};
    daySegments.forEach(seg => {
      if (seg.isConnector) return;
      const start = new Date(seg.displayStart);
      const startDay = toDay(start);
      const startMins = startDay < target ? 0 : start.getHours() * 60 + start.getMinutes();
      let endMins: number;
      if (seg.displayEnd) {
        const end = new Date(seg.displayEnd);
        endMins = toDay(end) > target ? 24 * 60 : Math.max(end.getHours() * 60 + end.getMinutes(), startMins + 30);
      } else {
        endMins = startMins + 60;
      }
      if (!taskSpan[seg.taskId]) {
        taskSpan[seg.taskId] = { startMins, endMins };
      } else {
        taskSpan[seg.taskId].startMins = Math.min(taskSpan[seg.taskId].startMins, startMins);
        taskSpan[seg.taskId].endMins = Math.max(taskSpan[seg.taskId].endMins, endMins);
      }
    });

    const representativeSegs = daySegments.filter(seg => !seg.isConnector && seg.sessionIndex <= 0);
    const items = representativeSegs.map(seg => ({
      id: seg.taskId,
      startMins: taskSpan[seg.taskId]?.startMins ?? 0,
      endMins: taskSpan[seg.taskId]?.endMins ?? 60,
    }));
    const uniqueItems = items.filter((item, idx) => items.findIndex(i => i.id === item.id) === idx);
    const taskParentOf: Record<string, string> = {};
    representativeSegs.forEach(seg => { if (seg.task.parent_task_id) taskParentOf[seg.taskId] = seg.task.parent_task_id; });
    const laneResult = assignTimeLanes(uniqueItems, taskParentOf);

    // 全セグメントにタスクIDベースのレーンを割り当て
    const result: Record<string, { col: number; totalCols: number }> = {};
    daySegments.forEach(seg => {
      result[seg.segmentKey] = laneResult[seg.taskId] ?? { col: 0, totalCols: 1 };
    });
    return result;
  }, [daySegments]);

  const totalH = HOUR_H * 24;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">使用</span>
              <span className={`text-sm font-bold tabular-nums ${usedHours > WORK_HOURS ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>{usedHours}</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">残</span>
              <span className={`text-sm font-bold tabular-nums ${remainHours < 0 ? 'text-red-500' : remainHours <= 1 ? 'text-amber-500' : 'text-teal-600 dark:text-teal-400'}`}>{remainHours}</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              <span className="text-[11px] text-gray-400 dark:text-gray-500">上限</span>
              {editingWorkHours ? (
                <input
                  type="number" min="0.5" max="24" step="0.5" value={workHoursInput}
                  onChange={e => setWorkHoursInput(e.target.value)}
                  onBlur={() => { const v = parseFloat(workHoursInput); if (isFinite(v) && v > 0) setWorkHours(v); setEditingWorkHours(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingWorkHours(false); }}
                  autoFocus
                  className="w-14 text-xs font-semibold tabular-nums text-center rounded border border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 px-1 py-0.5"
                />
              ) : (
                <button onClick={() => { setWorkHoursInput(String(WORK_HOURS)); setEditingWorkHours(true); }}
                  className="text-sm font-bold tabular-nums text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline-offset-2 hover:underline"
                  title="クリックして使用可能工数を変更">{WORK_HOURS}</button>
              )}
              <span className="text-[11px] text-gray-400 dark:text-gray-500">h</span>
            </div>
            <div className="w-28 hidden sm:block">
              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5"><span>0h</span><span>{WORK_HOURS}h</span></div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${usedPct >= 100 ? 'bg-red-500' : usedPct >= 75 ? 'bg-amber-400' : 'bg-teal-500'}`} style={{ width: `${usedPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
        <div className="relative flex" style={{ height: `${totalH}px` }}>
          <div className="w-14 flex-shrink-0 relative">
            {HOURS.map(h => (
              <div key={h} className="absolute w-full text-[11px] text-gray-400 dark:text-gray-500 text-right pr-3 select-none" style={{ top: `${h * HOUR_H}px`, lineHeight: '16px' }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          <div className="flex-1 relative ml-1">
            {HOURS.map(h => (
              <div
                key={h}
                onClick={() => {
                  const y = date.getFullYear(), mo = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
                  onCreateAt(`${y}-${mo}-${d}T${String(h).padStart(2, '0')}:00`);
                }}
                className="absolute w-full border-t border-gray-100 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                style={{ top: `${h * HOUR_H}px`, height: `${HOUR_H}px` }}
                title={`${String(h).padStart(2, '0')}:00 にタスクを作成`}
              />
            ))}
            {daySegments.map(seg => {
              const start = new Date(seg.displayStart);
              const startDay = toDay(start);
              const startMins = startDay < target ? 0 : start.getHours() * 60 + start.getMinutes();
              let endMins: number;
              if (seg.displayEnd) {
                const end = new Date(seg.displayEnd);
                endMins = toDay(end) > target ? 24 * 60 : Math.max(end.getHours() * 60 + end.getMinutes(), startMins + 30);
              } else {
                endMins = startMins + 60;
              }
              const top = (startMins / 60) * HOUR_H;
              const height = Math.max(((endMins - startMins) / 60) * HOUR_H, 20);

              const lane = timeLaneMap[seg.segmentKey];
              const totalCols = lane?.totalCols ?? 1;
              const col = lane?.col ?? 0;
              const s = taskStatusStyle(seg.task);
              const widthPct = 100 / totalCols;
              const hasChildren = parentIdsWithChildren.has(seg.task.id);
              const isExpanded = expandedIds.has(seg.task.id);
              const isContinued = startDay < target;
              const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
              const diff = getScheduledGeometry(seg.task, date);
              const left = `calc(${col * widthPct}% + 1px)`;
              const width = `calc(${widthPct}% - 3px)`;

              // 中断ストライプパターン（中断中セグメント）
              const suspendedStyle = seg.isSuspended
                ? { backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,158,11,0.15) 4px, rgba(245,158,11,0.15) 8px)` }
                : {};

              // コネクター（中断～再開間の点線縦線＋矢印）
              if (seg.isConnector) {
                return (
                  <div
                    key={seg.segmentKey}
                    className="absolute pointer-events-none flex flex-col items-center justify-between overflow-hidden"
                    style={{
                      top: `${top}px`, height: `${Math.max(height, 8)}px`, left,
                      width: `calc(${widthPct}% - 3px)`,
                    }}
                  >
                    <div style={{
                      flex: 1, width: 2, borderLeft: `2px dashed ${s.border}`, opacity: 0.7, minHeight: 4,
                    }} />
                    <svg width="10" height="8" viewBox="0 0 10 8" style={{ opacity: 0.7, flexShrink: 0 }}>
                      <path d="M5 8 L0 0 L10 0 Z" fill={s.border} />
                    </svg>
                  </div>
                );
              }

              return (
                <div key={seg.segmentKey} className="contents">
                  {diff.hasDiff && (
                    <div
                      className="absolute rounded pointer-events-none"
                      style={{
                        top: `${diff.scheduledTop! + 1}px`, height: `${diff.scheduledHeight! - 2}px`,
                        left, width, border: `1.5px dashed ${s.border}`, opacity: 0.45, backgroundColor: 'transparent',
                      }}
                    />
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (hasChildren) { toggleExpand(seg.task.id); return; }
                      onEdit(seg.task);
                    }}
                    onDoubleClick={e => { e.stopPropagation(); if (hasChildren) onEdit(seg.task); }}
                    title={`${seg.task.title}${seg.isSuspended ? ' [中断中]' : seg.isResumed ? ' [再開]' : ''}`}
                    className="absolute rounded border-l-2 px-1.5 text-left overflow-hidden hover:opacity-80 transition-opacity group"
                    style={{
                      top: `${top + 1}px`, height: `${height - 2}px`, left, width,
                      backgroundColor: s.bg, color: s.color, borderColor: s.border,
                      ...suspendedStyle,
                      boxShadow: hasChildren ? `inset 3px 0 0 ${s.border}` : diff.hasDiff ? `2px 2px 0 ${s.border}55` : undefined,
                      outline: diff.hasDiff ? `1.5px solid ${s.border}` : undefined,
                      outlineOffset: '-1px',
                    }}
                  >
                    <span className="text-[11px] font-medium leading-tight flex items-center gap-0.5 truncate">
                      {hasChildren && <span className="opacity-70 flex-shrink-0">{isExpanded ? '▼' : '▶'}</span>}
                      {seg.isSuspended && <PauseCircle className="w-2.5 h-2.5 flex-shrink-0 text-amber-500" />}
                      {seg.isResumed && !seg.isSuspended && <PlayCircle className="w-2.5 h-2.5 flex-shrink-0 text-blue-500" />}
                      <span className="truncate">{seg.task.title}</span>
                    </span>
                    {height > 32 && (
                      <span className="text-[10px] opacity-70 leading-tight block truncate">
                        {isContinued
                          ? `〜 ${new Date(seg.displayStart).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} から`
                          : fmtTime(seg.displayStart)}
                        {seg.displayEnd && ` 〜 ${fmtTime(seg.displayEnd)}`}
                      </span>
                    )}
                    {/* 中断・再開クイックボタン */}
                    {height > 48 && seg.task.status === 'in_progress' && (
                      <button
                        onClick={e => { e.stopPropagation(); onSuspend(seg.task); }}
                        className="absolute bottom-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors"
                        title="中断"
                      >
                        <PauseCircle className="w-3 h-3" />
                      </button>
                    )}
                    {height > 48 && seg.task.status === 'suspended' && (
                      <button
                        onClick={e => { e.stopPropagation(); onResume(seg.task); }}
                        className="absolute bottom-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors"
                        title="再開"
                      >
                        <PlayCircle className="w-3 h-3" />
                      </button>
                    )}
                    {/* 削除ボタン */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (deletingId === seg.task.id) { onDelete(seg.task.id); setDeletingId(null); }
                        else setDeletingId(seg.task.id);
                      }}
                      onBlur={() => setDeletingId(null)}
                      className={`absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded transition-colors ${deletingId === seg.task.id ? 'bg-red-500 text-white opacity-100' : 'bg-white/60 dark:bg-gray-900/60 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}
                      title={deletingId === seg.task.id ? 'もう一度クリックで削除' : '削除'}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WEEK VIEW ───────────────────────────────────────────────────────────────
function WeekView({ weekStart, tasks, sessions, onEdit, onCreateAt, onSuspend, onResume, onDelete }: {
  weekStart: Date;
  tasks: Task[];
  sessions: TaskSession[];
  onEdit: (t: Task) => void;
  onCreateAt: (dt: string) => void;
  onSuspend: (t: Task) => void;
  onResume: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const wStart = toDay(weekStart);
  const wEnd = toDay(addDays(weekStart, 6));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const parentIdsWithChildren = useMemo(() => {
    const ids = new Set<string>();
    tasks.forEach(t => { if (t.parent_task_id) ids.add(t.parent_task_id); });
    return ids;
  }, [tasks]);

  const visibleTasks = useMemo(() =>
    tasks.filter(t => {
      if (t.status !== 'completed' && (!t.scheduled_start || !t.scheduled_end)) return false;
      return t.parent_task_id === null || expandedIds.has(t.parent_task_id);
    }),
    [tasks, expandedIds]
  );

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isWeekMultiDay = (t: Task) => {
    if (!t.scheduled_start || !t.scheduled_end) return false;
    const e = new Date(t.scheduled_end);
    const s = toDay(new Date(t.scheduled_start));
    const eDay = toDay(e);
    if (eDay <= s) return false;
    if (e.getHours() === 0 && e.getMinutes() === 0 && e.getSeconds() === 0) return false;
    return true;
  };

  const multiDayTasks = useMemo(() => {
    return visibleTasks.filter(t => {
      if (!isWeekMultiDay(t)) return false;
      const s = toDay(new Date(t.scheduled_start!));
      const e = toDay(new Date(t.scheduled_end!));
      return s <= wEnd && e >= wStart;
    });
  }, [visibleTasks, wStart.getTime(), wEnd.getTime()]);

  const { laneMap, laneCount, items: multiDayItems } = useMemo(() => {
    const parentOf: Record<string, string> = {};
    multiDayTasks.forEach(t => { if (t.parent_task_id) parentOf[t.id] = t.parent_task_id; });
    const items = multiDayTasks.map(t => {
      const s = toDay(new Date(t.scheduled_start!));
      const e = toDay(new Date(t.scheduled_end!));
      const colStart = Math.max(0, diffDays(wStart, s));
      const colEnd = Math.min(6, diffDays(wStart, e));
      return { id: t.id, colStart, colEnd };
    });
    const { laneMap, laneCount } = assignLanes(items, parentOf);
    return { laneMap, laneCount, items };
  }, [multiDayTasks, wStart.getTime()]);

  const LANE_H = 20;
  const DATE_ROW_H = 0;
  const bandsHeight = laneCount > 0 ? laneCount * LANE_H + 4 : 0;
  const allDayRowHeight = Math.max(bandsHeight + 4, 28);

  // 各日ごとにセグメントを振り分け
  const segmentsByDay = useMemo(() => {
    return days.map(day => {
      const target = toDay(day);
      const result: TaskSegment[] = [];
      for (const t of visibleTasks) {
        if (isWeekMultiDay(t)) continue;
        const segs = buildTaskSegments(t, sessions);
        for (const seg of segs) {
          if (!seg.displayStart) continue;
          const segStart = toDay(new Date(seg.displayStart));
          if (segStart.getTime() === target.getTime()) {
            result.push(seg);
          }
        }
      }
      return result;
    });
  }, [visibleTasks, sessions, days.map(d => d.getTime()).join(',')]);

  const timeLaneMaps = useMemo(() => {
    return days.map((day, di) => {
      const target = toDay(day);
      const segs = segmentsByDay[di];

      const taskSpan: Record<string, { startMins: number; endMins: number }> = {};
      segs.forEach(seg => {
        if (seg.isConnector) return;
        const start = new Date(seg.displayStart);
        const startMins = start.getHours() * 60 + start.getMinutes();
        let endMins: number;
        if (seg.displayEnd) {
          const end = new Date(seg.displayEnd);
          endMins = toDay(end) > target ? 24 * 60 : Math.max(end.getHours() * 60 + end.getMinutes(), startMins + 30);
        } else {
          endMins = startMins + 60;
        }
        if (!taskSpan[seg.taskId]) {
          taskSpan[seg.taskId] = { startMins, endMins };
        } else {
          taskSpan[seg.taskId].startMins = Math.min(taskSpan[seg.taskId].startMins, startMins);
          taskSpan[seg.taskId].endMins = Math.max(taskSpan[seg.taskId].endMins, endMins);
        }
      });

      const representativeSegs = segs.filter(seg => !seg.isConnector && seg.sessionIndex <= 0);
      const taskParentOf: Record<string, string> = {};
      representativeSegs.forEach(seg => { if (seg.task.parent_task_id) taskParentOf[seg.taskId] = seg.task.parent_task_id; });
      const items = representativeSegs
        .filter((seg, idx, arr) => arr.findIndex(s => s.taskId === seg.taskId) === idx)
        .map(seg => ({
          id: seg.taskId,
          startMins: taskSpan[seg.taskId]?.startMins ?? 0,
          endMins: taskSpan[seg.taskId]?.endMins ?? 60,
        }));
      const laneResult = assignTimeLanes(items, taskParentOf);

      const result: Record<string, { col: number; totalCols: number }> = {};
      segs.forEach(seg => {
        result[seg.segmentKey] = laneResult[seg.taskId] ?? { col: 0, totalCols: 1 };
      });
      return result;
    });
  }, [segmentsByDay]);

  const totalH = HOUR_H * 24;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="grid border-b border-gray-200 dark:border-gray-700" style={{ gridTemplateColumns: '3.5rem repeat(7, 1fr)' }}>
        <div className="border-r border-gray-100 dark:border-gray-800" />
        {days.map((d, i) => {
          const isToday = toDay(d).getTime() === toDay(today).getTime();
          return (
            <div key={i} className={`py-2 text-center border-r border-gray-100 dark:border-gray-800 last:border-r-0 ${isToday ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
              <div className={`text-[11px] font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>{WEEK_DAYS[i]}</div>
              <div className={`text-sm font-semibold mx-auto w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-800 dark:text-gray-200'}`}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700" style={{ gridTemplateColumns: '3.5rem repeat(7, 1fr)', display: 'grid' }}>
        <div className="border-r border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 flex items-start justify-end pr-1 pt-1" style={{ minHeight: `${allDayRowHeight}px` }}>終日</div>
        <div className="relative col-span-7" style={{ minHeight: `${allDayRowHeight}px` }}>
          <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days.map((d, di) => {
              const isToday = toDay(d).getTime() === toDay(today).getTime();
              return <div key={di} className={`border-r border-gray-100 dark:border-gray-800 last:border-r-0 h-full ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`} />;
            })}
          </div>
          {multiDayItems.map(item => {
            const t = multiDayTasks.find(x => x.id === item.id)!;
            const s = taskStatusStyle(t);
            const lane = laneMap[item.id] ?? 0;
            const hasChildren = parentIdsWithChildren.has(t.id);
            const isExpanded = expandedIds.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => hasChildren ? toggleExpand(t.id) : onEdit(t)}
                onDoubleClick={() => hasChildren ? onEdit(t) : undefined}
                title={t.title}
                className="absolute truncate text-[11px] font-medium px-1.5 rounded border-l-2 hover:opacity-80 transition-opacity text-left pointer-events-auto"
                style={{
                  top: `${DATE_ROW_H + lane * LANE_H + 2}px`, height: `${LANE_H - 2}px`,
                  left: `calc(${item.colStart / 7 * 100}% + 2px)`, width: `calc(${(item.colEnd - item.colStart + 1) / 7 * 100}% - 4px)`,
                  backgroundColor: s.bg, color: s.color, borderColor: s.border, lineHeight: `${LANE_H - 4}px`,
                }}
              >
                {hasChildren && <span className="mr-0.5 opacity-70">{isExpanded ? '▼' : '▶'}</span>}
                {t.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-auto" style={{ maxHeight: '65vh' }}>
        <div className="relative" style={{ height: `${totalH}px` }}>
          <div className="absolute left-0 top-0 w-14" style={{ height: `${totalH}px` }}>
            {HOURS.map(h => (
              <div key={h} className="absolute w-full border-t border-gray-100 dark:border-gray-800" style={{ top: `${h * HOUR_H}px` }}>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 absolute right-2" style={{ top: 1 }}>{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          <div className="absolute left-14 right-0 top-0" style={{ height: `${totalH}px` }}>
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {days.map((d, di) => {
                const day = d;
                const target = toDay(day);
                const isToday = toDay(d).getTime() === toDay(today).getTime();
                return (
                  <div key={di} className={`border-r border-gray-100 dark:border-gray-800 last:border-r-0 h-full relative ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}>
                    {HOURS.map(h => (
                      <div
                        key={h}
                        onClick={() => {
                          const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
                          onCreateAt(`${y}-${m}-${dd}T${String(h).padStart(2, '0')}:00`);
                        }}
                        className="absolute w-full border-t border-gray-100 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                        style={{ top: `${h * HOUR_H}px`, height: `${HOUR_H}px` }}
                        title={`${String(h).padStart(2, '0')}:00 にタスクを作成`}
                      />
                    ))}
                    {segmentsByDay[di].map(seg => {
                      const start = new Date(seg.displayStart);
                      const startMins = start.getHours() * 60 + start.getMinutes();
                      let endMins: number;
                      if (seg.displayEnd) {
                        const end = new Date(seg.displayEnd);
                        endMins = toDay(end) > target ? 24 * 60 : Math.max(end.getHours() * 60 + end.getMinutes(), startMins + 30);
                      } else {
                        endMins = startMins + 60;
                      }
                      const top = (startMins / 60) * HOUR_H;
                      const height = Math.max(((endMins - startMins) / 60) * HOUR_H, 20);
                      const lane = timeLaneMaps[di][seg.segmentKey];
                      const totalCols = lane?.totalCols ?? 1;
                      const col = lane?.col ?? 0;
                      const s = taskStatusStyle(seg.task);
                      const widthPct = 100 / totalCols;
                      const hasChildren = parentIdsWithChildren.has(seg.task.id);
                      const isExpanded = expandedIds.has(seg.task.id);
                      const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                      const left = `calc(${col * widthPct}% + 1px)`;
                      const width = `calc(${widthPct}% - 3px)`;
                      const suspendedStyle = seg.isSuspended
                        ? { backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,158,11,0.15) 4px, rgba(245,158,11,0.15) 8px)` }
                        : {};

                      if (seg.isConnector) {
                        return (
                          <div
                            key={seg.segmentKey}
                            className="absolute pointer-events-none flex flex-col items-center justify-between overflow-hidden"
                            style={{
                              top: `${top}px`, height: `${Math.max(height, 8)}px`, left,
                              width: `calc(${widthPct}% - 3px)`,
                            }}
                          >
                            <div style={{ flex: 1, width: 2, borderLeft: `2px dashed ${s.border}`, opacity: 0.7, minHeight: 4 }} />
                            <svg width="10" height="8" viewBox="0 0 10 8" style={{ opacity: 0.7, flexShrink: 0 }}>
                              <path d="M5 8 L0 0 L10 0 Z" fill={s.border} />
                            </svg>
                          </div>
                        );
                      }

                      return (
                        <div key={seg.segmentKey} className="contents">
                          <button
                            onClick={e => { e.stopPropagation(); hasChildren ? toggleExpand(seg.task.id) : onEdit(seg.task); }}
                            onDoubleClick={e => { e.stopPropagation(); if (hasChildren) onEdit(seg.task); }}
                            title={`${seg.task.title}${seg.isSuspended ? ' [中断中]' : seg.isResumed ? ' [再開]' : ''}`}
                            className="absolute rounded border-l-2 px-1.5 text-left overflow-hidden hover:opacity-80 transition-opacity group"
                            style={{
                              top: `${top + 1}px`, height: `${height - 2}px`, left, width,
                              backgroundColor: s.bg, color: s.color, borderColor: s.border,
                              ...suspendedStyle,
                            }}
                          >
                            <span className="text-[11px] font-medium leading-tight flex items-center gap-0.5 truncate">
                              {hasChildren && <span className="opacity-70 flex-shrink-0">{isExpanded ? '▼' : '▶'}</span>}
                              {seg.isSuspended && <PauseCircle className="w-2.5 h-2.5 flex-shrink-0 text-amber-500" />}
                              {seg.isResumed && !seg.isSuspended && <PlayCircle className="w-2.5 h-2.5 flex-shrink-0 text-blue-500" />}
                              <span className="truncate">{seg.task.title}</span>
                            </span>
                            {height > 32 && (
                              <span className="text-[10px] opacity-70 leading-tight block truncate">
                                {fmtTime(seg.displayStart)}
                                {seg.displayEnd && ` 〜 ${fmtTime(seg.displayEnd)}`}
                              </span>
                            )}
                            {height > 48 && seg.task.status === 'in_progress' && (
                              <button
                                onClick={e => { e.stopPropagation(); onSuspend(seg.task); }}
                                className="absolute bottom-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 hover:bg-amber-200 transition-colors"
                                title="中断"
                              >
                                <PauseCircle className="w-3 h-3" />
                              </button>
                            )}
                            {height > 48 && seg.task.status === 'suspended' && (
                              <button
                                onClick={e => { e.stopPropagation(); onResume(seg.task); }}
                                className="absolute bottom-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 hover:bg-blue-200 transition-colors"
                                title="再開"
                              >
                                <PlayCircle className="w-3 h-3" />
                              </button>
                            )}
                            {/* 削除ボタン */}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (deletingId === seg.task.id) { onDelete(seg.task.id); setDeletingId(null); }
                                else setDeletingId(seg.task.id);
                              }}
                              onBlur={() => setDeletingId(null)}
                              className={`absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded transition-colors ${deletingId === seg.task.id ? 'bg-red-500 text-white opacity-100' : 'bg-white/60 dark:bg-gray-900/60 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}
                              title={deletingId === seg.task.id ? 'もう一度クリックで削除' : '削除'}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MONTH VIEW ───────────────────────────────────────────────────────────────
function MonthViewWrapper({ viewDate, tasks, sessions, onEdit, onCreateAt, onDelete }: {
  viewDate: Date;
  tasks: Task[];
  sessions: TaskSession[];
  onEdit: (t: Task) => void;
  onCreateAt: (dt: string) => void;
  onDelete: (id: string) => void;
}) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const today = new Date();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const parentIdsWithChildren = useMemo(() => {
    const ids = new Set<string>();
    tasks.forEach(t => { if (t.parent_task_id) ids.add(t.parent_task_id); });
    return ids;
  }, [tasks]);

  const visibleTasks = useMemo(() =>
    tasks.filter(t => {
      if (t.status !== 'completed' && (!t.scheduled_start || !t.scheduled_end)) return false;
      return t.parent_task_id === null || expandedIds.has(t.parent_task_id);
    }),
    [tasks, expandedIds]
  );

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const weekRows: (Date | null)[][] = [];
  let cur = 0 - startPad;
  while (cur < lastDay.getDate()) {
    const row: (Date | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const day = cur + d + 1;
      row.push(day >= 1 && day <= lastDay.getDate() ? new Date(year, month, day) : null);
    }
    weekRows.push(row);
    cur += 7;
  }

  const isMultiDay = (t: Task) => {
    if (!t.scheduled_start || !t.scheduled_end) return false;
    return toDay(new Date(t.scheduled_end)) > toDay(new Date(t.scheduled_start));
  };

  const LANE_H = 20;
  const DATE_ROW_H = 28;

  const rowLayouts = useMemo(() => {
    return weekRows.map(row => {
      const rowStart = row.find(d => d !== null)!;
      const rowEnd = [...row].reverse().find(d => d !== null)!;
      const mdTasksInRow = visibleTasks.filter(t => {
        if (!isMultiDay(t)) return false;
        const s = toDay(new Date(t.scheduled_start!));
        const e = toDay(new Date(t.scheduled_end!));
        return s <= toDay(rowEnd) && e >= toDay(rowStart);
      });
      const mdItems = mdTasksInRow.map(t => {
        const s = toDay(new Date(t.scheduled_start!));
        const e = toDay(new Date(t.scheduled_end!));
        const colStart = Math.max(0, diffDays(toDay(rowStart), s));
        const colEnd = Math.min(6, diffDays(toDay(rowStart), e));
        return { id: t.id, colStart, colEnd, task: t };
      });
      const mdParentOf: Record<string, string> = {};
      mdTasksInRow.forEach(t => { if (t.parent_task_id) mdParentOf[t.id] = t.parent_task_id; });
      const { laneMap, laneCount } = assignLanes(mdItems.map(i => ({ id: i.id, colStart: i.colStart, colEnd: i.colEnd })), mdParentOf);
      return { rowStart, rowEnd, mdItems, laneMap, laneCount };
    });
  }, [visibleTasks, year, month]);

  // セグメントを日付ごとに展開（月ビューはセグメント表示に簡略化）
  const segmentsByDate = useMemo(() => {
    const map = new Map<string, TaskSegment[]>();
    for (const t of visibleTasks) {
      if (isMultiDay(t)) continue;
      const segs = buildTaskSegments(t, sessions);
      for (const seg of segs) {
        if (!seg.displayStart) continue;
        const d = toDay(new Date(seg.displayStart));
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(seg);
      }
    }
    return map;
  }, [visibleTasks, sessions, year, month]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {WEEK_DAYS.map((d, i) => (
          <div key={d} className={`py-3 text-center text-xs font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>{d}</div>
        ))}
      </div>

      {weekRows.map((row, rowIdx) => {
        const { mdItems, laneMap, laneCount } = rowLayouts[rowIdx];
        const bandsHeight = laneCount > 0 ? laneCount * LANE_H + 4 : 0;

        return (
          <div key={rowIdx} className="relative border-b border-gray-100 dark:border-gray-800 last:border-b-0" style={{ minHeight: '120px' }}>
            {/* 複数日タスク帯（絶対配置）*/}
            {mdItems.length > 0 && (
              <div className="absolute left-0 right-0 pointer-events-none" style={{ top: `${DATE_ROW_H}px`, height: `${bandsHeight}px`, zIndex: 1 }}>
                <div className="relative h-full w-full">
                  {mdItems.map(item => {
                    const t = item.task;
                    const s = taskStatusStyle(t);
                    const lane = laneMap[item.id] ?? 0;
                    const hasChildren = parentIdsWithChildren.has(t.id);
                    const isExpanded = expandedIds.has(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={e => { e.stopPropagation(); hasChildren ? toggleExpand(t.id) : onEdit(t); }}
                        onDoubleClick={e => { e.stopPropagation(); if (hasChildren) onEdit(t); }}
                        title={t.title}
                        className="absolute truncate text-[11px] font-medium px-1.5 rounded border-l-2 hover:opacity-80 transition-opacity text-left pointer-events-auto"
                        style={{
                          top: `${lane * LANE_H + 2}px`, height: `${LANE_H - 2}px`,
                          left: `calc(${item.colStart / 7 * 100}% + 2px)`, width: `calc(${(item.colEnd - item.colStart + 1) / 7 * 100}% - 4px)`,
                          backgroundColor: s.bg, color: s.color, borderColor: s.border, lineHeight: `${LANE_H - 4}px`,
                        }}
                      >
                        {hasChildren && <span className="mr-0.5 opacity-70">{isExpanded ? '▼' : '▶'}</span>}
                        {t.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 日付セル列 */}
            <div className="grid grid-cols-7 h-full">
              {row.map((d, ci) => {
                const isToday = d
                  ? d.getDate() === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                  : false;
                const dayKey = d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : '';
                const segs = d ? (segmentsByDate.get(dayKey) ?? []) : [];

                return (
                  <div
                    key={ci}
                    className={`flex flex-col border-r border-gray-100 dark:border-gray-800 last:border-r-0 ${d ? '' : 'bg-gray-50/50 dark:bg-gray-800/20'} ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                  >
                    {d && (
                      <div
                        onClick={() => {
                          const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
                          onCreateAt(`${y}-${m}-${dd}T09:00`);
                        }}
                        className="cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors"
                      >
                        <div className={`text-xs font-medium m-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : ci === 0 ? 'text-red-500' : ci === 6 ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}>{d.getDate()}</div>
                      </div>
                    )}
                    {d && segs.length > 0 && (
                      <div
                        className="px-1 pb-1 space-y-0.5 overflow-y-auto"
                        style={{ marginTop: `${bandsHeight}px`, maxHeight: '120px' }}
                        onClick={e => e.stopPropagation()}
                      >
                        {segs.map(seg => {
                          const s = taskStatusStyle(seg.task);
                          const hasChildren = parentIdsWithChildren.has(seg.task.id);
                          const isExpanded = expandedIds.has(seg.task.id);
                          if (seg.isContainer) {
                            return (
                              <button key={seg.segmentKey}
                                onClick={e => { e.stopPropagation(); hasChildren ? toggleExpand(seg.task.id) : onEdit(seg.task); }}
                                onDoubleClick={e => { e.stopPropagation(); if (hasChildren) onEdit(seg.task); }}
                                title={seg.task.title}
                                className="w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate border-dashed border flex items-center gap-0.5"
                                style={{ backgroundColor: s.bg, color: s.color, borderColor: s.border, opacity: 0.6 }}>
                                {seg.isSuspended && <PauseCircle className="w-2.5 h-2.5 flex-shrink-0 text-amber-500" />}
                                <span className="truncate">{seg.task.title}</span>
                              </button>
                            );
                          }
                          // セッション帯は月ビューではコンテナの下に重複して見えるため非表示
                          if (seg.isContainer === false) return null;
                          return (
                            <button key={seg.segmentKey}
                              onClick={e => { e.stopPropagation(); hasChildren ? toggleExpand(seg.task.id) : onEdit(seg.task); }}
                              onDoubleClick={e => { e.stopPropagation(); if (hasChildren) onEdit(seg.task); }}
                              className="relative w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate font-medium hover:opacity-80 transition-opacity border-l-2 flex items-center gap-0.5 group"
                              style={{ backgroundColor: s.bg, color: s.color, borderColor: s.border }}>
                              {hasChildren && <span className="mr-0.5 opacity-70 flex-shrink-0">{isExpanded ? '▼' : '▶'}</span>}
                              {seg.isSuspended && <PauseCircle className="w-2.5 h-2.5 flex-shrink-0 text-amber-500" />}
                              {seg.isResumed && !seg.isSuspended && <PlayCircle className="w-2.5 h-2.5 flex-shrink-0 text-blue-500" />}
                              <span className="truncate flex-1">{seg.task.title}</span>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  if (deletingId === seg.task.id) { onDelete(seg.task.id); setDeletingId(null); }
                                  else setDeletingId(seg.task.id);
                                }}
                                onBlur={() => setDeletingId(null)}
                                className={`flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded transition-colors ${deletingId === seg.task.id ? 'bg-red-500 text-white opacity-100' : 'text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}
                                title={deletingId === seg.task.id ? 'もう一度クリックで削除' : '削除'}
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── UNSCHEDULED PANEL ───────────────────────────────────────────────────────
function UnscheduledPanel({ tasks, onEdit, onDelete }: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const unscheduled = useMemo(() =>
    tasks.filter(t =>
      t.status !== 'completed' &&
      (!t.scheduled_start || !t.scheduled_end)
    ),
    [tasks]
  );

  if (unscheduled.length === 0) return null;

  return (
    <div className="mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <CalendarX className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1">未スケジュール</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5 font-medium">
          {unscheduled.length}件
        </span>
        <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {unscheduled.map(t => {
            const s = taskStatusStyle(t);
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.border }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {t.category && (
                      <span
                        className="text-[11px] px-1.5 py-px rounded-full font-medium text-white flex-shrink-0"
                        style={{ backgroundColor: t.category.color }}
                      >
                        {t.category.name}
                      </span>
                    )}
                    <span className={`text-[11px] px-1.5 py-px rounded-full font-medium flex-shrink-0 ${
                      t.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : t.status === 'suspended' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {t.status === 'in_progress' ? '進行中' : t.status === 'suspended' ? '中断' : '未着手'}
                    </span>
                    {!t.scheduled_start && !t.scheduled_end && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">予定日時なし</span>
                    )}
                    {t.scheduled_start && !t.scheduled_end && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        開始: {new Date(t.scheduled_start).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} （終了未定）
                      </span>
                    )}
                    {!t.scheduled_start && t.scheduled_end && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        終了: {new Date(t.scheduled_end).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} （開始未定）
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => onEdit(t)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title="編集して予定日時を設定"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (deletingId === t.id) { onDelete(t.id); setDeletingId(null); }
                      else setDeletingId(t.id);
                    }}
                    onBlur={() => setDeletingId(null)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                      deletingId === t.id
                        ? 'bg-red-500 text-white'
                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
                    }`}
                    title={deletingId === t.id ? 'もう一度クリックで削除' : '削除'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { tasks, sessions, suspendTask, resumeTask, updateTask, deleteTask } = useTasks();
  const [view, setView] = useState<CalView>('day');
  const [viewDate, setViewDate] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined);
  const [newTaskDatetime, setNewTaskDatetime] = useState<string | undefined>(undefined);
  const [showRecurrenceForm, setShowRecurrenceForm] = useState(false);
  const [suspendDialog, setSuspendDialog] = useState<Task | null>(null);
  const [resumeDialog, setResumeDialog] = useState<Task | null>(null);
  const [completeDialog, setCompleteDialog] = useState<Task | null>(null);

  const handleCreateAt = (dt: string) => {
    setEditingTask(null);
    setNewTaskDatetime(dt);
  };

  const weekStart = useMemo(() => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [viewDate]);

  const navigate = (dir: -1 | 1) => {
    setViewDate(prev => {
      const d = new Date(prev);
      if (view === 'day') d.setDate(d.getDate() + dir);
      else if (view === 'week') d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const headerLabel = () => {
    if (view === 'day') return viewDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    if (view === 'week') {
      const end = addDays(weekStart, 6);
      return `${weekStart.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} 〜 ${end.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}`;
    }
    return viewDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  };

  const handleSuspend = async (task: Task, suspendedAt: string) => {
    await suspendTask(task, suspendedAt);
    setSuspendDialog(null);
  };

  const handleResume = async (task: Task, resumedAt: string) => {
    await resumeTask(task, resumedAt);
    setResumeDialog(null);
  };

  const handleComplete = async (task: Task, actualEnd: string, memo: string) => {
    const sessionMins = task.actual_start
      ? Math.max(0, Math.round((new Date(actualEnd).getTime() - new Date(task.actual_start).getTime()) / 60000))
      : 0;
    const totalActualTime = (task.actual_time ?? 0) + sessionMins;
    await updateTask(task.id, {
      status: 'completed',
      actual_end: actualEnd,
      actual_memo: memo,
      actual_time: totalActualTime > 0 ? totalActualTime : task.actual_time,
      completed_at: actualEnd,
      suspended_at: null,
    });
    setCompleteDialog(null);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{headerLabel()}</h2>
            <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button onClick={() => setViewDate(new Date())} className="text-xs text-blue-600 hover:underline flex-shrink-0">今日</button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 mr-1">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <span key={key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[key as keyof typeof STATUS_COLORS]}`}>
                  {label}
                </span>
              ))}
            </div>
            <button onClick={() => setShowRecurrenceForm(true)} className="btn-primary flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700">
              <Plus className="w-3.5 h-3.5" />新規定常タスク
            </button>
            <button onClick={() => { setEditingTask(null); setNewTaskDatetime(undefined); }} className="btn-primary flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />新規タスク
            </button>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['day', 'week', 'month'] as CalView[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === v ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                  {v === 'day' ? '日' : v === 'week' ? '週' : '月'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === 'day' && (
          <DayView
            date={viewDate} tasks={tasks} sessions={sessions}
            onEdit={setEditingTask} onCreateAt={handleCreateAt}
            onSuspend={setSuspendDialog} onResume={setResumeDialog}
            onDelete={deleteTask}
          />
        )}
        {view === 'week' && (
          <WeekView
            weekStart={weekStart} tasks={tasks} sessions={sessions}
            onEdit={setEditingTask} onCreateAt={handleCreateAt}
            onSuspend={setSuspendDialog} onResume={setResumeDialog}
            onDelete={deleteTask}
          />
        )}
        {view === 'month' && (
          <MonthViewWrapper
            viewDate={viewDate} tasks={tasks} sessions={sessions}
            onEdit={setEditingTask} onCreateAt={handleCreateAt}
            onDelete={deleteTask}
          />
        )}

        <UnscheduledPanel
          tasks={tasks}
          onEdit={setEditingTask}
          onDelete={deleteTask}
        />
      </div>

      {editingTask !== undefined && (
        <TaskForm
          task={editingTask}
          onClose={() => { setEditingTask(undefined); setNewTaskDatetime(undefined); }}
          initialDatetime={editingTask == null ? newTaskDatetime : undefined}
        />
      )}
      {showRecurrenceForm && (
        <RecurrenceForm onClose={() => setShowRecurrenceForm(false)} />
      )}
      {suspendDialog && (
        <CalSuspendDialog task={suspendDialog} onClose={() => setSuspendDialog(null)} onSave={t => handleSuspend(suspendDialog, t)} />
      )}
      {resumeDialog && (
        <CalResumeDialog task={resumeDialog} onClose={() => setResumeDialog(null)} onSave={t => handleResume(resumeDialog, t)} />
      )}
      {completeDialog && (
        <CalCompleteDialog task={completeDialog} onClose={() => setCompleteDialog(null)} onSave={(e, m) => handleComplete(completeDialog, e, m)} />
      )}
    </div>
  );
}
