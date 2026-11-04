/**
 * 推步线 · L0 常气层（先验曲线）
 *
 * 依据：《周易》十二消息卦——子复、丑临、寅泰、卯大壮、辰夬、巳乾、
 * 午姤、未遁、申否、酉观、戌剥、亥坤。
 *
 * 阳爻数即阳量（0–6），阴爻数即阴量（0–6），二者恒和为 6。
 * 每月建对应一个锚点，月内按线性插值；斜率取「到下一锚点」的差分。
 *
 * 边界：先验只作归一化分母与残差参照，**不作断语、不进吉凶总分**。
 */

/** 月建（节气月）地支，寅=立春起。 */
export const TERM_MONTHS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export type TermMonth = (typeof TERM_MONTHS)[number];

/** 十二消息卦：月建、卦名、阳爻数、阴爻数。 */
export const MESSAGE_GUA: ReadonlyArray<readonly [TermMonth, string, number, number]> = [
  ['子', '复', 1, 5],
  ['丑', '临', 2, 4],
  ['寅', '泰', 3, 3],
  ['卯', '大壮', 4, 2],
  ['辰', '夬', 5, 1],
  ['巳', '乾', 6, 0],
  ['午', '姤', 5, 1],
  ['未', '遁', 4, 2],
  ['申', '否', 3, 3],
  ['酉', '观', 2, 4],
  ['戌', '剥', 1, 5],
  ['亥', '坤', 0, 6],
];

export const PRIOR_TOTAL = 6;

export interface PriorAnchor {
  /** 月建地支 */
  termMonth: TermMonth;
  /** 消息卦名 */
  gua: string;
  /** 阳量 0–6 */
  yangQty: number;
  /** 阴量 0–6 */
  yinQty: number;
  /** 到下一锚点的阳量月差分（+1 进 / -1 退） */
  dYangPerMonth: number;
}

export interface PriorSample {
  termMonth: TermMonth;
  /** 月内进度 0–1（0=节，1=下月节） */
  progress: number;
  yangQty: number;
  yinQty: number;
  dYangPerMonth: number;
}

export interface PriorCurve {
  anchors: PriorAnchor[];
  /** 取某月建、某进度的先验读数（线性插值） */
  at: (termMonth: TermMonth, progress: number) => PriorSample;
  /** 取某月建的锚点 */
  anchorOf: (termMonth: TermMonth) => PriorAnchor;
}

function isTermMonth(value: string): value is TermMonth {
  return (TERM_MONTHS as readonly string[]).includes(value);
}

/** 构造完整先验曲线。未传参时返回标准十二锚点。 */
export function buildPriorCurve(): PriorCurve {
  const anchors: PriorAnchor[] = MESSAGE_GUA.map(([termMonth, gua, yangQty, yinQty], index) => {
    const next = MESSAGE_GUA[(index + 1) % MESSAGE_GUA.length];
    return { termMonth, gua, yangQty, yinQty, dYangPerMonth: next[2] - yangQty };
  });

  const anchorOf = (termMonth: TermMonth): PriorAnchor => {
    const found = anchors.find((item) => item.termMonth === termMonth);
    if (!found) throw new Error(`未知月建：${String(termMonth)}`);
    return found;
  };

  const at = (termMonth: TermMonth, progress: number): PriorSample => {
    if (!isTermMonth(termMonth)) throw new Error(`未知月建：${String(termMonth)}`);
    const clamp = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
    const anchor = anchorOf(termMonth);
    const delta = anchor.dYangPerMonth * clamp;
    return {
      termMonth,
      progress: clamp,
      yangQty: anchor.yangQty + delta,
      yinQty: PRIOR_TOTAL - (anchor.yangQty + delta),
      dYangPerMonth: anchor.dYangPerMonth,
    };
  };

  return { anchors, at, anchorOf };
}

/** 单例：引擎内只走这一份先验。 */
export const PRIOR = buildPriorCurve();
