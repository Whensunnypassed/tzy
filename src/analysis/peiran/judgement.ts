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
  /** 一句话结论 */
  headline: string;
  /** 判读依据（每条都可回溯到事实） */
  evidence: string[];
  significators: SignificatorFact[];
}

export interface JudgementReport {
  verdicts: Verdict[];
  /** 页面必须展示的口径声明 */
  disclaimer: string;
}

/** 凶宫：第 6 / 8 / 12 宫（传统「坏宫」） */
const BAD_HOUSES = [6, 8, 12];

const LEVEL_TEXT: Record<VerdictLevel, string> = {
  strong: '偏强',
  moderate: '中平',
  mixed: '有起伏',
  weak: '偏弱',
};

function levelOf(score: number, house?: number): VerdictLevel {
  let s = score;
  if (house !== undefined) {
    if (BAD_HOUSES.includes(house)) s -= 5;
    else if ([1, 10].includes(house)) s += 3;
    else if ([2, 5, 11].includes(house)) s += 1;
  }
  if (s >= 12) return 'strong';
  if (s >= 2) return 'moderate';
  if (s >= -8) return 'mixed';
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
    const signName = SIGN_NAMES_ZH[chart.asc.signIndex];

    verdicts.push({
      key: 'temperament',
      title: '性格与天赋',
      en: 'TEMPERAMENT',
      level,
      headline: `上升${signName}，命主星${PLANET_NAMES_ZH[ascLord]}${LEVEL_TEXT[level]}。`,
      evidence: [
        `上升星座：${signName}（${chart.sect === 'diurnal' ? '昼盘' : '夜盘'}）`,
        `命主星${PLANET_NAMES_ZH[ascLord]}：Lilly ${lord.score > 0 ? '+' : ''}${lord.score} 分，${lord.grade}，落第 ${lord.house} 宫`,
        `太阳落${SIGN_NAMES_ZH[Math.floor(chart.bodies.sun.lon / 30) % 12]}第 ${chart.bodies.sun.house} 宫，月亮落${SIGN_NAMES_ZH[Math.floor(chart.bodies.moon.lon / 30) % 12]}第 ${chart.bodies.moon.house} 宫`,
        `${chart.sect === 'diurnal' ? '昼盘以木星为宗派吉星、火星为宗派凶星' : '夜盘以金星为宗派吉星、土星为宗派凶星'}`,
      ],
      significators: [lord, sun, moon],
    });
  }

  // ---------- 2. 事业与地位 ----------
  {
    const lord10 = lordOf(10);
    const mcLord = sig(lord10, '十宫主 · 事业载体');
    const sun = sig('sun', '太阳 · 地位与名望');
    const level = levelOf(Math.round((mcLord.score + sun.score) / 2), mcLord.house);
    const inGoodHouse = !BAD_HOUSES.includes(mcLord.house);

    verdicts.push({
      key: 'career',
      title: '事业与地位',
      en: 'CAREER',
      level,
      headline: `十宫主${PLANET_NAMES_ZH[lord10]}${LEVEL_TEXT[level]}，事业载体${inGoodHouse ? '可用' : '须借运扶起'}。`,
      evidence: [
        `中天落${chart.mc.sign}，十宫为${SIGN_NAMES_ZH[houseSign(10)]}，宫主${PLANET_NAMES_ZH[lord10]}`,
        `十宫主：Lilly ${mcLord.score > 0 ? '+' : ''}${mcLord.score} 分，${mcLord.grade}，落第 ${mcLord.house} 宫`,
        `太阳（地位之星）：${sun.score > 0 ? '+' : ''}${sun.score} 分，落第 ${sun.house} 宫`,
        `十宫内落星：${Object.keys(chart.bodies)
          .filter((k) => chart.bodies[k as Planet].house === 10)
          .map((k) => PLANET_NAMES_ZH[k as Planet])
          .join('、') || '无'}`,
      ],
      significators: [mcLord, sun],
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

    verdicts.push({
      key: 'wealth',
      title: '财富与资源',
      en: 'WEALTH',
      level,
      headline: `二宫主${PLANET_NAMES_ZH[lord2]}${LEVEL_TEXT[level]}，福点落第 ${fortune.house} 宫。`,
      evidence: [
        `二宫为${SIGN_NAMES_ZH[houseSign(2)]}，宫主${PLANET_NAMES_ZH[lord2]}：${lord.score > 0 ? '+' : ''}${lord.score} 分，落第 ${lord.house} 宫`,
        `福点：${fortune.signDeg.toFixed(1)}° ${SIGN_NAMES_ZH[fortune.signIndex]}，落第 ${fortune.house} 宫`,
        `福点主星${PLANET_NAMES_ZH[fortuneRuler.planet]}：${fortuneRuler.score > 0 ? '+' : ''}${fortuneRuler.score} 分`,
        `木星（扩张之星）：${jupiter.score > 0 ? '+' : ''}${jupiter.score} 分，落第 ${jupiter.house} 宫`,
      ],
      significators: [lord, fortuneRuler, jupiter],
    });
  }

  // ---------- 4. 关系与婚姻 ----------
  {
    const lord7 = lordOf(7);
    const lord = sig(lord7, '七宫主 · 伴侣');
    const venus = sig('venus', '金星 · 情感');
    const marriageLot = model.arabicLots.find((l) => l.key === 'marriageMale' || l.key === 'marriageFemale');
    const level = levelOf(Math.round((lord.score + venus.score) / 2), lord.house);

    verdicts.push({
      key: 'relationship',
      title: '关系与婚姻',
      en: 'RELATIONSHIP',
      level,
      headline: `七宫主${PLANET_NAMES_ZH[lord7]}${LEVEL_TEXT[level]}${marriageLot ? `，婚姻点落第 ${marriageLot.house} 宫` : ''}。`,
      evidence: [
        `七宫为${SIGN_NAMES_ZH[houseSign(7)]}，宫主${PLANET_NAMES_ZH[lord7]}：${lord.score > 0 ? '+' : ''}${lord.score} 分，落第 ${lord.house} 宫`,
        `金星（情感之星）：${venus.score > 0 ? '+' : ''}${venus.score} 分，落第 ${venus.house} 宫`,
        marriageLot
          ? `婚姻点：${SIGN_NAMES_ZH[marriageLot.signIndex]} ${marriageLot.signDeg.toFixed(1)}°，落第 ${marriageLot.house} 宫${marriageLot.genderUndetermined ? '（性别未匹配，仅参考）' : ''}`
          : '婚姻点：未计算',
      ],
      significators: [lord, venus],
    });
  }

  // ---------- 5. 健康与体质 ----------
  {
    const lord6 = lordOf(6);
    const lord = sig(lord6, '六宫主 · 疾患');
    const moon = sig('moon', '月亮 · 体液与恢复');
    const ascLord = sig(lordOf(1), '命主星 · 体质');
    const level = levelOf(Math.round((ascLord.score + moon.score) / 2), ascLord.house);
    const sameStar = ascLord.planet === 'moon';

    verdicts.push({
      key: 'health',
      title: '健康与体质',
      en: 'HEALTH',
      level,
      headline: sameStar
        ? `命主星即月亮，月亮${LEVEL_TEXT[level]}。`
        : `命主星${ascLord.name}与月亮综合${LEVEL_TEXT[level]}，六宫主${lord.name}落第 ${lord.house} 宫。`,
      evidence: [
        `命主星${ascLord.name}：${ascLord.score > 0 ? '+' : ''}${ascLord.score} 分`,
        `月亮（体液与恢复）：${moon.score > 0 ? '+' : ''}${moon.score} 分，落第 ${moon.house} 宫，${model.lilly.moonWaxing ? '增光' : '减光'}`,
        `六宫为${SIGN_NAMES_ZH[houseSign(6)]}，六宫主${lord.name}：${lord.score > 0 ? '+' : ''}${lord.score} 分，${houseTone(lord.house)}`,
      ],
      significators: [ascLord, moon, lord],
    });
  }

  // ---------- 6. 流年与应期 ----------
  {
    const yearLord = model.profections.lord;
    const yl = sig(yearLord, '年主星');
    const level = levelOf(yl.score, yl.house);
    const zrNow = model.zodiacalReleasing.level1.find(
      (p) => p.startUtc.year <= model.solarReturn.utc.year && p.endUtc.year >= model.solarReturn.utc.year,
    );

    verdicts.push({
      key: 'annual',
      title: '流年与应期',
      en: 'ANNUAL',
      level,
      headline: `本命年推运至第 ${model.profections.house} 宫（${model.profections.signName}），年主星${PLANET_NAMES_ZH[yearLord]}${LEVEL_TEXT[level]}。`,
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
