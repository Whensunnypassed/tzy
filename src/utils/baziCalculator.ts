// 八字排盘引擎 - 基于沛然堂八字体系
// 年柱以立春为界，月柱以节令为界，日柱使用阳历推算，时柱按十二时辰划分
// 简化实现：使用常见节气表和六十甲子循环计算

import {
  MOCK_HEAVENLY_STEMS,
  MOCK_EARTHLY_BRANCHES,
  BIRTH_REGION_CFG,
  birthRegionLongitude,
  chinaDstOffsetMinutes,
  equationOfTimeMinutes,
  type IHeavenlyStem,
  type IEarthlyBranch,
} from '@/data/baziData';
import {
  getMonthBranchByExactTime,
  isBeforeLiChun,
  getDaysToNextTerm,
  getDaysToPrevTerm,
} from '@/utils/solarTermsCalc';

// 十天干索引
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
// 十二地支索引
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 五行对应
const STEM_ELEMENTS: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  甲: 'wood', 乙: 'wood',
  丙: 'fire', 丁: 'fire',
  戊: 'earth', 己: 'earth',
  庚: 'metal', 辛: 'metal',
  壬: 'water', 癸: 'water',
};

const BRANCH_ELEMENTS: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  子: 'water', 丑: 'earth',
  寅: 'wood', 卯: 'wood',
  辰: 'earth', 巳: 'fire',
  午: 'fire', 未: 'earth',
  申: 'metal', 酉: 'metal',
  戌: 'earth', 亥: 'water',
};

// 阴阳对应
const STEM_YINYANG: Record<string, 'yin' | 'yang'> = {
  甲: 'yang', 乙: 'yin',
  丙: 'yang', 丁: 'yin',
  戊: 'yang', 己: 'yin',
  庚: 'yang', 辛: 'yin',
  壬: 'yang', 癸: 'yin',
};

const BRANCH_YINYANG: Record<string, 'yin' | 'yang'> = {
  子: 'yang', 丑: 'yin',
  寅: 'yang', 卯: 'yin',
  辰: 'yang', 巳: 'yin',
  午: 'yang', 未: 'yin',
  申: 'yang', 酉: 'yin',
  戌: 'yang', 亥: 'yin',
};

// 地支藏干
const HIDDEN_STEMS: Record<string, string[]> = {
  子: ['癸'],
  丑: ['己', '辛', '癸'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '戊', '庚'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
};

// 月支对应（正月=寅）
const MONTH_BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

// 年上起月（五虎遁）口诀：
// 甲己之年丙作首，乙庚之年戊为头
// 丙辛之岁寻庚起，丁壬壬寅顺水流
// 戊癸之年何方发，甲寅之上好追求
const getMonthStem = (yearStem: string, monthBranchIndex: number): string => {
  const yearStemIndex = STEMS.indexOf(yearStem);
  // 正月(寅月)天干索引
  let firstMonthStemIndex: number;
  switch (yearStemIndex % 5) {
    case 0: // 甲己
      firstMonthStemIndex = 2; // 丙
      break;
    case 1: // 乙庚
      firstMonthStemIndex = 4; // 戊
      break;
    case 2: // 丙辛
      firstMonthStemIndex = 6; // 庚
      break;
    case 3: // 丁壬
      firstMonthStemIndex = 8; // 壬
      break;
    default: // 戊癸
      firstMonthStemIndex = 0; // 甲
      break;
  }
  return STEMS[(firstMonthStemIndex + monthBranchIndex) % 10];
};

// 日上起时（五鼠遁）口诀：
// 甲己还加甲，乙庚丙作初
// 丙辛从戊起，丁壬庚子居
// 戊癸何方发，壬子是真途
const getHourStem = (dayStem: string, hourBranchIndex: number): string => {
  const dayStemIndex = STEMS.indexOf(dayStem);
  let firstHourStemIndex: number;
  switch (dayStemIndex % 5) {
    case 0: // 甲己
      firstHourStemIndex = 0; // 甲
      break;
    case 1: // 乙庚
      firstHourStemIndex = 2; // 丙
      break;
    case 2: // 丙辛
      firstHourStemIndex = 4; // 戊
      break;
    case 3: // 丁壬
      firstHourStemIndex = 6; // 庚
      break;
    default: // 戊癸
      firstHourStemIndex = 8; // 壬
      break;
  }
  return STEMS[(firstHourStemIndex + hourBranchIndex) % 10];
};

// 阳历推算日柱（基于蔡勒公式改良法）
// 以 1900 年 1 月 1 日 为基准，已知该日为甲戌日（甲=0, 戌=10，索引值取模）
// 更简便的方法：1900年1月1日 = 甲戌日，干支序号 = (dayIndex + 10) % 60
// 这里使用简化近似算法，对于演示用途足够准确
const getDayPillar = (year: number, month: number, day: number): { stem: string; branch: string } => {
  // 基准：2000年1月1日 = 戊午日（天干序号4，地支序号6）
  const baseYear = 2000;
  const baseMonth = 1;
  const baseDay = 1;
  const baseStemIndex = 4; // 戊
  const baseBranchIndex = 6; // 午

  const date1 = new Date(baseYear, baseMonth - 1, baseDay);
  const date2 = new Date(year, month - 1, day);
  const diffDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));

  const stemIndex = ((baseStemIndex + diffDays) % 10 + 10) % 10;
  const branchIndex = ((baseBranchIndex + diffDays) % 12 + 12) % 12;

  return { stem: STEMS[stemIndex], branch: BRANCHES[branchIndex] };
};

