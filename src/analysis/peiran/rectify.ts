// ============================================================
// 沛然堂线 · 验前事与出生时间校准（Rectification）
// ------------------------------------------------------------
// 传统做法：命主已知若干人生事件的年份 → 检查该年的时间主星
// 是否与事件主题吻合 → 在候选出生时刻窗口内扫描，找吻合度最高的时刻。
//
// 本实现只做「扫描 + 打分」，不做自动下结论：
//   1. 每个候选时刻重算星盘（分钟级偏移只影响 ASC / 宫位）；
//   2. 对每个事件，检查该年推运宫位与事件宫位是否一致；
//   3. 汇总得分，输出候选排序与逐事件明细。
//
// 边界：
//   · 事件只精确到年，推运按「事件年 − 出生年」计，误差最多一年；
//   · 校准结果只表示「与这批事件最相容」，不表示「真实出生时间」。
// ============================================================

import { buildAstroChart, type AstroChart, type AstroChartInput } from './astroChart';
import { calculateProfections } from './timeLords';
import { planetDignity } from './dignity';
import { PLANET_NAMES_ZH, SIGN_NAMES_ZH, SIGN_RULERS, type Planet } from './tables';
import type { Sect } from './tables';

export type LifeEventType =
  | 'marriage'
  | 'child'
  | 'career'
  | 'relocation'
  | 'illness'
  | 'loss'
  | 'education'
  | 'other';

export interface LifeEvent {
  /** 事件发生年份 */
  year: number;
  type: LifeEventType;
  note?: string;
}

export const EVENT_HOUSE: Record<LifeEventType, number> = {
  marriage: 7,
  child: 5,
  career: 10,
  relocation: 4,
  illness: 6,
  loss: 8,
  education: 9,
  other: 0,
};

export const EVENT_NAMES_ZH: Record<LifeEventType, string> = {
  marriage: '婚姻 / 确立伴侣',
  child: '子女出生',
  career: '事业变动 / 升迁',
  relocation: '迁居 / 换城市',
  illness: '重病 / 手术',
  loss: '亲人离世 / 重大损失',
  education: '升学 / 考试',
  other: '其他',
};

export interface EventMatch {
  event: LifeEvent;
  age: number;
  profectionHouse: number;
  profectionSign: string;
  yearLord: Planet;
  yearLordName: string;
  yearLordScore: number;
  eventHouse: number;
  houseHit: boolean;
  lordHit: boolean;
  score: number;
  detail: string[];
}

export interface TimeCandidate {
  offsetMinutes: number;
  localTime: string;
  asc: { lon: number; sign: string; signDeg: number };
  totalScore: number;
  matches: EventMatch[];
}

export interface RectificationResult {
  candidates: TimeCandidate[];
  best: TimeCandidate;
  /** 前几名得分相同 → 证据不足 */
  flat: boolean;
  note: string;
}

export interface RectifyOptions {
  windowMinutes?: number;
  stepMinutes?: number;
}

