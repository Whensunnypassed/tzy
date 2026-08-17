// ============================================================
//  八字基础数据·查询服务层（接口参考模板）
//
//  设计目的：把 UI / 算法 对「基础数据」的依赖集中在这一层，
//            后续如果接 MySQL / 飞书多维表格 / 服务端 REST，
//            只改本文件内部实现即可，调用方不需要动。
//
//  当前实现：直接 import 本地 bazidata.ts（离线模式）
//  未来可替换：把每个方法内部改成 await fetch('/api/xxx') 即可。
// ============================================================

import { MONTH_QI_EXPANDED, type IMonthQiExt } from '@/data/bazidata';

export interface MonthQiDTO {
  monthBranchIndex: number;
  monthName: string;
  monthPillar: string;
  solarTermRange: string;
  guaXiang: string;
  guaName: string;
  qiJin: string;
  hiddenStemsAndChangSheng: string;
  coreQiJi: string;
  tiYongLunDuan: string;
  yueLingSummary: string;
}

/** 地支 → 藏干列表 + 各自余气/本气标注 */
export interface HiddenStemDTO {
  stem: string;
  /** 本气 / 中气 / 余气 */
  qiType: '本气' | '中气' | '余气';
  /** 分数权重，总和 100% */
  weightPct: number;
}

const HIDDEN_STEMS_FULL: Record<string, HiddenStemDTO[]> = {
  子: [{ stem: '癸', qiType: '本气', weightPct: 100 }],
  丑: [
    { stem: '己', qiType: '本气', weightPct: 60 },
    { stem: '癸', qiType: '余气', weightPct: 20 },
    { stem: '辛', qiType: '中气', weightPct: 20 },
  ],
  寅: [
    { stem: '甲', qiType: '本气', weightPct: 60 },
    { stem: '丙', qiType: '中气', weightPct: 25 },
    { stem: '戊', qiType: '余气', weightPct: 15 },
  ],
  卯: [{ stem: '乙', qiType: '本气', weightPct: 100 }],
  辰: [
    { stem: '戊', qiType: '本气', weightPct: 60 },
    { stem: '乙', qiType: '余气', weightPct: 20 },
    { stem: '癸', qiType: '中气', weightPct: 20 },
  ],
  巳: [
    { stem: '丙', qiType: '本气', weightPct: 60 },
    { stem: '庚', qiType: '中气', weightPct: 25 },
    { stem: '戊', qiType: '余气', weightPct: 15 },
  ],
  午: [
    { stem: '丁', qiType: '本气', weightPct: 75 },
    { stem: '己', qiType: '余气', weightPct: 25 },
  ],
  未: [
    { stem: '己', qiType: '本气', weightPct: 60 },
    { stem: '丁', qiType: '中气', weightPct: 25 },
    { stem: '乙', qiType: '余气', weightPct: 15 },
  ],
  申: [
    { stem: '庚', qiType: '本气', weightPct: 60 },
    { stem: '壬', qiType: '中气', weightPct: 25 },
    { stem: '戊', qiType: '余气', weightPct: 15 },
  ],
  酉: [{ stem: '辛', qiType: '本气', weightPct: 100 }],
  戌: [
    { stem: '戊', qiType: '本气', weightPct: 60 },
    { stem: '辛', qiType: '中气', weightPct: 25 },
    { stem: '丁', qiType: '余气', weightPct: 15 },
  ],
  亥: [
    { stem: '壬', qiType: '本气', weightPct: 75 },
    { stem: '甲', qiType: '余气', weightPct: 25 },
  ],
};

