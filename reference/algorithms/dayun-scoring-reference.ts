// ============================================================
//  大运总判·评分算法参考版（独立于主代码，带详细注释）
//
//  核心公式（2026-08-17 更新）：
//    大运总得分 = 大运本身分数 + 下辖十年流年平均分
//
//  计算口径：
//    ① 先把 rawScore（满分≈±50）压缩为 压缩分（÷3.6）
//    ② 大运压缩分 + 十年流年平均压缩分 = 最终压缩分
//    ③ 最终压缩分 × 3.6 = 还原 rawScore，再映射五档
//  这么做避免 rawScore 直接相加时数值过大，导致五档映射失真。
//
//  说明：本文件是「算法参考实现」，不参与生产打包。
//        生产代码位置：src/utils/baziAnalyzer.ts → daYunBase
// ============================================================

export type WuDangLevel = '夯' | '人上人' | 'npc' | '拉' | '拉完了';

export interface WuDangResult {
  level: WuDangLevel;
  band: string;
  /** 压缩分（展示给用户用的小分值） */
  displayScore: number;
}

// —— 基础：把 rawScore 映射成 displayScore + 五档 ——
// 这里的实现和 src/utils/baziAnalyzer.ts 的 wuDangFromScore() 保持一致
export function wuDangFromScore(rawScore: number): WuDangResult {
  const displayScore = Math.round((rawScore / 3.6) * 10) / 10;
  let level: WuDangLevel;
  if (displayScore > 5) level = '夯';
  else if (displayScore > 2) level = '人上人';
  else if (displayScore >= -2) level = 'npc';
  else if (displayScore >= -8) level = '拉';
  else level = '拉完了';

  const band: Record<WuDangLevel, string> = {
    夯: '大吉之运：气机鼎盛、夯实到底，可成大事',
    人上人: '吉运：事业台阶明显向上，助缘深厚',
    npc: '平常运：无功无过，稳中求进即可',
    拉: '凶运：加剧偏枯或逆月令喜用，宜守不宜攻',
    拉完了: '大凶之运：用神被彻底压制，最宜韬光养晦、切不可妄动',
  };
  return { level, band: band[level], displayScore };
}

// —— 输入数据结构 ——
export interface GanZhiScoreLike {
  stem: string;
  branch: string;
  /** 由 scoreGanZhiImpact 算出的原始分（≈ ±26） */
  rawScore: number;
}

export interface DaYunInput extends GanZhiScoreLike {
  index: number;
  startAge: number;
  startYear: number;
  endYear: number;
}

export interface LiuNianInput extends GanZhiScoreLike {
  year: number;
}

// —— 核心：计算大运总判（新口径） ——
export interface DaYunBaseOutput {
  rawScore: number;
  dyCompress: number;
  liuNianAvgCompress: number;
  finalCompress: number;
  level: WuDangLevel;
  band: string;
  displayScore: number;
  /** UI Top 作用明细里额外添加的两行 */
  scoringBreakdown: {
    dyItem: string;
    avgItem: string;
  };
}

export function computeDaYunBaseNew(
  dy: DaYunInput,
  liuNian10: LiuNianInput[],
): DaYunBaseOutput {
  // ① 大运本身压缩分
  const dyCompress = dy.rawScore / 3.6;

  // ② 十年流年平均压缩分
  const sumLnCompress = liuNian10.reduce((sum, ln) => sum + ln.rawScore / 3.6, 0);
  const liuNianAvgCompress = liuNian10.length > 0 ? sumLnCompress / liuNian10.length : 0;

  // ③ 压缩分相加 → 再乘回 3.6 还原 → 进入 wuDangFromScore
  const finalCompress = dyCompress + liuNianAvgCompress;
  const rawScore = finalCompress * 3.6;

  const base = wuDangFromScore(rawScore);

  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    rawScore,
    dyCompress: round1(dyCompress),
    liuNianAvgCompress: round1(liuNianAvgCompress),
    finalCompress: round1(finalCompress),
    level: base.level,
    band: base.band,
    displayScore: base.displayScore,
    scoringBreakdown: {
      dyItem: `大运本身分 ${dyCompress >= 0 ? '+' : ''}${round1(dyCompress)}（${dy.stem}${dy.branch}作用）`,
      avgItem: `下辖十年平均 ${liuNianAvgCompress >= 0 ? '+' : ''}${round1(liuNianAvgCompress)}（${liuNian10.length}年流年平均分）`,
    },
  };
}

// —— 简易自检（仅在 Node.js 直跑时生效） ——
if (typeof require !== 'undefined' && require.main === module) {
  const fakeDY: DaYunInput = {
    index: 0, startAge: 10, startYear: 1990, endYear: 1999,
    stem: '甲', branch: '寅', rawScore: 3.6, // 压缩分 = +1
  };
  const fakeLiuNian: LiuNianInput[] = Array.from({ length: 10 }, (_, i) => ({
    year: 1990 + i, stem: '甲', branch: '子', rawScore: 7.2, // 每流年压缩分 = +2
  }));
  const out = computeDaYunBaseNew(fakeDY, fakeLiuNian);
  console.log('[dayun-scoring-reference] 样例输出：');
  console.log('  大运本身压缩分 +1，十年平均压缩分 +2，最终压缩分 +3 → 期望 level 人上人');
  console.log('  实际：', JSON.stringify(out, null, 2));
}
