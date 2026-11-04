/**
 * 推步线 · 古历边界提示
 *
 * 古代生年只记年月日时，历法差、闰月归属、节气边界都可能有 ±1 天误差。
 * 本模块不做历法反推（那需要天文历表，属 T10 下一步），只做**风险提示**：
 * 当日期贴近十二节的常见交节窗口时，标出「年柱/月柱可能翻篇」，
 * 提醒调用方按 ±1 天上下一并算，输出两组边界而非一个结论。
 */

export interface JieWindow {
  name: string;
  /** 常见公历月 */
  month: number;
  /** 常见交节日（±1 天为窗口） */
  day: number;
  /** 影响哪一柱 */
  affects: 'year' | 'month';
  note: string;
}

/** 十二节（非中气）常见交节日期，仅作风险窗口，不作历表使用。 */
export const JIE_WINDOWS: JieWindow[] = [
  { name: '立春', month: 2, day: 4, affects: 'year', note: '年柱换岁之界，差一日即年柱不同' },
  { name: '惊蛰', month: 3, day: 6, affects: 'month', note: '二月节，卯月之始' },
  { name: '清明', month: 4, day: 5, affects: 'month', note: '三月节，辰月之始' },
  { name: '立夏', month: 5, day: 5, affects: 'month', note: '四月节，巳月之始' },
  { name: '芒种', month: 6, day: 6, affects: 'month', note: '五月节，午月之始' },
  { name: '小暑', month: 7, day: 7, affects: 'month', note: '六月节，未月之始' },
  { name: '立秋', month: 8, day: 8, affects: 'month', note: '七月节，申月之始' },
  { name: '白露', month: 9, day: 8, affects: 'month', note: '八月节，酉月之始' },
  { name: '寒露', month: 10, day: 8, affects: 'month', note: '九月节，戌月之始' },
  { name: '立冬', month: 11, day: 7, affects: 'month', note: '十月节，亥月之始' },
  { name: '大雪', month: 12, day: 7, affects: 'month', note: '十一月节，子月之始' },
  { name: '小寒', month: 1, day: 6, affects: 'month', note: '十二月节，丑月之始' },
];

export interface BoundaryRisk {
  /** 是否处于±window 天窗口内 */
  near: boolean;
  jie: JieWindow | null;
  affects: 'year' | 'month' | null;
  /** 距离交节的天数（负数=节前，正数=节后） */
  offsetDays: number | null;
  note: string;
}

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** 公历日期距常见交节日几天（粗算，闰年按 29 天处理二月）。 */
function dayOfYear(month: number, day: number): number {
  let total = day;
  for (let i = 0; i < month - 1; i += 1) total += DAYS_IN_MONTH[i];
  return total;
}

/** 判断公历日期是否贴近交节窗口；window 默认 1 天。 */
export function jieBoundaryRisk(month: number, day: number, window = 1): BoundaryRisk {
  const target = dayOfYear(month, day);
  let best: { jie: JieWindow; offset: number } | null = null;
  JIE_WINDOWS.forEach((jie) => {
    const offset = target - dayOfYear(jie.month, jie.day);
    if (best === null || Math.abs(offset) < Math.abs(best.offset)) best = { jie, offset };
  });
  const found = best as { jie: JieWindow; offset: number } | null;
  if (!found) return { near: false, jie: null, affects: null, offsetDays: null, note: '非交节窗口' };
  const near = Math.abs(found.offset) <= window;
  return {
    near,
    jie: found.jie,
    affects: found.jie.affects,
    offsetDays: found.offset,
    note: near
      ? `贴近${found.jie.name}（±1 天），${found.jie.affects === 'year' ? '年柱' : '月柱'}可能翻篇，建议上下各算一组`
      : `距${found.jie.name}约 ${Math.abs(found.offset)} 天，边界风险低`,
  };
}
