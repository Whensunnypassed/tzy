// ============================================================
// 希腊线 · 时间主星（Time Lords）
// ------------------------------------------------------------
// 四套技法，全部为确定性计算，不做吉凶判词：
//   1) 周年推运 profections —— 年主星 / 月推运
//   2) 黄道释放 zodiacal releasing —— L1 / L2（含 L3 / L4 可选），
//      含 loosing of the bond 与 peak periods
//   3) 法尔达利亚 firdaria —— 昼 / 夜两套 75 年周期
//   4) 太阳返照 solar return —— 数值解算太阳回到出生黄经的时刻
//
// ZR 年长口径：Valens 的 360 天年（12 月 × 30 天），非回归年。
// 若需回归年，可在调用处传入 yearDays = 365.2422。
// ============================================================

import { norm180, norm360, sunPosition, daysSinceJ2000 } from './ephemeris';
import { buildAstroChartFromUtc, signIndex, type AstroChart } from './astroChart';
import {
  FIRDARIA_DAY,
  FIRDARIA_NIGHT,
  PLANET_NAMES_ZH,
  SIGN_NAMES_ZH,
  SIGN_RULERS,
  ZR_SIGN_YEARS,
  type FirdariaLord,
  type Planet,
  type Sect,
} from './tables';
import type { CityRecord } from '@/data/cityData';

// ------------------------------------------------------------
// 通用日期工具
// ------------------------------------------------------------

export interface UtcParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function utcMs(p: UtcParts): number {
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
}

