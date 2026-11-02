// ============================================================
// 沛然堂线 · 纳音身命法（Nayin Shen-Ming Method）
// 以年柱纳音为「身」，四柱纳音为「臣」；不读取月气/用忌/五行力量等阴阳线结果。
// 规则来源：《三命通会》纳音取象与六十甲子喜忌、《兰台妙选》象格、盲派年命纳音法与纳音长生诀。
// 数据书：《沛然堂纳音身命数据书》（nayinData.ts）。
// ============================================================

import {
  type BaZiChart,
  STEMS,
  BRANCHES,
  getLiuNianList,
} from '../common/baziCalculator';
import {
  NAYIN_ENTRIES,
  NAYIN_PATTERNS,
  NAYIN_CHANG_SHENG_START,
  NAYIN_STAGES,
  NAYIN_BAD_STAGES,
  NAYIN_PERSONALITY,
  CLASSICAL_START,
  CLASSICAL_LINGUAN,
  NAYIN_PEACH_BRANCH,
  NAYIN_RANK,
  NAYIN_STRONGEST_GROUPS,
  ELEMENT_NAMES,
  SHENG,
  KE,
  getNayin,
  type ElementKey,
  type NayinEntry,
  type NayinStage,
  type NayinRankTier,
} from './nayinData';

export type NayinRelation = 'same' | 'shengYear' | 'yearSheng' | 'keYear' | 'yearKe';

export interface NayinPillar {
  position: '年' | '月' | '日' | '时';
  label: string;
  ganzhi: string;
  stem: string;
  branch: string;
  entry: NayinEntry;
  relation: NayinRelation;
  relationLabel: string;
  relationTone: 'ji' | 'xiong' | 'neutral';
  stage: NayinStage;
  stageTone: 'ji' | 'xiong' | 'neutral';
}

export interface NayinChain {
  kind: 'shengUp' | 'shengDown' | 'keDown' | 'keUp' | 'mixed' | 'same';
  label: string;
  verdict: string;
  tone: 'ji' | 'xiong' | 'neutral';
  details: string[];
}

export interface NayinPatternHit {
  name: string;
  en: string;
  condition: string;
  verdict: string;
  source: string;
}

export interface NayinDaYunRow {
  index: number;
  ganzhi: string;
  entry: NayinEntry;
  startAge: number;
  startYear: number;
  endYear: number;
  relation: NayinRelation;
  relationLabel: string;
  stage: NayinStage;
  badStage: boolean;
  fortune: 'ji' | 'xiong' | 'neutral';
  fortuneScore: number;
  fortuneReasons: string[];
  romance: boolean;
  study: boolean;
  markers: string[];
  note: string;
}

export interface NayinLiuNianRow {
  year: number;
  ganzhi: string;
  entry: NayinEntry;
  relation: NayinRelation;
  relationLabel: string;
  stage: NayinStage;
  badStage: boolean;
  fortune: 'ji' | 'xiong' | 'neutral';
  fortuneScore: number;
  fortuneReasons: string[];
  romance: boolean;
  study: boolean;
  markers: string[];
  note: string;
}

export interface NayinRootInfo {
  yearRoot: boolean;
  dayRoot: boolean;
  rooted: boolean;
  branches: string[];
  label: string;
  note: string;
}

export interface NayinRankPosition {
  rank: number;
  total: number;
  tier: NayinRankTier;
  label: string;
}

export interface NayinRankInfo {
  year: NayinRankPosition;
  day: NayinRankPosition;
  hour: NayinRankPosition;
  note: string;
}

export interface NayinHourDestiny {
  hit: boolean;
  label: string;
  note: string;
}

export interface NayinKongWang {
  branches: [string, string];
  hits: string[];
  note: string;
}

