import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Task, TaskCategory, RecurrenceGroup, TaskSession } from '../lib/types';
import { useAuth } from './AuthContext';
import {
  cancelTaskNotifications,
  clearAllTaskNotifications,
  scheduleNotification,
  syncTaskNotifications,
} from '../lib/utils';
import { addJstDays, getJstDateKey, getJstWeekday, jstDateTimeToIso } from '../lib/dateTime';

interface TaskContextValue {
  tasks: Task[];
  categories: TaskCategory[];
  recurrenceGroups: RecurrenceGroup[];
  sessions: TaskSession[];
  loading: boolean;
  refetch: () => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  createCategory: (cat: Partial<TaskCategory>) => Promise<TaskCategory | null>;
  updateCategory: (id: string, cat: Partial<TaskCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  createRecurrenceGroup: (group: Partial<RecurrenceGroup>) => Promise<RecurrenceGroup | null>;
  updateRecurrenceGroup: (id: string, group: Partial<RecurrenceGroup>) => Promise<void>;
  deleteRecurrenceGroup: (id: string) => Promise<void>;
  bulkCreateTasksForGroup: (group: RecurrenceGroup) => Promise<void>;
  bulkUpdateTasksForGroup: (group: RecurrenceGroup) => Promise<void>;
  suspendTask: (task: Task, suspendedAt: string) => Promise<void>;
  resumeTask: (task: Task, resumedAt: string) => Promise<void>;
  updateSession: (id: string, fields: { session_start?: string; session_end?: string | null }) => Promise<void>;
  createSession: (taskId: string, sessionStart: string, sessionEnd: string | null) => Promise<TaskSession | null>;
  deleteSession: (id: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextValue>({
  tasks: [], categories: [], recurrenceGroups: [], sessions: [], loading: false,
  refetch: async () => {},
  createTask: async () => null,
  updateTask: async () => {},
  deleteTask: async () => {},
  createCategory: async () => null,
  updateCategory: async () => {},
  deleteCategory: async () => {},
  createRecurrenceGroup: async () => null,
  updateRecurrenceGroup: async () => {},
  deleteRecurrenceGroup: async () => {},
  bulkCreateTasksForGroup: async () => {},
  bulkUpdateTasksForGroup: async () => {},
  suspendTask: async () => {},
  resumeTask: async () => {},
  updateSession: async () => {},
  createSession: async () => null,
  deleteSession: async () => {},
});

/** グループ設定からJST暦日の対象日一覧を生成（開始日・終了日を含む）。 */
export function generateDateKeys(group: RecurrenceGroup): string[] {
  const dates: string[] = [];
  let current = group.period_start;
  while (current && current <= group.period_end) {
    const dow = getJstWeekday(current);
    if (group.recurrence_type === 'daily') {
      dates.push(current);
    } else if (group.recurrence_type === 'weekly' && dow !== null && group.days_of_week?.includes(dow)) {
      dates.push(current);
    }
    current = addJstDays(current, 1);
  }
  return dates;
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [recurrenceGroups, setRecurrenceGroups] = useState<RecurrenceGroup[]>([]);
  const [sessions, setSessions] = useState<TaskSession[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: tasksData }, { data: catsData }, { data: groupsData }, { data: sessionsData }] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, category:task_categories(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('task_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name'),
      supabase
        .from('recurrence_groups')
        .select('*, category:task_categories(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('task_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('session_start', { ascending: true }),
    ]);
    const fetchedTasks = (tasksData as Task[]) ?? [];
    setTasks(fetchedTasks);
    setCategories(catsData ?? []);
    setRecurrenceGroups((groupsData as RecurrenceGroup[]) ?? []);
    setSessions((sessionsData as TaskSession[]) ?? []);
    syncTaskNotifications(fetchedTasks);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
    return () => clearAllTaskNotifications();
  }, [refetch]);

