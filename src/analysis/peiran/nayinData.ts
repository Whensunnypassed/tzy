// ============================================================
// 沛然堂线 · 《沛然堂纳音身命数据书》 v1.0
// 六十甲子纳音、取象、喜忌、性情、盲派纳音长生、兰台妙选象格。
// 本数据书只服务沛然堂线，不引用阴阳线的月气/用忌引擎。
// 命名：沛然堂纳音身命数据书（Peiran Nayin Codex）
// ============================================================

export type ElementKey = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export const ELEMENT_NAMES: Record<ElementKey, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
};

export const ELEMENT_COLORS: Record<ElementKey, string> = {
  wood: '#4A834E',
  fire: '#DC4824',
  earth: '#B98C31',
  metal: '#788491',
  water: '#31669B',
};

// 五行相生 / 相克
export const SHENG: Record<ElementKey, ElementKey> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};
export const KE: Record<ElementKey, ElementKey> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
};

export interface NayinEntry {
  name: string;
  element: ElementKey;
  yinYang: 'yang' | 'yin';
  ganzhi: [string, string];
  /** 三命通会·论纳音取象（节选） */
  image: string;
  /** 喜 */
  likes: string;
  /** 忌 */
  dislikes: string;
  /** 日柱纳音性情取象（缺省时回落到 image） */
  personality?: string;
}

