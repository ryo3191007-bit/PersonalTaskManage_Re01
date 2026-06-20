export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'suspended';
export type TaskPriority = 'low' | 'medium' | 'high';
export type RecurrenceType = 'daily' | 'weekly';

export interface RecurrenceGroup {
  id: string;
  user_id: string;
  title: string;
  category_id: string | null;
  priority: TaskPriority;
  start_time: string;
  end_time: string | null;
  recurrence_type: RecurrenceType;
  days_of_week: number[] | null;
  period_start: string;
  period_end: string;
  notes: string;
  track_actual: boolean;
  created_at: string;
  updated_at: string;
  category?: TaskCategory | null;
}

export interface TaskCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  category_id: string | null;
  priority: TaskPriority;
  difficulty: number;
  quantity: number;
  time_per_unit: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  parent_task_id: string | null;
  notes: string;
  status: TaskStatus;
  completed_at: string | null;
  actual_start: string | null;
  actual_end: string | null;
  actual_time: number;
  actual_memo: string;
  suspended_at: string | null;
  start_delay_factor: string | null;
  start_early_factor: string | null;
  duration_over_factor: string | null;
  duration_short_factor: string | null;
  track_actual: boolean;
  recurrence_group_id: string | null;
  created_at: string;
  updated_at: string;
  category?: TaskCategory | null;
  children?: Task[];
  sessions?: TaskSession[];
}

export interface TaskSession {
  id: string;
  task_id: string;
  user_id: string;
  session_start: string;
  session_end: string | null;
  created_at: string;
}

type DatabaseRecord<T> = { [K in keyof T]: T[K] };

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: DatabaseRecord<Task>;
        Insert: DatabaseRecord<Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'category' | 'children' | 'sessions'>> & Pick<Task, 'user_id' | 'title'>>;
        Update: DatabaseRecord<Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'category' | 'children' | 'sessions'>>>;
        Relationships: [
          {
            foreignKeyName: 'tasks_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'task_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_parent_task_id_fkey';
            columns: ['parent_task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_recurrence_group_id_fkey';
            columns: ['recurrence_group_id'];
            referencedRelation: 'recurrence_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      task_categories: {
        Row: DatabaseRecord<TaskCategory>;
        Insert: DatabaseRecord<Partial<Omit<TaskCategory, 'id' | 'created_at'>> & Pick<TaskCategory, 'user_id' | 'name'>>;
        Update: DatabaseRecord<Partial<Omit<TaskCategory, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      task_sessions: {
        Row: DatabaseRecord<TaskSession>;
        Insert: DatabaseRecord<Partial<Omit<TaskSession, 'id' | 'created_at'>> & Pick<TaskSession, 'task_id' | 'user_id' | 'session_start'>>;
        Update: DatabaseRecord<Partial<Omit<TaskSession, 'id' | 'created_at'>>>;
        Relationships: [
          {
            foreignKeyName: 'task_sessions_task_id_fkey';
            columns: ['task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      recurrence_groups: {
        Row: DatabaseRecord<RecurrenceGroup>;
        Insert: DatabaseRecord<Partial<Omit<RecurrenceGroup, 'id' | 'created_at' | 'updated_at' | 'category'>> & Pick<RecurrenceGroup, 'user_id' | 'title'>>;
        Update: DatabaseRecord<Partial<Omit<RecurrenceGroup, 'id' | 'created_at' | 'updated_at' | 'category'>>>;
        Relationships: [
          {
            foreignKeyName: 'recurrence_groups_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'task_categories';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: '未着手',
  in_progress: '進行中',
  suspended: '中断',
  completed: '完了',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

export const DURATION_OVER_FACTORS = [
  '作業範囲の拡大',
  '予期しない問題の発生',
  '情報収集・調査に時間',
  '割り込み・中断',
  '見積が甘かった',
  '体調不良',
  'その他',
] as const;

export const DURATION_SHORT_FACTORS = [
  '作業範囲の縮小',
  '事前準備が十分だった',
  '並行作業で効率化',
  '過去経験の活用',
  '見積が大きすぎた',
  'その他',
] as const;

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: '★☆☆☆☆',
  2: '★★☆☆☆',
  3: '★★★☆☆',
  4: '★★★★☆',
  5: '★★★★★',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};
