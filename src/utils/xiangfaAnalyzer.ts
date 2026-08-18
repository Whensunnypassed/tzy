// ============================================================
// 象意·财富·感情·学历 分析引擎（独立于核心 baziAnalyzer）
// 本引擎仅服务于「象意·财富·感情·学历」栏目模块、大运流年情缘接口、
// 用神忌神判断的「土」专区。所有结论以 xiangfaData.ts 数据书为最终参考；
// 数据书未命中时返回「目前数据不明确，仅供参考」，不影响任何既有模块结论。
// ============================================================

import {
  type BaZiChart,
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  STEM_YINYANG,
} from './baziCalculator';
import {
  judgeEarthXiJi,
  calculateYinYangBalance,
  DI_ZHI_LIU_HE,
  LIU_CHONG_PAIRS,
  SAN_HE_GROUPS,
  SAN_HUI_GROUPS,
  type MonthQiResult,
} from './baziAnalyzer';
import {
  XIANG_YI_ELEMENTS,
  WEALTH_RULES,
  ROMANCE_RULES,
  EDUCATION_RULES,
  EDUCATION_LEVELS,
  EDUCATION_SCORING,
  PEACH_BRANCHES,
  WEALTH_RANKS,
  NOBILITY_RANKS,
  mapScoreToRank,
} from '../data/xiangfaData';

export const XIANGFA_PRIORITY = 2; // 数据书优先级：2（仅供新模块，不参与底层运算）

const KE_MAP: Record<string, string> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
const ELEMENT_CN: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };

const NOT_MATCHED_DISCLAIMER = '目前数据不明确，仅供参考';

// 返回某个天干对应的数据书象意条目
function elementData(el: string) {
  return XIANG_YI_ELEMENTS[el] ?? XIANG_YI_ELEMENTS.earth;
}

// ============================================================
// 一、象意
// ============================================================
export interface XiangYiVerdict {
  dayMaster: {
    stem: string;
    elementName: string;
    fourSymbol: string;
    nature: string;
    stemTraits: string;
    imagery: string[];
    body: string;
    talent: string;
    jiXiong: string;
    monthFlow: string;
    monthStatus: string;
  };
  pillars: Array<{
    position: string;
    gz: string;
    elementName: string;
    stemTraits: string;
  }>;
  matched: boolean;
}

export function analyzeXiangYi(
  chart: BaZiChart,
  monthQi: MonthQiResult | null,
): XiangYiVerdict {
  const dayStem = chart.day.stem;
  const dayEl = STEM_ELEMENTS[dayStem];
  const info = elementData(dayEl);
  const stemInfo = STEM_YINYANG[dayStem] === 'yang' ? info.stemYang : info.stemYin;
  const monthFlow = monthQi ? `${monthQi.monthName}月 · ${info.monthFlow}` : info.monthFlow;
  const positions = ['年', '月', '日', '时'];
  const pillars = [chart.year, chart.month, chart.day, chart.hour].map((p, i) => ({
    position: positions[i],
    gz: `${p.stem}${p.branch}`,
    elementName: ELEMENT_CN[STEM_ELEMENTS[p.stem]],
    stemTraits: (STEM_YINYANG[p.stem] === 'yang'
      ? elementData(STEM_ELEMENTS[p.stem]).stemYang
      : elementData(STEM_ELEMENTS[p.stem]).stemYin).traits,
  }));

  return {
    dayMaster: {
      stem: dayStem,
      elementName: ELEMENT_CN[dayEl],
      fourSymbol: info.fourSymbol,
      nature: info.nature,
      stemTraits: `${stemInfo.char}${stemInfo.name}：${stemInfo.traits}`,
      imagery: info.imagery,
      body: info.body,
      talent: info.talent,
      jiXiong: info.jiXiong,
      monthFlow,
      monthStatus: `${monthQi ? monthQi.fourSymbol + ' · ' : ''}${info.fourSymbol}之气，落于${monthQi ? monthQi.monthName : '本月'}：${info.monthFlow.slice(0, 60)}`,
    },
    pillars,
    matched: true,
  };
}

// ============================================================
// 二、财富（富贵财官）
// ============================================================
export interface WealthVerdict {
  inputs: Array<{ label: string; value: string }>;
  matched: boolean;
  result: string;
  reference: string[];
  disclaimer?: string;
  // —— 外显最终档位与描述（按真实财富金字塔严格映射）——
  wealthScoreFinal: number;       // 直接沿用底层 wealthScore
  wealthRank: string;             // 外显档位：顶尖富豪 / 富豪级 / 富裕 / 中上 / 中产 / 小康 / 温饱 / 贫困 / 赤贫
  wealthRankDesc: string;         // 档位描述
  nobilityScoreFinal: number;     // 直接沿用底层 nobilityScore
  nobilityRank: string;           // 外显贵寿/地位档位
  nobilityRankDesc: string;       // 贵寿档位描述
}

