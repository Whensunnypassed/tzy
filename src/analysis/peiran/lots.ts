// ============================================================
// 沛然堂线 · 虚点（Lots / klēroi）
// ------------------------------------------------------------
// 七虚点严格按 Paulus Alexandrinus 的定义计算：
//   Lot = ASC + A − B（昼夜按宗派互换 A / B）
// 依赖顺序：先 Fortune / Spirit，再由它们派生 Eros / Victory /
// Necessity / Courage / Nemesis。
//
// 阿拉伯扩展虚点（婚姻 / 子女 / 疾病等）在本版本不落地：
// 其公式在不同阿拉伯作者间存在实质分歧，未取得可靠一手对照前
// 不写入引擎，避免把不确定规则固化成「系统结论」。
// ============================================================

import { norm360 } from './ephemeris';
import { signDegree, signIndex } from './astroChart';
import {
  LOT_FORMULAS,
  LOT_NAMES_EN,
  LOT_NAMES_ZH,
  LOT_RULING_PLANET,
  type LotKey,
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