export interface PeiranAnalysis {
  lineKey: 'peiran';
  chart: BaZiChart;
  yearNayin: NayinEntry;
  dayNayin: NayinEntry;
  pillars: NayinPillar[];
  taiYuan: { ganzhi: string; entry: NayinEntry; relation: NayinRelation; relationLabel: string; note: string };
  body: {
    score: number;
    level: 'strong' | 'balanced' | 'weak';
    label: string;
    reasons: string[];
    seasonState: string;
  };
  chain: NayinChain;
  pure: { isPure: boolean; element?: ElementKey; label: string; verdict: string };
  sanHe: { branches: string; element?: ElementKey; relation: NayinRelation; label: string; verdict: string };
  xingChong: { hits: string[]; hasXingYear: boolean; danger: boolean; note: string };
  patterns: NayinPatternHit[];
  dayNature: { name: string; personality: string; keywords: string[] };
  changSheng: { startBranch: string; yearStage: NayinStage; dayStage: NayinStage; hourStage: NayinStage; currentDaYunStage: NayinStage; note: string };
  genRoot: NayinRootInfo;
  rank: NayinRankInfo;
  hourDestiny: NayinHourDestiny;
  kongWang: NayinKongWang;
  daYun: NayinDaYunRow[];
  liuNian: NayinLiuNianRow[];
  summary: {
    bodyLabel: string;
    wealth: string;
    nobility: string;
  };
}

const MONTH_BRANCH_ELEMENT: Record<string, ElementKey> = {
  寅: 'wood', 卯: 'wood', 辰: 'earth',
  巳: 'fire', 午: 'fire', 未: 'earth',
  申: 'metal', 酉: 'metal', 戌: 'earth',
  亥: 'water', 子: 'water', 丑: 'earth',
};

const RELATION_LABELS: Record<NayinRelation, string> = {
  same: '同气 · 比和',
  shengYear: '生年命 · 受生',
  yearSheng: '年命生它 · 泄气',
  keYear: '克年命 · 受克',
  yearKe: '年命克它 · 制',
};

const RELATION_TONES: Record<NayinRelation, 'ji' | 'xiong' | 'neutral'> = {
  same: 'neutral',
  shengYear: 'ji',
  yearSheng: 'xiong',
  keYear: 'xiong',
  yearKe: 'ji',
};

function relationToYear(yearEl: ElementKey, el: ElementKey): NayinRelation {
  if (yearEl === el) return 'same';
  if (SHENG[el] === yearEl) return 'shengYear';
  if (SHENG[yearEl] === el) return 'yearSheng';
  if (KE[el] === yearEl) return 'keYear';
  if (KE[yearEl] === el) return 'yearKe';
  return 'same';
}

type PairRelation = 'same' | 'shengA' | 'shengB' | 'keA' | 'keB';

function pairRelation(a: ElementKey, b: ElementKey): PairRelation {
  if (a === b) return 'same';
  if (SHENG[b] === a) return 'shengA';
  if (SHENG[a] === b) return 'shengB';
  if (KE[b] === a) return 'keA';
  if (KE[a] === b) return 'keB';
  return 'same';
}

function seasonState(monthEl: ElementKey, el: ElementKey): { state: string; score: number } {
  if (monthEl === el) return { state: '旺', score: 8 };
  if (SHENG[monthEl] === el) return { state: '相', score: 4 };
  if (SHENG[el] === monthEl) return { state: '休', score: -2 };
  if (KE[el] === monthEl) return { state: '囚', score: -4 };
  if (KE[monthEl] === el) return { state: '死', score: -6 };
  return { state: '平', score: 0 };
}

function stageFor(element: ElementKey, branch: string): NayinStage {
  const start = NAYIN_CHANG_SHENG_START[element];
  const startIdx = BRANCHES.indexOf(start);
  const idx = BRANCHES.indexOf(branch);
  if (idx < 0) return '长生';
  return NAYIN_STAGES[(idx - startIdx + 12) % 12];
}

function stageTone(element: ElementKey, stage: NayinStage): 'ji' | 'xiong' | 'neutral' {
  if (NAYIN_BAD_STAGES[element].includes(stage)) return 'xiong';
  if (['长生', '冠带', '临官', '帝旺'].includes(stage)) return 'ji';
  return 'neutral';
}

const CHONG_PAIRS = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
const HAI_PAIRS = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
const XING_PAIRS = ['寅巳申', '丑戌未', '子卯'];

function branchHit(a: string, b: string, pairs: string[]): boolean {
  return pairs.some((p) => p.includes(a) && p.includes(b) && a !== b);
}

