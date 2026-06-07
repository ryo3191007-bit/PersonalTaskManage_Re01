import type { LucideIcon } from 'lucide-react';

interface NavLinkProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}

export function NavLink({ icon: Icon, label, active, collapsed, onClick }: NavLinkProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
      } ${collapsed ? 'justify-center' : ''}`}
    >
      <Icon className="w-4.5 h-4.5 flex-shrink-0 w-[18px] h-[18px]" />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
