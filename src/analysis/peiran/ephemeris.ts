// ============================================================
// 沛然堂线 · 行星黄历（自研，零依赖）
// ------------------------------------------------------------
// 算法来源：公开的低精度太阳系位置算法
//   · Paul Schlyter《Computing planetary positions》(1996–2010 修订)
//   · Jean Meeus《Astronomical Algorithms》第 25/47 章的简化项
// 适用区间：1800–2100（区间外误差迅速增大，调用方应拦截）
// 精度（对照 Swiss Ephemeris 的经验值）：
//   太阳  ≈ 0.01°（36″）
//   月亮  ≈ 0.3°（含主要摄动项后）
//   水金火木土 ≈ 1–2 角分（含木土大摄动项）
// 对占星判读足够（星座 30°、界 6–12°，1 角分不影响落座/落界）。
//
// 边界：本文件只输出黄道坐标，不做任何命理判定。
// ============================================================

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** 归一化到 [0, 360) */
export function norm360(x: number): number {
  const v = x % 360;
  return v < 0 ? v + 360 : v;
}

/** 将角度差归一化到 (−180, 180] */
export function norm180(x: number): number {
  const v = norm360(x);
  return v > 180 ? v - 360 : v;
}

/**
 * 自 2000-01-01 00:00 UT 起算的日数（含小数）。
 * Schlyter 的 d 定义，整数部分用其原始公式以保证与算法一致。
 *
 * 注意：Schlyter 的 d=0 实际对应 **1999-12-31 00:00 UT**（其原文的
 * 「2000 Jan 0.0」），与 J2000（2000-01-01 12:00）相差 1.5 天。
 * 行星算法必须用本函数；恒星时/赤道坐标必须用 `daysSinceJ2000UT`。
 */
