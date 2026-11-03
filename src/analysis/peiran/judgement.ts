// ============================================================
// 沛然堂线 · 判读引擎（Judgement）
// ------------------------------------------------------------
// 输入：结构化事实模型（PeiranModel）
// 输出：六个主题的判读结论，每条结论必须挂「依据」。
//
// 方法论约束（不可违反）：
//   1. 结论只能来自事实 + 规则，不得凭空生成；
//   2. 每条结论必须列出参与判定的标志星与其分数；
//   3. 只能给「倾向档位」（偏强 / 中平 / 有起伏 / 偏弱），
//      不给绝对断言（不断生死、不断必成必败）；
//   4. 判读是传统口径的复现，不是事实，页面必须标注。
//
// 规则来源：Lilly《Christian Astrology》宫主与尊贵判读框架 +
//          希腊占星的主题宫（1 性格 / 2 财 / 6 健康 / 7 婚 / 10 事业）。
// ============================================================

import { PLANET_NAMES_ZH, SIGN_RULERS, SIGN_NAMES_ZH, type Planet } from './tables';
import type { PeiranModel } from './analysis';

export type VerdictKey = 'temperament' | 'career' | 'wealth' | 'relationship' | 'health' | 'annual';

export type VerdictLevel = 'strong' | 'moderate' | 'mixed' | 'weak';

export interface SignificatorFact {
  planet: Planet;
  name: string;
  house: number;
  score: number;
  grade: string;
  role: string;
}

export interface Verdict {
  key: VerdictKey;
  title: string;
  en: string;
  level: VerdictLevel;
  /** 一句话结论（数据层保留，页面以区间与读法呈现） */
  headline: string;
  /** 大概率区间：把单一档位换成「区间 + 谱条」 */
  band: VerdictBand;
  /** 综合分（已含落宫修正），用于说明区间位置 */
  score: number;
  /** 具体读法：落到生活层面的两句（现象 + 注意点） */
  reading: { gist: string; watch: string };
  /** 加分 / 减分来源 */
  drivers: { up: VerdictDriver[]; down: VerdictDriver[] };
  /** 该档位对应的可观测判据（回测时用来判定命中与否） */
  observable: string;
  /** 判读依据（每条都可回溯到事实） */
  evidence: string[];
  significators: SignificatorFact[];
}

export interface VerdictBand {
  /** 六段有序区间名（由低到高） */
  spectrum: string[];
  /** 大概率区间（含端点索引） */
  band: [number, number];
  /** 区间文字，如「自持 ~ 主动」 */
  label: string;
}

export interface VerdictDriver {
  name: string;
  score: number;
  house: number;
}

/**
 * 档位 → 可观测判据。
 * 这是回测的前提：没有可观测判据，「偏强 / 偏弱」无法被验证。
 * 判据只描述外部可核对的状态，不涉及主观感受。
 */
export const OBSERVABLE_CRITERIA: Record<VerdictKey, Record<VerdictLevel, string>> = {
  temperament: {
    strong: '自我驱动力与承压能力明显高于同龄人，长期承担主导角色',
    moderate: '性格平稳，能适应多数环境',
    mixed: '性格在不同场合差异明显，状态起伏较大',
    weak: '长期内在耗损，易受环境牵制',
  },
  career: {
    strong: '担任管理或专业岗，职业路径连续向上',
    moderate: '职业稳定，有阶段性波动',
    mixed: '多次转行或长期处于探索期',
    weak: '长期从事基础执行岗，晋升受阻',
  },
  wealth: {
    strong: '收入位于同龄段前 30%，或有可持续积累的资产',
    moderate: '收入与同龄段中位相当，收支平衡',
    mixed: '收入波动明显，有明显起伏',
    weak: '长期低于同龄段中位，财务紧张',
  },
  relationship: {
    strong: '有稳定的长期伴侣，关系持续多年',
    moderate: '有稳定关系，或经历 1–2 次重要关系',
    mixed: '关系反复，长期不稳定',
    weak: '长期单身，或多次短期关系',
  },
  health: {
    strong: '体质恢复能力强，少有长期慢性问题',
    moderate: '偶有小病，整体可控',
    mixed: '有阶段性健康问题，需要管理',
    weak: '长期慢性问题，或恢复缓慢',
  },
  annual: {
    strong: '本年有明确的推进与机会窗口',
    moderate: '本年平稳，无大起大落',
    mixed: '本年起伏明显，需谨慎决策',
    weak: '本年阻力较大，宜守不宜进',
  },
};

