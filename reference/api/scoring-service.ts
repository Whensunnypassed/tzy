// ============================================================
//  评分/排盘 统一服务入口（接口参考模板）
//
//  定位：对外提供「一个排盘 → 得到全部分析结果」的稳定接口。
//        UI 组件、CLI 脚本、未来的 REST API，都直接调用本文件。
//        内部再去组装 baziCalculator + tianzhiyiAnalyzer + solarTermsCalc。
//
//  优势：
//    ① 内部算法重构不影响调用方（所有调用方只依赖本文件 4 个方法）
//    ② 方便做缓存/去重：同出生信息命中缓存直接返回
//    ③ 方便替换实现：接服务端 REST 只要改内部实现
//
//  说明：当前实现直连本地算法（离线模式可跑）。
// ============================================================

import { calculateBaZi, type BaZiChart } from '@/utils/baziCalculator';
import {
  analyzeTianZhiYi,
  type ITianZhiYiReport,
} from '@/utils/tianzhiyiAnalyzer';

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: '男' | '女';
  /** 姓名/备注，仅用于展示 */
  name?: string;
  /** 是否使用真太阳时校正（默认 true） */
  trueSolarAdjust?: boolean;
}

export interface BaZiFullReport {
  /** 基础排盘信息（四柱、藏干、十神等） */
  chart: BaZiChart;
  /** 天易分析报告（月气、用神、命局模式、大运/流年、太极…） */
  tianZhiYi: ITianZhiYiReport;
  /** 本次排盘请求的唯一标识（可用于缓存） */
  requestId: string;
  /** 生成时间 ISO string */
  generatedAt: string;
}

// —— 简易内存缓存（同出生信息，1 小时内复用）——
interface CacheEntry {
  report: BaZiFullReport;
  expireAt: number;
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 小时

function birthKey(p: BirthInput): string {
  const adj = p.trueSolarAdjust ? 1 : 0;
  return `${p.year}-${p.month}-${p.day}-${p.hour}-${p.minute}-${p.gender}-${adj}`;
}

/**
 * 【主入口】根据出生信息生成完整八字分析报告。
 *
 * 使用示例：
 *   const report = await analyzeFull({
 *     year: 1969, month: 11, day: 7, hour: 22, minute: 10, gender: '男',
 *   });
 *   console.log('月柱：', report.chart.monthPillar.stem + report.chart.monthPillar.branch);
 *   console.log('当前大运五档：', report.tianZhiYi.currentDaYunDetail);
 */
export async function analyzeFull(input: BirthInput): Promise<BaZiFullReport> {
  const key = birthKey(input);
  const cached = CACHE.get(key);
  if (cached && cached.expireAt > Date.now()) {
    return cached.report;
  }

  const trueSolar = input.trueSolarAdjust !== false;
  // ① 基础排盘（内部已精确按节气时刻判断月柱）
  const chart: BaZiChart = calculateBaZi({
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    gender: input.gender,
    trueSolar,
  } as any);

  // ② 天易分析（含大运/流年评分、用神、太极、月气……）
  const tianZhiYi: ITianZhiYiReport = analyzeTianZhiYi(chart, new Date().getFullYear());

  const report: BaZiFullReport = {
    chart,
    tianZhiYi,
    requestId: `${key}-${Date.now().toString(36)}`,
    generatedAt: new Date().toISOString(),
  };

  CACHE.set(key, { report, expireAt: Date.now() + CACHE_TTL_MS });
  return report;
}

/**
 * 【子方法】仅重算大运曲线指定步（不重排全盘，性能更好）
 * @param requestId 已生成报告的 requestId
 * @param daYunIndex 第几步大运（0-based）
 */
export function getDaYunCurveByIndex(
  prevReport: BaZiFullReport,
  daYunIndex: number,
) {
  const daYunList = prevReport.tianZhiYi.daYun || [];
  const target = daYunList[daYunIndex];
  if (!target) return null;
  return {
    label: `${target.stem}${target.branch}运 · ${target.startAge}-${target.startAge + 9}岁（${target.startYear}-${target.endYear}年）`,
    liuNian10: target.liuNian10 || [],
    level: target.level,
    displayScore: target.displayScore,
    topReasons: target.topReasons || [],
    band: target.band,
  };
}

/**
 * 【预留·未来服务端调用参考】
 *
 *     export async function analyzeFullRemote(input: BirthInput): Promise<BaZiFullReport> {
 *       const res = await fetch('/api/bazi/analyze', {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify(input),
 *       });
 *       if (!res.ok) throw new Error(`服务端排盘失败 HTTP ${res.status}`);
 *       return res.json();
 *     }
 */
