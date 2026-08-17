// ============================================================
//  命例测试数据集
//  说明：存放典型排盘案例，用于算法回归测试、评分公式正确性校验。
//  使用：import { PAI_PAN_TEST_CASES } from '@/../reference/cases/test-cases'
//        或在脚本中直读本文件（相对路径需自行解析）。
// ============================================================

export interface PaiPanTestCase {
  /** 用例名称（建议：人名或特征标签） */
  name: string;
  /** 出生时间（北京时间，非真太阳时） */
  birth: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    gender: '男' | '女';
  };
  /** 排盘期望结果 — 用于 assertEqual 验证 */
  expected: {
    /** 四柱干支 */
    yearStem: string;
    yearBranch: string;
    monthStem: string;
    monthBranch: string;
    dayStem: string;
    dayBranch: string;
    hourStem: string;
    hourBranch: string;
    /** 月柱排盘的依据：节名 + 大致交节时分（仅作参考比对） */
    monthTermReason?: string;
  };
  /** 大运/流年评分的期望值区间（仅作冒烟校验，非严格等值） */
  dayunSmoke?: {
    /** 第一步大运起运岁数范围 */
    firstStartAgeRange: [number, number];
    /** 前几步大运中至少 N 步的五档评价落在给定集合里 */
    atLeastNofLevelsIn?: { n: number; levels: string[] };
  };
}

export const PAI_PAN_TEST_CASES: PaiPanTestCase[] = [
  // ========= 【节气边界案例·1969立冬】排盘失误修复用例 =========
  {
    name: '节气边界·1969年11月7日·立冬前·甲戍月',
    birth: { year: 1969, month: 11, day: 7, hour: 22, minute: 10, gender: '男' },
    expected: {
      yearStem: '己', yearBranch: '酉',
      monthStem: '甲', monthBranch: '戌',
      dayStem: '壬', dayBranch: '申',
      hourStem: '辛', hourBranch: '亥',
      monthTermReason: '1969立冬交节 ≈22:12~22:13，22:10 仍属戌月（甲戍）',
    },
  },
  {
    name: '节气边界·1969年11月7日·立冬后·乙亥月',
    birth: { year: 1969, month: 11, day: 7, hour: 22, minute: 15, gender: '男' },
    expected: {
      yearStem: '己', yearBranch: '酉',
      monthStem: '乙', monthBranch: '亥',
      dayStem: '壬', dayBranch: '申',
      hourStem: '辛', hourBranch: '亥',
      monthTermReason: '1969立冬交节 ≈22:12~22:13，22:15 进入亥月（乙亥）',
    },
  },

  // ========= 常规案例 =========
  {
    name: '常规·春分后男命',
    birth: { year: 1990, month: 3, day: 25, hour: 9, minute: 30, gender: '男' },
    expected: {
      yearStem: '庚', yearBranch: '午',
      monthStem: '己', monthBranch: '卯',
      dayStem: '庚', dayBranch: '午',
      hourStem: '辛', hourBranch: '巳',
      monthTermReason: '惊蛰 3.6 → 清明 4.5 之间属卯月',
    },
  },
  {
    name: '常规·冬至子月子时',
    birth: { year: 1984, month: 12, day: 22, hour: 0, minute: 10, gender: '女' },
    expected: {
      yearStem: '甲', yearBranch: '子',
      monthStem: '丙', monthBranch: '子',
      dayStem: '庚', dayBranch: '午',
      hourStem: '丙', hourBranch: '子',
      monthTermReason: '大雪 12.7 → 小寒 次年1.6 之间属子月',
    },
  },
];

// ============================================================
//  大运评分用例（验证「大运本身分 + 十年平均分」新口径）
// ============================================================
export interface DaYunScoringCase {
  name: string;
  /** 大运干支 */
  daYun: { stem: string; branch: string };
  /** 下辖 10 年流年干支列表（顺序） */
  liuNian10: Array<{ year: number; stem: string; branch: string }>;
  /** 期望：压缩分口径中，大运压缩分 + 流年平均压缩分 = 最终压缩分 */
  compressExpectation: {
    /** 允许误差 */
    tolerance: number;
    /** 大运本身压缩分区间（rawScoreDY ÷ 3.6） */
    dyCompressRange?: [number, number];
    /** 十年平均压缩分区间 */
    liuNianAvgCompressRange?: [number, number];
    /** 最终综合分（压缩后再映射五档）至少/至多落入 */
    finalLevelOneOf: string[];
  };
}

export const DAYUN_SCORING_CASES: DaYunScoringCase[] = [
  {
    name: '样例·大运纯凶叠加流年凶 → 最终应为「拉/拉完了」',
    daYun: { stem: '癸', branch: '酉' },
    liuNian10: [
      { year: 2020, stem: '庚', branch: '子' },
      { year: 2021, stem: '辛', branch: '丑' },
      { year: 2022, stem: '壬', branch: '寅' },
      { year: 2023, stem: '癸', branch: '卯' },
      { year: 2024, stem: '甲', branch: '辰' },
      { year: 2025, stem: '乙', branch: '巳' },
      { year: 2026, stem: '丙', branch: '午' },
      { year: 2027, stem: '丁', branch: '未' },
      { year: 2028, stem: '戊', branch: '申' },
      { year: 2029, stem: '己', branch: '酉' },
    ],
    compressExpectation: {
      tolerance: 0.5,
      finalLevelOneOf: ['拉', '拉完了', 'npc'],
    },
  },
];
