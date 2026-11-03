// ============================================================
// 沛然堂线 · 汇总装配
// ------------------------------------------------------------
// 一次调用产出完整「事实模型」（不含任何吉凶断语）：
//   星盘 → 尊贵 → 虚点 → 行星状态 → 相位 → 时间主星 → 自检
// 展示层只读本模型，不自行重算任何一步（单一真相源）。
// ============================================================

import { buildAstroChart, type AstroChart, type AstroChartInput } from './astroChart';
import { almutenOfDegree, planetDignity, type PlanetDignity } from './dignity';
import { calculateArabicLots, calculateLots, type ArabicLotFact, type LotsResult } from './lots';
import { calculatePlanetStates, type PlanetStateFact } from './planetaryState';
import {
  calculateAversions,
  calculateDegreeAspects,
  calculateLightCollection,
  calculateVoidOfCourse,
  type AversionPair,
  type DegreeAspect,
  type LightCollectionCandidate,
  type VoidOfCourseFact,
} from './aspects';
import {
  ageInYears,
  calculateFirdaria,
  calculateProfections,
  calculateSolarReturn,
  calculateZodiacalReleasing,
  firdariaAtAge,
  type FirdariaPeriod,
  type FirdariaResult,
  type ProfectionsResult,
  type SolarReturnResult,
  type UtcParts,
  type ZRResult,
} from './timeLords';
import { runSelfCheck, type SelfCheckReport } from './selfCheck';
import { PLANETS, type Planet } from './tables';

export interface AlmutenFact {
  planet: Planet;
  score: number;
  resolvedByRuler: boolean;
  table: Array<{ planet: Planet; score: number }>;
}

export interface PeiranModel {
  chart: AstroChart;
  dignities: Record<Planet, PlanetDignity>;
  almutenAsc: AlmutenFact;
  almutenMc: AlmutenFact;
  lots: LotsResult;
  /** 阿拉伯扩展点（父母 / 兄弟 / 子女 / 婚姻 / 债务 / 根基 / 背叛 / 困难） */
  arabicLots: ArabicLotFact[];
  planetStates: Record<Planet, PlanetStateFact>;
  degreeAspects: DegreeAspect[];
  aversions: AversionPair[];
  voidOfCourse: Record<Planet, VoidOfCourseFact>;
  lightCollection: LightCollectionCandidate[];
  /** 当前年龄的周年推运 */
  profections: ProfectionsResult;
  zodiacalReleasing: ZRResult;
  firdaria: FirdariaResult;
  /** 当前年龄所在法尔达利亚主期 */
  currentFirdaria: FirdariaPeriod | null;
  /** 本命年（currentYear）的太阳返照 */
  solarReturn: SolarReturnResult;
  age: number;
  selfCheck: SelfCheckReport;
}

export interface BuildPeiranOptions {
  /** 目标年份（用于年龄、推运与返照） */
  currentYear?: number;
  /** 目标日期（UTC 月 / 日，默认取当年今天） */
  now?: UtcParts;
  /** 黄道释放起点虚点 */
  zrFrom?: 'fortune' | 'spirit';
  /** 命主性别（用于区分男女婚姻点） */
  gender?: 'male' | 'female';
}

/** 由出生信息直接构建完整事实模型 */
export function buildPeiranModel(input: AstroChartInput, options: BuildPeiranOptions = {}): PeiranModel {
  return buildPeiranModelFromChart(buildAstroChart(input), options);
}

/** 由已算好的星盘构建完整事实模型（返照、批量校验用） */
export function buildPeiranModelFromChart(chart: AstroChart, options: BuildPeiranOptions = {}): PeiranModel {
  const nowTs = new Date();
  const now: UtcParts = options.now ?? {
    year: options.currentYear ?? nowTs.getUTCFullYear(),
    month: nowTs.getUTCMonth() + 1,
    day: nowTs.getUTCDate(),
    hour: nowTs.getUTCHours(),
    minute: nowTs.getUTCMinutes(),
  };
  const currentYear = options.currentYear ?? now.year;

  // 七政黄经按 Planet 键重排
  const bodiesLon = {} as Record<Planet, number>;
  const bodiesHouse = {} as Record<Planet, number>;
  const bodiesSign = {} as Record<Planet, number>;
  for (const p of PLANETS) {
    bodiesLon[p] = chart.bodies[p].lon;
    bodiesHouse[p] = chart.bodies[p].house;
    bodiesSign[p] = Math.floor(chart.bodies[p].lon / 30) % 12;
  }

  const planetStates = calculatePlanetStates(bodiesLon, bodiesHouse, chart.days, chart.sect);

  const speeds = {} as Record<Planet, number>;
  for (const p of PLANETS) speeds[p] = planetStates[p].dailyMotion;

  const dignities = {} as Record<Planet, PlanetDignity>;
  for (const p of PLANETS) dignities[p] = planetDignity(p, bodiesLon[p], chart.sect);

  const lots = calculateLots(bodiesLon, chart.asc.lon, chart.sect, chart.asc.signIndex);
  const arabicLots = calculateArabicLots(
    bodiesLon,
    lots,
    chart.asc.lon,
    chart.sect,
    options.gender,
    chart.asc.signIndex,
  );

  const degreeAspects = calculateDegreeAspects(bodiesLon, speeds);
  const aversions = calculateAversions(bodiesSign);
  const voidOfCourse = calculateVoidOfCourse(bodiesLon, speeds);
  const lightCollection = calculateLightCollection(degreeAspects);

  const age = ageInYears(chart.utc, now);
  const profections = calculateProfections(chart.asc.signIndex, age);

  const zodiacalReleasing = calculateZodiacalReleasing(
    chart.utc,
    lots.lots.fortune.lon,
    lots.lots.spirit.lon,
    options.zrFrom ?? 'fortune',
    90,
  );

  const firdaria = calculateFirdaria(chart.sect);
  const currentFirdaria = firdariaAtAge(firdaria, age);

  const solarReturn = calculateSolarReturn(chart.utc, chart.bodies.sun.lon, currentYear, chart.city);

  const selfCheck = runSelfCheck(chart);

  return {
    chart,
    dignities,
    almutenAsc: almutenOfDegree(chart.asc.lon, chart.sect),
    almutenMc: almutenOfDegree(chart.mc.lon, chart.sect),
    lots,
    arabicLots,
    planetStates,
    degreeAspects,
    aversions,
    voidOfCourse,
    lightCollection,
    profections,
    zodiacalReleasing,
    firdaria,
    currentFirdaria,
    solarReturn,
    age,
    selfCheck,
  };
}