function buildXingChong(branches: string[]): { hits: string[]; hasXingYear: boolean; dangerBranch: boolean } {
  const [year, month, day, hour] = branches;
  const hits: string[] = [];
  const others: Array<[string, string]> = [['月', month], ['日', day], ['时', hour]];
  let hasXingYear = false;
  let dangerBranch = false;
  for (const [label, b] of others) {
    if (branchHit(year, b, CHONG_PAIRS)) hits.push(`年${year}与${label}${b}相冲`);
    if (branchHit(year, b, HAI_PAIRS)) hits.push(`年${year}与${label}${b}相害`);
    if (branchHit(year, b, XING_PAIRS)) {
      hits.push(`年${year}与${label}${b}相刑`);
      hasXingYear = true;
      if (label === '日' || label === '时') dangerBranch = true;
    }
    if (year === b && ['辰', '午', '酉', '亥'].includes(year)) {
      hits.push(`年${year}与${label}${b}自刑`);
      hasXingYear = true;
      if (label === '日' || label === '时') dangerBranch = true;
    }
  }
  return { hits, hasXingYear, dangerBranch };
}

function buildSanHe(branches: string[], yearEl: ElementKey): { branches: string; element?: ElementKey; relation: NayinRelation; label: string; verdict: string } {
  const sets: Array<{ name: string; element: ElementKey; members: string[] }> = [
    { name: '申子辰', element: 'water', members: ['申', '子', '辰'] },
    { name: '亥卯未', element: 'wood', members: ['亥', '卯', '未'] },
    { name: '寅午戌', element: 'fire', members: ['寅', '午', '戌'] },
    { name: '巳酉丑', element: 'metal', members: ['巳', '酉', '丑'] },
  ];
  for (const set of sets) {
    if (set.members.every((m) => branches.includes(m))) {
      const relation = relationToYear(yearEl, set.element);
      const label = `${set.name}合${ELEMENT_NAMES[set.element]}局`;
      const verdictMap: Record<NayinRelation, string> = {
        same: '合局与年命同气，古法多主富贵',
        shengYear: '合局生年命，主进发、得助',
        yearSheng: '年命泄于合局，古法多主耗损、贫贱',
        keYear: '合局克年命，古法多主凶险、盗囚',
        yearKe: '年命制合局，劳而有成，吉凶参半',
      };
      return { branches: set.name, element: set.element, relation, label, verdict: verdictMap[relation] };
    }
  }
  return { branches: '未见三合', relation: 'same', label: '三合局未见', verdict: '地支未见完整三合局，纳音以四柱单柱气象为主' };
}

function buildChain(pillars: NayinPillar[]): NayinChain {
  const rels = [
    pairRelation(pillars[0].entry.element, pillars[1].entry.element),
    pairRelation(pillars[1].entry.element, pillars[2].entry.element),
    pairRelation(pillars[2].entry.element, pillars[3].entry.element),
  ];
  const details = rels.map((r, i) => {
    const a = pillars[i];
    const b = pillars[i + 1];
    const symbol = r === 'shengA' ? '生' : r === 'shengB' ? '生' : r === 'keA' ? '克' : r === 'keB' ? '克' : '比';
    const dir = r === 'shengA' || r === 'keA'
      ? `${b.position}${symbol}${a.position}（下→上）`
      : r === 'shengB' || r === 'keB'
        ? `${a.position}${symbol}${b.position}（上→下）`
        : `${a.position}与${b.position}同气（比和）`;
    return dir;
  });

  const counts = { same: 0, shengA: 0, shengB: 0, keA: 0, keB: 0 } as Record<PairRelation, number>;
  for (const r of rels) counts[r]++;
  const nonSame = rels.filter((r) => r !== 'same');
  const types = new Set(nonSame);

  if (types.size === 0) {
    return {
      kind: 'same',
      label: '四柱纳音同气',
      verdict: '四柱纳音同属一行，气象纯一；纯而不杂，贵在得令与有制。',
      tone: 'neutral',
      details,
    };
  }

  // 出现两种以上非“比和”方向，才是真正的生克交错
  if (types.size > 1) {
    return {
      kind: 'mixed',
      label: '生克交错',
      verdict: `三组关系为：${details.join('；')}。年命为身，既有生又有克，方向不纯，需按具体柱位分别看。`,
      tone: 'neutral',
      details,
    };
  }

  const type = nonSame[0];
  const count = counts[type];
  const sameCount = counts.same;
  const strength = count === 3 ? '三层' : count === 2 ? '两层' : '一层';
  const qualifier = count === 3 ? '' : '偏';
  const tail = sameCount > 0 ? `，其余 ${sameCount} 组比和` : '';

  const map: Record<Exclude<PairRelation, 'same'>, { kind: NayinChain['kind']; exact: string; partial: string; verdict: string; tone: 'ji' | 'xiong' | 'neutral' }> = {
    shengA: {
      kind: 'shengUp',
      exact: '下生上 · 层层生身',
      partial: '偏下生上 · 得助',
      verdict: `三组中${strength}下生上${tail}，年命得生，主进发、得助。`,
      tone: count >= 2 ? 'ji' : 'neutral',
    },
    shengB: {
      kind: 'shengDown',
      exact: '上生下 · 层层泄气',
      partial: '偏上生下 · 泄气',
      verdict: `三组中${strength}上生下${tail}，年命被泄，主耗损、奔波。`,
      tone: count >= 2 ? 'xiong' : 'neutral',
    },
    keB: {
      kind: 'keDown',
      exact: '上克下 · 尊制卑',
      partial: '偏上克下 · 顺制',
      verdict: `三组中${strength}上克下${tail}，尊制卑、君制臣，为顺。`,
      tone: count >= 2 ? 'ji' : 'neutral',
    },
    keA: {
      kind: 'keUp',
      exact: '下克上 · 以下犯上',
      partial: '偏下克上 · 逆',
      verdict: `三组中${strength}下克上${tail}，以下犯上，主起伏、压力。`,
      tone: count >= 2 ? 'xiong' : 'neutral',
    },
  };
  const m = map[type];
  return {
    kind: m.kind,
    label: count === 3 ? m.exact : m.partial,
    verdict: m.verdict,
    tone: m.tone,
    details,
  };
}

