// ============================================================
// 沛然堂线 · 纳音五维评分（盘层 / 学历 / 财富 / 情感 / 工作）
// 本模块只读取 PeiranAnalysis（纳音身命法），不读取阴阳线引擎。
// 设计原则：象为体、生克为用；规则原子化，输出证据链与置信度；
// 权重是 v1.0 初始值，后续用公共案例库回归校准。
// ============================================================

import type { ElementKey } from './nayinData';
import { CLASSICAL_START, CLASSICAL_LINGUAN, NAYIN_PEACH_BRANCH } from './nayinData';
import type { PeiranAnalysis, NayinPillar } from './nayinAnalyzer';

export type TriGrade = 'high' | 'mid' | 'low';
export type WorkType = '体制/组织' | '企业/专业' | '个体/自由' | '学生/未工作';
export type EmotionState = '稳定' | '波动' | '未知';
export type Confidence = 'high' | 'medium' | 'low';

export interface DimVerdict {
  label: string;
  score: number;
  evidence: string[];
  basis: string;
  confidence: Confidence;
}

export interface GradeVerdict extends DimVerdict {
  grade: TriGrade;
}

export interface EmotionVerdict extends DimVerdict {
  state: EmotionState;
}

export interface WorkVerdict extends DimVerdict {
  type: WorkType;
}

