import { useState } from 'react';
import { Sun, Moon, LogOut, Bell, BellOff, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_TITLES: Record<string, string> = {
  list: 'タスク一覧',
  recurrence: '定常タスク管理',
  calendar: 'カレンダー',
  analytics: '分析',
  settings: '設定',
};

interface HeaderProps {
  currentPage: string;
}

export default function Header({ currentPage }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | null>(
    'Notification' in window ? Notification.permission : null
  );
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  const handleBellClick = async () => {
    if (!('Notification' in window)) return;
    setNotifMsg(null);
    const current = Notification.permission;
    if (current === 'granted') {
      setNotifMsg('通知の取り消しはブラウザの設定から行ってください。アドレスバー左のサイト情報アイコン（🔒 または ⓘ）をクリックし、「通知」を「ブロック」に変更してください。');
    } else {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
      if (perm === 'denied') {
        setNotifMsg('ブラウザに通知がブロックされています。ブラウザのサイト設定から通知を「許可」に変更してください。');
      }
    }
  };

  const isGranted = notifPerm === 'granted';

  return (
    <header className="h-12 sm:h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 sm:px-6 flex-shrink-0 relative">
      <h1 className="min-w-0 truncate pr-2 text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
        {PAGE_TITLES[currentPage] ?? 'タスクマネージャー'}
      </h1>

      <div className="flex items-center gap-0.5 sm:gap-2">
        <button
          onClick={handleBellClick}
          title={isGranted ? '通知を許可しない' : '通知を許可する'}
          className={`w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors ${isGranted ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          {isGranted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
          className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{user?.email}</span>
        <button
          onClick={signOut}
          title="ログアウト"
          className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {notifMsg && (
        <div className="absolute top-full inset-x-3 sm:left-auto sm:right-4 mt-2 z-50 sm:w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 flex items-start gap-2">
          <p className="flex-1 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{notifMsg}</p>
          <button onClick={() => setNotifMsg(null)} className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors mt-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
}
