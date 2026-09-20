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

// ============ 命盘终端 MINGPAN TERMINAL：统一深色色板 ============
// 界面配色不再随节气变化；节气仅保留名称与诗句作为元数据
const TERMINAL_PALETTE = {
  bg1: '#0A0C10',
  bg2: '#0D1016',
  card: '#10141B',
  primary: '#1FD4BC', // 信号青
  secondary: '#4E93EE', // 冷靛蓝
  accent: '#F2A93B', // 警示琥珀
  muted: '#1D2025',
  prose: '#E0E5EC',
} as const;

// 终端光谱：用于发丝线/读数点缀（克制使用）
const TERMINAL_SPECTRUM = ['#1FD4BC', '#4E93EE', '#8B7CF6', '#F2A93B', '#E85D6C', '#2A313C'];

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
    { y: +5, label: '夯',   color: '#FBBF24', dashed: false, band: true },
    { y: +2, label: '人上', color: '#A78BFA', dashed: true },
    { y:  0, label: '0',    color: '#94A3B8', dashed: true },
    { y: -2, label: '拉',   color: '#F87171', dashed: true },
  ];
  // 点颜色（按 level，兼容新九档与旧五档）
  const dotColor = (lvl: string) => {
    const map: Record<string, string> = {
      'S+': '#FB7185', 'S': '#FBBF24', 'A+': '#34D399', 'A': '#4ADE80',
      'B+': '#38BDF8', 'B-': '#94A3B8', 'C': '#FB923C', 'C-': '#F87171', 'D': '#71717A',
      '夯': '#FBBF24', '人上人': '#A78BFA', 'npc': '#94A3B8', '拉': '#FB923C', '拉完了': '#F87171',
    };
    return map[lvl] ?? '#38BDF8';
  };
  const areaFillFor = (y: number) => {
    if (y > 5) return 'rgba(251,191,36,0.14)';
    if (y > 2) return 'rgba(167,139,250,0.12)';
    if (y >= -2) return 'rgba(148,163,184,0.08)';
    return 'rgba(248,113,113,0.12)';
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
          stroke="#22D3EE"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.45))' }}
        />

        {/* 点 + 年份标签 + 干支 + 分数 */}
        {pts.map((p, i) => {
          const sc = p.it.displayScore;
          const c = dotColor(p.it.level);
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="hsl(222 26% 8%)" stroke={c} strokeWidth="2" />
              <circle cx={p.x} cy={p.y} r="2.2" fill={c} />
              {/* 年份 */}
              <text
                x={p.x}
                y={H - 28}
                textAnchor="middle"
                fontSize="11"
                fontWeight="800"
                fill="#94A3B8"
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
    sky: { border: 'rgba(56,189,248,0.32)', bg: 'rgba(56,189,248,0.07)', text: '#7DD3FC', tag: '#38BDF8' },
    emerald: { border: 'rgba(52,211,153,0.32)', bg: 'rgba(52,211,153,0.07)', text: '#6EE7B7', tag: '#34D399' },
    rose: { border: 'rgba(251,113,133,0.32)', bg: 'rgba(251,113,133,0.07)', text: '#FDA4AF', tag: '#FB7185' },
    amber: { border: 'rgba(251,191,36,0.32)', bg: 'rgba(251,191,36,0.07)', text: '#FDE68A', tag: '#FBBF24' },
  };
  const am = accentMeta[accent];
  return (
    <div className="space-y-3">
      <div className="text-sm font-bold text-muted-foreground">{subtitle}</div>
      {/* 导入的既有模块数据 */}
      <div className="flex flex-wrap gap-2">
        {inputs.map((it) => (
          <span key={it.label} className="rounded-sm border bg-card/70 px-2 py-1 text-[11px] font-bold" style={{ borderColor: am.border, color: 'var(--foreground)' }}>
            <span className="text-muted-foreground">{it.label}：</span>{it.value}
          </span>
        ))}
      </div>
      {/* 查询论断 */}
      <div className="rounded-sm p-4" style={{ border: `1px solid ${am.border}`, background: am.bg }}>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="label-mono inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-black" style={{ background: am.tag, color: 'hsl(222 26% 6%)' }}>
            查询论断
          </span>
          {score && (
            <span className="label-mono inline-flex items-center gap-1 rounded-sm px-2.5 py-0.5 text-[11px] font-black" style={{ border: `1px solid ${am.border}`, color: 'var(--foreground)' }}>
              {score.label}<span style={{ color: am.text }}> · {score.value} 分</span>
            </span>
          )}
          {!matched && disclaimer && (
            <span className="label-mono inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {disclaimer}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-foreground">{result}</p>
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
            <span className="mr-2 inline-flex size-4 items-center justify-center rounded-full text-[9px] font-black" style={{ background: accent, color: 'hsl(222 26% 6%)' }}>{i + 1}</span>
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
      <div className="text-sm font-bold text-muted-foreground">财富 · 富贵财官</div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-sm border p-4" style={{ border: '1px solid rgba(251,191,36,0.32)', background: 'rgba(251,191,36,0.07)' }}>
          <div className="mb-1 flex items-center gap-1.5">
            <span className="label-mono inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-black" style={{ background: '#FBBF24', color: 'hsl(222 26% 6%)' }}>财富层级</span>
            <span className="label-mono inline-flex items-center rounded-sm px-2.5 py-0.5 text-[12px] font-black" style={{ border: '1px solid rgba(251,191,36,0.32)', color: '#FDE68A' }}>
              {verdict.wealthRank}<span className="ml-1" style={{ color: '#FBBF24' }}>· {verdict.wealthScoreFinal} 分</span>
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{verdict.wealthRankDesc}</p>
        </div>
        <div className="rounded-sm border p-4" style={{ border: '1px solid rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.06)' }}>
          <div className="mb-1 flex items-center gap-1.5">
            <span className="label-mono inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-black" style={{ background: '#38BDF8', color: 'hsl(222 26% 6%)' }}>事业地位</span>
            <span className="label-mono inline-flex items-center rounded-sm px-2.5 py-0.5 text-[12px] font-black" style={{ border: '1px solid rgba(56,189,248,0.3)', color: '#7DD3FC' }}>
              {verdict.nobilityRank}<span className="ml-1" style={{ color: '#38BDF8' }}>· {verdict.nobilityScoreFinal} 分</span>
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{verdict.nobilityRankDesc}</p>
        </div>
      </div>
      <div className="rounded-sm p-4" style={{ border: '1px solid rgba(251,191,36,0.32)', background: 'rgba(251,191,36,0.06)' }}>
        <div className="label-mono mb-2 text-[11px] font-black" style={{ color: '#FBBF24' }}>最利求财年份（按可能性从高到低）</div>
        {bestWealthYears.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">暂无足够流年数据可排序。</p>
        ) : (
          renderYearList(bestWealthYears, '#FBBF24', '#FBBF24')
        )}
      </div>
      <div className="rounded-sm p-4" style={{ border: '1px solid rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.06)' }}>
        <div className="label-mono mb-2 text-[11px] font-black" style={{ color: '#38BDF8' }}>最利事业地位年份（按可能性从高到低）</div>
        {bestNobilityYears.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">暂无足够流年数据可排序。</p>
        ) : (
          renderYearList(bestNobilityYears, '#38BDF8', '#38BDF8')
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
        <li key={it.year} className="flex flex-col rounded-sm border border-border bg-card/60 p-2">
          <div className="flex items-center justify-between text-[12px] font-bold">
            <span className="inline-flex items-center">
              <span className="mr-2 inline-flex size-4 items-center justify-center rounded-full text-[9px] font-black" style={{ background: accentBg, color: 'hsl(222 26% 6%)' }}>{i + 1}</span>
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
      <div className="text-sm font-bold text-muted-foreground">感情 · 异性缘与婚姻情缘</div>

      <div className="rounded-sm border p-4" style={{ borderColor: 'rgba(244,114,182,.35)', background: 'rgba(244,114,182,.07)' }}>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex size-4 items-center justify-center rounded-full text-[9px] font-black leading-none" style={{ background: '#EC4899', color: 'hsl(222 26% 6%)' }}>♥</span>
          <span className="label-mono text-[11px] font-black" style={{ color: '#F472B6' }}>恋爱可能时间如下（按可能性从高到低排列）</span>
        </div>
        {bestLoveYears.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">暂无足够流年数据；恋爱应期需逢岁运桃花或异性星引动之年方显。</p>
        ) : (
          renderTimingList(bestLoveYears, '#F472B6', '#EC4899')
        )}
      </div>

      <div className="rounded-sm border p-4" style={{ borderColor: 'rgba(248,113,113,.35)', background: 'rgba(248,113,113,.07)' }}>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex size-4 items-center justify-center rounded-full text-[9px] font-black leading-none" style={{ background: '#F87171', color: 'hsl(222 26% 6%)' }}>喜</span>
          <span className="label-mono text-[11px] font-black" style={{ color: '#FCA5A5' }}>结婚时间如下（按可能性从高到低排列）</span>
        </div>
        {bestMarriageYears.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">暂无足够流年数据；结婚应期需逢岁运合冲夫妻宫之年方显。</p>
        ) : (
          renderTimingList(bestMarriageYears, '#F87171', '#F87171')
        )}
      </div>
    </div>
  );
}

// ============ 象意论断面板（日主五行象法） ============
function XiangYiPanel({ verdict }: { verdict: XiangYiVerdict }) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-muted-foreground">
        象意 · 五行本源象法（以日主{verdict.dayMaster.stem}{verdict.dayMaster.elementName}为中心）
      </div>
      <div className="rounded-sm p-4" style={{ border: '1px solid rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.06)' }}>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="label-mono inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-black" style={{ background: '#38BDF8', color: 'hsl(222 26% 6%)' }}>日主象意</span>
          <span className="label-mono text-xs font-black" style={{ color: '#7DD3FC' }}>{verdict.dayMaster.stem} · {verdict.dayMaster.elementName} · {verdict.dayMaster.fourSymbol}</span>
        </div>
        <p className="text-sm leading-relaxed font-bold text-foreground">{verdict.dayMaster.stemTraits}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{verdict.dayMaster.nature}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-sm border border-border bg-card/70 p-2.5">
            <div className="label-mono text-[10px] font-black" style={{ color: '#38BDF8' }}>核心类象</div>
            <ul className="mt-1 space-y-1">
              {verdict.dayMaster.imagery.map((img, i) => (
                <li key={i} className="text-xs leading-relaxed text-muted-foreground">· {img}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <div className="rounded-sm border border-border bg-card/70 p-2.5">
              <div className="label-mono text-[10px] font-black" style={{ color: '#38BDF8' }}>人体 · 才艺</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{verdict.dayMaster.body}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{verdict.dayMaster.talent}</p>
            </div>
            <div className="rounded-sm border border-border bg-card/70 p-2.5">
              <div className="label-mono text-[10px] font-black" style={{ color: '#38BDF8' }}>吉凶异化</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{verdict.dayMaster.jiXiong}</p>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-sm border border-border bg-card/70 p-2.5">
          <div className="label-mono text-[10px] font-black" style={{ color: '#38BDF8' }}>月令流转</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{verdict.dayMaster.monthFlow}</p>
        </div>
      </div>
      <details className="group rounded-sm border border-border bg-card/50 p-3">
        <summary className="label-mono cursor-pointer text-[11px] font-black text-muted-foreground transition-colors group-open:text-foreground">
          四柱干支象意一览
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {verdict.pillars.map((p, i) => (
            <div key={i} className="rounded-sm border border-border bg-card/70 p-2.5">
              <div className="text-xs font-black">{p.position}柱 {p.gz}（{p.elementName}）</div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{p.stemTraits}</p>
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
      className="rounded-sm p-4 text-center"
      style={{
        backgroundColor: `${TERMINAL_PALETTE.primary}12`,
        border: `1px solid ${TERMINAL_PALETTE.primary}26`,
      }}
    >
      <div className="mb-2 label-mono text-muted-foreground">月对日主 · 十二长生状态</div>
      {state ? (
        <div
          className="text-[26px] font-bold leading-tight md:text-[32px]"
          style={{ color: 'var(--foreground)' }}
        >
          <span className="mark-highlight">{stem}日主</span>
          <span
            className="ml-2 inline-block rounded-sm px-3 py-1"
            style={{
              backgroundColor: `${TERMINAL_PALETTE.primary}1A`,
              color: TERMINAL_PALETTE.primary,
              border: `1px solid ${TERMINAL_PALETTE.primary}30`,
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
  // 界面统一使用终端色板；solarTermTheme 仅提供节气名称/诗句等元数据
  const palette = TERMINAL_PALETTE;
  const termColors = TERMINAL_SPECTRUM;
  const [expandedDY, setExpandedDY] = useState<number | null>(null);

  // —— 排盘历史记录（localStorage，最近 10 次） ——
  interface HistoryRecord {
    id: string;
    timestamp: number;
    mode: 'date' | 'manual';
    birthInfo: {
      year?: string;
      month?: string;
      day?: string;
      hour?: string;
      minute?: string;
      gender?: 'male' | 'female';
      birthPlace?: string;
      manualPillars?: { yearStem: string; yearBranch: string; monthStem: string; monthBranch: string; dayStem: string; dayBranch: string; hourStem: string; hourBranch: string; birthYear: string };
    };
    summary: string;
  }
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('__app_tianzhiyi_history');
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* ignore parse errors */ }
  }, []);

  const saveToHistory = (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => {
    const entry: HistoryRecord = { ...record, id: Date.now().toString(), timestamp: Date.now() };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, 10);
      try { localStorage.setItem('__app_tianzhiyi_history', JSON.stringify(next)); } catch { /* ignore quota errors */ }
      return next;
    });
  };

  const applyHistory = (rec: HistoryRecord) => {
    if (rec.mode === 'date' && rec.birthInfo.year) {
      setInputMode('date');
      setYear(rec.birthInfo.year);
      setMonth(rec.birthInfo.month || '1');
      setDay(rec.birthInfo.day || '1');
      setHour(rec.birthInfo.hour || '0');
      setMinute(rec.birthInfo.minute || '0');
      setGender(rec.birthInfo.gender || 'male');
    } else if (rec.mode === 'manual' && rec.birthInfo.manualPillars) {
      const p = rec.birthInfo.manualPillars;
      setInputMode('manual');
      setMYearStem(p.yearStem); setMYearBranch(p.yearBranch);
      setMMonthStem(p.monthStem); setMMonthBranch(p.monthBranch);
      setMDayStem(p.dayStem); setMDayBranch(p.dayBranch);
      setMHourStem(p.hourStem); setMHourBranch(p.hourBranch);
      setMBirthYear(p.birthYear);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem('__app_tianzhiyi_history'); } catch { /* ignore */ }
  };

  // —— 复制/导出报告摘要 ——
  const generateReportText = (): string => {
    if (!chart || !monthQi || !yongJi || !elementPower || !yinYangPct) return '';
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════');
    lines.push('  天之易八字自动分析 · 报告摘要');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push(`命主：${chart.day.stem}${chart.day.branch}（${chart.gender === 'male' ? '男' : '女'}）`);
    lines.push(`真太阳时：${chart.birthInfo.trueSolarTime}`);
    lines.push(`四柱：${chart.year.stem}${chart.year.branch} ${chart.month.stem}${chart.month.branch} ${chart.day.stem}${chart.day.branch} ${chart.hour.stem}${chart.hour.branch}`);
    lines.push('');
    lines.push('【月气分析】');
    lines.push(monthQi.description);
    lines.push('');
    lines.push('【用神忌神】');
    lines.push(`用神：${yongJi.usefulElements.map(e => ELEMENT_NAMES[e] ?? e).join('、') || '—'}`);
    lines.push(`忌神：${yongJi.tabooElements.map(e => ELEMENT_NAMES[e] ?? e).join('、') || '—'}`);
    lines.push('');
    lines.push('【五行力量】');
    lines.push(`木 ${elementPower.wood}%  火 ${elementPower.fire}%  土 ${elementPower.earth}%  金 ${elementPower.metal}%  水 ${elementPower.water}%`);
    lines.push('');
    lines.push('【阴阳平衡】');
    lines.push(`阳气 ${yinYangPct.yang}%  阴气 ${yinYangPct.yin}%`);
    lines.push('');
    if (pattern) {
      lines.push('【命局模式】');
      lines.push(pattern.description);
      lines.push('');
    }
    if (wealthNobility) {
      lines.push('【富贵贫贱】');
      lines.push(wealthNobility.overallLevel);
      lines.push('');
    }
    lines.push('───────────────────────────────────────');
    lines.push(`生成时间：${new Date().toLocaleString('zh-CN')}`);
    lines.push('数据均在本地计算 · 不上传云端');
    return lines.join('\n');
  };

  const handleCopyReport = async () => {
    const text = generateReportText();
    if (!text) { toast.error('报告尚未生成'); return; }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('报告摘要已复制到剪贴板');
    } catch {
      toast.error('复制失败，请手动选择文本');
    }
  };

  const handleExportReport = () => {
    const text = generateReportText();
    if (!text) { toast.error('报告尚未生成'); return; }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `八字分析报告_${chart!.day.stem}${chart!.day.branch}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('报告已导出为文本文件');
  };

  const currentYear = new Date().getFullYear();

  // 根据节气主题生成的 CSS 变量，动态注入给页面全部子元素使用
  const themeVarsStyle: React.CSSProperties = useMemo(() => {
    const p = palette;
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
    saveToHistory({
      mode: 'date',
      birthInfo: { year, month, day, hour, minute, gender, birthPlace: '北京' },
      summary: `${result.year.stem}${result.year.branch} ${result.month.stem}${result.month.branch} ${result.day.stem}${result.day.branch} ${result.hour.stem}${result.hour.branch}（${gender === 'male' ? '男' : '女'}）`,
    });
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
    saveToHistory({
      mode: 'manual',
      birthInfo: {
        manualPillars: {
          yearStem: mYearStem, yearBranch: mYearBranch,
          monthStem: mMonthStem, monthBranch: mMonthBranch,
          dayStem: mDayStem, dayBranch: mDayBranch,
          hourStem: mHourStem, hourBranch: mHourBranch,
          birthYear: mBirthYear,
        },
      },
      summary: `${mYearStem}${mYearBranch} ${mMonthStem}${mMonthBranch} ${mDayStem}${mDayBranch} ${mHourStem}${mHourBranch}（手动四柱）`,
    });
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
    const base = "rounded-sm px-1.5 py-0 text-[9.5px] font-bold tracking-[0.15em]";
    if (mark === 'useful') return <Badge className={base} style={{ background: 'hsl(168 40% 16%)', color: 'hsl(168 70% 62%)', border: '1px solid hsl(168 55% 32%)' }}>用</Badge>;
    if (mark === 'taboo') return <Badge className={base} style={{ background: 'hsl(352 45% 16%)', color: 'hsl(352 80% 70%)', border: '1px solid hsl(352 55% 34%)' }}>忌</Badge>;
    return <Badge className={base} style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>中</Badge>;
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
        {pill('加分', plusC, '#34D399')}
        {pill('扣分', minusC, '#F87171')}
        {Math.abs(otherC) >= 0.05 && pill('其他', otherC, '#A78BFA')}
        {Math.abs(mingPanBase) >= 0.05 && pill('命盘', mingPanBase, '#38BDF8')}
        {Math.abs(trendC) >= 0.05 && pill('趋势', trendC, '#FBBF24')}
        <span className="mx-0.5 text-[11px] font-black text-muted-foreground">=</span>
        <span
          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-black tabular-nums ${dense ? 'text-[10px]' : 'text-[11px]'}`}
          style={{
            borderColor: displayScore >= 0 ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)',
            background: displayScore >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
            color: displayScore >= 0 ? '#34D399' : '#F87171',
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
        background: 'var(--background)',
      }}
    >
      {/* ===== 命盘终端 Hero：瑞士网格 + 深空元数据栏 ===== */}
      <section className="relative w-full border-b border-border">
        {/* 终端状态条：系统标识 / 节气元数据 / 版本号 */}
        <div className="border-b border-border">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-3 items-center gap-2 px-4 py-2.5 md:px-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" style={{ boxShadow: '0 0 8px #1FD4BC' }} />
              <span className="label-mono text-muted-foreground">MINGPAN TERMINAL</span>
            </div>
            <div className="justify-self-center">
              <span className="label-mono text-foreground/70">
                {solarTermTheme.name} · 出生节气
              </span>
            </div>
            <div className="justify-self-end">
              <span className="label-mono text-muted-foreground">v{APP_VERSION}</span>
            </div>
          </div>
        </div>

        {/* 主网格：左侧标题系统 / 右侧诗句元数据面板 */}
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 pb-16 pt-14 md:grid-cols-12 md:gap-8 md:px-6 md:pb-24 md:pt-20">
          <div className="md:col-span-7">
            {/* 编号 overline */}
            <p className="label-mono mb-6 text-primary">
              BAZI ANALYSIS SYSTEM
            </p>
            {/* 主标题：粗黑体，左对齐 */}
            <h1
              className="text-[56px] font-black leading-[0.95] tracking-tight text-foreground md:text-[96px] lg:text-[112px]"
            >
              沛然堂
            </h1>
            {/* 副标题行：发丝线 + 中文系统名 */}
            <div className="mt-6 flex items-center gap-4">
              <span className="h-px w-12 bg-primary" />
              <span className="text-base font-bold tracking-[0.3em] text-foreground/90 md:text-lg">
                八字命理智能分析系统
              </span>
            </div>
            <p className="mt-8 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              以太极阴阳为体 · 以月气动应为用 · 以平衡为得失
            </p>
          </div>

          {/* 节气诗句：降级为毛体点缀，置于带发丝线的元数据面板 */}
          <div className="relative md:col-span-5 md:pt-2">
            <div className="relative crosshair border border-border bg-card/60 p-6 md:p-8">
              <p className="label-mono mb-5 text-muted-foreground">
                SOLAR TERM / {solarTermTheme.name}
              </p>
              <p
                className="text-[26px] leading-[1.5] text-foreground/85 md:text-[30px]"
                style={{
                  fontFamily: "'Maoti', 'Noto Serif SC', serif",
                  letterSpacing: '0.05em',
                }}
              >
                「{solarTermTheme.poem}」
              </p>
              <p className="mt-5 label-mono text-muted-foreground" style={{ textTransform: 'none', letterSpacing: '0.08em', fontSize: 11.5 }}>
                —— {solarTermTheme.source}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main
        className="mx-auto w-full max-w-7xl space-y-10 px-4 py-12 md:space-y-14 md:px-6 md:py-16"
      >
        {/* 输入表单区：终端控制台风格 */}
        <Card
          className="relative crosshair overflow-hidden rounded-sm border-border bg-card"
        >
          {/* 区块标题栏：瑞士编号系统 */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
            <div className="flex items-center gap-3">
              <span className="label-mono text-primary">01 / INPUT</span>
              <span className="h-3 w-px bg-border" />
              <span className="text-sm font-bold tracking-[0.15em] text-foreground">出生信息录入</span>
            </div>
            <span className="label-mono hidden text-muted-foreground md:inline">
              {solarTermTheme.name} · 本地计算 · 不上传
            </span>
          </div>

          <CardHeader className="pt-8 pb-4 md:px-8">
            <div>
              <CardTitle
                className="text-2xl font-black leading-tight tracking-tight text-foreground md:text-[28px]"
              >
                输入出生信息
              </CardTitle>
              <CardDescription
                className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground"
              >
                请输入公历出生年月日时 · 系统将按真太阳时自动校正并排盘
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2 md:px-8">
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

              const accent = TERMINAL_PALETTE.primary; // 随今日节气变色（延续现有节气主题，不破坏统一性）
              const accentSoft = `${accent}1A`;
              const accentLine = `${accent}55`;

              const FieldStepBadge = ({ n, label }: { n: number; label: string }) => (
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="inline-flex size-6 items-center justify-center border text-[10.5px] font-bold"
                    style={{
                      borderColor: 'var(--primary)',
                      color: 'var(--primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {String(n).padStart(2, '0')}
                  </div>
                  <div
                    className="text-[13px] font-bold tracking-[0.18em] text-foreground"
                  >
                    {label}
                  </div>
                  <div className="ml-2 flex-1 border-t" style={{ borderColor: 'var(--border)' }} />
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
                  className="inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: active ? 'var(--primary)' : 'transparent',
                    color: active ? '#04100E' : 'var(--foreground)',
                    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  {children}
                </button>
              );

              return (
                <div className="space-y-7">
                  {/* 排盘模式切换：按日期 / 手动四柱 */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-0 rounded-sm p-0" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
                      {(['date', 'manual'] as const).map((md) => (
                        <button
                          key={md}
                          type="button"
                          onClick={() => setInputMode(md)}
                          className="px-4 py-2 text-[12.5px] font-bold tracking-widest transition-colors"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            background: inputMode === md ? 'var(--primary)' : 'transparent',
                            color: inputMode === md ? '#04100E' : 'var(--muted-foreground)',
                            borderRight: md === 'date' ? '1px solid var(--border)' : 'none',
                          }}
                        >
                          {md === 'date' ? '按日期排盘' : '手动四柱'}
                        </button>
                      ))}
                    </div>
                    {inputMode === 'manual' && (
                      <div className="text-[11px] font-medium tracking-widest text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                        已选四柱 · {mYearStem}{mYearBranch} {mMonthStem}{mMonthBranch} {mDayStem}{mDayBranch} {mHourStem}{mHourBranch}
                      </div>
                    )}
                  </div>

                  {/* 手动四柱模式：自选四柱 + 参照出生年份 */}
                  {inputMode === 'manual' && (
                    <div className="rounded-sm p-5" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                      <FieldStepBadge n={0} label="手动四柱 · 自选" />
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {([
                          { t: '年柱', s: mYearStem, b: mYearBranch, sm: setMYearStem, bm: setMYearBranch },
                          { t: '月柱', s: mMonthStem, b: mMonthBranch, sm: setMMonthStem, bm: setMMonthBranch },
                          { t: '日柱', s: mDayStem, b: mDayBranch, sm: setMDayStem, bm: setMDayBranch },
                          { t: '时柱', s: mHourStem, b: mHourBranch, sm: setMHourStem, bm: setMHourBranch },
                        ]).map((p) => (
                          <div key={p.t} className="rounded-sm p-3" style={{ border: `1px solid ${accentLine}`, background: 'var(--input)' }}>
                            <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>{p.t}</Label>
                            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                              <Select value={p.s} onValueChange={(v) => (p.sm as (x: string) => void)(v)}>
                                <SelectTrigger className="!h-11 !text-sm !font-black" style={{ background: 'var(--input)', border: `1px solid var(--border)`, fontFamily: 'var(--font-mono)' }}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STEMS.map((st) => (
                                    <SelectItem key={st} value={st} className="!text-sm !font-bold !text-foreground">{st}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={p.b} onValueChange={(v) => (p.bm as (x: string) => void)(v)}>
                                <SelectTrigger className="!h-11 !text-sm !font-black" style={{ background: 'var(--input)', border: `1px solid var(--border)`, fontFamily: 'var(--font-mono)' }}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {BRANCHES.map((br) => (
                                    <SelectItem key={br} value={br} className="!text-sm !font-bold !text-foreground">{br}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div
                              className="mt-2 rounded-md py-1 text-center text-[15px] font-black tracking-[0.2em]"
                              style={{ background: accentSoft, color: accent, fontFamily: 'var(--font-mono)' }}
                            >
                              {p.s}{p.b}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>
                            参照出生年份 <span className="font-normal text-muted-foreground/80">（仅用于定大运流年的年龄/年份，干支仍以自选四柱为准）</span>
                          </Label>
                          <Input
                            type="number"
                            value={mBirthYear}
                            onChange={(e) => setMBirthYear(e.target.value)}
                            placeholder="例：1990"
                            className="!h-12 !px-4 !text-lg font-black tracking-wider focus-visible:ring-0"
                            style={{ fontFamily: 'var(--font-mono)', background: 'var(--input)', border: `1px solid var(--border)`, color: 'var(--foreground)' }}
                          />
                        </div>
                        <div className="flex items-end gap-3">
                          {/* 乾/坤再造 大按钮 */}
                          <button
                            type="button"
                            onClick={() => setGender('male')}
                            className="h-12 flex-1 rounded-sm text-[14px] font-bold tracking-[0.2em] transition-colors"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              background: gender === 'male' ? `${accent}` : 'transparent',
                              color: gender === 'male' ? '#04100E' : 'var(--foreground)',
                              border: `1px solid ${gender === 'male' ? accent : 'var(--border)'}`,
                            }}
                          >乾造 · 男</button>
                          <button
                            type="button"
                            onClick={() => setGender('female')}
                            className="h-12 flex-1 rounded-sm text-[14px] font-bold tracking-[0.2em] transition-colors"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              background: gender === 'female' ? `#D93A4E` : 'transparent',
                              color: gender === 'female' ? '#ffffff' : 'var(--foreground)',
                              border: `1px solid ${gender === 'female' ? '#D93A4E' : 'var(--border)'}`,
                            }}
                          >坤造 · 女</button>
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] font-bold leading-relaxed tracking-wider text-muted-foreground/70" style={{ fontFamily: 'var(--font-mono)' }}>
                        · 大运起运年龄按一岁近似；参考年份应落在所填年柱六十甲子循环上的一个代表年份。手动四柱需自洽（年/月/日/时干支一般应符合同一甲子循环）。
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          size="lg"
                          onClick={handleManualAnalyze}
                          className="min-w-[240px] !text-sm font-bold tracking-[0.25em] transition-colors hover:brightness-110"
                          style={{
                            background: `${accent}`,
                            color: '#04100E',
                            height: '54px',
                            paddingLeft: '34px',
                            paddingRight: '34px',
                            borderRadius: '2px',
                            fontFamily: 'var(--font-mono)',
                            boxShadow: 'none',
                            border: `1px solid ${accent}`,
                          }}
                        >
                          ▶ 手动四柱排盘
                        </Button>
                      </div>
                    </div>
                  )}

                  {inputMode === 'date' && (<Fragment>
                  {/* 00 完整生辰快速输入（一条栏：粘贴 199910012000 → 自动拆分 年月日时分）*/}
                  <div className="rounded-sm p-5" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                    <FieldStepBadge n={0} label="完整生辰 · 一键输入" />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="flex-1 space-y-2">
                        <Label className="block !text-[12px] !font-bold leading-relaxed tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>
                          <span className="whitespace-nowrap">阳历生辰串</span> <span className="font-normal text-muted-foreground/80">（支持 199910012000 / 1999-10-01 20:00 / 19991001 等格式，自动去分隔符）</span>
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
                            fontFamily: 'var(--font-mono)',
                            background: 'var(--input)',
                            border: `1px solid var(--border)`,
                            color: 'var(--foreground)',
                            boxShadow: 'none',
                            letterSpacing: '0.06em',
                          }}
                        />
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold leading-relaxed tracking-wider text-muted-foreground/75" style={{ fontFamily: 'var(--font-mono)' }}>
                          <span>格式：</span>
                          <span className="rounded-md bg-muted px-2 py-0.5 tabular-nums" style={{ border: `1px dashed ${accentLine}` }}>YYYYMMDDHHmm</span>
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
                        className="font-bold transition-colors hover:brightness-110"
                        style={{
                          height: '48px',
                          paddingLeft: '24px',
                          paddingRight: '24px',
                          fontFamily: 'var(--font-mono)',
                          background: `${accent}`,
                          color: '#04100E',
                          border: `1px solid ${accent}`,
                          borderRadius: '2px',
                          boxShadow: 'none',
                        }}
                      >
                        解析并填入
                      </Button>
                    </div>
                  </div>

                  {/* 第 1-2 行：① 年 / ② 月日 */}
                  <div className="grid gap-5 lg:grid-cols-5">
                    {/* ① 出生年份（占 2 列）*/}
                    <div className="rounded-sm p-5 lg:col-span-2" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                      <FieldStepBadge n={1} label="出生年份" />
                      <div className="space-y-2">
                        <Input
                          type="number"
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          placeholder="例：1990"
                          className="!h-12 !px-4 !text-lg font-black tracking-wider focus-visible:ring-0"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            background: 'var(--input)',
                            border: `1px solid var(--border)`,
                            color: 'var(--foreground)',
                            boxShadow: 'none',
                          }}
                        />
                      </div>
                      <div className="mt-3">
                        <div className="mb-1.5 text-[10px] font-bold tracking-widest text-muted-foreground/80" style={{ fontFamily: 'var(--font-mono)' }}>
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
                    <div className="rounded-sm p-5 lg:col-span-3" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                      <FieldStepBadge n={2} label="出生月日" />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>月份</Label>
                          <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger className="!h-12 !text-base !font-black" style={{ background: 'var(--input)', border: `1px solid var(--border)`, color: 'var(--foreground)' }}>
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
                          <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>日期</Label>
                          <Select value={day} onValueChange={setDay}>
                            <SelectTrigger className="!h-12 !text-base !font-black" style={{ background: 'var(--input)', border: `1px solid var(--border)`, color: 'var(--foreground)' }}>
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
                        <div className="mb-1.5 text-[10px] font-bold tracking-widest text-muted-foreground/80" style={{ fontFamily: 'var(--font-mono)' }}>
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
                    <div className="rounded-sm p-5 lg:col-span-2" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                      <FieldStepBadge n={3} label="命主性别" />
                      <div className="mt-1 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setGender('male')}
                          className="inline-flex h-16 flex-col items-center justify-center rounded-sm transition-colors"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            background: gender === 'male' ? `${accent}` : 'transparent',
                            color: gender === 'male' ? '#04100E' : 'var(--foreground)',
                            border: `1px solid ${gender === 'male' ? accent : 'var(--border)'}`,
                            boxShadow: 'none',
                          }}
                        >
                          <div className="text-[18px] font-bold leading-none">乾造</div>
                          <div className="mt-1 text-[11px] font-medium tracking-[0.2em] opacity-80">男命 · YANG</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('female')}
                          className="inline-flex h-16 flex-col items-center justify-center rounded-sm transition-colors"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            background: gender === 'female' ? `#D93A4E` : 'transparent',
                            color: gender === 'female' ? '#ffffff' : 'var(--foreground)',
                            border: `1px solid ${gender === 'female' ? '#D93A4E' : 'var(--border)'}`,
                            boxShadow: 'none',
                          }}
                        >
                          <div className="text-[18px] font-bold leading-none">坤造</div>
                          <div className="mt-1 text-[11px] font-medium tracking-[0.2em] opacity-80">女命 · YIN</div>
                        </button>
                      </div>
                    </div>

                    {/* ④ 出生时分（占 3 列，仅按 0-23 小时 / 0-59 分钟下拉选择）*/}
                    <div className="rounded-sm p-5 lg:col-span-3" style={{ background: accentSoft, border: `1px solid ${accentLine}` }}>
                      <FieldStepBadge n={4} label="出生时分" />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>出生小时</Label>
                          <Select value={hour} onValueChange={setHour}>
                            <SelectTrigger className="!h-12 !text-base !font-black" style={{ background: 'var(--input)', border: `1px solid var(--border)`, color: 'var(--foreground)' }}>
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
                          <Label className="!text-[12px] !font-bold tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>出生分钟</Label>
                          <Select value={minute} onValueChange={setMinute}>
                            <SelectTrigger className="!h-12 !text-base !font-black" style={{ background: 'var(--input)', border: `1px solid var(--border)`, color: 'var(--foreground)' }}>
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
                          background: 'var(--input)',
                          color: 'var(--foreground)',
                          height: '48px',
                          paddingLeft: '20px',
                          paddingRight: '20px',
                          fontFamily: 'var(--font-mono)',
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
                          style={{ height: '48px', color: 'var(--foreground)', borderColor: accentLine, background: 'var(--input)', fontFamily: 'var(--font-mono)' }}
                        >
                          重新排盘
                        </Button>
                      )}
                      <div
                        className="hidden text-[10px] font-bold leading-relaxed tracking-widest text-muted-foreground/70 sm:block"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        数据均在本地计算 · 不上传云端
                      </div>
                    </div>
                    <div className="order-1 sm:order-2">
                      <Button
                        size="lg"
                        onClick={handleAnalyze}
                        className="min-w-[240px] !text-sm font-bold tracking-[0.25em] transition-colors hover:brightness-110"
                        style={{
                          background: `${accent}`,
                          color: '#04100E',
                          height: '54px',
                          paddingLeft: '34px',
                          paddingRight: '34px',
                          borderRadius: '2px',
                          fontFamily: 'var(--font-mono)',
                          boxShadow: 'none',
                          border: `1px solid ${accent}`,
                        }}
                      >
                        ▶ 一键排盘分析
                      </Button>
                    </div>
                  </div>
                  </Fragment>)}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* 排盘历史记录（未排盘时显示） */}
        {!analyzedBoolean && history.length > 0 && (
          <Card className="relative crosshair mt-4 rounded-sm border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-3 md:px-8">
              <div className="flex items-center gap-3">
                <span className="label-mono text-primary">HISTORY</span>
                <span className="h-3 w-px bg-border" />
                <CardTitle className="text-sm font-bold tracking-[0.15em] text-foreground">
                  排盘历史
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={clearHistory} className="label-mono text-muted-foreground hover:text-destructive">
                清除 CLEAR
              </Button>
            </CardHeader>
            <CardContent className="p-5 md:px-8">
              <div className="flex flex-wrap gap-2">
                {history.map(rec => (
                  <button
                    key={rec.id}
                    onClick={() => applyHistory(rec)}
                    className="rounded-sm border px-3 py-2 text-sm transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--card)',
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span className="font-bold">{rec.summary}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(rec.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分析结果区：左主内容 + 右侧 TOC（大屏显示） */}
        {analyzedBoolean && (
          <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
            {/* 左：主内容列 */}
            <div className="space-y-8 min-w-0 md:space-y-12">
              {/* 分析结果总标题：瑞士网格左对齐 */}
              <div className="border-t-2 border-foreground pt-4">
                <p className="label-mono mb-3 text-primary">ANALYSIS REPORT</p>
                <h2
                  className="text-[32px] font-black leading-none tracking-tight text-foreground md:text-[44px]"
                >
                  命局分析报告
                </h2>
                <p
                  className="mt-3 text-sm text-muted-foreground md:text-base"
                >
                  基于天之易八字命理体系 · 完整结构化解读
                </p>
              </div>


              {/* 一、四柱排盘总览 */}
              <Card
                id="section-pillars"
                className="relative crosshair scroll-mt-6 rounded-sm border-border bg-card"
              >
                {/* 区块标题栏 */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">02 / NATAL CHART</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">四柱排盘总览</span>
                  </div>
                  <span className="label-mono text-muted-foreground">
                    {chart.birthInfo.solarDate} · {chart.gender === 'male' ? '乾造' : '坤造'} · 真太阳时 {chart.birthInfo.trueSolarTime}
                  </span>
                </div>

                <CardContent className="p-4 md:p-8">
                  <div className="grid grid-cols-4 gap-2 md:gap-3">
                    {[chart.year, chart.month, chart.day, chart.hour].map((pillar, idx) => (
                      <div
                        key={idx}
                        className={`relative flex flex-col items-center border p-2.5 md:p-4 ${
                          idx === 2
                            ? 'border-primary/60 bg-primary/[0.04]'
                            : 'border-border bg-background/40'
                        }`}
                      >
                        {/* 柱位编码 */}
                        <div className="mb-2 flex w-full items-center justify-between">
                          <span className="label-mono text-[9px] text-muted-foreground">
                            {['YEAR', 'MONTH', 'DAY', 'HOUR'][idx]}
                          </span>
                          <span className="text-[10px] text-muted-foreground md:text-[11px]">{pillarLabels[idx]}</span>
                        </div>
                        {/* 天干 */}
                        <div className="relative">
                          {(() => {
                            // 日主（日柱天干 = idx 2）不纳入用神 / 非用神显示，保持中性视觉
                            const isRiZhu = idx === 2;
                            const stemMark = isRiZhu
                              ? 'neutral'
                              : yongJi.stemMarks[`${['年', '月', '日', '时'][idx]}干`];
                            const stemStyle: React.CSSProperties =
                              !isRiZhu && stemMark === 'useful'
                                ? { background: 'hsl(168 40% 14%)', color: 'hsl(168 72% 64%)', border: '1px solid hsl(168 55% 30%)' }
                                : !isRiZhu && stemMark === 'taboo'
                                  ? { background: 'hsl(352 45% 15%)', color: 'hsl(352 82% 72%)', border: '1px solid hsl(352 55% 32%)' }
                                  : { background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)' };
                            return (
                              <>
                                <div
                                  className="flex size-14 items-center justify-center text-[28px] font-black leading-none md:size-16 md:text-[34px]"
                                  style={stemStyle}
                                >
                                  {pillar.stem}
                                </div>
                                <div className="absolute -right-1.5 -top-1.5">
                                  {isRiZhu ? (
                                    <span
                                      className="rounded-sm px-1 py-0 text-[9px] font-bold tracking-[0.1em]"
                                      style={{
                                        background: 'var(--primary)',
                                        color: '#04100E',
                                        border: '1px solid var(--primary)',
                                        fontFamily: 'var(--font-mono)',
                                      }}
                                    >
                                      日主
                                    </span>
                                  ) : (
                                    renderMarkBadge(stemMark)
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        <div className="mt-1.5 label-mono text-[9px] text-muted-foreground" style={{ letterSpacing: '0.08em' }}>
                          {ELEMENT_NAMES[pillar.stemElement]} · {pillar.stemYinYang === 'yang' ? '阳' : '阴'}
                        </div>
                        {pillar.shiShen && (
                          <div className="mt-0.5 text-[10px] font-bold text-primary md:text-[11px]">{pillar.shiShen}</div>
                        )}
                        {/* 分隔线 */}
                        <div className="my-2.5 h-px w-full bg-border" />
                        {/* 地支 */}
                        <div className="relative">
                          {(() => {
                            const branchMark = yongJi.branchMarks[`${['年', '月', '日', '时'][idx]}支`];
                            const branchStyle: React.CSSProperties =
                              branchMark === 'useful'
                                ? { background: 'hsl(168 40% 14%)', color: 'hsl(168 72% 64%)', border: '1px solid hsl(168 55% 30%)' }
                                : branchMark === 'taboo'
                                  ? { background: 'hsl(352 45% 15%)', color: 'hsl(352 82% 72%)', border: '1px solid hsl(352 55% 32%)' }
                                  : { background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)' };
                            return (
                              <>
                                <div
                                  className="flex size-14 items-center justify-center text-[28px] font-black leading-none md:size-16 md:text-[34px]"
                                  style={branchStyle}
                                >
                                  {pillar.branch}
                                </div>
                                <div className="absolute -right-1.5 -top-1.5">
                                  {renderMarkBadge(branchMark)}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        <div className="mt-1.5 label-mono text-[9px] text-muted-foreground" style={{ letterSpacing: '0.08em' }}>
                          {ELEMENT_NAMES[pillar.branchElement]} · {pillar.branchYinYang === 'yang' ? '阳' : '阴'}
                        </div>
                        <div className="mt-2.5 w-full">
                          <div className="label-mono text-[8.5px] text-muted-foreground">藏干 HIDDEN</div>
                          <div className="mt-1 flex flex-wrap justify-center gap-1">
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
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold"
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    background: isJi ? 'hsl(168 40% 14%)' : 'var(--muted)',
                                    color: isJi ? 'hsl(168 72% 64%)' : 'var(--muted-foreground)',
                                    border: `1px solid ${isJi ? 'hsl(168 55% 30%)' : 'var(--border)'}`,
                                  }}
                                >
                                  {s}
                                  {isJi && (
                                    <span
                                      className="ml-0.5 inline-flex size-3 items-center justify-center text-[7.5px] font-bold leading-none"
                                      style={{ background: 'var(--primary)', color: '#04100E', borderRadius: 1 }}
                                    >
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
                  {/* 图例：发丝线元数据 */}
                  <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4 label-mono text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <span className="inline-block size-2.5" style={{ background: 'hsl(168 40% 14%)', border: '1px solid hsl(168 55% 30%)' }} />
                      用神 · 有助平衡
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="inline-block size-2.5" style={{ background: 'hsl(352 45% 15%)', border: '1px solid hsl(352 55% 32%)' }} />
                      忌神 · 破坏平衡
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="inline-block size-2.5 border border-border" />
                      中性 · 无直接助损
                    </span>
                  </div>
                </CardContent>
              </Card>


              {/* 二、命局模式分析 */}
              <Card
                id="section-mingju-pattern"
                className="relative crosshair scroll-mt-6 rounded-sm border-border bg-card"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">03 / PATTERN</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">命局模式分析</span>
                  </div>
                  <span className="label-mono hidden text-muted-foreground md:inline">四柱结构 · 主生克路线</span>
                </div>
                <CardContent className="space-y-4 p-4 md:p-8">
                  {/* 年月太极（《太极阴阳法》：年为格局根本，年月组合构成命局核心太极） */}
                  {pattern.nianYueTaiJi && (
                    <div
                      className="rounded-lg p-4"
                      style={{ backgroundColor: `${TERMINAL_PALETTE.primary}0A`, border: `1px solid ${TERMINAL_PALETTE.primary}22` }}
                    >
                      <div className="text-sm font-bold" style={{ color: `${TERMINAL_PALETTE.primary}` }}><span className="mark-highlight">年月太极分析</span></div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-md px-2.5 py-1 text-[13px] font-black text-foreground" style={{ fontFamily: "'Noto Serif SC', serif", backgroundColor: `${TERMINAL_PALETTE.primary}14`, border: `1px solid ${TERMINAL_PALETTE.primary}30` }}>
                          {pattern.nianYueTaiJi.yearGZ}年 · {pattern.nianYueTaiJi.monthGZ}月
                        </span>
                        <span className="rounded-md px-2.5 py-1 text-[13px] font-black" style={{ fontFamily: "'Noto Serif SC', serif", color: '#FFFFFF', backgroundColor: `${TERMINAL_PALETTE.primary}` }}>
                          {pattern.nianYueTaiJi.taijiName}
                        </span>
                        <span className="rounded-sm px-2.5 py-1 text-[13px] font-black" style={{
                          color: pattern.nianYueTaiJi.state === '两仪完整' ? '#34D399' : pattern.nianYueTaiJi.state === '两仪受损' ? '#FBBF24' : '#F87171',
                          backgroundColor: pattern.nianYueTaiJi.state === '两仪完整' ? 'rgba(52,211,153,.10)' : pattern.nianYueTaiJi.state === '两仪受损' ? 'rgba(251,191,36,.10)' : 'rgba(248,113,113,.10)',
                          border: `1px solid ${pattern.nianYueTaiJi.state === '两仪完整' ? 'rgba(52,211,153,.4)' : pattern.nianYueTaiJi.state === '两仪受损' ? 'rgba(251,191,36,.4)' : 'rgba(248,113,113,.4)'}`,
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
                    style={{ backgroundColor: `${TERMINAL_PALETTE.secondary}0C`, border: `1px solid ${TERMINAL_PALETTE.secondary}28` }}
                  >
                    <div className="text-sm font-bold" style={{ color: `${TERMINAL_PALETTE.secondary}` }}><span className="mark-highlight">命局模式类型</span></div>
                    <div className="mt-2 text-lg font-black text-foreground">{pattern.patternType}</div>
                    <p className="mt-2 text-sm leading-relaxed font-bold text-muted-foreground">{pattern.description}</p>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-bold"><span className="mark-highlight">主要生克关系</span></div>
                    <div className="space-y-1.5">
                      {pattern.mainShengKe.map((rel, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-1.5 text-sm font-bold">
                          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: `${TERMINAL_PALETTE.secondary}` }} />
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
                className="relative crosshair scroll-mt-6 rounded-sm border-border bg-card"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">04 / FORTUNE</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">大运流年分析</span>
                  </div>
                  <span className="label-mono hidden text-muted-foreground md:inline">十年大运 · 岁运引动</span>
                </div>
                <CardContent className="space-y-4 p-4 md:p-8">
                  {(() => {
                    // ===== 大运/流年 新九档字母等级视觉映射（S+ > S > A+ > A > B+ > B- > C > C- > D）=====
                    const LETTER_META: Record<string, { bg: string; border: string; text: string; ring: string; labelColor: string; dot: string }> = {
                      'S+': { bg: 'linear-gradient(135deg,rgba(244,63,94,.12),rgba(251,191,36,.08))', border: '#FB7185', text: '#FDA4AF', ring: '#FB7185', labelColor: '#FB7185', dot: '#FB7185' },
                      'S':  { bg: 'rgba(245,158,11,.10)', border: '#FBBF24', text: '#FDE68A', ring: '#FBBF24', labelColor: '#FBBF24', dot: '#FBBF24' },
                      'A+': { bg: 'rgba(16,185,129,.10)', border: '#34D399', text: '#6EE7B7', ring: '#34D399', labelColor: '#34D399', dot: '#34D399' },
                      'A':  { bg: 'rgba(34,197,94,.10)', border: '#4ADE80', text: '#86EFAC', ring: '#4ADE80', labelColor: '#4ADE80', dot: '#4ADE80' },
                      'B+': { bg: 'rgba(14,165,233,.10)', border: '#38BDF8', text: '#7DD3FC', ring: '#38BDF8', labelColor: '#38BDF8', dot: '#38BDF8' },
                      'B-': { bg: 'rgba(148,163,184,.10)', border: '#94A3B8', text: '#CBD5E1', ring: '#94A3B8', labelColor: '#94A3B8', dot: '#94A3B8' },
                      'C':  { bg: 'rgba(249,115,22,.10)', border: '#FB923C', text: '#FDBA74', ring: '#FB923C', labelColor: '#FB923C', dot: '#FB923C' },
                      'C-': { bg: 'rgba(239,68,68,.12)', border: '#F87171', text: '#FCA5A5', ring: '#F87171', labelColor: '#F87171', dot: '#F87171' },
                      'D':  { bg: 'linear-gradient(135deg,#27272A,#3F3F46)', border: '#71717A', text: '#FAFAFA', ring: '#71717A', labelColor: '#E4E4E7', dot: '#71717A' },
                    };
                    // 旧五档兼容映射（数据未切换时的兜底）
                    const WUDANG_META: Record<string, { bg: string; border: string; text: string; ring: string; labelColor: string; dot: string }> = {
                      '夯':     { bg: 'rgba(245,158,11,.10)', border: '#FBBF24', text: '#FDE68A', ring: '#FBBF24', labelColor: '#FBBF24', dot: '#FBBF24' },
                      '人上人': { bg: 'rgba(139,92,246,.10)', border: '#A78BFA', text: '#C4B5FD', ring: '#A78BFA', labelColor: '#A78BFA', dot: '#A78BFA' },
                      'npc':    { bg: 'rgba(148,163,184,.10)', border: '#94A3B8', text: '#CBD5E1', ring: '#94A3B8', labelColor: '#94A3B8', dot: '#94A3B8' },
                      '拉':     { bg: 'rgba(251,146,60,.10)', border: '#FB923C', text: '#FDBA74', ring: '#FB923C', labelColor: '#FB923C', dot: '#FB923C' },
                      '拉完了': { bg: 'rgba(239,68,68,.12)', border: '#F87171', text: '#FCA5A5', ring: '#F87171', labelColor: '#F87171', dot: '#F87171' },
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
                            <div className="text-sm font-bold" style={{ color: isCurrentDY ? '#38BDF8' : '#94A3B8' }}>
                              <span className="mark-highlight">
                                {isCurrentDY ? '当前大运' : '查看大运'}
                              </span>
                              {!isCurrentDY && (
                                <span className="ml-2 inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-black" style={{ backgroundColor: 'rgba(56,189,248,.12)', color: '#7DD3FC', border: '1px solid rgba(56,189,248,.35)' }}>
                                  点击下方大运行可切换
                                </span>
                              )}
                              <span className="ml-2 text-[13px] font-black" style={{ fontFamily: "'Noto Serif SC', serif", color: 'var(--foreground)' }}>
                                {activeCurve.label}
                              </span>
                            </div>
                            <div
                              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-black"
                              title={'分值梯度：S+ > +6 ｜ S: +4~+6 ｜ A+: +2~+4 ｜ A: 0~+2 ｜ B+: -2~0 ｜ B-: -4~-2 ｜ C: -6~-4 ｜ C-: -8~-6 ｜ D < -8'}
                            >
                              {(['S+','S','A+','A','B+','B-','C','C-','D'] as const).map(lv => (
                                <span key={lv} className="inline-flex items-center gap-1">
                                  <span className="size-2.5" style={{ backgroundColor: LETTER_META[lv].dot }} />
                                  <span style={{ color: LETTER_META[lv].text }}>{lv}</span>
                                </span>
                              ))}
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
                                          className={`cursor-pointer select-none transition-colors hover:bg-primary/5 ${isCurrent ? 'bg-primary/10' : ''}`}
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
                                          <TableRow className="hover:bg-inherit">
                                            <TableCell colSpan={6} className="border-t border-dashed border-border px-2 py-4 sm:px-6">
                                              <div className="mb-2 flex items-center justify-between">
                                                <div className="text-xs font-semibold" style={{ color: '#7DD3FC' }}>
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
                                                      className="group rounded-sm border p-2"
                                                      style={{
                                                        background: lmeta.bg,
                                                        borderColor: lmeta.border,
                                                      }}
                                                    >
                                                      <div className="flex items-baseline justify-between">
                                                        <div className="text-xs font-bold tabular-nums">{ln.year}</div>
                                                        <div className="inline-flex items-center">
                                                          <span
                                                            className="rounded-sm px-1.5 py-0.5 text-[10px] font-black"
                                                            style={{
                                                              color: lmeta.labelColor,
                                                              border: `1px solid ${lmeta.border}`,
                                                              background: lmeta.bg,
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
                                    <span className="rounded-sm px-1.5 py-0.5" style={{ border: `1px solid ${meta.border}`, background: meta.bg }}>
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
                className="relative crosshair scroll-mt-6 overflow-hidden rounded-sm border-border bg-card"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">05 / OVERVIEW</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">命主速览</span>
                  </div>
                  <span className="label-mono hidden text-muted-foreground md:inline">日主 · 格局 · 用神 · 整体定调</span>
                </div>
                <CardContent className="p-4 md:p-8">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {/* 1. 日主 */}
                    <div
                      className="rounded-sm p-4"
                      style={{
                        backgroundColor: `${TERMINAL_PALETTE.primary}0C`,
                        border: `1px solid ${TERMINAL_PALETTE.primary}30`,
                      }}
                    >
                      <div className="label-mono text-[9.5px] text-muted-foreground">日主 DAY MASTER</div>
                      <div className="mt-2 text-3xl font-black text-foreground">
                        {chart.day.stem}{ELEMENT_NAMES[chart.day.stemElement]}
                      </div>
                      <div className="mt-1 label-mono text-[10px] text-muted-foreground">
                        {chart.day.stemYinYang === 'yang' ? '阳' : '阴'}{ELEMENT_NAMES[chart.day.stemElement]}
                      </div>
                    </div>
                    {/* 2. 格局 */}
                    <div
                      className="rounded-sm p-4"
                      style={{
                        backgroundColor: `${TERMINAL_PALETTE.secondary}12`,
                        border: `1px solid ${TERMINAL_PALETTE.secondary}33`,
                      }}
                    >
                      <div className="label-mono text-[9.5px] text-muted-foreground">格局 PATTERN</div>
                      <div
                        className="mt-2 text-lg font-bold leading-snug text-foreground"
                        style={{ minHeight: '3.2rem' }}
                      >
                        {pattern.patternType || '常规格局'}
                      </div>
                      <div className="mt-1 label-mono text-[10px] text-muted-foreground">
                        {monthQi.fourSymbol} · {monthQi.monthName}
                      </div>
                    </div>
                    {/* 3. 用神 */}
                    <div
                      className="rounded-sm p-4"
                      style={{
                        backgroundColor: 'hsl(168 40% 12%)',
                        border: '1px solid hsl(168 50% 28%)',
                      }}
                    >
                      <div className="label-mono text-[9.5px] text-muted-foreground">用神 FAVORABLE</div>
                      <div className="mt-2 text-2xl font-black text-foreground">
                        {yongJi.usefulElements.length > 0
                          ? yongJi.usefulElements.map((el) => ELEMENT_NAMES[el]).join(' · ')
                          : '—'}
                      </div>
                      <div className="mt-1 label-mono text-[10px]" style={{ color: 'hsl(168 70% 62%)' }}>
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
                        'S+': '#FB7185','S':'#FBBF24','A+':'#34D399','A':'#4ADE80',
                        'B+':'#38BDF8','B-':'#94A3B8','C':'#FB923C','C-':'#F87171','D':'#E5E7EB',
                      };
                      const letterCol = letterColorMap[letterLv] ?? '#34D399';
                      const fmt = (n: number) => (n >= 0 ? '+' : '') + Math.round(n * 10) / 10;
                      return (
                        <div
                          className="col-span-2 rounded-sm p-4 md:col-span-1"
                          style={{
                            background: `linear-gradient(135deg, hsl(220 18% 10%) 0%, ${letterCol}14 100%)`,
                            border: `1px solid ${letterCol}66`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="label-mono text-[9.5px]" style={{ color: letterCol }}>
                              格局综合分 SCORE
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="rounded-sm px-2 py-0.5 text-[11px] font-black tabular-nums"
                                style={{
                                  background: letterCol,
                                  color: 'hsl(222 26% 6%)',
                                  letterSpacing: '0.06em',
                                }}
                              >
                                {letterLv}
                              </span>
                              <span
                                className="rounded-sm px-1.5 py-0.5 text-[10px] font-black"
                                style={{
                                  color: 'hsl(222 26% 6%)',
                                  backgroundColor: letterCol,
                                  opacity: 0.75,
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
                            <span className="label-mono text-[10px] text-muted-foreground">/ 100</span>
                          </div>
                          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-sm" style={{ backgroundColor: 'hsl(220 14% 18%)' }}>
                            <div className="h-full rounded-sm transition-all"
                              style={{ width: `${Math.max(0, Math.min(100, overall))}%`, backgroundColor: letterCol }}
                            />
                          </div>
                          <div className="mt-2 space-y-0.5">
                            <div className="label-mono text-[9.5px] leading-snug text-muted-foreground">
                              · 原局先天 {fmt(mingRaw)}（{mingPanScore?.letterLevel ?? '—'}）
                            </div>
                            <div className="label-mono text-[9.5px] leading-snug text-muted-foreground">
                              · 一生大运均分 {fmt(dyAvg)}（{daysArr.length} 步）
                            </div>
                            <div className="label-mono text-[9.5px] leading-snug" style={{ color: letterCol }}>
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
                className="relative crosshair scroll-mt-6 overflow-hidden rounded-sm border-border bg-card"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">06 / BALANCE</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">寒热气 · 阴阳气占比</span>
                  </div>
                </div>
                <CardContent className="p-4 md:p-8">
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
                className="relative crosshair scroll-mt-6 overflow-hidden rounded-sm border-border bg-card"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">07 / SPECIAL TIPS</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">特别提示</span>
                  </div>
                  <span className="label-mono hidden text-muted-foreground md:inline">典籍检索 · 关键提示点</span>
                </div>
                <CardContent className="space-y-3 p-4 text-sm leading-relaxed md:p-8">
                  {specialTips.map((tip, i) => {
                    const tone =
                      tip.level === '关键'
                        ? { title: '#CBD5E1', bg: 'rgba(148,163,184,.08)', border: 'rgba(148,163,184,.4)', ring: '#94A3B8', badgeBg: '#94A3B8', badgeText: 'hsl(222 26% 6%)', badgeLabel: '关键' }
                        : tip.level === '吉'
                          ? { title: '#6EE7B7', bg: 'rgba(52,211,153,.08)', border: 'rgba(52,211,153,.4)', ring: '#34D399', badgeBg: '#34D399', badgeText: 'hsl(222 26% 6%)', badgeLabel: '吉' }
                          : tip.level === '凶'
                            ? { title: '#FCA5A5', bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.4)', ring: '#F87171', badgeBg: '#F87171', badgeText: 'hsl(222 26% 6%)', badgeLabel: '凶' }
                            : { title: '#CBD5E1', bg: 'rgba(148,163,184,.08)', border: 'rgba(148,163,184,.35)', ring: '#94A3B8', badgeBg: '#64748B', badgeText: 'hsl(222 26% 6%)', badgeLabel: '平' };
                    return (
                      <div
                        key={`tip-${i}`}
                        className="rounded-sm p-4"
                        style={{
                          backgroundColor: tone.bg,
                          border: `1px solid ${tone.border}`,
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
              <Card id="section-monthqi" className="relative crosshair scroll-mt-6 overflow-hidden rounded-sm border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">08 / MONTH QI</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">月气分析</span>
                  </div>
                  <span className="label-mono hidden text-muted-foreground md:inline">月令为权 · 吉凶准绳</span>
                </div>
                <CardContent className="space-y-4 p-4 md:p-8">
                  {/* 月对日主·十二长生状态 */}
                  <MonthRiZhuChangShengCard
                    chart={chart}
                    solarTermTheme={solarTermTheme}
                  />

                  <div className="flex items-center gap-4">
                    <div
                      className="flex size-16 shrink-0 items-center justify-center rounded-xl text-2xl font-black"
                      style={{
                        backgroundColor: `${TERMINAL_PALETTE.primary}14`,
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
                    style={{ backgroundColor: `${TERMINAL_PALETTE.primary}0D` }}
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
                className="relative crosshair scroll-mt-6 rounded-sm border-border bg-card"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">09 / FAVORABLE & TABOO</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">用神忌神判断</span>
                  </div>
                  <span className="label-mono hidden text-muted-foreground md:inline">平衡为则</span>
                </div>
                <CardContent className="space-y-4 p-4 md:p-8">
                  <div className="flex gap-4 flex-col md:flex-row">
                    <div className="flex-1 rounded-sm border p-4" style={{ borderColor: 'hsl(168 50% 28%)', background: 'hsl(168 40% 11%)' }}>
                      <div className="label-mono text-[10px] font-bold" style={{ color: 'hsl(168 70% 62%)' }}>用神 FAVORABLE · 喜用</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {yongJi.usefulElements.map((el) => (
                          <span key={el} className="rounded-sm px-3 py-1 text-sm font-black" style={{ background: 'hsl(172 76% 47%)', color: 'hsl(222 26% 6%)' }}>
                            {ELEMENT_NAMES[el]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 label-mono text-[10px]" style={{ color: 'hsl(168 60% 66%)' }}>有利于阴阳平衡，助之则吉</div>
                    </div>
                    <div className="flex-1 rounded-sm border p-4" style={{ borderColor: 'hsl(352 50% 32%)', background: 'hsl(352 38% 11%)' }}>
                      <div className="label-mono text-[10px] font-bold" style={{ color: 'hsl(352 80% 72%)' }}>忌神 TABOO · 所忌</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {yongJi.tabooElements.map((el) => (
                          <span key={el} className="rounded-sm px-3 py-1 text-sm font-black" style={{ background: 'hsl(352 70% 56%)', color: 'hsl(222 26% 6%)' }}>
                            {ELEMENT_NAMES[el]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 label-mono text-[10px]" style={{ color: 'hsl(352 70% 74%)' }}>破坏阴阳平衡，助之则凶</div>
                    </div>
                  </div>

                  {/* 土专区：中宫承载制衡之气（数据书优先级 2，独立判定是否取用土） */}
                  {earthXiJi && (
                    <div className="rounded-sm border p-4" style={{ borderColor: 'rgba(251,191,36,.35)', background: 'rgba(251,191,36,.07)' }}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-bold" style={{ color: '#FCD34D' }}>土（中宫 · 承载制衡）</div>
                        <span
                          className="label-mono inline-flex items-center rounded-sm px-2.5 py-0.5 text-[10px] font-black"
                          style={{
                            background: earthXiJi.decision === 'useful' ? '#FBBF24' : earthXiJi.decision === 'taboo' ? '#F87171' : '#94A3B8',
                            color: 'hsl(222 26% 6%)',
                          }}
                        >
                          {earthXiJi.overall}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{earthXiJi.reason}</p>
                      {earthXiJi.details.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {earthXiJi.details.map((d) => (
                            <span
                              key={d.ganzhi}
                              className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-bold"
                              style={{
                                background: d.mark === 'useful' ? 'rgba(251,191,36,.14)' : d.mark === 'taboo' ? 'rgba(248,113,113,.12)' : 'rgba(148,163,184,.1)',
                                color: 'var(--foreground)',
                                border: `1px solid ${d.mark === 'useful' ? 'rgba(251,191,36,.45)' : d.mark === 'taboo' ? 'rgba(248,113,113,.45)' : 'rgba(148,163,184,.35)'}`,
                              }}
                              title={d.note}
                            >
                              {d.ganzhi}
                              <span className="label-mono text-[9px] font-black" style={{ color: d.mark === 'useful' ? '#FBBF24' : d.mark === 'taboo' ? '#F87171' : '#94A3B8' }}>
                                {d.mark === 'useful' ? '宜用' : d.mark === 'taboo' ? '忌' : '调和'}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-sm leading-relaxed text-muted-foreground">{yongJi.description}</p>
                </CardContent>
              </Card>


              {/* 十、象意·财富·感情·学历（《象法》数据书，优先级 2，最终参考） */}
              <Card
                id="section-xiangfa"
                className="relative crosshair scroll-mt-6 rounded-sm border-border bg-card"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">10 / XIANG FA</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">象意 · 财富 · 感情 · 学历</span>
                  </div>
                </div>
                <CardContent className="p-4 md:p-8">
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
            <div className="flex flex-wrap justify-center gap-3 py-4">
              <Button variant="outline" size="lg" onClick={handleReset} className="font-bold">
                重新排盘
              </Button>
              <Button variant="outline" size="lg" onClick={handleCopyReport} className="font-bold" style={{ color: 'var(--accent-foreground)', borderColor: 'var(--accent)' }}>
                复制摘要
              </Button>
              <Button variant="outline" size="lg" onClick={handleExportReport} className="font-bold" style={{ color: 'var(--accent-foreground)', borderColor: 'var(--accent)' }}>
                导出报告
              </Button>
            </div>
          </div>

          {/* 右：报告目录 TOC（大屏 sticky） */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-sm border border-border bg-card p-4">
              <div className="label-mono mb-3 border-b border-border pb-2 text-[10px] text-primary">
                INDEX / 报告目录
              </div>
              {[
                { id: 'pillars', no: '02', label: '四柱排盘总览' },
                { id: 'mingju-pattern', no: '03', label: '命局模式分析' },
                { id: 'dayun', no: '04', label: '大运流年分析' },
                { id: 'overview', no: '05', label: '命主速览' },
                { id: 'pie', no: '06', label: '寒热气·阴阳气' },
                { id: 'special-tips', no: '07', label: '特别提示' },
                { id: 'monthqi', no: '08', label: '月气分析' },
                { id: 'yongji', no: '09', label: '用神忌神判断' },
                { id: 'xiangfa', no: '10', label: '象意' },
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#section-${item.id}`}
                  className="group flex items-center gap-3 rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                >
                  <span className="label-mono text-[10px] text-primary/70 group-hover:text-primary">{item.no}</span>
                  <span className="truncate">{item.label}</span>
                </a>
              ))}
              <div className="label-mono mt-4 border-t border-border pt-2 text-[9.5px] leading-relaxed text-muted-foreground">
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
          <p className="label-mono mt-3 inline-flex items-center gap-2 rounded-sm border border-border/60 bg-muted/40 px-3 py-1 text-[10px] font-bold text-muted-foreground">
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
