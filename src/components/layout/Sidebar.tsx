import { NavLink } from '../NavLink';
import {
  LayoutDashboard, Calendar, BarChart2, Settings,
  CheckSquare, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems = [
  { id: 'list', label: 'タスク一覧', icon: LayoutDashboard },
  { id: 'recurrence', label: '定常タスク管理', icon: RefreshCw },
  { id: 'calendar', label: 'カレンダー', icon: Calendar },
  { id: 'analytics', label: '分析', icon: BarChart2 },
  { id: 'settings', label: '設定', icon: Settings },
];

export default function Sidebar({ currentPage, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <>
    <aside className={`relative hidden md:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
      <div className={`flex items-center gap-2.5 px-4 py-5 border-b border-gray-200 dark:border-gray-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
          <CheckSquare className="w-4 h-4 text-white" />
        </div>
        {!collapsed && <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">タスクマネージャー</span>}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={currentPage === item.id}
            collapsed={collapsed}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-16 w-6 h-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-gray-500" /> : <ChevronLeft className="w-3 h-3 text-gray-500" />}
      </button>
    </aside>

    <nav
      aria-label="メインナビゲーション"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-gray-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 md:hidden"
    >
      {navItems.map(item => {
        const Icon = item.icon;
        const active = currentPage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium transition-colors ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
            <span className="max-w-full truncate">{item.id === 'recurrence' ? '定常タスク' : item.label}</span>
          </button>
        );
      })}
    </nav>
    </>
  );
}
