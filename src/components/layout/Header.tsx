import { Sun, Moon, LogOut, Bell } from 'lucide-react';
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

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-base font-semibold text-gray-900 dark:text-white">
        {PAGE_TITLES[currentPage] ?? 'タスクマネージャー'}
      </h1>

      <div className="flex items-center gap-2">
        <button
          onClick={requestNotificationPermission}
          title="通知を許可"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{user?.email}</span>
        <button
          onClick={signOut}
          title="ログアウト"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
