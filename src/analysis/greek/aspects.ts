// ============================================================
// 希腊线 · 相位引擎
// ------------------------------------------------------------
// 输出两类相位事实：
//   1) 度相位（degree aspects）：按 orb 判定，含应用 / 分离；
//   2) 整宫相位（sign aspects）：希腊占星读盘主用，见 astroChart。
// 另附：
//   · 空亡（void of course）：线性速度解算「离开本星座前是否入相」
//   · 映照（aversion）：整宫相隔 1 / 5 / 7 / 11 宫，彼此不相见
//   · 光线传递 / 收集（translation / collection of light）
//
// 边界：只给事实，不给吉凶。
// ============================================================

import { norm180, norm360 } from './ephemeris';
import { ASPECT_ORBS, PLANET_NAMES_ZH, type Planet } from './tables';

export type DegreeAspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

export const DEGREE_ASPECT_LABELS: Record<DegreeAspectType, string> = {
  conjunction: '合',
  sextile: '六合',
  square: '刑',
  trine: '三合',
  opposition: '冲',
};

const TARGET_ANGLES: Array<{ type: DegreeAspectType; angle: number }> = [
  { type: 'conjunction', angle: 0 },
  { type: 'sextile', angle: 60 },
  { type: 'square', angle: 90 },
  { type: 'trine', angle: 120 },
  { type: 'opposition', angle: 180 },
];

export interface DegreeAspect {
  a: Planet;
  b: Planet;
  type: DegreeAspectType;
  /** 目标角度 */
  target: number;
  /** 实际角距（0–180） */
  actual: number;
  /** 偏离目标的角度 */
  deviation: number;
  /** 容许度上限 */
  orbLimit: number;
  applying: boolean;
  separating: boolean;
  /** 是否为「入相且未出容许度」的精确相位 */
  exacting: boolean;
  /** 中文 */
  label: string;
  labelA: string;
  labelB: string;
}

/**
 * 计算七政之间的度相位。
 * @param bodiesLon 黄经
 * @param speeds 日行速度（度/日，可为负 = 逆行）
 */
export function calculateDegreeAspects(
  bodiesLon: Record<Planet, number>,
  speeds: Record<Planet, number>,
): DegreeAspect[] {
  const planets = Object.keys(bodiesLon) as Planet[];
  const out: DegreeAspect[] = [];

  for (let i = 0; i < planets.length; i += 1) {
    for (let j = i + 1; j < planets.length; j += 1) {
      const a = planets[i];
      const b = planets[j];
      const diff = norm180(bodiesLon[b] - bodiesLon[a]);
      const actual = Math.abs(diff);

      for (const t of TARGET_ANGLES) {
        const deviation = Math.abs(actual - t.angle);
        const orbLimit = ASPECT_ORBS[t.type];
        if (deviation > orbLimit) continue;

        // 应用 / 分离：看未来 0.5 天后偏离是否变小
        const futureDiff = Math.abs(
          norm180(
            bodiesLon[b] + speeds[b] * 0.5 - (bodiesLon[a] + speeds[a] * 0.5),
          ),
        );
        const futureDeviation = Math.abs(futureDiff - t.angle);
        const applying = futureDeviation < deviation;
        const separating = !applying;

        out.push({
          a,
          b,
          type: t.type,
          target: t.angle,
          actual,
          deviation,
          orbLimit,
          applying,
          separating,
          exacting: deviation <= 1,
          label: DEGREE_ASPECT_LABELS[t.type],
          labelA: PLANET_NAMES_ZH[a],
          labelB: PLANET_NAMES_ZH[b],
        });
        break; // 一对行星只取最接近的一个相位
      }
    }
  }

  return out;
}

// ------------------------------------------------------------
// 空亡（void of course）
// ------------------------------------------------------------

export interface VoidOfCourseFact {
  planet: Planet;
  isVoid: boolean;
  /** 离开本星座前的最后入相（若有） */
  lastAspect: { with: Planet; type: DegreeAspectType; inDays: number } | null;
}

/**
 * 以线性速度近似求解：行星在离开当前星座之前，是否会与某颗行星形成
 * 精确相位（入相）。若不会，则判为空亡。
 */
