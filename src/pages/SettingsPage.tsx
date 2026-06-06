import { useState, useMemo } from 'react';
import { Plus, Trash2, CreditCard as Edit2, Check, X } from 'lucide-react';
import { useTasks } from '../contexts/TaskContext';
import type { TaskCategory } from '../lib/types';
import { sortCategoriesByColor } from '../lib/utils';

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

export default function SettingsPage() {
  const { categories, createCategory, updateCategory, deleteCategory } = useTasks();
  const sortedCategories = useMemo(() => sortCategoriesByColor(categories), [categories]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | null>(
    'Notification' in window ? Notification.permission : null
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createCategory({ name: newName.trim(), color: newColor });
    setNewName('');
  };

  const startEdit = (cat: TaskCategory) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return;
    await updateCategory(editId, { name: editName.trim(), color: editColor });
    setEditId(null);
  };

  const cancelEdit = () => setEditId(null);

  const requestNotification = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-8">
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">タスク分類の管理</h2>

          <form onSubmit={handleCreate} className="flex items-center gap-2 mb-5">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="分類名を入力"
              className="form-input flex-1"
            />
            <div className="flex gap-1">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full flex-shrink-0 transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button type="submit" className="btn-primary flex items-center gap-1.5 flex-shrink-0">
              <Plus className="w-3.5 h-3.5" />
              追加
            </button>
          </form>

          <div className="space-y-2">
            {categories.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">分類がありません</p>
            )}
            {sortedCategories.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                {editId === cat.id ? (
                  <>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: editColor }} />
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="form-input flex-1 py-1"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={`w-4 h-4 rounded-full flex-shrink-0 ${editColor === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button onClick={saveEdit} className="w-7 h-7 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={cancelEdit} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{cat.name}</span>
                    <button onClick={() => startEdit(cat)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteCategory(cat.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">ブラウザ通知</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            タスクの開始・終了予定時刻にブラウザ通知を受け取ります。通知を許可してください。
          </p>
          {notifStatus === null ? (
            <p className="text-sm text-gray-400">このブラウザは通知に対応していません</p>
          ) : notifStatus === 'granted' ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              通知が許可されています
            </div>
          ) : notifStatus === 'denied' ? (
            <p className="text-sm text-red-500 dark:text-red-400">通知がブロックされています。ブラウザの設定から許可してください。</p>
          ) : (
            <button onClick={requestNotification} className="btn-primary">
              通知を許可する
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
