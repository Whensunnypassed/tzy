// ============================================================
// 沛然堂线 · 希腊占星静态规则表
// ------------------------------------------------------------
// 全部为查表数据，不含任何算法；唯一真源，供 dignity / lots /
// planetaryState / timeLords 各引擎引用。
//
// 数据来源（可核验）：
//   · 庙 / 旺 / 陷 / 落 —— Ptolemy《Tetrabiblos》I.17–19 与后世通行表
//   · 三分主星 —— Dorotheus / Ptolemy 传统（昼主 / 夜主 / 参与主）
//   · 埃及界（Egyptian bounds）—— Dorotheus 传统，Brennan 与 George 均采此版
//   · 面（decans / faces）—— 迦勒底面序，自白羊 0° 起为火星
//   · 喜乐宫（planetary joys）—— Paulus Alexandrinus
//   · 七虚点公式 —— Paulus Alexandrinus《Introductory Matters》第 22–23 章
//   · 黄道释放（years of the signs）—— Vettius Valens《Anthology》IV
//   · 法尔达利亚（firdaria）—— 波斯/阿拉伯传统，昼 75 年、夜 75 年
//
// 边界：本文件只定义规则，不做判定。
// ============================================================

import type { BodyKey } from './ephemeris';

export type Planet = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

export const PLANETS: readonly Planet[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
] as const;

export type Sect = 'diurnal' | 'nocturnal';

/** 0 = 白羊 … 11 = 双鱼 */
export type SignIndex = number;

// ------------------------------------------------------------
// 星座基本属性
// ------------------------------------------------------------
export const SIGN_ELEMENTS: readonly ('fire' | 'earth' | 'air' | 'water')[] = [
  'fire',
  'earth',
  'air',
  'water',
  'fire',
  'earth',
  'air',
  'water',
  'fire',
  'earth',
  'air',
  'water',
] as const;

export const SIGN_NAMES_ZH = [
  '白羊',
  '金牛',
  '双子',
  '巨蟹',
  '狮子',
  '处女',
  '天秤',
  '天蝎',
  '射手',
  '摩羯',
  '水瓶',
  '双鱼',
] as const;

export const PLANET_NAMES_ZH: Record<Planet, string> = {
  sun: '太阳',
  moon: '月亮',
  mercury: '水星',
  venus: '金星',
  mars: '火星',
  jupiter: '木星',
  saturn: '土星',
};

// ------------------------------------------------------------
// 庙（domicile）：星座 → 守护星；太阳 / 月亮各一个，五行星各两个
// ------------------------------------------------------------
export const SIGN_RULERS: readonly Planet[] = [
  'mars', // 白羊
  'venus', // 金牛
  'mercury', // 双子
  'moon', // 巨蟹
  'sun', // 狮子
  'mercury', // 处女
  'venus', // 天秤
  'mars', // 天蝎
  'jupiter', // 射手
  'saturn', // 摩羯
  'saturn', // 水瓶
  'jupiter', // 双鱼
] as const;

/** 行星落于这些星座为「庙」 */
export const DOMICILES: Record<Planet, readonly SignIndex[]> = {
  sun: [4],
  moon: [3],
  mercury: [2, 5],
  venus: [1, 6],
  mars: [0, 7],
  jupiter: [8, 11],
  saturn: [9, 10],
};

// ------------------------------------------------------------
// 旺（exaltation）：星座 + 精确度数
// ------------------------------------------------------------
export interface ExaltationPoint {
  sign: SignIndex;
  degree: number;
}

export const EXALTATIONS: Record<Planet, ExaltationPoint> = {
  sun: { sign: 0, degree: 19 },
  moon: { sign: 1, degree: 3 },
  mercury: { sign: 5, degree: 15 },
  venus: { sign: 11, degree: 27 },
  mars: { sign: 9, degree: 28 },
  jupiter: { sign: 3, degree: 15 },
  saturn: { sign: 6, degree: 21 },
};

// ------------------------------------------------------------
// 三分主星（triplicity rulers）
// 火：昼 太阳 / 夜 木星 / 参与 土星
// 土：昼 金星 / 夜 月亮 / 参与 火星
// 风：昼 土星 / 夜 水星 / 参与 木星
// 水：昼 金星 / 夜 火星 / 参与 月亮
// ------------------------------------------------------------
export type TriplicityRole = 'day' | 'night' | 'participating';