const RAW: Array<Omit<NayinEntry, 'yinYang'> & { yangFirst: boolean }> = [
  // 金
  { name: '海中金', element: 'metal', ganzhi: ['甲子', '乙丑'], yangFirst: true,
    image: '气在包藏，有名无形，如珠在渊海，犹人在母腹',
    likes: '喜金木旺地；甲子见癸亥为珠藏渊海，见己未为蚌珠照月',
    dislikes: '忌丁卯、丁酉、戊午之火；火多则金伤',
    personality: '深沉难测，城府较深，心里装事' },
  { name: '金箔金', element: 'metal', ganzhi: ['壬寅', '癸卯'], yangFirst: true,
    image: '绝地存金，气尚柔弱，薄若缯缟，非木无所依',
    likes: '喜平地木为依托；喜井泉、涧下、天河水清',
    dislikes: '不宜见火，有火主夭；最忌炉火就位相克' },
  { name: '白蜡金', element: 'metal', ganzhi: ['庚辰', '辛巳'], yangFirst: true,
    image: '昆山片玉，洛浦遗金，形明体洁，乃金之正色',
    likes: '喜炉中火炼，须水济；辛巳见火多以贵论；喜山下火、井泉、大溪',
    dislikes: '忌火过无水；庚辰见炉火无水济主贫夭' },
  { name: '沙中金', element: 'metal', ganzhi: ['甲午', '乙未'], yangFirst: true,
    image: '气已成，质坚实，混于沙而别于沙，居于火而炼于火',
    likes: '喜火炼、水淘；喜金木旺地',
    dislikes: '忌土重埋金、火过伤金' },
  { name: '剑锋金', element: 'metal', ganzhi: ['壬申', '癸酉'], yangFirst: true,
    image: '白帝司权，刚由百炼，红光射于斗牛，白刃凝于霜雪',
    likes: '喜大溪、海水、井泉、涧下；秋生更吉；日时见长流壬辰为宝剑化青龙',
    dislikes: '最忌炉中火煅；见火则自伤' },
  { name: '钗钏金', element: 'metal', ganzhi: ['庚戌', '辛亥'], yangFirst: true,
    image: '金气藏伏，形体已残，锻炼首饰，藏之闺阁，无所施为',
    likes: '喜微火及木；喜木火及土，可成器物',
    dislikes: '忌强火重炼；火旺则形体受损' },

  // 木
  { name: '桑柘木', element: 'wood', ganzhi: ['壬子', '癸丑'], yangFirst: true,
    image: '气居盘屈，形状未伸，居于水地，蚕衰之月受气',
    likes: '喜金水及秋；喜见杨柳木成桑柳成林',
    dislikes: '忌水多漂荡、金重砍伐' },
  { name: '松柏木', element: 'wood', ganzhi: ['庚寅', '辛卯'], yangFirst: true,
    image: '气已乘阳，得栽培之势，居金下而岁寒后凋',
    likes: '喜秋冬；喜水土栽培',
    dislikes: '忌金重克木、破禄' },
  { name: '大林木', element: 'wood', ganzhi: ['戊辰', '己巳'], yangFirst: true,
    image: '气不成量，物已及时，枝叶茂盛，郁然成林',
    likes: '喜水滋养；喜见平地木、松柏木成林',
    dislikes: '忌金多砍伐、火炎焚林' },
  { name: '杨柳木', element: 'wood', ganzhi: ['壬午', '癸未'], yangFirst: true,
    image: '木至午而死，至未而墓，盛夏叶凋，枝干微弱，取其性柔',
    likes: '喜春夏、水滋润',
    dislikes: '忌金重、火炎；秋深则凋零' },
  { name: '石榴木', element: 'wood', ganzhi: ['庚申', '辛酉'], yangFirst: true,
    image: '五行属金而纳音属木，木居金地，其味成辛；他木至午而死，此木至午而旺',
    likes: '喜夏，不宜秋冬；喜火土',
    dislikes: '忌金多、水寒' },
  { name: '平地木', element: 'wood', ganzhi: ['戊戌', '己亥'], yangFirst: true,
    image: '气归藏伏，阴阳闭塞，木气归根，伏乎土中',
    likes: '喜水及春夏；喜土栽培',
    dislikes: '忌金克、土重埋根' },

  // 水
  { name: '涧下水', element: 'water', ganzhi: ['丙子', '丁丑'], yangFirst: true,
    image: '气未通济，高段非水流之所，卑湿乃水就之乡，由地中行',
    likes: '喜金及夏；喜木及土',
    dislikes: '忌土塞、火煎' },
  { name: '大溪水', element: 'water', ganzhi: ['甲寅', '乙卯'], yangFirst: true,
    image: '气出阳明，水势恃源，东流滔注，其势浸大',
    likes: '喜春夏、火；喜金生水',
    dislikes: '忌土克、金多水浊' },
  { name: '长流水', element: 'water', ganzhi: ['壬辰', '癸巳'], yangFirst: true,
    image: '势极东南，气傍离宫，火明势盛，水得归库，盈科后进',
    likes: '喜金及木；喜见大海水归源',
    dislikes: '忌土塞、火熬' },
  { name: '天河水', element: 'water', ganzhi: ['丙午', '丁未'], yangFirst: true,
    image: '气当升降，在高明火位，有水沛然作霖，以济火中之水',
    likes: '喜夜及秋，水旺；喜金水相生',
    dislikes: '忌火土亢旱、昼见' },
  { name: '井泉水', element: 'water', ganzhi: ['甲申', '乙酉'], yangFirst: true,
    image: '气息安静，子母同位，出而不穷，汲而不竭',
    likes: '喜春及夏；喜金生水',
    dislikes: '忌土填、火蒸' },
  { name: '大海水', element: 'water', ganzhi: ['壬戌', '癸亥'], yangFirst: true,
    image: '天门之地，气归闭塞，水历遍而不趋，势归宁谧，纳之不溢',
    likes: '喜春夏及木；喜金水相生',
    dislikes: '忌霹雳火、土重' },

  // 火
  { name: '霹雳火', element: 'fire', ganzhi: ['戊子', '己丑'], yangFirst: true,
    image: '气在一阳，形居水位，水中之火，非神龙则无',
    likes: '喜水及春夏，得土而神天',
    dislikes: '忌火多、水过；戊午火忌见戊子、己丑、甲寅、乙卯' },
  { name: '炉中火', element: 'fire', ganzhi: ['丙寅', '丁卯'], yangFirst: true,
    image: '气渐发辉，因薪而显，阴阳为治，天地为炉',
    likes: '丙寅喜水制，独爱甲寅之水；丁卯喜木生',
    dislikes: '忌火木过旺；水不可过' },
  { name: '覆灯火', element: 'fire', ganzhi: ['甲辰', '乙巳'], yangFirst: true,
    image: '气形盛地，势定高冈，传明继晦，子母相承',
    likes: '喜夜及水，恶昼；乙巳尤喜申酉及秋',
    dislikes: '忌昼见、火炎' },
  { name: '天上火', element: 'fire', ganzhi: ['戊午', '己未'], yangFirst: true,
    image: '气过阳宫，重离相会，炳灵交光，发辉炎上',
    likes: '喜夜及秋，水旺；喜金水相济',
    dislikes: '忌火土亢、昼见' },
  { name: '山下火', element: 'fire', ganzhi: ['丙申', '丁酉'], yangFirst: true,
    image: '气息形藏，势力韬光，龟缩兑位，力微体弱，明不及远',
    likes: '喜秋冬及木；喜土晦火',
    dislikes: '忌火炎、水浇' },
  { name: '山头火', element: 'fire', ganzhi: ['甲戌', '乙亥'], yangFirst: true,
    image: '山乃藏形，头乃投光，内明外暗，隐而不显，归于休息',
    likes: '喜土及夏；喜木生火',
    dislikes: '忌霹雳火、天河水；风火相煽' },

  // 土
  { name: '壁上土', element: 'earth', ganzhi: ['庚子', '辛丑'], yangFirst: true,
    image: '气居闭塞，物尚包藏，掩形遮体，内外不交',
    likes: '喜木及金；喜火暖局',
    dislikes: '忌水多、火焚' },
  { name: '城头土', element: 'earth', ganzhi: ['戊寅', '己卯'], yangFirst: true,
    image: '气能成物，功以育物，发乎根，壮乎萼蕊',
    likes: '喜木及火；喜金泄土',
    dislikes: '忌水冲、木克' },
  { name: '沙中土', element: 'earth', ganzhi: ['丙辰', '丁巳'], yangFirst: true,
    image: '气以承阳，发生已过，成齐未来，土之最润',
    likes: '喜金及木；喜水润',
    dislikes: '忌水多、火炎' },
  { name: '路旁土', element: 'earth', ganzhi: ['庚午', '辛未'], yangFirst: true,
    image: '气当承形，物以路彰，有形可质，有物可彰',
    likes: '喜水及春；喜木疏土',
    dislikes: '忌木多、火炎' },
  { name: '大驿土', element: 'earth', ganzhi: ['戊申', '己酉'], yangFirst: true,
    image: '气以归息，物当收敛，龟缩退闲，美而无事',
    likes: '喜申酉及火；喜金泄土',
    dislikes: '忌木克、水多' },
  { name: '屋上土', element: 'earth', ganzhi: ['丙戌', '丁亥'], yangFirst: true,
    image: '气成物府，事以美圆，阴阳历遍，势得其间，成功者静',
    likes: '喜火及木；喜木托',
    dislikes: '忌水冲、木克' },
];

