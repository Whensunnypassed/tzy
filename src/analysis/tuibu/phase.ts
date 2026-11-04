/**
 * 推步线 · L2 相位层（月将加时）
 *
 * 借大六壬的「月将加时」作为**时点相位**参数：它不产气、不判吉凶，
 * 只回答「这一刻天地盘错位几格、四课上下神是什么」。
 *
 * 边界（见《推步线·定义与1.3任务》§三）：
 * - 月将按中气换将（主流口径），用中气名索引；
 * - 天将、课体、类神、应期口诀一律不进本层。
 */

import { BRANCHES } from './sanyuan';

export const ZHONG_QI = ['雨水', '春分', '谷雨', '小满', '夏至', '大暑', '处暑', '秋分', '霜降', '小雪', '冬至', '大寒'] as const;

/** 中气 → 月将（雨水后亥，春分后戌……大寒后子）。 */
export const GENERAL_BY_ZHONGQI: Record<string, string> = {
  雨水: '亥', 春分: '戌', 谷雨: '酉', 小满: '申', 夏至: '未', 大暑: '午',
  处暑: '巳', 秋分: '辰', 霜降: '卯', 小雪: '寅', 冬至: '丑', 大寒: '子',
};

const BRANCH_INDEX: Record<string, number> = Object.fromEntries(BRANCHES.map((b, i) => [b, i]));

/** 日干寄宫：甲寄寅、乙寄辰、丙戊寄巳、丁己寄未、庚寄申、辛寄戌、壬寄亥、癸寄丑。 */
export const JI_GONG: Record<string, string> = {
  甲: '寅', 乙: '辰', 丙: '巳', 丁: '未', 戊: '巳', 己: '未', 庚: '申', 辛: '戌', 壬: '亥', 癸: '丑',
};

export interface FourLessons {
  /** 第一课：日干上神 */
  one: string;
  /** 第二课：日干上神之上神 */
  two: string;
  /** 第三课：日支上神 */
  three: string;
  /** 第四课：日支上神之上神 */
  four: string;
}

/** 由月将、占时求错位量 k。 */
export function kOperator(general: string, hourBranch: string): number {
  const g = BRANCH_INDEX[general];
  const h = BRANCH_INDEX[hourBranch];
  if (g === undefined || h === undefined) throw new Error(`未知地支：${general} / ${hourBranch}`);
  return (g - h + 12) % 12;
}

/** 天地盘：地盘支 → 天盘支。 */
export function skyMap(k: number): Record<string, string> {
  const offset = ((k % 12) + 12) % 12;
  return Object.fromEntries(BRANCHES.map((b, i) => [b, BRANCHES[(i + offset) % 12]]));
}

/** 取某地盘宫之上的天盘支。 */
export function skyOf(branch: string, k: number): string {
  const i = BRANCH_INDEX[branch];
  if (i === undefined) throw new Error(`未知地支：${branch}`);
  return BRANCHES[(i + (((k % 12) + 12) % 12)) % 12];
}

/** 四课（只给结构，不判课体）。 */
export function fourLessons(dayStem: string, dayBranch: string, k: number): FourLessons {
  const ganGong = JI_GONG[dayStem] ?? dayStem;
  const one = skyOf(ganGong, k);
  return {
    one,
    two: skyOf(one, k),
    three: skyOf(dayBranch, k),
    four: skyOf(skyOf(dayBranch, k), k),
  };
}

/** k 的结构性质：端点与全冲/全合/全害。 */
export function kProfile(k: number): { name: string; note: string } {
  const offset = ((k % 12) + 12) % 12;
  if (offset === 0) return { name: '伏吟', note: '天地盘重合，静而不动' };
  if (offset === 6) return { name: '返吟', note: '天地盘全冲，动而不静' };
  if (offset === 3 || offset === 9) return { name: '全冲', note: '十二宫处处相冲' };
  if (offset === 4 || offset === 8) return { name: '全合', note: '十二宫处处三合' };
  if (offset === 5 || offset === 7) return { name: '全害', note: '十二宫处处相害' };
  return { name: '错位', note: `天盘相对地盘错开 ${offset} 格` };
}
