// ============================================================
// 沛然堂线 · 自检体系（Self-Validation）
// ------------------------------------------------------------
// 三层次校验，供 CI / 脚本 / 页面调用：
//   A. 规则表全称性：覆盖完整、无重叠、无空缺、总量恒定
//   B. 星盘不变量：角度范围、宫位覆盖、宗派一致性
//   C. 跨模块一致性：虚点镜像关系、尊贵互斥、时间主星连续
//
// 任何一个失败项都表示「规则或算法有实质错误」，不是风格问题。
// ============================================================

import { norm180, norm360 } from './ephemeris';
import {
  DECANS,
  DOMICILES,
  EGYPTIAN_BOUNDS,
  EXALTATIONS,
  FIRDARIA_DAY,
  FIRDARIA_NIGHT,
  JOYS,
  LOT_FORMULAS,
  PLANETS,
  SIGN_RULERS,
  TRIPLICITY,
  ZR_SIGN_YEARS,
  type LotKey,
  type Planet,
} from './tables';
import { calculateLots, calculateArabicLots } from './lots';
import { planetDignity } from './dignity';
import type { AstroChart } from './astroChart';
import type { LillyReport } from './lilly';

export interface CheckItem {
  id: string;
  group: 'tables' | 'chart' | 'cross';
  name: string;
  passed: boolean;
  detail: string;
}

function ok(id: string, group: CheckItem['group'], name: string, detail: string): CheckItem {
  return { id, group, name, passed: true, detail };
}

function fail(id: string, group: CheckItem['group'], name: string, detail: string): CheckItem {
  return { id, group, name, passed: false, detail };
}

// ------------------------------------------------------------
// A. 规则表全称性
// ------------------------------------------------------------

