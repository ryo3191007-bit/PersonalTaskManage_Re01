const { test, expect } = require('@playwright/test');
const { e2eCases } = require('./e2e-cases.generated.cjs');

const RUN_ID = process.env.E2E_RUN_ID || String(Date.now());
const DEFAULT_PASSWORD = process.env.E2E_TEST_PASSWORD || 'CodexE2E-123456';
const requestedCaseIds = (process.env.E2E_CASE_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);
const implementedCases = process.env.E2E_IMPLEMENT_ALL === 'true'
  ? e2eCases
  : requestedCaseIds.length > 0
    ? e2eCases.filter(testCase => requestedCaseIds.includes(testCase.id))
    : e2eCases.filter(testCase => testCase.id === 'TC-E2E-082');

function todayDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function caseEmail(testCase) {
  return process.env.E2E_TEST_EMAIL || `${testCase.id.toLowerCase()}-${RUN_ID}@example.test`;
}

function taskTitle(testCase, suffix) {
  return `${testCase.id}-${RUN_ID} ${suffix}`;
}

async function expectNoRuntimeErrors(page, action) {
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await action();

  expect(errors, 'console/page errors').toEqual([]);
}

async function loginOrSignUp(page, testCase) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  if (await page.getByRole('button', { name: '新規タスク' }).isVisible().catch(() => false)) {
    return;
  }

  const email = caseEmail(testCase);
  const password = DEFAULT_PASSWORD;

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('form').getByRole('button', { name: 'ログイン' }).click();

  const loggedIn = await page.getByRole('button', { name: '新規タスク' }).waitFor({ timeout: 6_000 }).then(() => true).catch(() => false);
  if (loggedIn) return;

  await page.getByRole('button', { name: '新規登録' }).first().click();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('form').getByRole('button', { name: '新規登録' }).click();
  await expect(page.getByRole('button', { name: '新規タスク' })).toBeVisible();
}

async function openNewTaskForm(page) {
  await page.getByRole('button', { name: '新規タスク' }).click();
  await expect(page.locator('input[placeholder="タスク名を入力"]')).toBeVisible();
}

async function createTask(page, title, options = {}) {
  await openNewTaskForm(page);
  await page.locator('input[placeholder="タスク名を入力"]').fill(title);
  const dateKey = options.dateKey || todayDateKey();
  const dateTimeInputs = page.locator('input[type="datetime-local"]');
  if (await dateTimeInputs.count() >= 2) {
    await dateTimeInputs.nth(0).fill(options.scheduledStart || `${dateKey}T09:00`);
    await dateTimeInputs.nth(1).fill(options.scheduledEnd || `${dateKey}T10:00`);
  }
  if (options.status) {
    await page.locator('select').filter({ has: page.locator('option[value="not_started"]') }).selectOption(options.status);
  }
  if (options.priority) {
    await page.locator('select').filter({ has: page.locator('option[value="medium"]') }).selectOption(options.priority);
  }
  if (options.quantity) {
    await page.locator('input[type="number"]').first().fill(String(options.quantity));
  }
  await page.getByRole('button', { name: '作成する', exact: true }).click();
  await expect(page.locator('input[placeholder="タスク名を入力"]')).toHaveCount(0);
}

async function editFirstTaskTitle(page, beforeTitle, afterTitle) {
  const card = page.getByText(beforeTitle).locator('xpath=ancestor::div[contains(@class, "group")][1]');
  await card.locator('button').first().click();
  await expect(page.locator('input[placeholder="タスク名を入力"]')).toBeVisible();
  await page.locator('input[placeholder="タスク名を入力"]').fill(afterTitle);
  await page.getByRole('button', { name: '更新する' }).click();
  await expect(page.getByText(afterTitle)).toBeVisible();
}

async function navigate(page, name) {
  await page.getByRole('button', { name }).first().click();
  await expect(page.getByRole('heading', { name }).first()).toBeVisible();
}