// 判断年柱（以精确立春时刻为界）
const getYearPillar = (year: number, month: number, day: number, hour: number, minute: number): { stem: string; branch: string } => {
  let lunarYear = year;
  // 使用精确节气时间判断是否在立春之前
  if (isBeforeLiChun(year, month, day, hour, minute)) {
    lunarYear = year - 1;
  }
  // 年干公式：(年份-3) % 10
  const stemIndex = ((lunarYear - 3) % 10 + 10) % 10;
  // 年支公式：(年份-3) % 12
  const branchIndex = ((lunarYear - 3) % 12 + 12) % 12;
  return { stem: STEMS[stemIndex === 0 ? 9 : stemIndex - 1], branch: BRANCHES[branchIndex === 0 ? 11 : branchIndex - 1] };
};

// 判断月柱（以精确节气时刻为界）
const getMonthPillar = (
  yearStem: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): { stem: string; branch: string; branchIndex: number } => {
  // 使用精确节气时间计算月支
  const { monthBranchIndex } = getMonthBranchByExactTime(year, month, day, hour, minute);
  const stem = getMonthStem(yearStem, monthBranchIndex);
  return { stem, branch: MONTH_BRANCHES[monthBranchIndex], branchIndex: monthBranchIndex };
};

// 时柱推算（按小时）
const getHourPillar = (dayStem: string, hour: number, minute: number): { stem: string; branch: string; branchIndex: number } => {
  // 子时 23:00-01:00，丑时 01:00-03:00...
  // 注意：23点后为次日子时
  let branchIndex: number;
  if (hour === 23 || hour === 0) {
    branchIndex = 0; // 子
  } else {
    branchIndex = Math.floor((hour + 1) / 2);
  }
  const stem = getHourStem(dayStem, branchIndex);
  return { stem, branch: BRANCHES[branchIndex], branchIndex };
};

// 十神计算（相对于日主天干）
// 同我 = 比劫（比肩、劫财）；我生 = 食伤（食神、伤官）；我克 = 财（正财、偏财）
// 克我 = 官杀（正官、七杀）；生我 = 印（正印、偏印）
// 天干阴阳相同 = 偏（七杀、偏印、比肩、偏财、食神），不同 = 正（正官、正印、劫财、正财、伤官）
const getShiShen = (dayStem: string, otherStem: string): string => {
  const dayElement = STEM_ELEMENTS[dayStem];
  const dayYY = STEM_YINYANG[dayStem];
  const otherElement = STEM_ELEMENTS[otherStem];
  const otherYY = STEM_YINYANG[otherStem];
  const sameYY = dayYY === otherYY;

  const relation = getElementRelation(dayElement, otherElement);
  // relation: same / sheng-wo / wo-sheng / ke-wo / wo-ke

  switch (relation) {
    case 'same':
      return sameYY ? '比肩' : '劫财';
    case 'sheng-wo': // 生我者为印
      return sameYY ? '偏印' : '正印';
    case 'wo-sheng': // 我生者为食伤
      return sameYY ? '食神' : '伤官';
    case 'ke-wo': // 克我者为官杀
      return sameYY ? '七杀' : '正官';
    case 'wo-ke': // 我克者为财
      return sameYY ? '偏财' : '正财';
    default:
      return '';
  }
};

type ElementRelation = 'same' | 'sheng-wo' | 'wo-sheng' | 'ke-wo' | 'wo-ke';