export const TRIPLICITY: Record<
  'fire' | 'earth' | 'air' | 'water',
  Record<TriplicityRole, Planet>
> = {
  fire: { day: 'sun', night: 'jupiter', participating: 'saturn' },
  earth: { day: 'venus', night: 'moon', participating: 'mars' },
  air: { day: 'saturn', night: 'mercury', participating: 'jupiter' },
  water: { day: 'venus', night: 'mars', participating: 'moon' },
};

// ------------------------------------------------------------
// 埃及界（Egyptian bounds）：每星座 5 段，末值恒为 30°
// ------------------------------------------------------------
export interface BoundSegment {
  /** 该段结束度数（不含） */
  to: number;
  lord: Planet;
}

export const EGYPTIAN_BOUNDS: readonly (readonly BoundSegment[])[] = [
  // 白羊
  [
    { to: 6, lord: 'jupiter' },
    { to: 12, lord: 'venus' },
    { to: 20, lord: 'mercury' },
    { to: 25, lord: 'mars' },
    { to: 30, lord: 'saturn' },
  ],
  // 金牛
  [
    { to: 8, lord: 'venus' },
    { to: 14, lord: 'mercury' },
    { to: 22, lord: 'jupiter' },
    { to: 27, lord: 'saturn' },
    { to: 30, lord: 'mars' },
  ],
  // 双子
  [
    { to: 7, lord: 'mercury' },
    { to: 14, lord: 'jupiter' },
    { to: 21, lord: 'venus' },
    { to: 25, lord: 'mars' },
    { to: 30, lord: 'saturn' },
  ],
  // 巨蟹
  [
    { to: 7, lord: 'mars' },
    { to: 13, lord: 'venus' },
    { to: 19, lord: 'mercury' },
    { to: 26, lord: 'jupiter' },
    { to: 30, lord: 'saturn' },
  ],
  // 狮子
  [
    { to: 6, lord: 'jupiter' },
    { to: 11, lord: 'venus' },
    { to: 18, lord: 'saturn' },
    { to: 24, lord: 'mercury' },
    { to: 30, lord: 'mars' },
  ],
  // 处女
  [
    { to: 7, lord: 'mercury' },
    { to: 17, lord: 'venus' },
    { to: 21, lord: 'jupiter' },
    { to: 28, lord: 'mars' },
    { to: 30, lord: 'saturn' },
  ],
  // 天秤
  [
    { to: 6, lord: 'saturn' },
    { to: 14, lord: 'mercury' },
    { to: 21, lord: 'jupiter' },
    { to: 28, lord: 'venus' },
    { to: 30, lord: 'mars' },
  ],
  // 天蝎
  [
    { to: 7, lord: 'mars' },
    { to: 11, lord: 'venus' },
    { to: 19, lord: 'mercury' },
    { to: 24, lord: 'jupiter' },
    { to: 30, lord: 'saturn' },
  ],
  // 射手
  [
    { to: 12, lord: 'jupiter' },
    { to: 17, lord: 'venus' },
    { to: 21, lord: 'mercury' },
    { to: 26, lord: 'saturn' },
    { to: 30, lord: 'mars' },
  ],
  // 摩羯
  [
    { to: 7, lord: 'mercury' },
    { to: 14, lord: 'jupiter' },
    { to: 22, lord: 'venus' },
    { to: 26, lord: 'mars' },
    { to: 30, lord: 'saturn' },
  ],
  // 水瓶
  [
    { to: 7, lord: 'mercury' },
    { to: 13, lord: 'venus' },
    { to: 20, lord: 'jupiter' },
    { to: 25, lord: 'mars' },
    { to: 30, lord: 'saturn' },
  ],
  // 双鱼
  [
    { to: 12, lord: 'venus' },
    { to: 16, lord: 'jupiter' },
    { to: 19, lord: 'mercury' },
    { to: 28, lord: 'mars' },
    { to: 30, lord: 'saturn' },
  ],
] as const;

