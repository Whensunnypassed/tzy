/**
 * 命局函数场 · 单条函数曲线（渲染层）
 *
 * 模型语义：f(五行) —— 一条函数曲线刻画两仪二气分布。
 *   Z 轴为「阴阳」而非喜忌：阳仪（木、火）在上为正，阴仪（金、水）在下为负，土为太极枢机、恒居中轴。
 *   用/忌 语义只出现在下方「选字」区与用忌模块，避免与轴语义理解重复。
 * 两条线：
 *   实线 = 当前函数 f（原局 + 注入累积）；
 *   虚线 = 理想函数 f* 虚影（用神理想态：助用神、抑忌神）——「本盘应去的方向」，固定参照线。
 *   竖线 = 该五行当前值与理想态的差距：尚差（需补此五行）/ 已超（宜减）。
 * 交互语义：点击任一干支（含原局已含者＝岁运再逢）→
 *   ① 该字以箭头垂直指向其所属五行节点（自身格；所生/所克格的连带变化见节点位移与读数条）；
 *   ② 被作用节点自「原局位置」平滑上移或下降（easeOutCubic 动画）；
 *   ③ 灰虚线方框保留「原来的位置」参照，逐行读数条给出精确值。
 * 全图仅「实线 + 虚影」两条线，不再由注入层堆叠出新曲线；宽度 100% 自适应容器，无横向滚动。
 *
 * 瑞士风约束：全直角、无阴影、无渐变、无 emoji，色彩仅承载语义（阳橙 / 阴靛蓝 / 五行平涂色）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BaZiChart } from '@/utils/baziCalculator';
import type { XiJiMark, YongJiResult } from '@/utils/baziAnalyzer';
import {
  buildMingJuField,
  MINGJU_FIELD_CFG,
  FIELD_ELEMENT_NAMES,
  FIELD_YIN_YANG_LABEL,
  FIELD_YIN_YANG_SIGN,
  type FieldElement,
  type FieldVerdict,
  type InjectKind,
  type MingJuFieldCandidate,
  type MingJuFieldEffect,
} from '@/utils/mingJuFieldModel';

interface MingJuFieldChartProps {
  chart: BaZiChart;
  yongJi: YongJiResult;
}

const MARK_COLOR: Record<XiJiMark, string> = {
  useful: '#2E7654',
  taboo: '#E31C29',
  neutral: '#788491',
};
const MARK_LABEL: Record<XiJiMark, string> = { useful: '用', taboo: '忌', neutral: '中' };
/** 完整称谓：仅用/忌称「神」，中性不称神（避免「中神」这种不通的表述） */
const MARK_TITLE: Record<XiJiMark, string> = { useful: '用神', taboo: '忌神', neutral: '中性' };
const KIND_LABEL: Record<InjectKind, string> = { stem: '干', branch: '支' };

/** 注入字得失结论：吉（助用/制忌）/ 凶（助忌/制用）/ 吉凶互见 / 平 */
const VERDICT_COLOR: Record<FieldVerdict, string> = {
  gain: '#2E7654',
  loss: '#E31C29',
  mixed: '#B98C31',
  flat: '#788491',
};
const VERDICT_SHORT: Record<FieldVerdict, string> = { gain: '吉', loss: '凶', mixed: '杂', flat: '平' };
const VERDICT_TITLE: Record<FieldVerdict, string> = {
  gain: '助用神 / 制忌神 → 吉',
  loss: '助忌神 / 制用神 → 凶',
  mixed: '同一字有助有损，吉凶互见',
  flat: '中性，无明显得失',
};
/** 作用类型：自身 / 生 / 克 */
const EFFECT_LABEL: Record<MingJuFieldEffect['kind'], string> = {
  self: '自身',
  generates: '生',
  controls: '克',
};

/** 五行低饱和平涂色（与页面 ELEMENT_COLORS 同值，仅用于五行名/标签） */
const ELEMENT_COLOR: Record<FieldElement, string> = {
  wood: '#4A834E',
  fire: '#DC4824',
  earth: '#B98C31',
  metal: '#788491',
  water: '#31669B',
};