export interface JudgementReport {
  verdicts: Verdict[];
  /** 页面必须展示的口径声明 */
  disclaimer: string;
}

/** 凶宫：第 6 / 8 / 12 宫（传统「坏宫」） */
const BAD_HOUSES = [6, 8, 12];

/**
 * 六段区间谱：把「偏强 / 中平 / 有起伏 / 偏弱」四个粗档
 * 展开成可读的生活区间，页面用谱条 + 大概率区间呈现。
 */
const BANDS: Record<VerdictKey, readonly [string, string, string, string, string, string]> = {
  temperament: ['易受牵制', '起伏', '平稳', '自持', '主动', '强势主导'],
  career: ['受阻', '探索', '稳定', '上升', '管理', '掌权'],
  wealth: ['紧张', '起伏', '小康', '宽裕', '富足', '丰厚'],
  relationship: ['疏离', '波动', '磨合', '稳定', '稳固', '深度绑定'],
  health: ['虚弱', '易感', '平稳', '尚可', '恢复快', '强健'],
  annual: ['阻滞', '起伏', '平稳', '推进', '顺遂', '突破'],
};

/** 档位 → 谱条上的大概率区间（相邻区间允许交叠，表示边界不确定） */
const BAND_RANGE: Record<VerdictLevel, readonly [number, number]> = {
  strong: [4, 5],
  moderate: [2, 3],
  mixed: [1, 2],
  weak: [0, 1],
};

function bandOf(key: VerdictKey, level: VerdictLevel): VerdictBand {
  const spectrum = [...BANDS[key]];
  const [lo, hi] = BAND_RANGE[level];
  return { spectrum, band: [lo, hi], label: `${spectrum[lo]} ~ ${spectrum[hi]}` };
}

/**
 * 具体读法：每个主题按档位给两句话——
 * 现象（gist）说明这一区间通常会怎样生活，注意点（watch）说明该防什么。
 * 写法约束：只描述可观察的状态，不写绝对断言。
 */
const READING_TEXT: Record<VerdictKey, Record<VerdictLevel, { gist: string; watch: string }>> = {
  temperament: {
    strong: {
      gist: '自我与主见强，遇事习惯自己拿主意，长期能承担主导角色。',
      watch: '别把「扛住」当默认选项，压力容易在独自消化时累积。',
    },
    moderate: {
      gist: '性格稳定，能适应多数环境；不主动争抢，但也不轻易退让。',
      watch: '关键选择容易拖到不得不决断时才动，提前设定时限更有利。',
    },
    mixed: {
      gist: '在不同场合表现差异明显：熟悉的场域放得开，陌生场域收得紧。',
      watch: '状态起伏多来自环境切换，不是能力问题，换环境要先给自己适应期。',
    },
    weak: {
      gist: '对外部节奏比较敏感，容易被环境推着走。',
      watch: '需要稳定的外部结构（固定作息、长期同伴）才能把能力发挥出来。',
    },
  },
  career: {
    strong: {
      gist: '职业路径连续向上，适合承担决策与资源调度。',
      watch: '权力集中容易带来对立，换岗与跨部门协作期尤其要留余地。',
    },
    moderate: {
      gist: '职业稳定，专业能力能持续积累，有阶段性波动但不伤根。',
      watch: '晋升多半靠「被看见」，闷头做事容易被忽略。',
    },
    mixed: {
      gist: '职业方向可能调整过不止一次，探索期长于同龄人。',
      watch: '频繁切换会稀释积累，需要一条能串起来的主线。',
    },
    weak: {
      gist: '职业起步偏慢，容易长期停在执行层。',
      watch: '借力比单打独斗有效，找对人比找对事更关键。',
    },
  },
  wealth: {
    strong: {
      gist: '收入与积累能力明显高于同龄段，具备把资源变成资产的能力。',
      watch: '扩张冲动要配同等强度的现金流管理。',
    },
    moderate: {
      gist: '收入与同龄段中位相当，收支平衡，有一定积累空间。',
      watch: '大额支出容易集中在少数年份，需提前预留。',
    },
    mixed: {
      gist: '收入波动明显，好的年份很好，差的年份落差也大。',
      watch: '不要把峰值收入当成常态来安排固定支出。',
    },
    weak: {
      gist: '现金流偏紧，长期低于同龄段中位。',
      watch: '先稳住固定支出，再谈增长。',
    },
  },
  relationship: {
    strong: {
      gist: '有建立并维持长期关系的基础，伴侣带来的支持大于消耗。',
      watch: '稳定不等于不需要经营，熟悉之后容易停止沟通。',
    },
    moderate: {
      gist: '关系偏稳定，能维持长期关系，但需要主动投入时间。',
      watch: '常见「在一起却各自忙」，疏离是慢慢发生的。',
    },
    mixed: {
      gist: '关系能建立，但维持成本高，常见阶段性疏离或一次较大的关系调整。',
      watch: '冲突多起于生活节奏不一致，而不是感情本身。',
    },
    weak: {
      gist: '长期稳定关系需要外部条件配合，否则容易停在短期关系。',
      watch: '先解决生活稳定性，再谈关系稳定性。',
    },
  },
  health: {
    strong: {
      gist: '恢复能力好，短期消耗后能较快回到常态。',
      watch: '容易因为「恢复快」而透支。',
    },
    moderate: {
      gist: '整体可控，偶有小病，恢复节奏正常。',
      watch: '作息紊乱会先反映在睡眠和消化上。',
    },
    mixed: {
      gist: '有阶段性健康问题，随工作强度起伏。',
      watch: '问题多集中在压力高峰期，需要提前减载。',
    },
    weak: {
      gist: '体质偏弱或恢复慢，长期问题需要持续管理。',
      watch: '不要靠硬扛，规律作息比临时调理有效。',
    },
  },
  annual: {
    strong: {
      gist: '本年有明确的推进窗口，适合做需要外部配合的事。',
      watch: '窗口偏短，拖延容易错过。',
    },
    moderate: {
      gist: '本年平稳，适合维持与积累，不适合大动作。',
      watch: '平稳期最容易积累隐性债务或拖延。',
    },
    mixed: {
      gist: '本年起伏明显，同一件事可能先顺后逆。',
      watch: '关键决策留出回旋余地。',
    },
    weak: {
      gist: '本年阻力较大，宜守不宜进。',
      watch: '把资源收回到核心，减少新增承诺。',
    },
  },
};

