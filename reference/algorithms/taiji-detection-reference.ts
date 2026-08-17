// ============================================================
//  太极判定·三档权重参考版
//
//  三类太极（权重越高越重要）：
//    【A】天干 vs 天干   …………… 权重 3
//    【B】地支 vs 地支   …………… 权重 2
//    【C】月令专属干支太极
//           · 天干并现   ………… 权重 6
//           · 藏干含气   ………… 权重 3
//
//  判定依据必须全部中文输出，不可出现英文缩写。
//  本文件为算法参考，不参与生产打包。
//  生产代码位置：src/utils/baziAnalyzer.ts → detectTaiji()
// ============================================================

import type { BaZiChart } from '@/utils/baziCalculator';

export interface TaijiHit {
  /** 太极类型，中文纯表述 */
  taijiType: string;
  /** 命中元素对（如 ["丙","癸"]、["巳","午"] 等） */
  elements: [string, string];
  /** 来源：天干互见 / 地支互见 / 月令天干并现 / 月令藏干含气  */
  source: string;
  /** 权重 2|3|6 */
  weight: 2 | 3 | 6;
  /** 判定依据，一句中文说明 */
  reason: string;
}

/** 月份→月令专属太极定义（即"库内参考"的核心数据） */
export const MONTHLY_TAIJI_DEFS: Record<
  number,
  {
    monthName: string;
    monthPillar: string;
    /** 天干并现式太极（权重 6） */
    stemPairs: Array<{ pair: [string, string]; reason: string; type: string }>;
    /** 地支藏干有 X 气也算的太极（权重 3） — X ∈ pair */
    hiddenQiPairs: Array<{ pair: [string, string]; reason: string; type: string }>;
  }
