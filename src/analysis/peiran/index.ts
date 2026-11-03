// ============================================================
// 沛然堂线 · 希腊占星（Hellenistic Astrology）
// ------------------------------------------------------------
// 路线：希腊占星为主干，阿拉伯中世纪技法为扩展层。
// 资料台账：docs/astrology/resources.md
//
// 当前阶段（星盘基础）：
//   · ephemeris.ts  自研七政黄历（VSOP87 / Meeus 公开算法，对 JPL DE441 ≤3 角分）
//   · astroChart.ts 恒星时 / 上升点 / 中天 / 整宫制 / 宗派 / 整宫相位
//   · 城市与时区：src/data/cityData.ts（经纬度 + 历史时区规则）
//
// 待接入：尊贵体系（三分主星 / 界 / 面）、七虚点、
//         时间主星（周年推运 / 黄道释放 / 主方向）、
//         阿拉伯扩展（法尔达利亚 / 太阳返照 / almuten / 大合相）。
// ============================================================

export const PEIRAN_LINE = {
  key: 'peiran',
  label: '沛然堂线',
  system: 'hellenistic',
  status: 'chart',
} as const;

export { buildAstroChart } from './astroChart';
export type { AstroChart, AstroChartInput, BodyFact, SignAspect } from './astroChart';
export { BODY_KEYS, BODY_NAMES_ZH } from './ephemeris';