  const createTask = async (task: Partial<Task>): Promise<Task | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('tasks')
      .insert({ ...task, user_id: user.id } as Task)
      .select('*, category:task_categories(*)')
      .single();
    if (data) {
      setTasks(prev => [data as Task, ...prev]);
      scheduleNotification(data as Task);
      return data as Task;
    }
    return null;
  };

  const updateTask = async (id: string, task: Partial<Task>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(task as Task)
      .eq('id', id)
      .select('*, category:task_categories(*)')
      .single();
    if (error) throw error;
    if (data) {
      const updatedTask = data as Task;
      const nextTasks = tasks.map(t => t.id === id ? updatedTask : t);
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      scheduleNotification(updatedTask);

      if (updatedTask.status === 'completed' && updatedTask.parent_task_id) {
        const parent = nextTasks.find(t => t.id === updatedTask.parent_task_id);
        const children = nextTasks.filter(t => t.parent_task_id === updatedTask.parent_task_id);
        const shouldCompleteParent =
          parent &&
          parent.status !== 'completed' &&
          children.length > 0 &&
          children.every(t => t.status === 'completed');

        if (shouldCompleteParent) {
          const completedAt = parent.completed_at ?? updatedTask.completed_at ?? new Date().toISOString();
          const { data: parentData, error: parentError } = await supabase
            .from('tasks')
            .update({ status: 'completed', completed_at: completedAt } as Partial<Task>)
            .eq('id', parent.id)
            .select('*, category:task_categories(*)')
            .single();
          if (parentError) throw parentError;
          if (parentData) {
            const completedParent = parentData as Task;
            setTasks(prev => prev.map(t => t.id === parent.id ? completedParent : t));
            scheduleNotification(completedParent);
          }
        }
      }
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    cancelTaskNotifications(id);
    setTasks(prev => prev
      .filter(t => t.id !== id)
      .map(t => t.parent_task_id === id ? { ...t, parent_task_id: null } : t)
    );
    setSessions(prev => prev.filter(s => s.task_id !== id));
  };

  const createCategory = async (cat: Partial<TaskCategory>): Promise<TaskCategory | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('task_categories')
      .insert({ ...cat, user_id: user.id } as TaskCategory)
      .select()
      .single();
    if (data) setCategories(prev => [...prev, data]);
    return data ?? null;
  };

  const updateCategory = async (id: string, cat: Partial<TaskCategory>) => {
    const { data } = await supabase
      .from('task_categories')
      .update(cat as TaskCategory)
      .eq('id', id)
      .select()
      .single();
    if (data) setCategories(prev => prev.map(c => c.id === id ? data : c));
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('task_categories').delete().eq('id', id);
    if (error) throw error;
    setCategories(prev => prev.filter(c => c.id !== id));
    setTasks(prev => prev.map(t => t.category_id === id ? { ...t, category_id: null, category: null } : t));
    setRecurrenceGroups(prev => prev.map(g => g.category_id === id ? { ...g, category_id: null, category: null } : g));
  };

  const createRecurrenceGroup = async (group: Partial<RecurrenceGroup>): Promise<RecurrenceGroup | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('recurrence_groups')
      .insert({ ...group, user_id: user.id } as RecurrenceGroup)
      .select('*, category:task_categories(*)')
      .single();
    if (data) {
      setRecurrenceGroups(prev => [data as RecurrenceGroup, ...prev]);
      return data as RecurrenceGroup;
    }
    return null;
  };

  const updateRecurrenceGroup = async (id: string, group: Partial<RecurrenceGroup>) => {
    const { data } = await supabase
      .from('recurrence_groups')
      .update(group as RecurrenceGroup)
      .eq('id', id)
      .select('*, category:task_categories(*)')
      .single();
    if (data) {
      setRecurrenceGroups(prev => prev.map(g => g.id === id ? data as RecurrenceGroup : g));
    }
  };

  const deleteRecurrenceGroup = async (id: string) => {
    const deletedTaskIds = tasks
      .filter(t => t.recurrence_group_id === id)
      .map(t => t.id);
    const { error: tasksError } = await supabase.from('tasks').delete().eq('recurrence_group_id', id);
    if (tasksError) throw tasksError;
    const { error: groupError } = await supabase.from('recurrence_groups').delete().eq('id', id);
    if (groupError) throw groupError;
    deletedTaskIds.forEach(cancelTaskNotifications);
    setRecurrenceGroups(prev => prev.filter(g => g.id !== id));
    setTasks(prev => prev.filter(t => t.recurrence_group_id !== id));
    setSessions(prev => prev.filter(s => !deletedTaskIds.includes(s.task_id)));
  };

  /** グループの設定に基づきタスクを一括生成 */
  const bulkCreateTasksForGroup = async (group: RecurrenceGroup) => {
    if (!user) return;
    const dates = generateDateKeys(group);
    if (dates.length === 0) return;

    const inserts = dates.map(dateStr => {
      const scheduledStart = jstDateTimeToIso(`${dateStr}T${group.start_time}`);
      const endDateStr = group.ends_next_day ? addJstDays(dateStr, 1) : dateStr;
      const scheduledEnd = group.end_time
        ? jstDateTimeToIso(`${endDateStr}T${group.end_time}`)
        : null;
      return {
        user_id: user.id,
        title: group.title,
        category_id: group.category_id,
        priority: group.priority,
        difficulty: 0,
        quantity: 1,
        time_per_unit: 0,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        parent_task_id: null,
        notes: group.notes,
        status: 'not_started' as const,
        track_actual: group.track_actual ?? true,
        actual_time: 0,
        actual_memo: '',
        recurrence_group_id: group.id,
      };
    });

    const { data } = await supabase
      .from('tasks')
      .insert(inserts)
      .select('*, category:task_categories(*)');
    if (data) {
      setTasks(prev => [...(data as Task[]), ...prev]);
      (data as Task[]).forEach(t => scheduleNotification(t));
    }
  };

  /** グループの未完了タスクを一括更新 */
  const bulkUpdateTasksForGroup = async (group: RecurrenceGroup) => {
    const targetTasks = tasks.filter(t => t.recurrence_group_id === group.id && t.status !== 'completed');
    if (targetTasks.length === 0) return;

    await Promise.all(targetTasks.map(task => {
      const dateKey = task.scheduled_start ? getJstDateKey(task.scheduled_start) : '';
      const scheduledStart = dateKey ? jstDateTimeToIso(`${dateKey}T${group.start_time}`) : task.scheduled_start;
      const endDateKey = dateKey && group.ends_next_day ? addJstDays(dateKey, 1) : dateKey;
      const scheduledEnd = group.end_time && endDateKey
        ? jstDateTimeToIso(`${endDateKey}T${group.end_time}`)
        : null;
      return supabase.from('tasks').update({
        title: group.title,
        category_id: group.category_id,
        priority: group.priority,
        notes: group.notes,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
      } as Task).eq('id', task.id);
    }));
    // カテゴリJOINが必要なので refetch で最新データを取得
    await refetch();
  };

  /**
   * タスクを中断する。
   * 1. 現在のセッション（session_end=null）を suspendedAt で閉じる
   * 2. tasks.status = 'suspended', suspended_at = suspendedAt
   * 3. scheduled_start / scheduled_end は変更しない
   * 4. actual_time に今セッションの作業分を加算
   */
  const suspendTask = async (task: Task, suspendedAt: string) => {
    if (!user) return;

    // 現在進行中のセッションを閉じる
    const openSession = sessions.find(s => s.task_id === task.id && s.session_end === null);
    if (openSession) {
      const { data: updatedSession } = await supabase
        .from('task_sessions')
        .update({ session_end: suspendedAt })
        .eq('id', openSession.id)
        .select()
        .maybeSingle();
      if (updatedSession) {
        setSessions(prev => prev.map(s => s.id === openSession.id ? updatedSession as TaskSession : s));
      }
    }

    // 今セッションの作業時間（分）を計算
    const sessionStart = openSession?.session_start ?? task.actual_start;
    const sessionMins = sessionStart
      ? Math.max(0, Math.round((new Date(suspendedAt).getTime() - new Date(sessionStart).getTime()) / 60000))
      : 0;
    const newActualTime = (task.actual_time ?? 0) + sessionMins;

    // scheduled_start / scheduled_end は変更しない（予定は原本を保持）
    await updateTask(task.id, {
      status: 'suspended',
      suspended_at: suspendedAt,
      actual_time: newActualTime,
    });
  };

  /**
   * 中断中のタスクを再開する。
   * 1. タスクに suspended_at があり、対応するセッション（session_end = suspended_at）が
   *    存在しない場合は、actual_start → suspended_at のセッションを補完作成する
   * 2. 新しいセッションを作成（session_start = resumedAt）
   * 3. scheduled_start / scheduled_end は変更しない（予定は原本を保持）
   * 4. tasks.status = 'in_progress', suspended_at = null
   */
  const resumeTask = async (task: Task, resumedAt: string) => {
    if (!user) return;

    // suspended_at に対応する session_end を持つセッションが存在しない場合、補完する
    if (task.suspended_at) {
      const existingSession = sessions.find(
        s => s.task_id === task.id && s.session_end === task.suspended_at
      );
      if (!existingSession) {
        const sessionStart = task.actual_start ?? task.suspended_at;
        const { data:補完Session } = await supabase
          .from('task_sessions')
          .insert({
            task_id: task.id,
            user_id: user.id,
            session_start: sessionStart,
            session_end: task.suspended_at,
          })
          .select()
          .maybeSingle();
        if (補完Session) {
          setSessions(prev => [...prev, 補完Session as TaskSession]);
        }
      }
    }

    // 新しいセッション作成
    const { data: newSession } = await supabase
      .from('task_sessions')
      .insert({
        task_id: task.id,
        user_id: user.id,
        session_start: resumedAt,
        session_end: null,
      })
      .select()
      .maybeSingle();
    if (newSession) {
      setSessions(prev => [...prev, newSession as TaskSession]);
    }

    // scheduled_start / scheduled_end は変更しない（予定は原本を保持）
    await updateTask(task.id, {
      status: 'in_progress',
      suspended_at: null,
    });
  };

  const createSession = async (taskId: string, sessionStart: string, sessionEnd: string | null): Promise<TaskSession | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('task_sessions')
      .insert({ task_id: taskId, user_id: user.id, session_start: sessionStart, session_end: sessionEnd })
      .select()
      .maybeSingle();
    if (data) {
      setSessions(prev => [...prev, data as TaskSession]);
      return data as TaskSession;
    }
    return null;
  };

  const updateSession = async (id: string, fields: { session_start?: string; session_end?: string | null }) => {
    const { data } = await supabase
      .from('task_sessions')
      .update(fields)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (data) {
      setSessions(prev => prev.map(s => s.id === id ? data as TaskSession : s));
    }
  };

  const deleteSession = async (id: string) => {
    await supabase.from('task_sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <TaskContext.Provider value={{
      tasks, categories, recurrenceGroups, sessions, loading, refetch,
      createTask, updateTask, deleteTask,
      createCategory, updateCategory, deleteCategory,
      createRecurrenceGroup, updateRecurrenceGroup, deleteRecurrenceGroup,
      bulkCreateTasksForGroup, bulkUpdateTasksForGroup,
      suspendTask, resumeTask, updateSession, createSession, deleteSession,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export const useTasks = () => useContext(TaskContext);
