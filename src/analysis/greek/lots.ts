// ============================================================
// 希腊线 · 虚点（Lots / klēroi）
// ------------------------------------------------------------
// 七虚点严格按 Paulus Alexandrinus 的定义计算：
//   Lot = ASC + A − B（昼夜按宗派互换 A / B）
// 依赖顺序：先 Fortune / Spirit，再由它们派生 Eros / Victory /
// Necessity / Courage / Nemesis。
//
// 阿拉伯扩展点（Arabic Parts）在同一套公式下扩展，另见 calculateArabicLots：
// 只收「来源可核验、公式无实质分歧」的 10 个点（父母 / 兄弟 / 子女 /
// 婚姻男女 / 债务 / 根基 / 背叛 / 困难）。来源覆盖 Paulus、Valens、
// Liber Hermetis 三个传统层，表头逐条标注。
// ============================================================

import { norm360 } from './ephemeris';
import { signDegree, signIndex } from './astroChart';
import {
  ARABIC_LOTS,
  LOT_FORMULAS,
  LOT_NAMES_EN,
  LOT_NAMES_ZH,
  LOT_RULING_PLANET,
  type ArabicLotKey,
  type LotKey,
  type LotPoint,
  type Planet,
  type Sect,
} from './tables';

export interface LotFact {
  key: LotKey;
  nameZh: string;
  nameEn: string;
  /** 黄经 */
  lon: number;
  signIndex: number;
  signDeg: number;
  /** 整宫制宫位 1–12 */
  house: number;
  /** 参与该虚点定义的基础点（供核对） */
  formula: string;
  /** 该虚点的传统主星 */
  ruler: Planet;
}

export interface LotsResult {
  sect: Sect;
  lots: Record<LotKey, LotFact>;
}

/** 取某「点」的黄经：行星或已算出的虚点 */
type PointResolver = (name: Planet | LotKey) => number;

const LOT_ORDER: readonly LotKey[] = [
  'fortune',
  'spirit',
  'eros',
  'necessity',
  'courage',
  'victory',
  'nemesis',
] as const;

/**
 * 计算七虚点。
 * @param bodiesLon 七政黄经
 * @param ascLon    上升点黄经
 * @param sect      宗派
 * @param ascSignIndex 上升星座索引（用于落宫）
 */
export function calculateLots(
  bodiesLon: Record<Planet, number>,
  ascLon: number,
  sect: Sect,
  ascSignIndex: number,
): LotsResult {
  const computed: Partial<Record<LotKey, number>> = {};

  const resolve: PointResolver = (name) => {
    if (name in bodiesLon) return bodiesLon[name as Planet];
    const v = computed[name as LotKey];
    if (typeof v !== 'number') {
      throw new Error(`lot dependency not resolved: ${name}`);
    }
    return v;
  };

  for (const key of LOT_ORDER) {
    const f = LOT_FORMULAS[key][sect === 'diurnal' ? 'day' : 'night'];
    const lon = norm360(ascLon + resolve(f.plus) - resolve(f.minus));
    computed[key] = lon;
  }

  const lots = {} as Record<LotKey, LotFact>;
  for (const key of LOT_ORDER) {
    const lon = computed[key] as number;
    const idx = signIndex(lon);
    const f = LOT_FORMULAS[key][sect === 'diurnal' ? 'day' : 'night'];
    lots[key] = {
      key,
      nameZh: LOT_NAMES_ZH[key],
      nameEn: LOT_NAMES_EN[key],
      lon,
      signIndex: idx,
      signDeg: signDegree(lon),
      house: ((idx - ascSignIndex + 12) % 12) + 1,
      formula: `ASC + ${f.plus} − ${f.minus}`,
      ruler: LOT_RULING_PLANET[key],
    };
  }

  return { sect, lots };
}

/** 供展示：虚点公式的人类可读形式（含昼夜两式） */
export function lotFormulaText(key: LotKey): { day: string; night: string } {
  const f = LOT_FORMULAS[key];
  return {
    day: `ASC + ${f.day.plus} − ${f.day.minus}`,
    night: `ASC + ${f.night.plus} − ${f.night.minus}`,
  };
}

// ------------------------------------------------------------
// 阿拉伯扩展点
// ------------------------------------------------------------

export interface ArabicLotFact {
  key: ArabicLotKey;
  nameZh: string;
  nameEn: string;
  lon: number;
  signIndex: number;
  signDeg: number;
  house: number;
  formula: string;
  source: string;
  /** 性别限定（婚姻点） */
  gender?: 'male' | 'female';
  /** 性别未定时是否仅作参考 */
  genderUndetermined: boolean;
}

/**
 * 计算阿拉伯扩展点。
 * 公式与七虚点同构：ASC + A − B（夜盘互换 A / B）。
 * @param base 已算好的七虚点（foundation 需要 fortune / spirit）
 * @param gender 命主性别；未提供时婚姻点两式都输出并标记为参考值
 */
export function calculateArabicLots(
  bodiesLon: Record<Planet, number>,
  base: LotsResult,
  ascLon: number,
  sect: Sect,
  gender: 'male' | 'female' | undefined,
  ascSignIndex: number,
): ArabicLotFact[] {
  const resolve = (p: LotPoint): number => {
    if (p in bodiesLon) return bodiesLon[p as Planet];
    if (p in base.lots) return base.lots[p as LotKey].lon;
    throw new Error(`arabic lot dependency not resolved: ${p}`);
  };

  return ARABIC_LOTS.map((def) => {
    const plus = sect === 'diurnal' ? def.plus : def.minus;
    const minus = sect === 'diurnal' ? def.minus : def.plus;
    const lon = norm360(ascLon + resolve(plus) - resolve(minus));
    const idx = signIndex(lon);
    const genderUndetermined = Boolean(def.gender) && (gender === undefined || gender !== def.gender);

    return {
      key: def.key,
      nameZh: def.nameZh,
      nameEn: def.nameEn,
      lon,
      signIndex: idx,
      signDeg: signDegree(lon),
      house: ((idx - ascSignIndex + 12) % 12) + 1,
      formula: `ASC + ${plus} − ${minus}`,
      source: def.source,
      gender: def.gender,
      genderUndetermined,
    };
  });
}
