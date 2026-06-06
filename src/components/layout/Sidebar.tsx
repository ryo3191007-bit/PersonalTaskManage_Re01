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
    <aside className={`relative flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
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
  );
}