export function analyzeWealthVerdict(
  chart: BaZiChart,
  monthQi: MonthQiResult | null,
  wealthNobility: { wealthScore: number; wealthLevel: string; wealthDesc: string; nobilityScore: number; nobilityLevel: string } | null,
  elementPower: { wood: number; fire: number; earth: number; metal: number; water: number } | null,
): WealthVerdict {
  const yangPower = (elementPower ? elementPower.wood + elementPower.fire : 0);
  const yinPower = (elementPower ? elementPower.metal + elementPower.water : 0);
  const stems = [chart.year.stem, chart.month.stem, chart.day.stem, chart.hour.stem];
  const branches = [chart.year.branch, chart.month.branch, chart.day.branch, chart.hour.branch];
  // 富载体（阳干 甲丙戊壬）/ 贵载体（阴干 庚辛癸）
  const yangCarrier = stems.filter((s) => ['甲', '丙', '戊', '壬'].includes(s));
  const yinCarrier = stems.filter((s) => ['庚', '辛', '癸'].includes(s));
  // 财星 / 官杀 十神
  const isMale = chart.gender === 'male';
  const caiGan = stems.filter((s, i) => {
    const ss = [chart.year, chart.month, chart.day, chart.hour][i].shiShen || '';
    return ss.includes('财');
  });
  const guanGan = stems.filter((s, i) => {
    const ss = [chart.year, chart.month, chart.day, chart.hour][i].shiShen || '';
    return ss.includes('官') || ss.includes('杀');
  });
  const caiBranches = branches.filter((b) => BRANCH_ELEMENTS[b] === KE_MAP[STEM_ELEMENTS[chart.day.stem]]); // 我克为财
  const guanBranches = branches.filter((b) => KE_MAP[BRANCH_ELEMENTS[b]] === STEM_ELEMENTS[chart.day.stem]); // 克我为官
  const caiShenPresent = caiGan.length > 0 || caiBranches.length > 0;
  const guanShenPresent = guanGan.length > 0 || guanBranches.length > 0;
  // 宫位：他宫（年月）/ 我宫（日时）
  const caiOuter = [0, 1].some((i) => BRANCH_ELEMENTS[branches[i]] === KE_MAP[STEM_ELEMENTS[chart.day.stem]]);
  const guanOuter = [0, 1].some((i) => KE_MAP[BRANCH_ELEMENTS[branches[i]]] === STEM_ELEMENTS[chart.day.stem]);

  const inputs = [
    { label: '阳气(木火)', value: `${yangPower.toFixed(1)}%` },
    { label: '阴气(金水)', value: `${yinPower.toFixed(1)}%` },
    { label: '富载体(阳干)', value: yangCarrier.length > 0 ? yangCarrier.join('·') : '未透' },
    { label: '贵载体(阴干)', value: yinCarrier.length > 0 ? yinCarrier.join('·') : '未透' },
    { label: '财星(妻星/资源)', value: caiShenPresent ? (caiGan.length > 0 ? `天干 ${caiGan.join('·')}` : '藏于地支') : '不显' },
    { label: '官杀(管控/地位)', value: guanShenPresent ? (guanGan.length > 0 ? `天干 ${guanGan.join('·')}` : '藏于地支') : '不显' },
    { label: '资源宫位', value: `${caiOuter ? '财星在他宫(年月)' : ''}${caiOuter && guanOuter ? '、' : ''}${guanOuter ? '官星在他宫(年月)' : (caiShenPresent || guanShenPresent ? '财官多在我宫(日时)' : '—')}` },
  ];

  // 取底层既有财富/贵寿分数；未提供时默认 38（温饱线以下，保证不崩）
  const rawWealthScore = wealthNobility?.wealthScore ?? 38;
  const rawNobilityScore = wealthNobility?.nobilityScore ?? 38;
  const wRank = mapScoreToRank(rawWealthScore, WEALTH_RANKS);
  const nRank = mapScoreToRank(rawNobilityScore, NOBILITY_RANKS);

  // 综合结论（只给最终结果与定位的自然语言，不展示任何打分依据细节）
  let result = `财富层级：${wRank.rank}；事业地位：${nRank.rank}。`;
  if (wRank.min >= 90) result += ' 富源极盛，一生财富表现出众，然仍需格局平衡为归依。';
  else if (wRank.min >= 68) result += ' 经济整体向好，多能在中年前后积累稳定资产。';
  else if (wRank.min >= 42) result += ' 财富表现属大众主流区间，生活稳定、略有结余，宜稳步积累。';
  else result += ' 求财相对辛劳，需靠个人努力与岁运帮扶，切忌贪进冒险。';
  if (caiShenPresent || guanShenPresent) {
    result += caiOuter || guanOuter
      ? ' 财官多居他宫（年月），属外部社会资源，需与日主自身产生刑冲合害、干合藏透等关系，方可转化为自身所能掌握的财富与地位。'
      : ' 财官多居我宫（日时），资源禀赋贴身，多可凭自身能力与后天积累直接落袋为用。';
  }

  const matched = caiShenPresent || guanShenPresent || yangCarrier.length > 0 || yinCarrier.length > 0;
  return {
    inputs,
    matched,
    result,
    reference: [],
    disclaimer: matched ? undefined : NOT_MATCHED_DISCLAIMER,
    wealthScoreFinal: Math.max(0, Math.min(100, Math.round(rawWealthScore))),
    wealthRank: wRank.rank,
    wealthRankDesc: wRank.desc,
    nobilityScoreFinal: Math.max(0, Math.min(100, Math.round(rawNobilityScore))),
    nobilityRank: nRank.rank,
    nobilityRankDesc: nRank.desc,
  };
}