export function checkTables(): CheckItem[] {
  const out: CheckItem[] = [];

  // A1 埃及界：每星座 5 段、末值 30、严格递增
  let boundsBad = 0;
  let boundsTotal = 0;
  for (const segs of EGYPTIAN_BOUNDS) {
    boundsTotal += 1;
    if (segs.length !== 5) boundsBad += 1;
    if (segs[segs.length - 1].to !== 30) boundsBad += 1;
    for (let i = 1; i < segs.length; i += 1) {
      if (segs[i].to <= segs[i - 1].to) boundsBad += 1;
    }
  }
  out.push(
    boundsBad === 0
      ? ok('T1', 'tables', '埃及界表完整', `${boundsTotal} 星座 × 5 段，末段 30°，严格递增`)
      : fail('T1', 'tables', '埃及界表完整', `异常项 ${boundsBad} 处`),
  );

  // A2 三分主星：每元素三角色齐备且互不相同
  let triBad = 0;
  for (const el of Object.keys(TRIPLICITY) as Array<keyof typeof TRIPLICITY>) {
    const t = TRIPLICITY[el];
    const set = new Set([t.day, t.night, t.participating]);
    if (set.size !== 3) triBad += 1;
  }
  out.push(
    triBad === 0
      ? ok('T2', 'tables', '三分主星表完整', '四元素各三主星，互不相同')
      : fail('T2', 'tables', '三分主星表完整', `异常元素 ${triBad} 个`),
  );

  // A3 庙：每星座恰有一个守护星
  const rulerCover = new Set<number>();
  SIGN_RULERS.forEach((_, i) => rulerCover.add(i));
  const domicileCover = new Set<number>();
  for (const p of PLANETS) {
    for (const s of DOMICILES[p]) {
      if (domicileCover.has(s)) domicileCover.add(-1); // 重复
      domicileCover.add(s);
    }
  }
  const domicileOk =
    rulerCover.size === 12 && domicileCover.size === 12 && !domicileCover.has(-1);
  out.push(
    domicileOk
      ? ok('T3', 'tables', '庙位覆盖 12 星座', '每星座恰有一颗守护星，无重复')
      : fail('T3', 'tables', '庙位覆盖 12 星座', `覆盖 ${domicileCover.size} 个星座，存在重复或缺口`),
  );

  // A4 旺：七政各一点，且旺位分布在 7 个互不相同的星座
  // 注意：传统设定中水星旺于处女、同时守护处女，因此不检查「旺位与庙位重合」。
  const exaltSigns = PLANETS.map((p) => EXALTATIONS[p].sign);
  const exaltOk = new Set(exaltSigns).size === 7;
  out.push(
    exaltOk
      ? ok('T4', 'tables', '旺位表合法', '七政各一旺位，分布于 7 个不同星座')
      : fail('T4', 'tables', '旺位表合法', `旺位仅覆盖 ${new Set(exaltSigns).size} 个星座`),
  );

  // A5 面：36 面，且三面互不相同
  let faceBad = 0;
  for (const d of DECANS) {
    if (new Set(d).size !== 3) faceBad += 1;
  }
  out.push(
    faceBad === 0
      ? ok('T5', 'tables', '面位表 36 面', '12 星座 × 3 面，每星座三面互不相同')
      : fail('T5', 'tables', '面位表 36 面', `${faceBad} 个星座存在重复面主星`),
  );

  // A6 喜乐宫：1–12 宫一一对应
  const joyHouses = PLANETS.map((p) => JOYS[p]).sort((a, b) => a - b);
  const joyOk = new Set(joyHouses).size === 7 && joyHouses.every((h) => h >= 1 && h <= 12);
  out.push(
    joyOk
      ? ok('T6', 'tables', '喜乐宫唯一映射', `七政分别落于第 ${joyHouses.join('/')} 宫`)
      : fail('T6', 'tables', '喜乐宫唯一映射', '存在重复或越界'),
  );

  // A7 ZR 年数：12 项、总和 211、均为正
  const zrSum = ZR_SIGN_YEARS.reduce((a, b) => a + b, 0);
  out.push(
    ZR_SIGN_YEARS.length === 12 && zrSum === 211 && ZR_SIGN_YEARS.every((y) => y > 0)
      ? ok('T7', 'tables', '黄道释放年数', `12 星座，总和 ${zrSum} 年（传统值 211）`)
      : fail('T7', 'tables', '黄道释放年数', `12 项总和应为 211，实际 ${zrSum}`),
  );

  // A8 法尔达利亚：昼夜两套各 75 年
  const daySum = FIRDARIA_DAY.reduce((a, b) => a + b.years, 0);
  const nightSum = FIRDARIA_NIGHT.reduce((a, b) => a + b.years, 0);
  out.push(
    daySum === 75 && nightSum === 75
      ? ok('T8', 'tables', '法尔达利亚周期', `昼 ${daySum} 年 / 夜 ${nightSum} 年`)
      : fail('T8', 'tables', '法尔达利亚周期', `昼 ${daySum} / 夜 ${nightSum}，应为 75`),
  );

  // A9 虚点：七点齐备，Fortune 与 Spirit 昼夜公式互为镜像
  const lotKeys: LotKey[] = ['fortune', 'spirit', 'eros', 'necessity', 'courage', 'victory', 'nemesis'];
  let lotBad = 0;
  for (const k of lotKeys) {
    const f = LOT_FORMULAS[k];
    if (k === 'fortune' || k === 'spirit') {
      if (f.day.plus !== f.night.minus || f.day.minus !== f.night.plus) lotBad += 1;
    }
  }
  out.push(
    lotBad === 0
      ? ok('T9', 'tables', '七虚点公式', '七点齐备；Fortune / Spirit 昼夜互为镜像')
      : fail('T9', 'tables', '七虚点公式', `${lotBad} 处昼夜公式不对称`),
  );

  return out;
}

// ------------------------------------------------------------
// B. 星盘不变量
// ------------------------------------------------------------