function buildPatterns(pillars: NayinPillar[]): NayinPatternHit[] {
  const ctx = {
    names: pillars.map((p) => p.entry.name),
    elements: pillars.map((p) => p.entry.element),
    branches: pillars.map((p) => p.branch),
    ganzhi: pillars.map((p) => p.ganzhi),
  };
  return NAYIN_PATTERNS.filter((p) => p.test(ctx)).map((p) => ({
    name: p.name,
    en: p.en,
    condition: p.condition,
    verdict: p.verdict,
    source: p.source,
  }));
}

// 见根：年/日纳音五行在月支或时支得长生、临官、帝旺，才视为根气可兑现。
const ROOT_STAGES: NayinStage[] = ['长生', '临官', '帝旺'];

function buildGenRoot(yearNayin: NayinEntry, dayNayin: NayinEntry, monthBranch: string, hourBranch: string): NayinRootInfo {
  const yearHits = [
    { branch: monthBranch, stage: stageFor(yearNayin.element, monthBranch) },
    { branch: hourBranch, stage: stageFor(yearNayin.element, hourBranch) },
  ].filter((x) => ROOT_STAGES.includes(x.stage));
  const dayHits = [
    { branch: monthBranch, stage: stageFor(dayNayin.element, monthBranch) },
    { branch: hourBranch, stage: stageFor(dayNayin.element, hourBranch) },
  ].filter((x) => ROOT_STAGES.includes(x.stage));
  const yearRoot = yearHits.length > 0;
  const dayRoot = dayHits.length > 0;
  const rooted = yearRoot || dayRoot;
  const branches = Array.from(new Set([...yearHits, ...dayHits].map((x) => x.branch)));
  const describe = (hits: typeof yearHits) => hits.map((x) => `${x.branch}支${x.stage}`).join('、');
  let note: string;
  if (yearRoot && dayRoot) {
    note = `年命纳音在${describe(yearHits)}得根，日柱纳音在${describe(dayHits)}得根，根气双见。`;
  } else if (yearRoot) {
    note = `年命纳音在${describe(yearHits)}得根，日柱纳音在月、时支未见长生、临官、帝旺。`;
  } else if (dayRoot) {
    note = `日柱纳音在${describe(dayHits)}得根，年命纳音在月、时支未见长生、临官、帝旺。`;
  } else {
    note = '年命与日柱纳音在月、时支均未见长生、临官、帝旺，根气不显。';
  }
  return { yearRoot, dayRoot, rooted, branches, label: rooted ? '有根' : '无根', note };
}