> = {
  // 寅月（春）——丙癸太极
  0: {
    monthName: '寅月',
    monthPillar: '丙寅',
    stemPairs: [
      { pair: ['丙', '癸'], reason: '寅月核心丙癸太极：丙火布温、癸水余寒，温寒并现方为真太极，富贵可期', type: '春月丙癸太极（天干并现）' },
    ],
    hiddenQiPairs: [
      { pair: ['丙', '癸'], reason: '寅藏甲丙戊，含丙气；局中癸水透出/藏于支，丙癸相应即构成丙癸太极雏形', type: '春月丙癸太极（藏干含气）' },
    ],
  },
  // 卯月（春）——丙癸太极
  1: {
    monthName: '卯月',
    monthPillar: '丁卯',
    stemPairs: [
      { pair: ['丙', '癸'], reason: '卯月余寒未解，丙癸温寒互济为第一太极；癸多丙无则寒，丙多癸无则燥', type: '春月丙癸太极（天干并现）' },
    ],
    hiddenQiPairs: [
      { pair: ['丙', '癸'], reason: '卯独藏乙，局中支中含丙/癸之气，与干透之癸/丙相应可成太极', type: '春月丙癸太极（藏干含气）' },
    ],
  },
  // 辰月（春）——戊癸太极
  2: {
    monthName: '辰月',
    monthPillar: '戊辰',
    stemPairs: [
      { pair: ['戊', '癸'], reason: '辰月土旺克水，破迷救阴为第一义；戊癸并见可成既济之局', type: '辰月戊癸破迷太极（天干并现）' },
      { pair: ['甲', '癸'], reason: '甲木克土救癸水，是辰月唯一贵气通路；甲癸并见主富且贵', type: '辰月甲癸救水太极（天干并现）' },
    ],
    hiddenQiPairs: [
      { pair: ['戊', '癸'], reason: '辰藏戊乙癸，自带戊癸暗合；局中再见戊或癸透出即构成太极', type: '辰月戊癸破迷太极（藏干含气）' },
      { pair: ['乙', '癸'], reason: '辰中乙木克土卫水；局中癸透即构成木土水连环太极', type: '辰月乙癸卫水太极（藏干含气）' },
    ],
  },
  // 巳月（夏）——庚丙太极
  3: {
    monthName: '巳月',
    monthPillar: '己巳',
    stemPairs: [
      { pair: ['庚', '丙'], reason: '巳月丙火当令最旺，庚金长生受制；庚丙并现火金交战主淬炼成材，贵格', type: '夏月庚丙淬炼太极（天干并现）' },
      { pair: ['丙', '壬'], reason: '夏月炎热最要水调候；丙壬并现水火既济为真太极', type: '夏月丙壬既济太极（天干并现）' },
    ],
    hiddenQiPairs: [
      { pair: ['庚', '丙'], reason: '巳藏丙庚戊；丙庚同宫即有太极之根，再透其一即成形', type: '夏月庚丙淬炼太极（藏干含气）' },
      { pair: ['丙', '戊'], reason: '巳中丙戊同宫，火土一气；局再见水调候可成既济', type: '巳月丙戊同宫太极（藏干含气）' },
    ],
  },
  // 午月（夏）——丙壬/丁壬太极
  4: {
    monthName: '午月',
    monthPillar: '庚午',
    stemPairs: [
      { pair: ['丙', '壬'], reason: '午月火旺至极，最需壬水调候；丙壬交映主大贵', type: '夏月丙壬既济太极（天干并现）' },
      { pair: ['丁', '壬'], reason: '丁壬化木于午月火旺之地，木为通关之神，主异路功名', type: '午月丁壬化木太极（天干并现）' },
    ],
    hiddenQiPairs: [
      { pair: ['丁', '己'], reason: '午藏丁己；火土一气成势，再见水可作既济根基', type: '午月丁己同宫太极（藏干含气）' },
    ],
  },
  // 未月（夏）——庚丙/丁壬太极
  5: {
    monthName: '未月',
    monthPillar: '辛未',
    stemPairs: [
      { pair: ['庚', '丙'], reason: '未月余火未退、燥土当令；庚丙并现火土金连环成器', type: '夏末庚丙成器太极（天干并现）' },
      { pair: ['丁', '壬'], reason: '未月燥气盛；丁壬合木润土，为润燥相济太极', type: '未月丁壬润燥太极（天干并现）' },
    ],
    hiddenQiPairs: [
      { pair: ['己', '丁'], reason: '未藏己丁乙；己丁同宫燥气重，见乙或水即构成润燥太极', type: '未月己丁同宫太极（藏干含气）' },
      { pair: ['乙', '丁'], reason: '未中乙木生火、丁火本气；乙丁并现木火通明但嫌过燥', type: '未月乙丁木火太极（藏干含气）' },
    ],
  },
  // 申月（秋）——丁壬太极
  6: {
    monthName: '申月',
    monthPillar: '壬申',
    stemPairs: [
      { pair: ['丁', '壬'], reason: '申月金旺水相，寒气渐长；丁壬并现丁火暖局、壬水得用', type: '秋月丁壬暖局太极（天干并现）' },
      { pair: ['甲', '庚'], reason: '庚金当令克木；甲木透干与庚交战，金木相斫主成器', type: '申月甲庚成器太极（天干并现）' },
    ],
    hiddenQiPairs: [
      { pair: ['庚', '壬'], reason: '申藏庚壬戊；金水同宫气旺，见丁火暖局即构成金水太极', type: '申月庚壬金水太极（藏干含气）' },
      { pair: ['戊', '庚'], reason: '申中戊生庚，土金一气；见甲木制土即成才', type: '申月戊庚土金太极（藏干含气）' },
    ],
  },
  // 酉月（秋）——丁壬/丙辛太极
  7: {
    monthName: '酉月',
    monthPillar: '癸酉',
    stemPairs: [
      { pair: ['丁', '壬'], reason: '酉月金纯气寒，丁火炼金、壬水淘洗；丁壬并见为金清水白', type: '秋月丁壬金清太极（天干并现）' },
      { pair: ['丙', '辛'], reason: '丙辛化水于酉月金旺之地，化气真则大贵', type: '酉月丙辛化水太极（天干并现）' },
    ],
    hiddenQiPairs: [
      { pair: ['辛', '壬'], reason: '酉独藏辛；金白水清最要壬水，壬透即构成金水太极雏形', type: '酉月辛壬金水太极（藏干含气）' },
    ],
  },
  // 戌月（秋）——甲戊/丙辛太极
  8: {
    monthName: '戌月',
    monthPillar: '甲戌',
    stemPairs: [
      { pair: ['甲', '戊'], reason: '戌月燥土当令，甲木疏土为第一要；甲戊交克主疏土成才', type: '戌月甲戊疏土太极（天干并现）' },
      { pair: ['丙', '辛'], reason: '戌为火库、辛为金精；丙辛煅金，主大器晚成', type: '戌月丙辛煅金太极（天干并现）' },
    ],
    hiddenQiPairs: [
      { pair: ['戊', '辛'], reason: '戌藏戊辛丁；土生金、金得火炼，三才具备成器之基', type: '戌月戊辛成器太极（藏干含气）' },
      { pair: ['丁', '戊'], reason: '戌中丁火生戊土，火土成势；见甲木疏土即构成疏土太极', type: '戌月丁戊火土太极（藏干含气）' },
    ],
  },
  // 亥月（冬）——丙壬太极
  9: {
    monthName: '亥月',
    monthPillar: '乙亥',
    stemPairs: [
      { pair: ['丙', '壬'], reason: '亥月水寒，丙火为第一尊神；丙壬并现水火既济主富且贵', type: '冬月丙壬既济太极（天干并现）' },
      { pair: ['甲', '丙'], reason: '亥中甲木长生，木能生火；甲丙并现木火通明主文章科甲', type: '亥月甲丙木火太极（天干并现）' },
    ],
    hiddenQiPairs: [
      { pair: ['壬', '甲'], reason: '亥藏壬甲；水生木，木为阳生之基，见丙火即成木火通明', type: '亥月壬甲水生木太极（藏干含气）' },
    ],
  },
  // 子月（冬）——丙壬太极
  10: {
    monthName: '子月',
    monthPillar: '丙子',
    stemPairs: [
      { pair: ['丙', '壬'], reason: '子月水寒至极，丙火太阳暖局最要；丙壬并现主大富大贵', type: '冬月丙壬既济太极（天干并现）' },
      { pair: ['戊', '丙'], reason: '子水泛滥最要戊土止之，再得丙火暖局；戊丙并现土水火三才齐备', type: '子月戊丙止水太极（天干并现）' },
    ],
    hiddenQiPairs: [
      { pair: ['癸', '丙'], reason: '子藏癸水，癸为雨露；丙癸并现可作既济雏形，但力量次于丙壬', type: '子月癸丙雨露太极（藏干含气）' },
    ],
  },
  // 丑月（冬）——丙/丁+水 太极
  11: {
    monthName: '丑月',
    monthPillar: '丁丑',
    stemPairs: [
      { pair: ['丙', '癸'], reason: '丑月寒中带湿，丙火暖局、癸水润土；丙癸并现温湿相济', type: '丑月丙癸温湿太极（天干并现）' },
      { pair: ['丁', '甲'], reason: '丑为湿土，甲木破土、丁火暖土；丁甲并现主寒谷回春', type: '丑月丁甲回春太极（天干并现）' },
    ],
    hiddenQiPairs: [
      { pair: ['己', '癸'], reason: '丑藏己癸辛；己土止水、癸水润土，再见辛泄己即构成流通', type: '丑月己癸土水太极（藏干含气）' },
      { pair: ['辛', '丙'], reason: '丑中辛金得丙火炼，可作金火成器太极之基', type: '丑月辛丙煅金太极（藏干含气）' },
    ],
  },
};