// ============================================================
// 三、感情（异性缘与婚姻情缘）
// ============================================================
export interface RomanceVerdict {
  inputs: Array<{ label: string; value: string }>;
  matched: boolean;
  love: boolean;
  marriage: boolean;
  result: string;
  reference: string[];
  disclaimer?: string;
  loveTiming: string;            // 最利恋爱的年份/流年应期
  marriageTiming: string;        // 最利结婚的年份/流年应期
  peachBranches: string[];       // 命局桃花地支（子午卯酉）
  oppositeElementName: string;   // 异性星（财/官）元素
  marriagePalace: string;        // 夫妻宫（日支）
  heBranch: string;              // 与日支六合的地支（无则为空）
  chongBranch: string;           // 与日支相冲的地支（无则为空）
  sanHeBranches: string[];       // 与日支三合/三会的其余地支（逗号分隔字符串）
}

export function analyzeRomanceVerdict(
  chart: BaZiChart,
): RomanceVerdict {
  const isMale = chart.gender === 'male';
  const dayEl = STEM_ELEMENTS[chart.day.stem];
  const oppositeEl = isMale ? KE_MAP[dayEl] : Object.keys(KE_MAP).find((k) => KE_MAP[k] === dayEl) || 'water';
  const oppositeName = isMale ? '财星(妻星)' : '官星(夫星)';
  const stems = [chart.year.stem, chart.month.stem, chart.day.stem, chart.hour.stem];
  const branches = [chart.year.branch, chart.month.branch, chart.day.branch, chart.hour.branch];
  const dayBranch = chart.day.branch;
  const spouseStarInStem = stems.some((s) => STEM_ELEMENTS[s] === oppositeEl);
  // 异性星入夫妻宫（日支主气或藏干）
  const spouseInPalace = BRANCH_ELEMENTS[dayBranch] === oppositeEl
    || chart.day.hiddenStems.some((s) => STEM_ELEMENTS[s] === oppositeEl);
  const peach = branches.filter((b) => PEACH_BRANCHES.includes(b));
  // 辰戌相见 / 相冲
  const hasChenXu = branches.includes('辰') && branches.includes('戌');
  // 日支（夫妻宫）与他支的六合/冲（婚姻宫引动）
  const palaceTriggered = branches.some((b) => b !== dayBranch && (
    DI_ZHI_LIU_HE[b + dayBranch] || DI_ZHI_LIU_HE[dayBranch + b] || LIU_CHONG_PAIRS[b + dayBranch] || LIU_CHONG_PAIRS[dayBranch + b]
  ));
  // —— 情缘应期：与夫妻宫（日支）六合 / 相冲 / 三合·三会 的地支 ——
  const heEntry = Object.entries(DI_ZHI_LIU_HE).find(([k]) => k.includes(dayBranch));
  const heBranch = heEntry ? heEntry[0].replace(dayBranch, '') : '';
  const chongEntry = Object.entries(LIU_CHONG_PAIRS).find(([k]) => k.includes(dayBranch));
  const chongBranch = chongEntry ? chongEntry[0].replace(dayBranch, '') : '';
  const sanHeBranches = [
    ...SAN_HE_GROUPS.filter((g) => g.members.includes(dayBranch)).flatMap((g) => g.members.filter((m) => m !== dayBranch)),
    ...SAN_HUI_GROUPS.filter((g) => g.members.includes(dayBranch)).flatMap((g) => g.members.filter((m) => m !== dayBranch)),
  ];
  const oppositeElementName = ELEMENT_CN[oppositeEl];

  const inputs = [
    { label: '性别', value: isMale ? '男命' : '女命' },
    { label: '异性星', value: `${oppositeName}（${oppositeElementName}）` },
    { label: '异性星透干', value: spouseStarInStem ? '有' : '无' },
    { label: '异性星入夫妻宫', value: spouseInPalace ? '是（正缘）' : '否' },
    { label: '桃花(子午卯酉)', value: peach.length > 0 ? peach.join('·') : '无' },
    { label: '夫妻宫(日支)', value: dayBranch },
    { label: '六合/相冲夫妻宫', value: `${heBranch ? `六合${heBranch}` : '—'}${heBranch && chongBranch ? '、' : ''}${chongBranch ? `冲${chongBranch}` : '—'}` },
    { label: '辰戌相见', value: hasChenXu ? '有（人事波折）' : '无' },
  ];

  // —— 结论（综合分析，不含任何内部原文引用）——
  let result = '';
  const love = spouseStarInStem || peach.length > 0 || palaceTriggered;
  let marriage = spouseInPalace;

  if (spouseStarInStem) {
    result += ` ${oppositeName}透出天干，异性缘基础显现；不过天干多为缘分表象，感情实质需结合地支合冲与夫妻宫引动综合判断。`;
  }
  if (spouseInPalace) {
    result += ` ${oppositeName}正落夫妻宫（日支${dayBranch}），属正缘之象，名分内的正统情缘较为稳固。`;
    marriage = true;
  } else if (palaceTriggered) {
    result += ` 夫妻宫（日支${dayBranch}）被其他地支合冲引动，婚姻宫有应期，逢岁运再合冲时感情之事易显。`;
  }
  if (peach.length > 0) {
    result += ` 命带桃花（${peach.join('·')}），异性缘旺、魅力外显；若桃花逢合冲或异性星未入正宫，感情关系可能较为分散、易生外情桃花。`;
  }
  if (hasChenXu) {
    result += ' 辰戌相见，婚恋与家庭人事易生波折，遇辰戌之年尤为明显；并非品行问题，多为情感与家庭的选择与磨合。';
  }

  const matched = spouseStarInStem || spouseInPalace || peach.length > 0 || hasChenXu;

  // —— 恋爱 / 结婚应期（最容易恋爱与结婚的年份） ——
  let loveTiming = '';
  if (peach.length > 0) loveTiming += `逢${peach.join('、')}桃花之年异性缘最旺、最易动情；`;
  if (oppositeElementName) loveTiming += `逢${oppositeElementName}干/支流年（${oppositeName}现）恋爱运开；`;
  if (heBranch) loveTiming += `逢${heBranch}年（六合夫妻宫${dayBranch}）情感涌动；`;
  if (sanHeBranches.length > 0) loveTiming += `逢${Array.from(new Set(sanHeBranches)).join('、')}三合/三会之年情缘聚拢；`;
  if (!loveTiming) loveTiming = '恋爱应期需逢岁运桃花或异性星引动之年方显，无明显固定旺年。';

  let marriageTiming = '';
  if (heBranch) marriageTiming += `逢${heBranch}年（与日支${dayBranch}六合）最利婚定；`;
  if (chongBranch) marriageTiming += `逢${chongBranch}年（冲动夫妻宫${dayBranch}）婚姻易成或变动；`;
  if (sanHeBranches.length > 0) marriageTiming += `逢${Array.from(new Set(sanHeBranches)).join('、')}三合/三会之年亦利婚姻合和；`;
  if (spouseInPalace) marriageTiming += ` ${oppositeName}已入夫妻宫，逢${oppositeElementName}流年引动即为婚姻应期；`;
  if (hasChenXu) marriageTiming += ' 辰戌相见者，逢辰戌之年人事与婚恋波动最显；';
  if (!marriageTiming) marriageTiming = '结婚应期需逢岁运合冲夫妻宫之年方显，无明显固定婚年。';

  result += ` 应期提示——恋爱：${loveTiming}结婚：${marriageTiming}`;

  return {
    inputs,
    matched,
    love,
    marriage,
    result,
    reference: [],
    disclaimer: matched ? undefined : NOT_MATCHED_DISCLAIMER,
    loveTiming,
    marriageTiming,
    peachBranches: peach,
    oppositeElementName,
    marriagePalace: dayBranch,
    heBranch,
    chongBranch,
    sanHeBranches,
  };
}