// 同五行位次：只作平台/量级弱信号。
function rankPosition(entry: NayinEntry): NayinRankPosition {
  const r: { rank: number; total: number; tier: NayinRankTier } = NAYIN_RANK[entry.name] ?? { rank: 3, total: 6, tier: 'mid' };
  return { ...r, label: `${ELEMENT_NAMES[entry.element]}行第 ${r.rank} 位` };
}

function buildRank(yearNayin: NayinEntry, dayNayin: NayinEntry, hourNayin: NayinEntry): NayinRankInfo {
  return {
    year: rankPosition(yearNayin),
    day: rankPosition(dayNayin),
    hour: rankPosition(hourNayin),
    note: '位次只表示同五行纳音中的气象强弱，作平台与量级的旁证，不作吉凶硬断。',
  };
}

// 时柱归宿：时柱为本行最强两组，主晚发、晚年见转机。
function buildHourDestiny(hourEntry: NayinEntry, hourGanzhi: string): NayinHourDestiny {
  const hit = NAYIN_STRONGEST_GROUPS[hourEntry.element].includes(hourGanzhi);
  return {
    hit,
    label: hit ? '时柱归宿 · 晚发' : '时柱平位',
    note: hit
      ? `时柱${hourGanzhi}${hourEntry.name}为本行最强两组之一，主晚发、晚年见转机。`
      : `时柱${hourGanzhi}${hourEntry.name}不在本行最强两组，晚发之象不显。`,
  };
}

// 六甲空亡：以日柱所在旬取空亡二支；只作虚/未定提示，不参与吉凶计分。
function buildKongWang(dayStem: string, dayBranch: string, branches: string[]): NayinKongWang {
  const stemIdx = STEMS.indexOf(dayStem);
  const branchIdx = BRANCHES.indexOf(dayBranch);
  const xunBranchIdx = (((branchIdx - stemIdx) % 12) + 12) % 12;
  const kong: [string, string] = [BRANCHES[(xunBranchIdx + 10) % 12], BRANCHES[(xunBranchIdx + 11) % 12]];
  const labels = ['年', '月', '日', '时'];
  const hits = branches.flatMap((b, i) => (kong.includes(b) ? [`${labels[i]}支${b}`] : []));
  return {
    branches: kong,
    hits,
    note: hits.length
      ? `${hits.join('、')}落空亡，主虚、未定，只作提示。`
      : '四柱地支未落空亡。',
  };
}

// 大运 / 流年纳音吉凶评分（v1.1）
// 不再用单一信号一票否决：年命关系与日柱纳音十二运分别计分，再按总分归档。
const RELATION_SCORE: Record<NayinRelation, number> = {
  shengYear: 2,   // 大运/流年生年命：受生
  yearKe: 1,      // 年命克大运/流年：制，劳而有成
  same: 0,        // 同气：比和/争命
  yearSheng: -1.5,// 年命生大运/流年：泄气
  keYear: -2,     // 大运/流年克年命：受克
};

interface FortuneEvaluation {
  fortune: 'ji' | 'xiong' | 'neutral';
  score: number;
  reasons: string[];
}

function evaluateFortune(relation: NayinRelation, dayElement: ElementKey, stage: NayinStage): FortuneEvaluation {
  const reasons: string[] = [];
  const relationScore = RELATION_SCORE[relation];
  reasons.push(`${RELATION_LABELS[relation]} ${relationScore >= 0 ? '+' : ''}${relationScore}`);

  let stageScore = 0;
  const badStage = NAYIN_BAD_STAGES[dayElement].includes(stage);
  if (badStage) {
    stageScore = -2;
    reasons.push(`日柱纳音行${stage}（盲派忌字） -2`);
  } else if (['长生', '冠带', '帝旺'].includes(stage)) {
    stageScore = 1.5;
    reasons.push(`日柱纳音行${stage} +1.5`);
  } else if (stage === '临官') {
    stageScore = 1;
    reasons.push('日柱纳音行临官 +1');
  } else if (['死', '墓', '绝'].includes(stage)) {
    stageScore = -1;
    reasons.push(`日柱纳音行${stage} -1`);
  } else {
    reasons.push(`日柱纳音行${stage} 0`);
  }

  const score = relationScore + stageScore;
  const fortune: FortuneEvaluation['fortune'] = score >= 1.5 ? 'ji' : score <= -1.5 ? 'xiong' : 'neutral';
  reasons.push(`合计 ${score >= 0 ? '+' : ''}${score.toFixed(1)} → ${fortune === 'ji' ? '吉' : fortune === 'xiong' ? '凶' : '平'}`);
  return { fortune, score, reasons };
}

