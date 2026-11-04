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
 *
 * 计分口径：特征 → 线性打分 → 三档阈值。权重与阈值由
 * `scripts/zalu-calibrate.mjs`（内部，不入库）在命海 1300 条自述上标定，
 * 库内回测见 `scripts/zalu-backtest.mjs`。改动权重必须重跑回测。
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
const B = (v: boolean) => (v ? 1 : 0);

export interface ZaluFeatures {
  day: string;
  me: El;
  counts: Record<string, number>;
  el: Record<El, number>;
  season: '旺' | '相' | '休' | '囚' | '死';
  strong: boolean;
  bal: number;
  monthMain: string;
  /* 派生量 */
  yin: number;
  guan: number;
  shi: number;
  cai: number;
  jie: number;
  /* 门派特征：透干 / 通根 / 月令 / 宫位 */
  yinTou: boolean;
  guanTou: boolean;
  caiTou: boolean;
  shiTou: boolean;
  yinRoot: boolean;
  guanRoot: boolean;
  caiRoot: boolean;
  shiRoot: boolean;
  monthGod: string;
  monthYin: boolean;
  monthGuan: boolean;
  monthCai: boolean;
  monthShi: boolean;
  yearGod: string;
  yearYin: boolean;
  yearGuan: boolean;
  yearCai: boolean;
  /** 日支（配偶宫）与他支的六合 / 六冲数 */
  heCount: number;
  chongCount: number;
  /** 从格候选：日主无根而财官食旺 */
  congGe: boolean;
  /** 日主得地（日支同五行或生我） */
  deDi: boolean;
}

type Pillar = { stem: string; branch: string };

/** 四柱 → 判读特征（回测与调参共用；命海只有四柱，故以四柱为入口） */
export function zaluFeaturesFromPillars(pillars: Pillar[]): ZaluFeatures {
  const [y, m, d, h] = pillars;
  const day = d.stem;
  const me = STEM_EL[day];
  const c: Record<string, number> = { 比肩: 0, 劫财: 0, 食神: 0, 伤官: 0, 正财: 0, 偏财: 0, 正官: 0, 七杀: 0, 正印: 0, 偏印: 0 };
  const el: Record<El, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  pillars.forEach((p, i) => {
    c[rel(day, p.stem)] += WEIGHT[i];
    el[STEM_EL[p.stem]] += WEIGHT[i];
    const hid = HIDDEN[p.branch] ?? [];
    hid.forEach((s) => {
      const hw = (0.6 / Math.max(1, hid.length)) * WEIGHT[i] * (i === 1 ? 1.5 : 1);
      c[rel(day, s)] += hw;
      el[STEM_EL[s]] += hw;
    });
  });

  const yin = c.正印 + c.偏印;
  const guan = c.正官 + c.七杀;
  const shi = c.食神 + c.伤官;
  const cai = c.正财 + c.偏财;
  const jie = c.比肩 + c.劫财;

  const mEl = BRANCH_EL[m.branch];
  const season = mEl === me ? '旺' : GEN[mEl] === me ? '相' : GEN[me] === mEl ? '休' : CTRL[me] === mEl ? '囚' : '死';
  const strong = season === '旺' || season === '相';
  const bal = Math.abs(el.火 - el.水);
  const monthMain = (HIDDEN[m.branch] ?? [])[0] ?? day;

  // 透干：天干出现该十神
  const stemGods = pillars.map((p) => rel(day, p.stem));
  const tou = (re: RegExp) => stemGods.some((g) => re.test(g));
  // 通根：任一地支藏干含该十神
  const branchGods = pillars.flatMap((p) => (HIDDEN[p.branch] ?? []).map((s) => rel(day, s)));
  const root = (re: RegExp) => branchGods.some((g) => re.test(g));

  const monthGod = rel(day, monthMain);
  const yearGod = rel(day, y.stem);

  const spouse = d.branch;
  const others = [y.branch, m.branch, h.branch];
  const heCount = others.filter((b) => LIUHE[spouse] === b).length;
  const chongCount = others.filter((b) => CHONG[spouse] === b).length;

  const deDi = BRANCH_EL[d.branch] === me || GEN[BRANCH_EL[d.branch]] === me;
  const congGe = !deDi && !strong && cai + guan + shi >= 2.5;

  return {
    day, me, counts: c, el, season, strong, bal, monthMain,
    yin, guan, shi, cai, jie,
    yinTou: tou(/印/), guanTou: tou(/官|杀/), caiTou: tou(/财/), shiTou: tou(/食|伤/),
    yinRoot: root(/印/), guanRoot: root(/官|杀/), caiRoot: root(/财/), shiRoot: root(/食|伤/),
    monthGod, monthYin: /印/.test(monthGod), monthGuan: /官|杀/.test(monthGod),
    monthCai: /财/.test(monthGod), monthShi: /食|伤/.test(monthGod),
    yearGod, yearYin: /印/.test(yearGod), yearGuan: /正官/.test(yearGod), yearCai: /财/.test(yearGod),
    heCount, chongCount, congGe, deDi,
  };
}