export const NAYIN_ENTRIES: NayinEntry[] = RAW.map((r) => {
  const { yangFirst, ...rest } = r;
  return {
    ...rest,
    yinYang: yangFirst ? 'yang' : 'yin',
  };
});

export const NAYIN_BY_GANZHI: Record<string, NayinEntry> = (() => {
  const map: Record<string, NayinEntry> = {};
  for (const entry of NAYIN_ENTRIES) {
    map[entry.ganzhi[0]] = { ...entry, yinYang: 'yang' };
    map[entry.ganzhi[1]] = { ...entry, yinYang: 'yin' };
  }
  return map;
})();

/** 日柱纳音性情（三十组完整表，避免回落到取象长文） */
export const NAYIN_PERSONALITY: Record<string, string> = {
  海中金: '深沉难测，城府较深，心里装事',
  金箔金: '外柔内刚，重面子，易受环境左右',
  白蜡金: '形明体洁，重规矩，偏谨慎',
  沙中金: '质朴坚忍，藏才不露',
  剑锋金: '锋芒外露，刚直果决',
  钗钏金: '精致内敛，重仪表',
  桑柘木: '盘曲未伸，能忍耐，后发',
  松柏木: '坚韧耐寒，重节操',
  大林木: '枝叶繁茂，能团结人',
  杨柳木: '柔韧随和，易受环境',
  石榴木: '性偏味辛，聪明有个性',
  平地木: '伏藏待时，低调务实',
  涧下水: '温文尔雅，清静自然',
  大溪水: '气势外放，行动力强',
  长流水: '源源不断，善经营',
  天河水: '高远理想，火中取水，越乱越冷静',
  井泉水: '安静深藏，细水长流',
  大海水: '心胸开阔，包容',
  霹雳火: '脾气火爆，爆发力强',
  炉中火: '热情奔放，积极向上',
  覆灯火: '外明内敛，喜夜',
  天上火: '光芒外显，重声望',
  山下火: '力微体弱，韬光养晦',
  山头火: '内明外暗，隐忍',
  壁上土: '包藏保守，重安全感',
  城头土: '有担当，能育人',
  沙中土: '温润含蓄，可塑',
  路旁土: '踏实四方，重人脉',
  大驿土: '稳重踏实，走四方',
  屋上土: '成事守成，喜稳定',
};