// 大运/流年小标志：情感活跃、求学/文气
function buildMarkers(yearEl: ElementKey, dayEl: ElementKey, entry: NayinEntry, branch: string, stage: NayinStage): { romance: boolean; study: boolean; markers: string[] } {
  const markers: string[] = [];
  const peach = [...NAYIN_PEACH_BRANCH[yearEl], ...NAYIN_PEACH_BRANCH[dayEl]];
  if (peach.includes(branch)) markers.push('桃花');
  if (stage === '沐浴') markers.push('沐浴·情动');
  const school = [CLASSICAL_START[yearEl], CLASSICAL_START[dayEl]];
  const ciGuan = [CLASSICAL_LINGUAN[yearEl], CLASSICAL_LINGUAN[dayEl]];
  if (school.includes(branch)) markers.push('学堂');
  if (ciGuan.includes(branch)) markers.push('词馆');
  if ((entry.element === 'wood' || entry.element === 'water') && ['长生', '冠带', '临官', '帝旺'].includes(stage)) {
    markers.push('文气得令');
  }
  const romance = markers.includes('桃花') || markers.includes('沐浴·情动');
  const study = markers.includes('学堂') || markers.includes('词馆') || markers.includes('文气得令');
  return { romance, study, markers };
}

export function buildPeiranAnalysis(chart: BaZiChart, currentYear: number): PeiranAnalysis {
  const rawPillars = [
    { position: '年' as const, label: '本命 / 祖上', p: chart.year },
    { position: '月' as const, label: '父母 / 少年', p: chart.month },
    { position: '日' as const, label: '自身 / 配偶', p: chart.day },
    { position: '时' as const, label: '子女 / 晚年', p: chart.hour },
  ];
  const yearNayin = getNayin(chart.year.stem + chart.year.branch);
  const dayNayin = getNayin(chart.day.stem + chart.day.branch);
  const monthEl = MONTH_BRANCH_ELEMENT[chart.month.branch] ?? 'earth';

  const pillars: NayinPillar[] = rawPillars.map(({ position, label, p }) => {
    const ganzhi = p.stem + p.branch;
    const entry = getNayin(ganzhi);
    const relation = relationToYear(yearNayin.element, entry.element);
    const stage = stageFor(dayNayin.element, p.branch);
    return {
      position,
      label,
      ganzhi,
      stem: p.stem,
      branch: p.branch,
      entry,
      relation,
      relationLabel: RELATION_LABELS[relation],
      relationTone: RELATION_TONES[relation],
      stage,
      stageTone: stageTone(dayNayin.element, stage),
    };
  });

  // 胎元：月干进一位，月支进三位
  const monthStemIdx = STEMS.indexOf(chart.month.stem);
  const monthBranchIdx = BRANCHES.indexOf(chart.month.branch);
  const taiYuanGanzhi = `${STEMS[(monthStemIdx + 1) % 10]}${BRANCHES[(monthBranchIdx + 3) % 12]}`;
  const taiYuanEntry = getNayin(taiYuanGanzhi);
  const taiYuanRelation = relationToYear(yearNayin.element, taiYuanEntry.element);

  // 身强弱：年命受生/受克/泄/制 + 月令旺衰
  let bodyScore = 50;
  const reasons: string[] = [];
  for (const p of pillars.slice(1)) {
    if (p.relation === 'shengYear') { bodyScore += 12; reasons.push(`${p.position}柱纳音${p.entry.name}生年命，受生 +12`); }
    else if (p.relation === 'keYear') { bodyScore -= 14; reasons.push(`${p.position}柱纳音${p.entry.name}克年命，受克 -14`); }
    else if (p.relation === 'yearSheng') { bodyScore -= 7; reasons.push(`年命生${p.position}柱纳音，泄气 -7`); }
    else if (p.relation === 'yearKe') { bodyScore += 7; reasons.push(`年命克${p.position}柱纳音，制 +7`); }
    else { bodyScore -= 1; reasons.push(`${p.position}柱与年命同气，比和 -1`); }
  }
  if (taiYuanRelation === 'shengYear') { bodyScore += 5; reasons.push('胎元纳音生年命，+5'); }
  else if (taiYuanRelation === 'keYear') { bodyScore -= 7; reasons.push('胎元纳音克年命，-7'); }
  const season = seasonState(monthEl, yearNayin.element);
  bodyScore += season.score;
  reasons.push(`年命纳音${ELEMENT_NAMES[yearNayin.element]}在${chart.month.branch}月为「${season.state}」，${season.score >= 0 ? '+' : ''}${season.score}`);
  bodyScore = Math.max(0, Math.min(100, bodyScore));
  const bodyLevel: 'strong' | 'balanced' | 'weak' = bodyScore >= 62 ? 'strong' : bodyScore <= 38 ? 'weak' : 'balanced';
  const bodyLabel = bodyLevel === 'strong' ? '身强 · 年命得养' : bodyLevel === 'weak' ? '身弱 · 年命受制' : '中和 · 年命平稳';

  const chain = buildChain(pillars);

  // 纯旺 / 杂气
  const uniqueEls = Array.from(new Set(pillars.map((p) => p.entry.element)));
  const isPure = uniqueEls.length === 1;
  const pureElement = isPure ? uniqueEls[0] : undefined;
  let pureLabel = '多行并见';
  let pureVerdict = '四柱纳音多行并见，气象丰富，以主柱为核心。';
  if (isPure && pureElement) {
    const st = seasonState(monthEl, pureElement);
    if (st.state === '旺' || st.state === '相') {
      pureLabel = '一行独盛';
      pureVerdict = '四柱纳音同属一行又当令，气势专一而盛，喜有制化。';
    } else {
      pureLabel = '一气偏弱';
      pureVerdict = '四柱纳音同属一行但不当令，气势专一而偏弱，喜得生扶。';
    }
  }

  const branchArr = pillars.map((p) => p.branch);
  const sanHe = buildSanHe(branchArr, yearNayin.element);
  const xing = buildXingChong(branchArr);

  // 年命被日/时纳音克 + 年支刑 → 古法夭象
  const yearKeByDayOrHour = pillars.slice(2).some((p) => p.relation === 'keYear');
  const danger = yearKeByDayOrHour && xing.dangerBranch;

  const patterns = buildPatterns(pillars);

  const genRoot = buildGenRoot(yearNayin, dayNayin, chart.month.branch, chart.hour.branch);
  const rank = buildRank(yearNayin, dayNayin, pillars[3].entry);
  const hourDestiny = buildHourDestiny(pillars[3].entry, pillars[3].ganzhi);
  const kongWang = buildKongWang(chart.day.stem, chart.day.branch, branchArr);

  const dayStage = stageFor(dayNayin.element, chart.day.branch);
  const yearStage = stageFor(dayNayin.element, chart.year.branch);
  const hourStage = stageFor(dayNayin.element, chart.hour.branch);

  const currentDY = chart.daYun.find((d) => currentYear >= d.startYear && currentYear <= d.endYear)
    ?? chart.daYun[chart.daYun.length - 1]
    ?? chart.daYun[0];
  const currentDaYunStage = currentDY ? stageFor(dayNayin.element, currentDY.branch) : '长生';

  const daYun: NayinDaYunRow[] = chart.daYun.map((d) => {
    const ganzhi = d.stem + d.branch;
    const entry = getNayin(ganzhi);
    const relation = relationToYear(yearNayin.element, entry.element);
    const stage = stageFor(dayNayin.element, d.branch);
    const badStage = NAYIN_BAD_STAGES[dayNayin.element].includes(stage);
    const evaluation = evaluateFortune(relation, dayNayin.element, stage);
    const mk = buildMarkers(yearNayin.element, dayNayin.element, entry, d.branch, stage);
    return {
      index: d.index,
      ganzhi,
      entry,
      startAge: d.startAge,
      startYear: d.startYear,
      endYear: d.endYear,
      relation,
      relationLabel: RELATION_LABELS[relation],
      stage,
      badStage,
      fortune: evaluation.fortune,
      fortuneScore: evaluation.score,
      fortuneReasons: evaluation.reasons,
      romance: mk.romance,
      study: mk.study,
      markers: mk.markers,
      note: `${entry.name}${RELATION_LABELS[relation]}；${stage}${badStage ? '，十二运忌字' : ''}`,
    };
  });

  const liuNian: NayinLiuNianRow[] = getLiuNianList(currentYear, 10).map((ln) => {
    const ganzhi = ln.stem + ln.branch;
    const entry = getNayin(ganzhi);
    const relation = relationToYear(yearNayin.element, entry.element);
    const stage = stageFor(dayNayin.element, ln.branch);
    const badStage = NAYIN_BAD_STAGES[dayNayin.element].includes(stage);
    const evaluation = evaluateFortune(relation, dayNayin.element, stage);
    const mk = buildMarkers(yearNayin.element, dayNayin.element, entry, ln.branch, stage);
    return {
      year: ln.year,
      ganzhi,
      entry,
      relation,
      relationLabel: RELATION_LABELS[relation],
      stage,
      badStage,
      fortune: evaluation.fortune,
      fortuneScore: evaluation.score,
      fortuneReasons: evaluation.reasons,
      romance: mk.romance,
      study: mk.study,
      markers: mk.markers,
      note: `${entry.name}${RELATION_LABELS[relation]}；${stage}${badStage ? '，十二运忌字' : ''}`,
    };
  });

  const wealthMap: Record<NayinChain['kind'], string> = {
    shengUp: '下生上，年命得养，主先贫后富、富贵进发',
    shengDown: '上生下，年命泄气，主奔波耗损、财来财去',
    keDown: '上克下，尊制卑，主顺遂得财、富贵',
    keUp: '下克上，以下犯上，主起伏破败、财运动荡',
    mixed: '生克交错，财势随大运起伏',
    same: '四柱同气，财势纯一，贵在得令与制化',
  };
  const nobilityMap: Record<NayinChain['kind'], string> = {
    shengUp: '下生上，主进发、贵气渐成',
    shengDown: '上生下，贵气被泄，主名大于实',
    keDown: '上克下，主尊制卑、官贵有威',
    keUp: '下克上，主犯上、贵气受损',
    mixed: '贵气随大运起伏',
    same: '同气纯一，贵在专旺与得用',
  };

  return {
    lineKey: 'peiran',
    chart,
    yearNayin,
    dayNayin,
    pillars,
    taiYuan: {
      ganzhi: taiYuanGanzhi,
      entry: taiYuanEntry,
      relation: taiYuanRelation,
      relationLabel: RELATION_LABELS[taiYuanRelation],
      note: taiYuanRelation === 'keYear'
        ? '胎元纳音克年命，古法主父母不全、长辈缘薄。'
        : taiYuanRelation === 'shengYear'
          ? '胎元纳音生年命，古法主长辈有助、根基得养。'
          : '胎元纳音与年命同气或互制，古法以平论。',
    },
    body: {
      score: bodyScore,
      level: bodyLevel,
      label: bodyLabel,
      reasons,
      seasonState: season.state,
    },
    chain,
    pure: { isPure, element: pureElement, label: pureLabel, verdict: pureVerdict },
    sanHe,
    xingChong: {
      hits: xing.hits,
      hasXingYear: xing.hasXingYear,
      danger,
      note: xing.hits.length > 0 ? xing.hits.join('；') : '年支未见明显刑冲害。',
    },
    patterns,
    dayNature: {
      name: dayNayin.name,
      personality: NAYIN_PERSONALITY[dayNayin.name] ?? dayNayin.personality ?? dayNayin.image,
      keywords: [ELEMENT_NAMES[dayNayin.element], dayStage, dayNayin.name],
    },
    changSheng: {
      startBranch: NAYIN_CHANG_SHENG_START[dayNayin.element],
      yearStage,
      dayStage,
      hourStage,
      currentDaYunStage,
      note: `以日柱纳音${dayNayin.name}起长生：${ELEMENT_NAMES[dayNayin.element]}长生在${NAYIN_CHANG_SHENG_START[dayNayin.element]}，顺排十二运。`,
    },
    genRoot,
    rank,
    hourDestiny,
    kongWang,
    daYun,
    liuNian,
    summary: {
      bodyLabel,
      wealth: wealthMap[chain.kind],
      nobility: nobilityMap[chain.kind],
    },
  };
}

export { NAYIN_ENTRIES };
