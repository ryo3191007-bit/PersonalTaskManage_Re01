import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TaskProvider } from './contexts/TaskContext';
import LoginPage from './pages/LoginPage';
import TaskListPage from './pages/TaskListPage';
import CalendarPage from './pages/CalendarPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import RecurrenceGroupsPage from './pages/RecurrenceGroupsPage';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

type Page = 'list' | 'calendar' | 'analytics' | 'settings' | 'recurrence';

function AppShell() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('list');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (page) {
      case 'list': return <TaskListPage />;
      case 'recurrence': return <RecurrenceGroupsPage />;
      case 'calendar': return <CalendarPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'settings': return <SettingsPage />;
    }
  };

  return (
    <TaskProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        <Sidebar
          currentPage={page}
          onNavigate={p => setPage(p as Page)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header currentPage={page} />
          {renderPage()}
        </div>
      </div>
    </TaskProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
