# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build       # production build (Vite)
npm run dev         # dev server (do NOT start — handled externally)
npm run typecheck   # TypeScript type-check without emitting
npm run lint        # ESLint
```

There are no automated tests in this project.

---

## Architecture Overview

Single-page React + TypeScript app backed by Supabase (Postgres + Auth). All UI is in Japanese.

### State Management

Three React contexts wrap the entire app (`App.tsx`):

| Context | File | Responsibility |
|---|---|---|
| `ThemeContext` | `src/contexts/ThemeContext.tsx` | light/dark toggle, persisted to localStorage + CSS class on `<html>` |
| `AuthContext` | `src/contexts/AuthContext.tsx` | Supabase email/password auth; exposes `user`, `session`, `signIn`, `signUp`, `signOut` |
| `TaskContext` | `src/contexts/TaskContext.tsx` | All data: tasks, categories, recurrence groups. Full CRUD + bulk ops. **Single source of truth.** |

`TaskContext` is the most complex piece. Key behaviors:
- `generateDates(group)` builds the date array for recurrence rules (daily / weekly with `days_of_week` filter)
- `bulkCreateTasksForGroup()` creates all task instances after a group is saved
- `bulkUpdateTasksForGroup()` updates **only uncompleted** child tasks from group settings
- Changing `track_actual` on a group propagates to its uncompleted tasks
- `scheduleNotification()` is called on task load/create for browser push notifications

### Navigation

Routing is purely state-based — no router library. `App.tsx` holds `currentPage` and passes `onNavigate` down. Pages: `list` | `recurrence` | `calendar` | `analytics` | `settings`.

### Page → Component map

- **TaskListPage** — main list with filter bar, CSV export, inline status controls, subtask tree. Opens `TaskForm` or `RecurrenceForm` as modals.
- **RecurrenceGroupsPage** — manage recurrence groups. Each card shows pending count and has "一括更新" (bulk update uncompleted tasks).
- **CalendarPage** — day / week / month views with time-grid. Click a time slot to open `TaskForm` pre-filled with that datetime. Also has "+ 新規定常タスク" / "+ 新規タスク" buttons in the header.
- **AnalyticsPage** — three tabs: Overview, Start Timing Analysis, Duration Analysis. Heavy `useMemo` usage. Only counts tasks where `track_actual = true` and `parent_task_id = null` in workload graphs.
- **SettingsPage** — category CRUD with color picker, notification permission.

### Key data model facts

- `Task.track_actual` (bool) — gates whether the task appears in analytics and whether actual-time fields are shown in the form.
- `Task.parent_task_id` — self-referencing FK. `buildTree()` in `utils.ts` assembles tree structure. Analytics only counts root tasks (`parent_task_id = null`).
- `Task.recurrence_group_id` — set on auto-generated tasks. Orphaned (set to NULL) when group is deleted.
- `RecurrenceGroup.days_of_week` — `int[]` (0 = Sunday … 6 = Saturday). `null` when `recurrence_type = 'daily'`.
- All factor fields (`start_delay_factor`, `start_early_factor`, `duration_over_factor`, `duration_short_factor`) are nullable strings chosen from constant arrays in `types.ts`.

### Styling conventions

Tailwind CSS with `darkMode: 'class'`. Custom utility classes defined in `src/index.css`:

```
.form-label    — label above inputs
.form-input    — standard text/select input
.btn-primary   — blue filled button (override bg color for teal variant: add bg-teal-600 hover:bg-teal-700)
.btn-secondary — white/outlined button
```

The "新規定常タスク" button uses `btn-primary bg-teal-600 hover:bg-teal-700` everywhere for visual consistency.

### Utility functions (`src/lib/utils.ts`)

- `buildTree(tasks)` — nest tasks by `parent_task_id`
- `getWorkloadMinsForDay(task, dayDate)` — clips a multi-day task's duration to a single day; used in both `CalendarPage` day-view workload bar and `AnalyticsPage` daily chart
- `exportToCSV(tasks)` — BOM-prefixed download for Excel/Japanese compatibility
- `scheduleNotification(task)` — browser Notification API, max 7-day lookahead

### localStorage keys

| Key | Used by |
|---|---|
| `theme` | ThemeContext |
| `workHoursPerDay` | `useWorkHours` hook (day-view work-hours limit, default 8h) |

### Database migrations (in order)

1. `20260507120154_create_tasks_schema.sql` — `task_categories`, `tasks` tables + RLS + trigger
2. `20260507124519_add_actual_times_to_tasks.sql` — `actual_start`, `actual_end` columns
3. `20260507132400_fix_difficulty_check_allow_zero.sql` — difficulty constraint fix
4. `20260507135810_fix_update_updated_at_search_path.sql` — trigger search_path security
5. `20260507142514_add_priority_to_tasks.sql` — `priority` column
6. `20260508015438_add_estimate_factors_to_tasks.sql` — factor + `track_actual` columns
7. `20260508033304_add_track_actual_to_tasks.sql` — `track_actual` default fix
8. `20260508034739_add_recurrence_groups.sql` — `recurrence_groups` table + `recurrence_group_id` on tasks
9. `20260508040152_add_track_actual_to_recurrence_groups.sql` — `track_actual` on groups
10. `20260508052021_fix_update_recurrence_groups_updated_at_security.sql` — trigger security fix

All tables have RLS enabled; every policy uses `auth.uid()` to restrict access to the owning user.
