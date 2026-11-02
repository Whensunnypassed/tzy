// ============================================================
// 阴阳线（工作区）
// 原月气体系：月令寒暖 / 太极二气定用阳或用阴，下游沿用原有全部分析逻辑。
// 本线不改变任何判据、权重与文案，等价于重构前的单线报告。
// ============================================================

import type { BaZiChart } from '../common/baziCalculator';
import { buildYinyangContext, type YinyangAnalysis } from '../common/context';

export type { YinyangAnalysis };

export function buildYinyangAnalysis(chart: BaZiChart, currentYear: number): YinyangAnalysis {
  return buildYinyangContext(chart, currentYear);
}