export function zaluFeatures(chart: BaZiChart): ZaluFeatures {
  return zaluFeaturesFromPillars([chart.year, chart.month, chart.day, chart.hour]);
}

/**
 * 计分参数：权重按各派本义设定（印星主学、财星主财、食伤生财、比劫夺财…），
 * 三档阈值在命海 1300 条自述上按标签分布的分位点标定（内部脚本
 * `scripts/zalu-calibrate.mjs`），避免「全猜多数类」的退化解。
 * 改权重或阈值必须重跑 `node scripts/zalu-backtest.mjs`。
 */
export const ZALU_MODEL = {
  version: 'zalu-v1.0.0',
  /** 学业：特征 → 权重（键为 ZaluFeatures 的布尔/数值字段） */
  edu: {
    base: 44,
    w: {
      yin: 5.4, guan: 4.2, shi: 3, yinTou: 3.6, guanTou: 1.8,
      yinRoot: 3, monthYin: 2.4, monthGuan: 1.8, yearYin: 1.2,
      caiNoYin: -3, strong: 1.8, balHi: -2.4, congGe: 2.4,
    },
    cuts: [61.5, 69.5, 77.5],
  },
  wealth: {
    base: 40,
    w: {
      cai: 6, caiTou: 3.6, caiRoot: 4.2, shiCai: 3.6, monthCai: 3,
      strong: 3.6, jie: -2.4, yin: -1.8, balHi: 1.2, congGe: 3, yearCai: 1.8,
    },
    cuts: [44.5, 55.5, 72.5],
  },
} as const;

/** 学业 / 财富的原始分（与判读同一口径；标定脚本复用） */
export function zaluScore(f: ZaluFeatures, key: 'edu' | 'wealth'): number {
  const cfg = ZALU_MODEL;
  if (key === 'edu') {
    const caiNoYin = f.yin < 1 ? Math.max(0, f.cai - 1) : 0;
    return clamp(
      cfg.edu.base +
        cfg.edu.w.yin * f.yin +
        cfg.edu.w.guan * f.guan +
        cfg.edu.w.shi * f.shi +
        cfg.edu.w.yinTou * B(f.yinTou) +
        cfg.edu.w.guanTou * B(f.guanTou) +
        cfg.edu.w.yinRoot * B(f.yinRoot) +
        cfg.edu.w.monthYin * B(f.monthYin) +
        cfg.edu.w.monthGuan * B(f.monthGuan) +
        cfg.edu.w.yearYin * B(f.yearYin) +
        cfg.edu.w.caiNoYin * caiNoYin +
        cfg.edu.w.strong * B(f.strong) +
        cfg.edu.w.balHi * B(f.bal > 2) +
        cfg.edu.w.congGe * B(f.congGe),
    );
  }
  const shiCai = Math.min(2, f.shi) * Math.min(2, f.cai);
  return clamp(
    cfg.wealth.base +
      cfg.wealth.w.cai * f.cai +
      cfg.wealth.w.caiTou * B(f.caiTou) +
      cfg.wealth.w.caiRoot * B(f.caiRoot) +
      cfg.wealth.w.shiCai * shiCai +
      cfg.wealth.w.monthCai * B(f.monthCai) +
      cfg.wealth.w.strong * B(f.strong) +
      cfg.wealth.w.jie * Math.max(0, f.jie - 1.5) +
      cfg.wealth.w.yin * Math.max(0, f.yin - 1) +
      cfg.wealth.w.balHi * B(f.bal > 2) +
      cfg.wealth.w.congGe * B(f.congGe) +
      cfg.wealth.w.yearCai * B(f.yearCai),
  );
}