export function checkChart(chart: AstroChart): CheckItem[] {
  const out: CheckItem[] = [];

  // B1 黄经范围
  const bodiesOk = Object.values(chart.bodies).every(
    (b) => Number.isFinite(b.lon) && b.lon >= 0 && b.lon < 360,
  );
  out.push(
    bodiesOk
      ? ok('C1', 'chart', '七政黄经范围', '全部落在 [0, 360)')
      : fail('C1', 'chart', '七政黄经范围', '存在越界或非有限值'),
  );

  // B2 宫位覆盖 12 星座且不重复
  const houseSet = new Set(chart.houseSigns);
  out.push(
    houseSet.size === 12
      ? ok('C2', 'chart', '整宫制覆盖', '12 宫位覆盖 12 星座，无重复')
      : fail('C2', 'chart', '整宫制覆盖', `仅覆盖 ${houseSet.size} 个星座`),
  );

  // B3 宗派与太阳宫位一致
  const expectSect = chart.sunHouse >= 7 ? 'diurnal' : 'nocturnal';
  out.push(
  expectSect === chart.sect
      ? ok('C3', 'chart', '宗派判定自洽', `太阳第 ${chart.sunHouse} 宫 → ${chart.sect}`)
      : fail('C3', 'chart', '宗派判定自洽', `太阳第 ${chart.sunHouse} 宫但判为 ${chart.sect}`),
  );

  // B4 MC 与 ASC 的宫距合理（MC 应在 ASC 之后约 7–11 宫）
  const ascSign = chart.asc.signIndex;
  const mcSign = Math.floor(norm360(chart.mc.lon) / 30) % 12;
  const diff = (((mcSign - ascSign) % 12) + 12) % 12;
  out.push(
    diff >= 7 || diff === 0
      ? ok('C4', 'chart', '轴点关系', `MC 距 ASC ${diff} 宫（允许 7–11 或同宫高纬情形）`)
      : fail('C4', 'chart', '轴点关系', `MC 距 ASC ${diff} 宫，异常`),
  );

  // B5 行星落宫与星座一致
  let houseBad = 0;
  for (const b of Object.values(chart.bodies)) {
    const expect = ((Math.floor(norm360(b.lon) / 30) % 12) - ascSign + 12) % 12 + 1;
    if (b.house !== expect) houseBad += 1;
  }
  out.push(
    houseBad === 0
      ? ok('C5', 'chart', '落宫自洽', '七政宫位与星座、ASC 一致')
      : fail('C5', 'chart', '落宫自洽', `${houseBad} 颗行星宫位不符`),
  );

  return out;
}

// ------------------------------------------------------------
// C. 跨模块一致性
// ------------------------------------------------------------

export function checkCrossModule(chart: AstroChart): CheckItem[] {
  const out: CheckItem[] = [];

  const bodiesLon = {} as Record<Planet, number>;
  for (const p of PLANETS) bodiesLon[p] = chart.bodies[p].lon;

  const lots = calculateLots(bodiesLon, chart.asc.lon, chart.sect, chart.asc.signIndex);

  // C1 Fortune 与 Spirit 关于 ASC 对称：F + S ≡ 2·ASC (mod 360)
  const sum = norm360(lots.lots.fortune.lon + lots.lots.spirit.lon);
  const expect = norm360(2 * chart.asc.lon);
  const delta = Math.abs(norm180(sum - expect));
  out.push(
    delta < 0.01
      ? ok('X1', 'cross', '虚点镜像关系', `Fortune + Spirit ≡ 2·ASC，偏差 ${delta.toFixed(4)}°`)
      : fail('X1', 'cross', '虚点镜像关系', `偏差 ${delta.toFixed(4)}°（应 < 0.01°）`),
  );

  // C2 尊贵互斥：同一行星不可能同时命中庙与陷
  let dignityBad = 0;
  for (const p of PLANETS) {
    const d = planetDignity(p, bodiesLon[p], chart.sect);
    if (d.kinds.includes('domicile') && d.kinds.includes('detriment')) dignityBad += 1;
    if (d.kinds.includes('exaltation') && d.kinds.includes('fall')) dignityBad += 1;
  }
  out.push(
    dignityBad === 0
      ? ok('X2', 'cross', '尊贵互斥', '庙 / 陷、旺 / 落 不会同时成立')
      : fail('X2', 'cross', '尊贵互斥', `${dignityBad} 处冲突`),
  );

  // C3 每个度数必有一个界主星（全域覆盖，无空隙）
  let boundGap = 0;
  for (let sign = 0; sign < 12; sign += 1) {
    const segs = EGYPTIAN_BOUNDS[sign];
    let cursor = 0;
    for (const seg of segs) {
      if (seg.to > cursor) cursor = seg.to;
    }
    if (cursor < 30) boundGap += 1;
  }
  out.push(
    boundGap === 0
      ? ok('X3', 'cross', '界位无空隙', '12 星座 0–30° 全部被界主星覆盖')
      : fail('X3', 'cross', '界位无空隙', `${boundGap} 个星座存在未覆盖度数`),
  );

  // C4 虚点落宫合法（1–12）
  const lotHouseOk = Object.values(lots.lots).every((l) => l.house >= 1 && l.house <= 12);
  out.push(
    lotHouseOk
      ? ok('X4', 'cross', '虚点落宫', '七虚点宫位均在 1–12')
      : fail('X4', 'cross', '虚点落宫', '存在越界虚点'),
  );

  // C5 阿拉伯点昼夜互补：昼公式与夜公式的结果关于 ASC 对称（和 ≡ 2·ASC）
  // 例外：foundation 依赖 fortune / spirit，而这两点本身随宗派互换，故不参与。
  const dayLots = calculateArabicLots(bodiesLon, lots, chart.asc.lon, 'diurnal', undefined, chart.asc.signIndex);
  const nightLots = calculateArabicLots(bodiesLon, lots, chart.asc.lon, 'nocturnal', undefined, chart.asc.signIndex);
  let arabicBad = 0;
  for (let i = 0; i < dayLots.length; i += 1) {
    if (dayLots[i].key === 'foundation') continue;
    const sum = norm360(dayLots[i].lon + nightLots[i].lon);
    const expect = norm360(2 * chart.asc.lon);
    if (Math.abs(norm180(sum - expect)) > 0.01) arabicBad += 1;
  }
  out.push(
    arabicBad === 0
      ? ok('X5', 'cross', '阿拉伯点昼夜互补', '昼 / 夜公式结果关于 ASC 对称（foundation 例外）')
      : fail('X5', 'cross', '阿拉伯点昼夜互补', `${arabicBad} 点不满足镜像关系`),
  );

  return out;
}

