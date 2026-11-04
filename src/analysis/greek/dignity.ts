// ============================================================
// 希腊线 · 尊贵体系（Essential Dignities）
// ------------------------------------------------------------
// 只做「事实判定」：某行星在某度数是庙 / 旺 / 三分主 / 界 / 面，
// 或陷 / 落 / 无尊贵（peregrine），以及点位 almuten 的计分。
// 不做任何吉凶断语。
// ============================================================

import { norm360 } from './ephemeris';
import {
  DECANS,
  DOMICILES,
  EGYPTIAN_BOUNDS,
  EXALTATIONS,
  PLANETS,
  SIGN_ELEMENTS,
  SIGN_NAMES_ZH,
  SIGN_RULERS,
  TRIPLICITY,
  type Planet,
  type Sect,
  type SignIndex,
  type TriplicityRole,
} from './tables';

/** 尊贵计分权重（Ibn Ezra / Lilly 五点制） */
export const DIGNITY_SCORES = {
  domicile: 5,
  exaltation: 4,
  triplicity: 3,
  bound: 2,
  face: 1,
  detriment: -5,
  fall: -4,
} as const;

export function signOf(lon: number): SignIndex {
  return Math.floor(norm360(lon) / 30) % 12;
}

export function degInSign(lon: number): number {
  return norm360(lon) % 30;
}

/** 该星座的三分主星三层（昼 / 夜 / 参与） */
export function triplicityLords(sign: SignIndex, sect: Sect): Record<TriplicityRole, Planet> {
  const element = SIGN_ELEMENTS[sign];
  const t = TRIPLICITY[element];
  // 昼盘与夜盘的主 / 次互换，参与主不变
  if (sect === 'diurnal') {
    return { day: t.day, night: t.night, participating: t.participating };
  }
  return { day: t.night, night: t.day, participating: t.participating };
}

/** 该星座的界主星（埃及界） */
export function boundLord(sign: SignIndex, deg: number): Planet {
  const segs = EGYPTIAN_BOUNDS[sign];
  for (const seg of segs) {
    if (deg < seg.to) return seg.lord;
  }
  return segs[segs.length - 1].lord;
}

/** 该星座的面主星（迦勒底三段） */
export function faceLord(sign: SignIndex, deg: number): Planet {
  const idx = deg < 10 ? 0 : deg < 20 ? 1 : 2;
  return DECANS[sign][idx];
}

export type DignityKind =
  | 'domicile'
  | 'exaltation'
  | 'triplicity'
  | 'bound'
  | 'face'
  | 'detriment'
  | 'fall'
  | 'peregrine';

export interface PlanetDignity {
  planet: Planet;
  lon: number;
  sign: SignIndex;
  signName: string;
  degInSign: number;
  /** 逐项判定结果 */
  kinds: DignityKind[];
  /** 细分：三分主星角色（如命中） */
  triplicityRole?: TriplicityRole;
  /** 合计计分 */
  score: number;
  /** 是否无任何正面尊贵（且无陷落） */
  peregrine: boolean;
}

