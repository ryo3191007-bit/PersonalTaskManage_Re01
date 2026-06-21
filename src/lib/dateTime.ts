export const BUSINESS_TIME_ZONE = 'Asia/Tokyo';
export const JST_OFFSET_MINUTES = 9 * 60;
const JST_OFFSET_MS = JST_OFFSET_MINUTES * 60 * 1000;

export interface JstDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

function asDate(value: string | Date): Date | null {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function getJstDateParts(value: string | Date): JstDateParts | null {
  const date = asDate(value);
  if (!date) return null;
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds(),
  };
}

/** datetime-local の値を端末設定に関係なくJSTとして解釈する。 */
export function parseJstDateTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);
  if (hour > 23 || minute > 59 || second > 59 || !parseDateKey(`${match[1]}-${match[2]}-${match[3]}`)) return null;
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - JST_OFFSET_MS);
}

export function jstDateTimeToIso(value: string): string | null {
  return parseJstDateTime(value)?.toISOString() ?? null;
}

/** UTC/offset付き日時を datetime-local 用のJST文字列へ変換する。 */
export function formatJstDateTimeLocal(value: string | Date | null | undefined): string {
  if (!value) return '';
  const parts = getJstDateParts(value);
  if (!parts) return '';
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function getJstDateKey(value: string | Date = new Date()): string {
  const parts = getJstDateParts(value);
  if (!parts) return '';
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getJstMonthKey(value: string | Date = new Date()): string {
  const parts = getJstDateParts(value);
  if (!parts) return '';
  return `${pad(parts.year, 4)}/${pad(parts.month)}`;
}

export function addJstDays(dateKey: string, days: number): string {
  const parts = parseDateKey(dateKey);
  if (!parts) return '';
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addJstMonths(dateKey: string, months: number): string {
  const parts = parseDateKey(dateKey);
  if (!parts) return '';
  const firstOfTarget = new Date(Date.UTC(parts.year, parts.month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate();
  return `${pad(firstOfTarget.getUTCFullYear(), 4)}-${pad(firstOfTarget.getUTCMonth() + 1)}-${pad(Math.min(parts.day, lastDay))}`;
}

export function getJstWeekday(dateKey: string): number | null {
  const parts = parseDateKey(dateKey);
  return parts ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay() : null;
}

export function getJstDayRange(dateKey: string): { start: Date; end: Date } | null {
  const start = parseJstDateTime(`${dateKey}T00:00`);
  const nextDateKey = addJstDays(dateKey, 1);
  const end = nextDateKey ? parseJstDateTime(`${nextDateKey}T00:00`) : null;
  return start && end ? { start, end } : null;
}

export function getJstMonthRange(monthKey: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})\/(\d{2})$/.exec(monthKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const startKey = `${pad(year, 4)}-${pad(month)}-01`;
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const endKey = `${pad(nextMonth.getUTCFullYear(), 4)}-${pad(nextMonth.getUTCMonth() + 1)}-01`;
  const start = parseJstDateTime(`${startKey}T00:00`);
  const end = parseJstDateTime(`${endKey}T00:00`);
  return start && end ? { start, end } : null;
}

export function isJstMidnight(value: string | Date): boolean {
  const parts = getJstDateParts(value);
  return !!parts && parts.hour === 0 && parts.minute === 0 && parts.second === 0 && parts.millisecond === 0;
}

/** カレンダー描画用。JSTの壁時計成分を端末ローカルDateへ写す。絶対時刻の保存には使わない。 */
export function toJstWallClockDate(value: string | Date): Date | null {
  const parts = getJstDateParts(value);
  return parts
    ? new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond)
    : null;
}

export function nowAsJstWallClockDate(): Date {
  return toJstWallClockDate(new Date()) ?? new Date();
}