const getElementRelation = (a: string, b: string): ElementRelation => {
  // 五行生克：木生火、火生土、土生金、金生水、水生木
  // 木克土、土克水、水克火、火克金、金克木
  const shengMap: Record<string, string> = {
    wood: 'fire',
    fire: 'earth',
    earth: 'metal',
    metal: 'water',
    water: 'wood',
  };
  const keMap: Record<string, string> = {
    wood: 'earth',
    earth: 'water',
    water: 'fire',
    fire: 'metal',
    metal: 'wood',
  };

  if (a === b) return 'same';
  if (shengMap[b] === a) return 'sheng-wo'; // b生a = 生我
  if (shengMap[a] === b) return 'wo-sheng'; // a生b = 我生
  if (keMap[b] === a) return 'ke-wo'; // b克a = 克我
  if (keMap[a] === b) return 'wo-ke'; // a克b = 我克
  return 'same';
};

// 60 甲子完整序列
const JIA_ZI_60 = [
  '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
  '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
  '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
  '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
  '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
  '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥',
];

// 大运排布
// 顺逆判断：阳年生男、阴年生女 → 顺排；阴年生男、阳年生女 → 逆排
// 起运岁数：从出生日到最近一个节（顺排数到下一个节，逆排数到上一个节）
// 三天折合一岁，使用精确节气时间计算
const getDaYun = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  gender: 'male' | 'female',
  yearStem: string,
  monthStem: string,
  monthBranch: string,
  monthBranchIndex: number,
): Array<{ index: number; stem: string; branch: string; startAge: number; startYear: number; endYear: number; daysToJie: number }> => {
  // 1. 判断年干阴阳，确定顺逆
  const yearStemYinYang = STEM_YINYANG[yearStem];
  const isYangYear = yearStemYinYang === 'yang';
  const shunPai = (isYangYear && gender === 'male') || (!isYangYear && gender === 'female');

  // 2. 找到月柱在60甲子中的位置
  const monthGanZhi = monthStem + monthBranch;
  const monthIndex = JIA_ZI_60.indexOf(monthGanZhi);

  // 3. 生成八步大运
  const dayunList = [];
  for (let i = 0; i < 8; i++) {
    let idx: number;
    if (shunPai) {
      idx = (monthIndex + 1 + i) % 60; // 顺排：取下一个
    } else {
      idx = ((monthIndex - 1 - i) % 60 + 60) % 60; // 逆排：取上一个
    }
    const ganzhi = JIA_ZI_60[idx];
    dayunList.push({
      index: i,
      stem: ganzhi[0],
      branch: ganzhi[1],
      startAge: 0,
      startYear: 0,
      endYear: 0,
      daysToJie: 0,
    });
  }

  // 4. 计算起运年龄（三天折合一岁）
  // 使用精确节气时间计算到下一个/上一个节的距离
  let daysToJie: number;
  if (shunPai) {
    // 顺排：数到出生后第一个"节"
    daysToJie = getDaysToNextTerm(year, month, day, hour, minute);
  } else {
    // 逆排：数到出生前最近一个"节"
    daysToJie = getDaysToPrevTerm(year, month, day, hour, minute);
  }

  // 三天折合一岁
  const startAge = Math.max(1, Math.round((daysToJie / 3) * 10) / 10);
  const startAgeInt = Math.floor(startAge);

  // 填充每步大运
  for (let i = 0; i < dayunList.length; i++) {
    const daYunStartAge = startAgeInt + i * 10;
    dayunList[i].startAge = daYunStartAge;
    dayunList[i].startYear = year + daYunStartAge;
    dayunList[i].endYear = dayunList[i].startYear + 9;
    dayunList[i].daysToJie = Math.round(daysToJie);
  }

  return dayunList;
};

// 流年干支计算
const getLiuNian = (year: number): { stem: string; branch: string } => {
  const stemIndex = ((year - 3) % 10 + 10) % 10;
  const branchIndex = ((year - 3) % 12 + 12) % 12;
  return {
    stem: STEMS[stemIndex === 0 ? 9 : stemIndex - 1],
    branch: BRANCHES[branchIndex === 0 ? 11 : branchIndex - 1],
  };
};