/** 判定单颗行星在某黄经处的全部尊贵状态 */
export function planetDignity(planet: Planet, lon: number, sect: Sect): PlanetDignity {
  const sign = signOf(lon);
  const deg = degInSign(lon);
  const kinds: DignityKind[] = [];
  let score = 0;
  let triplicityRole: TriplicityRole | undefined;

  // 庙
  if (DOMICILES[planet].includes(sign)) {
    kinds.push('domicile');
    score += DIGNITY_SCORES.domicile;
  }
  // 旺
  const exalt = EXALTATIONS[planet];
  if (exalt.sign === sign) {
    kinds.push('exaltation');
    score += DIGNITY_SCORES.exaltation;
  }
  // 三分主星
  const trip = triplicityLords(sign, sect);
  if (trip.day === planet) {
    triplicityRole = 'day';
    kinds.push('triplicity');
    score += DIGNITY_SCORES.triplicity;
  } else if (trip.night === planet) {
    triplicityRole = 'night';
    kinds.push('triplicity');
    score += DIGNITY_SCORES.triplicity;
  } else if (trip.participating === planet) {
    triplicityRole = 'participating';
    kinds.push('triplicity');
    score += DIGNITY_SCORES.triplicity;
  }
  // 界
  if (boundLord(sign, deg) === planet) {
    kinds.push('bound');
    score += DIGNITY_SCORES.bound;
  }
  // 面
  if (faceLord(sign, deg) === planet) {
    kinds.push('face');
    score += DIGNITY_SCORES.face;
  }

  // 陷：落在对面星座（庙的对宫）
  const detrimentSigns = DOMICILES[planet].map((s) => (s + 6) % 12);
  if (detrimentSigns.includes(sign)) {
    kinds.push('detriment');
    score += DIGNITY_SCORES.detriment;
  }
  // 落：旺的对宫
  if ((exalt.sign + 6) % 12 === sign) {
    kinds.push('fall');
    score += DIGNITY_SCORES.fall;
  }

  const peregrine = !kinds.some((k) => k !== 'detriment' && k !== 'fall') && kinds.length === 0;
  if (peregrine) kinds.push('peregrine');

  return {
    planet,
    lon: norm360(lon),
    sign,
    signName: SIGN_NAMES_ZH[sign],
    degInSign: deg,
    kinds,
    triplicityRole,
    score,
    peregrine,
  };
}

/** 该星座的守护星 */
export function signRuler(sign: SignIndex): Planet {
  return SIGN_RULERS[sign];
}

/**
 * 点位 almuten：某黄经度数上尊贵计分最高的行星（含界 / 面细分）。
 * 若最高分为 0 或并列，返回该星座守护星作为兜底，并标记 resolvedByRuler。
 */
export function almutenOfDegree(lon: number, sect: Sect): { planet: Planet; score: number; resolvedByRuler: boolean; table: Array<{ planet: Planet; score: number }> } {
  const sign = signOf(lon);
  const deg = degInSign(lon);
  const table = PLANETS.map((p) => ({
    planet: p,
    score: scoreOfDegree(p, sign, deg, sect),
  })).sort((a, b) => b.score - a.score);

  const top = table[0];
  if (top.score > 0 && table[1] && table[1].score === top.score) {
    // 并列：按传统顺序（发光体→吉星→中性→凶星）取先到者，并标注
    return { planet: signRuler(sign), score: top.score, resolvedByRuler: true, table };
  }
  if (top.score <= 0) {
    return { planet: signRuler(sign), score: top.score, resolvedByRuler: true, table };
  }
  return { planet: top.planet, score: top.score, resolvedByRuler: false, table };
}

/** 单点位上某行星的尊贵分（不生成完整对象，供 almuten 计算复用） */
function scoreOfDegree(planet: Planet, sign: SignIndex, deg: number, sect: Sect): number {
  let score = 0;
  if (DOMICILES[planet].includes(sign)) score += DIGNITY_SCORES.domicile;
  if (EXALTATIONS[planet].sign === sign) score += DIGNITY_SCORES.exaltation;
  const trip = triplicityLords(sign, sect);
  if (trip.day === planet || trip.night === planet || trip.participating === planet) {
    score += DIGNITY_SCORES.triplicity;
  }
  if (boundLord(sign, deg) === planet) score += DIGNITY_SCORES.bound;
  if (faceLord(sign, deg) === planet) score += DIGNITY_SCORES.face;
  if (DOMICILES[planet].map((s) => (s + 6) % 12).includes(sign)) score += DIGNITY_SCORES.detriment;
  if ((EXALTATIONS[planet].sign + 6) % 12 === sign) score += DIGNITY_SCORES.fall;
  return score;
}

/** 中文标签 */
export const DIGNITY_LABELS: Record<DignityKind, string> = {
  domicile: '庙',
  exaltation: '旺',
  triplicity: '三分主',
  bound: '界',
  face: '面',
  detriment: '陷',
  fall: '落',
  peregrine: '无尊贵',
};
