import React, { Fragment, useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

import {
  calculateBaZi,
  type BaZiChart,
  type Pillar,
  STEMS,
  BRANCHES,
  MONTH_BRANCHES,
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  STEM_YINYANG,
  BRANCH_YINYANG,
  HIDDEN_STEMS,
  getShiShen,
} from '@/utils/baziCalculator';
import {
  analyzeMonthQi,
  analyzeYongJi,
  calculateElementPower,
  analyzeMingJuPattern,
  analyzeWealthNobility,
  scoreMingPan,
  analyzeDaYunLiuNian,
  calculateYinYangBalance,
  calculateColdHotBalance,
  analyzeTaiJiInChart, // 暂时停用：盘内存在太极模块已隐藏，恢复时启用
  extractSpecialTips,
  type MonthQiResult,
  type YongJiResult,
} from '@/utils/baziAnalyzer';
import {
  analyzeXiangYi,
  analyzeWealthVerdict,
  analyzeEarthXiJi,
  scoreWealthForYear,
  scoreNobilityForYear,
  type XiangYiVerdict,
  type WealthVerdict,
  type EarthXiJiResult,
} from '@/utils/xiangfaAnalyzer';
import {
  ELEMENT_PALETTE_FORMAL,
  getSolarTermThemeByBirthDate,
  type SolarTermTheme,
} from '@/data/solarTermsTheme';
import { JIAZI_PILLARS_BY_XUN, MONTH_QI_EXPANDED, ULTIMATE_SUMMARY, type IXunGroup } from '@/data/bazidata';

const ELEMENT_NAMES: Record<string, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
};

// 五行正色（符合 WCAG AA，木青/火朱/土黄/金白/水玄）
const ELEMENT_COLORS: Record<string, string> = ELEMENT_PALETTE_FORMAL;

// ============ 辅助组件：SVG 环形百分比饼图 ============
function DonutPieChart({
  size = 220,
  items,
  centerTitle,
  centerSub,
}: {
  size?: number;
  items: { label: string; value: number; color: string }[];
  centerTitle?: string;
  centerSub?: string;
}) {
  const radius = size / 2 - 14;
  const innerR = radius * 0.6;
  const cx = size / 2;
  const cy = size / 2;
  const total = items.reduce((s, it) => s + Math.max(0, it.value), 0) || 1;
  let acc = 0;
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--border)" strokeOpacity="0.25" strokeWidth="1" />
        {items.map((it, i) => {
          const v = Math.max(0, Math.min(100, it.value));
          if (v <= 0) return null;
          const startAngle = (acc / total) * 360 - 90;
          acc += v;
          const endAngle = (acc / total) * 360 - 90;
          const largeArc = endAngle - startAngle > 180 ? 1 : 0;
          const sr = startAngle * (Math.PI / 180);
          const er = endAngle * (Math.PI / 180);
          const x1 = cx + radius * Math.cos(sr);
          const y1 = cy + radius * Math.sin(sr);
          const x2 = cx + radius * Math.cos(er);
          const y2 = cy + radius * Math.sin(er);
          const x3 = cx + innerR * Math.cos(er);
          const y3 = cy + innerR * Math.sin(er);
          const x4 = cx + innerR * Math.cos(sr);
          const y4 = cy + innerR * Math.sin(sr);
          const d = endAngle - startAngle >= 359.999
            ? [
                `M ${cx - radius} ${cy}`,
                `A ${radius} ${radius} 0 1 1 ${cx + radius} ${cy}`,
                `A ${radius} ${radius} 0 1 1 ${cx - radius} ${cy}`,
                `M ${cx - innerR} ${cy}`,
                `A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy}`,
                `A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy}`,
                'Z',
              ].join(' ')
            : [
                `M ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                `L ${x3} ${y3}`,
                `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
                'Z',
              ].join(' ');
          return <path key={i} d={d} fill={it.color} stroke="var(--border)" strokeOpacity="0.45" strokeWidth="0.75" />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {centerTitle && (
          <div
            className="font-black leading-tight"
            style={{
              fontFamily: "'Noto Serif SC', serif",
              fontSize: size * 0.18,
              color: 'var(--foreground)',
              letterSpacing: '-0.01em',
            }}
          >
            {centerTitle}
          </div>
        )}
        {centerSub && (
          <div className="mt-1 text-[10px] font-bold tracking-[0.2em] text-muted-foreground md:text-xs">{centerSub}</div>
        )}
      </div>
    </div>
  );
}

// ============ 辅助组件：SVG 函数波动曲线（折线+面积+分档横线） ============
function DaYunCurveChart({
  items,
  width = 820,
  height = 260,
}: {
  items: Array<{ year: number; ganzhi: string; displayScore: number; level: string }>;
  width?: number;
  height?: number;
}) {
  const W = width;
  const H = height;
  const PAD_L = 38;
  const PAD_R = 18;
  const PAD_T = 22;
  const PAD_B = 46;
  const W_CHART = W - PAD_L - PAD_R;
  const H_CHART = H - PAD_T - PAD_B;

  // Y 轴：固定区间 [-7, +7]（与 compressScore 输出对齐）
  const Y_MAX = 7;
  const Y_MIN = -7;
  const yToPx = (y: number) => PAD_T + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * H_CHART;
  const xToPx = (i: number) => PAD_L + (items.length <= 1 ? W_CHART / 2 : (i / (items.length - 1)) * W_CHART);

  // 分档刻度：夯线 +5、人上 +2、NPC 0、拉 -2
  const levels = [
    { y: +5, label: '夯',   color: '#B45309', dashed: false, band: true },
    { y: +2, label: '人上', color: '#6D28D9', dashed: true },
    { y:  0, label: '0',    color: '#64748B', dashed: true },
    { y: -2, label: '拉',   color: '#DC2626', dashed: true },
  ];
  // 点颜色（按 level）
  const dotColor = (lvl: string) => {
    if (lvl === '夯') return '#B45309';
    if (lvl === '人上人') return '#6D28D9';
    if (lvl === 'npc') return '#334155';
    if (lvl === '拉') return '#DC2626';
    return '#991B1B'; // 拉完了
  };
  const areaFillFor = (y: number) => {
    if (y > 5) return 'rgba(245,158,11,0.16)';
    if (y > 2) return 'rgba(139,92,246,0.14)';
    if (y >= -2) return 'rgba(148,163,184,0.10)';
    return 'rgba(239,68,68,0.14)';
  };

  const pts = items.map((it, i) => ({
    x: xToPx(i),
    y: yToPx(it.displayScore),
    it,
  }));

  const polylinePts = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPts = polylinePts
    + ` ${xToPx(pts.length - 1)},${yToPx(Y_MIN)} ${xToPx(0)},${yToPx(Y_MIN)}`;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 640 }}>
        {/* 背景分档带 */}
        <rect x={PAD_L} y={yToPx(Y_MAX)} width={W_CHART} height={yToPx(5) - yToPx(Y_MAX)} fill="rgba(245,158,11,0.07)" />
        <rect x={PAD_L} y={yToPx(5)}     width={W_CHART} height={yToPx(2) - yToPx(5)}     fill="rgba(139,92,246,0.06)" />
        <rect x={PAD_L} y={yToPx(2)}     width={W_CHART} height={yToPx(-2) - yToPx(2)}    fill="rgba(148,163,184,0.06)" />
        <rect x={PAD_L} y={yToPx(-2)}    width={W_CHART} height={yToPx(Y_MIN) - yToPx(-2)} fill="rgba(239,68,68,0.06)" />

        {/* 分档虚线/实线 */}
        {levels.map((l, i) => (
          <g key={i}>
            <line
              x1={PAD_L} x2={W - PAD_R}
              y1={yToPx(l.y)} y2={yToPx(l.y)}
              stroke={l.color}
              strokeOpacity="0.45"
              strokeDasharray={l.dashed ? '4 4' : ''}
              strokeWidth="1"
            />
            <text
              x={PAD_L - 6}
              y={yToPx(l.y) + 3}
              textAnchor="end"
              fontSize="11"
              fontWeight="800"
              fill={l.color}
            >
              {l.label}
            </text>
          </g>
        ))}
        {/* Y 轴刻度文字 -6 ~ +6 */}
        {[-6, -4, 4, 6].map(v => (
          <text
            key={v}
            x={PAD_L - 6}
            y={yToPx(v) + 3}
            textAnchor="end"
            fontSize="10"
            fontWeight="700"
            fill="#94A3B8"
          >
            {v > 0 ? `+${v}` : `${v}`}
          </text>
        ))}

        {/* 面积 */}
        <polygon points={areaPts} fill={areaFillFor(
          items.reduce((a, b) => a + b.displayScore, 0) / Math.max(1, items.length)
        )} opacity="0.9" />

        {/* 折线 */}
        <polyline
          points={polylinePts}
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 点 + 年份标签 + 干支 + 分数 */}
        {pts.map((p, i) => {
          const sc = p.it.displayScore;
          const c = dotColor(p.it.level);
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke={c} strokeWidth="2" />
              <circle cx={p.x} cy={p.y} r="2.2" fill={c} />
              {/* 年份 */}
              <text
                x={p.x}
                y={H - 28}
                textAnchor="middle"
                fontSize="11"
                fontWeight="800"
                fill="#0F172A"
              >
                {p.it.year}
              </text>
              {/* 干支 */}
              <text
                x={p.x}
                y={H - 14}
                textAnchor="middle"
                fontSize="12"
                fontWeight="900"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
                fill={c}
              >
                {p.it.ganzhi}
              </text>
              {/* 分数：点上方或下方 */}
              <text
                x={p.x}
                y={sc >= 0 ? p.y - 10 : p.y + 14}
                textAnchor="middle"
                fontSize="11"
                fontWeight="900"
                fill={c}
              >
                {sc >= 0 ? `+${sc}` : `${sc}`}
              </text>
            </g>
          );
        })}

        {/* 左右轴线 */}
        <line
          x1={PAD_L} x2={W - PAD_R}
          y1={H - PAD_B + 1} y2={H - PAD_B + 1}
          stroke="#CBD5E1"
          strokeWidth="1"
        />
        <line
          x1={PAD_L} x2={PAD_L}
          y1={PAD_T} y2={H - PAD_B}
          stroke="#CBD5E1"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

// ============ 「象意·财富·感情·学历」栏目：论断面板（不展示数据库原文） ============
function VerdictPanel({
  subtitle,
  inputs,
  matched,
  result,
  disclaimer,
  accent = 'sky',
  score,
}: {
  subtitle: string;
  inputs: Array<{ label: string; value: string }>;
  matched: boolean;
  result: string;
  disclaimer?: string;
  accent?: 'sky' | 'emerald' | 'rose' | 'amber';
  score?: { value: number; label: string }; // 可选：量化分数徽标（如学历档位）
}) {
  const accentMeta: Record<string, { border: string; bg: string; text: string; tag: string }> = {
    sky: { border: 'rgba(14,165,233,0.25)', bg: 'rgba(14,165,233,0.06)', text: '#0369A1', tag: '#0EA5E9' },
    emerald: { border: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.06)', text: '#047857', tag: '#10B981' },
    rose: { border: 'rgba(244,63,94,0.25)', bg: 'rgba(244,63,94,0.06)', text: '#BE123C', tag: '#F43F5E' },
    amber: { border: 'rgba(245,158,11,0.28)', bg: 'rgba(245,158,11,0.07)', text: '#B45309', tag: '#F59E0B' },
  };
  const am = accentMeta[accent];
  return (
    <div className="space-y-3">
      <div className="text-sm font-bold text-muted-foreground" style={{ fontFamily: "'Noto Serif SC', serif" }}>{subtitle}</div>
      {/* 导入的既有模块数据 */}
      <div className="flex flex-wrap gap-2">
        {inputs.map((it) => (
          <span key={it.label} className="rounded-lg border bg-white/70 px-2 py-1 text-[11px] font-bold" style={{ borderColor: am.border, color: 'var(--foreground)' }}>
            <span className="text-muted-foreground">{it.label}：</span>{it.value}
          </span>
        ))}
      </div>
      {/* 查询论断 */}
      <div className="rounded-xl p-4" style={{ border: `1px solid ${am.border}`, background: am.bg }}>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black text-white" style={{ background: am.tag }}>
            查询论断
          </span>
          {score && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-black" style={{ border: `1px solid ${am.border}`, color: 'var(--foreground)' }}>
              {score.label}<span style={{ color: am.text }}> · {score.value} 分</span>
            </span>
          )}
          {!matched && disclaimer && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {disclaimer}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed font-bold text-foreground">{result}</p>
      </div>
    </div>
  );
}

