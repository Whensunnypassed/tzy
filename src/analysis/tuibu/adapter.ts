/**
 * 推步线 · L0–L4 汇总适配器
 *
 * 把常气、三元结构、相位、触发窗口拼成一个「推步帧」交给页面。
 * 本帧**不含吉凶**：判据层（L3 二气配比）尚在二进制口径下运行，
 * 接入推步口径前，此帧只作结构展示与后续闸门的输入契约。
 */

import { buildSanYuan, type PillarInput, type SanYuanStructure } from './sanyuan';
import { fourLessons, kOperator, kProfile, type FourLessons } from './phase';
import { transitMarkers, type Target, type WindowMarker } from './trigger';
import { PRIOR } from './prior';

export interface TuibuPhase {
  /** 中气名（雨水…大寒） */
  zhongQi: string;
  /** 月将 */
  general: string;
  /** 错位量 k */
  k: number;
  profile: { name: string; note: string };
  lessons: FourLessons;
}

export interface TuibuFrame {
  /** 常气先验曲线（L0，只作参照与归一化分母） */
  prior: typeof PRIOR;
  sanYuan: SanYuanStructure;
  phase: TuibuPhase | null;
  triggers: WindowMarker[];
}

export interface TuibuOptions {
  /** 中气名，缺省则相位层不计算 */
  zhongQi?: string;
  /** 流年支，缺省按公历年粗推（立春前取前一岁，边界风险由 lunarAstro 另提示） */
  transitBranch?: string;
  /** 参与碰撞的四柱宫 */
  natal?: Partial<Record<Target, string>>;
}

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 公历年粗推年支：立春前（约 2 月 4 日）算前一年。 */
export function gregorianYearBranch(year: number, month: number, day: number): string {
  const solarYear = month < 2 || (month === 2 && day < 4) ? year - 1 : year;
  return BRANCHES[((solarYear - 4) % 12 + 12) % 12];
}

export function buildTuibuFrame(chart: PillarInput, options: TuibuOptions = {}): TuibuFrame {
  const sanYuan = buildSanYuan(chart);
  let phase: TuibuPhase | null = null;
  if (options.zhongQi) {
    const general = generalOf(options.zhongQi);
    const k = kOperator(general, chart.hour.branch);
    phase = {
      zhongQi: options.zhongQi,
      general,
      k,
      profile: kProfile(k),
      lessons: fourLessons(chart.day.stem, chart.day.branch, k),
    };
  }

  const natal = options.natal ?? {
    year: chart.year.branch,
    month: chart.month.branch,
    day: chart.day.branch,
    hour: chart.hour.branch,
  };
  const transitBranch = options.transitBranch ?? gregorianYearBranch(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  const triggers = transitMarkers(transitBranch, natal as Record<Target, string>);

  return { prior: PRIOR, sanYuan, phase, triggers };
}

/** 中气 → 月将（与 phase.ts 的表一致，避免调用方重复维护）。 */
function generalOf(zhongQi: string): string {
  const table: Record<string, string> = {
    雨水: '亥', 春分: '戌', 谷雨: '酉', 小满: '申', 夏至: '未', 大暑: '午',
    处暑: '巳', 秋分: '辰', 霜降: '卯', 小雪: '寅', 冬至: '丑', 大寒: '子',
  };
  const general = table[zhongQi];
  if (!general) throw new Error(`未知中气：${zhongQi}`);
  return general;
}
