// ============================================================
// 沛然堂线 · 希腊占星星盘核心
// ------------------------------------------------------------
// 输入：当地钟表时间 + 城市（经纬度、时区规则）
// 输出：UTC 时刻、上升点 / 中天、七政黄经与落座、整宫制宫位、
//       宗派（昼盘 / 夜盘）、星座相位与「映照」关系。
//
// 全部本地计算，不依赖任何外部接口与星历文件。
// 边界：本文件只产出星盘事实，不做吉凶判读。
// ============================================================

import type { CityRecord } from '@/data/cityData';
import { resolveUtcOffsetMinutes, toUtcParts } from '@/data/cityData';
import {
  BODY_KEYS,
  allBodyPositions,
  daysSinceJ2000,
  daysSinceJ2000UT,
  norm180,
  norm360,
  obliquityDeg,
  type BodyKey,
  type BodyPosition,
} from './ephemeris';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// ------------------------------------------------------------
// 黄道十二宫
// ------------------------------------------------------------
export const ZODIAC_SIGNS = [
  '白羊',
  '金牛',
  '双子',
  '巨蟹',
  '狮子',
  '处女',
  '天秤',
  '天蝎',
  '射手',
  '摩羯',
  '水瓶',
  '双鱼',
] as const;

export const ZODIAC_SIGNS_EN = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

/** 黄经 → 星座索引（0 = 白羊） */
export function signIndex(lonDeg: number): number {
  return Math.floor(norm360(lonDeg) / 30) % 12;
}

/** 黄经 → 星座内度数 */
export function signDegree(lonDeg: number): number {
  return norm360(lonDeg) % 30;
}

export function formatArc(lonDeg: number): string {
  const d = signDegree(lonDeg);
  const deg = Math.floor(d);
  const min = Math.floor((d - deg) * 60);
  return `${deg}°${String(min).padStart(2, '0')}′`;
}

export function formatZodiac(lonDeg: number): string {
  return `${ZODIAC_SIGNS[signIndex(lonDeg)]} ${formatArc(lonDeg)}`;
}

// ------------------------------------------------------------
// 恒星时与轴点
// ------------------------------------------------------------

/** 格林尼治平恒星时（度） */
export function gmstDeg(d: number): number {
  return norm360(280.46061837 + 360.98564736629 * d);
}

/** 当地恒星时（度）= GMST + 东经（西经为负） */
export function lstDeg(d: number, lonDeg: number): number {
  return norm360(gmstDeg(d) + lonDeg);
}

/**
 * 上升点黄经。
 * λ_ASC = atan2( cos(RAMC), −( sin(RAMC)·cos ε + tan φ·sin ε ) )
 */
export function ascendantLon(ramcDeg: number, latDeg: number, epsDeg: number): number {
  const t = ramcDeg * DEG;
  const eps = epsDeg * DEG;
  const phi = latDeg * DEG;
  const y = Math.cos(t);
  const x = -(Math.sin(t) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
  return norm360(Math.atan2(y, x) * RAD);
}

/** 中天黄经。λ_MC = atan2( sin(RAMC), cos(RAMC)·cos ε ) */
export function midheavenLon(ramcDeg: number, epsDeg: number): number {
  const t = ramcDeg * DEG;
  const eps = epsDeg * DEG;
  return norm360(Math.atan2(Math.sin(t), Math.cos(t) * Math.cos(eps)) * RAD);
}

// ------------------------------------------------------------
// 星盘结构
// ------------------------------------------------------------

export interface BodyFact extends BodyPosition {
  key: BodyKey;
  name: string;
  sign: ZodiacSign;
  signDeg: number;
  /** 整宫制宫位 1–12 */
  house: number;
}

/** 星座相位类型（希腊占星按整宫计） */
export type SignAspect = 'conjunct' | 'sextile' | 'square' | 'trine' | 'opposition' | 'aversion';

export const SIGN_ASPECT_NAMES: Record<SignAspect, string> = {
  conjunct: '合（同宫）',
  sextile: '六合（60°）',
  square: '刑（90°）',
  trine: '三合（120°）',
  opposition: '冲（180°）',
  aversion: '映照（不相见）',
};

/** 由两星座的宫距判定整宫相位 */
export function signAspectBetween(aSign: number, bSign: number): SignAspect {
  const diff = (((bSign - aSign) % 12) + 12) % 12;
  if (diff === 0) return 'conjunct';
  if (diff === 2 || diff === 10) return 'sextile';
  if (diff === 3 || diff === 9) return 'square';
  if (diff === 4 || diff === 8) return 'trine';
  if (diff === 6) return 'opposition';
  return 'aversion';
}

export interface AstroChartInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  city: CityRecord;
}