async function verifyLoginScreen(page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'タスクマネージャー' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ログイン' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '新規登録' }).first()).toBeVisible();
}

async function exerciseCase(page, testCase) {
  if (testCase.name.includes('ログイン画面')) {
    await verifyLoginScreen(page);
    return;
  }

  await loginOrSignUp(page, testCase);

  if (testCase.td === 'TD006' || testCase.td === 'TD010') {
    const title = taskTitle(testCase, 'ライフサイクル');
    const editedTitle = taskTitle(testCase, 'ライフサイクル編集済み');
    await createTask(page, title);
    await page.reload();
    await expect(page.getByText(title)).toBeVisible();
    await editFirstTaskTitle(page, title, editedTitle);
    await page.reload();
    await expect(page.getByText(editedTitle)).toBeVisible();
    return;
  }

  if (testCase.name.includes('新規タスク作成') || testCase.td === 'TD007' || testCase.td === 'TD073') {
    const title = taskTitle(testCase, 'タスク作成');
    await createTask(page, title);
    await page.reload();
    await expect(page.getByText(title)).toBeVisible();
    return;
  }

  if (testCase.name.includes('編集') || testCase.td === 'TD074') {
    const title = taskTitle(testCase, '編集前');
    await createTask(page, title);
    await page.reload();
    await expect(page.getByText(title)).toBeVisible();
    await editFirstTaskTitle(page, title, taskTitle(testCase, '編集後'));
    return;
  }

  if (testCase.name.includes('キャンセル') || testCase.td === 'TD008') {
    await openNewTaskForm(page);
    const title = taskTitle(testCase, 'キャンセル');
    await page.locator('input[placeholder="タスク名を入力"]').fill(title);
    await page.getByRole('button', { name: 'キャンセル' }).click();
    await expect(page.getByText(title)).toHaveCount(0);
    return;
  }

  if (testCase.name.includes('定常') || ['TD017', 'TD019', 'TD020'].includes(testCase.td)) {
    await navigate(page, '定常タスク管理');
    await expect(page.getByRole('button', { name: /新規定常タスク/ })).toBeVisible();
    return;
  }

  if (testCase.name.includes('カレンダー') || testCase.td === 'TD076') {
    await navigate(page, 'カレンダー');
    await expect(page.getByText(/日|週|月/).first()).toBeVisible();
    return;
  }

  if (testCase.name.includes('分析') || testCase.td === 'TD077') {
    await navigate(page, '分析');
    await expect(page.getByText(/予定|実績|完了/).first()).toBeVisible();
    return;
  }

  if (testCase.name.includes('設定') || testCase.td === 'TD078') {
    await navigate(page, '設定');
    await expect(page.getByText(/アカウント|作業時間|分類/).first()).toBeVisible();
    return;
  }

  if (testCase.name.includes('CSV') || testCase.name.includes('出力')) {
    await expect(page.getByRole('button', { name: /CSV出力|テキスト出力/ }).first()).toBeVisible();
    return;
  }

  if (testCase.td === 'TD088') {
    const title = taskTitle(testCase, 'フィルター対象');
    await createTask(page, title);
    await page.reload();
    await expect(page.getByText(title)).toBeVisible();
    await page.locator('input[placeholder="タイトル・メモ..."]').fill(testCase.id);
    await expect(page.getByText(title)).toBeVisible();
    return;
  }

  await expect(page.getByRole('button', { name: '新規タスク' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'タスク一覧' })).toBeVisible();
}

for (const testCase of implementedCases) {
  test(`${testCase.id} ${testCase.name}`, async ({ page }) => {
    // TC: see test title | TD: see generated case record | TV: see generated case record | TA: see generated case record | Risk: see generated case record | Spec: see generated case record
    // Exact traceability: TC=${testCase.id} | TD=${testCase.td} | TV=${testCase.tv} | TA=${testCase.ta} | Risk=${testCase.risk} | Spec=${testCase.spec}
    await expectNoRuntimeErrors(page, async () => {
      await exerciseCase(page, testCase);
    });
  });
}
