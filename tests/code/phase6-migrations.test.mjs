import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const migrationsDir = join(repoRoot, 'supabase', 'migrations');

const expectedMigrations = [
  ['TC-CB-223', '20260507120154_create_tasks_schema.sql', [/CREATE TABLE IF NOT EXISTS task_categories/i, /CREATE TABLE IF NOT EXISTS tasks/i]],
  ['TC-CB-224', '20260507124519_add_actual_times_to_tasks.sql', [/actual_start/i, /actual_end/i]],
  ['TC-CB-225', '20260507132400_fix_difficulty_check_allow_zero.sql', [/tasks_difficulty_check/i, /difficulty >= 0 AND difficulty <= 5/i]],
  ['TC-CB-226', '20260507135810_fix_update_updated_at_search_path.sql', [/CREATE OR REPLACE FUNCTION public\.update_updated_at/i, /SET search_path = ''/i]],
  ['TC-CB-227', '20260507142514_add_priority_to_tasks.sql', [/ADD COLUMN priority/i, /CHECK \(priority IN \('low', 'medium', 'high'\)\)/i]],
  ['TC-CB-228', '20260508015438_add_estimate_factors_to_tasks.sql', [/start_delay_factor/i, /duration_short_factor/i]],
  ['TC-CB-229', '20260508033304_add_track_actual_to_tasks.sql', [/ADD COLUMN track_actual boolean NOT NULL DEFAULT true/i]],
  ['TC-CB-230', '20260508034739_add_recurrence_groups.sql', [/CREATE TABLE IF NOT EXISTS recurrence_groups/i, /ADD COLUMN recurrence_group_id uuid REFERENCES recurrence_groups\(id\) ON DELETE SET NULL/i]],
  ['TC-CB-231', '20260508040152_add_track_actual_to_recurrence_groups.sql', [/recurrence_groups/i, /ADD COLUMN track_actual boolean NOT NULL DEFAULT true/i]],
  ['TC-CB-232', '20260508052021_fix_update_recurrence_groups_updated_at_security.sql', [/REVOKE EXECUTE ON FUNCTION public\.update_recurrence_groups_updated_at\(\) FROM PUBLIC/i, /FROM authenticated/i]],
  ['TC-CB-233', '20260512115920_add_task_sessions_and_suspended_status.sql', [/CREATE TABLE IF NOT EXISTS task_sessions/i, /'suspended'/i]],
  ['TC-CB-234', '20260621093000_add_recurrence_ends_next_day.sql', [/ADD COLUMN IF NOT EXISTS ends_next_day boolean NOT NULL DEFAULT false/i]],
];

const idempotencyChecks = [
  ['TC-CB-235', '20260507120154_create_tasks_schema.sql', /CREATE TABLE IF NOT EXISTS/i],
  ['TC-CB-236', '20260507124519_add_actual_times_to_tasks.sql', /IF NOT EXISTS[\s\S]*actual_start[\s\S]*IF NOT EXISTS[\s\S]*actual_end/i],
  ['TC-CB-237', '20260507132400_fix_difficulty_check_allow_zero.sql', /DROP CONSTRAINT IF EXISTS tasks_difficulty_check/i],
  ['TC-CB-238', '20260507135810_fix_update_updated_at_search_path.sql', /CREATE OR REPLACE FUNCTION public\.update_updated_at/i],
  ['TC-CB-239', '20260507142514_add_priority_to_tasks.sql', /IF NOT EXISTS[\s\S]*column_name = 'priority'/i],
  ['TC-CB-240', '20260508015438_add_estimate_factors_to_tasks.sql', /IF NOT EXISTS[\s\S]*start_delay_factor[\s\S]*duration_short_factor/i],
  ['TC-CB-241', '20260508033304_add_track_actual_to_tasks.sql', /IF NOT EXISTS[\s\S]*column_name = 'track_actual'/i],
  ['TC-CB-242', '20260508034739_add_recurrence_groups.sql', /CREATE TABLE IF NOT EXISTS recurrence_groups[\s\S]*ADD COLUMN recurrence_group_id/i],
  ['TC-CB-243', '20260508040152_add_track_actual_to_recurrence_groups.sql', /IF NOT EXISTS[\s\S]*recurrence_groups[\s\S]*track_actual/i],
  ['TC-CB-244', '20260508052021_fix_update_recurrence_groups_updated_at_security.sql', /REVOKE EXECUTE ON FUNCTION public\.update_recurrence_groups_updated_at\(\)/i],
  ['TC-CB-245', '20260512115920_add_task_sessions_and_suspended_status.sql', /DROP CONSTRAINT IF EXISTS tasks_status_check[\s\S]*CREATE TABLE IF NOT EXISTS task_sessions/i],
  ['TC-CB-246', '20260621093000_add_recurrence_ends_next_day.sql', /ADD COLUMN IF NOT EXISTS ends_next_day/i],
];

const fkAndCheckCases = [
  ['TC-CB-247', /user_id uuid NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/i, 'task_categories user FK cascades on auth user delete'],
  ['TC-CB-248', /category_id uuid REFERENCES task_categories\(id\) ON DELETE SET NULL/i, 'tasks category FK is set null'],
  ['TC-CB-249', /parent_task_id uuid REFERENCES tasks\(id\) ON DELETE SET NULL/i, 'parent task FK is set null'],
  ['TC-CB-250', /recurrence_group_id uuid REFERENCES recurrence_groups\(id\) ON DELETE SET NULL/i, 'recurrence group FK is set null'],
  ['TC-CB-251', /task_id uuid NOT NULL REFERENCES tasks\(id\) ON DELETE CASCADE/i, 'task_sessions task FK cascades'],
  ['TC-CB-252', /status IN \('not_started', 'in_progress', 'completed', 'suspended'\)/i, 'status check includes suspended'],
  ['TC-CB-253', /tasks_difficulty_check CHECK \(difficulty >= 0 AND difficulty <= 5\)/i, 'difficulty check accepts 0..5'],
  ['TC-CB-254', /CHECK \(priority IN \('low', 'medium', 'high'\)\)/i, 'priority check accepts finite priority values'],
];