export interface AstroChart {
  /** 当地钟表时间 */
  local: { year: number; month: number; day: number; hour: number; minute: number };
  city: CityRecord;
  utc: { year: number; month: number; day: number; hour: number; minute: number };
  utcOffsetMinutes: number;
  timezoneNote: string;
  timezoneAccuracy: 'exact' | 'approx' | 'rough';
  /** 自 J2000（1999-12-31 00:00，Schlyter 历元）的日数，行星算法用 */
  days: number;
  /** 自真 J2000（2000-01-01 12:00 UT）的日数，恒星时用 */
  daysJ2000: number;
  /** 当地恒星时（度） */
  ramc: number;
  /** 上升点 */
  asc: { lon: number; sign: ZodiacSign; signDeg: number; signIndex: number };
  /** 中天 */
  mc: { lon: number; sign: ZodiacSign; signDeg: number };
  /** 七政 */
  bodies: Record<BodyKey, BodyFact>;
  /** 整宫制：宫位序号 1–12 对应的星座索引 */
  houseSigns: number[];
  /** 昼盘（太阳在地平线上）/ 夜盘 */
  sect: 'diurnal' | 'nocturnal';
  /** 太阳所在宫位（sect 判据） */
  sunHouse: number;
  /** 七政两两之间的整宫相位（不含映照，避免噪声；映照单独取） */
  aspects: Array<{ a: BodyKey; b: BodyKey; aspect: SignAspect; distance: number }>;
}

/** 由当地钟表时间与城市构建星盘 */
export function buildAstroChart(input: AstroChartInput): AstroChart {
  const { year, month, day, hour, minute, city } = input;
  const tz = resolveUtcOffsetMinutes(city, year, month, day);
  const utc = toUtcParts(year, month, day, hour, minute, tz.offsetMinutes);
  return buildAstroChartFromUtc(utc, city, {
    local: { year, month, day, hour, minute },
    utcOffsetMinutes: tz.offsetMinutes,
    timezoneNote: tz.note,
    timezoneAccuracy: tz.accuracy,
  });
}

export interface AstroChartUtcMeta {
  local: { year: number; month: number; day: number; hour: number; minute: number };
  utcOffsetMinutes: number;
  timezoneNote: string;
  timezoneAccuracy: 'exact' | 'approx' | 'rough';
}

/**
 * 直接由 UTC 时刻构建星盘（不经过时区换算）。
 * 用于太阳返照、主方向等需要「先解算 UTC 时刻」的场景。
 */
export function buildAstroChartFromUtc(
  utc: { year: number; month: number; day: number; hour: number; minute: number },
  city: CityRecord,
  meta: AstroChartUtcMeta,
): AstroChart {
  // 两套日数：行星算法用 Schlyter d（历元 1999-12-31 00:00），
  // 恒星时 / 黄赤交角用真 J2000 日数（历元 2000-01-01 12:00）。
  const days = daysSinceJ2000(utc.year, utc.month, utc.day, utc.hour, utc.minute);
  const daysJ2000 = daysSinceJ2000UT(utc.year, utc.month, utc.day, utc.hour, utc.minute);

  const eps = obliquityDeg(daysJ2000);
  const ramc = lstDeg(daysJ2000, city.lon);

  const ascLon = ascendantLon(ramc, city.lat, eps);
  const mcLon = midheavenLon(ramc, eps);
  const ascSignIdx = signIndex(ascLon);

  const positions = allBodyPositions(days);
  const bodies = {} as Record<BodyKey, BodyFact>;
  for (const key of BODY_KEYS) {
    const pos = positions[key];
    const idx = signIndex(pos.lon);
    bodies[key] = {
      ...pos,
      key,
      name: BODY_NAMES_SHORT[key],
      sign: ZODIAC_SIGNS[idx],
      signDeg: signDegree(pos.lon),
      house: ((idx - ascSignIdx + 12) % 12) + 1,
    };
  }

  const sunHouse = bodies.sun.house;
  const sect: 'diurnal' | 'nocturnal' = sunHouse >= 7 ? 'diurnal' : 'nocturnal';

  const houseSigns = Array.from({ length: 12 }, (_, i) => (ascSignIdx + i) % 12);

  const aspects: AstroChart['aspects'] = [];
  for (let i = 0; i < BODY_KEYS.length; i += 1) {
    for (let j = i + 1; j < BODY_KEYS.length; j += 1) {
      const a = BODY_KEYS[i];
      const b = BODY_KEYS[j];
      const aspect = signAspectBetween(signIndex(bodies[a].lon), signIndex(bodies[b].lon));
      if (aspect === 'aversion') continue;
      const distance = Math.abs(norm180(bodies[b].lon - bodies[a].lon));
      aspects.push({ a, b, aspect, distance });
    }
  }

  return {
    local: meta.local,
    city,
    utc,
    utcOffsetMinutes: meta.utcOffsetMinutes,
    timezoneNote: meta.timezoneNote,
    timezoneAccuracy: meta.timezoneAccuracy,
    days,
    daysJ2000,
    ramc,
    asc: {
      lon: ascLon,
      sign: ZODIAC_SIGNS[ascSignIdx],
      signDeg: signDegree(ascLon),
      signIndex: ascSignIdx,
    },
    mc: { lon: mcLon, sign: ZODIAC_SIGNS[signIndex(mcLon)], signDeg: signDegree(mcLon) },
    bodies,
    houseSigns,
    sect,
    sunHouse,
    aspects,
  };
}

const BODY_NAMES_SHORT: Record<BodyKey, string> = {
  sun: '太阳',
  moon: '月亮',
  mercury: '水星',
  venus: '金星',
  mars: '火星',
  jupiter: '木星',
  saturn: '土星',
};
