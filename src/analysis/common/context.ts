// ============================================================
// 阴阳线上下文（原整套逻辑，一字不改）
// 一次计算月气、用忌、五行力量、格局、富贵、综合分、大运流年。
// 希腊线已清空为空壳，当前不读取本文件。
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
  resolveDirection,
  resolveYongJiMode,
  type MonthQiResult,
  type YongJiResult,
} from '../yinyang/engine';

export type AnalysisLineKey = 'yinyang' | 'greek' | 'zalu';

export type ElementPower = { wood: number; fire: number; earth: number; metal: number; water: number };

export interface YinyangAnalysis {
  lineKey: 'yinyang';
  chart: BaZiChart;
  monthQi: MonthQiResult;
  yongJi: YongJiResult;
  /** 实际生效的判据方向（已按 mode 解析，下游以此为准） */
  direction: 'yang' | 'yin';
  /** 判据来源：taiji = 二气配比；binary = 逐月固化口径 */
  directionSource: 'taiji' | 'binary';
  elementPower: ElementPower;
  pattern: ReturnType<typeof analyzeMingJuPattern>;
  wealthNobility: ReturnType<typeof analyzeWealthNobility>;
  mingPanScore: ReturnType<typeof scoreMingPan>;
  daYunAnalysis: ReturnType<typeof analyzeDaYunLiuNian>;
}

export interface YinyangOptions {
  /**
   * 判据来源覆盖。缺省沿用 YONG_JI_MODE（逐月灰度 > 全局开关）。
   * 保留接口，默认不传。
   */
  yongJiMode?: 'taiji' | 'binary';
}

/** 阴阳线：完全沿用原有月气体系（含 YONG_JI_MODE 开关），不改变任何原判据。 */
export function buildYinyangContext(chart: BaZiChart, currentYear: number, options: YinyangOptions = {}): YinyangAnalysis {
  const monthQi = analyzeMonthQi(chart.monthBranchIndex);
  const yongJi = analyzeYongJi(chart, monthQi, options.yongJiMode);
  const direction = resolveDirection(chart, monthQi, options.yongJiMode);
  const directionSource = resolveYongJiMode(chart.month.branch, options.yongJiMode);

  // 全链路同源：下游模块只认这一个方向，不再各自读 monthQi.usageDirection
  const effectiveMonthQi: MonthQiResult =
    direction === monthQi.usageDirection ? monthQi : { ...monthQi, usageDirection: direction };

  const elementPower = calculateElementPower(chart);
  const pattern = analyzeMingJuPattern(chart, effectiveMonthQi, yongJi);
  const wealthNobility = analyzeWealthNobility(
    chart,
    effectiveMonthQi,
    yongJi,
    elementPower,
    pattern?.nianYueTaiJi ?? undefined,
  );
  const mingPanScore = scoreMingPan(chart, yongJi);
  const daYunAnalysis = analyzeDaYunLiuNian(chart, yongJi, elementPower, currentYear);

  return {
    lineKey: 'yinyang',
    chart,
    monthQi: effectiveMonthQi,
    yongJi,
    direction,
    directionSource,
    elementPower,
    pattern,
    wealthNobility,
    mingPanScore,
    daYunAnalysis,
  };
}