/** 由基准输入与分钟偏移生成新输入（自动处理跨小时 / 跨日） */
function shiftMinutes(input: AstroChartInput, offset: number): AstroChartInput {
  const d = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute + offset));
  return {
    ...input,
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

function lillyScoreOf(planet: Planet, lon: number, sect: Sect): number {
  return planetDignity(planet, lon, sect).score;
}

/** 单个事件在给定星盘与年龄下的匹配得分 */
function matchEvent(chart: AstroChart, event: LifeEvent, age: number): EventMatch {
  const prof = calculateProfections(chart.asc.signIndex, age);
  const eventHouse = EVENT_HOUSE[event.type];
  const eventLord = eventHouse > 0 ? SIGN_RULERS[chart.houseSigns[eventHouse - 1]] : null;
  const score = lillyScoreOf(prof.lord, chart.bodies[prof.lord].lon, chart.sect);

  const houseHit = eventHouse > 0 && prof.house === eventHouse;
  const lordHit = eventLord !== null && prof.lord === eventLord;

  let total = 0;
  const detail: string[] = [];

  if (eventHouse === 0) {
    detail.push('未指定事件类型，不参与校准');
  } else {
    if (houseHit) {
      total += 4;
      detail.push(`推运落第 ${prof.house} 宫，与事件宫位一致（+4）`);
    } else {
      detail.push(`推运落第 ${prof.house} 宫，事件宫为第 ${eventHouse} 宫（未命中）`);
    }
    if (lordHit) {
      total += 3;
      detail.push(`年主星${PLANET_NAMES_ZH[prof.lord]}即事件宫主（+3）`);
    }
    if (score >= 5) {
      total += 2;
      detail.push(`年主星本质 ${score} 分，状态偏强（+2）`);
    } else if (score <= -5) {
      total -= 2;
      detail.push(`年主星本质 ${score} 分，状态偏弱（−2）`);
    }
  }

  return {
    event,
    age,
    profectionHouse: prof.house,
    profectionSign: SIGN_NAMES_ZH[prof.signIndex],
    yearLord: prof.lord,
    yearLordName: PLANET_NAMES_ZH[prof.lord],
    yearLordScore: score,
    eventHouse,
    houseHit,
    lordHit,
    score: total,
    detail,
  };
}

/**
 * 扫描出生时刻窗口，按已知事件打分排序。
 * 只重算 ASC / 宫位相关部分；行星在 ±30 分钟内的位移对本校准可忽略。
 */
export function rectifyBirthTime(
  input: AstroChartInput,
  events: LifeEvent[],
  options: RectifyOptions = {},
): RectificationResult {
  const windowMinutes = options.windowMinutes ?? 30;
  const stepMinutes = options.stepMinutes ?? 1;
  const baseYear = input.year;

  const candidates: TimeCandidate[] = [];

  for (let offset = -windowMinutes; offset <= windowMinutes; offset += stepMinutes) {
    const shifted = shiftMinutes(input, offset);
    const chart = buildAstroChart(shifted);
    // 年龄按「事件年 − 出生年」（事件只到年，取上界）
    const matches = events.map((e) => matchEvent(chart, e, Math.max(0, e.year - baseYear)));
    const totalScore = matches.reduce((s, m) => s + m.score, 0);

    candidates.push({
      offsetMinutes: offset,
      localTime: `${String(shifted.hour).padStart(2, '0')}:${String(shifted.minute).padStart(2, '0')}`,
      asc: { lon: chart.asc.lon, sign: chart.asc.sign, signDeg: chart.asc.signDeg },
      totalScore,
      matches,
    });
  }

  candidates.sort(
    (a, b) => b.totalScore - a.totalScore || Math.abs(a.offsetMinutes) - Math.abs(b.offsetMinutes),
  );

  const best = candidates[0];
  const topFive = candidates.slice(0, 5);
  const flat = topFive.every((c) => c.totalScore === best.totalScore);

  return {
    candidates,
    best,
    flat,
    note: flat
      ? '多个候选时刻得分相同，这批事件不足以定位出生时间，建议补充更多事件或精确到月份。'
      : `最相容时刻 ${best.localTime}（偏移 ${best.offsetMinutes > 0 ? '+' : ''}${best.offsetMinutes} 分钟），ASC ${best.asc.sign} ${best.asc.signDeg.toFixed(1)}°。仅为与事件最相容，不代表真实出生时间。`,
  };
}

/** 供展示：事件类型的中文名 */
export function eventName(type: LifeEventType): string {
  return EVENT_NAMES_ZH[type];
}

// ------------------------------------------------------------
// 按年龄给出建议事件
// ------------------------------------------------------------
// 不同人生阶段可用的里程碑事件不同：学生没有婚姻与子女，
// 若统一问结婚 / 生子，学生用户会直接卡住。
// 每组三条覆盖三个不同宫位，保证有区分力。
// ------------------------------------------------------------

interface StageSpec {
  /** 该阶段年龄上限（含） */
  maxAge: number;
  label: string;
  types: readonly [LifeEventType, LifeEventType, LifeEventType];
}

export const EVENT_STAGES: readonly StageSpec[] = [
  { maxAge: 22, label: '学生阶段', types: ['education', 'relocation', 'illness'] },
  { maxAge: 30, label: '青年阶段', types: ['education', 'career', 'relocation'] },
  { maxAge: 45, label: '成家阶段', types: ['marriage', 'child', 'relocation'] },
  { maxAge: 200, label: '中年以后', types: ['loss', 'illness', 'child'] },
] as const;

/** 由年龄取所处阶段 */
export function stageOf(age: number): StageSpec {
  return EVENT_STAGES.find((s) => age <= s.maxAge) ?? EVENT_STAGES[EVENT_STAGES.length - 1];
}

/** 该年龄段的默认三条建议事件 */
export function suggestEvents(age: number): LifeEventType[] {
  return [...stageOf(age).types];
}

/** 该年龄段的阶段名 */
export function stageLabel(age: number): string {
  return stageOf(age).label;
}

/**
 * 事件覆盖度检查：事件若都落在同一宫位，不同出生时刻算出的推运
 * 宫位差别不大，校准没有区分力。此时应提示用户补充别类事件。
 */
export function assessEventCoverage(events: LifeEventType[]): {
  distinctHouses: number;
  enough: boolean;
  warning: string | null;
} {
  const houses = new Set(
    events.map((t) => EVENT_HOUSE[t]).filter((h) => h > 0),
  );
  const distinctHouses = houses.size;

  if (events.length < 2) {
    return { distinctHouses, enough: false, warning: '至少需要 2 个不同年份的事件才能校准。' };
  }
  if (distinctHouses <= 1) {
    return {
      distinctHouses,
      enough: false,
      warning: '所有事件指向同一宫位，区分度不足。建议补充一个不同类型的事件（如搬家、住院、升学）。',
    };
  }
  if (distinctHouses === 2) {
    return {
      distinctHouses,
      enough: true,
      warning: '仅覆盖两个宫位，校准结果仅供参考；再加一个不同宫位的事件会明显更稳。',
    };
  }
  return { distinctHouses, enough: true, warning: null };
}