// 日期 + 分钟 → 规范化日期时刻（支持负值与超过 1440 的分钟数，带跨日偏移）
const normalizeDateTime = (
  year: number,
  month: number,
  day: number,
  totalMinutes: number,
): { year: number; month: number; day: number; hour: number; minute: number; dayOffset: number } => {
  const dayOffset = Math.floor(totalMinutes / 1440);
  const rest = totalMinutes - dayOffset * 1440;
  // 纯 civil 运算：用 UTC 组装日期，避免运行环境本地时区/夏令时影响换算结果
  const base = new Date(Date.UTC(year, month - 1, day) + dayOffset * 86400000);
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
    hour: Math.floor(rest / 60),
    minute: rest % 60,
    dayOffset,
  };
};

// 真太阳时 = 标准时 + 经度差（每度 4 分钟）+ 均时差；
// 返回的日期随真太阳时跨日进位（东五区凌晨会退到前一日，东九区深夜会进到次日）
const adjustTrueSolarTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  longitude: number,
  eotMinutes: number,
): { hour: number; minute: number; offsetMinutes: number; year: number; month: number; day: number } => {
  const diffMinutes = Math.round(
    (longitude - BIRTH_REGION_CFG.standardMeridian) * BIRTH_REGION_CFG.minutesPerDegree + eotMinutes,
  );
  const t = normalizeDateTime(year, month, day, hour * 60 + minute + diffMinutes);
  return {
    year: t.year,
    month: t.month,
    day: t.day,
    hour: t.hour,
    minute: t.minute,
    offsetMinutes: diffMinutes,
  };
};

// 常用城市经度
const CITY_LONGITUDE: Record<string, number> = {
  北京: 116.41,
  上海: 121.47,
  广州: 113.26,
  深圳: 114.06,
  成都: 104.07,
  重庆: 106.55,
  西安: 108.94,
  武汉: 114.31,
  杭州: 120.15,
  南京: 118.78,
  天津: 117.20,
  苏州: 120.62,
  郑州: 113.65,
  长沙: 112.94,
  沈阳: 123.43,
  青岛: 120.38,
  大连: 121.62,
  厦门: 118.08,
  昆明: 102.71,
  乌鲁木齐: 87.62,
  拉萨: 91.13,
  哈尔滨: 126.53,
  海口: 110.33,
  香港: 114.17,
  台北: 121.56,
};

export interface Pillar {
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
  stemYinYang: 'yin' | 'yang';
  branchYinYang: 'yin' | 'yang';
  hiddenStems: string[];
  shiShen?: string;
}

export interface BaZiChart {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
  monthBranchIndex: number;
  gender: 'male' | 'female';
  birthInfo: {
    solarDate: string;
    solarTime: string;
    birthPlace: string;
    trueSolarTime: string;
    trueSolarOffset: number;
    /** 标准时（北京时间；夏令时已回拨） */
    standardTime: string;
    /** 是否命中中国 1986–1991 夏令时 */
    dstApplied: boolean;
    dstOffsetMinutes: number;
    /** 经度差换算分钟（每度 4 分钟） */
    longitudeOffsetMinutes: number;
    /** 均时差分钟（真太阳时 − 平太阳时） */
    equationOfTimeMinutes: number;
    /** 真太阳时所在日期（跨日时与出生日期不同） */
    trueSolarDate: string;
    /** 真太阳时相对出生日期的跨日偏移（-1 / 0 / 1） */
    trueSolarDayOffset: number;
  };
  daYun: Array<{
    index: number;
    stem: string;
    branch: string;
    startAge: number;
    startYear: number;
    endYear: number;
    daysToJie: number;
  }>;
}