// ============ 财富论断面板（档位 + 最利求财/事业年份，按可能性从高到低排） ============
function WealthPanel({
  verdict,
  bestWealthYears,
  bestNobilityYears,
}: {
  verdict: WealthVerdict;
  bestWealthYears: Array<{ year: number; ganzhi: string; score: number; age: number }>;
  bestNobilityYears: Array<{ year: number; ganzhi: string; score: number; age: number }>;
}) {
  const renderYearList = (items: Array<{ year: number; ganzhi: string; score: number; age: number }>, accent: string, accentText: string) => (
    <ol className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
      {items.map((it, i) => (
        <li key={it.year} className="flex items-center justify-between text-[12px] font-bold">
          <span className="inline-flex items-center">
            <span className="mr-2 inline-flex size-4 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: accent }}>{i + 1}</span>
            <span>{it.year}年</span>
            <span className="ml-1 text-muted-foreground">·{it.ganzhi}</span>
            <span className="ml-1 text-muted-foreground">·{it.age}岁</span>
          </span>
          <span style={{ color: accentText }}>{it.score >= 0 ? '+' : ''}{it.score}分</span>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="space-y-3">
      <div className="text-sm font-bold text-muted-foreground" style={{ fontFamily: "'Noto Serif SC', serif" }}>财富 · 富贵财官</div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-xl border p-4" style={{ border: '1px solid rgba(245,158,11,0.28)', background: 'rgba(245,158,11,0.07)' }}>
          <div className="mb-1 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">财富层级</span>
            <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-[12px] font-black" style={{ border: '1px solid rgba(245,158,11,0.28)' }}>
              {verdict.wealthRank}<span className="ml-1" style={{ color: '#B45309' }}>· {verdict.wealthScoreFinal} 分</span>
            </span>
          </div>
          <p className="text-xs leading-relaxed font-bold text-muted-foreground">{verdict.wealthRankDesc}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ border: '1px solid rgba(14,165,233,0.25)', background: 'rgba(14,165,233,0.06)' }}>
          <div className="mb-1 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-black text-white">事业地位</span>
            <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-[12px] font-black" style={{ border: '1px solid rgba(14,165,233,0.25)' }}>
              {verdict.nobilityRank}<span className="ml-1" style={{ color: '#0369A1' }}>· {verdict.nobilityScoreFinal} 分</span>
            </span>
          </div>
          <p className="text-xs leading-relaxed font-bold text-muted-foreground">{verdict.nobilityRankDesc}</p>
        </div>
      </div>
      <div className="rounded-xl p-4" style={{ border: '1px solid rgba(245,158,11,0.28)', background: 'rgba(245,158,11,0.06)' }}>
        <div className="mb-2 text-[13px] font-black" style={{ color: '#B45309' }}>最利求财年份（按可能性从高到低）</div>
        {bestWealthYears.length === 0 ? (
          <p className="text-xs leading-relaxed font-bold text-muted-foreground">暂无足够流年数据可排序。</p>
        ) : (
          renderYearList(bestWealthYears, '#F59E0B', '#B45309')
        )}
      </div>
      <div className="rounded-xl p-4" style={{ border: '1px solid rgba(14,165,233,0.25)', background: 'rgba(14,165,233,0.06)' }}>
        <div className="mb-2 text-[13px] font-black" style={{ color: '#0369A1' }}>最利事业地位年份（按可能性从高到低）</div>
        {bestNobilityYears.length === 0 ? (
          <p className="text-xs leading-relaxed font-bold text-muted-foreground">暂无足够流年数据可排序。</p>
        ) : (
          renderYearList(bestNobilityYears, '#0EA5E9', '#0369A1')
        )}
      </div>
    </div>
  );
}


// ============ 感情论断面板（只列具体 YYYY 年：恋爱可能 / 结婚，按可能性从高到低排列） ============
function RomanceVerdictPanel({
  bestLoveYears,
  bestMarriageYears,
}: {
  bestLoveYears: Array<{ year: number; ganzhi: string; score: number; age: number; hits: string[] }>;
  bestMarriageYears: Array<{ year: number; ganzhi: string; score: number; age: number; hits: string[] }>;
}) {
  const renderTimingList = (
    items: Array<{ year: number; ganzhi: string; score: number; age: number; hits: string[] }>,
    accent: string,
    accentBg: string,
  ) => (
    <ol className="mt-2 space-y-1.5">
      {items.map((it, i) => (
        <li key={it.year} className="flex flex-col rounded-lg border border-white/60 bg-white/60 p-2">
          <div className="flex items-center justify-between text-[12px] font-black">
            <span className="inline-flex items-center">
              <span className="mr-2 inline-flex size-4 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: accentBg }}>{i + 1}</span>
              <span>{it.year}年</span>
              <span className="ml-1 text-muted-foreground">·{it.ganzhi}</span>
              <span className="ml-1 text-muted-foreground">·{it.age}岁</span>
            </span>
            <span style={{ color: accent }}>{it.score}分</span>
          </div>
          {it.hits.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {it.hits.slice(0, 3).map((h) => (
                <span key={h} className="rounded-md border px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground" style={{ borderColor: `${accentBg}33`, background: `${accentBg}0D` }}>{h}</span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ol>
  );

  return (
    <div className="space-y-3">
      <div className="text-sm font-bold text-muted-foreground" style={{ fontFamily: "'Noto Serif SC', serif" }}>感情 · 异性缘与婚姻情缘</div>

      <div className="rounded-xl border border-pink-200 bg-pink-50/50 p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-pink-500 text-[9px] font-black leading-none text-white">♥</span>
          <span className="text-xs font-black text-pink-700">恋爱可能时间如下（按可能性从高到低排列）</span>
        </div>
        {bestLoveYears.length === 0 ? (
          <p className="text-xs leading-relaxed font-bold text-muted-foreground">暂无足够流年数据；恋爱应期需逢岁运桃花或异性星引动之年方显。</p>
        ) : (
          renderTimingList(bestLoveYears, '#BE185D', '#EC4899')
        )}
      </div>

      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black leading-none text-white">喜</span>
          <span className="text-xs font-black text-rose-700">结婚时间如下（按可能性从高到低排列）</span>
        </div>
        {bestMarriageYears.length === 0 ? (
          <p className="text-xs leading-relaxed font-bold text-muted-foreground">暂无足够流年数据；结婚应期需逢岁运合冲夫妻宫之年方显。</p>
        ) : (
          renderTimingList(bestMarriageYears, '#9F1239', '#E11D48')
        )}
      </div>
    </div>
  );
}

// ============ 象意论断面板（日主五行象法） ============
function XiangYiPanel({ verdict }: { verdict: XiangYiVerdict }) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-muted-foreground" style={{ fontFamily: "'Noto Serif SC', serif" }}>
        象意 · 五行本源象法（以日主{verdict.dayMaster.stem}{verdict.dayMaster.elementName}为中心）
      </div>
      <div className="rounded-xl p-4" style={{ border: '1px solid rgba(14,165,233,0.25)', background: 'rgba(14,165,233,0.06)' }}>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-black text-white">日主象意</span>
          <span className="text-xs font-black" style={{ color: '#0369A1' }}>{verdict.dayMaster.stem} · {verdict.dayMaster.elementName} · {verdict.dayMaster.fourSymbol}</span>
        </div>
        <p className="text-sm leading-relaxed font-bold text-foreground">{verdict.dayMaster.stemTraits}</p>
        <p className="mt-2 text-sm leading-relaxed font-bold text-muted-foreground">{verdict.dayMaster.nature}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-white/60 p-2.5">
            <div className="text-xs font-black text-sky-700">核心类象</div>
            <ul className="mt-1 space-y-1">
              {verdict.dayMaster.imagery.map((img, i) => (
                <li key={i} className="text-xs leading-relaxed font-bold text-muted-foreground">· {img}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <div className="rounded-lg bg-white/60 p-2.5">
              <div className="text-xs font-black text-sky-700">人体 · 才艺</div>
              <p className="mt-1 text-xs leading-relaxed font-bold text-muted-foreground">{verdict.dayMaster.body}</p>
              <p className="mt-1 text-xs leading-relaxed font-bold text-muted-foreground">{verdict.dayMaster.talent}</p>
            </div>
            <div className="rounded-lg bg-white/60 p-2.5">
              <div className="text-xs font-black text-sky-700">吉凶异化</div>
              <p className="mt-1 text-xs leading-relaxed font-bold text-muted-foreground">{verdict.dayMaster.jiXiong}</p>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-white/60 p-2.5">
          <div className="text-xs font-black text-sky-700">月令流转</div>
          <p className="mt-1 text-xs leading-relaxed font-bold text-muted-foreground">{verdict.dayMaster.monthFlow}</p>
        </div>
      </div>
      <details className="group rounded-xl border border-border/60 bg-card/50 p-3">
        <summary className="cursor-pointer text-xs font-black text-muted-foreground transition-colors group-open:text-foreground">
          四柱干支象意一览
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {verdict.pillars.map((p, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-white/60 p-2.5">
              <div className="text-xs font-black">{p.position}柱 {p.gz}（{p.elementName}）</div>
              <p className="mt-1 text-[11px] leading-relaxed font-bold text-muted-foreground">{p.stemTraits}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

// ============ 辅助：角标后加红色感叹号（好到不好的下坡提醒） ============
const DownAlertBadge = ({ show }: { show?: boolean }) => {
  if (!show) return null;
  return (
    <span
      aria-label="由好转坏提示"
      className="ml-1 inline-flex size-4 items-center justify-center rounded-full text-[10px] font-black"
      style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #F87171' }}
    >
      !
    </span>
  );
};

// 十二长生状态名称
const CHANG_SHENG_STATES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'] as const;
type ChangShengState = (typeof CHANG_SHENG_STATES)[number];

/**
 * 解析十干状态描述字符串，返回指定日主天干的十二长生状态
 * 支持两种格式：
 *   1) 合并写法：丙戊长生、丁己冠带
 *   2) 单干写法：甲临官、乙帝旺
 */
function parseChangSheng(raw: string, stem: string): ChangShengState | '' {
  if (!raw || !stem) return '';
  // 截取"十干状态："之后、"。"之前的内容（如果存在这个标记）
  let section = raw;
  const tagIdx = raw.indexOf('十干状态');
  if (tagIdx >= 0) {
    section = raw.slice(tagIdx);
    const dotIdx = section.indexOf('。');
    if (dotIdx > 0) section = section.slice(0, dotIdx);
  }
  // 用顿号或逗号拆分所有条目
  const tokens = section.split(/[、，;；]/).map((s) => s.trim()).filter(Boolean);
  for (const tok of tokens) {
    // 对每个条目，从左到右扫描：先累计天干字符，遇到状态名就停止
    let stemBuf = '';
    for (let i = 0; i < tok.length; i++) {
      const ch = tok[i];
      const isStemCh = '甲乙丙丁戊己庚辛壬癸'.indexOf(ch) >= 0;
      if (isStemCh) {
        stemBuf += ch;
      } else {
        // 尝试匹配状态（2个或3个汉字）
        for (const st of CHANG_SHENG_STATES) {
          if (tok.startsWith(st, i) && stemBuf.includes(stem)) {
            return st;
          }
        }
        break;
      }
    }
  }
  return '';
}

// ============ 组件：月对日主·十二长生状态卡片 ============
function MonthRiZhuChangShengCard({
  chart,
  solarTermTheme,
}: {
  chart: { monthBranchIndex: number; day: { stem: string } };
  solarTermTheme: SolarTermTheme;
}) {
  const raw = MONTH_QI_EXPANDED[chart.monthBranchIndex]?.hiddenStemsAndChangSheng || '';
  const stem = chart.day.stem;
  const state = parseChangSheng(raw, stem);
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{
        backgroundColor: `${solarTermTheme.palette.primary}12`,
        border: `1px solid ${solarTermTheme.palette.primary}26`,
      }}
    >
      <div className="mb-2 text-[11px] font-black tracking-[0.25em] text-muted-foreground">月对日主 · 十二长生状态</div>
      {state ? (
        <div
          className="text-[26px] font-black leading-tight md:text-[32px]"
          style={{ fontFamily: "'Noto Serif SC', serif", color: 'var(--foreground)' }}
        >
          <span className="mark-highlight">{stem}日主</span>
          <span
            className="ml-2 inline-block rounded-lg px-3 py-1"
            style={{
              backgroundColor: `${solarTermTheme.palette.primary}1A`,
              color: solarTermTheme.palette.primary,
              border: `1px solid ${solarTermTheme.palette.primary}30`,
            }}
          >
            （{state}）
          </span>
        </div>
      ) : (
        <div
          className="text-[22px] font-black leading-tight md:text-[28px] text-muted-foreground"
          style={{ fontFamily: "'Noto Serif SC', serif" }}
        >
          <span>{stem}日主</span>
          <span className="ml-2">（月令详考）</span>
        </div>
      )}
    </div>
  );
}

// 未排盘时的默认节气主题（当前日期所属节气）
function getDefaultSolarTermTheme(): SolarTermTheme {
  const now = new Date();
  return getSolarTermThemeByBirthDate(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
}

// ============ 太极模块 · 库内参考原文提取（暂时停用：盘内存在太极模块已隐藏，恢复时启用） ============
type TaijiLite = { exists: boolean; taijiType: string };
function computeTaiJiDbReferences(
  taiji: TaijiLite,
  chart: { monthBranchIndex: number; year: { stem: string; branch: string }; month: { stem: string; branch: string }; day: { stem: string; branch: string }; hour: { stem: string; branch: string } },
): Array<{ tag: string; text: string }> {
  const refs: Array<{ tag: string; text: string }> = [];
  if (!taiji?.exists) return refs;

  // —— 来源 A：当前月令的太极相关原文（MONTH_QI_EXPANDED） ——
  const mq = MONTH_QI_EXPANDED[chart.monthBranchIndex];
  if (mq) {
    // 命中月令专属太极（如：庚丙太极出现在巳/午/未月）时收录
    if (taiji.taijiType && typeof mq.coreQiJi === 'string' && /太极/.test(mq.coreQiJi)) {
      refs.push({ tag: `【月令核心气机·${(mq as any).monthPillar || mq.month || ''}】`, text: mq.coreQiJi });
    }
    if (taiji.taijiType && typeof mq.yueLingSummary === 'string' && /太极/.test(mq.yueLingSummary)) {
      refs.push({ tag: '【月令总诀】', text: mq.yueLingSummary });
    }
    // 逐条 notes 检查太极相关
    if (Array.isArray((mq as any).notes)) {
      (mq as any).notes.forEach((n: any, i: number) => {
        const s = typeof n === 'string' ? n : (typeof n === 'object' && n ? (String(n.content ?? '') + String(n.text ?? '')) : '');
        if (/太极/.test(s)) refs.push({ tag: `【命局要诀·${i + 1}】`, text: s });
      });
    }
  }

  // —— 来源 B：命局四柱中，干支 coreMeaning 带"太极"原文者（丁壬自合、丙癸自合等） ——
  const pillarGZs = [chart.year, chart.month, chart.day, chart.hour].map((p) => p.stem + p.branch);
  const pillarNames = ['年柱', '月柱', '日柱', '时柱'];
  for (let i = 0; i < pillarGZs.length; i++) {
    const gz = pillarGZs[i];
    // 遍历 60 甲子找匹配
    for (const xun of JIAZI_PILLARS_BY_XUN as IXunGroup[]) {
      const hit = (xun.pillars as any[]).find((p) => p.ganzhi === gz);
      if (hit && typeof hit.coreMeaning === 'string' && /太极/.test(hit.coreMeaning)) {
        refs.push({ tag: `【干支自合·${pillarNames[i]}${gz}】`, text: hit.coreMeaning });
      }
    }
  }

  // —— 来源 C：总纲原文（ULTIMATE_SUMMARY 中太极相关条目） ——
  if (Array.isArray(ULTIMATE_SUMMARY)) {
    for (const it of ULTIMATE_SUMMARY as any[]) {
      const title = String((it as any).title ?? '');
      const content = String((it as any).content ?? '');
      if (/太极/.test(title) || /太极/.test(content)) {
        refs.push({ tag: `【总纲·${title || '天之易真机'}】`, text: content || title });
      }
    }
  }

  // 去重（text 完全相同的去掉）
  const seen = new Set<string>();
  return refs.filter((r) => {
    const key = r.tag + '|' + r.text;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 应用版本号（正式版 v1.0.0 起，与 package.json 同步维护） */
const APP_VERSION = '2.4.3';

export default function BaZiAnalyzerPage() {
  const [year, setYear] = useState('2000');
  const [month, setMonth] = useState('1');
  const [day, setDay] = useState('1');
  const [hour, setHour] = useState('0');
  const [minute, setMinute] = useState('0');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [fullBirthInput, setFullBirthInput] = useState('');
  // —— 手动四柱模式（自选四柱排盘）：mode 切换 + 四柱干支 + 手动出生年份 ——
  const [inputMode, setInputMode] = useState<'date' | 'manual'>('date');
  const [mYearStem, setMYearStem] = useState('甲');
  const [mYearBranch, setMYearBranch] = useState('子');
  const [mMonthStem, setMMonthStem] = useState('丙');
  const [mMonthBranch, setMMonthBranch] = useState('寅');
  const [mDayStem, setMDayStem] = useState('甲');
  const [mDayBranch, setMDayBranch] = useState('子');
  const [mHourStem, setMHourStem] = useState('甲');
  const [mHourBranch, setMHourBranch] = useState('子');
  const [mBirthYear, setMBirthYear] = useState('2000');
  const [chart, setChart] = useState<BaZiChart | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [solarTermTheme, setSolarTermTheme] = useState<SolarTermTheme>(() => getDefaultSolarTermTheme());
  const [expandedDY, setExpandedDY] = useState<number | null>(null);

  const currentYear = new Date().getFullYear();

  // 根据节气主题生成的 CSS 变量，动态注入给页面全部子元素使用
  const themeVarsStyle: React.CSSProperties = useMemo(() => {
    const p = solarTermTheme.palette;
    return {
      '--st-bg1': p.bg1,
      '--st-bg2': p.bg2,
      '--st-card': p.card,
      '--st-primary': p.primary,
      '--st-secondary': p.secondary,
      '--st-accent': p.accent,
      '--st-muted': p.muted,
      '--st-prose': p.prose,
    } as React.CSSProperties;
  }, [solarTermTheme]);

  const handleAnalyze = () => {
    if (inputMode === 'manual') {
      handleManualAnalyze();
      return;
    }
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const h = parseInt(hour, 10);
    const min = parseInt(minute, 10);

    if (isNaN(y) || y < 1800 || y > 2100) {
      toast.error('请输入有效的年份（1800-2100）');
      return;
    }
    if (isNaN(m) || m < 1 || m > 12) {
      toast.error('请输入有效的月份（1-12）');
      return;
    }
    if (isNaN(d) || d < 1 || d > 31) {
      toast.error('请输入有效的日期（1-31）');
      return;
    }
    if (isNaN(h) || h < 0 || h > 23) {
      toast.error('请输入有效的小时（0-23）');
      return;
    }
    if (isNaN(min) || min < 0 || min > 59) {
      toast.error('请输入有效的分钟（0-59）');
      return;
    }

    const result = calculateBaZi(y, m, d, h, min, gender, '北京');
    setChart(result);
    // 根据命主出生日月日切换节气配色与诗句主题
    setSolarTermTheme(getSolarTermThemeByBirthDate(y, m, d));
    setAnalyzed(true);
    toast.success('排盘完成，正在生成分析报告...');
  };

  const handleManualAnalyze = () => {
    const by = parseInt(mBirthYear, 10);
    if (isNaN(by) || by < 1800 || by > 2100) {
      toast.error('请填写有效的参照出生年份（1800-2100）');
      return;
    }
    // 由自选四柱构造完整 BaZiChart
    const makePillar = (stem: string, branch: string, isDay = false): Pillar => ({
      stem,
      branch,
      stemElement: STEM_ELEMENTS[stem],
      branchElement: BRANCH_ELEMENTS[branch],
      stemYinYang: STEM_YINYANG[stem],
      branchYinYang: BRANCH_YINYANG[branch],
      hiddenStems: HIDDEN_STEMS[branch],
      shiShen: isDay ? '日主' : getShiShen(mDayStem, stem),
    });
    const yearP = makePillar(mYearStem, mYearBranch);
    const monthP = makePillar(mMonthStem, mMonthBranch);
    const dayP = makePillar(mDayStem, mDayBranch, true);
    const hourP = makePillar(mHourStem, mHourBranch);

    // 月支索引（与 MONTH_BRANCHES 一致：0=寅）
    const monthBranchIndex = MONTH_BRANCHES.indexOf(mMonthBranch);
    if (monthBranchIndex < 0) {
      toast.error('月支非法');
      return;
    }

    // 构建 60 甲子序列
    const jiaZi60: string[] = [];
    for (let i = 0; i < 60; i++) jiaZi60.push(STEMS[i % 10] + BRANCHES[i % 12]);

    // 大运：年干阴阳 + 性别定顺逆，从月柱起推 8 步
    const shunPai = (STEM_YINYANG[mYearStem] === 'yang' && gender === 'male') || (STEM_YINYANG[mYearStem] === 'yin' && gender === 'female');
    const monthIdx = jiaZi60.indexOf(`${mMonthStem}${mMonthBranch}`);
    // 起运年龄：自选四柱无精确节气，按一岁起运近似（保证大运年份可用）
    const startAge = 1;
    const daYun: Array<{ index: number; stem: string; branch: string; startAge: number; startYear: number; endYear: number; daysToJie: number }> = [];
    for (let i = 0; i < 8; i++) {
      const idx = shunPai
        ? (monthIdx + 1 + i) % 60
        : (((monthIdx - 1 - i) % 60) + 60) % 60;
      const gz = jiaZi60[idx];
      const dyStartAge = startAge + i * 10;
      daYun.push({
        index: i,
        stem: gz[0],
        branch: gz[1],
        startAge: dyStartAge,
        startYear: by + dyStartAge,
        endYear: by + dyStartAge + 9,
        daysToJie: 0,
      });
    }

    const manualChart: BaZiChart = {
      year: yearP,
      month: monthP,
      day: dayP,
      hour: hourP,
      monthBranchIndex,
      gender,
      birthInfo: {
        solarDate: `${by}年（手动四柱）`,
        solarTime: '—',
        birthPlace: '北京',
        trueSolarTime: '—',
        trueSolarOffset: 0,
      },
      daYun,
    };
    setChart(manualChart);
    setSolarTermTheme(getSolarTermThemeByBirthDate(by, 1, 1));
    setAnalyzed(true);
    toast.success('手动四柱排盘完成，正在生成分析报告...');
  };

  const handleReset = () => {
    setAnalyzed(false);
    setChart(null);
    setSolarTermTheme(getDefaultSolarTermTheme());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fillExample = () => {
    setYear('1990');
    setMonth('5');
    setDay('15');
    setHour('12');
    setMinute('0');
    setGender('male');
  };

  const monthQi = useMemo<MonthQiResult | null>(() => {
    if (!chart) return null;
    return analyzeMonthQi(chart.monthBranchIndex);
  }, [chart]);

  const yongJi = useMemo<YongJiResult | null>(() => {
    if (!chart || !monthQi) return null;
    return analyzeYongJi(chart, monthQi);
  }, [chart, monthQi]);

  const elementPower = useMemo(() => {
    if (!chart) return null;
    return calculateElementPower(chart);
  }, [chart]);

  // 阴阳气占比（模块 1·阴阳气饼图）
  const yinYangPct = useMemo(() => {
    if (!chart) return null;
    return calculateYinYangBalance(chart);
  }, [chart]);

  // 寒热气占比（模块 1·寒热气饼图）
  const coldHotPct = useMemo(() => {
    if (!chart) return null;
    return calculateColdHotBalance(chart);
  }, [chart]);

  // 六十甲子全部柱打平（用于模块 2/3 匹配）
  const allJiaziPillars = useMemo(() => {
    const flat: { ganzhi: string; coreMeaning: string }[] = [];
    (JIAZI_PILLARS_BY_XUN as IXunGroup[]).forEach((g) => {
      g.pillars.forEach((p) => flat.push({ ganzhi: p.ganzhi, coreMeaning: p.coreMeaning }));
    });
    return flat;
  }, []);

  const pattern = useMemo(() => {
    if (!chart || !monthQi || !yongJi) return null;
    return analyzeMingJuPattern(chart, monthQi, yongJi);
  }, [chart, monthQi, yongJi]);

  const wealthNobility = useMemo(() => {
    if (!chart || !monthQi || !yongJi || !elementPower) return null;
    return analyzeWealthNobility(chart, monthQi, yongJi, elementPower, pattern?.nianYueTaiJi ?? undefined);
  }, [chart, monthQi, yongJi, elementPower, pattern]);

  // 命盘综合评分（新机制：三维度平衡度+用神+忌神，作为大运流年联动基准）
  const mingPanScore = useMemo(() => {
    if (!chart || !yongJi) return null;
    return scoreMingPan(chart, yongJi);
  }, [chart, yongJi]);

  const daYunAnalysis = useMemo(() => {
    if (!chart || !yongJi || !monthQi || !elementPower) return null;
    return analyzeDaYunLiuNian(chart, yongJi, monthQi, elementPower, currentYear);
  }, [chart, yongJi, monthQi, elementPower, currentYear]);

  // 第一次算出分析结果后，默认把「当前步大运」展开
  // 用 ref 标记"已初始化"：仅首次自动展开当前大运；之后展开/收缩完全交给用户（修复当前大运无法收缩的 bug）
  const dyInitializedRef = useRef(false);
  useEffect(() => {
    if (daYunAnalysis && !dyInitializedRef.current) {
      dyInitializedRef.current = true;
      setExpandedDY(daYunAnalysis.currentDaYunIndex);
    }
  }, [daYunAnalysis]);

  // 模块 2：盘内存在太极判定（暂时停用：模块已从 UI 隐藏，底层 analyzeTaiJiInChart / computeTaiJiDbReferences 保留，可随时恢复）

  // 模块 3：特别提示
  const specialTips = useMemo(() => {
    if (!chart || !monthQi || !yongJi || !pattern) return null;
    return extractSpecialTips(chart, monthQi, yongJi, pattern, allJiaziPillars);
  }, [chart, monthQi, yongJi, pattern, allJiaziPillars]);

  // ===== 新栏目「象意·财富·感情·学历」数据（数据书优先级 2，独立于既有模块）=====
  const xiangYi = useMemo<XiangYiVerdict | null>(() => {
    if (!chart) return null;
    return analyzeXiangYi(chart, monthQi);
  }, [chart, monthQi]);

  const wealthVerdict = useMemo<WealthVerdict | null>(() => {
    if (!chart || !wealthNobility) return null;
    return analyzeWealthVerdict(chart, monthQi, wealthNobility, elementPower);
  }, [chart, monthQi, wealthNobility, elementPower]);

  // ===== 象法·应期年份排序（按可能性从高到低排列，展示结论年份，不展示中间过程与数据库规则）=====
  type ScoredYear = { year: number; ganzhi: string; age: number; score: number };

  const { bestWealthYears, bestNobilityYears } = useMemo<{
    bestWealthYears: ScoredYear[];
    bestNobilityYears: ScoredYear[];
  }>(() => {
    if (!chart || !daYunAnalysis || !yongJi || !elementPower) {
      return { bestWealthYears: [], bestNobilityYears: [] };
    }
    // 收集所有有 year/ganzhi/age 的流年：大运下辖的流年（liuNian10）和 recentLiuNian
    type RawLN = { year: number; ganzhi?: string | [string, string] | { 0: string; 1: string } | any; age?: number; displayScore?: number };
    const raws: RawLN[] = [];
    const pushOne = (raw: any) => {
      if (!raw || typeof raw.year !== 'number') return;
      if (!raw.ganzhi) return;
      raws.push(raw as RawLN);
    };
    (daYunAnalysis.daYunWithFortune || []).forEach((dy: any) => {
      (dy.liuNian10 || []).forEach(pushOne);
    });
    (daYunAnalysis.recentLiuNian || []).forEach(pushOne);

    // 去重：按 year 只保留一个（若重复则优先保留有 displayScore 的）
    const dedupMap = new Map<number, RawLN>();
    for (const r of raws) {
      const existing = dedupMap.get(r.year);
      if (!existing || (r.displayScore != null && existing.displayScore == null)) {
        dedupMap.set(r.year, r);
      }
    }
    const all = Array.from(dedupMap.values());

    const unpackGZ = (raw: RawLN): { stem: string; branch: string; ganzhiStr: string } | null => {
      const gz = raw.ganzhi;
      if (!gz) return null;
      if (typeof gz === 'string' && gz.length >= 2) return { stem: gz[0], branch: gz[1], ganzhiStr: gz.slice(0, 2) };
      if (Array.isArray(gz) && typeof gz[0] === 'string' && typeof gz[1] === 'string') return { stem: gz[0], branch: gz[1], ganzhiStr: `${gz[0]}${gz[1]}` };
      if (typeof gz === 'object' && typeof (gz as any)[0] === 'string' && typeof (gz as any)[1] === 'string') {
        const o = gz as any;
        return { stem: o[0], branch: o[1], ganzhiStr: `${o[0]}${o[1]}` };
      }
      return null;
    };
    // 从 chart.birthInfo.solarDate（例："2005-02-01" 或 "2005/2/1"）提取阳历出生年份
    const solarDateStr = chart.birthInfo?.solarDate ?? '';
    const m = /^\s*(\d{4})/.exec(solarDateStr);
    const birthYear = m ? parseInt(m[1], 10) : NaN;
    const estimateAge = (year: number, rawAge?: number): number => {
      if (typeof rawAge === 'number' && rawAge >= 0) return rawAge;
      if (Number.isFinite(birthYear)) return Math.max(0, year - birthYear);
      // 若 birthYear 解析失败（极少见），再退回 currentYear 差 + 当前年龄估算
      const rawCurrentAge = (chart as any).age;
      const ca = typeof rawCurrentAge === 'number' ? rawCurrentAge : 0;
      return Math.max(0, ca + (year - currentYear));
    };

    // 仅保留当年及未来年份（或含 0..3 年前，做参考，但默认只展示 >= currentYear）
    const forward = all.filter((r) => r.year >= currentYear);

    const wealthArr: ScoredYear[] = [];
    const nobilityArr: ScoredYear[] = [];

    for (const r of forward) {
      const gz = unpackGZ(r);
      if (!gz) continue;
      const age = estimateAge(r.year, r.age);

      const w = scoreWealthForYear(gz.stem, gz.branch, chart, r.displayScore ?? 0, yongJi);
      if (age >= 18) wealthArr.push({ year: r.year, ganzhi: gz.ganzhiStr, age, score: w }); // 18 岁以下无事业求财

      const n = scoreNobilityForYear(gz.stem, gz.branch, chart, r.displayScore ?? 0, yongJi);
      if (age >= 18) nobilityArr.push({ year: r.year, ganzhi: gz.ganzhiStr, age, score: n });
    }

    const byScoreDesc = (a: any, b: any) => b.score - a.score;
    wealthArr.sort(byScoreDesc);
    nobilityArr.sort(byScoreDesc);

    return {
      bestWealthYears: wealthArr.slice(0, 10),
      bestNobilityYears: nobilityArr.slice(0, 10),
    };
  }, [chart, daYunAnalysis, yongJi, elementPower, currentYear]);

  // 用神忌神判断·土专区
  const earthXiJi = useMemo<EarthXiJiResult | null>(() => {
    if (!chart) return null;
    return analyzeEarthXiJi(chart, monthQi);
  }, [chart, monthQi]);

  const analyzedBoolean = analyzed && chart && monthQi && yongJi && elementPower && yinYangPct && coldHotPct && pattern && wealthNobility && daYunAnalysis && specialTips;

  const renderMarkBadge = (mark: 'useful' | 'taboo' | 'neutral') => {
    if (mark === 'useful') return <Badge className="bg-emerald-500 hover:bg-emerald-600">用神</Badge>;
    if (mark === 'taboo') return <Badge variant="destructive">忌神</Badge>;
    return <Badge variant="secondary">中性</Badge>;
  };

  // ===== MVP 分数明细组件 =====
  // 展示：加分合计 / 扣分合计 / 其他修正 / 趋势加成 = 综合分
  const ScoreBreakdown = ({ row, dense = false }: { row: any; dense?: boolean }) => {
    const toC = (raw: number) => Math.round((raw / 3.6) * 10) / 10;
    const displayScore: number =
      typeof row.displayScore === 'number' ? row.displayScore :
      typeof row.score === 'number' ? row.score :
      (row.displayScore && !isNaN(parseFloat(row.displayScore)) ? parseFloat(row.displayScore) : 0);

    const plusC = toC(Number(row.plusSumRaw) || 0);
    const minusC = toC(Number(row.minusSumRaw) || 0);
    const otherC = toC(Number(row.otherSumRaw) || 0);

    // 命盘基准分（联动）：大运/流年综合分 = 命盘基准 + 岁运调整
    const mingPanBase = typeof row.mingPanBase === 'number' ? row.mingPanBase : 0;
    // 趋势加成 = 最终综合分 - 命盘基准 - 原始分压缩值（若无 plusSumRaw/minusSumRaw/otherSumRaw 等明细字段，趋势为 0 不展示）
    const hasDetail = row.plusSumRaw !== undefined || row.minusSumRaw !== undefined || row.otherSumRaw !== undefined;
    let trendC = 0;
    if (hasDetail && row.rawScore !== undefined) {
      trendC = Math.round((displayScore - toC(row.rawScore) - mingPanBase) * 10) / 10;
    }

    if (!hasDetail) return null;

    const pill = (label: string, val: number, color: string) => (
      <span
        key={label}
        className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-black tabular-nums ${dense ? 'text-[10px]' : 'text-[11px]'}`}
        style={{
          borderColor: `${color}33`,
          background: `${color}10`,
          color,
        }}
      >
        <span className="mr-0.5 opacity-70">{label}</span>
        {val >= 0 ? '+' : ''}{val.toFixed(1)}
      </span>
    );

    return (
      <div
        className={`flex flex-wrap items-center gap-1 ${dense ? 'mt-1' : 'mt-2'}`}
        aria-label="综合分明细"
      >
        {pill('加分', plusC, '#047857')}
        {pill('扣分', minusC, '#DC2626')}
        {Math.abs(otherC) >= 0.05 && pill('其他', otherC, '#6D28D9')}
        {Math.abs(mingPanBase) >= 0.05 && pill('命盘', mingPanBase, '#0EA5E9')}
        {Math.abs(trendC) >= 0.05 && pill('趋势', trendC, '#B45309')}
        <span className="mx-0.5 text-[11px] font-black text-muted-foreground">=</span>
        <span
          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-black tabular-nums ${dense ? 'text-[10px]' : 'text-[11px]'}`}
          style={{
            borderColor: displayScore >= 0 ? 'rgba(4,120,87,0.35)' : 'rgba(220,38,38,0.35)',
            background: displayScore >= 0 ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
            color: displayScore >= 0 ? '#047857' : '#DC2626',
          }}
        >
          <span className="mr-0.5 opacity-70">综合</span>
          {displayScore >= 0 ? '+' : ''}{displayScore.toFixed(1)}
        </span>
      </div>
    );
  };

  const pillarNames = ['年柱', '月柱', '日柱', '时柱'];
  const pillarLabels = ['祖上', '父母', '自己', '子女'];

  return (
    <div
      className="min-h-screen"
      style={{
        ...themeVarsStyle,
        background: `linear-gradient(160deg, var(--st-bg1) 0%, #ffffff 35%, var(--st-bg2) 100%)`,
      }}
    >
      {/* 节气主题 Hero：苹果官网风格排版 + 古风色彩系统 */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${solarTermTheme.colors[0]}B3 0%, ${solarTermTheme.colors[1] ?? solarTermTheme.colors[0]}80 50%, #FFFFFFE6 100%)`,
        }}
      >
        {/* 顶部装饰：节气色板彩色横条 */}
        <div className="flex h-[3px] w-full">
          {solarTermTheme.colors.map((c, i) => (
            <div
              key={`stripe-${i}`}
              className="flex-1 transition-all duration-500"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* 苹果官网式超大留白与居中排版 */}
        <div className="relative mx-auto flex max-w-6xl flex-col items-center justify-center px-6 pb-24 pt-20 text-center md:pb-40 md:pt-32">
          {/* 节气小标签：小号精细字，拉开与主标题距离 */}
          <div
            className="mb-10 inline-flex items-center justify-center gap-2 rounded-full px-5 py-1.5 text-[11px] font-medium tracking-[0.24em]"
            style={{
              backgroundColor: `#FFFFFF99`,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: 'var(--foreground)',
              border: `1px solid ${solarTermTheme.palette.primary}22`,
            }}
          >
            <span style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 600 }}>
              {solarTermTheme.name} · 命主出生节气
            </span>
          </div>

          {/* 主标题：沛然堂 · 毛体（Maoti）超大尺寸 */}
          <h1
            className="text-[64px] font-black leading-[1.05] tracking-wide md:text-[100px] lg:text-[140px]"
            style={{
              fontFamily: "'Maoti', 'Noto Serif SC', serif",
              color: 'var(--foreground)',
              letterSpacing: '0.04em',
            }}
          >
            沛然堂
          </h1>

          {/* 副标题：苹果官网式精细副标题，较大间距 */}
          <p
            className="mt-8 max-w-2xl text-[19px] font-normal leading-relaxed tracking-wide md:text-[22px] lg:text-[24px]"
            style={{
              fontFamily: "'Noto Serif SC', serif",
              color: 'var(--foreground)',
              opacity: 0.72,
              letterSpacing: '0.02em',
            }}
          >
            以太极阴阳为体 · 以月气动应为用 · 以平衡为得失
          </p>

          {/* 节气诗句：毛体字（Maoti），显著放大成为视觉焦点 */}
          <p
            className="mt-16 max-w-4xl text-[40px] font-normal leading-[1.35] md:text-[56px] lg:text-[72px]"
            style={{
              fontFamily: "'Maoti', 'Noto Serif SC', serif",
              color: 'var(--foreground)',
              letterSpacing: '0.06em',
              lineHeight: 1.3,
            }}
          >
            「{solarTermTheme.poem}」
          </p>

          {/* 出处：小字精细显示 */}
          <p
            className="mt-6 text-[14px] font-normal md:text-[15px]"
            style={{
              fontFamily: "'Noto Serif SC', serif",
              color: 'var(--foreground)',
              opacity: 0.52,
              letterSpacing: '0.1em',
            }}
          >
            —— {solarTermTheme.source}
          </p>
        </div>
      </section>

      <main
        className="mx-auto w-full max-w-7xl space-y-10 px-4 md:space-y-16 md:px-6"
        style={{
          marginTop: '-24px',
          // 极轻的云纹/肌理：用两层同心 radial gradient 叠加，透明度控制在 4% 以内
          backgroundImage: `radial-gradient(circle at 15% 20%, ${solarTermTheme.palette.primary}07 0, transparent 50%), radial-gradient(circle at 85% 80%, ${solarTermTheme.palette.secondary}05 0, transparent 50%)`,
        }}
      >
        {/* 输入表单区：苹果官网风格标题 + 副标题 */}
        <Card
          className="overflow-hidden border-border/50 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]"
          style={{
            background: `linear-gradient(180deg, #FFFFFF 0%, ${solarTermTheme.palette.card}33 100%)`,
          }}
        >
          {/* 顶部节气色装饰条（呼应 Hero 的色板横条） */}
          <div className="flex h-[2px] w-full">
            {solarTermTheme.colors.slice(0, 6).map((c, i) => (
              <div key={`form-bar-${i}`} className="flex-1" style={{ backgroundColor: c }} />
            ))}
          </div>

          <CardHeader className="pt-10 pb-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div>
                {/* 苹果官网式：超大表单标题 */}
                <CardTitle
                  className="flex justify-center text-center text-[32px] font-black leading-tight md:text-[44px]"
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    color: 'var(--foreground)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  输入出生信息
                </CardTitle>
                {/* 精细副标题：低对比度，较大字号 */}
                <CardDescription
                  className="mt-4 max-w-xl text-[17px] font-normal leading-relaxed md:text-[18px]"
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    opacity: 0.68,
                    letterSpacing: '0.01em',
                  }}
                >
                  请输入公历出生年月日时 · 系统将按真太阳时自动校正并排盘
                </CardDescription>
              </div>
              <div
                className="mt-6 hidden rounded-full px-4 py-1.5 text-[11px] font-medium tracking-[0.18em] md:block"
                style={{
                  backgroundColor: `${solarTermTheme.palette.primary}0C`,
                  color: 'var(--foreground)',
                  fontFamily: "'Noto Serif SC', serif",
                  opacity: 0.85,
                }}
              >
                {solarTermTheme.name} · 今日节气
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {/* 新中式典雅输入：四步编号字段卡片 + 快选按钮（方便客户使用）*/}
            {(() => {
              // —— 常用快选常量（无需额外文件，直接内联，保持代码结构简单）——
              const POPULAR_YEARS = [1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010];
              const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']; // 对应阳历 1-12 月
              // 完整生辰字符串解析：支持 199910012000（YYYYMMDDHHmm）等格式，自动去分隔符
              const parseFullBirthStr = (raw: string): { ok: boolean; y?: string; mo?: string; d?: string; h?: string; mi?: string; msg?: string } => {
                const s = String(raw ?? '').replace(/\D/g, ''); // 去所有非数字（空格/-/:/. 等）
                if (s.length < 8 || s.length > 12) {
                  return { ok: false, msg: '长度不对：需 阳历 年(4)月(2)日(2)[时(2)分(2)]，例 199910012000' };
                }
                const padLen = 12 - s.length;
                const full = s + '0'.repeat(Math.max(0, padLen)); // 不足时分位自动补 0
                const yStr = full.slice(0, 4);
                const moStr = full.slice(4, 6);
                const dStr = full.slice(6, 8);
                const hStr = full.slice(8, 10);
                const miStr = full.slice(10, 12);
                const yNum = parseInt(yStr, 10);
                const moNum = parseInt(moStr, 10);
                const dNum = parseInt(dStr, 10);
                const hNum = parseInt(hStr, 10);
                const miNum = parseInt(miStr, 10);
                if (!(yNum >= 1800 && yNum <= 2100)) return { ok: false, msg: `年份 ${yStr} 不在支持范围 1800-2100` };
                if (!(moNum >= 1 && moNum <= 12)) return { ok: false, msg: `月份 ${moStr} 非法（应为 01-12）` };
                if (!(dNum >= 1 && dNum <= 31)) return { ok: false, msg: `日期 ${dStr} 非法（应为 01-31）` };
                if (!(hNum >= 0 && hNum <= 23)) return { ok: false, msg: `小时 ${hStr} 非法（应为 00-23）` };
                if (!(miNum >= 0 && miNum <= 59)) return { ok: false, msg: `分钟 ${miStr} 非法（应为 00-59）` };
                return {
                  ok: true,
                  y: String(yNum),
                  mo: String(moNum),
                  d: String(dNum),
                  h: String(hNum),
                  mi: String(miNum),
                };
              };

              const accent = solarTermTheme.palette.primary; // 随今日节气变色（延续现有节气主题，不破坏统一性）
              const accentSoft = `${accent}1A`;
              const accentLine = `${accent}55`;

              const FieldStepBadge = ({ n, label }: { n: number; label: string }) => (
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="inline-flex size-7 items-center justify-center rounded-full text-[11px] font-black text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${accent} 0%, ${accent}DD 100%)`,
                      boxShadow: `0 6px 16px -8px ${accent}AA`,
                      fontFamily: "'Noto Serif SC', serif",
                    }}
                  >
                    {String(n).padStart(2, '0')}
                  </div>
                  <div
                    className="text-[13px] font-black tracking-[0.18em]"
                    style={{ color: 'var(--foreground)', fontFamily: "'Noto Serif SC', serif" }}
                  >
                    {label}
                  </div>
                  <div className="ml-2 flex-1 border-t border-dashed" style={{ borderColor: accentLine, opacity: 0.5 }} />
                </div>
              );

              const ChipButton = ({
                active,
                onClick,
                children,
                title,
              }: {
                active?: boolean;
                onClick: () => void;
                children: React.ReactNode;
                title?: string;
              }) => (
                <button
                  type="button"
                  onClick={onClick}
                  title={title}
                  className="group inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all active:scale-[0.96] hover:-translate-y-0.5"
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    background: active ? `${accent}` : 'rgba(255,255,255,0.85)',
                    color: active ? '#ffffff' : 'var(--foreground)',
                    border: `1px solid ${active ? accent : accentLine}`,
                    boxShadow: active
                      ? `0 8px 20px -8px ${accent}BB, inset 0 0 0 1px rgba(255,255,255,0.25)`
                      : '0 2px 4px -2px rgba(15,23,42,0.06)',
                  }}
                >
                  {children}
                </button>
              );

              return (
                <div className="space-y-7">
                  {/* 排盘模式切换：按日期 / 手动四柱 */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                      {(['date', 'manual'] as const).map((md) => (
                        <button
                          key={md}
                          type="button"
                          onClick={() => setInputMode(md)}
                          className="rounded-lg px-4 py-2 text-[13px] font-black tracking-widest transition-all"
                          style={{
                            fontFamily: "'Noto Serif SC', serif",
                            background: inputMode === md ? accent : 'transparent',
                            color: inputMode === md ? '#ffffff' : 'var(--foreground)',
                            boxShadow: inputMode === md ? `0 6px 14px -6px ${accent}BB` : 'none',
                          }}
                        >
                          {md === 'date' ? '按日期排盘' : '手动四柱'}
                        </button>
                      ))}
                    </div>
                    {inputMode === 'manual' && (
                      <div className="text-[11px] font-bold tracking-widest text-muted-foreground/75" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                        已选四柱 · {mYearStem}{mYearBranch} {mMonthStem}{mMonthBranch} {mDayStem}{mDayBranch} {mHourStem}{mHourBranch}
                      </div>
                    )}
                  </div>

                  {/* 手动四柱模式：自选四柱 + 参照出生年份 */}
                  {inputMode === 'manual' && (
                    <div className="rounded-2xl p-5" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                      <FieldStepBadge n={0} label="手动四柱 · 自选" />
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {([
                          { t: '年柱', s: mYearStem, b: mYearBranch, sm: setMYearStem, bm: setMYearBranch },
                          { t: '月柱', s: mMonthStem, b: mMonthBranch, sm: setMMonthStem, bm: setMMonthBranch },
                          { t: '日柱', s: mDayStem, b: mDayBranch, sm: setMDayStem, bm: setMDayBranch },
                          { t: '时柱', s: mHourStem, b: mHourBranch, sm: setMHourStem, bm: setMHourBranch },
                        ]).map((p) => (
                          <div key={p.t} className="rounded-xl p-3" style={{ border: `1px solid ${accentLine}`, background: '#ffffff' }}>
                            <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: "'Noto Serif SC', serif" }}>{p.t}</Label>
                            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                              <Select value={p.s} onValueChange={(v) => (p.sm as (x: string) => void)(v)}>
                                <SelectTrigger className="!h-11 !text-sm !font-black" style={{ background: '#fff', border: `1.5px solid ${accentLine}`, fontFamily: "'Noto Serif SC', serif" }}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STEMS.map((st) => (
                                    <SelectItem key={st} value={st} className="!text-sm !font-bold !text-black">{st}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={p.b} onValueChange={(v) => (p.bm as (x: string) => void)(v)}>
                                <SelectTrigger className="!h-11 !text-sm !font-black" style={{ background: '#fff', border: `1.5px solid ${accentLine}`, fontFamily: "'Noto Serif SC', serif" }}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {BRANCHES.map((br) => (
                                    <SelectItem key={br} value={br} className="!text-sm !font-bold !text-black">{br}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div
                              className="mt-2 rounded-md py-1 text-center text-[15px] font-black tracking-[0.2em]"
                              style={{ background: accentSoft, color: accent, fontFamily: "'Noto Serif SC', serif" }}
                            >
                              {p.s}{p.b}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                            参照出生年份 <span className="font-normal text-muted-foreground/80">（仅用于定大运流年的年龄/年份，干支仍以自选四柱为准）</span>
                          </Label>
                          <Input
                            type="number"
                            value={mBirthYear}
                            onChange={(e) => setMBirthYear(e.target.value)}
                            placeholder="例：1990"
                            className="!h-12 !px-4 !text-lg font-black tracking-wider focus-visible:ring-0"
                            style={{ fontFamily: "'Noto Serif SC', serif", background: '#ffffff', border: `1.5px solid ${accentLine}`, color: 'var(--foreground)' }}
                          />
                        </div>
                        <div className="flex items-end gap-3">
                          {/* 乾/坤再造 大按钮 */}
                          <button
                            type="button"
                            onClick={() => setGender('male')}
                            className="h-12 flex-1 rounded-xl text-[15px] font-black tracking-widest transition-all"
                            style={{
                              fontFamily: "'Noto Serif SC', serif",
                              background: gender === 'male' ? `linear-gradient(135deg, ${accent} 0%, ${accent}E6 100%)` : '#ffffff',
                              color: gender === 'male' ? '#ffffff' : 'var(--foreground)',
                              border: `2px solid ${gender === 'male' ? accent : accentLine}`,
                            }}
                          >乾造 · 男</button>
                          <button
                            type="button"
                            onClick={() => setGender('female')}
                            className="h-12 flex-1 rounded-xl text-[15px] font-black tracking-widest transition-all"
                            style={{
                              fontFamily: "'Noto Serif SC', serif",
                              background: gender === 'female' ? 'linear-gradient(135deg, #BE185D 0%, #9D174D 100%)' : '#ffffff',
                              color: gender === 'female' ? '#ffffff' : 'var(--foreground)',
                              border: `2px solid ${gender === 'female' ? '#BE185D' : accentLine}`,
                            }}
                          >坤造 · 女</button>
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] font-bold leading-relaxed tracking-wider text-muted-foreground/70" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                        · 大运起运年龄按一岁近似；参考年份应落在所填年柱六十甲子循环上的一个代表年份。手动四柱需自洽（年/月/日/时干支一般应符合同一甲子循环）。
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          size="lg"
                          onClick={handleManualAnalyze}
                          className="min-w-[220px] !text-base font-black tracking-[0.22em] transition-all active:translate-y-[1px] active:scale-[0.99] hover:-translate-y-[2px]"
                          style={{
                            background: `linear-gradient(135deg, ${accent} 0%, ${accent}E0 100%)`,
                            color: '#ffffff',
                            height: '58px',
                            paddingLeft: '34px',
                            paddingRight: '34px',
                            borderRadius: '14px',
                            fontFamily: "'Noto Serif SC', serif",
                            boxShadow: `0 20px 40px -14px ${accent}99, inset 0 0 0 2px rgba(255,255,255,0.22), inset 0 -10px 20px -10px rgba(0,0,0,0.18)`,
                            border: `1.5px solid ${accent}`,
                          }}
                        >
                          手动四柱排盘
                        </Button>
                      </div>
                    </div>
                  )}

                  {inputMode === 'date' && (<Fragment>
                  {/* 00 完整生辰快速输入（一条栏：粘贴 199910012000 → 自动拆分 年月日时分）*/}
                  <div className="rounded-2xl p-5" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                    <FieldStepBadge n={0} label="完整生辰 · 一键输入" />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="flex-1 space-y-2">
                        <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                          阳历生辰串 <span className="font-normal text-muted-foreground/80">（支持 199910012000 / 1999-10-01 20:00 / 19991001 等格式，自动去分隔符）</span>
                        </Label>
                        <Input
                          type="text"
                          inputMode="text"
                          value={fullBirthInput}
                          onChange={(e) => setFullBirthInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const r = parseFullBirthStr(fullBirthInput);
                              if (!r.ok || !r.y || !r.mo || !r.d || !r.h || !r.mi) { toast.error(r.msg ?? '格式错误'); return; }
                              setYear(r.y); setMonth(r.mo); setDay(r.d); setHour(r.h); setMinute(r.mi);
                              toast.success(`已解析：${r.y}年${Number(r.mo)}月${Number(r.d)}日 ${String(r.h).padStart(2,'0')}:${String(r.mi).padStart(2,'0')}`);
                            }
                          }}
                          placeholder="例：199910012000（1999年10月1日20时00分）"
                          className="!h-12 !px-4 !text-base font-black tracking-widest tabular-nums focus-visible:ring-0"
                          style={{
                            fontFamily: "'Noto Serif SC', serif",
                            background: '#ffffff',
                            border: `1.5px solid ${accentLine}`,
                            color: 'var(--foreground)',
                            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                            letterSpacing: '0.06em',
                          }}
                        />
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold leading-relaxed tracking-wider text-muted-foreground/75" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                          <span>格式：</span>
                          <span className="rounded-md bg-white/80 px-2 py-0.5 tabular-nums" style={{ border: `1px dashed ${accentLine}` }}>YYYYMMDDHHmm</span>
                          <span className="text-muted-foreground/50">→ 8位仅年月日时自动补 00 分，10位补 0 分</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          const r = parseFullBirthStr(fullBirthInput);
                          if (!r.ok || !r.y || !r.mo || !r.d || !r.h || !r.mi) { toast.error(r.msg ?? '格式错误'); return; }
                          setYear(r.y); setMonth(r.mo); setDay(r.d); setHour(r.h); setMinute(r.mi);
                          toast.success(`已解析：${r.y}年${Number(r.mo)}月${Number(r.d)}日 ${String(r.h).padStart(2,'0')}:${String(r.mi).padStart(2,'0')}`);
                        }}
                        className="font-bold transition-all active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-lg"
                        style={{
                          height: '48px',
                          paddingLeft: '24px',
                          paddingRight: '24px',
                          fontFamily: "'Noto Serif SC', serif",
                          background: `linear-gradient(135deg, ${accent} 0%, ${accent}E6 100%)`,
                          color: '#ffffff',
                          border: `1.5px solid ${accent}`,
                          boxShadow: `0 12px 26px -12px ${accent}BB`,
                        }}
                      >
                        解析并填入
                      </Button>
                    </div>
                  </div>

                  {/* 第 1-2 行：① 年 / ② 月日 */}
                  <div className="grid gap-5 lg:grid-cols-5">
                    {/* ① 出生年份（占 2 列）*/}
                    <div className="rounded-2xl p-5 lg:col-span-2" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                      <FieldStepBadge n={1} label="出生年份" />
                      <div className="space-y-2">
                        <Input
                          type="number"
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          placeholder="例：1990"
                          className="!h-12 !px-4 !text-lg font-black tracking-wider focus-visible:ring-0"
                          style={{
                            fontFamily: "'Noto Serif SC', serif",
                            background: '#ffffff',
                            border: `1.5px solid ${accentLine}`,
                            color: 'var(--foreground)',
                            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                          }}
                        />
                      </div>
                      <div className="mt-3">
                        <div className="mb-1.5 text-[10px] font-bold tracking-widest text-muted-foreground/80" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                          · 常用年份一键填入 ·
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {POPULAR_YEARS.map((y) => (
                            <ChipButton
                              key={y}
                              active={year === String(y)}
                              onClick={() => setYear(String(y))}
                              title={`一键填入 ${y} 年`}
                            >
                              {y}
                            </ChipButton>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ② 出生月日（占 3 列）*/}
                    <div className="rounded-2xl p-5 lg:col-span-3" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                      <FieldStepBadge n={2} label="出生月日" />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: "'Noto Serif SC', serif" }}>月份</Label>
                          <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger className="!h-12 !text-base !font-black" style={{ background: '#fff', border: `1.5px solid ${accentLine}`, color: 'var(--foreground)' }}>
                              <SelectValue placeholder="请选择月份" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)} className="!text-sm !font-bold">
                                  {LUNAR_MONTHS[i]}月 · {i + 1} 月
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: "'Noto Serif SC', serif" }}>日期</Label>
                          <Select value={day} onValueChange={setDay}>
                            <SelectTrigger className="!h-12 !text-base !font-black" style={{ background: '#fff', border: `1.5px solid ${accentLine}`, color: 'var(--foreground)' }}>
                              <SelectValue placeholder="请选择日期" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 31 }, (_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)} className="!text-sm !font-bold">
                                  {i + 1} 日
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1.5 text-[10px] font-bold tracking-widest text-muted-foreground/80" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                          · 农历月快选 ·
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {LUNAR_MONTHS.map((lm, i) => (
                            <ChipButton
                              key={lm}
                              active={month === String(i + 1)}
                              onClick={() => setMonth(String(i + 1))}
                              title={`${lm}月 = 阳历 ${i + 1} 月`}
                            >
                              {lm}月
                            </ChipButton>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 第 3-4 行：③ 性别 / ④ 时分 */}
                  <div className="grid gap-5 lg:grid-cols-5">
                    {/* ③ 命主性别（占 2 列，左右大按钮，不再下拉）*/}
                    <div className="rounded-2xl p-5 lg:col-span-2" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                      <FieldStepBadge n={3} label="命主性别" />
                      <div className="mt-1 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setGender('male')}
                          className="group inline-flex h-16 flex-col items-center justify-center rounded-xl transition-all active:scale-[0.98] hover:-translate-y-0.5"
                          style={{
                            fontFamily: "'Noto Serif SC', serif",
                            background: gender === 'male' ? `linear-gradient(135deg, ${accent} 0%, ${accent}E6 100%)` : '#ffffff',
                            color: gender === 'male' ? '#ffffff' : 'var(--foreground)',
                            border: `2px solid ${gender === 'male' ? accent : accentLine}`,
                            boxShadow:
                              gender === 'male'
                                ? `0 14px 30px -14px ${accent}DD, inset 0 0 0 1px rgba(255,255,255,0.35)`
                                : '0 2px 6px -3px rgba(15,23,42,0.08)',
                          }}
                        >
                          <div className="text-[18px] font-black leading-none">乾造</div>
                          <div className="mt-1 text-[11px] font-bold opacity-90 tracking-widest">男命 · Yang</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('female')}
                          className="group inline-flex h-16 flex-col items-center justify-center rounded-xl transition-all active:scale-[0.98] hover:-translate-y-0.5"
                          style={{
                            fontFamily: "'Noto Serif SC', serif",
                            background: gender === 'female' ? `linear-gradient(135deg, #BE185D 0%, #9D174D 100%)` : '#ffffff',
                            color: gender === 'female' ? '#ffffff' : 'var(--foreground)',
                            border: `2px solid ${gender === 'female' ? '#BE185D' : accentLine}`,
                            boxShadow:
                              gender === 'female'
                                ? `0 14px 30px -14px rgba(190, 24, 93, 0.75), inset 0 0 0 1px rgba(255,255,255,0.35)`
                                : '0 2px 6px -3px rgba(15,23,42,0.08)',
                          }}
                        >
                          <div className="text-[18px] font-black leading-none">坤造</div>
                          <div className="mt-1 text-[11px] font-bold opacity-90 tracking-widest">女命 · Yin</div>
                        </button>
                      </div>
                    </div>

                    {/* ④ 出生时分（占 3 列，仅按 0-23 小时 / 0-59 分钟下拉选择）*/}
                    <div className="rounded-2xl p-5 lg:col-span-3" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                      <FieldStepBadge n={4} label="出生时分" />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: "'Noto Serif SC', serif" }}>出生小时</Label>
                          <Select value={hour} onValueChange={setHour}>
                            <SelectTrigger className="!h-12 !text-base !font-black" style={{ background: '#fff', border: `1.5px solid ${accentLine}`, color: 'var(--foreground)' }}>
                              <SelectValue placeholder="时" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={String(i)} className="!text-sm !font-bold">
                                  {i.toString().padStart(2, '0')} 时
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: "'Noto Serif SC', serif" }}>出生分钟</Label>
                          <Select value={minute} onValueChange={setMinute}>
                            <SelectTrigger className="!h-12 !text-base !font-black" style={{ background: '#fff', border: `1.5px solid ${accentLine}`, color: 'var(--foreground)' }}>
                              <SelectValue placeholder="分" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 60 }, (_, i) => (
                                <SelectItem key={i} value={String(i)} className="!text-sm !font-bold">
                                  {i.toString().padStart(2, '0')} 分
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 提交按钮：朱印质感主按钮 + 次要辅助按钮 */}
                  <div
                    className="flex flex-col items-stretch gap-3 border-t pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                    style={{ borderColor: accentLine }}
                  >
                    <div className="order-2 flex flex-wrap items-center gap-3 sm:order-1">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={fillExample}
                        className="font-bold transition-all active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-lg"
                        style={{
                          borderColor: accentLine,
                          background: '#ffffff',
                          color: 'var(--foreground)',
                          height: '48px',
                          paddingLeft: '20px',
                          paddingRight: '20px',
                          fontFamily: "'Noto Serif SC', serif",
                        }}
                      >
                        载入示例
                      </Button>
                      {analyzed && (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={handleReset}
                          className="font-bold transition-all active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-lg"
                          style={{ height: '48px', color: 'var(--foreground)', borderColor: accentLine, background: '#ffffff', fontFamily: "'Noto Serif SC', serif" }}
                        >
                          重新排盘
                        </Button>
                      )}
                      <div
                        className="hidden text-[10px] font-bold leading-relaxed tracking-widest text-muted-foreground/70 sm:block"
                        style={{ fontFamily: "'Noto Serif SC', serif" }}
                      >
                        数据均在本地计算 · 不上传云端
                      </div>
                    </div>
                    <div className="order-1 sm:order-2">
                      <Button
                        size="lg"
                        onClick={handleAnalyze}
                        className="min-w-[220px] !text-base font-black tracking-[0.22em] transition-all active:translate-y-[1px] active:scale-[0.99] hover:-translate-y-[2px]"
                        style={{
                          background: `linear-gradient(135deg, ${accent} 0%, ${accent}E0 100%)`,
                          color: '#ffffff',
                          height: '58px',
                          paddingLeft: '34px',
                          paddingRight: '34px',
                          borderRadius: '14px',
                          fontFamily: "'Noto Serif SC', serif",
                          boxShadow: `0 20px 40px -14px ${accent}99, inset 0 0 0 2px rgba(255,255,255,0.22), inset 0 -10px 20px -10px rgba(0,0,0,0.18)`,
                          border: `1.5px solid ${accent}`,
                        }}
                      >
                        一键排盘分析
                      </Button>
                    </div>
                  </div>
                  </Fragment>)}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* 分析结果区：左主内容 + 右侧 TOC（大屏显示） */}
        {analyzedBoolean && (
          <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
            {/* 左：主内容列 */}
            <div className="space-y-8 min-w-0 md:space-y-12">
              {/* 分析结果总标题：苹果官网风格 */}
              <div className="text-center">
                <h2
                  className="text-[36px] font-black leading-tight md:text-[48px]"
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    color: 'var(--foreground)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  命局分析报告
                </h2>
                <p
                  className="mt-3 text-[16px] font-normal md:text-[18px]"
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    opacity: 0.62,
                    letterSpacing: '0.01em',
                  }}
                >
                  基于天之易八字命理体系 · 完整结构化解读
                </p>
              </div>


              {/* 一、四柱排盘总览 */}
              <Card
                id="section-pillars"
                className="scroll-mt-6"
              >
                <CardHeader className="pt-8 pb-5 text-center">
                  <CardTitle
                    className="flex justify-center text-center text-[28px] font-black leading-tight md:text-[34px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      color: 'var(--foreground)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    四柱排盘总览
                  </CardTitle>
                  <CardDescription
                    className="mt-3 text-[15px] font-normal md:text-[16px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      opacity: 0.65,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {chart.birthInfo.solarDate} {chart.birthInfo.solarTime}（{chart.gender === 'male' ? '男命' : '女命'}）·
                    真太阳时 {chart.birthInfo.trueSolarTime}
                    （{chart.birthInfo.trueSolarOffset > 0 ? '+' : ''}
                    {chart.birthInfo.trueSolarOffset} 分）
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2 md:gap-4">
                    {[chart.year, chart.month, chart.day, chart.hour].map((pillar, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col items-center rounded-xl border p-3 md:p-4 ${
                          idx === 2 ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : 'border-border/60 bg-card'
                        }`}
                      >
                        <div className="mb-1 text-xs text-muted-foreground">
                          {pillarNames[idx]} · {pillarLabels[idx]}
                        </div>
                        {/* 天干 */}
                        <div className="relative">
                          {(() => {
                            // 日主（日柱天干 = idx 2）不纳入用神 / 非用神显示，保持中性视觉
                            const isRiZhu = idx === 2;
                            const stemMark = isRiZhu
                              ? 'neutral'
                              : yongJi.stemMarks[`${['年', '月', '日', '时'][idx]}干`];
                            return (
                              <>
                                <div
                                  className={`flex size-14 items-center justify-center rounded-lg text-2xl font-bold md:size-16 md:text-3xl ${
                                    !isRiZhu && stemMark === 'useful'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : !isRiZhu && stemMark === 'taboo'
                                        ? 'bg-rose-100 text-rose-700'
                                        : 'bg-muted text-foreground'
                                  }`}
                                >
                                  {pillar.stem}
                                </div>
                                <div className="absolute -top-1 -right-1">
                                  {isRiZhu ? (
                                    <Badge
                                      className="text-[10px] font-bold"
                                      style={{
                                        background: `var(--st-primary)`,
                                        color: '#ffffff',
                                        border: `1px solid ${solarTermTheme.palette.primary}`,
                                      }}
                                    >
                                      日主
                                    </Badge>
                                  ) : (
                                    renderMarkBadge(stemMark)
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground md:text-xs">
                          {ELEMENT_NAMES[pillar.stemElement]}·{pillar.stemYinYang === 'yang' ? '阳' : '阴'}
                        </div>
                        {pillar.shiShen && (
                          <div className="mt-0.5 text-[10px] font-medium text-primary md:text-xs">{pillar.shiShen}</div>
                        )}
                        {/* 分隔线 */}
                        <div className="my-2 h-px w-full bg-border/60" />
                        {/* 地支 */}
                        <div className="relative">
                          <div
                            className={`flex size-14 items-center justify-center rounded-lg text-2xl font-bold md:size-16 md:text-3xl ${
                              yongJi.branchMarks[`${['年', '月', '日', '时'][idx]}支`] === 'useful'
                                ? 'bg-emerald-100 text-emerald-700'
                                : yongJi.branchMarks[`${['年', '月', '日', '时'][idx]}支`] === 'taboo'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-muted text-foreground'
                            }`}
                          >
                            {pillar.branch}
                          </div>
                          <div className="absolute -top-1 -right-1">
                            {renderMarkBadge(yongJi.branchMarks[`${['年', '月', '日', '时'][idx]}支`])}
                          </div>
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground md:text-xs">
                          {ELEMENT_NAMES[pillar.branchElement]}·{pillar.branchYinYang === 'yang' ? '阳' : '阴'}
                        </div>
                        <div className="mt-2 w-full">
                          <div className="text-[10px] text-muted-foreground">藏干</div>
                          <div className="mt-0.5 flex justify-center gap-1">
                            {pillar.hiddenStems.map((s, i) => {
                              const stemEl = STEM_ELEMENTS[s];
                              const stemYY = STEM_YINYANG[s];
                              const isUsefulElement = !!(yongJi?.usefulElements ?? []).includes(stemEl);
                              const isUsefulStem = !!((yongJi as any)?.usefulStems ?? []).includes(s);
                              const fitDirection = monthQi
                                ? (monthQi.usageDirection === 'yang' && stemYY === 'yang') ||
                                  (monthQi.usageDirection === 'yin' && stemYY === 'yin')
                                : false;
                              const isJi = isUsefulElement || isUsefulStem || fitDirection;
                              return (
                                <span
                                  key={i}
                                  className={`relative inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ${
                                    isJi ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-muted'
                                  }`}
                                >
                                  {s}
                                  {isJi && (
                                    <span className="ml-0.5 inline-flex size-[12px] items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold leading-none text-white">
                                      吉
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="inline-block size-3 rounded bg-emerald-100 ring-1 ring-emerald-300" />
                      用神（有助平衡）
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block size-3 rounded bg-rose-100 ring-1 ring-rose-300" />
                      忌神（破坏平衡）
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block size-3 rounded bg-muted" />
                      中性（无直接助损）
                    </span>
                  </div>
                </CardContent>
              </Card>


              {/* 二、命局模式分析 */}
              <Card
                id="section-mingju-pattern"
                className="scroll-mt-6 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]"
                style={{ borderLeft: `3px solid ${solarTermTheme.palette.secondary}` }}
              >
                <CardHeader className="pt-8 pb-5 text-center">
                  <CardTitle
                    className="flex justify-center text-center text-[28px] font-black leading-tight md:text-[34px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      color: 'var(--foreground)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    命局模式分析
                  </CardTitle>
                  <CardDescription
                    className="mt-3 text-[15px] font-normal md:text-[16px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      opacity: 0.65,
                      letterSpacing: '0.01em',
                    }}
                  >从<span className="mark-highlight">四柱结构</span>判断格局类型与主生克路线</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 年月太极（《太极阴阳法》：年为格局根本，年月组合构成命局核心太极） */}
                  {pattern.nianYueTaiJi && (
                    <div
                      className="rounded-lg p-4"
                      style={{ backgroundColor: `${solarTermTheme.palette.primary}0A`, border: `1px solid ${solarTermTheme.palette.primary}22` }}
                    >
                      <div className="text-sm font-bold" style={{ color: `${solarTermTheme.palette.primary}` }}><span className="mark-highlight">年月太极分析</span></div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-md px-2.5 py-1 text-[13px] font-black text-foreground" style={{ fontFamily: "'Noto Serif SC', serif", backgroundColor: `${solarTermTheme.palette.primary}14`, border: `1px solid ${solarTermTheme.palette.primary}30` }}>
                          {pattern.nianYueTaiJi.yearGZ}年 · {pattern.nianYueTaiJi.monthGZ}月
                        </span>
                        <span className="rounded-md px-2.5 py-1 text-[13px] font-black" style={{ fontFamily: "'Noto Serif SC', serif", color: '#FFFFFF', backgroundColor: `${solarTermTheme.palette.primary}` }}>
                          {pattern.nianYueTaiJi.taijiName}
                        </span>
                        <span className="rounded-md px-2.5 py-1 text-[13px] font-black" style={{
                          fontFamily: "'Noto Serif SC', serif",
                          color: pattern.nianYueTaiJi.state === '两仪完整' ? '#047857' : pattern.nianYueTaiJi.state === '两仪受损' ? '#B45309' : '#B91C1C',
                          backgroundColor: pattern.nianYueTaiJi.state === '两仪完整' ? '#ECFDF5' : pattern.nianYueTaiJi.state === '两仪受损' ? '#FFFBEB' : '#FEF2F2',
                          border: `1px solid ${pattern.nianYueTaiJi.state === '两仪完整' ? '#A7F3D0' : pattern.nianYueTaiJi.state === '两仪受损' ? '#FDE68A' : '#FECACA'}`,
                        }}>
                          {pattern.nianYueTaiJi.state}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed font-bold text-foreground">{pattern.nianYueTaiJi.verdict}</p>
                      <div className="mt-3 grid gap-2 text-[13px] leading-relaxed font-bold text-muted-foreground sm:grid-cols-2">
                        <div className="rounded-md border border-border/60 bg-card/60 px-3 py-2">
                          <span className="font-black text-foreground">年干定位：</span>{pattern.nianYueTaiJi.yearStemJiXiong}（{pattern.nianYueTaiJi.yearStemChangSheng}）— {pattern.nianYueTaiJi.yearStemReason}
                        </div>
                        <div className="rounded-md border border-border/60 bg-card/60 px-3 py-2">
                          <span className="font-black text-foreground">年支作用：</span>{pattern.nianYueTaiJi.yearBranchAction}— {pattern.nianYueTaiJi.yearBranchReason}
                        </div>
                        <div className="rounded-md border border-border/60 bg-card/60 px-3 py-2">
                          <span className="font-black text-foreground">阳仪：</span>{pattern.nianYueTaiJi.yangYi.stem}（{pattern.nianYueTaiJi.yangYi.state}·{pattern.nianYueTaiJi.yangYi.power}分）· <span className="font-black text-foreground">阴仪：</span>{pattern.nianYueTaiJi.yinYi.stem}（{pattern.nianYueTaiJi.yinYi.state}·{pattern.nianYueTaiJi.yinYi.power}分）
                        </div>
                        <div className="rounded-md border border-border/60 bg-card/60 px-3 py-2">
                          <span className="font-black text-foreground">日时应验：</span>{pattern.nianYueTaiJi.riShiEffect}— {pattern.nianYueTaiJi.riShiReason}
                        </div>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed font-bold text-muted-foreground">{pattern.nianYueTaiJi.taijiNote}</p>
                      {pattern.nianYueTaiJi.matchedCase && (
                        <div className="mt-2 rounded-md border border-border/60 bg-card/60 px-3 py-2 text-[13px] leading-relaxed font-bold text-muted-foreground">
                          <span className="font-black text-foreground">参考格局「{pattern.nianYueTaiJi.matchedCase.title}」：</span>{pattern.nianYueTaiJi.matchedCase.analysis}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className="rounded-lg p-4"
                    style={{ backgroundColor: `${solarTermTheme.palette.secondary}0C`, border: `1px solid ${solarTermTheme.palette.secondary}28` }}
                  >
                    <div className="text-sm font-bold" style={{ color: `${solarTermTheme.palette.secondary}` }}><span className="mark-highlight">命局模式类型</span></div>
                    <div className="mt-2 text-lg font-black text-foreground">{pattern.patternType}</div>
                    <p className="mt-2 text-sm leading-relaxed font-bold text-muted-foreground">{pattern.description}</p>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-bold"><span className="mark-highlight">主要生克关系</span></div>
                    <div className="space-y-1.5">
                      {pattern.mainShengKe.map((rel, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-1.5 text-sm font-bold">
                          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: `${solarTermTheme.palette.secondary}` }} />
                          {rel}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* 三、大运流年分析 */}
              <Card
                id="section-dayun"
                className="scroll-mt-6 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]"
                style={{ borderLeft: '3px solid #0EA5E9' }}
              >
                <CardHeader className="pt-8 pb-5 text-center">
                  <CardTitle
                    className="flex justify-center text-center text-[28px] font-black leading-tight md:text-[34px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      color: 'var(--foreground)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    大运流年分析
                  </CardTitle>
                  <CardDescription
                    className="mt-3 text-[15px] font-normal md:text-[16px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      opacity: 0.65,
                      letterSpacing: '0.01em',
                    }}
                  >十年一大运、一年一流年，<span className="mark-highlight">岁运引动</span>定吉凶应期</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    // ===== 大运/流年 新九档字母等级视觉映射（S+ > S > A+ > A > B+ > B- > C > C- > D）=====
                    const LETTER_META: Record<string, { bg: string; border: string; text: string; ring: string; labelColor: string; dot: string }> = {
                      'S+': { bg: 'linear-gradient(135deg,#fff1f2,#fef3c7)', border: '#E11D48', text: '#881337', ring: '#F43F5E', labelColor: '#9F1239', dot: '#E11D48' },
                      'S':  { bg: 'linear-gradient(135deg,#fefce8,#fef9c3)', border: '#D97706', text: '#78350F', ring: '#F59E0B', labelColor: '#B45309', dot: '#F59E0B' },
                      'A+': { bg: '#ECFDF5', border: '#059669', text: '#064E3B', ring: '#10B981', labelColor: '#047857', dot: '#059669' },
                      'A':  { bg: '#F0FDF4', border: '#16A34A', text: '#14532D', ring: '#22C55E', labelColor: '#15803D', dot: '#16A34A' },
                      'B+': { bg: '#F0F9FF', border: '#0284C7', text: '#082F49', ring: '#0EA5E9', labelColor: '#0369A1', dot: '#0284C7' },
                      'B-': { bg: '#F8FAFC', border: '#475569', text: '#0F172A', ring: '#64748B', labelColor: '#334155', dot: '#64748B' },
                      'C':  { bg: '#FFF7ED', border: '#EA580C', text: '#7C2D12', ring: '#F97316', labelColor: '#C2410C', dot: '#EA580C' },
                      'C-': { bg: '#FEF2F2', border: '#DC2626', text: '#450A0A', ring: '#EF4444', labelColor: '#B91C1C', dot: '#DC2626' },
                      'D':  { bg: 'linear-gradient(135deg,#18181B,#27272A)', border: '#09090B', text: '#FAFAFA', ring: '#52525B', labelColor: '#F4F4F5', dot: '#18181B' },
                    };
                    // 旧五档兼容映射（数据未切换时的兜底）
                    const WUDANG_META: Record<string, { bg: string; border: string; text: string; ring: string; labelColor: string; dot: string }> = {
                      '夯':     { bg: '#FFF7ED', border: '#B45309', text: '#0C0A09', ring: '#F59E0B', labelColor: '#9A3412', dot: '#B45309' },
                      '人上人': { bg: '#F5F3FF', border: '#6D28D9', text: '#0C0A09', ring: '#8B5CF6', labelColor: '#5B21B6', dot: '#6D28D9' },
                      'npc':    { bg: '#F8FAFC', border: '#475569', text: '#0F172A', ring: '#94A3B8', labelColor: '#334155', dot: '#475569' },
                      '拉':     { bg: '#FFF7ED', border: '#EA580C', text: '#0C0A09', ring: '#FB923C', labelColor: '#C2410C', dot: '#EA580C' },
                      '拉完了': { bg: '#FEF2F2', border: '#B91C1C', text: '#0C0A09', ring: '#EF4444', labelColor: '#991B1B', dot: '#B91C1C' },
                    };
                    // 取显示等级：优先用新九档 letterLevel，兜底用老 fortune/level
                    const getLevel = (row: any): string => {
                      if (row && (row.letterLevel === 0 || row.letterLevel)) return String(row.letterLevel);
                      return String(row?.fortune ?? row?.level ?? 'B-');
                    };
                    const m = (row: any) => {
                      const lvl = typeof row === 'string' ? row : getLevel(row);
                      return (LETTER_META[lvl] ?? WUDANG_META[lvl] ?? LETTER_META['B-']);
                    };
                    const displayLevel = (row: any) => getLevel(row);

                    // —— 点击大运切换折线图：activeDY 优先取 expandedDY（用户选中），否则取默认 currentDaYun ——
                    const clampScore = (n: number) => {
                      const v = typeof n === 'number' ? n : Number(n);
                      if (!Number.isFinite(v)) return 0;
                      return Math.max(-8, Math.min(8, Math.round(v * 10) / 10));
                    };
                    const useIndex =
                      expandedDY !== null &&
                      expandedDY >= 0 &&
                      expandedDY < daYunAnalysis.daYunWithFortune.length
                        ? expandedDY
                        : daYunAnalysis.currentDaYunIndex;
                    const activeDY = daYunAnalysis.daYunWithFortune[useIndex];
                    const isCurrentDY = useIndex === daYunAnalysis.currentDaYunIndex;
                    const activeCurve = {
                      label: `${activeDY.stem}${activeDY.branch}大运 · ${activeDY.startAge}-${activeDY.startAge + 9}岁（${activeDY.startYear}-${activeDY.endYear}年）`,
                      items: (Array.isArray(activeDY.liuNian10) ? activeDY.liuNian10 : []).map((ln: any) => ({
                        year: Number(ln.year) || 0,
                        ganzhi: String(ln.ganzhi || ''),
                        displayScore: clampScore(ln.displayScore),
                        level: displayLevel(ln),
                      })),
                    };

                    // 由流年年份推算命主年龄（落在哪一步大运，就用该运起始年龄 + 年差）；找不到所属大运则返回 undefined
                    const ageForYear = (year: number): number | undefined => {
                      const dy = daYunAnalysis.daYunWithFortune.find((d: any) => year >= d.startYear && year <= d.endYear);
                      if (!dy) return undefined;
                      return dy.startAge + (year - dy.startYear);
                    };

                    return (
                      <>
                        <div
                          className="rounded-lg p-4"
                          style={{ backgroundColor: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.22)' }}
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-bold" style={{ color: isCurrentDY ? '#0284C7' : '#334155' }}>
                              <span className="mark-highlight">
                                {isCurrentDY ? '当前大运' : '查看大运'}
                              </span>
                              {!isCurrentDY && (
                                <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black" style={{ backgroundColor: '#F3F4F6', color: '#334155', border: '1px solid #0C0A09' }}>
                                  点击下方大运行可切换
                                </span>
                              )}
                              <span className="ml-2 text-[13px] font-black" style={{ fontFamily: "'Noto Serif SC', serif", color: 'var(--foreground)' }}>
                                {activeCurve.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-muted-foreground">
                              {(['S+','S','A+','A','B+','B-','C','C-','D'] as const).map(lv => (
                                <span key={lv} className="inline-flex items-center gap-1">
                                  <span className="size-2.5 rounded-full" style={{ backgroundColor: LETTER_META[lv].dot }} />
                                  {lv}
                                </span>
                              ))}
                              <span className="text-[10px] text-muted-foreground/70">（分值梯度拉开：S+ {' > '} +6 ｜ S: +4~+6 ｜ A+: +2~+4 ｜ A: 0~+2 ｜ B+: -2~0 ｜ B-: -4~-2 ｜ C: -6~-4 ｜ C-: -8~-6 ｜ D {' < '} -8）</span>
                            </div>
                          </div>
                          <DaYunCurveChart items={activeCurve.items as any} />
                        </div>

                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <div className="text-sm font-bold"><span className="mark-highlight">八步大运</span></div>
                          </div>
                          <div className="w-full overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="whitespace-nowrap">序</TableHead>
                                  <TableHead className="whitespace-nowrap">大运</TableHead>
                                  <TableHead className="whitespace-nowrap">起运年龄</TableHead>
                                  <TableHead className="whitespace-nowrap">年份</TableHead>
                                  <TableHead className="whitespace-nowrap">总判</TableHead>
                                  <TableHead className="whitespace-nowrap">综合分</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {daYunAnalysis.daYunWithFortune.map((dy: any) => {
                                  const meta = m(dy);
                                  const isOpen = expandedDY === dy.index;
                                  const isCurrent = dy.index === daYunAnalysis.currentDaYunIndex;
                                  return (
                                    <Fragment key={dy.index}>
                                        <TableRow
                                          onClick={() => setExpandedDY(isOpen ? null : dy.index)}
                                          className={`cursor-pointer select-none transition-colors hover:bg-sky-50/30 ${isCurrent ? 'bg-sky-50/60' : ''}`}
                                        >
                                          <TableCell className="font-bold">
                                            <span className="inline-flex items-center gap-1.5">
                                              {isOpen ? (
                                                <span className="text-xs font-bold text-sky-600">▼</span>
                                              ) : (
                                                <span className="text-xs font-bold text-muted-foreground/80">▶</span>
                                              )}
                                              {dy.index + 1}
                                            </span>
                                          </TableCell>
                                          <TableCell className="font-semibold">
                                            {dy.stem}
                                            {dy.branch}
                                          </TableCell>
                                          <TableCell>{dy.startAge} 岁</TableCell>
                                          <TableCell className="tabular-nums">
                                            {dy.startYear}-{dy.endYear}
                                          </TableCell>
                                          <TableCell>
                                            <span
                                              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black"
                                              style={{
                                                background: meta.bg,
                                                color: meta.labelColor,
                                                border: `1px solid ${meta.border}`,
                                                boxShadow: `0 0 0 1px ${meta.ring}33`,
                                                letterSpacing: '0.06em',
                                              }}
                                            >
                                              {displayLevel(dy)}
                                            </span>
                                          </TableCell>
                                          <TableCell className="tabular-nums">
                                            <div>
                                              <span
                                                className="font-bold"
                                                style={{
                                                  color: dy.score > 4 ? '#E11D48' : dy.score > 2 ? '#B45309' : dy.score >= 0 ? '#047857' : dy.score >= -2 ? '#0369A1' : dy.score >= -6 ? '#C2410C' : '#991B1B',
                                                }}
                                              >
                                                {dy.score >= 0 ? '+' : ''}
                                                {dy.score}
                                              </span>
                                              <ScoreBreakdown row={dy} />
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                        {isOpen && (
                                          <TableRow className="bg-gradient-to-b from-sky-50/40 to-white/0 hover:bg-inherit">
                                            <TableCell colSpan={6} className="border-t border-dashed border-sky-200/60 px-2 py-4 sm:px-6">
                                              <div className="mb-2 flex items-center justify-between">
                                                <div className="text-xs font-semibold text-sky-800">
                                                  {dy.stem}
                                                  {dy.branch}运 · 下辖十年流年（每一年的总判和量化得分）
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                  {dy.startAge} 岁起 · {dy.startYear}-{dy.endYear}
                                                </div>
                                              </div>
                                              <div className="grid gap-2 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-10">
                                                {dy.liuNian10.map((ln: any) => {
                                                  const lmeta = m(ln);
                                                  return (
                                                    <div
                                                      key={ln.year}
                                                      className="group rounded-xl border p-2 transition-all hover:-translate-y-0.5 hover:shadow-md"
                                                      style={{
                                                        background: lmeta.bg,
                                                        borderColor: lmeta.border,
                                                        boxShadow: `0 0 0 1px ${lmeta.ring}1A`,
                                                      }}
                                                    >
                                                      <div className="flex items-baseline justify-between">
                                                        <div className="text-xs font-bold tabular-nums">{ln.year}</div>
                                                        <div className="inline-flex items-center">
                                                          <span
                                                            className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
                                                            style={{
                                                              color: lmeta.labelColor,
                                                              border: `1px solid ${lmeta.border}`,
                                                              background: 'rgba(255,255,255,0.78)',
                                                            }}
                                                          >
                                                            {displayLevel(ln)}
                                                          </span>
                                                        </div>
                                                      </div>
                                                      <div className="mt-1 flex items-end justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                          <div className="text-sm font-black" style={{ color: lmeta.text, fontFamily: "'Noto Serif SC', serif" }}>
                                                            {ln.ganzhi}
                                                          </div>
                                                        </div>
                                                        <div
                                                          className="text-sm font-bold tabular-nums"
                                                          style={{
                                                            color: ln.score > 4 ? '#E11D48' : ln.score > 2 ? '#B45309' : ln.score >= 0 ? '#047857' : ln.score >= -2 ? '#0369A1' : ln.score >= -6 ? '#C2410C' : '#991B1B',
                                                          }}
                                                        >
                                                          {ln.score >= 0 ? '+' : ''}
                                                          {ln.score}
                                                        </div>
                                                      </div>
                                                      <ScoreBreakdown row={ln} dense />
                                                      <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground/90">
                                                        {ln.hint}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        )}
                                      </Fragment>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 text-sm font-bold"><span className="mark-highlight">近年流年</span>提示（{currentYear - 1}-{currentYear + 4}）</div>
                          <div className="grid gap-2 md:grid-cols-6">
                            {daYunAnalysis.recentLiuNian.map((ln: any) => {
                              const meta = m(ln);
                              return (
                                <div
                                  key={ln.year}
                                  className="rounded-lg border p-3 text-center"
                                  style={{
                                    background: meta.bg,
                                    borderColor: meta.border,
                                    boxShadow: `0 0 0 1px ${meta.ring}1A`,
                                  }}
                                >
                                  <div className="text-xs font-bold text-muted-foreground">{ln.year}</div>
                                  <div className="mt-0.5 flex items-center justify-center gap-1.5">
                                    <div className="text-base font-bold" style={{ color: meta.text }}>{ln.ganzhi}</div>
                                  </div>
                                  <div
                                    className="mt-1 flex items-center justify-center gap-1.5 text-xs font-black flex-wrap"
                                    style={{ color: meta.labelColor, letterSpacing: '0.06em' }}
                                  >
                                    <span className="rounded-full px-1.5 py-0.5" style={{ border: `1px solid ${meta.border}`, background: 'rgba(255,255,255,0.78)' }}>
                                      {displayLevel(ln)}
                                    </span>
                                    <span className="font-bold opacity-85">
                                      ({ln.score >= 0 ? '+' : ''}{ln.score})
                                    </span>
                                  </div>
                                  <ScoreBreakdown row={ln} dense />
                                  <div className="mt-1 line-clamp-3 text-[10px] leading-snug font-bold text-muted-foreground">{ln.hint}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>


              {/* 四、命主速览 */}
              <Card
                id="section-overview"
                className="scroll-mt-6 overflow-hidden shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]"
                style={{
                  background: `linear-gradient(135deg, ${solarTermTheme.palette.card}33 0%, #FFFFFF 60%, ${solarTermTheme.palette.muted}22 100%)`,
                  border: `1px solid ${solarTermTheme.palette.primary}1A`,
                }}
              >
                <div className="flex h-1.5 w-full">
                  {solarTermTheme.colors.map((c, i) => (
                    <div key={`hero-bar-${i}`} className="flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <CardHeader className="pt-7 pb-1 text-center">
                  <CardTitle
                    className="flex justify-center text-center text-[28px] font-black leading-tight md:text-[34px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      color: 'var(--foreground)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    命主速览
                  </CardTitle>
                  <CardDescription
                    className="mt-3 text-[15px] font-normal md:text-[16px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      opacity: 0.65,
                      letterSpacing: '0.01em',
                    }}
                  >日主 · 格局 · 用神 · <span className="mark-highlight">整体定调</span>一图速览</CardDescription>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {/* 1. 日主 */}
                    <div
                      className="rounded-xl p-4 transition-transform hover:-translate-y-0.5"
                      style={{
                        backgroundColor: `${solarTermTheme.palette.primary}0C`,
                        border: `1px solid ${solarTermTheme.palette.primary}1F`,
                      }}
                    >
                      <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">日主</div>
                      <div
                        className="mt-2 text-3xl font-black"
                        style={{ fontFamily: "'Noto Serif SC', serif" }}
                      >
                        {chart.day.stem}{ELEMENT_NAMES[chart.day.stemElement]}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {chart.day.stemYinYang === 'yang' ? '阳' : '阴'}{ELEMENT_NAMES[chart.day.stemElement]}
                      </div>
                    </div>
                    {/* 2. 格局 */}
                    <div
                      className="rounded-xl p-4 transition-transform hover:-translate-y-0.5"
                      style={{
                        backgroundColor: `${solarTermTheme.palette.secondary}0D`,
                        border: `1px solid ${solarTermTheme.palette.secondary}22`,
                      }}
                    >
                      <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">格局</div>
                      <div
                        className="mt-2 text-xl font-black leading-tight"
                        style={{
                          fontFamily: "'Noto Serif SC', serif",
                          lineHeight: '1.3',
                          minHeight: '3.2rem',
                        }}
                      >
                        {pattern.patternType || '常规格局'}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {monthQi.fourSymbol} · {monthQi.monthName}
                      </div>
                    </div>
                    {/* 3. 用神 */}
                    <div
                      className="rounded-xl p-4 transition-transform hover:-translate-y-0.5"
                      style={{
                        backgroundColor: 'rgba(16,185,129,0.08)',
                        border: '1px solid rgba(16,185,129,0.25)',
                      }}
                    >
                      <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">用神</div>
                      <div
                        className="mt-2 text-2xl font-black"
                        style={{ fontFamily: "'Noto Serif SC', serif" }}
                      >
                        {yongJi.usefulElements.length > 0
                          ? yongJi.usefulElements.map((el) => ELEMENT_NAMES[el]).join(' · ')
                          : '—'}
                      </div>
                      <div className="mt-1 text-xs text-emerald-700">
                        {yongJi.usefulElements.length > 0 ? '助平衡为吉' : '待细查'}
                      </div>
                    </div>

                    {/* 4. 格局综合分（0-100）：原局先天 + 一生大运均分梯度 加权合成 */}
                    {(() => {
                      // 原局先天分（scoreMingPan.displayScore，压缩分 ±7 尺度）
                      const mingRaw = mingPanScore?.displayScore ?? 0;
                      // 一生大运均分梯度（各步大运 displayScore 的均值，压缩分）
                      const daysArr = daYunAnalysis?.daYunWithFortune ?? [];
                      const dyAvg = daysArr.length > 0
                        ? daysArr.reduce((s, d) => s + (Number(d.displayScore) || 0), 0) / daysArr.length
                        : 0;
                      // 综合压缩分：原局先天 60% + 一生大运均分 40%（先天为根基、大运为走势平均）
                      const combined = 0.6 * mingRaw + 0.4 * dyAvg;
                      // 压缩分（约 ±10）→ 0-100：中枢 50，每 +1 压缩分 ≈ +5 分
                      const overall = Math.round(Math.max(0, Math.min(100, 50 + combined * 5)));
                      // 字母等级 0-100 对齐（金字塔：高分极稀有）
                      const letterLv =
                        overall >= 96 ? 'S+' : overall >= 90 ? 'S' : overall >= 82 ? 'A+' :
                        overall >= 72 ? 'A' : overall >= 60 ? 'B+' : overall >= 48 ? 'B-' :
                        overall >= 36 ? 'C' : overall >= 24 ? 'C-' : 'D';
                      // 分档标签：按档位显示吉凶评价（不使用"及格/不及格"考试式框架）
                      const lvTag =
                        letterLv === 'S+' || letterLv === 'S' ? '极佳' :
                        letterLv === 'A+' || letterLv === 'A' ? '佳' :
                        letterLv === 'B+' ? '平顺' :
                        letterLv === 'B-' ? '欠佳' :
                        letterLv === 'C' || letterLv === 'C-' ? '偏差' : '极差';
                      const tagColor =
                        letterLv === 'S+' || letterLv === 'S' ? '#B91C1C' :
                        letterLv === 'A+' || letterLv === 'A' ? '#047857' :
                        letterLv === 'B+' ? '#0369A1' :
                        letterLv === 'B-' ? '#475569' :
                        letterLv === 'C' || letterLv === 'C-' ? '#C2410C' : '#7F1D1D';
                      const letterColorMap: Record<string, string> = {
                        'S+': '#E11D48','S':'#D97706','A+':'#059669','A':'#16A34A',
                        'B+':'#0284C7','B-':'#475569','C':'#EA580C','C-':'#DC2626','D':'#18181B',
                      };
                      const letterCol = letterColorMap[letterLv] ?? '#059669';
                      const fmt = (n: number) => (n >= 0 ? '+' : '') + Math.round(n * 10) / 10;
                      return (
                        <div
                          className="col-span-2 rounded-xl p-4 transition-transform hover:-translate-y-0.5 md:col-span-1"
                          style={{
                            background: `linear-gradient(135deg, #FFFFFF 0%, ${letterCol}0A 100%)`,
                            border: `2px solid ${letterCol}`,
                            boxShadow: `0 0 0 1px ${letterCol}26, 0 2px 10px -4px ${letterCol}50`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-bold tracking-[0.2em]" style={{ color: letterCol }}>
                              格局综合分
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="rounded-full px-2 py-0.5 text-[11px] font-black"
                                style={{
                                  background: letterCol,
                                  color: '#FFFFFF',
                                  letterSpacing: '0.06em',
                                }}
                              >
                                {letterLv}
                              </span>
                              <span
                                className="rounded-sm px-1.5 py-0.5 text-[10px] font-black"
                                style={{
                                  color: '#FFFFFF',
                                  backgroundColor: tagColor,
                                }}
                              >
                                {lvTag}
                              </span>
                            </div>
                          </div>
                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-[28px] font-black tabular-nums leading-none" style={{ color: letterCol }}>
                              {overall}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground">/ 100</span>
                          </div>
                          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${Math.max(0, Math.min(100, overall))}%`, backgroundColor: letterCol }}
                            />
                          </div>
                          <div className="mt-2 space-y-0.5">
                            <div className="text-[10px] font-bold leading-snug" style={{ color: '#0C0A09', opacity: 0.72 }}>
                              · 原局先天 {fmt(mingRaw)}（{mingPanScore?.letterLevel ?? '—'}）
                            </div>
                            <div className="text-[10px] font-bold leading-snug" style={{ color: '#0C0A09', opacity: 0.72 }}>
                              · 一生大运均分 {fmt(dyAvg)}（{daysArr.length} 步）
                            </div>
                            <div className="text-[10px] font-bold leading-snug" style={{ color: letterCol, opacity: 0.9 }}>
                              · 综合 = 原局60% + 大运40%
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>


              {/* 五、寒热气·阴阳气占比 */}
              <Card
                id="section-pie"
                className="scroll-mt-6 overflow-hidden shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]"
                style={{
                  background: `linear-gradient(180deg, #FFFFFF 0%, ${solarTermTheme.palette.muted}10 100%)`,
                  border: `1px solid ${solarTermTheme.palette.primary}18`,
                }}
              >
                <CardHeader className="pt-7 pb-3 text-center">
                  <CardTitle
                    className="flex justify-center text-center text-[26px] font-black leading-tight md:text-[32px]"
                    style={{ fontFamily: "'Noto Serif SC', serif", color: 'var(--foreground)', letterSpacing: '-0.01em' }}
                  >
                    寒热气·阴阳气占比
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-7">
                  <div className="grid items-start gap-6 md:grid-cols-2">
                    {/* 左：寒热气 饼图（纯视觉，无文字解释） */}
                    <div className="flex flex-col items-center">
                      <DonutPieChart
                        size={240}
                        items={[
                          { label: '热气', value: coldHotPct.hot, color: '#EF4444' },
                          { label: '寒气', value: coldHotPct.cold, color: '#2563EB' },
                        ]}
                        centerTitle="寒热"
                        centerSub="COLD · HOT"
                      />
                      <div className="mt-3 flex w-full max-w-[260px] flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] font-bold">
                        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />热气 <span className="font-black">{coldHotPct.hot}%</span></span>
                        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full" style={{ backgroundColor: '#2563EB' }} />寒气 <span className="font-black">{coldHotPct.cold}%</span></span>
                      </div>
                    </div>
                    {/* 右：阴阳气 饼图（纯视觉，无文字解释） */}
                    <div className="flex flex-col items-center">
                      <DonutPieChart
                        size={240}
                        items={[
                          { label: '阳气', value: yinYangPct.yang, color: '#FFFFFF' },
                          { label: '阴气', value: yinYangPct.yin, color: '#0A0A0A' },
                        ]}
                        centerTitle="阴阳"
                        centerSub="YIN · YANG"
                      />
                      <div className="mt-3 flex w-full max-w-[260px] flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] font-bold">
                        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full" style={{ backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB' }} />阳气 <span className="font-black">{yinYangPct.yang}%</span></span>
                        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full" style={{ backgroundColor: '#0A0A0A' }} />阴气 <span className="font-black">{yinYangPct.yin}%</span></span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* 六、盘内存在太极（暂时停用，模块已隐藏；底层 analyzeTaiJiInChart 逻辑保留在 baziAnalyzer.ts，可随时恢复） */}


              {/* 七、特别提示 */}
              <Card
                id="section-special-tips"
                className="scroll-mt-6 overflow-hidden shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]"
                style={{
                  borderLeft: '3px solid #0C0A09',
                  background: `linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 60%, ${solarTermTheme.palette.muted}14 100%)`,
                }}
              >
                <div className="flex h-[3px] w-full">
                  <div className="w-full" style={{ background: 'linear-gradient(90deg, #94A3B8, #EF4444, #94A3B8, #7C3AED, #94A3B8)' }} />
                </div>
                <CardHeader className="pt-8 pb-5 text-center">
                  <CardTitle
                    className="flex justify-center text-center text-[28px] font-black leading-tight md:text-[34px]"
                    style={{ fontFamily: "'Noto Serif SC', serif", color: 'var(--foreground)', letterSpacing: '-0.01em' }}
                  >
                    特别提示
                  </CardTitle>
                  <CardDescription
                    className="mt-3 text-[15px] font-normal md:text-[16px]"
                    style={{ fontFamily: "'Noto Serif SC', serif", opacity: 0.65, letterSpacing: '0.01em' }}
                  >
                    文章 &amp; 数据库中检索到与<span className="mark-highlight">本命局</span>高度契合的关键提示点
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pb-7 text-sm leading-relaxed font-bold">
                  {specialTips.map((tip, i) => {
                    const tone =
                      tip.level === '关键'
                        ? { title: '#0C0A09', bg: '#F3F4F6', border: '#6B7280', ring: '#4B5563', badgeBg: '#0C0A09', badgeText: '#fff', badgeLabel: '关键' }
                        : tip.level === '吉'
                          ? { title: '#064E3B', bg: '#D1FAE5', border: '#10B981', ring: '#059669', badgeBg: '#059669', badgeText: '#fff', badgeLabel: '吉' }
                          : tip.level === '凶'
                            ? { title: '#7F1D1D', bg: '#FEE2E2', border: '#EF4444', ring: '#B91C1C', badgeBg: '#DC2626', badgeText: '#fff', badgeLabel: '凶' }
                            : { title: '#1F2937', bg: '#F3F4F6', border: '#9CA3AF', ring: '#6B7280', badgeBg: '#6B7280', badgeText: '#fff', badgeLabel: '平' };
                    return (
                      <div
                        key={`tip-${i}`}
                        className="rounded-xl p-4 transition-all hover:-translate-y-0.5"
                        style={{
                          backgroundColor: tone.bg,
                          border: `1px solid ${tone.border}60`,
                          boxShadow: `0 2px 12px -6px ${tone.ring}50`,
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className="text-[10px] font-black tracking-[0.15em]"
                            style={{ background: tone.badgeBg, color: tone.badgeText, border: `1px solid ${tone.badgeBg}` }}
                          >
                            {tone.badgeLabel}
                          </Badge>
                          <div
                            className="text-base font-black leading-tight md:text-[17px]"
                            style={{ fontFamily: "'Noto Serif SC', serif", color: tone.title }}
                          >
                            {tip.title}
                          </div>
                          <span
                            className="ml-auto rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider"
                            style={{
                              backgroundColor: `${tone.ring}12`,
                              color: tone.ring,
                              border: `1px solid ${tone.ring}2A`,
                            }}
                          >
                            {tip.source}
                          </span>
                        </div>
                        <p
                          className="mt-2 leading-relaxed"
                          style={{ color: tone.title, opacity: 0.92 }}
                        >
                          {tip.detail}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>


              {/* 八、月气分析 */}
              <Card id="section-monthqi" className="scroll-mt-6 overflow-hidden shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]">
                <div className="flex h-[3px] w-full">
                  {solarTermTheme.colors.map((c, i) => (
                    <div key={`mq-bar-${i}`} className="flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <CardHeader className="pt-8 pb-5 text-center">
                  <CardTitle
                    className="flex justify-center text-center text-[28px] font-black leading-tight md:text-[34px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      color: 'var(--foreground)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    月气分析
                  </CardTitle>
                  <CardDescription
                    className="mt-3 text-[15px] font-normal md:text-[16px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      opacity: 0.65,
                      letterSpacing: '0.01em',
                    }}
                  ><span className="mark-highlight">月令</span>为权，一切吉凶以<span className="mark-highlight">月气</span>为判断标准</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 月对日主·十二长生状态 */}
                  <MonthRiZhuChangShengCard
                    chart={chart}
                    solarTermTheme={solarTermTheme}
                  />

                  <div className="flex items-center gap-4">
                    <div
                      className="flex size-16 shrink-0 items-center justify-center rounded-xl text-2xl font-black"
                      style={{
                        backgroundColor: `${solarTermTheme.palette.primary}14`,
                        color: 'var(--foreground)',
                        fontFamily: "'Noto Serif SC', serif",
                      }}
                    >
                      {monthQi.monthName.slice(0, 1)}
                    </div>
                    <div>
                      <div
                        className="text-lg font-black"
                        style={{ fontFamily: "'Noto Serif SC', serif", letterSpacing: '0.03em' }}
                      >
                        {monthQi.monthName} · {monthQi.solarTerm}
                      </div>
                      <div className="text-sm text-muted-foreground">本气：{monthQi.mainQi}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border/60 p-3">
                      <div className="text-xs text-muted-foreground">阳气状态</div>
                      <div className={`mt-1 text-base font-semibold ${monthQi.yangState === 'strong' ? 'text-orange-500' : 'text-muted-foreground'}`}>
                        {monthQi.yangState === 'strong' ? '旺（被肯定）' : '弱（被否定）'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3">
                      <div className="text-xs text-muted-foreground">阴气状态</div>
                      <div className={`mt-1 text-base font-semibold ${monthQi.yinState === 'strong' ? 'text-blue-500' : 'text-muted-foreground'}`}>
                        {monthQi.yinState === 'strong' ? '旺（被肯定）' : '弱（被否定）'}
                      </div>
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-4"
                    style={{ backgroundColor: `${solarTermTheme.palette.primary}0D` }}
                  >
                    <div
                      className="text-sm font-black"
                      style={{ color: 'var(--foreground)', fontFamily: "'Noto Serif SC', serif" }}
                    >
                      用{monthQi.usageDirection === 'yin' ? <span className="mark-highlight">阴</span> : <span className="mark-highlight">阳</span>}方向
                    </div>
                    <div className="mt-1 text-sm font-bold text-foreground">{monthQi.description}</div>
                  </div>
                  <p className="text-sm leading-relaxed font-bold text-muted-foreground">{monthQi.detailedDesc}</p>
                </CardContent>
              </Card>


              {/* 九、用神忌神判断 */}
              <Card
                id="section-yongji"
                className="scroll-mt-6 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]"
                style={{ borderLeft: `3px solid ${solarTermTheme.palette.primary}` }}
              >
                <CardHeader className="pt-8 pb-5 text-center">
                  <CardTitle
                    className="flex justify-center text-center text-[28px] font-black leading-tight md:text-[34px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      color: 'var(--foreground)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    用神忌神判断
                  </CardTitle>
                  <CardDescription
                    className="mt-3 text-[15px] font-normal md:text-[16px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      opacity: 0.65,
                      letterSpacing: '0.01em',
                    }}
                  >以<span className="mark-highlight">平衡</span>为原则定用忌方向</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4 flex-col md:flex-row">
                    <div className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <div className="text-sm font-bold text-emerald-700"><span className="mark-highlight">用神</span>（喜用）</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {yongJi.usefulElements.map((el) => (
                          <span key={el} className="rounded-lg bg-emerald-500 px-3 py-1 text-sm font-bold text-white">
                            {ELEMENT_NAMES[el]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 text-xs font-bold text-emerald-600">有利于<span className="mark-highlight">阴阳平衡</span>，助之则吉</div>
                    </div>
                    <div className="flex-1 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                      <div className="text-sm font-bold text-rose-700"><span className="mark-highlight">忌神</span>（所忌）</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {yongJi.tabooElements.map((el) => (
                          <span key={el} className="rounded-lg bg-rose-500 px-3 py-1 text-sm font-bold text-white">
                            {ELEMENT_NAMES[el]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 text-xs font-bold text-rose-600">破坏<span className="mark-highlight">阴阳平衡</span>，助之则凶</div>
                    </div>
                  </div>

                  {/* 土专区：中宫承载制衡之气（数据书优先级 2，独立判定是否取用土） */}
                  {earthXiJi && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-bold text-amber-800"><span className="mark-highlight">土</span>（中宫·承载制衡）</div>
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black"
                          style={{
                            background: earthXiJi.decision === 'useful' ? '#F59E0B' : earthXiJi.decision === 'taboo' ? '#B45309' : '#A8A29E',
                            color: '#FFFFFF',
                          }}
                        >
                          {earthXiJi.overall}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed font-bold text-muted-foreground">{earthXiJi.reason}</p>
                      {earthXiJi.details.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {earthXiJi.details.map((d) => (
                            <span
                              key={d.ganzhi}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold"
                              style={{
                                background: d.mark === 'useful' ? '#FEF3C7' : d.mark === 'taboo' ? '#FDE68A' : '#F5F5F4',
                                color: 'var(--foreground)',
                                border: `1px solid ${d.mark === 'useful' ? '#F59E0B' : d.mark === 'taboo' ? '#B45309' : '#D6D3D1'}`,
                              }}
                              title={d.note}
                            >
                              {d.ganzhi}
                              <span className="text-[10px] font-black" style={{ color: d.mark === 'useful' ? '#B45309' : d.mark === 'taboo' ? '#92400E' : '#78716C' }}>
                                {d.mark === 'useful' ? '宜用' : d.mark === 'taboo' ? '忌' : '调和'}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-sm leading-relaxed font-bold text-muted-foreground">{yongJi.description}</p>
                </CardContent>
              </Card>


              {/* 十、象意·财富·感情·学历（《象法》数据书，优先级 2，最终参考） */}
              <Card
                id="section-xiangfa"
                className="scroll-mt-6 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]"
                style={{ borderLeft: `3px solid ${solarTermTheme.palette.accent}` }}
              >
                <CardHeader className="pt-8 pb-5 text-center">
                  <CardTitle
                    className="flex justify-center text-center text-[28px] font-black leading-tight md:text-[34px]"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      color: 'var(--foreground)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    象意
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {xiangYi && wealthVerdict ? (
                    <Tabs defaultValue="xiangyi" className="w-full">
                      <TabsList className="w-full justify-center">
                        <TabsTrigger value="xiangyi">象意</TabsTrigger>
                        <TabsTrigger value="wealth">财富</TabsTrigger>
                      </TabsList>
                      <TabsContent value="xiangyi" className="mt-4">
                        <XiangYiPanel verdict={xiangYi} />
                      </TabsContent>
                      <TabsContent value="wealth" className="mt-4">
                        <WealthPanel verdict={wealthVerdict} bestWealthYears={bestWealthYears} bestNobilityYears={bestNobilityYears} />
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <p className="text-center text-sm font-bold text-muted-foreground">数据计算中，请稍候…</p>
                  )}
                </CardContent>
              </Card>


            {/* 底部操作区 */}
            <div className="flex justify-center py-4">
              <Button variant="outline" size="lg" onClick={handleReset} className="font-bold">
                重新排盘
              </Button>
            </div>
          </div>

          {/* 右：报告目录 TOC（大屏 sticky） */}
          <aside className="hidden lg:block">
            <div
              className="sticky top-6 space-y-2 rounded-2xl p-5 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]"
              style={{
                background: `linear-gradient(180deg, #FFFFFF 0%, ${solarTermTheme.palette.muted}2A 100%)`,
                border: `1px solid ${solarTermTheme.palette.primary}18`,
              }}
            >
              <div
                className="mb-3 flex justify-center text-center text-sm font-black"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  letterSpacing: '0.08em',
                  color: 'var(--foreground)',
                }}
              >
                报告目录
              </div>
              {[
                { id: 'pillars', label: '一、四柱排盘总览' },
                { id: 'mingju-pattern', label: '二、命局模式分析' },
                { id: 'dayun', label: '三、大运流年分析' },
                { id: 'overview', label: '四、命主速览' },
                { id: 'pie', label: '五、寒热气·阴阳气占比' },
                { id: 'special-tips', label: '六、特别提示' },
                { id: 'monthqi', label: '七、月气分析' },
                { id: 'yongji', label: '八、用神忌神判断' },
                { id: 'xiangfa', label: '九、象意' },
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#section-${item.id}`}
                  className="group flex justify-center text-center rounded-lg px-2.5 py-1.5 text-sm font-bold text-muted-foreground transition-all hover:pl-3"
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = `${solarTermTheme.palette.primary}12`;
                    (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLAnchorElement).style.color = '';
                  }}
                >
                  <span className="truncate group-hover:font-black">{item.label}</span>
                </a>
              ))}
              {/* 底部节气色板小横条装饰 */}
              <div className="mt-5 flex h-1.5 w-full overflow-hidden rounded-full">
                {solarTermTheme.colors.map((c, i) => (
                  <div key={`toc-bar-${i}`} className="flex-1" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div
                className="mt-2 text-center text-[10px] font-bold tracking-widest text-muted-foreground"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  letterSpacing: '0.2em',
                }}
              >
                {solarTermTheme.name} · {chart.birthInfo.solarDate}
              </div>
            </div>
          </aside>
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="w-full border-t border-border/40 bg-background/80 py-8 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground md:px-6">
          <p style={{ fontFamily: "'Maoti', 'Noto Serif SC', serif", fontSize: '18px', letterSpacing: '0.05em' }}>
            沛然堂 · 以太极阴阳为体，以月气动应为用
          </p>
          <p className="mt-1 text-xs">本工具仅供命理研究与学习参考，不构成任何人生决策建议</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[11px] font-bold text-muted-foreground">
            v{APP_VERSION} · 正式版
          </p>
          {/* 内部代码声明：置于页面最下方 */}
          <p
            className="mx-auto mt-6 max-w-3xl text-center text-[12px] font-medium leading-relaxed tracking-wider"
            style={{ fontFamily: "'Noto Serif SC', serif", color: 'var(--foreground)', opacity: 0.55 }}
          >
            内部代码 · 不可商用盈利 · 公开代码仅作为无害公开供人民群众监督
          </p>
        </div>
      </footer>
    </div>
  );
}