/** 落宫短评（与 Lilly 的宫位加减分同一口径） */
function houseNote(house: number): string {
  if (BAD_HOUSES.includes(house)) return '凶宫受制';
  if ([1, 10].includes(house)) return '角宫得地';
  if ([2, 5, 11].includes(house)) return '吉宫得助';
  return '中宫平常';
}

/**
 * 加减分来源：只列真正有分量的（≥ +3 或 ≤ −3），
 * 让「为什么落到这个区间」可核对；分量为 0 附近的不列，避免噪音。
 */
function driversOf(sigs: SignificatorFact[]): { up: VerdictDriver[]; down: VerdictDriver[] } {
  const seen = new Set<string>();
  const up: VerdictDriver[] = [];
  const down: VerdictDriver[] = [];
  for (const s of sigs) {
    if (seen.has(s.planet)) continue;
    seen.add(s.planet);
    const d: VerdictDriver = { name: s.name, score: s.score, house: s.house };
    if (s.score >= 3) up.push(d);
    else if (s.score <= -3) down.push(d);
  }
  return { up, down };
}

/**
 * 档位阈值（已校准）。
 * 校准依据：23 条有明确财富标签的视频案例，5 组阈值网格（见 scripts/astrology-backtest.mjs）。
 *   · 初版 12/2/−8 预测分布 12/5/6/0，明显偏乐观（实际 6/13/2/2）；
 *   · 18/6/−6 预测分布 3/14/6/0，最接近实际分布，命中率 34.8% → 47.8%。
 * 局限：样本少、出生地缺失、出生时间只有时辰，故仍低于「一律猜中平」的 56.5% 基线。
 * 该组值只表示「预测分布不再系统性偏乐观」，不代表判读已获验证。
 */
export let LEVEL_THRESHOLDS = {
  strong: 18,
  moderate: 6,
  mixed: -6,
};

/** 仅供校准脚本使用；运行期不改 */
export function setLevelThresholds(next: Partial<typeof LEVEL_THRESHOLDS>): void {
  LEVEL_THRESHOLDS = { ...LEVEL_THRESHOLDS, ...next };
}