// ------------------------------------------------------------
// 汇总
// ------------------------------------------------------------

/** Lilly 计分自检：量程、方向性（东出 / 西入对重轻行星的方向相反）、强弱一致性 */
export function checkLilly(report: LillyReport): CheckItem[] {
  const out: CheckItem[] = [];
  const scores = Object.values(report.scores);

  const inRange = scores.every((s) => s.total >= -38 && s.total <= 38);
  out.push(
    inRange
      ? ok('L1', 'cross', 'Lilly 分数量程', '七政总分均在 −38 ~ +38 之间（Lilly 原表量程）')
      : fail('L1', 'cross', 'Lilly 分数量程', '存在越界分数'),
  );

  // 方向性：土 / 木 / 火 东出为 +2，水 / 金 东出为 −2
  let dirBad = 0;
  for (const s of scores) {
    for (const item of s.accidental) {
      if (item.key === 'orientalHeavy' && item.value !== 2) dirBad += 1;
      if (item.key === 'orientalLight' && item.value !== -2) dirBad += 1;
      if (item.key === 'occidentalHeavy' && item.value !== -2) dirBad += 1;
      if (item.key === 'occidentalLight' && item.value !== 2) dirBad += 1;
    }
  }
  out.push(
    dirBad === 0
      ? ok('L2', 'cross', 'Lilly 东出西入方向', '重行星东出为吉、轻行星西入为吉，方向未反')
      : fail('L2', 'cross', 'Lilly 东出西入方向', `${dirBad} 处方向相反`),
  );

  // 总分 = 本质和 + 偶然和
  const sumOk = scores.every((s) => s.total === s.essentialSum + s.accidentalSum);
  out.push(
    sumOk
      ? ok('L3', 'cross', 'Lilly 合计自洽', '总分等于本质与偶然之和')
      : fail('L3', 'cross', 'Lilly 合计自洽', '合计与分项不符'),
  );

  // 最强 / 最弱必须落在五颗非发光体中
  const validPick = !['sun', 'moon'].includes(report.strongest) && !['sun', 'moon'].includes(report.weakest);
  out.push(
    validPick
      ? ok('L4', 'cross', 'Lilly 最强最弱选取', `${report.strongest} / ${report.weakest} 均为五星范围`)
      : fail('L4', 'cross', 'Lilly 最强最弱选取', '把太阳或月亮选为最强 / 最弱'),
  );

  return out;
}

export interface SelfCheckReport {
  items: CheckItem[];
  passed: number;
  failed: number;
  allPassed: boolean;
}

export function runSelfCheck(chart?: AstroChart | null, lilly?: LillyReport): SelfCheckReport {
  const items: CheckItem[] = [...checkTables()];
  if (chart) {
    items.push(...checkChart(chart), ...checkCrossModule(chart));
  }
  if (lilly) {
    items.push(...checkLilly(lilly));
  }
  const passed = items.filter((i) => i.passed).length;
  const failed = items.length - passed;
  return { items, passed, failed, allPassed: failed === 0 };
}