// ============================================================
// 四、学历（十神学业考试）
// ============================================================
export interface EducationVerdict {
  inputs: Array<{ label: string; value: string }>;
  matched: boolean;
  result: string;
  reference: string[];
  disclaimer?: string;
  // 新增：学历量化打分（10 档：辍学~顶级学校）
  score: number;         // 学历分 0-100
  level: string;         // 学历档位
  levelDesc: string;     // 档位描述
  scoreReasons: string[]; // 打分依据明细
}

// 学历量化打分：0-100 分，映射 10 档（辍学/小学/初中/高中/三本/二本/一本/211/985/顶级学校）
// 依据《象法》数据书 EDUCATION_SCORING 权重：印星根基 + 财印平衡 + 食伤/官杀/比劫修正 + 格局用神力量
export function scoreEducationLevel(
  chart: BaZiChart,
  yongJi: { usefulElements: string[]; tabooElements: string[] } | null,
  elementPower: { wood: number; fire: number; earth: number; metal: number; water: number } | null,
): { score: number; level: string; levelDesc: string; reasons: string[] } {
  const useful = yongJi?.usefulElements ?? [];
  const taboo = yongJi?.tabooElements ?? [];
  const pillars = [chart.year, chart.month, chart.hour];
  const ten = pillars.map((p) => p.shiShen || '');
  const count = (kw: string) => ten.filter((s) => s.includes(kw)).length;
  const elOf = (kw: string) => {
    const els = new Set<string>();
    pillars.forEach((p) => { if ((p.shiShen || '').includes(kw)) els.add(STEM_ELEMENTS[p.stem]); });
    return els;
  };
  const yinStar = count('印');
  const caiStar = count('财');
  const shiShang = count('食') + count('伤');
  const guanSha = count('官') + count('杀');
  const biJie = count('比') + count('劫');
  const yinEls = elOf('印');
  const shiShangEls = new Set<string>([...elOf('食'), ...elOf('伤')]);
  const guanShaEls = new Set<string>([...elOf('官'), ...elOf('杀')]);
  const biJieEls = new Set<string>([...elOf('比'), ...elOf('劫')]);
  const inUseful = (els: Set<string>) => Array.from(els).some((el) => useful.includes(el));
  const inTaboo = (els: Set<string>) => Array.from(els).some((el) => taboo.includes(el));

  let score = EDUCATION_SCORING.base; // 50
  const reasons: string[] = [];

  // 印星（学识根基）
  if (yinStar > 0) {
    if (inUseful(yinEls)) { score += EDUCATION_SCORING.yinUseful; reasons.push(`印星得用 +${EDUCATION_SCORING.yinUseful}`); }
    else if (inTaboo(yinEls)) { score -= EDUCATION_SCORING.yinTaboo; reasons.push(`印星为忌 -${EDUCATION_SCORING.yinTaboo}`); }
    else { score += EDUCATION_SCORING.yinPresent; reasons.push(`印星透干 +${EDUCATION_SCORING.yinPresent}`); }
  }
  // 财印平衡（成果转化）
  if (yinStar > 0 && caiStar > 0) {
    if (inUseful(yinEls)) { score += EDUCATION_SCORING.caiBalance; reasons.push(`财印平衡·印得用 +${EDUCATION_SCORING.caiBalance}`); }
    else { score -= EDUCATION_SCORING.yinStrongCaiWeak; reasons.push(`印旺财弱 -${EDUCATION_SCORING.yinStrongCaiWeak}`); }
  } else if (yinStar === 0 && caiStar > 0) {
    score -= EDUCATION_SCORING.caiKeYin; reasons.push(`财旺破印 -${EDUCATION_SCORING.caiKeYin}`);
  }
  // 食伤（发挥输出）
  if (shiShang > 0) {
    if (inUseful(shiShangEls)) { score += EDUCATION_SCORING.shiShangUseful; reasons.push(`食伤得用 +${EDUCATION_SCORING.shiShangUseful}`); }
    else if (shiShang >= 2) { score -= EDUCATION_SCORING.shiShangExcess; reasons.push(`食伤过旺无制 -${EDUCATION_SCORING.shiShangExcess}`); }
  }
  // 官杀（压力自律）
  if (guanSha > 0) {
    if (inUseful(guanShaEls)) { score += EDUCATION_SCORING.guanShaUseful; reasons.push(`官杀得用 +${EDUCATION_SCORING.guanShaUseful}`); }
    else if (guanSha >= 2) { score -= EDUCATION_SCORING.guanShaExcess; reasons.push(`官杀过旺无制 -${EDUCATION_SCORING.guanShaExcess}`); }
  }
  // 比劫（竞争助力）
  if (biJie > 0) {
    if (inUseful(biJieEls)) { score += EDUCATION_SCORING.biJieUseful; reasons.push(`比劫得用 +${EDUCATION_SCORING.biJieUseful}`); }
    else if (biJie >= 2) { score -= EDUCATION_SCORING.biJieExcess; reasons.push(`比劫过旺 -${EDUCATION_SCORING.biJieExcess}`); }
  }
  // 格局用神力量（决定学历上限）
  if (elementPower) {
    let yongPower = 0;
    useful.forEach((el) => { yongPower += (elementPower as Record<string, number>)[el] ?? 0; });
    const total = (elementPower.wood + elementPower.fire + elementPower.earth + elementPower.metal + elementPower.water) || 1;
    const bonus = Math.round(Math.min(1, Math.max(0, yongPower / total)) * EDUCATION_SCORING.patternMax);
    if (bonus > 0) { score += bonus; reasons.push(`用神力量占比加成 +${bonus}`); }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let lv = EDUCATION_LEVELS[EDUCATION_LEVELS.length - 1];
  for (const item of EDUCATION_LEVELS) {
    if (score >= item.min && score <= item.max) { lv = item; break; }
  }
  return { score, level: lv.level, levelDesc: lv.desc, reasons };
}

export function analyzeEducationVerdict(
  chart: BaZiChart,
  yongJi: { usefulElements: string[]; tabooElements: string[] } | null,
  elementPower: { wood: number; fire: number; earth: number; metal: number; water: number } | null,
): EducationVerdict {
  const pillars = [chart.year, chart.month, chart.hour];
  const ten = pillars.map((p) => p.shiShen || '').filter(Boolean);
  const count = (kw: string) => ten.filter((s) => s.includes(kw)).length;
  const yinStar = count('印');         // 正印+偏印
  const caiStar = count('财');         // 正财+偏财
  const shiShang = count('食') + count('伤');
  const guanSha = count('官') + count('杀');
  const biJie = count('比') + count('劫');
  // 印星是否为用神
  const yinIsUseful = (() => {
    const yinEls = new Set<string>();
    pillars.forEach((p) => {
      if ((p.shiShen || '').includes('印')) yinEls.add(STEM_ELEMENTS[p.stem]);
    });
    const useful = (yongJi?.usefulElements ?? []);
    return Array.from(yinEls).some((el) => useful.includes(el));
  })();
  // 文理：木火(文科) / 金水(理科)
  const wenScore = (elementPower ? elementPower.wood + elementPower.fire : 0);
  const liScore = (elementPower ? elementPower.metal + elementPower.water : 0);
  const subject = liScore > wenScore ? '理科（金水主智、主逻辑）' : '文科（木火主语言、主文采）';

  const inputs = [
    { label: '印星(学识根基)', value: yinStar > 0 ? `${yinStar} 位` : '未现' },
    { label: '财星(成果载体)', value: caiStar > 0 ? `${caiStar} 位` : '未现' },
    { label: '食伤(发挥输出)', value: shiShang > 0 ? `${shiShang} 位` : '未现' },
    { label: '官杀(压力自律)', value: guanSha > 0 ? `${guanSha} 位` : '未现' },
    { label: '比劫(竞争助力)', value: biJie > 0 ? `${biJie} 位` : '未现' },
    { label: '文理倾向', value: subject },
    { label: '印星用忌', value: yinIsUseful ? '印为用神（得用）' : yinStar > 0 ? '印非核心用神' : '—' },
  ];

  // 综合判定（自然语言结论，不含任何数据书原文）
  let result = '';
  if (yinStar > 0 && caiStar > 0) {
    result += `财印双现（印${yinStar}位、财${caiStar}位），学业核心太极「财印平衡」成立；${yinIsUseful ? '印星得用，学识根基扎实，学有所成、成果易落地。' : '印星未得核心用神之力，学识转化成果需借岁运引动，考试发挥须配合大运流年。'}`;
  } else if (yinStar > 0) {
    result += `印星为根（${yinStar}位），学识根基厚实；但财星未现，缺乏成果落地的载体，${yinIsUseful ? '得用则学业平顺、知识体系稳固。' : '印未得用则知识偏满而难落地，需岁运财星引动方显成果。'}`;
    if (shiShang > 0) { result += ` 食伤${shiShang}位，输出与发挥层面尚可，考场表达有加分；若过度无制则易分心贪玩。`; }
  } else if (caiStar > 0) {
    result += `财星为成果载体（${caiStar}位），然印星未现、知识根基偏薄，往往考场临时发挥尚可，却难成深厚持久的学识积累。`;
  } else {
    result += `印星、财星均未透出，学业核心太极不显，需靠岁运补入方能真正显效。`;
  }
  if (guanSha > 0) {
    result += ` 官杀${guanSha}位，适度则代表自律与压力驱动利于学业坚持；若无制过旺则易因压力过载产生厌学抵触。`;
  }
  if (biJie > 0) {
    result += ` 比劫${biJie}位，适度代表同辈间的良性竞争与互助进步；过旺则易分心玩乐、专注力溃散。`;
  }
  result += ` 文理倾向：${subject}。`;

  const matched = yinStar > 0 || caiStar > 0;

  // —— 学历量化打分（10 档），结论只展示最终档位，不展示任何打分过程明细 ——
  const scored = scoreEducationLevel(chart, yongJi, elementPower);
  result += ` 学历评价：${scored.level}（${scored.score} 分）——${scored.levelDesc}。`;

  return {
    inputs,
    matched,
    result,
    reference: [],
    disclaimer: matched ? undefined : NOT_MATCHED_DISCLAIMER,
    score: scored.score,
    level: scored.level,
    levelDesc: scored.levelDesc,
    scoreReasons: [],
  };
}

// ============================================================
// 五、大运流年情缘接口（爱心=恋爱可能 / 喜字=结婚可能）
// ============================================================
export interface RomanceFlag {
  love: boolean;
  marriage: boolean;
  reason: string;
}

export function evaluateRomanceForGZ(
  stem: string,
  branch: string,
  chart: BaZiChart,
): RomanceFlag {
  const isMale = chart.gender === 'male';
  const dayEl = STEM_ELEMENTS[chart.day.stem];
  const oppositeEl = isMale ? KE_MAP[dayEl] : Object.keys(KE_MAP).find((k) => KE_MAP[k] === dayEl) || 'water';
  const oppositeName = isMale ? '财星(妻星)' : '官星(夫星)';
  const dayBranch = chart.day.branch;
  const stemEl = STEM_ELEMENTS[stem];
  const branchEl = BRANCH_ELEMENTS[branch];
  const oppositeMet = stemEl === oppositeEl || branchEl === oppositeEl;

  const reasons: string[] = [];
  let love = false;
  let marriage = false;

  // 桃花：子午卯酉
  if (PEACH_BRANCHES.includes(branch)) {
    love = true;
    reasons.push(`地支${branch}为桃花，异性缘旺、恋爱契机显`);
  }
  // 异性星（财/官）透出
  if (oppositeMet) {
    love = true;
    reasons.push(`${oppositeName}(${ELEMENT_CN[oppositeEl]})现于干支，异性缘引动`);
  }
  // 夫妻宫（日支）被合/冲/伏吟/三合引动 → 婚姻应期
  const isHe = DI_ZHI_LIU_HE[branch + dayBranch] || DI_ZHI_LIU_HE[dayBranch + branch];
  const isChong = LIU_CHONG_PAIRS[branch + dayBranch] || LIU_CHONG_PAIRS[dayBranch + branch];
  const isFuYin = branch === dayBranch;
  const isSanHe = SAN_HE_GROUPS.some((g) => g.members.includes(branch) && g.members.includes(dayBranch));
  const isSanHui = SAN_HUI_GROUPS.some((g) => g.members.includes(branch) && g.members.includes(dayBranch));
  const palaceMoved = isHe || isChong || isFuYin || isSanHe || isSanHui;
  if (palaceMoved) {
    love = true;
    const how = isHe ? `六合${DI_ZHI_LIU_HE[branch + dayBranch] || DI_ZHI_LIU_HE[dayBranch + branch]}` : isChong ? '相冲' : isFuYin ? '伏吟' : isSanHe ? '三合' : '三会';
    reasons.push(`${branch}与夫妻宫${dayBranch}${how}，婚姻宫被引动`);
    // 结婚：婚姻宫被引动 且 异性星现（或桃花强）
    if (oppositeMet || PEACH_BRANCHES.includes(branch)) {
      marriage = true;
    }
  }
  // 辰戌相见：引动婚姻人事
  const chenXu = (dayBranch === '辰' && branch === '戌') || (dayBranch === '戌' && branch === '辰');
  if (chenXu) {
    love = true;
    reasons.push(`${branch}与日支${dayBranch}辰戌相见，人事与婚恋波动显`);
    if (oppositeMet || PEACH_BRANCHES.includes(branch)) marriage = true;
  }

  const reason = reasons.length > 0 ? reasons.join('；') : '情缘平静，无明显引动';
  return { love, marriage, reason };
}

// ============================================================
// 六、用神忌神判断·土专区（是否取用土及原因）
// ============================================================
export interface EarthXiJiResult {
  decision: 'useful' | 'taboo' | 'neutral';
  overall: string;
  reason: string;
  details: Array<{ ganzhi: string; mark: 'useful' | 'taboo' | 'neutral'; note: string }>;
}

export function analyzeEarthXiJi(
  chart: BaZiChart,
  monthQi: MonthQiResult | null,
): EarthXiJiResult {
  const yinYang = calculateYinYangBalance(chart);
  const earthGanzhi: string[] = [];
  [chart.year, chart.month, chart.day, chart.hour].forEach((p) => {
    if (STEM_ELEMENTS[p.stem] === 'earth') earthGanzhi.push(p.stem);
    if (BRANCH_ELEMENTS[p.branch] === 'earth') earthGanzhi.push(p.branch);
  });
  const unique = Array.from(new Set(earthGanzhi));
  const details = unique.map((gz) => {
    const mark = judgeEarthXiJi(gz, chart, yinYang);
    const note = mark === 'useful'
      ? '此土干支宜用（可止寒制水 / 晦火存金 / 固本培元）'
      : mark === 'taboo'
        ? '此土干支不宜取用（土旺晦火 / 克水损智 / 独旺失衡）'
        : '此土干支为调和位，视组合生克而定';
    return { ganzhi: gz, mark, note };
  });

  const usefulCount = details.filter((d) => d.mark === 'useful').length;
  const tabooCount = details.filter((d) => d.mark === 'taboo').length;

  let decision: EarthXiJiResult['decision'];
  let overall: string;
  if (unique.length > 0 && tabooCount === 0 && usefulCount >= unique.length) {
    decision = 'useful';
    overall = '宜取用土';
  } else if (unique.length > 0 && usefulCount === 0 && tabooCount >= unique.length) {
    decision = 'taboo';
    overall = '不宜取用土';
  } else {
    decision = 'neutral';
    overall = '土为调和，视具体干支而定';
  }

  const mbi = chart.monthBranchIndex;
  let monthReason = '';
  if ([9, 10, 11].includes(mbi)) {
    monthReason = `${monthQi?.monthName ?? ''}（冬月）水寒当令，土可止寒制水、治乱固本，为取用土之利季`;
  } else if ([3, 4, 5].includes(mbi)) {
    monthReason = `${monthQi?.monthName ?? ''}（夏月）火燥当令，阴土（丑戌）可晦火存金宜取；辰未见水则凶、无水次选`;
  } else if ([0, 1].includes(mbi)) {
    monthReason = `${monthQi?.monthName ?? ''}（春月）余寒未消，土可止寒固本；若阴气不显（<30%）则勿土克水`;
  } else if (mbi === 2) {
    monthReason = `${monthQi?.monthName ?? ''}（辰月）辰土晦火克水需制，不宜取用`;
  } else if ([6, 7].includes(mbi)) {
    monthReason = `${monthQi?.monthName ?? ''}（秋月）忌土旺（土旺晦火、失富）`;
  } else if (mbi === 8) {
    monthReason = `${monthQi?.monthName ?? ''}（戌月）独旺土，不宜取用`;
  }

  const reason = `【${overall}】${monthReason}。土为中宫承载制衡之气，无专属阴阳，寄旺四季，为格局基础（无土不成局）；可纳阳止阴，吉则为取富取贵的辅助工具，凶则阻碍富贵、破坏格局。当前命局阴阳气占比：阳气${yinYang.yang.toFixed(1)}%、阴气${yinYang.yin.toFixed(1)}%。${unique.length > 0 ? `命局含土干支：${unique.join('·')}。` : '命局天干地支未见土气，需借岁运引动。'}`;

  return { decision, overall, reason, details };
}
