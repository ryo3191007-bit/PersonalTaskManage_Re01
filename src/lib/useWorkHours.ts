import { useState, useCallback } from 'react';

const STORAGE_KEY = 'workHoursPerDay';
const DEFAULT_WORK_HOURS = 8;

export function normalizeWorkHours(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_WORK_HOURS;
  return Math.min(24, Math.max(0.5, value));
}

export function loadWorkHours(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === null) return DEFAULT_WORK_HOURS;
    const n = parseFloat(v);
    return isFinite(n) && n > 0 ? n : DEFAULT_WORK_HOURS;
  } catch {
    return DEFAULT_WORK_HOURS;
  }
}

export function useWorkHours() {
  const [workHours, setWorkHoursState] = useState<number>(loadWorkHours);

  const setWorkHours = useCallback((h: number) => {
    const clamped = normalizeWorkHours(h);
    localStorage.setItem(STORAGE_KEY, String(clamped));
    setWorkHoursState(clamped);
  }, []);

  return { workHours, setWorkHours };
}
