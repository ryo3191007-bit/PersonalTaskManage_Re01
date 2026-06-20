import { useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { TaskStatus, TaskPriority } from '../../lib/types';
import { useTasks } from '../../contexts/TaskContext';
import { sortCategoriesByColor } from '../../lib/utils';

interface TaskFiltersProps {
  statusFilter: TaskStatus | 'all';
  categoryFilter: string;
  dateFrom: string;
  dateTo: string;
  dateEndFrom: string;
  dateEndTo: string;
  priorityFilter: TaskPriority | 'all';
  keywordFilter: string;
  unscheduledOnly: boolean;
  onStatusChange: (s: TaskStatus | 'all') => void;
  onCategoryChange: (c: string) => void;
  onDateChange: (from: string, to: string) => void;
  onDateEndChange: (from: string, to: string) => void;
  onPriorityChange: (p: TaskPriority | 'all') => void;
  onKeywordChange: (k: string) => void;
  onUnscheduledOnlyChange: (v: boolean) => void;
}

export default function TaskFilters({
  statusFilter,
  categoryFilter,
  dateFrom,
  dateTo,
  dateEndFrom,
  dateEndTo,
  priorityFilter,
  keywordFilter,
  unscheduledOnly,
  onStatusChange,
  onCategoryChange,
  onDateChange,
  onDateEndChange,
  onPriorityChange,
  onKeywordChange,
  onUnscheduledOnlyChange,
}: TaskFiltersProps) {
  const { categories: rawCategories } = useTasks();
  const categories = useMemo(() => sortCategoriesByColor(rawCategories), [rawCategories]);
  const keywordRef = useRef<HTMLInputElement>(null);

  const selectCls = 'w-full text-sm md:text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 md:h-8';
  const labelCls = 'block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5';

  return (
    <div className="space-y-2">
      {/* 行1: ステータス・優先度・分類 */}
      <div className="grid grid-cols-3 items-end gap-2">
        <div className="flex-1">
          <span className={labelCls}>ステータス</span>
          <select
            value={statusFilter}
            onChange={e => onStatusChange(e.target.value as TaskStatus | 'all')}
            className={selectCls}
          >
            <option value="all">すべて</option>
            <option value="not_started">未着手</option>
            <option value="in_progress">進行中</option>
            <option value="suspended">中断</option>
            <option value="completed">完了</option>
          </select>
        </div>

        <div className="flex-1">
          <span className={labelCls}>優先度</span>
          <select
            value={priorityFilter}
            onChange={e => onPriorityChange(e.target.value as TaskPriority | 'all')}
            className={selectCls}
          >
            <option value="all">すべて</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>

        <div className="flex-1">
          <span className={labelCls}>分類</span>
          <select
            value={categoryFilter}
            onChange={e => onCategoryChange(e.target.value)}
            className={selectCls}
          >
            <option value="">すべて</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* 行2: キーワード・開始日・終了日 */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-2">
        <div className="min-w-0">
          <span className={labelCls}>キーワード</span>
          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 h-11 md:h-8">
            <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <input
              ref={keywordRef}
              type="text"
              value={keywordFilter}
              onChange={e => onKeywordChange(e.target.value)}
              placeholder="タイトル・メモ..."
              className="text-base md:text-xs bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400 flex-1 min-w-0"
            />
            {keywordFilter && (
              <button onClick={() => onKeywordChange('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <span className={labelCls}>予定開始日</span>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={e => onDateChange(e.target.value, dateTo)}
              className={selectCls}
            />
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">〜</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={e => onDateChange(dateFrom, e.target.value)}
              className={selectCls}
            />
            {(dateFrom || dateTo) ? (
              <button
                onClick={() => onDateChange('', '')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="w-3.5 flex-shrink-0" />
            )}
          </div>
        </div>

        <div className="min-w-0">
          <span className={labelCls}>予定終了日</span>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateEndFrom}
              onChange={e => onDateEndChange(e.target.value, dateEndTo)}
              className={selectCls}
            />
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">〜</span>
            <input
              type="date"
              value={dateEndTo}
              min={dateEndFrom}
              onChange={e => onDateEndChange(dateEndFrom, e.target.value)}
              className={selectCls}
            />
            {(dateEndFrom || dateEndTo) ? (
              <button
                onClick={() => onDateEndChange('', '')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="w-3.5 flex-shrink-0" />
            )}
          </div>
        </div>
      </div>

      {/* 行3: 予定未入力フィルタ */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={unscheduledOnly}
            onChange={e => onUnscheduledOnlyChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">予定未入力のタスクのみ表示</span>
        </label>
      </div>
    </div>
  );
}