// ------------------------------------------------------------
// 面（decans / faces）：每星座三段，迦勒底面序
// ------------------------------------------------------------
export const DECANS: readonly (readonly [Planet, Planet, Planet])[] = [
  ['mars', 'sun', 'venus'], // 白羊
  ['mercury', 'moon', 'saturn'], // 金牛
  ['jupiter', 'mars', 'sun'], // 双子
  ['venus', 'mercury', 'moon'], // 巨蟹
  ['saturn', 'jupiter', 'mars'], // 狮子
  ['sun', 'venus', 'mercury'], // 处女
  ['moon', 'saturn', 'jupiter'], // 天秤
  ['mars', 'sun', 'venus'], // 天蝎
  ['mercury', 'moon', 'saturn'], // 射手
  ['jupiter', 'mars', 'sun'], // 摩羯
  ['venus', 'mercury', 'moon'], // 水瓶
  ['saturn', 'jupiter', 'mars'], // 双鱼
] as const;

// ------------------------------------------------------------
// 喜乐宫（planetary joys）：行星在哪个整宫宫位最自在
// ------------------------------------------------------------
export const JOYS: Record<Planet, number> = {
  mercury: 1,
  moon: 3,
  venus: 5,
  mars: 6,
  sun: 9,
  jupiter: 11,
  saturn: 12,
};

// ------------------------------------------------------------
// 宗派吉凶（sect benefic / malefic）
// 昼盘：木星为宗派内吉星，火星为宗派外凶星
// 夜盘：金星为宗派内吉星，土星为宗派外凶星
// ------------------------------------------------------------
export const SECT_BENEFIC: Record<Sect, Planet> = {
  diurnal: 'jupiter',
  nocturnal: 'venus',
};

export const SECT_MALEFIC: Record<Sect, Planet> = {
  diurnal: 'mars',
  nocturnal: 'saturn',
};

// ------------------------------------------------------------
// 黄道释放（Zodiacal Releasing）—— 各星座的一般年数
// Aries 15 / Taurus 8 / Gemini 20 / Cancer 25 / Leo 19 / Virgo 20 /
// Libra 8 / Scorpio 15 / Sagittarius 12 / Capricorn 27 / Aquarius 30 / Pisces 12
// 合计 211 年；L2 起逐级按 1/12 折算（年 → 月 → 天 → 小时）
// ------------------------------------------------------------
export const ZR_SIGN_YEARS: readonly number[] = [
  15, 8, 20, 25, 19, 20, 8, 15, 12, 27, 30, 12,
] as const;

// ------------------------------------------------------------
// 法尔达利亚（firdaria）：昼 / 夜两套顺序，总 75 年
// 昼：日 10 / 金 8 / 水 13 / 月 9 / 土 11 / 木 12 / 火 7 / 北交 3 / 南交 2
// 夜：月 9 / 土 11 / 木 12 / 火 7 / 日 10 / 金 8 / 水 13 / 北交 3 / 南交 2
// ------------------------------------------------------------
export type FirdariaLord = Planet | 'northNode' | 'southNode';

export const FIRDARIA_DAY: readonly { lord: FirdariaLord; years: number }[] = [
  { lord: 'sun', years: 10 },
  { lord: 'venus', years: 8 },
  { lord: 'mercury', years: 13 },
  { lord: 'moon', years: 9 },
  { lord: 'saturn', years: 11 },
  { lord: 'jupiter', years: 12 },
  { lord: 'mars', years: 7 },
  { lord: 'northNode', years: 3 },
  { lord: 'southNode', years: 2 },
] as const;

export const FIRDARIA_NIGHT: readonly { lord: FirdariaLord; years: number }[] = [
  { lord: 'moon', years: 9 },
  { lord: 'saturn', years: 11 },
  { lord: 'jupiter', years: 12 },
  { lord: 'mars', years: 7 },
  { lord: 'sun', years: 10 },
  { lord: 'venus', years: 8 },
  { lord: 'mercury', years: 13 },
  { lord: 'northNode', years: 3 },
  { lord: 'southNode', years: 2 },
] as const;

// ------------------------------------------------------------
// 七虚点（Hermetic Lots）—— Paulus Alexandrinus 定义
// 公式统一为 ASC + A − B；夜盘把 A / B 互换（除 Fortune / Spirit）
// ------------------------------------------------------------
export type LotKey =
  | 'fortune'
  | 'spirit'
  | 'eros'
  | 'necessity'
  | 'courage'
  | 'victory'
  | 'nemesis';

