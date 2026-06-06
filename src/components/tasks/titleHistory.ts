const TITLE_HISTORY_KEY = 'taskTitleHistory';
const TITLE_HISTORY_MAX = 30;

export function loadTitleHistory(): string[] {
  try {
    const v = localStorage.getItem(TITLE_HISTORY_KEY);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

export function saveTitleHistory(title: string) {
  const hist = loadTitleHistory().filter(h => h !== title);
  hist.unshift(title);
  localStorage.setItem(TITLE_HISTORY_KEY, JSON.stringify(hist.slice(0, TITLE_HISTORY_MAX)));
}