/** 取某个月支序对应的月柱干支（用于"月令核心气机·XX月"文案） */
export function getMonthPillar(monthBranchIndex: number): string {
  return MONTHLY_TAIJI_DEFS[monthBranchIndex]?.monthPillar || '';
}

/** 从 chart 中提取全部天干 */
function getAllStems(chart: BaZiChart): string[] {
  return [
    chart.yearPillar.stem, chart.monthPillar.stem,
    chart.dayPillar.stem, chart.hourPillar.stem,
  ];
}
/** 从 chart 中提取全部地支 */
function getAllBranches(chart: BaZiChart): string[] {
  return [
    chart.yearPillar.branch, chart.monthPillar.branch,
    chart.dayPillar.branch, chart.hourPillar.branch,
  ];
}
/** 从某支中提取藏干列表（简化版；完整版本见 baziCalculator.ts） */
const HIDDEN_STEMS: Record<string, string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'],
  卯: ['乙'], 辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'],
  午: ['丁', '己'], 未: ['己', '丁', '乙'], 申: ['庚', '壬', '戊'],
  酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};

/**
 * 参考版：检测太极（三档权重汇总）
 * 返回命中的全部 TaijiHit 列表，UI 按权重降序展示。
 * 本函数只作演示，真实生产版本见 baziAnalyzer.ts。
 */
