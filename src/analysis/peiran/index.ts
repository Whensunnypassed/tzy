// ============================================================
// 沛然堂线 · 希腊占星（Hellenistic Astrology）
// ------------------------------------------------------------
// 路线：希腊占星为主干，阿拉伯中世纪技法为扩展层。
// 资料台账：docs/astrology/resources.md
//
// 分层（全部为「事实层」，不含吉凶断语）：
//   ephemeris.ts       七政黄历（VSOP87 / Meeus，对 JPL DE441 ≤3 角分）
//   astroChart.ts      恒星时 / 轴点 / 整宫制 / 宗派 / 整宫相位
//   tables.ts          静态规则表（庙旺陷落、三分、界、面、喜乐宫、
//                      黄道释放年数、法尔达利亚、七虚点定义）
//   dignity.ts         尊贵判定 + 点位 almuten
//   lots.ts            七虚点
//   planetaryState.ts  行星状态（东出西入、燃烧、疾迟、喜乐宫、宗派）
//   aspects.ts         度相位 / 应用分离 / 空亡 / 映照 / 光线收集
//   timeLords.ts       周年推运 / 黄道释放 / 法尔达利亚 / 太阳返照
//   selfCheck.ts       自检：规则表全称性、星盘不变量、跨模块一致性
//   analysis.ts        汇总装配（展示层只读）
//
// 待接入：主方向（口径分歧未决）、阿拉伯扩展虚点（公式分歧未决）。
// ============================================================

export const PEIRAN_LINE = {
  key: 'peiran',
  label: '沛然堂线',
  system: 'hellenistic',
  status: 'engine',
} as const;

// 星盘
export { buildAstroChart, buildAstroChartFromUtc } from './astroChart';
export type { AstroChart, AstroChartInput, BodyFact, SignAspect } from './astroChart';

// 汇总
export { buildPeiranModel, buildPeiranModelFromChart } from './analysis';
export type { PeiranModel, BuildPeiranOptions, AlmutenFact } from './analysis';

// 规则与判定
export * from './tables';
export { planetDignity, almutenOfDegree, DIGNITY_LABELS, DIGNITY_SCORES } from './dignity';
export type { PlanetDignity, DignityKind } from './dignity';
export { calculateLots, lotFormulaText, calculateArabicLots } from './lots';
export type { LotsResult, LotFact, ArabicLotFact } from './lots';
export {
  calculateLillyScore,
  calculateLillyReport,
  isMoonWaxing,
  LILLY_ESSENTIAL,
  LILLY_ACCIDENTAL,
  FIXED_STARS,
} from './lilly';
export type { LillyScore, LillyReport, LillyInput, ScoreItem } from './lilly';
export { buildStructuredData, structuredDataToMarkdown, STRUCTURED_DATA_VERSION } from './structuredData';
export type { StructuredData, DataQualityFlag } from './structuredData';
export { judgeChart, OBSERVABLE_CRITERIA } from './judgement';
export type { JudgementReport, Verdict, VerdictKey, VerdictLevel, SignificatorFact } from './judgement';
export { rectifyBirthTime, eventName, EVENT_HOUSE, EVENT_NAMES_ZH } from './rectify';
export type {
  LifeEvent,
  LifeEventType,
  EventMatch,
  TimeCandidate,
  RectificationResult,
  RectifyOptions,
} from './rectify';
export { calculatePlanetStates, SOLAR_STATE_LABELS, ORIENTALITY_LABELS, MOTION_LABELS, SPEED_LABELS } from './planetaryState';
export type { PlanetStateFact, SolarState, Orientality, MotionState, SpeedState } from './planetaryState';
export {
  calculateDegreeAspects,
  calculateVoidOfCourse,
  calculateAversions,
  calculateLightCollection,
  DEGREE_ASPECT_LABELS,
} from './aspects';
export type { DegreeAspect, VoidOfCourseFact, AversionPair, LightCollectionCandidate } from './aspects';

// 时间主星
export {
  calculateProfections,
  calculateZodiacalReleasing,
  zrPeriodAtAge,
  calculateFirdaria,
  firdariaAtAge,
  calculateSolarReturn,
  ageInYears,
  formatUtc,
} from './timeLords';
export type {
  ProfectionsResult,
  ZRResult,
  ZRPeriod,
  FirdariaResult,
  FirdariaPeriod,
  SolarReturnResult,
  UtcParts,
} from './timeLords';

// 自检
export { runSelfCheck, checkTables, checkChart, checkCrossModule } from './selfCheck';
export type { SelfCheckReport, CheckItem } from './selfCheck';

export { BODY_KEYS, BODY_NAMES_ZH } from './ephemeris';
