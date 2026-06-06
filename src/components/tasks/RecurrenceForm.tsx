import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Check, RefreshCw, History } from 'lucide-react';
import { loadTitleHistory, saveTitleHistory } from './titleHistory';
import { sortCategoriesByColor } from '../../lib/utils';
import type { RecurrenceGroup, TaskPriority, RecurrenceType } from '../../lib/types';
import { useTasks } from '../../contexts/TaskContext';

interface RecurrenceFormProps {
  group?: RecurrenceGroup | null;
  onClose: () => void;
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const defaultForm = {
  title: '',
  category_id: '',
  priority: 'medium' as TaskPriority,
  start_time: '09:00',
  end_time: '',
  recurrence_type: 'daily' as RecurrenceType,
  days_of_week: [] as number[],
  period_start: '',
  period_end: '',
  notes: '',
  track_actual: true,
};

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addMonthStr(base: string, months: number) {
  const d = new Date(base + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function countDates(form: typeof defaultForm): number {
  if (!form.period_start || !form.period_end) return 0;
  const start = new Date(form.period_start + 'T00:00:00');
  const end = new Date(form.period_end + 'T00:00:00');
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (form.recurrence_type === 'daily') {
      count++;
    } else if (form.recurrence_type === 'weekly' && form.days_of_week.includes(cur.getDay())) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function RecurrenceForm({ group, onClose }: RecurrenceFormProps) {
  const { categories: rawCategories, createRecurrenceGroup, updateRecurrenceGroup, bulkCreateTasksForGroup } = useTasks();
  const categories = useMemo(() => sortCategoriesByColor(rawCategories), [rawCategories]);
  const [form, setForm] = useState({ ...defaultForm });
  const [loading, setLoading] = useState(false);
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
    const today = todayStr();
    if (group) {
      setForm({
        title: group.title,
        category_id: group.category_id ?? '',
        priority: group.priority,
        start_time: group.start_time,
        end_time: group.end_time ?? '',
        recurrence_type: group.recurrence_type,
        days_of_week: group.days_of_week ?? [],
        period_start: group.period_start,
        period_end: group.period_end,
        notes: group.notes,
        track_actual: group.track_actual ?? true,
      });
    } else {
      setForm(prev => ({
        ...prev,
        period_start: today,
        period_end: addMonthStr(today, 1),
      }));
    }
  }, [group]);

  const set = <K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleDay = (dow: number) => {
    setForm(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(dow)
        ? prev.days_of_week.filter(d => d !== dow)
        : [...prev.days_of_week, dow].sort(),
    }));
  };

  const previewCount = countDates(form);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.period_start || !form.period_end) return;
    if (form.recurrence_type === 'weekly' && form.days_of_week.length === 0) return;
    setLoading(true);

    const payload: Partial<RecurrenceGroup> = {
      title: form.title.trim(),
      category_id: form.category_id || null,
      priority: form.priority,
      start_time: form.start_time,
      end_time: form.end_time || null,
      recurrence_type: form.recurrence_type,
      days_of_week: form.recurrence_type === 'weekly' ? form.days_of_week : null,
      period_start: form.period_start,
      period_end: form.period_end,
      notes: form.notes,
      track_actual: form.track_actual,
    };

    if (form.title.trim()) saveTitleHistory(form.title.trim());

    if (group) {
      await updateRecurrenceGroup(group.id, payload);
    } else {
      const created = await createRecurrenceGroup(payload);
      if (created) {
        await bulkCreateTasksForGroup(created);
      }
    }

    setLoading(false);
    onClose();
  };

  const isWeekly = form.recurrence_type === 'weekly';
  const canSubmit = form.title.trim() && form.period_start && form.period_end &&
    (!isWeekly || form.days_of_week.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {group ? '繰り返しグループを編集' : '繰り返しタスクを登録'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
                placeholder="例：朝の会議"
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

          <div className="grid grid-cols-2 gap-4">
            {/* 分類 */}
            <div>
              <label className="form-label">分類</label>
              <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className="form-input">
                <option value="">分類なし</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* 優先度 */}
            <div>
              <label className="form-label">優先度</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value as TaskPriority)} className="form-input">
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>

          {/* 時刻 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">開始時刻 <span className="text-red-500">*</span></label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label">終了時刻</label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* 繰り返し種別 */}
          <div>
            <label className="form-label">繰り返し</label>
            <div className="flex gap-2 mt-1">
              {(['daily', 'weekly'] as RecurrenceType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set('recurrence_type', type)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    form.recurrence_type === type
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {type === 'daily' ? '毎日' : '曜日指定'}
                </button>
              ))}
            </div>
          </div>

          {/* 曜日指定 */}
          {isWeekly && (
            <div>
              <label className="form-label">曜日 <span className="text-red-500">*</span></label>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {DAY_LABELS.map((label, dow) => {
                  const selected = form.days_of_week.includes(dow);
                  const isSun = dow === 0;
                  const isSat = dow === 6;
                  return (
                    <button
                      key={dow}
                      type="button"
                      onClick={() => toggleDay(dow)}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-colors border ${
                        selected
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : isSun
                          ? 'border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : isSat
                          ? 'border-blue-200 dark:border-blue-800 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 期間 */}
          <div>
            <label className="form-label">登録期間 <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="date"
                value={form.period_start}
                onChange={e => set('period_start', e.target.value)}
                className="form-input flex-1"
                required
              />
              <span className="text-sm text-gray-400">〜</span>
              <input
                type="date"
                value={form.period_end}
                min={form.period_start}
                onChange={e => set('period_end', e.target.value)}
                className="form-input flex-1"
                required
              />
            </div>
            {previewCount > 0 && (
              <p className="mt-1.5 text-xs text-teal-600 dark:text-teal-400 font-medium">
                {previewCount} 件のタスクが{group ? '対象（未完了のみ更新）' : '作成されます'}
              </p>
            )}
            {isWeekly && form.days_of_week.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">曜日を1つ以上選択してください</p>
            )}
          </div>

          {/* 備考 */}
          <div>
            <label className="form-label">備考</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="form-input resize-none"
              placeholder="備考を入力"
            />
          </div>

          {/* 実績入力 */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">実績入力あり</span>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">開始・終了時刻の実績を記録します</p>
            </div>
            <button
              type="button"
              onClick={() => set('track_actual', !form.track_actual)}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${form.track_actual ? 'bg-teal-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.track_actual ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {!group && (
            <div className="rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 p-3">
              <p className="text-xs text-teal-700 dark:text-teal-300 leading-relaxed">
                登録後は「繰り返しグループ管理」から設定変更・未完了タスクの一括更新ができます。
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">キャンセル</button>
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="btn-primary flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {group ? '設定を更新' : `${previewCount} 件を一括登録`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