export function calculateVoidOfCourse(
  bodiesLon: Record<Planet, number>,
  speeds: Record<Planet, number>,
): Record<Planet, VoidOfCourseFact> {
  const planets = Object.keys(bodiesLon) as Planet[];
  const out = {} as Record<Planet, VoidOfCourseFact>;

  for (const a of planets) {
    const lonA = bodiesLon[a];
    const vA = speeds[a];
    if (vA === 0) {
      out[a] = { planet: a, isVoid: false, lastAspect: null };
      continue;
    }
    // 到星座末度所需天数
    const degInSign = norm360(lonA) % 30;
    const daysToSignEnd = (30 - degInSign) / Math.abs(vA);
    if (daysToSignEnd > 900) {
      // 速度极慢（土星级），不做空亡判定，避免误报
      out[a] = { planet: a, isVoid: false, lastAspect: null };
      continue;
    }

    let best: { with: Planet; type: DegreeAspectType; inDays: number } | null = null;

    for (const b of planets) {
      if (a === b) continue;
      const vB = speeds[b];
      const relative = vB - vA;
      if (Math.abs(relative) < 1e-9) continue;

      const delta0 = norm360(bodiesLon[b] - lonA);

      for (const t of TARGET_ANGLES) {
        for (const target of [t.angle, 360 - t.angle]) {
          // delta(t) = delta0 + relative * t ≡ target (mod 360)
          let dt = (target - delta0) / relative;
          while (dt < 0) dt += 360 / Math.abs(relative);
          if (dt <= 0 || dt > daysToSignEnd) continue;
          if (!best || dt < best.inDays) {
            best = { with: b, type: t.type, inDays: dt };
          }
        }
      }
    }

    out[a] = { planet: a, isVoid: best === null, lastAspect: best };
  }

  return out;
}

// ------------------------------------------------------------
// 映照（aversion）：整宫相隔 1 / 5 / 7 / 11 宫
// ------------------------------------------------------------

export interface AversionPair {
  a: Planet;
  b: Planet;
  /** 宫距（1–11） */
  distance: number;
  labelA: string;
  labelB: string;
}

export function calculateAversions(
  bodiesSign: Record<Planet, number>,
): AversionPair[] {
  const planets = Object.keys(bodiesSign) as Planet[];
  const out: AversionPair[] = [];
  for (let i = 0; i < planets.length; i += 1) {
    for (let j = i + 1; j < planets.length; j += 1) {
      const a = planets[i];
      const b = planets[j];
      const d = (((bodiesSign[b] - bodiesSign[a]) % 12) + 12) % 12;
      if (d === 1 || d === 5 || d === 7 || d === 11) {
        out.push({
          a,
          b,
          distance: Math.min(d, 12 - d),
          labelA: PLANET_NAMES_ZH[a],
          labelB: PLANET_NAMES_ZH[b],
        });
      }
    }
  }
  return out;
}

// ------------------------------------------------------------
// 光线传递 / 收集（translation / collection of light）
// 传统定义：传递 = 一颗行星先与 A 入相、再与 B 入相，把 A 的光带给 B；
//           收集 = A、B 都与同一颗较重的行星入相，由该星收集两者之光。
// 本引擎按「度相位 + 应用」给出候选，再由调用方判定是否成立。
// ------------------------------------------------------------

export interface LightTransferCandidate {
  translator: Planet;
  from: Planet;
  to: Planet;
  /** 到 first 的入相天数（线性近似） */
  daysToFrom: number;
  /** 到 second 的入相天数 */
  daysToTo: number;
}

export interface LightCollectionCandidate {
  collector: Planet;
  collected: [Planet, Planet];
  /** 收集星是否重于两者（土 > 木 > 火 > 金 > 水） */
  weightOrder: number;
}

/** 行星「重量」序：土 5 > 木 4 > 火 3 > 金 2 > 水 1 > 日月 0 */
export const PLANET_WEIGHT: Record<Planet, number> = {
  saturn: 5,
  jupiter: 4,
  mars: 3,
  venus: 2,
  mercury: 1,
  sun: 0,
  moon: 0,
};

/**
 * 收集光：某行星与另外两颗行星同时处于入相容许度内，
 * 且自身重量不低于两者。
 */
export function calculateLightCollection(aspects: DegreeAspect[]): LightCollectionCandidate[] {
  const out: LightCollectionCandidate[] = [];
  const applying = aspects.filter((a) => a.applying);

  const byCollector = new Map<Planet, Set<Planet>>();
  for (const asp of applying) {
    if (!byCollector.has(asp.a)) byCollector.set(asp.a, new Set());
    if (!byCollector.has(asp.b)) byCollector.set(asp.b, new Set());
    byCollector.get(asp.a)!.add(asp.b);
    byCollector.get(asp.b)!.add(asp.a);
  }

  for (const [collector, others] of byCollector) {
    const list = Array.from(others).filter((p) => p !== collector);
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (PLANET_WEIGHT[collector] < Math.min(PLANET_WEIGHT[a], PLANET_WEIGHT[b])) continue;
        out.push({
          collector,
          collected: [a, b],
          weightOrder: PLANET_WEIGHT[collector],
        });
      }
    }
  }
  return out;
}
