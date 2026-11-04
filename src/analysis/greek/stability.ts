// ============================================================
// 希腊线 · 判读稳定性评估
// ------------------------------------------------------------
// 背景：出生时刻只要差几分钟，ASC 就会移动，宫位整体平移，
// 依赖宫主的判读结论可能翻转。与其假装结论确定，不如把
// 「这个结论有多稳」算出来告诉用户。
//
// 做法：把出生时刻切成 N 个等间隔切片，各自建盘判读，
// 统计每个主题的档位一致率（众数占比）。
//
// 判级：
//   stable   ≥ 0.75  结论稳，可作参考
//   moderate ≥ 0.5   结论大致稳定，边界情形
//   unstable < 0.5   结论不稳，说明出生时间需要更精确
// ============================================================

import { buildAstroChart, type AstroChart, type AstroChartInput } from './astroChart';
import { buildGreekModelFromChart } from './analysis';
import { judgeChart, type VerdictKey, type VerdictLevel } from './judgement';

export interface ThemeStability {
  key: VerdictKey;
  title: string;
  /** 各切片给出的档位 */
  levels: VerdictLevel[];
  /** 众数档位 */
  dominant: VerdictLevel;
  /** 众数占比 0–1 */
  agreement: number;
  grade: 'stable' | 'moderate' | 'unstable';
}

export interface StabilityReport {
  slices: number;
  windowMinutes: number;
  themes: ThemeStability[];
  /** 六主题平均一致率 */
  overall: number;
  note: string;
}

export interface StabilityOptions {
  /** 切片窗口：以输入时刻为中点，前后各取一半，默认 ±30 分钟 */
  windowMinutes?: number;
  /** 切片数，默认 8 */
  slices?: number;
  currentYear?: number;
  gender?: 'male' | 'female';
}

const LEVEL_RANK: Record<VerdictLevel, number> = { strong: 3, moderate: 2, mixed: 1, weak: 0 };

function gradeOf(agreement: number): ThemeStability['grade'] {
  if (agreement >= 0.75) return 'stable';
  if (agreement >= 0.5) return 'moderate';
  return 'unstable';
}

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

/**
 * 评估判读稳定性：在出生时刻窗口内切片，逐片判读，统计一致率。
 */
export function assessStability(input: AstroChartInput, options: StabilityOptions = {}): StabilityReport {
  const windowMinutes = options.windowMinutes ?? 30;
  const slices = options.slices ?? 8;
  const currentYear = options.currentYear ?? new Date().getFullYear();

  const offsets: number[] = [];
  if (slices <= 1) {
    offsets.push(0);
  } else {
    const step = (windowMinutes * 2) / (slices - 1);
    for (let i = 0; i < slices; i += 1) offsets.push(-windowMinutes + step * i);
  }

  // 逐片判读，收集每个主题的档位
  const byTheme = new Map<VerdictKey, { title: string; levels: VerdictLevel[] }>();

  for (const off of offsets) {
    const chart: AstroChart = buildAstroChart(shiftMinutes(input, off));
    const model = buildGreekModelFromChart(chart, {
      currentYear,
      gender: options.gender,
    });
    const judgement = judgeChart(model);
    for (const v of judgement.verdicts) {
      if (!byTheme.has(v.key)) byTheme.set(v.key, { title: v.title, levels: [] });
      byTheme.get(v.key)!.levels.push(v.level);
    }
  }

  const themes: ThemeStability[] = [];
  for (const [key, { title, levels }] of byTheme) {
    const counts: Record<VerdictLevel, number> = { strong: 0, moderate: 0, mixed: 0, weak: 0 };
    for (const l of levels) counts[l] += 1;
    const dominant = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as VerdictLevel;
    const agreement = counts[dominant] / levels.length;
    themes.push({ key, title, levels, dominant, agreement, grade: gradeOf(agreement) });
  }

  const overall = themes.reduce((s, t) => s + t.agreement, 0) / themes.length;

  return {
    slices: offsets.length,
    windowMinutes,
    themes,
    overall,
    note:
      overall >= 0.75
        ? '各主题结论在时间窗口内基本一致，判读可作参考。'
        : overall >= 0.5
          ? '部分主题在时间窗口内出现档位变化，结论属边界情形。'
          : '多数主题在时间窗口内翻转，说明出生时间精度不足以支撑这些判读，建议先校准出生时间。',
  };
}

/** 供展示：档位序列压缩成「强×4 中×2 起×2 弱×0」 */
export function levelDistribution(themes: ThemeStability): string {
  const counts: Record<VerdictLevel, number> = { strong: 0, moderate: 0, mixed: 0, weak: 0 };
  for (const l of themes.levels) counts[l] += 1;
  return `强×${counts.strong} 中×${counts.moderate} 起×${counts.mixed} 弱×${counts.weak}`;
}

export { LEVEL_RANK };