export function calculateBaZi(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  gender: 'male' | 'female',
  birthPlace: string = '北京',
): BaZiChart {
  // 经度优先级：城市表 → 出生地时区板块（BIRTH_REGION_CFG）→ 默认北京
  const longitude = CITY_LONGITUDE[birthPlace] ?? birthRegionLongitude(birthPlace);

  // ① 夏令时回拨：输入为出生地钟表时间，1986–1991 夏令时需先减 60 分钟得到标准时
  const dstOffsetMinutes = chinaDstOffsetMinutes(year, month, day, hour, minute);
  const std = normalizeDateTime(year, month, day, hour * 60 + minute - dstOffsetMinutes);

  // ② 均时差按标准时日期取（年内日序），真太阳时 = 标准时 + 经度差 + 均时差
  const eotMinutes = equationOfTimeMinutes(std.year, std.month, std.day);
  const trueSolar = adjustTrueSolarTime(std.year, std.month, std.day, std.hour, std.minute, longitude, eotMinutes);
  const longitudeOffsetMinutes = Math.round(
    (longitude - BIRTH_REGION_CFG.standardMeridian) * BIRTH_REGION_CFG.minutesPerDegree,
  );

  // 年柱 / 月柱 / 起运：一律用标准时，与节气时刻（北京时间）同帧；真太阳时只用于日柱与时柱
  const yearPillar = getYearPillar(std.year, std.month, std.day, std.hour, std.minute);
  const monthPillar = getMonthPillar(yearPillar.stem, std.year, std.month, std.day, std.hour, std.minute);

  // 日柱：日期随真太阳时跨日进位；23 点后为次日子时，再进一天
  let dayYear = trueSolar.year;
  let dayMonth = trueSolar.month;
  let dayDay = trueSolar.day;
  if (trueSolar.hour === 23) {
    const next = new Date(dayYear, dayMonth - 1, dayDay + 1);
    dayYear = next.getFullYear();
    dayMonth = next.getMonth() + 1;
    dayDay = next.getDate();
  }
  const dayPillarRaw = getDayPillar(dayYear, dayMonth, dayDay);

  // 时柱
  const hourPillar = getHourPillar(dayPillarRaw.stem, trueSolar.hour, trueSolar.minute);

  // 真太阳时相对「用户输入日期」的跨日偏移（夏令时 + 经度差 + 均时差综合结果）
  const trueSolarDayOffset = Math.round(
    (Date.UTC(trueSolar.year, trueSolar.month - 1, trueSolar.day) - Date.UTC(year, month - 1, day)) / 86400000,
  );

  // 日主天干
  const dayMaster = dayPillarRaw.stem;

  const makePillar = (stem: string, branch: string, isDay: boolean = false): Pillar => ({
    stem,
    branch,
    stemElement: STEM_ELEMENTS[stem],
    branchElement: BRANCH_ELEMENTS[branch],
    stemYinYang: STEM_YINYANG[stem],
    branchYinYang: BRANCH_YINYANG[branch],
    hiddenStems: HIDDEN_STEMS[branch],
    shiShen: isDay ? '日主' : getShiShen(dayMaster, stem),
  });

  // 大运起运：同样用标准时与节气时刻同帧（夏令时已回拨）
  const daYun = getDaYun(std.year, std.month, std.day, std.hour, std.minute, gender, yearPillar.stem, monthPillar.stem, monthPillar.branch, monthPillar.branchIndex);

  return {
    year: makePillar(yearPillar.stem, yearPillar.branch),
    month: makePillar(monthPillar.stem, monthPillar.branch),
    day: makePillar(dayPillarRaw.stem, dayPillarRaw.branch, true),
    hour: makePillar(hourPillar.stem, hourPillar.branch),
    monthBranchIndex: monthPillar.branchIndex,
    gender,
    birthInfo: {
      solarDate: `${year}年${month}月${day}日`,
      solarTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      birthPlace,
      trueSolarTime: `${trueSolar.hour.toString().padStart(2, '0')}:${trueSolar.minute.toString().padStart(2, '0')}`,
      trueSolarOffset: trueSolar.offsetMinutes,
      standardTime: `${std.hour.toString().padStart(2, '0')}:${std.minute.toString().padStart(2, '0')}`,
      dstApplied: dstOffsetMinutes > 0,
      dstOffsetMinutes,
      longitudeOffsetMinutes,
      equationOfTimeMinutes: Math.round(eotMinutes * 10) / 10,
      trueSolarDate: `${trueSolar.year}年${trueSolar.month}月${trueSolar.day}日`,
      trueSolarDayOffset,
    },
    daYun,
  };
}

export function getCurrentDaYunIndex(chart: BaZiChart, currentYear: number): number {
  for (let i = 0; i < chart.daYun.length; i++) {
    if (currentYear < chart.daYun[i].startYear) return Math.max(0, i - 1);
  }
  return chart.daYun.length - 1;
}

export function getLiuNianList(startYear: number, count: number): Array<{ year: number; stem: string; branch: string }> {
  const list = [];
  for (let i = 0; i < count; i++) {
    const y = startYear + i;
    const ln = getLiuNian(y);
    list.push({ year: y, stem: ln.stem, branch: ln.branch });
  }
  return list;
}

export {
  STEMS,
  BRANCHES,
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  STEM_YINYANG,
  BRANCH_YINYANG,
  HIDDEN_STEMS,
  MONTH_BRANCHES,
  CITY_LONGITUDE,
  getShiShen,
  getLiuNian,
  MOCK_HEAVENLY_STEMS,
  MOCK_EARTHLY_BRANCHES,
};
export type { IHeavenlyStem, IEarthlyBranch };