export function judgeZalu(chart: BaZiChart): { xueye: ZaluVerdict; aiqing: ZaluVerdict; caifu: ZaluVerdict } {
  const f = zaluFeatures(chart);
  const { season, strong, bal, yin, guan, shi, cai, jie } = f;
  const cfg = ZALU_MODEL;

  /* ---------------- 学业 ---------------- */
  const xueyeScore = zaluScore(f, 'edu');
  const [e1, e2, e3] = cfg.edu.cuts;
  const xueyeLevel = xueyeScore >= e3 ? '本科以上' : xueyeScore >= e2 ? '本科' : xueyeScore >= e1 ? '大专 / 中专' : '初中及以下';
  const xueyeLines = [
    `印星 ${yin.toFixed(2)}（学问之本，${f.yinTou ? '透干' : '不透'} · ${f.yinRoot ? '有根' : '无根'}）+ 官杀 ${guan.toFixed(2)}（名位之引）`,
    `月令${f.monthGod}${f.monthYin || f.monthGuan ? '：学业得气' : '：学业无直接帮扶'}`,
    shi >= 1.2 ? `食伤 ${shi.toFixed(2)}：靠手艺与表达也能立住` : `食伤 ${shi.toFixed(2)}：少一分外露`,
    yin < 1 && cai >= 1.2 ? `财 ${cai.toFixed(2)} 克印：读书易被实务打断` : `月令${season}：${strong ? '读书扛得住' : '容易分心'}`,
  ];
  const xueye: ZaluVerdict = {
    title: '学业', level: xueyeLevel, score: xueyeScore, lines: xueyeLines,
    caveat: '只判“读得下读不下”，不判学校名字与名次。',
  };

  /* ---------------- 爱情 ---------------- */
  const spouse = chart.day.branch;
  const star = chart.gender === 'male' ? cai : guan;
  const starName = chart.gender === 'male' ? '财星' : '官星';
  const aiScore = clamp(52 + 10 * (star >= 1 ? 1 : -0.6) + 8 * f.heCount - 14 * f.chongCount - (star > 3 ? 6 : 0));
  const aiLevel = aiScore >= 68 ? '早稳' : aiScore >= 52 ? '中稳' : aiScore >= 38 ? '晚成' : '易动';
  const spouseEl = BRANCH_EL[spouse];
  const elTrait: Record<El, string> = { 木: '性直、有主意', 火: '热、行动快', 土: '稳、重实际', 金: '硬、讲规则', 水: '活、想得多' };
  const aiqing: ZaluVerdict = {
    title: '爱情', level: aiLevel, score: aiScore,
    lines: [
      `配偶宫 ${spouse}（${spouseEl}）：${elTrait[spouseEl]}`,
      `${starName} ${star.toFixed(2)}${star >= 1 ? '，有星可取' : '，星不明显——不是没人，是信号弱'}`,
      `宫位合 ${f.heCount} 处、冲 ${f.chongCount} 处：${f.chongCount > 0 ? '关系起步多波折' : '起步相对平顺'}`,
    ],
    caveat: '只判关系形态与早晚，不断具体人、不判离合次数。',
  };

  /* ---------------- 财富 ---------------- */
  const shiCai = Math.min(2, shi) * Math.min(2, cai);
  const caifuScore = clamp(
    cfg.wealth.base +
      cfg.wealth.w.cai * cai +
      cfg.wealth.w.caiTou * B(f.caiTou) +
      cfg.wealth.w.caiRoot * B(f.caiRoot) +
      cfg.wealth.w.shiCai * shiCai +
      cfg.wealth.w.monthCai * B(f.monthCai) +
      cfg.wealth.w.strong * B(strong) +
      cfg.wealth.w.jie * Math.max(0, jie - 1.5) +
      cfg.wealth.w.yin * Math.max(0, yin - 1) +
      cfg.wealth.w.balHi * B(bal > 2) +
      cfg.wealth.w.congGe * B(f.congGe) +
      cfg.wealth.w.yearCai * B(f.yearCai),
  );
  const [w1, w2, w3] = cfg.wealth.cuts;
  const caiLevel = caifuScore >= w3 ? '富' : caifuScore >= w2 ? '小康' : caifuScore >= w1 ? '温饱' : '紧';
  const caifu: ZaluVerdict = {
    title: '财富', level: caiLevel, score: caifuScore,
    lines: [
      `财星 ${cai.toFixed(2)}（${f.caiRoot ? '有根可任' : '无根，财来财去'}，${f.caiTou ? '透干' : '不透'}）`,
      shi >= 1.2 && cai >= 1 ? `食伤 ${shi.toFixed(2)} 生财：凭技艺换钱` : `食伤 ${shi.toFixed(2)}：财源靠正路`,
      jie > 2.2 ? `比劫 ${jie.toFixed(2)} 偏重：合伙易被分走` : `${strong ? '身能任财' : '身偏弱，财来财去要守'}`,
    ],
    caveat: '只判量级与来源，不判具体数字、不断投资输赢。',
  };

  return { xueye, aiqing, caifu };
}