export function daysSinceJ2000(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number {
  const y = year;
  const m = month;
  const d0 =
    367 * y -
    Math.trunc((7 * (y + Math.trunc((m + 9) / 12))) / 4) +
    Math.trunc((275 * m) / 9) +
    day -
    730530;
  return d0 + (hour + minute / 60) / 24;
}

/** 儒略日（UT 时标），1970-01-01 00:00 UTC = 2440587.5 */
export function julianDayUT(year: number, month: number, day: number, hour = 0, minute = 0): number {
  const ms = Date.UTC(year, month - 1, day, hour, minute);
  return ms / 86400000 + 2440587.5;
}

/**
 * 自 J2000.0（2000-01-01 12:00 UT）起算的日数。
 * 恒星时、赤经赤纬、黄赤交角的历元基准必须用本函数。
 */
export function daysSinceJ2000UT(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number {
  return julianDayUT(year, month, day, hour, minute) - 2451545.0;
}

/** 黄赤交角（度），Schlyter 线性式 */
export function obliquityDeg(d: number): number {
  return 23.4393 - 3.563e-7 * d;
}

interface SunPos {
  lon: number;
  /** 日地距离（AU） */
  r: number;
  /** 直角坐标（黄道面内） */
  x: number;
  y: number;
  /** 平近点角（度），行星摄动要用 */
  M: number;
}

/** 太阳地心黄经 */
export function sunPosition(d: number): SunPos {
  const w = 282.9404 + 4.70935e-5 * d;
  const e = 0.016709 - 1.151e-9 * d;
  const M = norm360(356.047 + 0.9856002585 * d);
  // 开普勒方程一阶近似
  const E = M + e * RAD * Math.sin(M * DEG) * (1 + e * Math.cos(M * DEG));
  const xv = Math.cos(E * DEG) - e;
  const yv = Math.sqrt(1 - e * e) * Math.sin(E * DEG);
  const v = Math.atan2(yv, xv) * RAD;
  const r = Math.sqrt(xv * xv + yv * yv);
  const lon = norm360(v + w);
  return { lon, r, x: r * Math.cos(lon * DEG), y: r * Math.sin(lon * DEG), M };
}

interface PlanetElements {
  N: number;
  i: number;
  w: number;
  a: number;
  e: number;
  M: number;
}

/** 七大行星（不含日月）的轨道根数，随 d 线性变化 */
function planetElements(name: PlanetName, d: number): PlanetElements {
  switch (name) {
    case 'mercury':
      return {
        N: 48.3313 + 3.245456e-5 * d,
        i: 7.0047 + 5.0e-8 * d,
        w: 29.1241 + 1.01444e-5 * d,
        a: 0.387098,
        e: 0.205635 + 5.59e-10 * d,
        M: norm360(168.6562 + 4.0923344368 * d),
      };
    case 'venus':
      return {
        N: 76.6799 + 2.4659e-5 * d,
        i: 3.3946 + 2.75e-8 * d,
        w: 54.891 + 1.38374e-5 * d,
        a: 0.723316,
        e: 0.006773 - 1.302e-9 * d,
        M: norm360(48.0052 + 1.6021302244 * d),
      };
    case 'mars':
      return {
        N: 49.5574 + 2.11081e-5 * d,
        i: 1.8497 - 1.78e-8 * d,
        w: 286.5016 + 2.92961e-5 * d,
        a: 1.523688,
        e: 0.093405 + 2.516e-9 * d,
        M: norm360(18.6021 + 0.5240207766 * d),
      };
    case 'jupiter':
      return {
        N: 100.4542 + 2.76854e-5 * d,
        i: 1.303 - 1.557e-7 * d,
        w: 273.8777 + 1.64505e-5 * d,
        a: 5.20256,
        e: 0.048405 + 3.088e-9 * d,
        M: norm360(19.895 + 0.0830853001 * d),
      };
    case 'saturn':
      return {
        N: 113.6634 + 2.3898e-5 * d,
        i: 2.4886 - 1.081e-7 * d,
        w: 339.3939 + 2.97661e-5 * d,
        a: 9.55475,
        e: 0.055596 + 2.131e-9 * d,
        M: norm360(316.967 + 0.0334442282 * d),
      };
    default:
      throw new Error(`unsupported planet: ${name satisfies never}`);
  }
}

/** 解开普勒方程（迭代到 1e-7 rad） */
function solveKepler(Mdeg: number, e: number): number {
  let E = Mdeg * DEG;
  for (let k = 0; k < 12; k += 1) {
    const dE = (E - e * Math.sin(E) - Mdeg * DEG) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 由轨道根数求日心黄道直角坐标 */
function heliocentric(el: PlanetElements): { vec: Vec3; lonecl: number; latecl: number; r: number; v: number } {
  const E = solveKepler(el.M, el.e);
  const xv = el.a * (Math.cos(E) - el.e);
  const yv = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);

  const vw = v + el.w * DEG;
  const cosN = Math.cos(el.N * DEG);
  const sinN = Math.sin(el.N * DEG);
  const cosVW = Math.cos(vw);
  const sinVW = Math.sin(vw);
  const cosI = Math.cos(el.i * DEG);
  const sinI = Math.sin(el.i * DEG);

  const x = r * (cosN * cosVW - sinN * sinVW * cosI);
  const y = r * (sinN * cosVW + cosN * sinVW * cosI);
  const z = r * (sinVW * sinI);

  const lonecl = Math.atan2(y, x) * RAD;
  const latecl = Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD;
  return { vec: { x, y, z }, lonecl, latecl, r, v };
}

export type PlanetName = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

export interface BodyPosition {
  /** 地心视黄经（度，0–360，0 = 白羊 0°） */
  lon: number;
  /** 黄纬（度） */
  lat: number;
  /** 是否逆行 */
  retrograde: boolean;
}

/** 月亮地心黄经（含主要摄动项） */
export function moonPosition(d: number): BodyPosition {
  const N = 125.1228 - 0.0529538083 * d;
  const i = 5.1454;
  const w = 318.0634 + 0.1643573223 * d;
  const a = 60.2666;
  const e = 0.0549;
  const M = norm360(115.3654 + 13.0649929509 * d);

  const E = solveKepler(M, e);
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv) * RAD;
  const r = Math.sqrt(xv * xv + yv * yv);

  const vw = (v + w) * DEG;
  const cosN = Math.cos(N * DEG);
  const sinN = Math.sin(N * DEG);
  const cosI = Math.cos(i * DEG);
  const sinI = Math.sin(i * DEG);

  const x = r * (cosN * Math.cos(vw) - sinN * Math.sin(vw) * cosI);
  const y = r * (sinN * Math.cos(vw) + cosN * Math.sin(vw) * cosI);
  const z = r * Math.sin(vw) * sinI;

  let lon = Math.atan2(y, x) * RAD;
  let lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD;

  // 主要摄动（Schlyter 表，单位：度）
  const sun = sunPosition(d);
  const Ms = sun.M;
  const Ls = norm360(sun.lon); // 太阳黄经
  const Mm = M;
  const Lm = norm360(N + w + M); // 月亮平黄经
  const D = norm360(Lm - Ls); // 月日距角
  const F = norm360(Lm - N); // 升交点距角

  lon +=
    -1.274 * Math.sin((Mm - 2 * D) * DEG) +
    0.658 * Math.sin(2 * D * DEG) +
    -0.186 * Math.sin(Ms * DEG) +
    -0.059 * Math.sin((2 * Mm - 2 * D) * DEG) +
    -0.057 * Math.sin((Mm - 2 * D + Ms) * DEG) +
    0.053 * Math.sin((Mm + 2 * D) * DEG) +
    0.046 * Math.sin((2 * D - Ms) * DEG) +
    0.041 * Math.sin((Mm - Ms) * DEG) +
    -0.035 * Math.sin(D * DEG) +
    -0.031 * Math.sin((Mm + Ms) * DEG) +
    -0.015 * Math.sin((2 * F - 2 * D) * DEG) +
    0.011 * Math.sin((Mm - 4 * D) * DEG);

  lat +=
    -0.173 * Math.sin((F - 2 * D) * DEG) +
    -0.055 * Math.sin((Mm - F - 2 * D) * DEG) +
    -0.046 * Math.sin((Mm + F - 2 * D) * DEG) +
    0.033 * Math.sin((F + 2 * D) * DEG) +
    0.017 * Math.sin((2 * Mm + F) * DEG);

  const midnight = norm360(lon);
  return { lon: midnight, lat, retrograde: false };
}

/** 行星地心黄经（含木星/土星大摄动） */
export function planetPosition(name: PlanetName, d: number): BodyPosition {
  const el = planetElements(name, d);
  const helio = heliocentric(el);
  const sun = sunPosition(d);

  // 地心直角坐标 = 行星日心 + 太阳地心（太阳地心坐标即 −地球日心）
  const xg = helio.vec.x + sun.x;
  const yg = helio.vec.y + sun.y;
  const zg = helio.vec.z;

  let lon = Math.atan2(yg, xg) * RAD;
  const lat = Math.atan2(zg, Math.sqrt(xg * xg + yg * yg)) * RAD;

  if (name === 'jupiter' || name === 'saturn') {
    const Mj = norm360(19.895 + 0.0830853001 * d);
    const Ms = norm360(316.967 + 0.0334442282 * d);
    if (name === 'jupiter') {
      lon +=
        -0.332 * Math.sin((2 * Mj - 5 * Ms - 67.6) * DEG) +
        -0.056 * Math.sin((2 * Mj - 2 * Ms + 21) * DEG) +
        0.042 * Math.sin((3 * Mj - 5 * Ms + 21) * DEG) +
        -0.036 * Math.sin((Mj - 2 * Ms) * DEG) +
        0.022 * Math.cos((Mj - Ms) * DEG) +
        0.023 * Math.sin((2 * Mj - 3 * Ms + 52) * DEG) +
        -0.016 * Math.sin((Mj - 5 * Ms - 69) * DEG);
    } else {
      lon +=
        0.812 * Math.sin((2 * Mj - 5 * Ms - 67.6) * DEG) +
        -0.229 * Math.cos((2 * Mj - 4 * Ms - 2) * DEG) +
        0.119 * Math.sin((Mj - 2 * Ms - 3) * DEG) +
        0.046 * Math.sin((2 * Mj - 6 * Ms - 69) * DEG) +
        0.014 * Math.sin((Mj - 3 * Ms + 32) * DEG);
    }
  }

  // 逆行判定：用 ±0.5 天差分符号
  const lonBefore = rawPlanetLon(name, d - 0.5);
  const lonAfter = rawPlanetLon(name, d + 0.5);
  const motion = norm180(lonAfter - lonBefore);
  return { lon: norm360(lon), lat, retrograde: motion < 0 };
}

/** 不含摄动的原始黄经，供差分定逆行（避免递归开销过大） */
function rawPlanetLon(name: PlanetName, d: number): number {
  const el = planetElements(name, d);
  const helio = heliocentric(el);
  const sun = sunPosition(d);
  return norm360(Math.atan2(helio.vec.y + sun.y, helio.vec.x + sun.x) * RAD);
}

export type BodyKey = 'sun' | 'moon' | PlanetName;

export const BODY_KEYS: readonly BodyKey[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
] as const;

export const BODY_NAMES_ZH: Record<BodyKey, string> = {
  sun: '太阳',
  moon: '月亮',
  mercury: '水星',
  venus: '金星',
  mars: '火星',
  jupiter: '木星',
  saturn: '土星',
};

/** 一次算齐七政的视黄经 */
export function allBodyPositions(d: number): Record<BodyKey, BodyPosition> {
  const sun = sunPosition(d);
  const out = {
    sun: { lon: sun.lon, lat: 0, retrograde: false },
    moon: moonPosition(d),
    mercury: planetPosition('mercury', d),
    venus: planetPosition('venus', d),
    mars: planetPosition('mars', d),
    jupiter: planetPosition('jupiter', d),
    saturn: planetPosition('saturn', d),
  } as Record<BodyKey, BodyPosition>;
  return out;
}