export function detectTaijiReference(chart: BaZiChart): TaijiHit[] {
  const hits: TaijiHit[] = [];
  const monthIdx = chart.monthBranchIndex;
  const mDef = MONTHLY_TAIJI_DEFS[monthIdx];
  const stems = getAllStems(chart);
  const branches = getAllBranches(chart);

  // —— A. 天干 vs 天干（任意两柱，权重 3）——
  const TIAN_GAN_TAIJI_PAIRS: Array<{ pair: [string, string]; reason: string; type: string }> = [
    { pair: ['丙', '癸'], reason: '丙癸为温寒二气之代表，天干并现主春月令太极成立', type: '丙癸温寒太极' },
    { pair: ['丙', '壬'], reason: '丙火太阳、壬水江湖，水火既济主大贵', type: '丙壬既济太极' },
    { pair: ['丁', '壬'], reason: '丁壬化木，主异路功名、温润相济', type: '丁壬化木太极' },
    { pair: ['甲', '庚'], reason: '甲庚相斫、木金相伐，主成器之命', type: '甲庚成器太极' },
    { pair: ['甲', '戊'], reason: '甲木疏土、戊土培木，土木交战主厚重成才', type: '甲戊疏土太极' },
    { pair: ['丙', '辛'], reason: '丙辛煅金、金火成器，主大器晚成', type: '丙辛煅金太极' },
    { pair: ['戊', '癸'], reason: '戊癸既济、破迷救阴，主辰戌月破格得贵', type: '戊癸破迷太极' },
  ];
  for (const def of TIAN_GAN_TAIJI_PAIRS) {
    const [a, b] = def.pair;
    if (stems.includes(a) && stems.includes(b)) {
      hits.push({ taijiType: def.type, elements: def.pair, source: '天干互见', weight: 3, reason: def.reason });
    }
  }

  // —— B. 地支 vs 地支（权重 2）——
  const DI_ZHI_TAIJI_PAIRS: Array<{ pair: [string, string]; reason: string; type: string }> = [
    { pair: ['巳', '亥'], reason: '巳亥对冲，水火交激，主大起大落中有真太极', type: '巳亥水火对冲太极' },
    { pair: ['子', '午'], reason: '子午正冲，水火既济之极端，主大富大贵或大凶', type: '子午既济对冲太极' },
    { pair: ['寅', '申'], reason: '寅申天克地冲，金木火交伐主成器', type: '寅申金木对冲太极' },
    { pair: ['卯', '酉'], reason: '卯酉正东正西对冲，金克木主金神制木成器', type: '卯酉金克木对冲太极' },
    { pair: ['辰', '戌'], reason: '辰戌天克地冲，墓库大开主情感六亲暗昧与成就并存', type: '辰戌墓库对冲太极' },
    { pair: ['丑', '未'], reason: '丑未冲、土气激荡，主藏干透出、库中物出', type: '丑未土气对冲太极' },
  ];
  for (const def of DI_ZHI_TAIJI_PAIRS) {
    const [a, b] = def.pair;
    if (branches.includes(a) && branches.includes(b)) {
      hits.push({ taijiType: def.type, elements: def.pair, source: '地支互见', weight: 2, reason: def.reason });
    }
  }

  // —— C. 月令专属干支太极 ——
  if (mDef) {
    // C-1 天干并现（权重 6）
    for (const sp of mDef.stemPairs) {
      const [a, b] = sp.pair;
      if (stems.includes(a) && stems.includes(b)) {
        hits.push({ taijiType: sp.type, elements: sp.pair, source: '月令天干并现', weight: 6, reason: sp.reason });
      }
    }
    // C-2 藏干含气（权重 3）：一对元素中，一个要在藏干里出现
    const allHidden = branches.flatMap((b) => HIDDEN_STEMS[b] || []);
    for (const hp of mDef.hiddenQiPairs) {
      const [a, b] = hp.pair;
      const aIn = stems.includes(a) || allHidden.includes(a);
      const bIn = stems.includes(b) || allHidden.includes(b);
      if (aIn && bIn) {
        hits.push({ taijiType: hp.type, elements: hp.pair, source: '月令藏干含气', weight: 3, reason: hp.reason });
      }
    }
  }

  // 按权重从大到小返回（权重相同则保留插入顺序）
  return hits.sort((x, y) => y.weight - x.weight);
}
