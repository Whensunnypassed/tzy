// ============================================================
// 阴阳线上下文（原整套逻辑，一字不改）
// 一次计算月气、用忌、五行力量、格局、富贵、综合分、大运流年。
// 沛然堂线已清空为空壳，当前不读取本文件。
// ============================================================

import type { BaZiChart } from './baziCalculator';
import {
  analyzeMonthQi,
  analyzeYongJi,
  calculateElementPower,
  analyzeMingJuPattern,
  analyzeWealthNobility,
  scoreMingPan,
  analyzeDaYunLiuNian,
  type MonthQiResult,
  type YongJiResult,
} from '../yinyang/engine';

export type AnalysisLineKey = 'yinyang' | 'peiran';

export type ElementPower = { wood: number; fire: number; earth: number; metal: number; water: number };

export interface YinyangAnalysis {
  lineKey: 'yinyang';
  chart: BaZiChart;
  monthQi: MonthQiResult;
  yongJi: YongJiResult;
  elementPower: ElementPower;
  pattern: ReturnType<typeof analyzeMingJuPattern>;
  wealthNobility: ReturnType<typeof analyzeWealthNobility>;
  mingPanScore: ReturnType<typeof scoreMingPan>;
  daYunAnalysis: ReturnType<typeof analyzeDaYunLiuNian>;
}

/** 阴阳线：完全沿用原有月气体系（含 YONG_JI_MODE 开关），不改变任何原判据。 */
export function buildYinyangContext(chart: BaZiChart, currentYear: number): YinyangAnalysis {
  const monthQi = analyzeMonthQi(chart.monthBranchIndex);
  const yongJi = analyzeYongJi(chart, monthQi);
  const elementPower = calculateElementPower(chart);
  const pattern = analyzeMingJuPattern(chart, monthQi, yongJi);
  const wealthNobility = analyzeWealthNobility(
    chart,
    monthQi,
    yongJi,
    elementPower,
    pattern?.nianYueTaiJi ?? undefined,
  );
  const mingPanScore = scoreMingPan(chart, yongJi);
  const daYunAnalysis = analyzeDaYunLiuNian(chart, yongJi, elementPower, currentYear);

  return {
    lineKey: 'yinyang',
    chart,
    monthQi,
    yongJi,
    elementPower,
    pattern,
    wealthNobility,
    mingPanScore,
    daYunAnalysis,
  };
}