export function getNayin(ganzhi: string): NayinEntry {
  return NAYIN_BY_GANZHI[ganzhi] ?? NAYIN_ENTRIES[0];
}

// 盲派日柱纳音长生诀：水申、木亥、金辰、火卯、土午
export const NAYIN_CHANG_SHENG_START: Record<ElementKey, string> = {
  metal: '辰',
  wood: '亥',
  water: '申',
  fire: '卯',
  earth: '午',
};

// 正五行长生 / 临官（三命通会「学堂 / 词馆」用，勿与盲派纳音长生混用）
export const CLASSICAL_START: Record<ElementKey, string> = {
  wood: '亥',
  fire: '寅',
  earth: '申',
  metal: '巳',
  water: '申',
};
export const CLASSICAL_LINGUAN: Record<ElementKey, string> = {
  wood: '寅',
  fire: '巳',
  earth: '亥',
  metal: '申',
  water: '亥',
};

// 纳音桃花（星平会海：金巳亥、木卯亥、火申子、水土午戌）
export const NAYIN_PEACH_BRANCH: Record<ElementKey, string[]> = {
  metal: ['巳', '亥'],
  wood: ['卯', '亥'],
  fire: ['申', '子'],
  water: ['午', '戌'],
  earth: ['午', '戌'],
};

// 同五行纳音位次（社区共识：位次只作平台/量级弱信号，不作吉凶硬断）
// 金剑锋与沙中并列首位；木、水、火、土按社区给出的次序顺排。
export type NayinRankTier = 'high' | 'mid' | 'low';

export const NAYIN_RANK: Record<string, { rank: number; total: number; tier: NayinRankTier }> = {
  剑锋金: { rank: 1, total: 6, tier: 'high' },
  沙中金: { rank: 1, total: 6, tier: 'high' },
  白蜡金: { rank: 3, total: 6, tier: 'mid' },
  金箔金: { rank: 4, total: 6, tier: 'mid' },
  钗钏金: { rank: 5, total: 6, tier: 'low' },
  海中金: { rank: 6, total: 6, tier: 'low' },

  松柏木: { rank: 1, total: 6, tier: 'high' },
  大林木: { rank: 2, total: 6, tier: 'high' },
  杨柳木: { rank: 3, total: 6, tier: 'mid' },
  桑柘木: { rank: 4, total: 6, tier: 'mid' },
  石榴木: { rank: 5, total: 6, tier: 'low' },
  平地木: { rank: 6, total: 6, tier: 'low' },

  大海水: { rank: 1, total: 6, tier: 'high' },
  天河水: { rank: 2, total: 6, tier: 'high' },
  长流水: { rank: 3, total: 6, tier: 'mid' },
  大溪水: { rank: 4, total: 6, tier: 'mid' },
  井泉水: { rank: 5, total: 6, tier: 'low' },
  涧下水: { rank: 6, total: 6, tier: 'low' },

  天上火: { rank: 1, total: 6, tier: 'high' },
  霹雳火: { rank: 2, total: 6, tier: 'high' },
  炉中火: { rank: 3, total: 6, tier: 'mid' },
  山下火: { rank: 4, total: 6, tier: 'mid' },
  山头火: { rank: 5, total: 6, tier: 'low' },
  覆灯火: { rank: 6, total: 6, tier: 'low' },

  大驿土: { rank: 1, total: 6, tier: 'high' },
  路旁土: { rank: 2, total: 6, tier: 'high' },
  沙中土: { rank: 3, total: 6, tier: 'mid' },
  城头土: { rank: 4, total: 6, tier: 'mid' },
  壁上土: { rank: 5, total: 6, tier: 'low' },
  屋上土: { rank: 6, total: 6, tier: 'low' },
};

// 时柱归宿：本行位次最高的两组（脱体化神，主晚发/转机）
// 说明：社区原文示例土行取「庚子辛丑（壁上土）」，与同源位次表冲突；
// 本线统一以位次表前二为准，土行取大驿土、路旁土。
export const NAYIN_STRONGEST_GROUPS: Record<ElementKey, string[]> = {
  metal: ['壬申', '癸酉', '甲午', '乙未'],
  wood: ['庚寅', '辛卯', '戊辰', '己巳'],
  water: ['壬戌', '癸亥', '丙午', '丁未'],
  fire: ['戊午', '己未', '戊子', '己丑'],
  earth: ['戊申', '己酉', '庚午', '辛未'],
};