export interface FiveDimensions {
  level: GradeVerdict;
  education: GradeVerdict;
  wealth: GradeVerdict;
  emotion: EmotionVerdict;
  work: WorkVerdict;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const gradeOf = (score: number, high = 65, low = 45): TriGrade => (score >= high ? 'high' : score <= low ? 'low' : 'mid');
const gradeLabel = (g: TriGrade) => (g === 'high' ? '偏高' : g === 'low' ? '偏弱' : '中平');
const confidenceOf = (score: number, evidence: number): Confidence => {
  const dist = Math.min(Math.abs(score - 45), Math.abs(score - 65));
  if (evidence >= 3 && dist >= 8) return 'high';
  if (evidence >= 2 && dist >= 3) return 'medium';
  return 'low';
};

// 正五行长生 / 临官（用于三命通会「学堂 / 词馆」，不可用盲派纳音长生代替）
// 统一定义在 nayinData.ts，避免两套表分叉

const CHAIN_SCORE: Record<PeiranAnalysis['chain']['kind'], number> = {
  shengUp: 12,
  keDown: 10,
  same: 4,
  mixed: 0,
  shengDown: -10,
  keUp: -12,
};

const SAN_HE_SCORE: Record<PeiranAnalysis['sanHe']['relation'], number> = {
  same: 8,
  shengYear: 6,
  yearKe: 4,
  yearSheng: -6,
  keYear: -8,
};

const SELF_SHENG = new Set(['辛巳', '癸酉', '己亥', '辛卯', '甲申', '丙子', '丙寅', '戊午', '戊申', '庚子']);

function pillarsWith(a: PeiranAnalysis, branch: string): NayinPillar[] {
  return a.pillars.filter((p) => p.branch === branch);
}

function hasBranch(a: PeiranAnalysis, branch: string): boolean {
  return a.pillars.some((p) => p.branch === branch);
}

function countPattern(a: PeiranAnalysis, names: string[]): number {
  return a.patterns.filter((p) => names.includes(p.name)).length;
}

function ageOf(a: PeiranAnalysis, currentYear: number): number | null {
  const m = /^(\d{4})/.exec(a.chart.birthInfo.solarDate ?? '');
  return m ? currentYear - +m[1] : null;
}

/** 五维总评：只消费纳音身命法结果。 */
export function analyzeFiveDimensions(a: PeiranAnalysis, currentYear = new Date().getFullYear()): FiveDimensions {
  const yearEl = a.yearNayin.element;
  const dayEl = a.dayNayin.element;
  const chainScore = CHAIN_SCORE[a.chain.kind];
  const sanHeScore = SAN_HE_SCORE[a.sanHe.relation];
  const bodyAdj = Math.round((a.body.score - 50) * 0.3);
  const patternBonus = Math.min(18, a.patterns.length * 6);
  const xingPenalty = Math.min(12, a.xingChong.hits.length * 4);
  const pureAdj = a.pure.isPure ? (a.pure.label === '一行独盛' ? -4 : 2) : 0;

  // 社区规则：见根才兑现（无根降权）；同五行位次只作平台/量级弱信号。
  const rootAdj = a.genRoot.rooted ? 0 : -8;
  const wealthRankAdj = a.rank.year.tier === 'high' ? 3 : a.rank.year.tier === 'low' ? -3 : 0;
  const levelRankAdj = a.rank.year.tier === 'high' ? 2 : a.rank.year.tier === 'low' ? -2 : 0;

  // ---------- 学历 ----------
  const eduEvidence: string[] = [];
  let eduScore = 50;
  const schoolA = CLASSICAL_START[yearEl];
  const schoolB = CLASSICAL_START[dayEl];
  const ciGuanA = CLASSICAL_LINGUAN[yearEl];
  const ciGuanB = CLASSICAL_LINGUAN[dayEl];
  if (hasBranch(a, schoolA) || hasBranch(a, schoolB)) {
    eduScore += 10;
    eduEvidence.push(`见纳音学堂位（${hasBranch(a, schoolA) ? schoolA : schoolB}）+10`);
  }
  if (hasBranch(a, ciGuanA) || hasBranch(a, ciGuanB)) {
    eduScore += 8;
    eduEvidence.push(`见纳音词馆位（${hasBranch(a, ciGuanA) ? ciGuanA : ciGuanB}）+8`);
  }
  const ganzhi = a.pillars.map((p) => p.ganzhi);
  if (ganzhi.includes('乙亥') && ganzhi.includes('丁巳')) {
    eduScore += 8;
    eduEvidence.push('乙亥见丁巳 · 文星入词馆 +8');
  }
  const branches = a.pillars.map((p) => p.branch);
  if (['寅', '卯', '辰', '巳'].every((b) => branches.includes(b))) {
    eduScore += 6;
    eduEvidence.push('寅卯辰巳顺 · 云龙风虎 +6');
  }
  if ((yearEl === 'water' || dayEl === 'water') && (branches.includes('寅') || branches.includes('卯')) && a.pillars.some((p) => p.entry.element === 'metal')) {
    eduScore += 6;
    eduEvidence.push('水命见寅卯、纳音见金 · 源远流清 +6');
  }
  if (dayEl === 'wood' || dayEl === 'water') {
    eduScore += 4;
    eduEvidence.push(`日柱纳音${dayEl === 'wood' ? '木' : '水'} · 文秀之气 +4`);
  }
  if (rootAdj) {
    eduScore += rootAdj;
    eduEvidence.push(`纳音无根 ${rootAdj}`);
  } else {
    eduEvidence.push(`纳音见根（${a.genRoot.branches.join('、')}）`);
  }
  if (xingPenalty) {
    eduScore -= Math.min(8, xingPenalty);
    eduEvidence.push(`刑冲害 ${a.xingChong.hits.length} 处 -${Math.min(8, xingPenalty)}`);
  }
  eduScore = clamp(eduScore);
  const educationGrade = gradeOf(eduScore, 50, 40);
  const education: GradeVerdict = {
    grade: educationGrade,
    score: eduScore,
    label: gradeLabel(educationGrade),
    evidence: eduEvidence,
    basis: '纳音学堂/词馆位、见根、文星、木水之气与刑冲',
    confidence: confidenceOf(eduScore, eduEvidence.length),
  };

  // ---------- 财富 ----------
  const wealthEvidence: string[] = [];
  let wealthScore = 50 + chainScore + bodyAdj + sanHeScore + patternBonus + pureAdj - xingPenalty;
  wealthEvidence.push(`${a.chain.label} ${chainScore >= 0 ? '+' : ''}${chainScore}`);
  wealthEvidence.push(`身强弱 ${a.body.label} ${bodyAdj >= 0 ? '+' : ''}${bodyAdj}`);
  if (sanHeScore !== 0) wealthEvidence.push(`三合局 ${a.sanHe.label} ${sanHeScore >= 0 ? '+' : ''}${sanHeScore}`);
  if (patternBonus) wealthEvidence.push(`象格 ${a.patterns.map((p) => p.name).join('、')} +${patternBonus}`);
  if (pureAdj) wealthEvidence.push(`纳音结构 ${a.pure.label} ${pureAdj >= 0 ? '+' : ''}${pureAdj}`);
  if (xingPenalty) wealthEvidence.push(`刑冲害 -${xingPenalty}`);
  wealthScore += rootAdj + wealthRankAdj;
  if (rootAdj) wealthEvidence.push(`纳音无根 ${rootAdj}`);
  if (wealthRankAdj) wealthEvidence.push(`年命位次 ${a.rank.year.label} ${wealthRankAdj >= 0 ? '+' : ''}${wealthRankAdj}`);
  const selfShengHits = a.pillars.filter((p) => SELF_SHENG.has(p.ganzhi));
  if (selfShengHits.length) {
    wealthScore += 8;
    wealthEvidence.push(`自生自旺：${selfShengHits.map((p) => p.ganzhi).join('、')} +8`);
  }
  wealthScore = clamp(wealthScore);
  const wealthGrade = gradeOf(wealthScore, 58, 45);
  const wealth: GradeVerdict = {
    grade: wealthGrade,
    score: wealthScore,
    label: gradeLabel(wealthGrade),
    evidence: wealthEvidence,
    basis: '四柱纳音顺逆生克、见根、同五行位次、三合与自生自旺',
    confidence: confidenceOf(wealthScore, wealthEvidence.length),
  };

  // ---------- 盘层 ----------
  const levelEvidence: string[] = [];
  let levelScore = 50 + chainScore + bodyAdj + patternBonus + sanHeScore + pureAdj - xingPenalty;
  levelEvidence.push(`${a.chain.label} ${chainScore >= 0 ? '+' : ''}${chainScore}`);
  levelEvidence.push(`年命${a.body.label} ${bodyAdj >= 0 ? '+' : ''}${bodyAdj}`);
  if (sanHeScore !== 0) levelEvidence.push(`三合局 ${a.sanHe.label} ${sanHeScore >= 0 ? '+' : ''}${sanHeScore}`);
  if (patternBonus) levelEvidence.push(`象格 ${a.patterns.map((p) => p.name).join('、')} +${patternBonus}`);
  if (xingPenalty) levelEvidence.push(`刑冲害 -${xingPenalty}`);
  levelScore += levelRankAdj;
  if (levelRankAdj) levelEvidence.push(`年命位次 ${a.rank.year.label} ${levelRankAdj >= 0 ? '+' : ''}${levelRankAdj}`);
  levelScore = clamp(levelScore);
  const levelGrade = gradeOf(levelScore, 58, 45);
  const level: GradeVerdict = {
    grade: levelGrade,
    score: levelScore,
    label: gradeLabel(levelGrade),
    evidence: levelEvidence,
    basis: '年命纳音与月/日/时生克、见根、位次、三合、象格与刑冲',
    confidence: confidenceOf(levelScore, levelEvidence.length),
  };

  // ---------- 情感 ----------
  const emoEvidence: string[] = [];
  let emoScore = 50;
  if (a.yearNayin.element === a.dayNayin.element) {
    emoScore += 4;
    emoEvidence.push('年命与日柱纳音同气 +4');
  } else if (a.pillars[2].relation === 'shengYear') {
    emoScore += 10;
    emoEvidence.push('日柱纳音生年命 +10');
  } else if (a.pillars[2].relation === 'yearKe') {
    emoScore -= 4;
    emoEvidence.push('年命克日柱纳音 -4');
  } else if (a.pillars[2].relation === 'yearSheng') {
    emoScore -= 8;
    emoEvidence.push('年命生日柱纳音 -8');
  } else if (a.pillars[2].relation === 'keYear') {
    emoScore -= 14;
    emoEvidence.push('日柱纳音克年命 -14');
  }
  const peach = [...NAYIN_PEACH_BRANCH[yearEl], ...NAYIN_PEACH_BRANCH[dayEl]];
  if (peach.includes(a.chart.day.branch) || peach.includes(a.chart.year.branch)) {
    emoScore += 4;
    emoEvidence.push('见纳音桃花 +4');
  }
  if (xingPenalty) {
    emoScore -= Math.min(16, xingPenalty * 2);
    emoEvidence.push(`年支刑冲害 ${a.xingChong.hits.length} 处 -${Math.min(16, xingPenalty * 2)}`);
  }
  emoScore = clamp(emoScore);
  const emoState: EmotionState = emoScore >= 58 ? '稳定' : emoScore <= 42 ? '波动' : '未知';
  const emotion: EmotionVerdict = {
    state: emoState,
    score: emoScore,
    label: emoState === '未知' ? '情感平稳，需结合具体关系' : emoState,
    evidence: emoEvidence,
    basis: '年命与日柱纳音生克、纳音桃花与刑冲',
    confidence: confidenceOf(emoScore, emoEvidence.length),
  };

  // ---------- 工作 ----------
  const workEvidence: string[] = [];
  const age = ageOf(a, currentYear);
  let workType: WorkType;
  if (age !== null && age < 26) {
    workType = '学生/未工作';
    workEvidence.push(`年龄 ${age} · 学生/未工作阶段`);
  } else if (chainScore <= -10) {
    workType = '个体/自由';
    workEvidence.push(`${a.chain.label} · 变动型`);
  } else if (chainScore >= 10 || countPattern(a, ['宝剑化青龙', '金马嘶风', '珠藏渊海', '蚌珠照月']) > 0) {
    workType = '体制/组织';
    workEvidence.push(`${a.chain.label}${a.patterns.length ? `；象格 ${a.patterns.map((p) => p.name).join('、')}` : ''} · 组织/体制型`);
  } else if (dayEl === 'water' || dayEl === 'fire') {
    workType = '个体/自由';
    workEvidence.push(`日柱纳音${dayEl === 'water' ? '水' : '火'} · 流动/市场型`);
  } else if (dayEl === 'wood' || dayEl === 'earth') {
    workType = '体制/组织';
    workEvidence.push(`日柱纳音${dayEl === 'wood' ? '木' : '土'} · 文教/组织型`);
  } else {
    workType = '企业/专业';
    workEvidence.push('日柱纳音金 · 专业/企业型');
  }
  const workScore = clamp(50 + chainScore + bodyAdj + patternBonus - xingPenalty);
  const work: WorkVerdict = {
    type: workType,
    score: workScore,
    label: workType,
    evidence: workEvidence,
    basis: '日柱纳音五行与四柱生克链所成的环境取向',
    confidence: confidenceOf(workScore, workEvidence.length),
  };

  return { level, education, wealth, emotion, work };
}