function fromMs(ms: number): UtcParts {
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

function addDays(base: UtcParts, days: number): UtcParts {
  return fromMs(utcMs(base) + days * 86400000);
}

export function formatUtc(p: UtcParts): string {
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

// ------------------------------------------------------------
// 1) 周年推运（profections）
// ------------------------------------------------------------

export interface MonthlyProfection {
  /** 第几个月（1–12，自生日起算） */
  month: number;
  signIndex: number;
  signName: string;
  lord: Planet;
  lordName: string;
}

export interface ProfectionsResult {
  age: number;
  /** 推运宫位（1–12） */
  house: number;
  signIndex: number;
  signName: string;
  /** 年主星 Lord of the Year */
  lord: Planet;
  lordName: string;
  /** 12 个月推运 */
  monthly: MonthlyProfection[];
}

/**
 * 周年推运：ASC 所在宫为 0 岁第 1 宫，每岁推进一宫。
 * @param ascSignIndex 上升星座索引
 * @param age 周岁（0 起）
 */
export function calculateProfections(ascSignIndex: number, age: number): ProfectionsResult {
  const a = Math.max(0, Math.floor(age));
  const house = (a % 12) + 1;
  const signIndex = (ascSignIndex + (a % 12)) % 12;

  const monthly: MonthlyProfection[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const sIdx = (signIndex + (m - 1)) % 12;
    monthly.push({
      month: m,
      signIndex: sIdx,
      signName: SIGN_NAMES_ZH[sIdx],
      lord: SIGN_RULERS[sIdx],
      lordName: PLANET_NAMES_ZH[SIGN_RULERS[sIdx]],
    });
  }

  return {
    age: a,
    house,
    signIndex,
    signName: SIGN_NAMES_ZH[signIndex],
    lord: SIGN_RULERS[signIndex],
    lordName: PLANET_NAMES_ZH[SIGN_RULERS[signIndex]],
    monthly,
  };
}

// ------------------------------------------------------------
// 2) 黄道释放（zodiacal releasing）
// ------------------------------------------------------------

export type ZRLevel = 1 | 2 | 3 | 4;

export interface ZRPeriod {
  level: ZRLevel;
  signIndex: number;
  signName: string;
  lord: Planet;
  lordName: string;
  /** 相对出生的天数（含小数） */
  startDays: number;
  endDays: number;
  startUtc: UtcParts;
  endUtc: UtcParts;
  /** 是否与福点成角（自身 / 第 4 / 7 / 10 宫） */
  isPeak: boolean;
  /** 该段起点是否为 loosing of the bond（跳至对宫） */
  isLoosing: boolean;
  /** 是否因上级周期结束而截断 */
  truncated: boolean;
}

export interface ZRResult {
  /** 释放起点（福点或精神点的星座） */
  startSignIndex: number;
  startLot: 'fortune' | 'spirit';
  fortuneSignIndex: number;
  level1: ZRPeriod[];
  level2: ZRPeriod[];
}

/** 一级单位时长（天） */
function zrUnitDays(level: ZRLevel, yearDays: number): number {
  switch (level) {
    case 1:
      return yearDays; // 年
    case 2:
      return yearDays / 12; // 月
    case 3:
      return yearDays / 144; // 天（月 / 12）
    case 4:
      return yearDays / 1728; // 小时量级（天 / 12）
  }
}

/** 与福点角宫关系：自身 0 / 4 / 7 / 10 */
function isAngularTo(sign: number, base: number): boolean {
  const d = (((sign - base) % 12) + 12) % 12;
  return d === 0 || d === 3 || d === 6 || d === 9;
}

/**
 * 生成某层级的周期序列。
 * @param startSign 起点星座
 * @param totalDays 上级周期总长（天）
 * @param level 层级
 * @param fortuneSign 福点星座（用于 peak 判定）
 * @param birthUtc 出生 UTC
 * @param yearDays 年长
 * @param emit 回调（收集周期）
 */
function releaseSequence(
  startSign: number,
  totalDays: number,
  level: ZRLevel,
  fortuneSign: number,
  birthUtc: UtcParts,
  yearDays: number,
  emit: (p: Omit<ZRPeriod, 'startUtc' | 'endUtc'>) => void,
): void {
  const unit = zrUnitDays(level, yearDays);
  let cursor = 0; // 相对上级起点的天数
  let sign = startSign;
  let loosingNext = false;
  let stepsInRound = 0;

  while (cursor < totalDays - 1e-9) {
    const rawLen = ZR_SIGN_YEARS[sign] * unit;
    const len = Math.min(rawLen, totalDays - cursor);
    const truncated = rawLen > len + 1e-9;

    emit({
      level,
      signIndex: sign,
      signName: SIGN_NAMES_ZH[sign],
      lord: SIGN_RULERS[sign],
      lordName: PLANET_NAMES_ZH[SIGN_RULERS[sign]],
      startDays: cursor,
      endDays: cursor + len,
      isPeak: isAngularTo(sign, fortuneSign),
      isLoosing: loosingNext,
      truncated,
    });

    cursor += len;
    stepsInRound += 1;
    loosingNext = false;

    // 走完 12 个星座后跳到对宫（loosing of the bond）
    if (stepsInRound >= 12) {
      stepsInRound = 0;
      sign = (sign + 6) % 12;
      loosingNext = true;
    } else {
      sign = (sign + 1) % 12;
    }
  }
}

/**
 * 黄道释放。
 * @param birthUtc 出生 UTC
 * @param fortuneLon 福点黄经
 * @param spiritLon 精神点黄经
 * @param from 起点虚点（默认精神点，希腊占星事业向常用；福点用于身体与物质）
 * @param maxAge 生成到多少岁
 * @param yearDays 年长（默认 360）
 */
export function calculateZodiacalReleasing(
  birthUtc: UtcParts,
  fortuneLon: number,
  spiritLon: number,
  from: 'fortune' | 'spirit' = 'fortune',
  maxAge = 90,
  yearDays = 360,
): ZRResult {
  const fortuneSign = signIndex(fortuneLon);
  const startSignIndex = signIndex(from === 'fortune' ? fortuneLon : spiritLon);
  const totalDays = maxAge * yearDays;

  const level1: ZRPeriod[] = [];
  const level2: ZRPeriod[] = [];

  // L1
  releaseSequence(startSignIndex, totalDays, 1, fortuneSign, birthUtc, yearDays, (p) => {
    level1.push({
      ...p,
      startUtc: addDays(birthUtc, p.startDays),
      endUtc: addDays(birthUtc, p.endDays),
    });
  });

  // L2：在每个 L1 内独立释放
  for (const l1 of level1) {
    const span = l1.endDays - l1.startDays;
    const sub: ZRPeriod[] = [];
    releaseSequence(l1.signIndex, span, 2, fortuneSign, birthUtc, yearDays, (p) => {
      sub.push({
        ...p,
        startDays: p.startDays + l1.startDays,
        endDays: p.endDays + l1.startDays,
        startUtc: addDays(birthUtc, l1.startDays + p.startDays),
        endUtc: addDays(birthUtc, l1.startDays + p.endDays),
        truncated: p.truncated || (l1.truncated && p.endDays >= span - 1e-9),
      });
    });
    level2.push(...sub);
  }

  return {
    startSignIndex,
    startLot: from,
    fortuneSignIndex: fortuneSign,
    level1,
    level2,
  };
}

/** 在某年龄落在哪个 L1 / L2 周期 */
export function zrPeriodAtAge(
  result: ZRResult,
  age: number,
  yearDays = 360,
): { l1: ZRPeriod | null; l2: ZRPeriod | null } {
  const days = age * yearDays;
  const l1 = result.level1.find((p) => days >= p.startDays && days < p.endDays) ?? null;
  const l2 = result.level2.find((p) => days >= p.startDays && days < p.endDays) ?? null;
  return { l1, l2 };
}

// ------------------------------------------------------------
// 3) 法尔达利亚（firdaria）
// ------------------------------------------------------------

export interface FirdariaSubPeriod {
  index: number;
  lord: FirdariaLord;
  lordName: string;
  startAge: number;
  endAge: number;
}

export interface FirdariaPeriod {
  index: number;
  lord: FirdariaLord;
  lordName: string;
  startAge: number;
  endAge: number;
  subPeriods: FirdariaSubPeriod[];
}

export interface FirdariaResult {
  sect: Sect;
  periods: FirdariaPeriod[];
}

const FIRDARIA_LORD_NAMES: Record<FirdariaLord, string> = {
  sun: '太阳',
  moon: '月亮',
  mercury: '水星',
  venus: '金星',
  mars: '火星',
  jupiter: '木星',
  saturn: '土星',
  northNode: '北交点',
  southNode: '南交点',
};

/** 法尔达利亚：昼 / 夜两套七行星 + 南北交点，共 75 年；每主期分 7 子期 */
export function calculateFirdaria(sect: Sect): FirdariaResult {
  const seq = sect === 'diurnal' ? FIRDARIA_DAY : FIRDARIA_NIGHT;
  let age = 0;
  const periods: FirdariaPeriod[] = seq.map((p, i) => {
    const startAge = age;
    const endAge = age + p.years;
    const subLen = p.years / 7;
    const subPeriods: FirdariaSubPeriod[] = Array.from({ length: 7 }, (_, k) => ({
      index: k + 1,
      lord: p.lord,
      lordName: FIRDARIA_LORD_NAMES[p.lord],
      startAge: startAge + subLen * k,
      endAge: startAge + subLen * (k + 1),
    }));
    age = endAge;
    return {
      index: i + 1,
      lord: p.lord,
      lordName: FIRDARIA_LORD_NAMES[p.lord],
      startAge,
      endAge,
      subPeriods,
    };
  });
  return { sect, periods };
}

export function firdariaAtAge(result: FirdariaResult, age: number): FirdariaPeriod | null {
  return result.periods.find((p) => age >= p.startAge && age < p.endAge) ?? null;
}

/** 子期顺序：法尔达利亚的 7 个子期依次为该主星与其余六星的配对 */
export function firdariaSubLords(period: FirdariaPeriod): FirdariaLord[] {
  return period.subPeriods.map((s) => s.lord);
}

// ------------------------------------------------------------
// 4) 太阳返照（solar return）
// ------------------------------------------------------------

export interface SolarReturnResult {
  /** 返照 UTC 时刻 */
  utc: UtcParts;
  /** 返照盘 */
  chart: AstroChart;
  /** 解算残差（黄经差，度） */
  residualDeg: number;
}

/**
 * 求太阳回到出生黄经的时刻，并构建返照盘。
 * 以出生日为中心做 ±3 天二分，太阳在窗口内近似匀速，二分 60 次可达秒级。
 */
export function calculateSolarReturn(
  birthUtc: UtcParts,
  birthSunLon: number,
  targetYear: number,
  city: CityRecord,
): SolarReturnResult {
  const center = Date.UTC(targetYear, birthUtc.month - 1, birthUtc.day, birthUtc.hour, birthUtc.minute);
  let lo = center - 3 * 86400000;
  let hi = center + 3 * 86400000;

  const diffAt = (ms: number): number => {
    const p = fromMs(ms);
    // 注意：hour 与 minute 分别传入，不能把 minute/60 当作小时
    const d = daysSinceJ2000(p.year, p.month, p.day, p.hour, p.minute);
    return norm180(sunPosition(d).lon - birthSunLon);
  };

  for (let k = 0; k < 60; k += 1) {
    const mid = (lo + hi) / 2;
    const v = diffAt(mid);
    if (v < 0) lo = mid;
    else hi = mid;
  }

  const ms = (lo + hi) / 2;
  const utc = fromMs(ms);
  const residualDeg = Math.abs(diffAt(ms));

  const chart = buildAstroChartFromUtc(utc, city, {
    local: utc,
    utcOffsetMinutes: 0,
    timezoneNote: '太阳返照时刻为 UTC；返照盘按出生城市经纬度计算。',
    timezoneAccuracy: 'exact',
  });

  return { utc, chart, residualDeg };
}

// ------------------------------------------------------------
// 辅助：由出生 UTC 与当前日期求周岁
// ------------------------------------------------------------

export function ageInYears(birth: UtcParts, now: UtcParts): number {
  let age = now.year - birth.year;
  const beforeBirthday =
    now.month < birth.month || (now.month === birth.month && now.day < birth.day);
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

/** 年度推运的分界点（下一个生日 UTC） */
export function nextBirthday(birth: UtcParts, now: UtcParts): UtcParts {
  const y = now.year + (now.month > birth.month || (now.month === birth.month && now.day >= birth.day) ? 1 : 0);
  return { year: y, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute };
}

export function norm360Safe(x: number): number {
  return norm360(x);
}