export const NAYIN_STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'] as const;
export type NayinStage = (typeof NAYIN_STAGES)[number];

// 盲派断运忌 stage
export const NAYIN_BAD_STAGES: Record<ElementKey, NayinStage[]> = {
  wood: ['绝'],
  metal: ['临官', '衰'],
  water: ['病', '绝'],
  fire: ['沐浴'],
  earth: ['养', '病'],
};

// 四绝（盲派断伤灾）
export const NAYIN_SI_JUE: Array<{ pair: string; element: ElementKey; note: string }> = [
  { pair: '寅酉', element: 'metal', note: '金绝在寅酉，主道路伤灾' },
  { pair: '卯申', element: 'wood', note: '木绝在卯申，主车马、盗贼' },
  { pair: '午亥', element: 'water', note: '水绝在午亥，主口舌官司' },
  { pair: '子巳', element: 'fire', note: '火绝在子巳，主体囚受绝' },
];

export interface NayinPattern {
  name: string;
  en: string;
  condition: string;
  verdict: string;
  source: string;
  test: (ctx: { names: string[]; elements: ElementKey[]; branches: string[]; ganzhi: string[] }) => boolean;
}

const has = (arr: string[], ...vals: string[]) => vals.some((v) => arr.includes(v));

export const NAYIN_PATTERNS: NayinPattern[] = [
  {
    name: '珠藏渊海',
    en: 'PEARL IN THE DEEP',
    condition: '甲子/乙丑海中金，见癸亥大海水',
    verdict: '藏珠于渊海，主有名无形而终显，贵气含蓄',
    source: '《兰台妙选》',
    test: ({ names, ganzhi }) => has(names, '海中金') && has(ganzhi, '癸亥'),
  },
  {
    name: '蚌珠照月',
    en: 'PEARL UNDER MOON',
    condition: '甲子/乙丑海中金，见己未天上火',
    verdict: '蚌珠采太阴之华，主清贵、文采、人缘',
    source: '《兰台妙选》',
    test: ({ names }) => has(names, '海中金') && has(names, '天上火'),
  },
  {
    name: '宝剑化青龙',
    en: 'SWORD TO DRAGON',
    condition: '壬申/癸酉剑锋金，见壬辰/庚辰/甲辰',
    verdict: '宝剑化为青龙，主武贵、转机、脱体化神',
    source: '《兰台妙选》',
    test: ({ names, ganzhi }) => has(names, '剑锋金') && has(ganzhi, '壬辰', '庚辰', '甲辰'),
  },
  {
    name: '水绕花堤',
    en: 'WATER ROUND BLOOM',
    condition: '两木在内（月、日），两水在外（年、时）',
    verdict: '仁智相资，主福泽绵长、家风清厚',
    source: '《兰台妙选》',
    test: ({ elements }) => elements[1] === 'wood' && elements[2] === 'wood' && elements[0] === 'water' && elements[3] === 'water',
  },
  {
    name: '昆山片玉',
    en: 'JADE OF KUNLUN',
    condition: '金命见戊寅城头土，或戊寅命见一金',
    verdict: '玉出昆山，主清贵、技艺、名声',
    source: '《兰台妙选》',
    test: ({ elements, ganzhi }) => elements.includes('metal') && has(ganzhi, '戊寅'),
  },
  {
    name: '桑柳成林',
    en: 'MULBERRY & WILLOW',
    condition: '壬子/癸丑桑柘木，见壬午/癸未杨柳木',
    verdict: '桑柳成林，主根基渐茂、家业可成',
    source: '《兰台妙选》',
    test: ({ names, ganzhi }) => has(ganzhi, '壬子', '癸丑') && has(ganzhi, '壬午', '癸未'),
  },
  {
    name: '月生沧海',
    en: 'MOON OVER SEA',
    condition: '己未天上火，见酉支',
    verdict: '月照寒潭，主清贵、远名、晚成',
    source: '《兰台妙选》',
    test: ({ names, branches }) => has(names, '天上火') && branches.includes('酉'),
  },
  {
    name: '金马嘶风',
    en: 'GOLDEN HORSE',
    condition: '庚午/甲午路旁土，见巳支',
    verdict: '金马嘶风，主行动力、迁移、武职',
    source: '《兰台妙选》',
    test: ({ ganzhi, branches }) => has(ganzhi, '庚午', '甲午') && branches.includes('巳'),
  },
];