/** 两仪语义色：阳橙 hsl(28 82% 48%) / 阴靛蓝 hsl(215 55% 38%) */
const YANG_COLOR = '#DD7A16';
const YIN_COLOR = '#2B528F';
const SIGN_COLOR = (sign: number) => (sign > 0 ? YANG_COLOR : sign < 0 ? YIN_COLOR : ELEMENT_COLOR.earth);
const CURVE_COLOR = '#1F2937';
/** 理想 f* 虚影：深青碧，与灰规线/原局灰框/实线均明显区分，专用作「本盘应去方向」参照 */
const IDEAL_COLOR = '#0F766E';
const GHOST_COLOR = '#94A3B8';

const fmt = (n: number) => (n >= 0 ? '+' : '') + Math.round(n * 10) / 10;

// ---------- 画布与坐标系（viewBox 自适应，无固定像素宽） ----------
const VW = 760;
const VH = 400;
const N = 5; // 五行节点数
const PLOT_L = 100;
const PLOT_R = 700;
const Y_ZERO = 190; // z = 0 的屏幕 y
const KZ2 = 20; // 每 1 单位阴阳值的屏幕像素
const MAXINJ = MINGJU_FIELD_CFG.maxInject;

const clampZ = (z: number) => Math.max(-MINGJU_FIELD_CFG.zMax, Math.min(MINGJU_FIELD_CFG.zMax, z));
const xAt = (i: number) => PLOT_L + (i * (PLOT_R - PLOT_L)) / (N - 1);
const yAt = (z: number) => Y_ZERO - clampZ(z) * KZ2;