/** 十二长生状态表：[日主天干][地支] → 状态（如：甲 临官 → 寅） */
const CHANG_SHENG_TABLE: Record<string, Record<string, string>> = {
  甲: { 亥: '长生', 子: '沐浴', 丑: '冠带', 寅: '临官', 卯: '帝旺', 辰: '衰', 巳: '病', 午: '死', 未: '墓', 申: '绝', 酉: '胎', 戌: '养' },
  丙: { 寅: '长生', 卯: '沐浴', 辰: '冠带', 巳: '临官', 午: '帝旺', 未: '衰', 申: '病', 酉: '死', 戌: '墓', 亥: '绝', 子: '胎', 丑: '养' },
  戊: { 寅: '长生', 卯: '沐浴', 辰: '冠带', 巳: '临官', 午: '帝旺', 未: '衰', 申: '病', 酉: '死', 戌: '墓', 亥: '绝', 子: '胎', 丑: '养' },
  庚: { 巳: '长生', 午: '沐浴', 未: '冠带', 申: '临官', 酉: '帝旺', 戌: '衰', 亥: '病', 子: '死', 丑: '墓', 寅: '绝', 卯: '胎', 辰: '养' },
  壬: { 申: '长生', 酉: '沐浴', 戌: '冠带', 亥: '临官', 子: '帝旺', 丑: '衰', 寅: '病', 卯: '死', 辰: '墓', 巳: '绝', 午: '胎', 未: '养' },
  乙: { 午: '长生', 巳: '沐浴', 辰: '冠带', 卯: '临官', 寅: '帝旺', 丑: '衰', 子: '病', 亥: '死', 戌: '墓', 酉: '绝', 申: '胎', 未: '养' },
  丁: { 酉: '长生', 申: '沐浴', 未: '冠带', 午: '临官', 巳: '帝旺', 辰: '衰', 卯: '病', 寅: '死', 丑: '墓', 子: '绝', 亥: '胎', 戌: '养' },
  己: { 酉: '长生', 申: '沐浴', 未: '冠带', 午: '临官', 巳: '帝旺', 辰: '衰', 卯: '病', 寅: '死', 丑: '墓', 子: '绝', 亥: '胎', 戌: '养' },
  辛: { 子: '长生', 亥: '沐浴', 戌: '冠带', 酉: '临官', 申: '帝旺', 未: '衰', 午: '病', 巳: '死', 辰: '墓', 卯: '绝', 寅: '胎', 丑: '养' },
  癸: { 卯: '长生', 寅: '沐浴', 丑: '冠带', 子: '临官', 亥: '帝旺', 戌: '衰', 酉: '病', 申: '死', 未: '墓', 午: '绝', 巳: '胎', 辰: '养' },
};

/** 月令数据查询（同步版；未来接入 REST 可改成 async） */
export function queryMonthQi(monthBranchIndex: number): MonthQiDTO | null {
  const raw: IMonthQiExt | undefined = MONTH_QI_EXPANDED[monthBranchIndex];
  if (!raw) return null;
  // 映射成对外稳定的 DTO 字段；如果 bazidata.ts 结构变了，这里只要改映射
  return {
    monthBranchIndex,
    monthName: raw.month,
    monthPillar: deriveMonthPillar(monthBranchIndex),
    solarTermRange: raw.solarTermRange,
    guaXiang: raw.guaXiang,
    guaName: raw.guaName,
    qiJin: raw.qiJin,
    hiddenStemsAndChangSheng: raw.hiddenStemsAndChangSheng,
    coreQiJi: raw.coreQiJi,
    tiYongLunDuan: raw.tiYongLunDuan,
    yueLingSummary: raw.yueLingSummary,
  };
}

/** 地支 → 藏干列表 */
export function queryHiddenStems(branch: string): HiddenStemDTO[] {
  return HIDDEN_STEMS_FULL[branch] || [];
}

/** 日主天干 + 任一地支 → 十二长生状态 */
export function queryChangSheng(dayStem: string, branch: string): string {
  const row = CHANG_SHENG_TABLE[dayStem];
  if (!row) return '';
  return row[branch] || '';
}

/** 月支序 → 对应月柱干支（五虎遁推导，避免依赖 bazidata.ts 字段） */
function deriveMonthPillar(monthBranchIndex: number): string {
  // 这里的 monthBranchIndex 是 MONTH_QI_EXPANDED 的数组下标（0=寅…11=丑）
  // 对应月支：寅(0) 卯(1) 辰(2) 巳(3) 午(4) 未(5) 申(6) 酉(7) 戌(8) 亥(9) 子(10) 丑(11)
  // 对应寅月天干起甲 → 丙寅月柱
  const BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  const STEMS_FOR_YIN_START = ['丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁'];
  return STEMS_FOR_YIN_START[monthBranchIndex] + BRANCHES[monthBranchIndex];
}

/**
 * 【预留·未来接入服务端 API 示例】
 * 如果以后把节气计算 / 月柱判断放到后端，接口参考：
 *
 *     export async function queryMonthPillarBySolarTime(
 *       params: { year: number; month: number; day: number; hour: number; minute: number }
 *     ): Promise<{ monthStem: string; monthBranch: string; monthBranchIndex: number; termName: string }> {
 *       const res = await fetch('/api/bazi/month-pillar', {
 *         method: 'POST', headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify(params),
 *       });
 *       if (!res.ok) throw new Error('服务端月柱查询失败');
 *       return res.json();
 *     }
 */