export const LOT_NAMES_ZH: Record<LotKey, string> = {
  fortune: '福点',
  spirit: '精神点',
  eros: '爱欲点',
  necessity: '必然点',
  courage: '勇气点',
  victory: '胜利点',
  nemesis: '报应点',
};

export const LOT_NAMES_EN: Record<LotKey, string> = {
  fortune: 'Lot of Fortune',
  spirit: 'Lot of Spirit',
  eros: 'Lot of Eros',
  necessity: 'Lot of Necessity',
  courage: 'Lot of Courage',
  victory: 'Lot of Victory',
  nemesis: 'Lot of Nemesis',
};

/** 参与行星（用于展示与校验） */
export const LOT_RULING_PLANET: Record<LotKey, Planet> = {
  fortune: 'moon',
  spirit: 'sun',
  eros: 'venus',
  necessity: 'mercury',
  courage: 'mars',
  victory: 'jupiter',
  nemesis: 'saturn',
};

/**
 * 虚点公式：Fortune / Spirit 由两个发光体互换决定；
 * 其余五点以「宗派吉凶行星与对应基础点」的差值投影自 ASC。
 */
/** 虚点公式中的「点」：可以是行星，也可以是已算出的前置虚点 */
export type LotPoint = Planet | LotKey;

export const LOT_FORMULAS: Record<
  LotKey,
  { day: { plus: LotPoint; minus: LotPoint }; night: { plus: LotPoint; minus: LotPoint } }
> = {
  fortune: { day: { plus: 'moon', minus: 'sun' }, night: { plus: 'sun', minus: 'moon' } },
  spirit: { day: { plus: 'sun', minus: 'moon' }, night: { plus: 'moon', minus: 'sun' } },
  eros: { day: { plus: 'venus', minus: 'spirit' }, night: { plus: 'spirit', minus: 'venus' } },
  necessity: { day: { plus: 'fortune', minus: 'mercury' }, night: { plus: 'mercury', minus: 'fortune' } },
  courage: { day: { plus: 'fortune', minus: 'mars' }, night: { plus: 'mars', minus: 'fortune' } },
  victory: { day: { plus: 'jupiter', minus: 'spirit' }, night: { plus: 'spirit', minus: 'jupiter' } },
  nemesis: { day: { plus: 'fortune', minus: 'saturn' }, night: { plus: 'saturn', minus: 'fortune' } },
};

// ------------------------------------------------------------
// 阿拉伯扩展点（Arabic Parts）
// 与七虚点同构（ASC + A − B，夜盘互换），但由阿拉伯作者扩充。
// 本表只收「来源可核验、公式无实质分歧」的一批；
// 来源：Paulus Alexandrinus / Vettius Valens / Liber Hermetis 传统，
//       经 Patrice Guinard 整理（Astrotheme 阿拉伯点表）。
// ------------------------------------------------------------

export type ArabicLotKey =
  | 'father'
  | 'mother'
  | 'siblings'
  | 'children'
  | 'marriageMale'
  | 'marriageFemale'
  | 'debt'
  | 'foundation'
  | 'treachery'
  | 'difficulty';

export const ARABIC_LOT_NAMES_ZH: Record<ArabicLotKey, string> = {
  father: '父点',
  mother: '母点',
  siblings: '兄弟点',
  children: '子女点',
  marriageMale: '婚姻点（男）',
  marriageFemale: '婚姻点（女）',
  debt: '债务点',
  foundation: '根基点',
  treachery: '背叛点',
  difficulty: '困难点',
};

export const ARABIC_LOT_NAMES_EN: Record<ArabicLotKey, string> = {
  father: 'Part of the Father',
  mother: 'Part of the Mother',
  siblings: 'Part of Siblings',
  children: 'Part of Children',
  marriageMale: 'Part of Marriage (male)',
  marriageFemale: 'Part of Marriage (female)',
  debt: 'Part of Debt',
  foundation: 'Part of Foundation',
  treachery: 'Part of Treachery',
  difficulty: 'Part of Difficulty',
};

export interface ArabicLotDef {
  key: ArabicLotKey;
  nameZh: string;
  nameEn: string;
  /** 昼盘公式 ASC + plus − minus；夜盘互换 */
  plus: LotPoint;
  minus: LotPoint;
  /** 性别限定（婚姻点分男女） */
  gender?: 'male' | 'female';
  source: string;
}

