// ============================================================
// 希腊线 · Lilly 计分（Christian Astrology, 1647, p.115）
// ------------------------------------------------------------
// 「A Table to Examine the Strength & Debility of Each Planet」
// 本质尊贵 + 偶然尊贵两栏，合计范围约 −38 ~ +38。
// 这是判读层的地基：先算出每颗行星的强弱，再谈它能不能成事。
//
// 本表逐项取自原书，未经改写；未实现的项（被夹击 / 互容）
// 在本文件中明确标注 TODO，不静默跳过。
// ============================================================

import { norm180, norm360 } from './ephemeris';
import { planetDignity, type PlanetDignity } from './dignity';
import { PLANETS, type Planet, type Sect } from './tables';
import type { PlanetStateFact } from './planetaryState';

/** 本质尊贵 / 缺陷（Lilly p.115 左栏） */
export const LILLY_ESSENTIAL = {
  domicile: 5,
  exaltation: 4,
  triplicity: 3,
  bound: 2,
  face: 1,
  detriment: -5,
  fall: -4,
  peregrine: -5,
} as const;

/** 偶然尊贵 / 缺陷（Lilly p.115 右栏） */
export const LILLY_ACCIDENTAL = {
  house10or1: 5,
  house12: -5,
  house7or4or11: 4,
  house8or6: -2,
  house2or5: 3,
  house9: 2,
  house3: 1,
  direct: 4,
  retrograde: -5,
  swift: 2,
  slow: -2,
  orientalHeavy: 2, // 土 / 木 / 火 东出
  occidentalHeavy: -2, // 土 / 木 / 火 西入
  occidentalLight: 2, // 水 / 金 西入
  orientalLight: -2, // 水 / 金 东出
  moonWaxing: 2,
  moonWaning: -2,
  freeOfCombustion: 5,
  combust: -5,
  underBeams: -4,
  cazimi: 5,
  partileConjBenefic: 5,
  partileConjMalefic: -5,
  partileConjNorthNode: 4,
  partileConjSouthNode: -4,
  partileTrineBenefic: 4,
  besieged: -4,
  partileOppositionMalefic: -4,
  partileSextileBenefic: 3,
  partileSquareMalefic: -4,
  regulus: 6,
  spica: 5,
  algol: -4,
} as const;

/** 传统固定星黄经（Lilly 时代取值，判读用固定点，不随岁差移动） */
export const FIXED_STARS = {
  regulus: { lon: 29 + 40 / 60 + 4 * 30, name: 'Regulus 轩辕十四', score: LILLY_ACCIDENTAL.regulus },
  spica: { lon: 23 + 40 / 60 + 6 * 30, name: 'Spica 角宿一', score: LILLY_ACCIDENTAL.spica },
  algol: { lon: 26 + 4 / 60 + 1 * 30, name: 'Algol 大陵五', score: LILLY_ACCIDENTAL.algol },
} as const;

/** 重行星：东出 / 西入的吉凶方向与轻行星相反 */
const HEAVY_PLANETS: Planet[] = ['saturn', 'jupiter', 'mars'];

export interface ScoreItem {
  key: string;
  label: string;
  value: number;
}

export interface LillyScore {
  planet: Planet;
  essential: ScoreItem[];
  accidental: ScoreItem[];
  essentialSum: number;
  accidentalSum: number;
  total: number;
  /** 强弱等级（按 Lilly 的 ±38 量程粗分五档） */
  grade: 'strong' | 'good' | 'average' | 'weak' | 'debilitated';
}

function gradeOf(total: number): LillyScore['grade'] {
  if (total >= 20) return 'strong';
  if (total >= 10) return 'good';
  if (total >= -5) return 'average';
  if (total >= -18) return 'weak';
  return 'debilitated';
}

/** 精确相位（orb ≤ 1°）判定 */
function hasPartileAspect(
  lonA: number,
  lonB: number,
  angles: number[],
  orb = 1,
): boolean {
  const diff = Math.abs(norm180(lonA - lonB));
  return angles.some((a) => Math.abs(diff - a) <= orb);
}

export interface LillyInput {
  bodiesLon: Record<Planet, number>;
  /** 七政整宫制宫位 */
  bodiesHouse: Record<Planet, number>;
  states: Record<Planet, PlanetStateFact>;
  sect: Sect;
  /** 月亮是否增光（日月黄经差 < 180 为增光） */
  moonWaxing: boolean;
}

/**
 * 计算单颗行星的 Lilly 总分。
 * TODO（未实现，本版不计分）：
 *   · 互容（mutual reception by sign / exaltation）
 *   · 被夹击（besieged：分离自土/火且下一入相为另一颗）
 */
