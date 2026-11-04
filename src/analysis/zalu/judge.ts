/**
 * 大杂烩线 · 断法
 *
 * 门派登记是底账，这里才是「搓成一条线」的部分：
 * 取各派能落成规则的那一条，只用四柱，判 学业 / 爱情 / 财富。
 *
 * 取法与舍法（写在这，免得以后又说不清）：
 *  - 学业：取子平「印星为学问」、真诠「用神专求月令」、食伤泄秀；舍神煞文昌、舍纳音。
 *  - 爱情：取宫位（日支配偶宫）、财官为星（男财女官）、冲合为动；舍桃花/红艳等神煞。
 *  - 财富：取「财星有根」「食伤生财」「身旺任财」「比劫夺财」；舍纳音、舍神煞财库。
 *  - 不判寿夭，不引任何未读原文。
 */
import type { BaZiChart } from '@/analysis/common/baziCalculator';

type El = '木' | '火' | '土' | '金' | '水';

const STEM_EL: Record<string, El> = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const BRANCH_EL: Record<string, El> = { 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 亥: '水', 子: '水', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
const HIDDEN: Record<string, string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'], 辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'],
  午: ['丁', '己'], 未: ['己', '丁', '乙'], 申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};
const YANG = new Set('甲丙戊庚壬子寅辰午申戌');
const GEN: Record<El, El> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CTRL: Record<El, El> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const WEIGHT = [1.0, 1.6, 1.2, 0.8];

const LIUHE: Record<string, string> = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const CHONG: Record<string, string> = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };

const rel = (me: string, other: string) => {
  const a = STEM_EL[me], b = STEM_EL[other];
  const same = YANG.has(me) === YANG.has(other);
  if (a === b) return same ? '比肩' : '劫财';
  if (GEN[a] === b) return same ? '食神' : '伤官';
  if (CTRL[a] === b) return same ? '偏财' : '正财';
  if (CTRL[b] === a) return same ? '七杀' : '正官';
  return same ? '偏印' : '正印';
};

