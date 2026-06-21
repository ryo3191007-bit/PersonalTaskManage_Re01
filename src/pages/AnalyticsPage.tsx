import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { useTasks } from '../contexts/TaskContext';
import type { Task, TaskCategory, TaskSession } from '../lib/types';
import {
  getActualMinutes,
  getActualMinutesForDay,
  getActualMinutesForRange,
  getDurationVariance,
  getPlannedMinutes,
  getPlannedMinutesForDay,
  getPlannedMinutesForRange,
  getWorkloadTaskList,
} from '../lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Primitive charts ──────────────────────────────────────────────────────────

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-sm text-gray-400 text-center py-4">データがありません</p>;
  let offset = 0;
  const r = 60, cx = 80, cy = 80, circ = 2 * Math.PI * r;
  const arcs = segments.map(seg => {
    const pct = seg.value / total;
    const dashLen = pct * circ;
    const dashGap = circ - dashLen;
    const rotation = offset * 360 - 90;
    offset += pct;
    return { ...seg, dashLen, dashGap, rotation };
  });
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {arcs.map((a, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={a.color} strokeWidth="28"
            strokeDasharray={`${a.dashLen} ${a.dashGap}`} strokeDashoffset={0}
            transform={`rotate(${a.rotation} ${cx} ${cy})`} />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 14, fontWeight: 600 }} className="fill-gray-700 dark:fill-gray-300">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 10, fill: '#9ca3af' }}>件</text>
      </svg>
      <div className="space-y-2 flex-1 min-w-0">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{s.label}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto flex-shrink-0">
              {s.value}件 ({((s.value / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StackedBar({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  if (total === 0) return <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full" />;
  return (
    <div className="flex h-4 rounded-full overflow-hidden">
      {segments.map(s => s.value > 0 && (
        <div
          key={s.label}
          title={`${s.label}: ${s.value}件 (${((s.value / total) * 100).toFixed(0)}%)`}
          style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
        />
      ))}
    </div>
  );
}

/**
 * 予定と実績を並べた2本棒グラフ。
 * クリック可能な場合は onBarClick を渡す。
 */
interface DualBarDatum {
  label: string;
  planned: number;
  actual: number;
}

function DualBarChart({
  data,
  onBarClick,
}: {
  data: DualBarDatum[];
  onBarClick?: (label: string) => void;
}) {
  if (data.length === 0) return <p className="text-sm text-gray-400">データがありません</p>;

  const maxVal = Math.max(...data.flatMap(d => [d.planned, d.actual]), 1);

  return (
    <div className="space-y-0">
      {/* 凡例 */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-900/60 inline-block" />
          <span className="text-[11px] text-gray-500 dark:text-gray-400">予定</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
          <span className="text-[11px] text-gray-500 dark:text-gray-400">実績</span>
        </div>
        {onBarClick && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">月をクリックで日別表示</span>
        )}
      </div>

      <div className="flex items-end gap-1.5 h-44">
        {data.map(d => {
          const plannedH = maxVal > 0 ? (d.planned / maxVal) * 100 : 0;
          const actualH = maxVal > 0 ? (d.actual / maxVal) * 100 : 0;
          const diff = Math.round((d.actual - d.planned) * 10) / 10;
          const over = diff > 0;
          return (
            <div
              key={d.label}
              className={`flex-1 flex flex-col items-center gap-0.5 group ${onBarClick ? 'cursor-pointer' : ''}`}
              onClick={() => onBarClick?.(d.label)}
            >
              {/* 差分バッジ */}
              <div className="h-5 flex items-center justify-center">
                {(d.planned > 0 || d.actual > 0) && (
                  <span className={`text-[9px] font-medium tabular-nums ${over ? 'text-red-500' : diff < 0 ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`}>
                    {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : ''}
                  </span>
                )}
              </div>
              {/* 棒グラフ本体 */}
              <div className="w-full flex items-end justify-center gap-[2px]" style={{ height: '100px' }}>
                {/* 予定 */}
                <div
                  className={`flex-1 rounded-t-sm transition-all duration-500 bg-blue-200 dark:bg-blue-900/60 ${onBarClick ? 'group-hover:bg-blue-300 dark:group-hover:bg-blue-800/80' : ''}`}
                  style={{ height: `${Math.max(plannedH, d.planned > 0 ? 2 : 0)}%` }}
                />
                {/* 実績 */}
                <div
                  className={`flex-1 rounded-t-sm transition-all duration-500 ${d.actual > d.planned && d.planned > 0 ? 'bg-red-400' : 'bg-blue-500'} ${onBarClick ? 'group-hover:opacity-80' : ''}`}
                  style={{ height: `${Math.max(actualH, d.actual > 0 ? 2 : 0)}%` }}
                />
              </div>
              {/* 予定・実績値ラベル */}
              <div className="flex flex-col items-center" style={{ minHeight: '32px' }}>
                {d.actual > 0 && (
                  <span className="text-[9px] text-blue-600 dark:text-blue-400 tabular-nums font-medium leading-tight">
                    {d.actual}h
                  </span>
                )}
                {d.planned > 0 && (
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 tabular-nums leading-tight">
                    ({d.planned}h)
                  </span>
                )}
              </div>
              {/* X軸ラベル */}
              <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarChart({ data, maxVal, color }: { data: { label: string; value: number; color?: string }[]; maxVal: number; color: string }) {
  if (data.length === 0) return <p className="text-sm text-gray-400">データがありません</p>;
  return (
    <div className="space-y-2">
      {data.map(d => {
        const barColor = d.color ?? color;
        return (
        <div key={d.label} className="flex items-center gap-3">
          <div className="w-20 sm:w-28 flex-shrink-0 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: barColor }} />
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{d.label}</span>
          </div>
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: maxVal > 0 ? `${(d.value / maxVal) * 100}%` : '0%', backgroundColor: barColor }}
            >
              {(d.value / (maxVal || 1)) > 0.15 && (
                <span className="text-[10px] text-white font-medium">{d.value}</span>
              )}
            </div>
          </div>
          {(d.value / (maxVal || 1)) <= 0.15 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{d.value}</span>
          )}
        </div>
        );
      })}
    </div>
  );
}

/** 分類別所要時間の水平バーグラフ */
function CategoryTimeBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  if (data.length === 0) return <p className="text-sm text-gray-400 dark:text-gray-500">データがありません</p>;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const totalHours = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="space-y-2.5">
      {data.map(d => {
        const pct = (d.value / maxVal) * 100;
        const sharePct = totalHours > 0 ? Math.round((d.value / totalHours) * 100) : 0;
        const hours = Math.floor(d.value);
        const mins = Math.round((d.value - hours) * 60);
        const label = hours > 0 ? (mins > 0 ? `${hours}h${mins}m` : `${hours}h`) : `${mins}m`;
        return (
          <div key={d.label} className="flex items-center gap-3 group">
            <div className="w-24 sm:w-32 flex-shrink-0 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{d.label}</span>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
              <div
                className="h-full rounded-full flex items-center justify-end px-2 transition-all duration-500"
                style={{ width: `${Math.max(pct, d.value > 0 ? 4 : 0)}%`, backgroundColor: d.color }}
              >
                {pct > 20 && (
                  <span className="text-[10px] text-white font-semibold tabular-nums">{label}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-14 sm:w-20 flex-shrink-0 justify-end">
              {pct <= 20 && d.value > 0 && (
                <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums font-medium">{label}</span>
              )}
              <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">({sharePct}%)</span>
            </div>
          </div>
        );
      })}
      <div className="pt-1 border-t border-gray-100 dark:border-gray-800 flex justify-end">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          合計: <span className="font-semibold text-gray-700 dark:text-gray-300">
            {Math.floor(totalHours)}h{Math.round((totalHours - Math.floor(totalHours)) * 60) > 0
              ? `${Math.round((totalHours - Math.floor(totalHours)) * 60)}m` : ''}
          </span>
        </span>
      </div>
    </div>
  );
}

// ── Data helpers ──────────────────────────────────────────────────────────────

interface CategoryDurationFactorRow {
  category: TaskCategory | null;
  total: number;
  overCount: number;
  shortCount: number;
  matchCount: number;
  topOverFactor: string | null;
  topShortFactor: string | null;
}

function topFactor(factors: string[]): string | null {
  if (factors.length === 0) return null;
  const counts = new Map<string, number>();
  for (const f of factors) counts.set(f, (counts.get(f) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function buildCategoryDurationFactorRows(
  analysisTasks: Task[],
  categories: TaskCategory[],
  sessionsByTask: Map<string, TaskSession[]>,
): CategoryDurationFactorRow[] {
  type Acc = Omit<CategoryDurationFactorRow, 'category'> & {
    overFactors: string[];
    shortFactors: string[];
  };
  const map = new Map<string | null, Acc>();
  const blankAcc = (): Acc => ({
    total: 0, overCount: 0, shortCount: 0, matchCount: 0,
    topOverFactor: null, topShortFactor: null,
    overFactors: [], shortFactors: [],
  });
  for (const t of analysisTasks) {
    const variance = getDurationVariance(t, sessionsByTask.get(t.id) ?? []);
    if (variance === 'unknown') continue;
    const key = t.category_id ?? null;
    if (!map.has(key)) map.set(key, blankAcc());
    const acc = map.get(key)!;
    acc.total++;
    if (variance === 'over') {
      acc.overCount++;
      if (t.duration_over_factor) acc.overFactors.push(t.duration_over_factor);
    } else if (variance === 'short') {
      acc.shortCount++;
      if (t.duration_short_factor) acc.shortFactors.push(t.duration_short_factor);
    } else {
      acc.matchCount++;
    }
  }
  const catMap = new Map(categories.map(c => [c.id, c]));
  return [...map.entries()]
    .map(([key, acc]) => ({
      category: key ? (catMap.get(key) ?? null) : null,
      total: acc.total,
      overCount: acc.overCount, shortCount: acc.shortCount, matchCount: acc.matchCount,
      topOverFactor: topFactor(acc.overFactors),
      topShortFactor: topFactor(acc.shortFactors),
    }))
    .sort((a, b) => b.total - a.total);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function FactorBadge({ factor, color }: { factor: string | null; color: string }) {
  if (!factor) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>;
  return (
    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white leading-tight" style={{ backgroundColor: color }}>
      {factor}
    </span>
  );
}

function DurationFactorTable({ rows }: { rows: CategoryDurationFactorRow[] }) {
  if (rows.every(r => r.overCount + r.shortCount + r.matchCount === 0)) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">実績データがありません</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="text-left pb-2 pr-3 font-medium text-gray-500 dark:text-gray-400">分類</th>
            <th className="text-right pb-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">分析対象</th>
            <th className="pb-2 px-2 font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">所要時間</th>
            <th className="text-left pb-2 px-2 font-medium text-red-500 dark:text-red-400 whitespace-nowrap">超過 主因</th>
            <th className="text-left pb-2 pl-2 font-medium text-blue-500 dark:text-blue-400 whitespace-nowrap">短縮 主因</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
          {rows.map((row, i) => {
            const durTotal = row.overCount + row.shortCount + row.matchCount;
            return (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    {row.category ? (
                      <>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.category.color }} />
                        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[80px]">{row.category.name}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">分類なし</span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-400 font-medium">{row.total}</td>
                <td className="py-2.5 px-2">
                  <StackedBar total={durTotal} segments={[
                    { label: '超過', value: row.overCount, color: '#ef4444' },
                    { label: '一致', value: row.matchCount, color: '#22c55e' },
                    { label: '短縮', value: row.shortCount, color: '#3b82f6' },
                  ]} />
                  {durTotal > 0 && (
                    <div className="flex gap-2 mt-1 text-[10px] text-gray-400">
                      {row.overCount > 0 && <span className="text-red-500">超過{row.overCount}</span>}
                      {row.matchCount > 0 && <span className="text-green-600">一致{row.matchCount}</span>}
                      {row.shortCount > 0 && <span className="text-blue-500">短縮{row.shortCount}</span>}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-2"><FactorBadge factor={row.topOverFactor} color="#ef4444" /></td>
                <td className="py-2.5 pl-2"><FactorBadge factor={row.topShortFactor} color="#3b82f6" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FactorRanking({ factors, color }: { factors: string[]; color: string }) {
  if (factors.length === 0) return <p className="text-xs text-gray-400 dark:text-gray-500">データなし</p>;
  const counts = new Map<string, number>();
  for (const f of factors) counts.set(f, (counts.get(f) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxVal = ranked[0][1];
  return (
    <div className="space-y-1.5">
      {ranked.map(([label, val]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400 w-36 flex-shrink-0 truncate">{label}</span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(val / maxVal) * 100}%`, backgroundColor: color }} />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-right">{val}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'duration';

function getMonthKey(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeriodLabel(ym: string): string {
  const [y, m] = ym.split('/');
  return `${y}年${Number(m)}月`;
}

function getMonthRange(ym: string): { start: Date; end: Date } {
  const [year, month] = ym.split('/').map(Number);
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

function getTaskPeriodKey(task: Task): string | null {
  return getMonthKey(task.scheduled_start);
}

function roundHours(minutes: number): number {
  return Math.round(minutes / 60 * 10) / 10;
}

export default function AnalyticsPage() {
  const { tasks, categories, sessions } = useTasks();
  const [tab, setTab] = useState<TabId>('overview');

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  /** 全体期間フィルター: 'all' | 'YYYY/MM' */
  const [period, setPeriod] = useState<string>(currentMonthKey);
  /** 全期間表示時の日別ドリルダウン（YYYY/MM） */
  const [drillMonth, setDrillMonth] = useState<string | null>(null);

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    setDrillMonth(null);
  };

  const workloadTasks = useMemo(() => getWorkloadTaskList(tasks), [tasks]);

  const sessionsByTask = useMemo(() => {
    const map = new Map<string, TaskSession[]>();
    for (const session of sessions) {
      if (!map.has(session.task_id)) map.set(session.task_id, []);
      map.get(session.task_id)!.push(session);
    }
    return map;
  }, [sessions]);

  /** 期間プルダウン用の月リスト。件数系指標は予定開始月を基準にする。 */
  const availablePeriods = useMemo(() => {
    const set = new Set<string>([currentMonthKey]);
    workloadTasks.forEach(task => {
      const monthKey = getTaskPeriodKey(task);
      if (monthKey) set.add(monthKey);
      [task.actual_start, task.actual_end].forEach(value => {
        const actualMonthKey = getMonthKey(value);
        if (actualMonthKey) set.add(actualMonthKey);
      });
    });
    sessions.forEach(session => {
      [session.session_start, session.session_end].forEach(value => {
        const sessionMonthKey = getMonthKey(value);
        if (sessionMonthKey) set.add(sessionMonthKey);
      });
    });
    return [...set].sort().reverse();
  }, [workloadTasks, sessions, currentMonthKey]);

  const periodRange = useMemo(() => period === 'all' ? null : getMonthRange(period), [period]);

  /** 件数・完了率の母集団は、単独タスクと末端タスク。 */
  const periodFilteredTrackTasks = useMemo(() => {
    if (period === 'all') return workloadTasks;
    return workloadTasks.filter(task => getTaskPeriodKey(task) === period);
  }, [workloadTasks, period]);

  const periodFilteredAnalysisTasks = useMemo(() =>
    periodFilteredTrackTasks.filter(task => task.status === 'completed'),
    [periodFilteredTrackTasks]
  );

  /** 所要時間差異は、実績追跡対象の完了タスクだけを対象にする。 */
  const periodFilteredDurationTasks = useMemo(() =>
    periodFilteredAnalysisTasks.filter(task => task.track_actual),
    [periodFilteredAnalysisTasks]
  );

  // ── 月別工数（予定・実績） ────────────────────────────────────────────────
  const monthlyData = useMemo((): DualBarDatum[] => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`);
    }

    return months.map(monthKey => {
      const range = getMonthRange(monthKey);
      let plannedMinutes = 0;
      let actualMinutes = 0;
      for (const task of workloadTasks) {
        plannedMinutes += getPlannedMinutesForRange(task, range.start, range.end);
        const actual = getActualMinutesForRange(
          task,
          sessionsByTask.get(task.id) ?? [],
          range.start,
          range.end,
          now,
        );
        if (actual !== null) actualMinutes += actual;
      }
      return {
        label: monthKey.slice(5) + '月',
        planned: roundHours(plannedMinutes),
        actual: roundHours(actualMinutes),
      };
    });
  }, [workloadTasks, sessionsByTask]);

  // ── 日別工数（特定月） ──────────────────────────────────────────────────
  // period !== 'all' のときはその月、'all' + drillMonth のときは drillMonth を使用
  const activeDailyYM = period !== 'all' ? period : drillMonth;

  const dailyData = useMemo((): DualBarDatum[] => {
    if (!activeDailyYM) return [];
    const [year, month] = activeDailyYM.split('/').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const now = new Date();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayDate = new Date(year, month - 1, i + 1);

      let plannedMins = 0;
      let actualMins = 0;

      for (const t of workloadTasks) {
        plannedMins += getPlannedMinutesForDay(t, dayDate);
        const actual = getActualMinutesForDay(t, sessionsByTask.get(t.id) ?? [], dayDate, now);
        if (actual !== null) actualMins += actual;
      }

      return {
        label: `${i + 1}日`,
        planned: roundHours(plannedMins),
        actual: roundHours(actualMins),
      };
    });
  }, [activeDailyYM, workloadTasks, sessionsByTask]);

  // ── 派生データ（全て period フィルター済みコレクションを使用） ──────────
  const categoryData = useMemo(() => {
    const map = new Map<string, { name: string; color: string; count: number }>();
    categories.forEach(c => map.set(c.id, { name: c.name, color: c.color, count: 0 }));
    map.set('__none__', { name: '分類なし', color: '#9ca3af', count: 0 });
    periodFilteredAnalysisTasks.forEach(t => {
      const key = t.category_id ?? '__none__';
      if (map.has(key)) map.get(key)!.count++;
      else map.get('__none__')!.count++;
    });
    return Array.from(map.values()).filter(v => v.count > 0);
  }, [periodFilteredAnalysisTasks, categories]);

  const statusData = useMemo(() => [
    { label: '未着手', value: periodFilteredTrackTasks.filter(t => t.status === 'not_started').length, color: '#9ca3af' },
    { label: '進行中', value: periodFilteredTrackTasks.filter(t => t.status === 'in_progress').length, color: '#3b82f6' },
    { label: '中断', value: periodFilteredTrackTasks.filter(t => t.status === 'suspended').length, color: '#f59e0b' },
    { label: '完了', value: periodFilteredAnalysisTasks.length, color: '#22c55e' },
  ], [periodFilteredTrackTasks, periodFilteredAnalysisTasks]);

  const categoryDurationFactorRows = useMemo(() =>
    buildCategoryDurationFactorRows(periodFilteredDurationTasks, categories, sessionsByTask),
    [periodFilteredDurationTasks, categories, sessionsByTask]
  );

  const allOverFactors = useMemo(() => periodFilteredDurationTasks.flatMap(task =>
    getDurationVariance(task, sessionsByTask.get(task.id) ?? []) === 'over' && task.duration_over_factor
      ? [task.duration_over_factor]
      : []
  ), [periodFilteredDurationTasks, sessionsByTask]);
  const allShortFactors = useMemo(() => periodFilteredDurationTasks.flatMap(task =>
    getDurationVariance(task, sessionsByTask.get(task.id) ?? []) === 'short' && task.duration_short_factor
      ? [task.duration_short_factor]
      : []
  ), [periodFilteredDurationTasks, sessionsByTask]);

  const categoryTimeData = useMemo(() => {
    const map = new Map<string | null, number>();
    for (const task of workloadTasks) {
      const taskSessions = sessionsByTask.get(task.id) ?? [];
      const actualMinutes = periodRange
        ? getActualMinutesForRange(task, taskSessions, periodRange.start, periodRange.end)
        : getActualMinutes(task, taskSessions);
      if (actualMinutes === null || actualMinutes <= 0) continue;
      const key = task.category_id ?? null;
      map.set(key, (map.get(key) ?? 0) + actualMinutes);
    }
    const catMap = new Map(categories.map(c => [c.id, c]));
    return [...map.entries()]
      .map(([key, totalMins]) => ({
        label: key ? (catMap.get(key)?.name ?? '不明') : '分類なし',
        value: roundHours(totalMins),
        color: key ? (catMap.get(key)?.color ?? '#9ca3af') : '#9ca3af',
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [workloadTasks, sessionsByTask, periodRange, categories]);

  const categoryBarData = categoryData.map(c => ({ label: c.name, value: c.count, color: c.color }));
  const maxCategoryCount = Math.max(...categoryBarData.map(d => d.value), 1);

  const completionRate = periodFilteredTrackTasks.length > 0
    ? Math.round((periodFilteredAnalysisTasks.length / periodFilteredTrackTasks.length) * 100)
    : 0;

  const totalActualHours = useMemo(() => {
    let totalMinutes = 0;
    for (const task of workloadTasks) {
      const taskSessions = sessionsByTask.get(task.id) ?? [];
      const actualMinutes = periodRange
        ? getActualMinutesForRange(task, taskSessions, periodRange.start, periodRange.end)
        : getActualMinutes(task, taskSessions);
      if (actualMinutes !== null) totalMinutes += actualMinutes;
    }
    return roundHours(totalMinutes);
  }, [workloadTasks, sessionsByTask, periodRange]);

  const missingPlannedCount = useMemo(() =>
    periodFilteredTrackTasks.filter(task => getPlannedMinutes(task) === null).length,
    [periodFilteredTrackTasks]
  );

  const missingActualCount = useMemo(() =>
    periodFilteredTrackTasks.filter(task =>
      task.track_actual
      && task.status !== 'not_started'
      && getActualMinutes(task, sessionsByTask.get(task.id) ?? []) === null
    ).length,
    [periodFilteredTrackTasks, sessionsByTask]
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: '概要' },
    { id: 'duration', label: '所要時間分析' },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-3 py-3 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">

        {/* 期間フィルター */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">表示期間</span>
          <div className="relative">
            <select
              value={period}
              onChange={e => handlePeriodChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
            >
              <option value="all">全期間</option>
              {availablePeriods.map(m => (
                <option key={m} value={m}>{formatPeriodLabel(m)}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {period !== 'all' && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatPeriodLabel(period)} のデータを表示中
            </span>
          )}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
          {[
            { label: '完了率', value: `${completionRate}%`, sub: '予定開始月基準' },
            { label: '総実績時間', value: `${totalActualHours}h`, sub: '予定時間の代用なし' },
            { label: '予定工数未入力', value: `${missingPlannedCount}件`, sub: '時間グラフ対象外' },
            { label: '実績未入力', value: `${missingActualCount}件`, sub: '実績集計対象外' },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 sm:min-w-[140px]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-full sm:w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 sm:flex-none min-h-11 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <SectionCard title="ステータス分布">
                <DonutChart segments={statusData} />
              </SectionCard>
              <SectionCard title="分類別完了タスク数">
                {categoryBarData.length > 0
                  ? <BarChart data={categoryBarData} maxVal={maxCategoryCount} color="#3b82f6" />
                  : <p className="text-sm text-gray-400 dark:text-gray-500">分類データがありません</p>}
              </SectionCard>
            </div>

            <SectionCard
              title="分類別 実績時間"
            >
              <CategoryTimeBarChart data={categoryTimeData} />
            </SectionCard>

            {/* 月別 or 日別グラフ */}
            {period !== 'all' ? (
              <SectionCard
                title={`${formatPeriodLabel(period)} 日別作業時間`}
                subtitle="単位: 時間 ／ 差分 = 実績 − 予定（赤: 超過）"
              >
                <div className="overflow-x-auto">
                  <div style={{ minWidth: `${dailyData.length * 36}px` }}>
                    <DualBarChart data={dailyData} />
                  </div>
                </div>
              </SectionCard>
            ) : drillMonth ? (
              <SectionCard
                title={`${formatPeriodLabel(drillMonth)} 日別作業時間`}
                subtitle="単位: 時間 ／ 差分 = 実績 − 予定（赤: 超過）"
              >
                <button
                  onClick={() => setDrillMonth(null)}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mb-4"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />月別グラフに戻る
                </button>
                <div className="overflow-x-auto">
                  <div style={{ minWidth: `${dailyData.length * 36}px` }}>
                    <DualBarChart data={dailyData} />
                  </div>
                </div>
              </SectionCard>
            ) : (
              <SectionCard
                title="月別作業時間（過去1年）"
                subtitle="単位: 時間 ／ 差分 = 実績 − 予定（赤: 超過）"
              >
                <DualBarChart
                  data={monthlyData}
                  onBarClick={label => {
                    // label は "MM月" 形式 → YYYY/MM に変換
                    const mm = label.replace('月', '').padStart(2, '0');
                    const now = new Date();
                    for (let i = 11; i >= 0; i--) {
                      const d = new Date(now); d.setMonth(d.getMonth() - i);
                      if (String(d.getMonth() + 1).padStart(2, '0') === mm) {
                        setDrillMonth(`${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`);
                        break;
                      }
                    }
                  }}
                />
              </SectionCard>
            )}
          </div>
        )}

        {/* Duration tab */}
        {tab === 'duration' && (
          <div className="space-y-4 sm:space-y-6">
            <SectionCard title="所要時間 × 分類" subtitle="予定工数と実績工数を比較（±1分以内は一致）">
              <DurationFactorTable rows={categoryDurationFactorRows} />
            </SectionCard>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <SectionCard title="見積超過要因 ランキング" subtitle="全分類合算 TOP5">
                <FactorRanking factors={allOverFactors} color="#ef4444" />
              </SectionCard>
              <SectionCard title="見積短縮要因 ランキング" subtitle="全分類合算 TOP5">
                <FactorRanking factors={allShortFactors} color="#3b82f6" />
              </SectionCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
