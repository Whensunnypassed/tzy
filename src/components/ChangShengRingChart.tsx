import React from 'react';
import type { ChangShengRingResult } from '@/utils/baziAnalyzer';
import { SHI_ER_CHANG_SHENG_CYCLE } from '@/data/baziData';

// ============================================================
// 十二长生环序 · 圆环波动机能图（纯函数旁证渲染层，不改引擎）
// 语义：12 个长生阶段沿圆周顺时针排布（绝为起点、ringIndex 0→11），
//       径向长度 = 该阶段气机分（正→向外、负→向内），圆心为零基准线。
//       峰在帝旺、谷在绝，波动一眼可读；原局所透之干以高亮方块落在其月令落点上。
// 可进化：阶段/分值唯一真源为 baziData.SHI_ER_CHANG_SHENG_CYCLE，本组件只消费、不复制。
// ============================================================

const ELEMENT_COLORS: Record<string, string> = {
  木: '#4A834E',
  火: '#DC4824',
  土: '#B98C31',
  金: '#788491',
  水: '#31669B',
};

const W = 380;
const CX = 190;
const CY = 190;
const R0 = 92; // 零基准半径
const K = 1.55; // 分值 → 像素
const LABEL_R = R0 + 52;

function polar(i: number, radius: number): { x: number; y: number } {
  const a = ((-90 + i * (360 / 12)) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
}

export default function ChangShengRingChart({ ring }: { ring: ChangShengRingResult }) {
  const stages = SHI_ER_CHANG_SHENG_CYCLE.stages;
  const maxAbs = Math.max(...stages.map((s) => Math.abs(s.power)), 1);

  // 12 点气机剖面（固定环序，与具体命盘无关）→ 闭合折线，表现「由弱到强、循环无端」的波动
  const profile = stages.map((s) => polar(s.ringIndex, R0 + s.power * K));
  const profilePath = profile.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  // 同一阶段槽位可能有多个天干 → 沿切向错开，避免相互遮挡
  const bySlot = new Map<number, ChangShengRingResult['entries']>();
  for (const e of ring.entries) {
    const idx = e.ringIndex >= 0 ? e.ringIndex : 0;
    const list = bySlot.get(idx) ?? [];
    list.push(e);
    bySlot.set(idx, list);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${W}`}
      role="img"
      aria-label="十二长生环序圆环图"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {/* 零基准圆（虚线：气机为零） */}
      <circle cx={CX} cy={CY} r={R0} fill="none" stroke="hsl(222 10% 85%)" strokeWidth={1} strokeDasharray="3 3" />

      {/* 12 阶段辐条 + 外环 */}
      {stages.map((s) => {
        const p0 = polar(s.ringIndex, R0);
        const p1 = polar(s.ringIndex, LABEL_R - 10);
        const lp = polar(s.ringIndex, LABEL_R);
        const anchor = Math.abs(lp.x - CX) < 6 ? 'middle' : lp.x > CX ? 'start' : 'end';
        return (
          <g key={s.stage}>
            <line x1={CX} y1={CY} x2={p1.x} y2={p1.y} stroke="hsl(222 12% 92%)" strokeWidth={1} />
            <circle cx={p0.x} cy={p0.y} r={1.6} fill="hsl(222 10% 70%)" />
            <text
              x={lp.x}
              y={lp.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={700}
              fill={s.power >= 18 ? '#2E7654' : s.power <= -12 ? '#E31C29' : 'hsl(222 10% 45%)'}
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {s.stage}
            </text>
          </g>
        );
      })}

      {/* 气机剖面：12 阶段径向长度构成的闭合波动曲线 */}
      <path d={profilePath} fill="rgba(227,28,41,0.045)" stroke="hsl(222 14% 16%)" strokeWidth={1.5} strokeLinejoin="round" />

      {/* 峰值 / 谷值标记（帝旺=峰、绝=谷） */}
      {stages.map((s) => {
        if (s.power !== maxAbs && s.power !== -maxAbs) return null;
        const p = polar(s.ringIndex, R0 + s.power * K);
        const col = s.power > 0 ? '#2E7654' : '#E31C29';
        return (
          <g key={`ext-${s.stage}`}>
            <line x1={p.x} y1={p.y} x2={CX} y2={CY} stroke={col} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
            <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize={9} fontWeight={800} fill={col} style={{ fontFamily: 'var(--font-mono)' }}>
              {s.stage}
            </text>
          </g>
        );
      })}

      {/* 十天干落点：方块 = 该干在本月令的十二长生位置；原局所透高亮 */}
      {[...bySlot.entries()].map(([slot, list]) => {
        const a = ((-90 + slot * (360 / 12)) * Math.PI) / 180;
        const tx = Math.cos(a + Math.PI / 2);
        const ty = Math.sin(a + Math.PI / 2);
        return list.map((e, i) => {
          const off = (i - (list.length - 1) / 2) * 15;
          const rad = R0 + e.power * K;
          const x = CX + rad * Math.cos(a) + tx * off;
          const y = CY + rad * Math.sin(a) + ty * off;
          const col = ELEMENT_COLORS[e.element] ?? '#788491';
          return (
            <g key={e.stem}>
              {e.inChart ? (
                <>
                  <rect x={x - 8} y={y - 8} width={16} height={16} fill={col} stroke="hsl(222 14% 16%)" strokeWidth={1.5} />
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={900} fill="#FFFFFF" style={{ fontFamily: 'var(--font-sans)' }}>
                    {e.stem}
                  </text>
                </>
              ) : (
                <>
                  <rect x={x - 6} y={y - 6} width={12} height={12} fill="#FFFFFF" stroke={col} strokeWidth={1} opacity={0.85} />
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill={col} style={{ fontFamily: 'var(--font-sans)' }}>
                    {e.stem}
                  </text>
                </>
              )}
            </g>
          );
        });
      })}

      {/* 环心：月令标注 */}
      <text x={CX} y={CY - 6} textAnchor="middle" fontSize={13} fontWeight={900} fill="hsl(222 14% 16%)" style={{ fontFamily: 'var(--font-sans)' }}>
        {ring.monthName}
      </text>
      <text x={CX} y={CY + 10} textAnchor="middle" fontSize={9} fontWeight={700} fill="hsl(222 10% 45%)" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
        月令·气机
      </text>
    </svg>
  );
}