export function calculateLillyScore(
  planet: Planet,
  input: LillyInput,
  dignityCache?: PlanetDignity,
): LillyScore {
  const { bodiesLon, bodiesHouse, states, sect, moonWaxing } = input;
  const lon = bodiesLon[planet];
  const house = bodiesHouse[planet];
  const st = states[planet];
  const dig = dignityCache ?? planetDignity(planet, lon, sect);

  const essential: ScoreItem[] = [];
  const accidental: ScoreItem[] = [];

  // ---------- 本质 ----------
  if (dig.kinds.includes('domicile')) essential.push({ key: 'domicile', label: '本宫', value: LILLY_ESSENTIAL.domicile });
  if (dig.kinds.includes('exaltation')) essential.push({ key: 'exaltation', label: '旺', value: LILLY_ESSENTIAL.exaltation });
  if (dig.kinds.includes('triplicity')) essential.push({ key: 'triplicity', label: '三分', value: LILLY_ESSENTIAL.triplicity });
  if (dig.kinds.includes('bound')) essential.push({ key: 'bound', label: '界', value: LILLY_ESSENTIAL.bound });
  if (dig.kinds.includes('face')) essential.push({ key: 'face', label: '面', value: LILLY_ESSENTIAL.face });
  if (dig.kinds.includes('detriment')) essential.push({ key: 'detriment', label: '陷', value: LILLY_ESSENTIAL.detriment });
  if (dig.kinds.includes('fall')) essential.push({ key: 'fall', label: '落', value: LILLY_ESSENTIAL.fall });
  if (dig.peregrine) essential.push({ key: 'peregrine', label: '无尊贵', value: LILLY_ESSENTIAL.peregrine });

  // ---------- 偶然：宫位 ----------
  if (house === 1 || house === 10) accidental.push({ key: 'house10or1', label: `第 ${house} 宫`, value: LILLY_ACCIDENTAL.house10or1 });
  else if (house === 7 || house === 4 || house === 11) accidental.push({ key: 'house7or4or11', label: `第 ${house} 宫`, value: LILLY_ACCIDENTAL.house7or4or11 });
  else if (house === 2 || house === 5) accidental.push({ key: 'house2or5', label: `第 ${house} 宫`, value: LILLY_ACCIDENTAL.house2or5 });
  else if (house === 9) accidental.push({ key: 'house9', label: '第 9 宫', value: LILLY_ACCIDENTAL.house9 });
  else if (house === 3) accidental.push({ key: 'house3', label: '第 3 宫', value: LILLY_ACCIDENTAL.house3 });
  else if (house === 8 || house === 6) accidental.push({ key: 'house8or6', label: `第 ${house} 宫`, value: LILLY_ACCIDENTAL.house8or6 });
  else if (house === 12) accidental.push({ key: 'house12', label: '第 12 宫', value: LILLY_ACCIDENTAL.house12 });

  // ---------- 偶然：运动 ----------
  if (planet !== 'sun' && planet !== 'moon') {
    if (st.motion === 'retrograde') accidental.push({ key: 'retrograde', label: '逆行', value: LILLY_ACCIDENTAL.retrograde });
    else accidental.push({ key: 'direct', label: '顺行', value: LILLY_ACCIDENTAL.direct });
  }
  if (st.speed === 'fast') accidental.push({ key: 'swift', label: '疾行', value: LILLY_ACCIDENTAL.swift });
  else if (st.speed === 'slow') accidental.push({ key: 'slow', label: '迟行', value: LILLY_ACCIDENTAL.slow });

  // ---------- 偶然：东出 / 西入（重行星与轻行星方向相反） ----------
  if (planet !== 'sun' && planet !== 'moon') {
    const heavy = HEAVY_PLANETS.includes(planet);
    if (st.orientality === 'oriental') {
      accidental.push(
        heavy
          ? { key: 'orientalHeavy', label: '东出', value: LILLY_ACCIDENTAL.orientalHeavy }
          : { key: 'orientalLight', label: '东出', value: LILLY_ACCIDENTAL.orientalLight },
      );
    } else if (st.orientality === 'occidental') {
      accidental.push(
        heavy
          ? { key: 'occidentalHeavy', label: '西入', value: LILLY_ACCIDENTAL.occidentalHeavy }
          : { key: 'occidentalLight', label: '西入', value: LILLY_ACCIDENTAL.occidentalLight },
      );
    }
  }

  // ---------- 偶然：月相 ----------
  if (planet === 'moon') {
    accidental.push(
      moonWaxing
        ? { key: 'moonWaxing', label: '增光', value: LILLY_ACCIDENTAL.moonWaxing }
        : { key: 'moonWaning', label: '减光', value: LILLY_ACCIDENTAL.moonWaning },
    );
  }

  // ---------- 偶然：与太阳关系 ----------
  if (planet !== 'sun') {
    if (st.solarState === 'cazimi') accidental.push({ key: 'cazimi', label: '中心', value: LILLY_ACCIDENTAL.cazimi });
    else if (st.solarState === 'combust') accidental.push({ key: 'combust', label: '燃烧', value: LILLY_ACCIDENTAL.combust });
    else if (st.solarState === 'underBeams') accidental.push({ key: 'underBeams', label: '日光下', value: LILLY_ACCIDENTAL.underBeams });
    else accidental.push({ key: 'freeOfCombustion', label: '脱离日光', value: LILLY_ACCIDENTAL.freeOfCombustion });
  }

  // ---------- 偶然：与吉凶星的精确相位 ----------
  const benefics: Planet[] = ['jupiter', 'venus'];
  const malefics: Planet[] = ['saturn', 'mars'];
  for (const b of benefics) {
    if (b === planet) continue;
    if (hasPartileAspect(lon, bodiesLon[b], [0])) accidental.push({ key: 'partileConjBenefic', label: `合${b === 'jupiter' ? '木' : '金'}`, value: LILLY_ACCIDENTAL.partileConjBenefic });
    else if (hasPartileAspect(lon, bodiesLon[b], [120])) accidental.push({ key: 'partileTrineBenefic', label: `三合${b === 'jupiter' ? '木' : '金'}`, value: LILLY_ACCIDENTAL.partileTrineBenefic });
    else if (hasPartileAspect(lon, bodiesLon[b], [60])) accidental.push({ key: 'partileSextileBenefic', label: `六合${b === 'jupiter' ? '木' : '金'}`, value: LILLY_ACCIDENTAL.partileSextileBenefic });
  }
  for (const m of malefics) {
    if (m === planet) continue;
    if (hasPartileAspect(lon, bodiesLon[m], [0])) accidental.push({ key: 'partileConjMalefic', label: `合${m === 'saturn' ? '土' : '火'}`, value: LILLY_ACCIDENTAL.partileConjMalefic });
    else if (hasPartileAspect(lon, bodiesLon[m], [180])) accidental.push({ key: 'partileOppositionMalefic', label: `冲${m === 'saturn' ? '土' : '火'}`, value: LILLY_ACCIDENTAL.partileOppositionMalefic });
    else if (hasPartileAspect(lon, bodiesLon[m], [90])) accidental.push({ key: 'partileSquareMalefic', label: `刑${m === 'saturn' ? '土' : '火'}`, value: LILLY_ACCIDENTAL.partileSquareMalefic });
  }

  // ---------- 偶然：固定星 ----------
  for (const star of Object.values(FIXED_STARS)) {
    if (hasPartileAspect(lon, star.lon, [0], 2)) {
      accidental.push({ key: star.name, label: star.name, value: star.score });
    }
  }

  const essentialSum = essential.reduce((s, i) => s + i.value, 0);
  const accidentalSum = accidental.reduce((s, i) => s + i.value, 0);
  const total = essentialSum + accidentalSum;

  return {
    planet,
    essential,
    accidental,
    essentialSum,
    accidentalSum,
    total,
    grade: gradeOf(total),
  };
}