const tablePolicyNames = {
  tasks: 'tasks',
  task_categories: 'categories',
  task_sessions: 'sessions',
  recurrence_groups: 'recurrence groups',
};

let migrationNames;
let migrationSqlByName;
let allSql;

async function loadMigrations() {
  if (migrationSqlByName) return;
  migrationNames = (await readdir(migrationsDir)).filter(name => name.endsWith('.sql')).sort();
  migrationSqlByName = new Map();
  const chunks = [];
  for (const name of migrationNames) {
    const sql = await readFile(join(migrationsDir, name), 'utf8');
    migrationSqlByName.set(name, sql);
    chunks.push(`-- ${name}\n${sql}`);
  }
  allSql = chunks.join('\n\n');
}

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ');
}

function assertPolicy(table, action, checkWithCheck) {
  const label = tablePolicyNames[table];
  const normalized = normalizeSql(allSql);
  assert.match(normalized, new RegExp(`CREATE POLICY \"Users can ${action} own ${label}\"\\s+ON ${table} FOR ${action.toUpperCase()}\\s+TO authenticated`, 'i'));
  if (action === 'insert') {
    assert.match(normalized, new RegExp(`ON ${table} FOR INSERT[\\s\\S]*WITH CHECK \\(auth\\.uid\\(\\) = user_id\\)`, 'i'));
  } else if (checkWithCheck) {
    assert.match(normalized, new RegExp(`ON ${table} FOR UPDATE[\\s\\S]*USING \\(auth\\.uid\\(\\) = user_id\\)[\\s\\S]*WITH CHECK \\(auth\\.uid\\(\\) = user_id\\)`, 'i'));
  } else {
    assert.match(normalized, new RegExp(`ON ${table} FOR ${action.toUpperCase()}[\\s\\S]*USING \\(auth\\.uid\\(\\) = user_id\\)`, 'i'));
  }
}

for (const [tc, fileName, patterns] of expectedMigrations) {
  test(`${tc} TD069 TV069 TA014 migration ${fileName} exists and contains expected schema change`, async () => {
    await loadMigrations();
    assert.ok(migrationNames.includes(fileName));
    const sql = migrationSqlByName.get(fileName);
    for (const pattern of patterns) assert.match(sql, pattern);
  });
}

for (const [tc, fileName, pattern] of idempotencyChecks) {
  test(`${tc} TD070 TV070 TA014 migration ${fileName} has static idempotency guard`, async () => {
    await loadMigrations();
    assert.match(migrationSqlByName.get(fileName), pattern);
  });
}

for (const [tc, pattern, intent] of fkAndCheckCases) {
  test(`${tc} TD072 TV072 TA014 FK/CHECK ${intent}`, async () => {
    await loadMigrations();
    assert.match(allSql, pattern);
  });
}

[
  ['TC-CB-289', 'tasks', 'select'],
  ['TC-CB-290', 'tasks', 'update'],
  ['TC-CB-291', 'tasks', 'delete'],
  ['TC-CB-292', 'task_categories', 'select'],
  ['TC-CB-293', 'task_categories', 'update'],
  ['TC-CB-294', 'task_categories', 'delete'],
  ['TC-CB-295', 'task_sessions', 'select'],
  ['TC-CB-296', 'task_sessions', 'update'],
  ['TC-CB-297', 'task_sessions', 'delete'],
  ['TC-CB-298', 'recurrence_groups', 'select'],
  ['TC-CB-299', 'recurrence_groups', 'update'],
  ['TC-CB-300', 'recurrence_groups', 'delete'],
].forEach(([tc, table, action]) => {
  test(`${tc} TD003 TV003 TA001 ${table} ${action} policy restricts access to auth.uid user_id`, async () => {
    await loadMigrations();
    assertPolicy(table, action, action === 'update');
  });
});

[
  ['TC-CB-310', 'tasks', 'insert'],
  ['TC-CB-311', 'tasks', 'update'],
  ['TC-CB-312', 'tasks', 'rls'],
  ['TC-CB-313', 'task_categories', 'insert'],
  ['TC-CB-314', 'task_categories', 'update'],
  ['TC-CB-315', 'task_categories', 'rls'],
  ['TC-CB-316', 'task_sessions', 'insert'],
  ['TC-CB-317', 'task_sessions', 'update'],
  ['TC-CB-318', 'task_sessions', 'rls'],
  ['TC-CB-319', 'recurrence_groups', 'insert'],
  ['TC-CB-320', 'recurrence_groups', 'update'],
  ['TC-CB-321', 'recurrence_groups', 'rls'],
].forEach(([tc, table, action]) => {
  test(`${tc} TD071 TV071 TA014 ${table} RLS ${action} is defined for authenticated owner isolation`, async () => {
    await loadMigrations();
    if (action === 'rls') {
      assert.match(allSql, new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`, 'i'));
      return;
    }
    assertPolicy(table, action, action === 'update');
  });
});
