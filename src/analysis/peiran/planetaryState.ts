// ============================================================
// 沛然堂线 · 行星状态（Planetary Condition）
// ------------------------------------------------------------
// 只记录可计算的状态事实，不做吉凶断语：
//   · 东出 / 西入（oriental / occidental）
//   · 与太阳的距角：中心（cazimi）/ 燃烧（combust）/ 日光下（under beams）/ 自由
//   · 顺行 / 逆行 / 留
//   · 疾行 / 迟行（相对平均日行速度）
//   · 喜乐宫（planetary joy）与是否落于喜乐宫
//   · 宗派吉凶：是否为本宗派的吉星 / 凶星
//   · 半球：地平线上 / 下（整宫制第 7–12 宫为地上）
// ============================================================

import { norm180, planetPosition, type PlanetName } from './ephemeris';
import {
  JOYS,
  MEAN_DAILY_MOTION,
  PLANET_NAMES_ZH,
  PLANET_SECT_GROUP,
  SECT_BENEFIC,
  SECT_MALEFIC,
  SOLAR_PROXIMITY,
  type Planet,
  type Sect,
} from './tables';

export type SolarState = 'cazimi' | 'combust' | 'underBeams' | 'free';
export type Orientality = 'oriental' | 'occidental' | 'n/a';
export type MotionState = 'direct' | 'retrograde' | 'stationary';
export type SpeedState = 'fast' | 'slow' | 'average';
export type Hemisphere = 'above' | 'below';

export interface PlanetStateFact {
  planet: Planet;
  nameZh: string;
  /** 与太阳的黄经差（−180, 180] */
  solarDelta: number;
  solarState: SolarState;
  orientality: Orientality;
  motion: MotionState;
  speed: SpeedState;
  /** 实际日行度（度/日） */
  dailyMotion: number;
  /** 平均日行度（度/日） */
  meanMotion: number;
  joyHouse: number;
  /** 实际所在整宫制宫位 */
  house: number;
  inJoy: boolean;
  /** 宗派属性 */
  sectGroup: 'light' | 'benefic' | 'malefic' | 'neutral';
  isSectBenefic: boolean;
  isSectMalefic: boolean;
  hemisphere: Hemisphere;
  /** 是否落在宗派内的半球（简化 hayz：昼星在昼盘地上、夜星在夜盘地下） */
  inSectHemisphere: boolean;
}

const PLANET_KEYS: readonly Planet[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

/** 由两条相邻时刻的黄经求日行速度（度/日） */
function dailyMotionOf(planet: Planet, d: number): number {
  if (planet === 'sun' || planet === 'moon') {
    // 日月速度稳定，直接用平均速度即可，避免多余计算
    return MEAN_DAILY_MOTION[planet];
  }
  const before = planetPosition(planet as PlanetName, d - 0.5).lon;
  const after = planetPosition(planet as PlanetName, d + 0.5).lon;
  return norm180(after - before);
}

/**
 * 计算七政行星状态。
 * @param bodiesLon 七政黄经
 * @param bodiesHouse 七政整宫制宫位（1–12）
 * @param d J2000 日数（用于速度差分）
 * @param sect 宗派
 */
export function calculatePlanetStates(
  bodiesLon: Record<Planet, number>,
  bodiesHouse: Record<Planet, number>,
  d: number,
  sect: Sect,
): Record<Planet, PlanetStateFact> {
  const out = {} as Record<Planet, PlanetStateFact>;

  for (const key of PLANET_KEYS) {
    const lon = bodiesLon[key];
    const solarDelta = norm180(lon - bodiesLon.sun);
    const absDelta = Math.abs(solarDelta);

    // 太阳自身不参与「与太阳关系」判定
    const solarState: SolarState =
      key === 'sun'
        ? 'free'
        : absDelta <= SOLAR_PROXIMITY.cazimi
          ? 'cazimi'
          : absDelta <= SOLAR_PROXIMITY.combust
            ? 'combust'
            : absDelta <= SOLAR_PROXIMITY.underBeams
              ? 'underBeams'
              : 'free';

    // 东出 / 西入：黄经差在 (−180, 0) 为东出（先于太阳升起），(0, 180) 为西入
    const orientality: Orientality =
      key === 'sun' ? 'n/a' : solarDelta < 0 ? 'oriental' : 'occidental';

    const motionValue = dailyMotionOf(key, d);
    const motion: MotionState =
      key === 'sun' || key === 'moon'
        ? 'direct'
        : motionValue < -0.0005
          ? 'retrograde'
          : motionValue > 0.0005
            ? 'direct'
            : 'stationary';

    const mean = MEAN_DAILY_MOTION[key];
    const absMotion = Math.abs(motionValue);
    const speed: SpeedState =
      absMotion > mean * 1.1 ? 'fast' : absMotion < mean * 0.9 ? 'slow' : 'average';

    const house = bodiesHouse[key];
    const joyHouse = JOYS[key];
    const hemisphere: Hemisphere = house >= 7 ? 'above' : 'below';

    // 简化 hayz：昼星（日 / 木 / 土）在昼盘地上，夜星（月 / 金 / 火）在夜盘地下
    const dayPlanets: Planet[] = ['sun', 'jupiter', 'saturn'];
    const isDayPlanet = dayPlanets.includes(key);
    const inSectHemisphere =
      sect === 'diurnal' ? isDayPlanet && hemisphere === 'above' : !isDayPlanet && hemisphere === 'below';

    out[key] = {
      planet: key,
      nameZh: PLANET_NAMES_ZH[key],
      solarDelta,
      solarState,
      orientality,
      motion,
      speed,
      dailyMotion: motionValue,
      meanMotion: mean,
      joyHouse,
      house,
      inJoy: house === joyHouse,
      sectGroup: PLANET_SECT_GROUP[key],
      isSectBenefic: SECT_BENEFIC[sect] === key,
      isSectMalefic: SECT_MALEFIC[sect] === key,
      hemisphere,
      inSectHemisphere,
    };
  }

  return out;
}

export const SOLAR_STATE_LABELS: Record<SolarState, string> = {
  cazimi: '中心（cazimi）',
  combust: '燃烧（combust）',
  underBeams: '日光下（under beams）',
  free: '自由',
};

export const ORIENTALITY_LABELS: Record<Orientality, string> = {
  oriental: '东出',
  occidental: '西入',
  'n/a': '—',
};

export const MOTION_LABELS: Record<MotionState, string> = {
  direct: '顺行',
  retrograde: '逆行',
  stationary: '留',
};

export const SPEED_LABELS: Record<SpeedState, string> = {
  fast: '疾行',
  slow: '迟行',
  average: '常速',
};
