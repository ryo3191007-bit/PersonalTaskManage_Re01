import { useState } from 'react';
import { CreditCard as Edit2, Trash2, Clock, Calendar, PauseCircle } from 'lucide-react';
import type { Task } from '../../lib/types';
import { formatDate, getTotalMinutes } from '../../lib/utils';
import { useTasks } from '../../contexts/TaskContext';

function fmtMins(mins: number): string {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  }
  return `${Math.round(mins)}m`;
}

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export default function TaskCard({ task, onEdit }: TaskCardProps) {
  const { deleteTask, sessions } = useTasks();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalMins = getTotalMinutes(task);
  const isCompleted = task.status === 'completed';
  const isSuspended = task.status === 'suspended';

  // セッション間の中断時間合計（分）
  const taskSessions = sessions
    .filter(s => s.task_id === task.id)
    .sort((a, b) => new Date(a.session_start).getTime() - new Date(b.session_start).getTime());
  let totalSuspendMins = 0;
  for (let i = 0; i < taskSessions.length - 1; i++) {
    const end = taskSessions[i].session_end;
    const next = taskSessions[i + 1].session_start;
    if (end && next) {
      totalSuspendMins += Math.max(0, Math.round(
        (new Date(next).getTime() - new Date(end).getTime()) / 60000
      ));
    }
  }
  // セッションが不完全（開始セッションなし）: actual_start より後に最初のセッションがある場合も補完
  if (taskSessions.length >= 1 && task.actual_start) {
    const firstStart = new Date(taskSessions[0].session_start);
    const actualStart = new Date(task.actual_start);
    if (firstStart > actualStart) {
      const alreadyCounted = taskSessions.length > 1; // 既にセッション間ギャップで計算済みの場合は重複しない
      if (!alreadyCounted) {
        totalSuspendMins += Math.max(0, Math.round(
          (firstStart.getTime() - actualStart.getTime()) / 60000
        ));
      }
    }
  }

  // 完了タスクの実績時間（開始〜終了 − 中断時間）
  const actualMins: number | null = isCompleted
    ? (() => {
        if (task.actual_start && task.actual_end) {
          const gross = Math.max(0, Math.round(
            (new Date(task.actual_end).getTime() - new Date(task.actual_start).getTime()) / 60000
          ));
          return Math.max(0, gross - totalSuspendMins);
        }
        if (task.actual_time > 0) return Math.max(0, task.actual_time - totalSuspendMins);
        if (task.scheduled_start && task.scheduled_end) {
          return Math.max(0, (new Date(task.scheduled_end).getTime() - new Date(task.scheduled_start).getTime()) / 60000);
        }
        return null;
      })()
    : null;

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteTask(task.id);
  };

  return (
    <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate min-w-0">{task.title}</span>
          {task.category && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium text-white flex-shrink-0"
              style={{ backgroundColor: task.category.color }}
            >
              {task.category.name}
            </span>
          )}
          {isSuspended && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 flex items-center gap-1 flex-shrink-0">
              <PauseCircle className="w-3 h-3" />中断中
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 mt-1 flex-wrap">
          {/* 所要時間：完了は実績（なければ予定）、未完了は予定 */}
          {isCompleted && actualMins !== null && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" />
              {fmtMins(actualMins)}
            </span>
          )}
          {!isCompleted && totalMins > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {fmtMins(totalMins)}
            </span>
          )}
          {/* 日時：完了は実績開始/終了（なければ予定）、中断中は開始〜中断時刻、未完了は予定 */}
          {isCompleted ? (
            (task.actual_start || task.scheduled_start) && (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 flex-wrap font-medium">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{formatDate(task.actual_start ?? task.scheduled_start, true)}</span>
                {(task.actual_end ?? task.scheduled_end) && (
                  <span>〜 {formatDate(task.actual_end ?? task.scheduled_end, true)}</span>
                )}
              </span>
            )
          ) : isSuspended ? (
            task.scheduled_start && (
              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 flex-wrap">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{formatDate(task.scheduled_start, true)}</span>
                {task.suspended_at && (
                  <span>〜 {formatDate(task.suspended_at, true)}</span>
                )}
              </span>
            )
          ) : (
            task.scheduled_start && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-wrap">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{formatDate(task.scheduled_start, true)}</span>
                {task.scheduled_end && (
                  <span>〜 {formatDate(task.scheduled_end, true)}</span>
                )}
              </span>
            )
          )}
          {task.difficulty > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {'★'.repeat(task.difficulty) + '☆'.repeat(5 - task.difficulty)}
            </span>
          )}
        </div>

        {task.notes && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{task.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onEdit(task)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          onBlur={() => setConfirmDelete(false)}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            confirmDelete
              ? 'text-white bg-red-500'
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
