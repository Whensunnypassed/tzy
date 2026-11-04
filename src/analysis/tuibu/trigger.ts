/**
 * 推步线 · L4 触发层（时窗标记）
 *
 * 只回答「什么时候容易被碰到」，不回答「碰到会怎样」。
 * 刑冲合害在八字层已算过（L3 判据），本层只做**流年/大运支与四柱宫的碰撞曝光**，
 * 输出带置信度的窗口标记，一律不进总分——这是「同名同事实只算一次」的落点。
 */

import { BRANCHES } from './sanyuan';

export type Target = 'year' | 'month' | 'day' | 'hour';
export type MarkerKind = '冲' | '六合' | '害' | '刑';

export interface WindowMarker {
  kind: MarkerKind;
  target: Target;
  natalBranch: string;
  transitBranch: string;
  confidence: 'high' | 'medium' | 'low';
  note: string;
}

const TARGET_LABEL: Record<Target, string> = { year: '年支', month: '月支', day: '日支', hour: '时支' };

const SIX_HE = new Set(['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未']);
const SIX_HAI = new Set(['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌']);
const XING_PAIRS = new Set(['寅巳', '巳申', '申寅', '丑戌', '戌未', '未丑', '子卯', '卯子']);
const SELF_XING = new Set(['辰', '午', '酉', '亥']);

const indexOf = (branch: string) => (BRANCHES as readonly string[]).indexOf(branch);

export function isChong(a: string, b: string): boolean {
  const i = indexOf(a);
  const j = indexOf(b);
  return i >= 0 && j >= 0 && (i - j + 12) % 12 === 6;
}

export function isLiuHe(a: string, b: string): boolean {
  return SIX_HE.has(a + b) || SIX_HE.has(b + a);
}

export function isHai(a: string, b: string): boolean {
  return SIX_HAI.has(a + b) || SIX_HAI.has(b + a);
}

export function isXing(a: string, b: string): boolean {
  if (a === b) return SELF_XING.has(a);
  return XING_PAIRS.has(a + b);
}

/** 流年支（或大运支）照四柱：返回所有命中窗口。 */
export function transitMarkers(transitBranch: string, natal: Record<Target, string>): WindowMarker[] {
  const markers: WindowMarker[] = [];
  (Object.keys(natal) as Target[]).forEach((target) => {
    const natalBranch = natal[target];
    const add = (kind: MarkerKind, confidence: WindowMarker['confidence'], note: string) => {
      markers.push({ kind, target, natalBranch, transitBranch, confidence, note });
    };
    if (isChong(transitBranch, natalBranch)) add('冲', target === 'day' ? 'high' : 'medium', `${TARGET_LABEL[target]}被冲动：环境变动、行程与人事更替的常见窗口`);
    else if (isLiuHe(transitBranch, natalBranch)) add('六合', 'medium', `${TARGET_LABEL[target]}被合：合作、绑定、关系靠近的窗口`);
    else if (isHai(transitBranch, natalBranch)) add('害', 'low', `${TARGET_LABEL[target]}被害：暗损、误会、琐碎摩擦的窗口`);
    else if (isXing(transitBranch, natalBranch)) add('刑', 'low', `${TARGET_LABEL[target]}被刑：手续、法度、内部消耗的窗口`);
  });
  return markers;
}

/** 双钟：慢钟=节气月（格局），快钟=流月/流日（触发）。此处只给当前慢钟落点。 */
export function slowClock(transitYearBranch: string): { branch: string; label: string } {
  return { branch: transitYearBranch, label: `流年${transitYearBranch}支` };
}