export interface LillyReport {
  scores: Record<Planet, LillyScore>;
  /** 全盘最高分行星（Lilly 的 Almuten Figuris 简化版：仅按分数取最高） */
  strongest: Planet;
  weakest: Planet;
  /** 月亮增光状态 */
  moonWaxing: boolean;
}

/** 计算全盘七政的 Lilly 分数 */
export function calculateLillyReport(input: LillyInput): LillyReport {
  const scores = {} as Record<Planet, LillyScore>;
  for (const p of PLANETS) scores[p] = calculateLillyScore(p, input);

  // 太阳与月亮不参与「最强 / 最弱」评比（Lilly 的 almuten 以五颗行星为主）
  const candidates = PLANETS.filter((p) => p !== 'sun' && p !== 'moon');
  const strongest = candidates.reduce((a, b) => (scores[a].total >= scores[b].total ? a : b));
  const weakest = candidates.reduce((a, b) => (scores[a].total <= scores[b].total ? a : b));

  return { scores, strongest, weakest, moonWaxing: input.moonWaxing };
}

/** 月亮是否增光：日月黄经差在 (0, 180) 为增光 */
export function isMoonWaxing(sunLon: number, moonLon: number): boolean {
  const diff = norm360(moonLon - sunLon);
  return diff > 0 && diff < 180;
}