/** 落宫修正后的综合分（与档位判定同一口径，供区间定位显示） */
function adjustedScore(score: number, house?: number): number {
  let s = score;
  if (house !== undefined) {
    if (BAD_HOUSES.includes(house)) s -= 5;
    else if ([1, 10].includes(house)) s += 3;
    else if ([2, 5, 11].includes(house)) s += 1;
  }
  return s;
}

function levelOf(score: number, house?: number): VerdictLevel {
  const s = adjustedScore(score, house);
  if (s >= LEVEL_THRESHOLDS.strong) return 'strong';
  if (s >= LEVEL_THRESHOLDS.moderate) return 'moderate';
  if (s >= LEVEL_THRESHOLDS.mixed) return 'mixed';
  return 'weak';
}

/** 吉宫：第 1 / 2 / 4 / 5 / 7 / 9 / 10 / 11 宫 */
function houseTone(house: number): string {
  if (BAD_HOUSES.includes(house)) return '落凶宫，力量受制';
  if ([1, 10].includes(house)) return '落角宫，力量得地';
  if ([2, 5, 11].includes(house)) return '落吉宫，得助';
  return '落中宫，力量平常';
}

export function judgeChart(model: PeiranModel): JudgementReport {
  const { chart } = model;
  const houseSign = (house: number) => chart.houseSigns[house - 1];
  const lordOf = (house: number): Planet => SIGN_RULERS[houseSign(house)];
  const lillyOf = (p: Planet) => model.lilly.scores[p];

  const sig = (p: Planet, role: string): SignificatorFact => {
    const s = lillyOf(p);
    return {
      planet: p,
      name: PLANET_NAMES_ZH[p],
      house: chart.bodies[p].house,
      score: s.total,
      grade: { strong: '强', good: '偏强', average: '中', weak: '偏弱', debilitated: '弱' }[s.grade],
      role,
    };
  };

  const verdicts: Verdict[] = [];

  // ---------- 1. 性格与天赋 ----------
  {
    const ascLord = lordOf(1);
    const sun = sig('sun', '太阳 · 自我');
    const moon = sig('moon', '月亮 · 情绪');
    const lord = sig(ascLord, '上升主星 · 体质与倾向');
    const level = levelOf(lord.score, lord.house);
    const score = adjustedScore(lord.score, lord.house);
    const signName = SIGN_NAMES_ZH[chart.asc.signIndex];
    const sigs = [lord, sun, moon];

    verdicts.push({
      key: 'temperament',
      title: '性格与天赋',
      en: 'TEMPERAMENT',
      level,
      headline: `上升${signName}，命主星${PLANET_NAMES_ZH[ascLord]}落第 ${lord.house} 宫。`,
      band: bandOf('temperament', level),
      score,
      reading: READING_TEXT.temperament[level],
      drivers: driversOf(sigs),
      observable: OBSERVABLE_CRITERIA.temperament[level],
      evidence: [
        `上升星座：${signName}（${chart.sect === 'diurnal' ? '昼盘' : '夜盘'}）`,
        `命主星${PLANET_NAMES_ZH[ascLord]}：Lilly ${lord.score > 0 ? '+' : ''}${lord.score} 分，${lord.grade}，落第 ${lord.house} 宫（${houseNote(lord.house)}）`,
        `太阳落${SIGN_NAMES_ZH[Math.floor(chart.bodies.sun.lon / 30) % 12]}第 ${chart.bodies.sun.house} 宫，月亮落${SIGN_NAMES_ZH[Math.floor(chart.bodies.moon.lon / 30) % 12]}第 ${chart.bodies.moon.house} 宫`,
        `${chart.sect === 'diurnal' ? '昼盘以木星为宗派吉星、火星为宗派凶星' : '夜盘以金星为宗派吉星、土星为宗派凶星'}`,
      ],
      significators: sigs,
    });
  }

  // ---------- 2. 事业与地位 ----------
  {
    const lord10 = lordOf(10);
    const mcLord = sig(lord10, '十宫主 · 事业载体');
    const sun = sig('sun', '太阳 · 地位与名望');
    const level = levelOf(Math.round((mcLord.score + sun.score) / 2), mcLord.house);
    const score = adjustedScore(Math.round((mcLord.score + sun.score) / 2), mcLord.house);
    const sigs = [mcLord, sun];

    verdicts.push({
      key: 'career',
      title: '事业与地位',
      en: 'CAREER',
      level,
      headline: `十宫主${PLANET_NAMES_ZH[lord10]}落第 ${mcLord.house} 宫，中天落${chart.mc.sign}。`,
      band: bandOf('career', level),
      score,
      reading: READING_TEXT.career[level],
      drivers: driversOf(sigs),
      observable: OBSERVABLE_CRITERIA.career[level],
      evidence: [
        `中天落${chart.mc.sign}，十宫为${SIGN_NAMES_ZH[houseSign(10)]}，宫主${PLANET_NAMES_ZH[lord10]}`,
        `十宫主：Lilly ${mcLord.score > 0 ? '+' : ''}${mcLord.score} 分，${mcLord.grade}，落第 ${mcLord.house} 宫`,
        `太阳（地位之星）：${sun.score > 0 ? '+' : ''}${sun.score} 分，落第 ${sun.house} 宫`,
        `十宫内落星：${Object.keys(chart.bodies)
          .filter((k) => chart.bodies[k as Planet].house === 10)
          .map((k) => PLANET_NAMES_ZH[k as Planet])
          .join('、') || '无'}`,
      ],
      significators: sigs,
    });
  }

  // ---------- 3. 财富与资源 ----------
  {
    const lord2 = lordOf(2);
    const lord = sig(lord2, '二宫主 · 财源');
    const fortune = model.lots.lots.fortune;
    const fortuneRuler = sig(SIGN_RULERS[fortune.signIndex], '福点主星');
    const jupiter = sig('jupiter', '木星 · 扩张');
    const level = levelOf(Math.round((lord.score + jupiter.score) / 2), lord.house);
    const score = adjustedScore(Math.round((lord.score + jupiter.score) / 2), lord.house);
    const sigs = [lord, fortuneRuler, jupiter];

    verdicts.push({
      key: 'wealth',
      title: '财富与资源',
      en: 'WEALTH',
      level,
      headline: `二宫主${PLANET_NAMES_ZH[lord2]}落第 ${lord.house} 宫，福点落第 ${fortune.house} 宫。`,
      band: bandOf('wealth', level),
      score,
      reading: READING_TEXT.wealth[level],
      drivers: driversOf(sigs),
      observable: OBSERVABLE_CRITERIA.wealth[level],
      evidence: [
        `二宫为${SIGN_NAMES_ZH[houseSign(2)]}，宫主${PLANET_NAMES_ZH[lord2]}：${lord.score > 0 ? '+' : ''}${lord.score} 分，落第 ${lord.house} 宫`,
        `福点：${fortune.signDeg.toFixed(1)}° ${SIGN_NAMES_ZH[fortune.signIndex]}，落第 ${fortune.house} 宫`,
        `福点主星${PLANET_NAMES_ZH[fortuneRuler.planet]}：${fortuneRuler.score > 0 ? '+' : ''}${fortuneRuler.score} 分`,
        `木星（扩张之星）：${jupiter.score > 0 ? '+' : ''}${jupiter.score} 分，落第 ${jupiter.house} 宫`,
      ],
      significators: sigs,
    });
  }

  // ---------- 4. 关系与婚姻 ----------
  {
    const lord7 = lordOf(7);
    const lord = sig(lord7, '七宫主 · 伴侣');
    const venus = sig('venus', '金星 · 情感');
    const marriageLot = model.arabicLots.find((l) => l.key === 'marriageMale' || l.key === 'marriageFemale');
    const level = levelOf(Math.round((lord.score + venus.score) / 2), lord.house);
    const score = adjustedScore(Math.round((lord.score + venus.score) / 2), lord.house);
    const sigs = [lord, venus];

    verdicts.push({
      key: 'relationship',
      title: '关系与婚姻',
      en: 'RELATIONSHIP',
      level,
      headline: `七宫主${PLANET_NAMES_ZH[lord7]}落第 ${lord.house} 宫${marriageLot ? `，婚姻点落第 ${marriageLot.house} 宫` : ''}。`,
      band: bandOf('relationship', level),
      score,
      reading: READING_TEXT.relationship[level],
      drivers: driversOf(sigs),
      observable: OBSERVABLE_CRITERIA.relationship[level],
      evidence: [
        `七宫为${SIGN_NAMES_ZH[houseSign(7)]}，宫主${PLANET_NAMES_ZH[lord7]}：${lord.score > 0 ? '+' : ''}${lord.score} 分，落第 ${lord.house} 宫`,
        `金星（情感之星）：${venus.score > 0 ? '+' : ''}${venus.score} 分，落第 ${venus.house} 宫`,
        marriageLot
          ? `婚姻点：${SIGN_NAMES_ZH[marriageLot.signIndex]} ${marriageLot.signDeg.toFixed(1)}°，落第 ${marriageLot.house} 宫${marriageLot.genderUndetermined ? '（性别未匹配，仅参考）' : ''}`
          : '婚姻点：未计算',
      ],
      significators: sigs,
    });
  }

  // ---------- 5. 健康与体质 ----------
  {
    const lord6 = lordOf(6);
    const lord = sig(lord6, '六宫主 · 疾患');
    const moon = sig('moon', '月亮 · 体液与恢复');
    const ascLord = sig(lordOf(1), '命主星 · 体质');
    const level = levelOf(Math.round((ascLord.score + moon.score) / 2), ascLord.house);
    const score = adjustedScore(Math.round((ascLord.score + moon.score) / 2), ascLord.house);
    const sameStar = ascLord.planet === 'moon';
    const sigs = [ascLord, moon, lord];

    verdicts.push({
      key: 'health',
      title: '健康与体质',
      en: 'HEALTH',
      level,
      headline: sameStar
        ? `命主星即月亮，月亮${model.lilly.moonWaxing ? '增光' : '减光'}，六宫主${lord.name}落第 ${lord.house} 宫。`
        : `命主星${ascLord.name}与月亮主恢复，六宫主${lord.name}落第 ${lord.house} 宫。`,
      band: bandOf('health', level),
      score,
      reading: READING_TEXT.health[level],
      drivers: driversOf(sigs),
      observable: OBSERVABLE_CRITERIA.health[level],
      evidence: [
        `命主星${ascLord.name}：${ascLord.score > 0 ? '+' : ''}${ascLord.score} 分，落第 ${ascLord.house} 宫`,
        `月亮（体液与恢复）：${moon.score > 0 ? '+' : ''}${moon.score} 分，落第 ${moon.house} 宫，${model.lilly.moonWaxing ? '增光' : '减光'}`,
        `六宫为${SIGN_NAMES_ZH[houseSign(6)]}，六宫主${lord.name}：${lord.score > 0 ? '+' : ''}${lord.score} 分，${houseTone(lord.house)}`,
      ],
      significators: sigs,
    });
  }

  // ---------- 6. 流年与应期 ----------
  {
    const yearLord = model.profections.lord;
    const yl = sig(yearLord, '年主星');
    const level = levelOf(yl.score, yl.house);
    const score = adjustedScore(yl.score, yl.house);
    const zrNow = model.zodiacalReleasing.level1.find(
      (p) => p.startUtc.year <= model.solarReturn.utc.year && p.endUtc.year >= model.solarReturn.utc.year,
    );

    verdicts.push({
      key: 'annual',
      title: '流年与应期',
      en: 'ANNUAL',
      level,
      headline: `推运至第 ${model.profections.house} 宫（${model.profections.signName}），年主星${PLANET_NAMES_ZH[yearLord]}落第 ${yl.house} 宫。`,
      band: bandOf('annual', level),
      score,
      reading: READING_TEXT.annual[level],
      drivers: driversOf([yl]),
      observable: OBSERVABLE_CRITERIA.annual[level],
      evidence: [
        `周年推运：第 ${model.profections.house} 宫 ${model.profections.signName}，年主星${PLANET_NAMES_ZH[yearLord]}`,
        `年主星：${yl.score > 0 ? '+' : ''}${yl.score} 分，落第 ${yl.house} 宫，${houseTone(yl.house)}`,
        zrNow
          ? `黄道释放当前段：${zrNow.signName}（${zrNow.lordName}主），${zrNow.isPeak ? '为峰值期' : '非峰值期'}`
          : '黄道释放：当前段未命中',
        `太阳返照：${model.solarReturn.utc.year} 年 ${model.solarReturn.utc.month} 月，返照 ASC 落${model.solarReturn.chart.asc.sign}`,
      ],
      significators: [yl],
    });
  }

  return {
    verdicts,
    disclaimer: '以上为传统占星口径的倾向判读，依据已逐条列出；不是事实陈述，也不构成任何决策建议。',
  };
}
