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
  PEACH_BRANCHES,
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
    { label: '财富分', value: `${wealthNobility ? wealthNobility.wealthScore : '—'} 分（${wealthNobility ? wealthNobility.wealthLevel : '—'}）` },
    { label: '贵寿分', value: `${wealthNobility ? wealthNobility.nobilityScore : '—'} 分（${wealthNobility ? wealthNobility.nobilityLevel : '—'}）` },
    { label: '富载体(阳干)', value: yangCarrier.length > 0 ? yangCarrier.join('·') : '未透' },
    { label: '贵载体(阴干)', value: yinCarrier.length > 0 ? yinCarrier.join('·') : '未透' },
    { label: '财星(妻星/资源)', value: caiShenPresent ? (caiGan.length > 0 ? `天干 ${caiGan.join('·')}` : '藏于地支') : '不显' },
    { label: '官杀(管控/地位)', value: guanShenPresent ? (guanGan.length > 0 ? `天干 ${guanGan.join('·')}` : '藏于地支') : '不显' },
    { label: '资源宫位', value: `${caiOuter ? '财星在他宫(年月)' : ''}${caiOuter && guanOuter ? '、' : ''}${guanOuter ? '官星在他宫(年月)' : (caiShenPresent || guanShenPresent ? '财官多在我宫(日时)' : '—')}` },
  ];

  // 数据书判定
  const refs: string[] = [];
  const richLevel = wealthNobility ? wealthNobility.wealthScore : 50;
  const nobleLevel = wealthNobility ? wealthNobility.nobilityScore : 50;
  let result = '';
  const richDesc = richLevel >= 70 ? '财气较旺' : richLevel >= 45 ? '财运平常' : '财气偏薄';
  const nobleDesc = nobleLevel >= 70 ? '贵气较旺' : nobleLevel >= 45 ? '贵气平常' : '贵气偏薄';

  if (yangPower >= 28 || (yangCarrier.length > 0 && richLevel >= 60)) {
    result += `富象主：阳气(木火)${yangPower.toFixed(1)}%，木火为富源，${caiShenPresent ? '且财星（妻星/资源）有现' : '财星不显'}——${richDesc}。${WEALTH_RULES.rich}`;
    refs.push(WEALTH_RULES.rich);
  } else {
    result += `富象不显：阳气(木火)仅${yangPower.toFixed(1)}%，木火为富源却偏弱，求财需借岁运补足——${richDesc}。`;
  }
  if (yinPower >= 28 || (yinCarrier.length > 0 && nobleLevel >= 60)) {
    result += `贵象主：阴气(金水)${yinPower.toFixed(1)}%，金水为贵源，${guanShenPresent ? '且官杀（管控/地位）有现' : '官杀不显'}——${nobleDesc}。${WEALTH_RULES.noble}`;
    refs.push(WEALTH_RULES.noble);
  } else {
    result += `贵象不显：阴气(金水)仅${yinPower.toFixed(1)}%，金水为贵源却偏弱，贵气多凭个人修为积累——${nobleDesc}。`;
  }
  // 宫位关联
  if (caiShenPresent || guanShenPresent) {
    result += ` ${WEALTH_RULES.palace}${caiOuter || guanOuter ? `本局财官多居他宫（年月），需「${WEALTH_RULES.outerGain.slice(18, 40)}」与日主关联方可落袋为用。` : `本局财官多居我宫（日时），为日主自身所得资源。`}`;
    refs.push(WEALTH_RULES.palace);
  }
  if (richLevel >= 70 && nobleLevel >= 70) {
    result += ' 富贵双全之象，然需以格局阴阳平衡为最终归依。';
  }

  const matched = caiShenPresent || guanShenPresent || yangCarrier.length > 0 || yinCarrier.length > 0;
  return {
    inputs,
    matched,
    result,
    reference: refs.length > 0 ? refs : [WEALTH_RULES.gainRule],
    disclaimer: matched ? undefined : NOT_MATCHED_DISCLAIMER,
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

  const inputs = [
    { label: '性别', value: isMale ? '男命' : '女命' },
    { label: '异性星', value: `${oppositeName}（${ELEMENT_CN[oppositeEl]}）` },
    { label: '异性星透干', value: spouseStarInStem ? '有' : '无' },
    { label: '异性星入夫妻宫', value: spouseInPalace ? '是（正缘）' : '否' },
    { label: '桃花(子午卯酉)', value: peach.length > 0 ? peach.join('·') : '无' },
    { label: '辰戌相见', value: hasChenXu ? '有（人事波折）' : '无' },
  ];

  let result = ROMANCE_RULES.core;
  const refs: string[] = [ROMANCE_RULES.core];
  const love = spouseStarInStem || peach.length > 0 || palaceTriggered;
  let marriage = spouseInPalace;

  if (spouseStarInStem) {
    result += ` ${oppositeName}透于天干，异性缘基础显现；天干仅为异性缘基础，地支为情缘实质。`;
    refs.push(ROMANCE_RULES.zhengYuan);
  }
  if (spouseInPalace) {
    result += ` ${oppositeName}入夫妻宫（日支${dayBranch}），为正缘之象（${ROMANCE_RULES.zhengYuan.slice(9)}）。`;
    marriage = true;
    refs.push(ROMANCE_RULES.zhengYuan);
  } else if (palaceTriggered) {
    result += ` 夫妻宫（日支${dayBranch}）被其他地支合冲引动，婚姻宫有应期，逢岁运合冲时感情之事易显。`;
  }
  if (peach.length > 0) {
    result += ` 命带桃花（${peach.join('·')}），异性缘旺、魅力外显；官星不入夫妻宫而与食伤交融者，易生外情桃花（${ROMANCE_RULES.taoHua.slice(0, 28)}）。`;
    refs.push(ROMANCE_RULES.taoHua);
  }
  if (hasChenXu) {
    result += ` 辰戌相见，必引动婚姻、六亲、人事波动（${ROMANCE_RULES.chenXu.slice(6, 44)}）。`;
    refs.push(ROMANCE_RULES.chenXu);
  }

  const matched = spouseStarInStem || spouseInPalace || peach.length > 0 || hasChenXu;
  return {
    inputs,
    matched,
    love,
    marriage,
    result,
    reference: refs,
    disclaimer: matched ? undefined : NOT_MATCHED_DISCLAIMER,
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

  const refs: string[] = [];
  let result = '';
  const balanceShort = EDUCATION_RULES.balance.slice(0, 26);
  const yinShort = EDUCATION_RULES.yin.slice(9, 30);
  if (yinStar > 0 && caiStar > 0) {
    result += `财印双现（印${yinStar}位、财${caiStar}位），学业核心太极「财印平衡」成立；${yinIsUseful ? '印星得用，学识根基扎实，学有所成。' : `印星未得核心用神之力，学识转化成果需借岁运引动（${balanceShort}）。`}`;
    refs.push(EDUCATION_RULES.balance);
    refs.push(EDUCATION_RULES.yin);
    refs.push(EDUCATION_RULES.cai);
  } else if (yinStar > 0) {
    result += `印星为根（${yinStar}位），学识根基厚实；但财星未现，缺乏「成果载体」，${yinIsUseful ? `得用则学业平顺（${yinShort}）。` : '印未得用则知识偏满而难落地，需岁运财星引动。'}`;
    refs.push(EDUCATION_RULES.yin);
    if (shiShang > 0) { result += ` 食伤${shiShang}位，输出发挥尚可；${EDUCATION_RULES.shiShang.slice(8, 30)}。`; refs.push(EDUCATION_RULES.shiShang); }
  } else if (caiStar > 0) {
    result += `财星为成果载体（${caiStar}位），然印星未现，知识根基偏薄；${EDUCATION_RULES.cai.slice(9, 34)}。`;
    refs.push(EDUCATION_RULES.cai);
  } else {
    result += `印星、财星均未透出，学业核心太极不显；`;
  }
  if (guanSha > 0) {
    result += ` 官杀${guanSha}位，${EDUCATION_RULES.guanSha.slice(8, 30)}。`;
    refs.push(EDUCATION_RULES.guanSha);
  }
  if (biJie > 0) {
    result += ` 比劫${biJie}位，${EDUCATION_RULES.biJie.slice(8, 30)}。`;
    refs.push(EDUCATION_RULES.biJie);
  }
  result += ` 文理倾向：${subject}（${EDUCATION_RULES.liKe2.slice(0, 24)}）。`;
  refs.push(subject.includes('理科') ? EDUCATION_RULES.liKe2 : EDUCATION_RULES.liKe);

  const matched = yinStar > 0 || caiStar > 0;
  return {
    inputs,
    matched,
    result,
    reference: refs.length > 0 ? refs : [EDUCATION_RULES.balance],
    disclaimer: matched ? undefined : NOT_MATCHED_DISCLAIMER,
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