export const ARABIC_LOTS: readonly ArabicLotDef[] = [
  { key: 'father', nameZh: ARABIC_LOT_NAMES_ZH.father, nameEn: ARABIC_LOT_NAMES_EN.father, plus: 'saturn', minus: 'sun', source: 'Paulus' },
  { key: 'mother', nameZh: ARABIC_LOT_NAMES_ZH.mother, nameEn: ARABIC_LOT_NAMES_EN.mother, plus: 'moon', minus: 'venus', source: 'Paulus' },
  { key: 'siblings', nameZh: ARABIC_LOT_NAMES_ZH.siblings, nameEn: ARABIC_LOT_NAMES_EN.siblings, plus: 'jupiter', minus: 'saturn', source: 'Paulus' },
  { key: 'children', nameZh: ARABIC_LOT_NAMES_ZH.children, nameEn: ARABIC_LOT_NAMES_EN.children, plus: 'saturn', minus: 'jupiter', source: 'Paulus' },
  { key: 'marriageMale', nameZh: ARABIC_LOT_NAMES_ZH.marriageMale, nameEn: ARABIC_LOT_NAMES_EN.marriageMale, plus: 'venus', minus: 'saturn', gender: 'male', source: 'Paulus' },
  { key: 'marriageFemale', nameZh: ARABIC_LOT_NAMES_ZH.marriageFemale, nameEn: ARABIC_LOT_NAMES_EN.marriageFemale, plus: 'saturn', minus: 'venus', gender: 'female', source: 'Paulus' },
  { key: 'debt', nameZh: ARABIC_LOT_NAMES_ZH.debt, nameEn: ARABIC_LOT_NAMES_EN.debt, plus: 'saturn', minus: 'mercury', source: 'Valens' },
  { key: 'foundation', nameZh: ARABIC_LOT_NAMES_ZH.foundation, nameEn: ARABIC_LOT_NAMES_EN.foundation, plus: 'fortune', minus: 'spirit', source: 'Valens' },
  { key: 'treachery', nameZh: ARABIC_LOT_NAMES_ZH.treachery, nameEn: ARABIC_LOT_NAMES_EN.treachery, plus: 'mars', minus: 'sun', source: 'Liber Hermetis' },
  { key: 'difficulty', nameZh: ARABIC_LOT_NAMES_ZH.difficulty, nameEn: ARABIC_LOT_NAMES_EN.difficulty, plus: 'mars', minus: 'saturn', source: 'Liber Hermetis' },
] as const;

// ------------------------------------------------------------
// 相位容许度（度相位 orb）
// ------------------------------------------------------------
export const ASPECT_ORBS: Record<'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile', number> = {
  conjunction: 8,
  opposition: 8,
  trine: 7,
  square: 7,
  sextile: 5,
};

/** 行星自身的光照半径（用于「在日光下」判定，单位：度） */
export const SOLAR_PROXIMITY = {
  cazimi: 17 / 60,
  combust: 8.5,
  underBeams: 17,
} as const;

/** 各行星平均日行速度（度/日），用于疾行 / 迟行判定 */
export const MEAN_DAILY_MOTION: Record<Planet, number> = {
  sun: 0.9856,
  moon: 13.1764,
  mercury: 1.383,
  venus: 1.2,
  mars: 0.524,
  jupiter: 0.0831,
  saturn: 0.0334,
};

/** 行星的宗派「内 / 外」属性（不含吉凶） */
export const PLANET_SECT_GROUP: Record<Planet, 'light' | 'benefic' | 'malefic' | 'neutral'> = {
  sun: 'light',
  moon: 'light',
  mercury: 'neutral',
  venus: 'benefic',
  jupiter: 'benefic',
  mars: 'malefic',
  saturn: 'malefic',
};

/** 七政顺序（黄道释放、法尔达利亚等展示用） */
export const BODY_TO_PLANET: Record<BodyKey, Planet | null> = {
  sun: 'sun',
  moon: 'moon',
  mercury: 'mercury',
  venus: 'venus',
  mars: 'mars',
  jupiter: 'jupiter',
  saturn: 'saturn',
};
