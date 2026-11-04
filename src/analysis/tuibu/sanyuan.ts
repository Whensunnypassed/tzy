/**
 * 推步线 · L1 承载层（三元结构骨架）
 *
 * 李虚中三元：干禄（名禄贵权）、支命（金珠积富）、纳音身（材能器识、人伦亲属）。
 * 本项目**不搬纳音本体**（见《推步线·定义与1.3任务》§一 边界六），
 * 因此「身」改以日支宫位承载，明确标注为待考口径——它只提供结构，不产气量。
 *
 * 本模块只做四件事：胎元、十分制权重、三出口骨架、宫位映射。
 * 不判吉凶、不做十神、不参与引擎评分。
 */

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

/** 李虚中四柱权重：「胎主父母祖宗者十分……月……十分……日……八分，时……皆十分」。 */
export const PILLAR_WEIGHTS = { tai: 10, month: 10, day: 8, hour: 10 } as const;

/** 地支藏干（本气 + 中气 + 余气）。 */
export const HIDDEN_STEMS: Record<string, string[]> = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '戊', '庚'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
};

/** 十干禄位。 */
export const LU_POSITION: Record<string, string> = {
  甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
};

/** 宫位：年=祖上/根基，月=父母/门户，日=自身/配偶，时=子女/归宿。 */
export const PALACE = { year: '祖上根基', month: '父母门户', day: '自身配偶', hour: '子女归宿' } as const;

export interface OutletValue<T> {
  value: T;
  basis: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface SanYuanStructure {
  /** 胎元（月干进一位、月支进三位） */
  taiYuan: { stem: string; zhi: string };
  weights: typeof PILLAR_WEIGHTS;
  /** 干禄：天干 + 禄位（名禄贵权的载体） */
  lu: OutletValue<{ gan: string; luZhi: string }[]>;
  /** 支命：月支藏干（金珠积富的载体） */
  ming: OutletValue<string[]>;
  /** 身：日支宫位（材能器识与人伦的载体，非纳音口径） */
  shen: OutletValue<{ zhi: string; palace: string }>;
}

export interface PillarInput {
  year: { stem: string; branch: string };
  month: { stem: string; branch: string };
  day: { stem: string; branch: string };
  hour: { stem: string; branch: string };
}

function step(list: readonly string[], char: string, offset: number): string {
  const index = list.indexOf(char);
  if (index < 0) throw new Error(`未知干支：${char}`);
  return list[(index + offset + list.length * 2) % list.length];
}

/** 胎元 = 月干进一位、月支进三位。 */
export function taiYuanOf(monthStem: string, monthBranch: string): { stem: string; zhi: string } {
  return { stem: step(STEMS, monthStem, 1), zhi: step(BRANCHES, monthBranch, 3) };
}

/** 构建三元结构骨架（不判吉凶）。 */
export function buildSanYuan(chart: PillarInput): SanYuanStructure {
  const stems = [chart.year.stem, chart.month.stem, chart.day.stem, chart.hour.stem];
  const lu = stems.map((gan) => ({ gan, luZhi: LU_POSITION[gan] ?? '—' }));
  const hidden = HIDDEN_STEMS[chart.month.branch] ?? [];

  return {
    taiYuan: taiYuanOf(chart.month.stem, chart.month.branch),
    weights: PILLAR_WEIGHTS,
    lu: { value: lu, basis: '天干禄位：名禄贵权之所寄', confidence: 'medium' },
    ming: { value: hidden, basis: '月支藏干：金珠积富之所寄', confidence: 'medium' },
    shen: {
      value: { zhi: chart.day.branch, palace: PALACE.day },
      basis: '日支宫位承载：材能器识与人伦。本项目不搬纳音，此为待考替代口径',
      confidence: 'low',
    },
  };
}
