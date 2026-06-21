import { useState } from 'react';
import { Plus, RefreshCw, Pencil, Trash2, ChevronRight, Calendar, Clock } from 'lucide-react';
import { useTasks } from '../contexts/TaskContext';
import type { RecurrenceGroup } from '../lib/types';
import { PRIORITY_LABELS } from '../lib/types';
import RecurrenceForm from '../components/tasks/RecurrenceForm';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function recurrenceLabel(group: RecurrenceGroup): string {
  if (group.recurrence_type === 'daily') return '毎日';
  const days = (group.days_of_week ?? []).map(d => DAY_LABELS[d]).join('・');
  return `毎週 ${days}`;
}

function periodLabel(group: RecurrenceGroup): string {
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${y}/${m}/${day}`;
  };
  return `${fmt(group.period_start)} 〜 ${fmt(group.period_end)}`;
}

function timeLabel(group: RecurrenceGroup): string {
  if (!group.end_time) return group.start_time;
  return `${group.start_time} 〜 ${group.end_time}${group.ends_next_day ? '（翌日）' : ''}`;
}

interface GroupCardProps {
  group: RecurrenceGroup;
  pendingCount: number;
  onEdit: (g: RecurrenceGroup) => void;
  onDelete: (g: RecurrenceGroup) => void;
  onBulkUpdate: (g: RecurrenceGroup) => void;
}

function GroupCard({ group, pendingCount, onEdit, onDelete, onBulkUpdate }: GroupCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <RefreshCw className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{group.title}</h3>
              {group.category && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium text-white"
                  style={{ backgroundColor: group.category.color }}
                >
                  {group.category.name}
                </span>
              )}
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${priorityColors[group.priority]}`}>
                {PRIORITY_LABELS[group.priority]}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                {recurrenceLabel(group)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeLabel(group)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {periodLabel(group)}
              </span>
            </div>

          </div>
        </div>

        <div className="flex items-center justify-end gap-1 flex-shrink-0">
          {pendingCount > 0 && (
            <button
              onClick={() => onBulkUpdate(group)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              一括更新
            </button>
          )}
          <button
            onClick={() => onEdit(group)}
            className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete(group)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
              >
                削除
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                戻る
              </button>
            </div>
          )}
        </div>
      </div>

      {group.notes && (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-3 line-clamp-2">
          {group.notes}
        </p>
      )}
    </div>
  );
}

interface BulkUpdateDialogProps {
  group: RecurrenceGroup;
  onClose: () => void;
  onConfirm: () => void;
  pendingCount: number;
}

function BulkUpdateDialog({ group, onClose, onConfirm, pendingCount }: BulkUpdateDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">未完了タスクを一括更新</h3>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 space-y-1.5">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{group.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            未完了の {pendingCount} 件のタスクに対して、現在のグループ設定（タイトル・分類・優先度・備考）を適用します。
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            完了済みのタスクは変更されません。
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button
            onClick={onConfirm}
            className="btn-primary flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            一括更新する
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecurrenceGroupsPage() {
  const { recurrenceGroups, tasks, deleteRecurrenceGroup, bulkUpdateTasksForGroup } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RecurrenceGroup | null>(null);
  const [bulkUpdateTarget, setBulkUpdateTarget] = useState<RecurrenceGroup | null>(null);

  const handleDelete = async (group: RecurrenceGroup) => {
    await deleteRecurrenceGroup(group.id);
  };

  const handleBulkUpdate = async () => {
    if (!bulkUpdateTarget) return;
    await bulkUpdateTasksForGroup(bulkUpdateTarget);
    setBulkUpdateTarget(null);
  };

  const getGroupStats = (groupId: string) => {
    const groupTasks = tasks.filter(t => t.recurrence_group_id === groupId);
    return {
      pending: groupTasks.filter(t => t.status !== 'completed').length,
    };
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-3 py-3 sm:px-6 sm:py-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">定常タスク管理</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              定常タスクの一括登録・設定変更ができます
            </p>
          </div>
          <button
            onClick={() => { setEditingGroup(null); setShowForm(true); }}
            className="btn-primary flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="w-3.5 h-3.5" />
            新規定常タスク
          </button>
        </div>

        {recurrenceGroups.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-7 h-7 text-teal-500 dark:text-teal-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">繰り返しグループがありません</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
              朝の会議など定常タスクをまとめて登録できます
            </p>
            <button
              onClick={() => { setEditingGroup(null); setShowForm(true); }}
              className="btn-primary flex items-center gap-1.5 mx-auto bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-3.5 h-3.5" />
              最初のグループを作成
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recurrenceGroups.map(group => {
              const stats = getGroupStats(group.id);
              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  pendingCount={stats.pending}
                  onEdit={g => { setEditingGroup(g); setShowForm(true); }}
                  onDelete={handleDelete}
                  onBulkUpdate={g => setBulkUpdateTarget(g)}
                />
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <RecurrenceForm
          group={editingGroup}
          onClose={() => { setShowForm(false); setEditingGroup(null); }}
        />
      )}

      {bulkUpdateTarget && (
        <BulkUpdateDialog
          group={bulkUpdateTarget}
          pendingCount={getGroupStats(bulkUpdateTarget.id).pending}
          onClose={() => setBulkUpdateTarget(null)}
          onConfirm={handleBulkUpdate}
        />
      )}
    </div>
  );
}