/** 数值平滑动画：目标值变化时按 easeOutCubic 从当前显示值过渡到新值（只动值，不新增曲线） */
function useAnimatedValues(target: number[], duration = 480): number[] {
  const [display, setDisplay] = useState<number[]>(() => target.slice());
  const fromRef = useRef<number[]>(target.slice());

  useEffect(() => {
    const to = target;
    const from = fromRef.current;
    const changed =
      from.length !== to.length || from.some((v, i) => Math.abs(v - (to[i] ?? 0)) > 1e-4);
    if (!changed) return;
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const next = to.map((v, i) => (from[i] ?? v) + (v - (from[i] ?? v)) * e);
      fromRef.current = next;
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

/** Catmull-Rom → 三次贝塞尔：把 5 个节点连成平滑函数曲线（而非折线） */
function smoothPath(points: Array<{ x: number; y: number }>, tension = 0.16): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) * tension;
    const c1y = p1.y + (p2.y - p0.y) * tension;
    const c2x = p2.x - (p3.x - p1.x) * tension;
    const c2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export default function MingJuFieldChart({ chart, yongJi }: MingJuFieldChartProps) {
  const cfg = MINGJU_FIELD_CFG;
  const [injected, setInjected] = useState<Set<string>>(() => new Set());
  const [hover, setHover] = useState<number | null>(null); // 悬停的五行节点下标

  const field = useMemo(() => buildMingJuField(chart, yongJi, injected), [chart, yongJi, injected]);

  const baseVals = field.base;
  const idealVals = field.ideal;
  const targetVals = useMemo(() => field.layers[field.layers.length - 1].values, [field]);
  const animVals = useAnimatedValues(targetVals);
  const baseDeltaOf = (i: number) => (targetVals[i] ?? 0) - (baseVals[i] ?? 0);
  // 距「用神理想态」的缺口（已折算到该五行自身极性方向）：>0 ＝尚差（需补此五行）、<0 ＝已超（宜减）
  const shortageOf = (i: number) =>
    FIELD_YIN_YANG_SIGN[field.elements[i]] * ((idealVals[i] ?? 0) - (targetVals[i] ?? 0));

  const toggleInject = useCallback((id: string) => {
    setInjected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAXINJ) next.add(id);
      return next;
    });
  }, []);

  const atCap = field.injected.length >= MAXINJ;

  /** 注入字 → 其所属五行节点（注入字作用于该节点，使其上移/下降） */
  const chips = useMemo(() => {
    const stack: Record<number, number> = {};
    return field.injected.map((c) => {
      const ei = field.elements.indexOf(c.element);
      const order = stack[ei] ?? 0;
      stack[ei] = order + 1;
      return { c, ei, order };
    });
  }, [field]);

  if (!chart || !yongJi) return null;

  const stems = field.candidates.filter((c) => c.kind === 'stem');
  const branches = field.candidates.filter((c) => c.kind === 'branch');
  const qi = field.qi;
  const biasLabel = qi.imbalance > 0.05 ? '偏阳' : qi.imbalance < -0.05 ? '偏阴' : '两仪均平';

  const renderChip = (c: MingJuFieldCandidate) => {
    const ec = ELEMENT_COLOR[c.element];
    const mc = MARK_COLOR[c.mark];
    const vc = VERDICT_COLOR[c.verdict];
    const disabled = !c.injected && atCap;
    const effectText = c.effects
      .map((e) => `${EFFECT_LABEL[e.kind]}${FIELD_ELEMENT_NAMES[e.element]} ${fmt(e.axisDelta)}`)
      .join('、');
    return (
      <button
        key={c.id}
        type="button"
        disabled={disabled}
        onClick={() => toggleInject(c.id)}
        title={
          `${c.char}（${KIND_LABEL[c.kind]}·${FIELD_ELEMENT_NAMES[c.element]}·${
            FIELD_YIN_YANG_LABEL[c.element]
          }·此字为${MARK_TITLE[c.mark]}）` +
          (c.inChart ? '原局已含，注入即岁运再逢、此字再加一份名义权重；' : '注入此字；') +
          `作用向量：${effectText}；整字得失：${VERDICT_TITLE[c.verdict]}`
        }
        className="flex items-center gap-1 border px-1.5 py-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground disabled:cursor-not-allowed"
        style={{
          borderRadius: 0,
          borderColor: c.injected ? ec : '#D8DCE2',
          borderWidth: c.injected ? 2 : 1,
          backgroundColor: c.injected ? `${ec}1A` : 'transparent',
          opacity: disabled && !c.injected ? 0.38 : 1,
        }}
      >
        <span
          className="text-[13px] font-black"
          style={{ fontFamily: 'var(--font-sans, sans-serif)', color: '#1F2937' }}
        >
          {c.char}
        </span>
        <span className="label-mono text-[8.5px]" style={{ color: mc }}>
          {MARK_LABEL[c.mark]}
        </span>
        <span className="label-mono text-[8.5px]" style={{ color: ec }}>
          {FIELD_ELEMENT_NAMES[c.element]}
        </span>
        <span
          className="label-mono text-[8.5px] font-black"
          style={{ color: vc, border: `1px solid ${vc}`, padding: '0 2px', borderRadius: 0 }}
          title={VERDICT_TITLE[c.verdict]}
        >
          {VERDICT_SHORT[c.verdict]}
        </span>
        {c.inChart && <span className="label-mono text-[8px] text-muted-foreground">原局</span>}
      </button>
    );
  };

  return (
    <div className="w-full">
      {/* 读数 */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="label-mono text-[9.5px] leading-snug text-muted-foreground">
          X = 五行 ｜ Z = 阴阳：阳仪（木火）在上为正、阴仪（金水）在下为负，土为太极枢机居中轴，满量程 ±{cfg.zMax}
        </span>
        <span className="label-mono case-preserve text-[9.5px] leading-snug text-foreground">
          原局二气　阳仪 w {qi.yangWeight} ／ 阴仪 w {qi.yinWeight} ｜ 差 {fmt(qi.imbalance)}（{biasLabel}）｜
          理想 f* 按用忌定标（用神上浮 / 忌神抑低，两仪均值 w {qi.averageYiWeight}）｜ 已注入 {field.injected.length} 字 ｜ 注入沿五行生克传导（λ {cfg.shengKeCoupling}）
        </span>
      </div>

      {/* 逐行读数：原局 f₀ → 当前 f → 理想 f*（用神理想态）→ 尚差 / 已超 */}
      <div className="mb-3 grid grid-cols-5 border border-border" style={{ borderRadius: 0 }}>
        {field.elements.map((el, i) => {
          const b = baseVals[i] ?? 0;
          const c = targetVals[i] ?? 0;
          const id = idealVals[i] ?? 0;
          const sh = shortageOf(i);
          const ec = ELEMENT_COLOR[el as FieldElement];
          const sc = sh > cfg.deltaEps ? SIGN_COLOR(FIELD_YIN_YANG_SIGN[el as FieldElement]) : GHOST_COLOR;
          const isPivot = field.elements[i] === 'earth';
          return (
            <div
              key={el}
              className="px-2 py-1.5"
              style={{ borderRight: i < field.elements.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <div className="flex items-baseline gap-1">
                <span className="text-[12px] font-black" style={{ color: ec }}>
                  {field.elementNames[i]}
                </span>
                <span className="label-mono text-[8.5px] text-muted-foreground">原局 {fmt(b)}</span>
              </div>
              {isPivot ? (
                <div className="mt-0.5 label-mono case-preserve text-[9px] text-muted-foreground">
                  太极枢机 · 恒居中轴（w {Math.round(field.elementWeights.earth * 10) / 10}）
                </div>
              ) : (
                <>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="label-mono case-preserve text-[9px] text-foreground">→ {fmt(c)}</span>
                    <span className="label-mono text-[8.5px] text-muted-foreground">理想 {fmt(id)}</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="label-mono case-preserve text-[9px] font-black" style={{ color: sc }}>
                      {sh > cfg.deltaEps ? `尚差 ${fmt(sh)}` : sh < -cfg.deltaEps ? `已超 ${fmt(-sh)}` : '已达理想'}
                    </span>
                    {Math.abs(baseDeltaOf(i)) > cfg.deltaEps && (
                      <span className="label-mono case-preserve text-[8.5px] text-muted-foreground">
                        （注入 {fmt(baseDeltaOf(i))}）
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 函数曲线（实线当前 + 虚线理想虚影；宽度自适应，无横向滚动） */}
      <div className="relative w-full" style={{ aspectRatio: `${VW} / ${VH}` }}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', width: '100%', height: '100%' }}
          role="img"
          aria-label="命局函数曲线（阴阳轴 + 理想虚影）"
        >
          {/* 阳区 / 阴区底纹（承载两仪语义，避免给曲线涂色） */}
          <rect x={PLOT_L - 12} y={yAt(cfg.zMax)} width={PLOT_R - PLOT_L + 24} height={Y_ZERO - yAt(cfg.zMax)} fill="rgba(221,122,22,0.045)" />
          <rect x={PLOT_L - 12} y={Y_ZERO} width={PLOT_R - PLOT_L + 24} height={yAt(-cfg.zMax) - Y_ZERO} fill="rgba(43,82,143,0.045)" />

          {/* 横向网格 + 纵向节点导轨 */}
          {[6, 4, 2, -2, -4, -6].map((zv) => (
            <line key={`gh-${zv}`} x1={PLOT_L - 8} y1={yAt(zv)} x2={PLOT_R + 8} y2={yAt(zv)} stroke="#E5E7EB" strokeWidth={1} />
          ))}
          {field.elements.map((_, i) => (
            <line key={`gv-${i}`} x1={xAt(i)} y1={yAt(cfg.zMax)} x2={xAt(i)} y2={yAt(-cfg.zMax)} stroke="#EEF1F4" strokeWidth={1} />
          ))}

          {/* z 轴刻度 + 阴阳轴名 */}
          <line x1={PLOT_L - 8} y1={yAt(cfg.zMax)} x2={PLOT_L - 8} y2={yAt(-cfg.zMax)} stroke={GHOST_COLOR} strokeWidth={1} />
          {[6, 4, 2, 0, -2, -4, -6].map((zv) => (
            <text
              key={`zt-${zv}`}
              x={PLOT_L - 14}
              y={yAt(zv) + 3.5}
              textAnchor="end"
              fontSize="10"
              fontWeight="800"
              fill={zv === 0 ? '#3A4450' : GHOST_COLOR}
              style={{ fontFamily: 'var(--font-mono, monospace)' }}
            >
              {zv > 0 ? `+${zv}` : `${zv}`}
            </text>
          ))}
          <text
            x={PLOT_L - 14}
            y={yAt(cfg.zMax) - 22}
            textAnchor="end"
            fontSize="9.5"
            fontWeight="800"
            fill={GHOST_COLOR}
            style={{ fontFamily: 'var(--font-mono, monospace)' }}
          >
            z 阴阳
          </text>
          <text
            x={PLOT_L - 14}
            y={yAt(cfg.zMax) - 9}
            textAnchor="end"
            fontSize="9.5"
            fontWeight="900"
            fill={YANG_COLOR}
            style={{ fontFamily: 'var(--font-mono, monospace)' }}
          >
            阳仪 ↑
          </text>
          <text
            x={PLOT_L - 14}
            y={yAt(-cfg.zMax) + 18}
            textAnchor="end"
            fontSize="9.5"
            fontWeight="900"
            fill={YIN_COLOR}
            style={{ fontFamily: 'var(--font-mono, monospace)' }}
          >
            阴仪 ↓
          </text>

          {/* 理想 f* 图内图例（补足「颜色身份」，避免与灰规线混淆） */}
          <g>
            <line x1={PLOT_L + 8} y1={26} x2={PLOT_L + 30} y2={26} stroke={IDEAL_COLOR} strokeWidth={1.8} strokeDasharray="7 5" strokeLinecap="round" />
            <text x={PLOT_L + 36} y={29.5} fontSize="9.5" fontWeight="900" fill={IDEAL_COLOR} style={{ fontFamily: 'var(--font-mono, monospace)' }}>
              理想 f*（用神目标 · 固定参照）
            </text>
          </g>

          {/* z = 0 基准线（太极枢机所在） */}
          <line x1={PLOT_L - 8} y1={yAt(0)} x2={PLOT_R + 8} y2={yAt(0)} stroke="#3A4450" strokeWidth={1.4} />

          {/* 理想函数虚影 f*（用神理想态 · 本盘应去方向）；先画，使实线压在其上 */}
          <path d={smoothPath(field.elements.map((_, i) => ({ x: xAt(i), y: yAt(idealVals[i] ?? 0) })))} fill="none" stroke={IDEAL_COLOR} strokeWidth={2} strokeDasharray="7 5" strokeLinecap="round" />
          {field.elements.map((_, i) => {
            if (field.elements[i] === 'earth') return null;
            const y = yAt(idealVals[i] ?? 0);
            return (
              <rect
                key={`id-${i}`}
                x={xAt(i) - 4}
                y={y - 4}
                width={8}
                height={8}
                fill="#FFFFFF"
                stroke={IDEAL_COLOR}
                strokeWidth={1.3}
                strokeDasharray="2.5 2"
              />
            );
          })}

          {/* 原局位置参照（灰虚线方框 + 细虚线连接），不画第二条实线 */}
          {field.elements.map((_, i) => {
            const d = baseDeltaOf(i);
            if (Math.abs(d) <= cfg.deltaEps) return null;
            const gy = yAt(baseVals[i]);
            const ny = yAt(animVals[i] ?? 0);
            return (
              <g key={`ghost-${i}`}>
                <line x1={xAt(i)} y1={gy} x2={xAt(i)} y2={ny} stroke={GHOST_COLOR} strokeWidth={1} strokeDasharray="2 3" />
                <rect
                  x={xAt(i) - 3.2}
                  y={gy - 3.2}
                  width={6.4}
                  height={6.4}
                  fill="none"
                  stroke={GHOST_COLOR}
                  strokeWidth={1.2}
                  strokeDasharray="2.5 2"
                />
              </g>
            );
          })}

          {/* 当前值与理想 f* 的缺口竖线（尚差＝该五行仍需补 / 已超＝宜减）；两仪色标缺口、灰色标已足 */}
          {field.elements.map((_, i) => {
            const sh = shortageOf(i);
            if (Math.abs(sh) <= cfg.deltaEps) return null;
            const iy = yAt(idealVals[i] ?? 0);
            const cy = yAt(animVals[i] ?? 0);
            const needMore = sh > 0;
            const col = needMore ? SIGN_COLOR(FIELD_YIN_YANG_SIGN[field.elements[i]]) : GHOST_COLOR;
            const lx = i >= 3 ? xAt(i) - 8 : xAt(i) + 8;
            const anchor = i >= 3 ? 'end' : 'start';
            return (
              <g key={`gap-${i}`}>
                <line x1={xAt(i)} y1={iy} x2={xAt(i)} y2={cy} stroke={col} strokeWidth={2} />
                <text
                  x={lx}
                  y={(iy + cy) / 2 + 3.5}
                  textAnchor={anchor}
                  fontSize="10"
                  fontWeight="800"
                  fill={col}
                  style={{ fontFamily: 'var(--font-mono, monospace)' }}
                >
                  {needMore ? `尚差 ${fmt(sh)}` : `已超 ${fmt(-sh)}`}
                </text>
              </g>
            );
          })}

          {/* 当前函数 f（实线，唯一一条） */}
          <path d={smoothPath(field.elements.map((_, i) => ({ x: xAt(i), y: yAt(animVals[i] ?? 0) })))} fill="none" stroke={CURVE_COLOR} strokeWidth={2.4} strokeLinecap="round" />

          {/* 当前节点（阳仪橙 / 阴仪靛蓝 / 枢机土色） */}
          {field.elements.map((el, i) => {
            const s = 4.4;
            return (
              <rect
                key={`nd-${i}`}
                x={xAt(i) - s}
                y={yAt(animVals[i] ?? 0) - s}
                width={s * 2}
                height={s * 2}
                fill={SIGN_COLOR(FIELD_YIN_YANG_SIGN[el as FieldElement])}
                stroke="#FFFFFF"
                strokeWidth={1.4}
              />
            );
          })}

          {/* 注入字：自标签垂直指向其所属五行节点（自身格）；所生/所克格的连带变化见节点位移、读数条与悬停提示 */}
          {chips.map(({ c, ei, order }) => {
            const nodeY = yAt(animVals[ei] ?? 0);
            const chipY = nodeY - 24 - order * 22;
            const cx = xAt(ei);
            const col = SIGN_COLOR(FIELD_YIN_YANG_SIGN[c.element]);
            const startY = chipY + 8;
            const endY = nodeY - 9; // 箭头止于节点上缘
            const selfDelta = c.effects.find((e) => e.kind === 'self')?.axisDelta ?? c.contribution;
            return (
              <g key={`inj-${c.id}`}>
                <line x1={cx} y1={startY} x2={cx} y2={endY - 6} stroke={col} strokeWidth={1.6} opacity={0.9} />
                <polygon points={`${cx},${endY} ${cx - 3.6},${endY - 7} ${cx + 3.6},${endY - 7}`} fill={col} />
                <text
                  x={cx + 7}
                  y={(startY + endY) / 2 + 3}
                  textAnchor="start"
                  fontSize="9"
                  fontWeight="800"
                  fill={col}
                  style={{ fontFamily: 'var(--font-mono, monospace)' }}
                >
                  {fmt(selfDelta)}
                </text>
                {/* 注入字标签（含 吉/凶/杂/平 得失徽章） */}
                <rect
                  x={cx - 20}
                  y={chipY - 8}
                  width={40}
                  height={16}
                  fill={`${ELEMENT_COLOR[c.element]}1A`}
                  stroke={ELEMENT_COLOR[c.element]}
                  strokeWidth={1.6}
                />
                <text x={cx - 6} y={chipY + 4} textAnchor="middle" fontSize="12" fontWeight="900" fill="#1F2937" style={{ fontFamily: 'var(--font-sans, sans-serif)' }}>
                  {c.char}
                </text>
                <text x={cx + 13} y={chipY + 4} textAnchor="middle" fontSize="10.5" fontWeight="900" fill={VERDICT_COLOR[c.verdict]} style={{ fontFamily: 'var(--font-sans, sans-serif)' }}>
                  {VERDICT_SHORT[c.verdict]}
                </text>
              </g>
            );
          })}

          {/* 五行名（底部，按五行平涂色） + 当前值 */}
          {field.elements.map((el, i) => (
            <g key={`lb-${i}`}>
              <text
                x={xAt(i)}
                y={356}
                textAnchor="middle"
                fontSize="13"
                fontWeight="900"
                fill={ELEMENT_COLOR[el as FieldElement]}
                style={{ fontFamily: 'var(--font-sans, sans-serif)' }}
              >
                {field.elementNames[i]}
              </text>
              <text
                x={xAt(i)}
                y={372}
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                fill="#3A4450"
                style={{ fontFamily: 'var(--font-mono, monospace)' }}
              >
                {fmt(targetVals[i] ?? 0)}
              </text>
            </g>
          ))}

          {/* 悬停热区 */}
          {field.elements.map((_, i) => (
            <rect
              key={`hz-${i}`}
              x={xAt(i) - 13}
              y={yAt(animVals[i] ?? 0) - 13}
              width={26}
              height={26}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            />
          ))}
        </svg>

        {/* 悬浮提示 */}
        {hover !== null && (
          <div
            className="pointer-events-none absolute z-10 border border-border bg-card p-2"
            style={{
              left: xAt(hover) > VW - 230 ? undefined : `${(xAt(hover) / VW) * 100}%`,
              right: xAt(hover) > VW - 230 ? `${((VW - xAt(hover)) / VW) * 100}%` : undefined,
              top: 4,
              borderRadius: 0,
              maxWidth: 240,
            }}
          >
            <div className="label-mono case-preserve text-[9.5px] font-black text-foreground">
              五行 {field.elementNames[hover]} · {FIELD_YIN_YANG_LABEL[field.elements[hover]]}
            </div>
            <div className="mt-0.5 label-mono case-preserve text-[9.5px] text-foreground">
              原局 f₀ {fmt(baseVals[hover] ?? 0)} → 当前 {fmt(targetVals[hover] ?? 0)}
            </div>
            <div className="label-mono case-preserve text-[9.5px] text-foreground">
              理想 f* {fmt(idealVals[hover] ?? 0)} ｜{' '}
              {shortageOf(hover) > cfg.deltaEps
                ? `尚差 ${fmt(shortageOf(hover))}`
                : shortageOf(hover) < -cfg.deltaEps
                  ? `已超 ${fmt(-shortageOf(hover))}`
                  : '已达理想'}
            </div>
            {(() => {
              const hits = field.injected
                .map((c) => ({
                  c,
                  eff: c.effects.find((e) => e.element === field.elements[hover] && e.kind !== 'self'),
                }))
                .filter((x) => x.eff && Math.abs(x.eff.axisDelta) > cfg.deltaEps);
              if (hits.length === 0) return null;
              return (
                <div className="mt-1 border-t border-border pt-1">
                  <div className="label-mono text-[9px] text-muted-foreground">注入影响（生克传导）</div>
                  {hits.map(({ c, eff }) => (
                    <div
                      key={c.id}
                      className="label-mono text-[9.5px]"
                      style={{ color: SIGN_COLOR(FIELD_YIN_YANG_SIGN[eff!.element]) }}
                    >
                      {c.char} {EFFECT_LABEL[eff!.kind]}{FIELD_ELEMENT_NAMES[eff!.element]} {fmt(eff!.axisDelta)}
                    </div>
                  ))}
                </div>
              );
            })()}
            {field.sources.filter((s) => s.element === field.elements[hover]).length > 0 && (
              <div className="mt-1 border-t border-border pt-1">
                <div className="label-mono text-[9px] text-muted-foreground">原局来源字（用/忌见逐字表）</div>
                {field.sources
                  .filter((s) => s.element === field.elements[hover])
                  .map((s) => (
                    <div key={s.id} className="label-mono text-[9.5px]" style={{ color: MARK_COLOR[s.mark] }}>
                      {s.pillarKey}
                      {s.kind === 'stem' ? '干' : s.kind === 'branch' ? '支' : '藏'} {s.char} · {MARK_LABEL[s.mark]} · w{' '}
                      {Math.round(s.weight * 10) / 10}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2" style={{ borderColor: CURVE_COLOR }} />
          <span className="label-mono case-preserve text-[9.5px] text-muted-foreground">实线 = 当前函数 f(五行)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: IDEAL_COLOR }} />
          <span className="label-mono case-preserve text-[9.5px] text-muted-foreground">
            虚线 = 理想函数 f*（用神理想态 · 本盘应去方向，固定参照）
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 border border-dashed" style={{ borderColor: GHOST_COLOR, borderRadius: 0 }} />
          <span className="label-mono case-preserve text-[9.5px] text-muted-foreground">
            灰虚方框 = 该节点原局位置 f₀
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-0 border-l-2" style={{ borderColor: YANG_COLOR }} />
          <span className="label-mono case-preserve text-[9.5px] text-muted-foreground">
            竖线 = 当前值与理想 f* 的缺口（两仪色＝尚差、仍需补 / 灰＝已超、宜减）
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2" style={{ borderColor: YIN_COLOR }} />
          <span className="label-mono case-preserve text-[9.5px] text-muted-foreground">
            注入字箭头 = 该字垂直指向其所属五行节点；所生/所克格的连带变化见读数条与悬停提示
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 border-2" style={{ borderColor: '#2E7654', borderRadius: 0 }} />
          <span className="label-mono case-preserve text-[9.5px] text-muted-foreground">
            注入字得失徽章：吉（助用/制忌）/ 凶（助忌/制用）/ 杂（吉凶互见）/ 平 —— 因本盘用忌而异
          </span>
        </span>
      </div>

      {/* 注入选择器：22 字全可选，原局已含者标「原局」＝岁运再逢 */}
      <div className="mt-3 border-t border-border pt-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="label-mono case-preserve text-[9.5px] text-muted-foreground">
            加入干支（十天干 / 十二地支全部可注入；标「原局」者＝该字原局已含，注入同于岁运再逢、再加一份名义权重）· 点击后该字以其所属五行节点上的箭头带动曲线，并按五行生克联动相邻格（生＝加、克＝减）；得失徽章随本盘用忌而异
          </span>
          <span className="label-mono text-[9.5px] text-muted-foreground">
            已注入 {field.injected.length}/{MAXINJ}
          </span>
        </div>

        <div className="space-y-1.5">
          {(
            [
              ['天干', stems],
              ['地支', branches],
            ] as const
          ).map(([label, list]) => (
            <div key={label} className="flex flex-wrap items-center gap-1">
              <span className="label-mono mr-1 w-8 shrink-0 text-[9.5px] font-black text-muted-foreground">{label}</span>
              {list.map(renderChip)}
            </div>
          ))}
        </div>

        {/* 已注入字 */}
        {field.injected.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
            <span className="label-mono text-[9.5px] font-black text-muted-foreground">注入序列</span>
            {field.injected.map((c, i) => {
              const ec = ELEMENT_COLOR[c.element];
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleInject(c.id)}
                  title={`移除 ${c.char}；作用向量：${c.effects
                    .map((e) => `${EFFECT_LABEL[e.kind]}${FIELD_ELEMENT_NAMES[e.element]} ${fmt(e.axisDelta)}`)
                    .join('、')}；整字得失：${VERDICT_TITLE[c.verdict]}`}
                  className="flex items-center gap-1 border-2 px-1.5 py-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground"
                  style={{ borderRadius: 0, borderColor: ec, backgroundColor: `${ec}1A` }}
                >
                  <span className="label-mono text-[8px] text-muted-foreground">{i + 1}</span>
                  <span
                    className="text-[12px] font-black"
                    style={{ fontFamily: 'var(--font-sans, sans-serif)', color: '#1F2937' }}
                  >
                    {c.char}
                  </span>
                  <span className="label-mono text-[8.5px] font-black" style={{ color: VERDICT_COLOR[c.verdict] }}>
                    {VERDICT_SHORT[c.verdict]}
                  </span>
                  <span className="label-mono case-preserve text-[8.5px] text-muted-foreground">
                    {c.effects
                      .map((e) => `${EFFECT_LABEL[e.kind]}${FIELD_ELEMENT_NAMES[e.element]}${fmt(e.axisDelta)}`)
                      .join(' ')}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setInjected(new Set())}
              className="label-mono ml-1 text-[9.5px] font-black text-primary underline-offset-2 hover:underline"
            >
              清空注入
            </button>
          </div>
        )}

        <div className="mt-2 label-mono case-preserve text-[9px] leading-relaxed text-muted-foreground">
          曲线阴阳由五行定（木火阳仪 / 金水阴仪 / 土枢机），用忌 见选字区与用忌模块；理想虚影＝用神理想态（助用神、抑忌神），不随注入变化。
        </div>
      </div>

      {/* 提示 */}
      {field.warnings.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {field.warnings.map((w) => (
            <div key={w} className="label-mono text-[9.5px] text-muted-foreground">
              · {w}
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 label-mono case-preserve text-[9px] text-muted-foreground">
        模型 {field.version} · 纯函数旁证层 · 不参与评分与九档评级
      </div>
    </div>
  );
}
