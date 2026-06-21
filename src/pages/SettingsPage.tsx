import { useState, useMemo } from 'react';
import { Plus, Trash2, CreditCard as Edit2, Check, X, Bell, BellOff, Search, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import type { TaskCategory } from '../lib/types';
import { sortCategoriesByColor } from '../lib/utils';

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

// ─── 分類追加ダイアログ ─────────────────────────────────────────────────────────
function CreateCategoryDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('分類名を入力してください');
      return;
    }
    setSaving(true);
    const ok = await onCreate(name.trim(), color);
    setSaving(false);
    if (ok) {
      onClose();
    } else {
      setError('保存に失敗しました。再度お試しください。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">分類を追加</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">分類名</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="分類名を入力"
              className="form-input w-full mt-1"
              autoFocus
            />
            {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
          </div>

          <div>
            <label className="form-label">色</label>
            <div className="flex items-center gap-1.5 mt-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full flex-shrink-0 transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              キャンセル
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {saving ? '追加中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── メイン ────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { categories, createCategory, updateCategory, deleteCategory } = useTasks();
  const { user, updateAccount } = useAuth();
  const sortedCategories = useMemo(() => sortCategoriesByColor(categories), [categories]);

  // ダイアログ
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // 編集
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // フィルタ
  const [colorFilter, setColorFilter] = useState<string | null>(PRESET_COLORS[0]);
  const [keyword, setKeyword] = useState('');

  // 一括削除
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // 通知
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | null>(
    'Notification' in window ? Notification.permission : null
  );
  const [notifMessage, setNotifMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  // アカウント情報変更
  const [emailValue, setEmailValue] = useState(user?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAccountSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountMessage(null);

    const emailChanged = emailValue.trim() !== (user?.email ?? '');
    const passwordChanged = newPassword.length > 0;

    if (!emailChanged && !passwordChanged) {
      setAccountMessage({ type: 'error', text: '変更内容がありません' });
      return;
    }
    if (passwordChanged && newPassword.length < 6) {
      setAccountMessage({ type: 'error', text: 'パスワードは6文字以上で入力してください' });
      return;
    }
    if (passwordChanged && newPassword !== confirmPassword) {
      setAccountMessage({ type: 'error', text: '新しいパスワードと確認用パスワードが一致しません' });
      return;
    }

    setAccountSaving(true);
    const fields: { email?: string; password?: string } = {};
    if (emailChanged) fields.email = emailValue.trim();
    if (passwordChanged) fields.password = newPassword;

    const { error } = await updateAccount(fields);
    setAccountSaving(false);

    if (error) {
      setAccountMessage({ type: 'error', text: `更新に失敗しました：${error.message}` });
    } else {
      setNewPassword('');
      setConfirmPassword('');
      setAccountMessage({ type: 'success', text: 'アカウント情報を更新しました' });
    }
  };

  const filteredCategories = useMemo(() => {
    return sortedCategories.filter(cat => {
      if (colorFilter && cat.color !== colorFilter) return false;
      if (keyword.trim() && !cat.name.toLowerCase().includes(keyword.trim().toLowerCase())) return false;
      return true;
    });
  }, [sortedCategories, colorFilter, keyword]);

  const handleCreate = async (name: string, color: string): Promise<boolean> => {
    const result = await createCategory({ name, color });
    return result !== null;
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    await Promise.all([...selectedIds].map(id => deleteCategory(id)));
    setSelectedIds(new Set());
    setIsSelecting(false);
    setConfirmBulkDelete(false);
  };

  const requestNotification = async () => {
    if (!('Notification' in window)) return;
    setNotifMessage(null);
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
    if (perm === 'denied') {
      setNotifMessage({ type: 'error', text: 'ブラウザに通知がブロックされています。ブラウザのサイト設定から通知を「許可」に変更してください。' });
    }
  };

  const revokeNotification = () => {
    setNotifMessage({ type: 'info', text: '通知の取り消しはブラウザの設定から行ってください。アドレスバー左のサイト情報アイコン（🔒 または ⓘ）をクリックし、「通知」を「ブロック」に変更してください。' });
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-3 py-3 sm:px-6 sm:py-6 space-y-4 sm:space-y-8">

        {/* ─── アカウント情報 ─────────────────────────────────────── */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">アカウント情報</h2>
          </div>

          <form onSubmit={handleAccountSave} className="space-y-5">
            {/* メールアドレス */}
            <div>
              <label className="form-label flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />メールアドレス
              </label>
              <input
                type="email"
                value={emailValue}
                onChange={e => { setEmailValue(e.target.value); setAccountMessage(null); }}
                className="form-input w-full mt-1"
              />
            </div>

            {/* 新しいパスワード */}
            <div>
              <label className="form-label flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-400" />新しいパスワード
              </label>
              <div className="relative mt-1">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setAccountMessage(null); }}
                  placeholder="変更する場合のみ入力"
                  className="form-input w-full pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* パスワード確認 */}
            <div>
              <label className="form-label flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-400" />パスワード（確認）
              </label>
              <div className="relative mt-1">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setAccountMessage(null); }}
                  placeholder="新しいパスワードを再入力"
                  className="form-input w-full pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* メッセージ */}
            {accountMessage && (
              <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-xs leading-relaxed ${accountMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                <span className="flex-1">{accountMessage.text}</span>
                <button type="button" onClick={() => setAccountMessage(null)} className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex justify-stretch sm:justify-end">
              <button type="submit" disabled={accountSaving} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {accountSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </section>
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">タスク分類の管理</h2>

          {/* フィルタ行 */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {/* 色フィルタ */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">色：</span>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorFilter(prev => prev === c ? null : c)}
                  title={c}
                  className={`w-7 h-7 sm:w-5 sm:h-5 rounded-full flex-shrink-0 transition-transform ${colorFilter === c ? 'scale-110 ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-900' : 'opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              {colorFilter && (
                <button
                  type="button"
                  onClick={() => setColorFilter(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* キーワード検索 */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="分類名で検索"
                className="form-input py-1 text-xs flex-1"
              />
              {keyword && (
                <button type="button" onClick={() => setKeyword('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ボタン行（追加 + 一括削除） */}
          <div className="flex flex-wrap items-center justify-end gap-2 mb-3 min-h-[44px]">
            {!isSelecting && (
              <button
                type="button"
                onClick={() => setShowCreateDialog(true)}
                className="btn-primary flex items-center gap-1.5 text-xs py-1"
              >
                <Plus className="w-3.5 h-3.5" />追加
              </button>
            )}

            {!isSelecting ? (
              <button
                type="button"
                onClick={() => { setIsSelecting(true); setSelectedIds(new Set()); setConfirmBulkDelete(false); }}
                className="btn-primary flex items-center gap-1.5 text-xs py-1 bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />一括削除
              </button>
            ) : confirmBulkDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">{selectedIds.size}件を削除します</span>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1 border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />確定
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(false)}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1"
                >
                  <X className="w-3.5 h-3.5" />戻る
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">{selectedIds.size}件選択中</span>
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(true)}
                  disabled={selectedIds.size === 0}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1 border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />削除する
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSelecting(false); setSelectedIds(new Set()); setConfirmBulkDelete(false); }}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1"
                >
                  <X className="w-3.5 h-3.5" />キャンセル
                </button>
              </div>
            )}
          </div>

          {/* カテゴリ一覧 */}
          <div className="space-y-2">
            {filteredCategories.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                {categories.length === 0 ? '分類がありません' : '条件に一致する分類がありません'}
              </p>
            )}
            {filteredCategories.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                {isSelecting && editId !== cat.id && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(cat.id)}
                    onChange={() => toggleSelect(cat.id)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                  />
                )}
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
                    {!isSelecting && (
                      <>
                        <button onClick={() => startEdit(cat)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteCategory(cat.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">ブラウザ通知</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            タスクの開始・終了予定時刻にブラウザ通知を受け取ります。
          </p>

          {notifStatus === null ? (
            <p className="text-sm text-gray-400">このブラウザは通知に対応していません</p>
          ) : notifStatus === 'granted' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Bell className="w-4 h-4" />
                通知が許可されています
              </div>
              <button onClick={revokeNotification} className="btn-secondary flex items-center gap-1.5">
                <BellOff className="w-3.5 h-3.5" />
                許可しない
              </button>
            </div>
          ) : notifStatus === 'denied' ? (
            <div className="space-y-3">
              <p className="text-sm text-red-500 dark:text-red-400">通知がブロックされています。</p>
              <button onClick={requestNotification} className="btn-primary flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" />
                許可する
              </button>
            </div>
          ) : (
            <button onClick={requestNotification} className="btn-primary flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              許可する
            </button>
          )}

          {notifMessage && (
            <div className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-xs leading-relaxed ${notifMessage.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'}`}>
              <span className="flex-1">{notifMessage.text}</span>
              <button onClick={() => setNotifMessage(null)} className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>
      </div>

      {showCreateDialog && (
        <CreateCategoryDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
