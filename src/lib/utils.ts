import type { Task, TaskCategory } from './types';

/** hex色コード → 色相(0-360) */
function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return h * 360;
}

/** 分類リストを色相順（似た色が隣り合う）でソートして返す */
export function sortCategoriesByColor(categories: TaskCategory[]): TaskCategory[] {
  return [...categories].sort((a, b) => hexToHue(a.color) - hexToHue(b.color));
}

export function formatDate(date: string | null, includeTime = false): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const opts: Intl.DateTimeFormatOptions = includeTime
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: '2-digit', day: '2-digit' };
  return d.toLocaleString('ja-JP', opts);
}

export function toLocalDatetimeValue(date: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function buildTree(tasks: Task[]): Task[] {
  const map = new Map<string, Task>();
  const roots: Task[] = [];

  tasks.forEach(t => {
    map.set(t.id, { ...t, children: [] });
  });

  map.forEach(task => {
    if (task.parent_task_id && map.has(task.parent_task_id)) {
      const parent = map.get(task.parent_task_id)!;
      parent.children = parent.children || [];
      parent.children.push(task);
    } else {
      roots.push(task);
    }
  });

  return roots;
}

export function exportToCSV(tasks: Task[]): void {
  const headers = ['タスク名', '分類', '難易度', '数量', '所要時間(分)', '開始予定', '終了予定', 'ステータス', '完了日時', '実績時間(分)', '実績メモ', '備考'];
  const rows = tasks.map(t => [
    t.title,
    t.category?.name ?? '',
    String(t.difficulty),
    String(t.quantity),
    String(t.time_per_unit),
    t.scheduled_start ? formatDate(t.scheduled_start, true) : '',
    t.scheduled_end ? formatDate(t.scheduled_end, true) : '',
    t.status === 'not_started' ? '未着手' : t.status === 'in_progress' ? '進行中' : '完了',
    t.completed_at ? formatDate(t.completed_at, true) : '',
    String(t.actual_time),
    t.actual_memo,
    t.notes,
  ]);

  const csv = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface TextExportFields {
  taskName: boolean;
  status: boolean;
  timeRange: boolean;
  duration: boolean;
  startFactor: boolean;
  durationFactor: boolean;
  remarks: boolean;
  actualMemo: boolean;
}

export const DEFAULT_TEXT_EXPORT_FIELDS: TextExportFields = {
  taskName: true,
  status: true,
  timeRange: false,
  duration: true,
  startFactor: false,
  durationFactor: false,
  remarks: true,
  actualMemo: true,
};

export function exportTodayTasksAsText(tasks: Task[], dateStr: string, fields: TextExportFields = DEFAULT_TEXT_EXPORT_FIELDS): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  const formatTime = (iso: string | null): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatMins = (mins: number): string => {
    if (!mins || mins <= 0) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}時間${m > 0 ? m + '分' : ''}` : `${m}分`;
  };

  const statusLabel: Record<string, string> = {
    not_started: '未着手',
    in_progress: '進行中',
    suspended: '中断',
    completed: '完了',
  };

  const lines: string[] = [];
  lines.push(`■ 当日タスク実績レポート（${dateStr}）`);
  lines.push('─'.repeat(48));

  const dayStart = new Date(dateStr + 'T00:00:00');
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const todayTasks = tasks.filter(t => {
    const starts = [t.actual_start, t.scheduled_start].filter(Boolean) as string[];
    return starts.some(s => {
      const d = new Date(s);
      return d >= dayStart && d < dayEnd;
    });
  });

  if (todayTasks.length === 0) {
    lines.push('（対象タスクなし）');
    return lines.join('\n');
  }

  todayTasks.forEach((t, i) => {
    if (fields.taskName) {
      lines.push(`【${i + 1}】${t.title}`);
    } else {
      lines.push(`【${i + 1}】`);
    }

    if (fields.status) {
      lines.push(`  ステータス    : ${statusLabel[t.status] ?? t.status}`);
    }

    if (fields.timeRange) {
      const sessions = t.sessions ?? [];
      if (sessions.length > 0) {
        const sessionStrs = sessions.map(s => {
          const start = formatTime(s.session_start);
          const end = s.session_end ? formatTime(s.session_end) : '—';
          return `${start}〜${end}`;
        });
        lines.push(`  作業時間帯    : ${sessionStrs.join(' / ')}`);
      } else {
        const start = formatTime(t.actual_start ?? t.scheduled_start);
        const end = t.actual_end
          ? formatTime(t.actual_end)
          : t.status === 'suspended' && t.suspended_at
            ? `${formatTime(t.suspended_at)}（中断）`
            : '—';
        lines.push(`  開始〜終了    : ${start} 〜 ${end}`);
      }
    }

    if (fields.duration) {
      const actualMins = t.actual_time > 0 ? t.actual_time : (() => {
        if (t.actual_start && t.actual_end) {
          return Math.round((new Date(t.actual_end).getTime() - new Date(t.actual_start).getTime()) / 60000);
        }
        return 0;
      })();
      const plannedMins = t.quantity * t.time_per_unit;
      lines.push(`  所要時間      : ${formatMins(actualMins)}（予定: ${formatMins(plannedMins)}）`);
    }

    if (fields.startFactor) {
      const startFactorLabel = t.start_delay_factor ? `遅延: ${t.start_delay_factor}` : t.start_early_factor ? `前倒し: ${t.start_early_factor}` : null;
      lines.push(`  前倒し/遅延要因: ${startFactorLabel ?? '—'}`);
    }

    if (fields.durationFactor) {
      const durFactorLabel = t.duration_over_factor ? `超過: ${t.duration_over_factor}` : t.duration_short_factor ? `短縮: ${t.duration_short_factor}` : null;
      lines.push(`  見積差異要因  : ${durFactorLabel ?? '—'}`);
    }

    if (fields.remarks) {
      const remarks = t.notes && t.notes.trim() ? t.notes.trim() : '—';
      lines.push(`  予定メモ      : ${remarks}`);
    }

    if (fields.actualMemo) {
      const actualMemo = t.actual_memo && t.actual_memo.trim() ? t.actual_memo.trim() : '—';
      lines.push(`  実績メモ      : ${actualMemo}`);
    }

    if (i < todayTasks.length - 1) lines.push('');
  });

  lines.push('─'.repeat(48));
  return lines.join('\n');
}

export function scheduleNotification(task: Task): void {
  if (task.status === 'completed') return;
  if (!task.scheduled_start && !task.scheduled_end) return;
  if (!('Notification' in window)) return;

  const schedule = (dateStr: string, label: string) => {
    const time = new Date(dateStr).getTime() - Date.now();
    if (time > 0 && time < 7 * 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification(`タスク: ${task.title}`, { body: label });
        }
      }, time);
    }
  };

  if (task.scheduled_start) schedule(task.scheduled_start, '開始予定時刻になりました');
  if (task.scheduled_end) schedule(task.scheduled_end, '終了予定時刻になりました');
}

export function getTotalMinutes(task: Task): number {
  return task.quantity * task.time_per_unit;
}

/**
 * 子タスクを持つ親タスクかどうかを判定する。
 * tasks は全タスクリスト。
 */
export function hasChildTasks(taskId: string, allTasks: Task[]): boolean {
  return allTasks.some(t => t.parent_task_id === taskId);
}

/**
 * 工数集計用のタスクリストを返す。
 * 子タスクを持つ親タスクは除外し、そのかわり子タスクを含める。
 * これにより「子タスクの合計 = 親タスクの工数」というルールを集計側で自動実現する。
 */
export function getWorkloadTaskList(allTasks: Task[]): Task[] {
  const childParentIds = new Set(
    allTasks.filter(t => t.parent_task_id !== null).map(t => t.parent_task_id!)
  );
  return allTasks.filter(t => {
    // 子タスクを持つ親タスクは除外
    if (t.parent_task_id === null && childParentIds.has(t.id)) return false;
    return true;
  });
}

/** 工数計算用の有効分数を返す。
 * 完了タスク: 実績時間 > 0 ならそれを使用、なければ予定時間
 * 未完了タスク: 予定時間（scheduled_start〜scheduled_end の差分）
 */
export function getWorkloadMins(task: Task): number {
  if (task.status === 'completed') {
    if (task.actual_time > 0) return task.actual_time;
  }
  if (task.scheduled_start && task.scheduled_end) {
    const diff = new Date(task.scheduled_end).getTime() - new Date(task.scheduled_start).getTime();
    return Math.max(0, diff / 60000);
  }
  return 0;
}

/**
 * 指定日（dayDate）における工数分数を返す。日をまたぐタスクは当日分だけをカウント。
 * 完了タスク: 実績時間を使用（実績がない場合は予定時間）
 * 未完了タスク: 予定時間
 */
export function getWorkloadMinsForDay(task: Task, dayDate: Date, sessions?: import('./types').TaskSession[]): number {
  const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // セッションデータがある場合は、当日に重なるセッションの作業時間を正確に合計する
  const taskSessions = sessions?.filter(s => s.task_id === task.id) ?? [];
  if (taskSessions.length > 0 && (task.status === 'completed' || task.status === 'suspended' || task.status === 'in_progress')) {
    const sorted = [...taskSessions].sort((a, b) => new Date(a.session_start).getTime() - new Date(b.session_start).getTime());
    let totalMins = 0;
    for (const s of sorted) {
      const sStart = new Date(s.session_start);
      // session_end が null の場合は actual_end または actual_time で補完
      let sEnd: Date;
      if (s.session_end) {
        sEnd = new Date(s.session_end);
      } else if (task.actual_end) {
        sEnd = new Date(task.actual_end);
      } else if (task.actual_time > 0) {
        sEnd = new Date(sStart.getTime() + task.actual_time * 60000);
      } else {
        continue;
      }
      // 当日にクリップ
      const cStart = sStart < dayStart ? dayStart : sStart;
      const cEnd = sEnd > dayEnd ? dayEnd : sEnd;
      if (cEnd > cStart) totalMins += (cEnd.getTime() - cStart.getTime()) / 60000;
    }
    return Math.round(totalMins);
  }

  // セッションなし: actual_start/actual_end または scheduled で計算
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if ((task.status === 'completed' || task.status === 'suspended' || task.status === 'in_progress') && task.actual_start) {
    rangeStart = new Date(task.actual_start);
    if (task.actual_end) {
      rangeEnd = new Date(task.actual_end);
    } else if (task.status === 'suspended' && task.suspended_at) {
      rangeEnd = new Date(task.suspended_at);
    } else if (task.actual_time > 0) {
      rangeEnd = new Date(rangeStart.getTime() + task.actual_time * 60000);
    } else if (task.scheduled_end) {
      rangeEnd = new Date(task.scheduled_end);
    }
  } else if (task.status === 'suspended' && task.suspended_at) {
    // actual_start がなくても suspended_at がある場合は scheduled_start〜suspended_at で計算
    rangeStart = task.scheduled_start ? new Date(task.scheduled_start) : null;
    rangeEnd = new Date(task.suspended_at);
  }

  // 実績なしの場合は予定で計算
  if (!rangeStart) {
    if (!task.scheduled_start) return 0;
    rangeStart = new Date(task.scheduled_start);
    if (task.scheduled_end) rangeEnd = new Date(task.scheduled_end);
  }

  // 当日にクリップ
  const clippedStart = rangeStart < dayStart ? dayStart : rangeStart;
  const clippedEnd = rangeEnd
    ? (rangeEnd > dayEnd ? dayEnd : rangeEnd)
    : new Date(clippedStart.getTime() + 60 * 60000);

  if (clippedEnd <= clippedStart) return 0;
  const clippedMins = (clippedEnd.getTime() - clippedStart.getTime()) / 60000;

  // actual_time が記録されていてタスクが複数日にまたがる場合、gross比率で按分
  if (task.actual_time > 0 && rangeEnd) {
    const grossTotalMins = (rangeEnd.getTime() - rangeStart!.getTime()) / 60000;
    if (grossTotalMins > 0 && grossTotalMins !== clippedMins) {
      return Math.round(task.actual_time * (clippedMins / grossTotalMins));
    }
    if (grossTotalMins === clippedMins) return task.actual_time;
  }

  return clippedMins;
}
