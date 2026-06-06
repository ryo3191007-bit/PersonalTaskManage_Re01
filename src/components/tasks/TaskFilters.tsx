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
  priorityFilter: TaskPriority | 'all';
  keywordFilter: string;
  onStatusChange: (s: TaskStatus | 'all') => void;
  onCategoryChange: (c: string) => void;
  onDateChange: (from: string, to: string) => void;
  onPriorityChange: (p: TaskPriority | 'all') => void;
  onKeywordChange: (k: string) => void;
}

export default function TaskFilters({
  statusFilter,
  categoryFilter,
  dateFrom,
  dateTo,
  priorityFilter,
  keywordFilter,
  onStatusChange,
  onCategoryChange,
  onDateChange,
  onPriorityChange,
  onKeywordChange,
}: TaskFiltersProps) {
  const { categories: rawCategories } = useTasks();
  const categories = useMemo(() => sortCategoriesByColor(rawCategories), [rawCategories]);
  const keywordRef = useRef<HTMLInputElement>(null);

  const selectCls = 'w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-8';

  return (
    <div className="space-y-2">
      {/* 行1: ステータス・優先度・分類 */}
      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={e => onStatusChange(e.target.value as TaskStatus | 'all')}
          className={selectCls}
        >
          <option value="all">ステータス: すべて</option>
          <option value="not_started">未着手</option>
          <option value="in_progress">進行中</option>
          <option value="suspended">中断</option>
          <option value="completed">完了</option>
        </select>

        <select
          value={priorityFilter}
          onChange={e => onPriorityChange(e.target.value as TaskPriority | 'all')}
          className={selectCls}
        >
          <option value="all">優先度: すべて</option>
          <option value="high">優先度: 高</option>
          <option value="medium">優先度: 中</option>
          <option value="low">優先度: 低</option>
        </select>

        <select
          value={categoryFilter}
          onChange={e => onCategoryChange(e.target.value)}
          className={selectCls}
        >
          <option value="">分類: すべて</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* 行2: キーワード・開始日〜終了日 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 h-8 flex-1">
          <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <input
            ref={keywordRef}
            type="text"
            value={keywordFilter}
            onChange={e => onKeywordChange(e.target.value)}
            placeholder="キーワード..."
            className="text-xs bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400 flex-1 min-w-0"
          />
          {keywordFilter && (
            <button onClick={() => onKeywordChange('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-1">
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
    </div>
  );
}