export interface ZaluVerdict {
  title: string;
  level: string;
  score: number;
  lines: string[];
  caveat: string;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export interface ZaluFeatures {
  /** 日主天干与五行 */
  day: string;
  me: El;
  /** 十神加权计数 */
  counts: Record<string, number>;
  /** 五行加权力量 */
  el: Record<El, number>;
  /** 日主在月令的旺相休囚死 */
  season: '旺' | '相' | '休' | '囚' | '死';
  strong: boolean;
  /** 火水力量差的绝对值（调候读数） */
  bal: number;
  /** 月令本气藏干 */
  monthMain: string;
  /* 派生量 */
  yin: number;
  guan: number;
  shi: number;
  cai: number;
  jie: number;
}

/** 四柱 → 判读特征（回测与调参共用，避免脚本各自重算） */
export function zaluFeatures(chart: BaZiChart): ZaluFeatures {
  const pillars = [chart.year, chart.month, chart.day, chart.hour];
  const day = chart.day.stem;
  const me = STEM_EL[day];
  const c: Record<string, number> = { 比肩: 0, 劫财: 0, 食神: 0, 伤官: 0, 正财: 0, 偏财: 0, 正官: 0, 七杀: 0, 正印: 0, 偏印: 0 };
  const el: Record<El, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  let monthMain = '';

  pillars.forEach((p, i) => {
    c[rel(day, p.stem)] += WEIGHT[i];
    el[STEM_EL[p.stem]] += WEIGHT[i];
    const hid = HIDDEN[p.branch] ?? [];
    hid.forEach((h) => {
      const hw = (0.6 / Math.max(1, hid.length)) * WEIGHT[i] * (i === 1 ? 1.5 : 1);
      c[rel(day, h)] += hw;
      el[STEM_EL[h]] += hw;
    });
    if (i === 1) monthMain = hid[0] ?? '';
  });

  const yin = c.正印 + c.偏印;
  const guan = c.正官 + c.七杀;
  const shi = c.食神 + c.伤官;
  const cai = c.正财 + c.偏财;
  const jie = c.比肩 + c.劫财;
  const mEl = BRANCH_EL[chart.month.branch];
  const season = mEl === me ? '旺' : GEN[mEl] === me ? '相' : GEN[me] === mEl ? '休' : CTRL[me] === mEl ? '囚' : '死';
  const strong = season === '旺' || season === '相';
  const bal = Math.abs(el.火 - el.水);

  return { day, me, counts: c, el, season, strong, bal, monthMain, yin, guan, shi, cai, jie };
}

export function judgeZalu(chart: BaZiChart): { xueye: ZaluVerdict; aiqing: ZaluVerdict; caifu: ZaluVerdict } {
  const f = zaluFeatures(chart);
  const { counts: c, season, strong, bal, yin, guan, shi, cai, jie } = f;

  /* ---------------- 学业 ---------------- */
  const xueyeScore = clamp(
    34 + 13 * yin + 8 * guan + 6 * shi - (yin < 1 ? 6 * cai : 2 * cai) + (strong ? 5 : 0) - (bal > 2 ? 5 : 0),
  );
  const xueyeLevel = xueyeScore >= 74 ? '本科以上' : xueyeScore >= 56 ? '本科' : xueyeScore >= 40 ? '大专 / 中专' : '初中及以下';
  const xueyeLines = [
    `印星 ${yin.toFixed(2)}（学问之本）+ 官杀 ${guan.toFixed(2)}（名位之引）`,
    shi >= 1.2 ? `食伤 ${shi.toFixed(2)}：靠手艺与表达也能立住` : `食伤 ${shi.toFixed(2)}：少一分外露`,
    yin < 1 && cai >= 1.2 ? `财 ${cai.toFixed(2)} 克印：读书易被实务打断` : `月令${season}：${strong ? '读书扛得住' : '容易分心'}`,
  ];
  const xueye: ZaluVerdict = {
    title: '学业', level: xueyeLevel, score: xueyeScore, lines: xueyeLines,
    caveat: '只判“读得下读不下”，不判学校名字与名次。',
  };

  /* ---------------- 爱情 ---------------- */
  const spouse = chart.day.branch;
  const others = [chart.year.branch, chart.month.branch, chart.hour.branch];
  const heCount = others.filter((b) => LIUHE[spouse] === b).length;
  const chongCount = others.filter((b) => CHONG[spouse] === b).length;
  const star = chart.gender === 'male' ? cai : guan;
  const starName = chart.gender === 'male' ? '财星' : '官星';
  const aiScore = clamp(52 + 10 * (star >= 1 ? 1 : -0.6) + 8 * heCount - 14 * chongCount - (star > 3 ? 6 : 0));
  const aiLevel = aiScore >= 68 ? '早稳' : aiScore >= 52 ? '中稳' : aiScore >= 38 ? '晚成' : '易动';
  const spouseEl = BRANCH_EL[spouse];
  const elTrait: Record<El, string> = { 木: '性直、有主意', 火: '热、行动快', 土: '稳、重实际', 金: '硬、讲规则', 水: '活、想得多' };
  const aiqing: ZaluVerdict = {
    title: '爱情', level: aiLevel, score: aiScore,
    lines: [
      `配偶宫 ${spouse}（${spouseEl}）：${elTrait[spouseEl]}`,
      `${starName} ${star.toFixed(2)}${star >= 1 ? '，有星可取' : '，星不明显——不是没人，是信号弱'}`,
      `宫位合 ${heCount} 处、冲 ${chongCount} 处：${chongCount > 0 ? '关系起步多波折' : '起步相对平顺'}`,
    ],
    caveat: '只判关系形态与早晚，不断具体人、不判离合次数。',
  };

  /* ---------------- 财富 ---------------- */
  const caiScore = clamp(
    32 + 14 * cai + (cai > 0 && shi > 0 ? 8 : 0) + (strong ? 9 : -6) - (jie > 2.2 ? 9 : 0) - 3 * Math.max(0, yin - 1) + (bal > 2 ? -5 : 3),
  );
  const caiLevel = caiScore >= 74 ? '富' : caiScore >= 54 ? '小康' : caiScore >= 36 ? '温饱' : '紧';
  const caifu: ZaluVerdict = {
    title: '财富', level: caiLevel, score: caiScore,
    lines: [
      `财星 ${cai.toFixed(2)}（${cai >= 1.5 ? '有根可任' : '单薄'}）`,
      shi >= 1.2 && cai >= 1 ? `食伤生财：凭技艺换钱` : `食伤 ${shi.toFixed(2)}：财源靠正路`,
      jie > 2.2 ? `比劫 ${jie.toFixed(2)} 偏重：合伙易被分走` : `${strong ? '身能任财' : '身偏弱，财来财去要守'}`,
    ],
    caveat: '只判量级与来源，不判具体数字、不断投资输赢。',
  };

  return { xueye, aiqing, caifu };
}
