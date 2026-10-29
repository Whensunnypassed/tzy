import React, { Fragment, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
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

import MingJuFieldChart from '@/components/MingJuFieldChart';
import ChangShengRingChart from '@/components/ChangShengRingChart';

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
  analyzeTaiJiInChart, // 暂时停用：盘内存在太极模块已隐藏，恢复时启用
  analyzeZhuZiXiJi,
  getChunQiuMonthFactor,
  detectGanZhiZiHe,
  analyzeGuFaPangZheng,
  analyzeSiZhuXianDuan,
  analyzeQuBi,
  pickKeyYears,
  analyzeChangShengRing,
  analyzeWuXingQuXiang,
  analyzeLaoGaoRules,
  computeTaiJiQi,
  type MonthQiResult,
  type ChunQiuFactorResult,
  type GanZhiZiHeHit,
  type GuFaPangZheng,
  type YongJiResult,
  type ZhuZiXiJiResult,
  type ZhuZiEntry,
  type XianDuanResult,
  type QuBiResult,
  type KeyYearsResult,
  type ChangShengRingResult,
  type WuXingQuXiangResult,
  type TaiJiQiResult,
} from '@/utils/baziAnalyzer';
import {
  analyzeXiangYi,
  analyzeWealthVerdict,
  analyzeEducationVerdict,
  analyzeEarthXiJi,
  scoreWealthForYear,
  scoreNobilityForYear,
  type XiangYiVerdict,
  type WealthVerdict,
  type EducationVerdict,
  type EarthXiJiResult,
} from '@/utils/xiangfaAnalyzer';
import {
  ELEMENT_PALETTE_FORMAL,
  getSolarTermThemeByBirthDate,
  type SolarTermTheme,
} from '@/data/solarTermsTheme';
import { JIAZI_PILLARS_BY_XUN, MONTH_QI_EXPANDED, ULTIMATE_SUMMARY, ZHI_ZUO_YONG_RULES, BIRTH_REGION_CFG, type IXunGroup } from '@/data/baziData';

const ELEMENT_NAMES: Record<string, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
};

// 五行低饱和平涂色（瑞士风：统一明度、去荧光）
const ELEMENT_COLORS: Record<string, string> = {
  wood: '#4A834E',
  fire: '#DC4824',
  earth: '#B98C31',
  metal: '#788491',
  water: '#31669B',
};

// ============ 命盘终端 MINGPAN TERMINAL：统一瑞士色板 ============
// 界面配色不再随节气变化；节气仅保留名称与诗句作为元数据
const TERMINAL_PALETTE = {
  bg1: '#FFFFFF',
  bg2: '#F5F6F8',
  card: '#FFFFFF',
  primary: '#E31C29', // 瑞士红：仅 CTA / 忌神 / 关键标记
  secondary: '#3A4450', // 墨灰
  accent: '#2E7654', // 用神绿
  muted: '#EEF0F3',
  prose: '#1F2937',
} as const;

// 光谱：瑞士平涂五色 + 墨
const TERMINAL_SPECTRUM = ['#E31C29', '#4A834E', '#B98C31', '#788491', '#31669B', '#1F2937'];

// ============ 流年小卡提示文案 ============
// 引擎 hint 形如「2026丙午（综合 +2.1，岁运调整 +1.2，B+）：判词。关键阴阳作用：…。」
// 卡片本身已大字号列出年份 / 干支 / 综合分 / 等级，故小卡只保留「判词 + 关键作用」，
// 去掉重复前缀后即使窄卡也能把整段话完整排出，不再靠 line-clamp 截断。
function compactLiuNianHint(hint: unknown): string {
  const text = typeof hint === 'string' ? hint : '';
  const cut = text.match(/^[^（]*（[^）]*）：/);
  return (cut ? text.slice(cut[0].length) : text).trim();
}

// ============ 报告版块注册表（单一真源） ============
// 左侧导航 / 正文版块头 / 右侧目录三处共用，禁止各自硬编码编号；
// 新增或调整版块只改此处，避免编号漂移（可进化契约）。
const REPORT_SECTIONS = [
  { id: 'pillars', no: '01', label: '四柱排盘', en: 'PILLARS', title: '四柱排盘总览' },
  { id: 'overview', no: '02', label: '命主速览', en: 'OVERVIEW', title: '命主速览' },
  { id: 'monthqi', no: '03', label: '月气分析', en: 'MONTH QI', title: '月气分析' },
  { id: 'yongji', no: '04', label: '用神忌神', en: 'FAVORABLE & TABOO', title: '用神忌神判断' },
  { id: 'dayun', no: '05', label: '大运流年', en: 'FORTUNE', title: '大运流年分析' },
  { id: 'xiangfa', no: '06', label: '象意解读', en: 'XIANG FA', title: '象意解读' },
] as const;

const SECTION_META: Record<string, { no: string; label: string; en: string; title: string }> =
  Object.fromEntries(REPORT_SECTIONS.map((s) => [s.id, s]));

// ============ 版块「正文 + 侧注」分栏（论文批注式） ============
// 左列 = 结论正文；右列 = 依据/口径/旁证，落在原右栏空置的横向空间；
// 窄屏（<lg）侧注折到正文下方。无 notes 时退化为单列，不改变既有版式。
function SplitBody({
  notes,
  children,
  className = '',
  notesOpen = true,
}: {
  notes?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** 侧注（依据 / NOTES）初始是否展开；false 时默认折叠，点击展开 */
  notesOpen?: boolean;
}) {
  if (!notes) return <div className={className}>{children}</div>;
  return (
    <div className={`lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-7 ${className}`}>
      <div className="min-w-0 space-y-4">{children}</div>
      <aside className="mt-5 border-t border-border pt-4 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
        <details className="group" open={notesOpen || undefined}>
          <summary className="label-mono mb-3 cursor-pointer select-none border-b border-border pb-2 text-muted-foreground transition-colors hover:text-foreground">
            依据 / NOTES
            <span className="ml-2 inline-block text-[9px] transition-transform group-open:rotate-90">▶</span>
          </summary>
          <div className="space-y-4">{notes}</div>
        </details>
      </aside>
    </div>
  );
}

// ============ 可折叠依据块（受「结论/全量」视图开关驱动初始态，用户可自由开合） ============
function Detail({
  label,
  children,
  open,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  open: boolean;
  className?: string;
}) {
  const [o, setO] = useState(open);
  useEffect(() => setO(open), [open]);
  return (
    <div className={`border border-border bg-card ${className}`}>
      <button
        type="button"
        onClick={() => setO((v) => !v)}
        aria-expanded={o}
        className="label-mono flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span>{label}</span>
        <span
          aria-hidden
          className="label-mono flex shrink-0 items-center gap-1 text-[10px] font-black leading-none"
          style={{ color: o ? 'hsl(222 10% 45%)' : '#E31C29' }}
        >
          <span className="text-[12px]">{o ? '▾' : '▸'}</span>
          <span>{o ? '收起' : '展开'}</span>
        </span>
      </button>
      {o && <div className="border-t border-border p-4">{children}</div>}
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
    { y: +5, label: '夯',   color: '#B98C31', dashed: false, band: true },
    { y: +2, label: '人上', color: '#31669B', dashed: true },
    { y:  0, label: '0',    color: '#8A94A3', dashed: true },
    { y: -2, label: '拉',   color: '#DC4824', dashed: true },
  ];
  // 点颜色（按 level，兼容新九档与旧五档）
  const dotColor = (lvl: string) => {
    const map: Record<string, string> = {
      'S+': '#E31C29', 'S': '#B98C31', 'A+': '#2E7654', 'A': '#4A834E',
      'B+': '#31669B', 'B-': '#788491', 'C': '#C2410C', 'C-': '#9A3412', 'D': '#52525B',
      '夯': '#B98C31', '人上人': '#31669B', 'npc': '#788491', '拉': '#C2410C', '拉完了': '#9A3412',
    };
    return map[lvl] ?? '#31669B';
  };
  const areaFillFor = (y: number) => {
    if (y > 5) return 'rgba(185,140,49,0.12)';
    if (y > 2) return 'rgba(49,102,155,0.10)';
    if (y >= -2) return 'rgba(138,148,163,0.08)';
    return 'rgba(227,28,41,0.10)';
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
        <rect x={PAD_L} y={yToPx(Y_MAX)} width={W_CHART} height={yToPx(5) - yToPx(Y_MAX)} fill="rgba(185,140,49,0.06)" />
        <rect x={PAD_L} y={yToPx(5)}     width={W_CHART} height={yToPx(2) - yToPx(5)}     fill="rgba(49,102,155,0.05)" />
        <rect x={PAD_L} y={yToPx(2)}     width={W_CHART} height={yToPx(-2) - yToPx(2)}    fill="rgba(138,148,163,0.05)" />
        <rect x={PAD_L} y={yToPx(-2)}    width={W_CHART} height={yToPx(Y_MIN) - yToPx(-2)} fill="rgba(227,28,41,0.05)" />

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

        {/* 折线：瑞士红实线 */}
        <polyline
          points={polylinePts}
          fill="none"
          stroke="#E31C29"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 点 + 年份标签 + 干支 + 分数 */}
        {pts.map((p, i) => {
          const sc = p.it.displayScore;
          const c = dotColor(p.it.level);
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5.5" fill="white" stroke={c} strokeWidth="2.5" />
              <circle cx={p.x} cy={p.y} r="2.5" fill={c} />
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
                style={{ fontFamily: 'var(--font-sans)' }}
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
    sky: { border: 'rgba(49,102,155,0.35)', bg: 'rgba(49,102,155,0.05)', text: '#31669B', tag: '#31669B' },
    emerald: { border: 'rgba(46,118,84,0.35)', bg: 'rgba(46,118,84,0.05)', text: '#2E7654', tag: '#2E7654' },
    rose: { border: 'rgba(227,28,41,0.35)', bg: 'rgba(227,28,41,0.05)', text: '#E31C29', tag: '#E31C29' },
    amber: { border: 'rgba(185,140,49,0.4)', bg: 'rgba(185,140,49,0.06)', text: '#8F6A1F', tag: '#B98C31' },
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
          <span className="label-mono inline-flex items-center rounded-none px-2 py-0.5 text-[10px] font-black" style={{ background: am.tag, color: '#FFFFFF' }}>
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
            <span className="mr-2 inline-flex size-4 items-center justify-center rounded-full text-[9px] font-black" style={{ background: accent, color: '#FFFFFF' }}>{i + 1}</span>
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
        <div className="rounded-sm border p-4" style={{ border: '1px solid rgba(185,140,49,0.4)', background: 'rgba(185,140,49,0.06)' }}>
          <div className="mb-1 flex items-center gap-1.5">
            <span className="label-mono inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-black" style={{ background: '#B98C31', color: '#FFFFFF' }}>财富层级</span>
            <span className="label-mono inline-flex items-center rounded-sm px-2.5 py-0.5 text-[12px] font-black" style={{ border: '1px solid rgba(185,140,49,0.4)', color: '#8F6A1F' }}>
              {verdict.wealthRank}<span className="ml-1" style={{ color: '#B98C31' }}>· {verdict.wealthScoreFinal} 分</span>
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{verdict.wealthRankDesc}</p>
        </div>
        <div className="rounded-sm border p-4" style={{ border: '1px solid rgba(49,102,155,0.35)', background: 'rgba(49,102,155,0.05)' }}>
          <div className="mb-1 flex items-center gap-1.5">
            <span className="label-mono inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-black" style={{ background: '#31669B', color: '#FFFFFF' }}>事业地位</span>
            <span className="label-mono inline-flex items-center rounded-sm px-2.5 py-0.5 text-[12px] font-black" style={{ border: '1px solid rgba(49,102,155,0.35)', color: '#31669B' }}>
              {verdict.nobilityRank}<span className="ml-1" style={{ color: '#31669B' }}>· {verdict.nobilityScoreFinal} 分</span>
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{verdict.nobilityRankDesc}</p>
        </div>
      </div>
      <div className="rounded-sm p-4" style={{ border: '1px solid rgba(185,140,49,0.4)', background: 'rgba(185,140,49,0.06)' }}>
        <div className="label-mono mb-2 text-[11px] font-black" style={{ color: '#B98C31' }}>最利求财年份（按可能性从高到低）</div>
        {bestWealthYears.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">暂无足够流年数据可排序。</p>
        ) : (
          renderYearList(bestWealthYears, '#B98C31', '#B98C31')
        )}
      </div>
      <div className="rounded-sm p-4" style={{ border: '1px solid rgba(49,102,155,0.35)', background: 'rgba(49,102,155,0.05)' }}>
        <div className="label-mono mb-2 text-[11px] font-black" style={{ color: '#31669B' }}>最利事业地位年份（按可能性从高到低）</div>
        {bestNobilityYears.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">暂无足够流年数据可排序。</p>
        ) : (
          renderYearList(bestNobilityYears, '#31669B', '#31669B')
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
      <div className="rounded-sm p-4" style={{ border: '1px solid rgba(49,102,155,0.35)', background: 'rgba(49,102,155,0.05)' }}>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="label-mono inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-black" style={{ background: '#31669B', color: '#FFFFFF' }}>日主象意</span>
          <span className="label-mono text-xs font-black" style={{ color: '#31669B' }}>{verdict.dayMaster.stem} · {verdict.dayMaster.elementName} · {verdict.dayMaster.fourSymbol}</span>
        </div>
        <p className="text-sm leading-relaxed font-bold text-foreground">{verdict.dayMaster.stemTraits}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{verdict.dayMaster.nature}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-sm border border-border bg-card/70 p-2.5">
            <div className="label-mono text-[10px] font-black" style={{ color: '#31669B' }}>核心类象</div>
            <ul className="mt-1 space-y-1">
              {verdict.dayMaster.imagery.map((img, i) => (
                <li key={i} className="text-xs leading-relaxed text-muted-foreground">· {img}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <div className="rounded-sm border border-border bg-card/70 p-2.5">
              <div className="label-mono text-[10px] font-black" style={{ color: '#31669B' }}>人体 · 才艺</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{verdict.dayMaster.body}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{verdict.dayMaster.talent}</p>
            </div>
            <div className="rounded-sm border border-border bg-card/70 p-2.5">
              <div className="label-mono text-[10px] font-black" style={{ color: '#31669B' }}>吉凶异化</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{verdict.dayMaster.jiXiong}</p>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-sm border border-border bg-card/70 p-2.5">
          <div className="label-mono text-[10px] font-black" style={{ color: '#31669B' }}>月令流转</div>
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
      style={{ backgroundColor: 'rgba(227,28,41,0.08)', color: '#E31C29', border: '1px solid rgba(227,28,41,0.45)' }}
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
          style={{ fontFamily: "var(--font-sans)" }}
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
        refs.push({ tag: `【总纲·${title || '沛然堂真机'}】`, text: content || title });
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

// 分数明细组件的数据形状（大运行 / 流年行共用的可选数值字段，压缩分尺度见 baziAnalyzer 的 /3.6 说明）
type ScoreBreakdownRow = {
  displayScore?: number | string;
  score?: number;
  plusSumRaw?: number;
  minusSumRaw?: number;
  otherSumRaw?: number;
  mingPanBase?: number;
  rawScore?: number;
};

/** 应用版本号（正式版 v1.0.0 起，与 package.json 同步维护） */
const APP_VERSION = '2.16.3';

export default function BaZiAnalyzerPage() {
  const [year, setYear] = useState('2000');
  const [month, setMonth] = useState('1');
  const [day, setDay] = useState('1');
  const [hour, setHour] = useState('0');
  const [minute, setMinute] = useState('0');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  // 出生地时区板块（真太阳时经度校正）：默认北京，与旧版排盘口径一致
  const [birthRegion, setBirthRegion] = useState<string>(BIRTH_REGION_CFG.defaultKey);
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
  // 报告视图：conclusion = 结论视图（依据类块默认收起）；full = 全量视图（依据类块默认展开）
  const [reportView, setReportView] = useState<'conclusion' | 'full'>('conclusion');
  // —— 回到顶部 ——
  const [showBackTop, setShowBackTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

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

    const result = calculateBaZi(y, m, d, h, min, gender, birthRegion);
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
        standardTime: '—',
        dstApplied: false,
        dstOffsetMinutes: 0,
        longitudeOffsetMinutes: 0,
        equationOfTimeMinutes: 0,
        trueSolarDate: `${by}年（手动四柱）`,
        trueSolarDayOffset: 0,
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

  // 老高判据复核（判词层）：柱意优先 / 十神克向 / 生气成气克门控
  const laoGaoRules = useMemo(() => {
    if (!chart || !yongJi) return null;
    return analyzeLaoGaoRules(chart, yongJi);
  }, [chart, yongJi]);

  const elementPower = useMemo(() => {
    if (!chart) return null;
    return calculateElementPower(chart);
  }, [chart]);

  // 阴阳气 / 寒热气占比、六十甲子平铺：随「寒热气·阴阳气占比」与「特别提示」模块一并移除

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
    return analyzeDaYunLiuNian(chart, yongJi, elementPower, currentYear);
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

  // 模块 3：特别提示（模块已移除，底层 extractSpecialTips 保留在 baziAnalyzer.ts，可随时恢复）

  // 模块 3.5：干支逐字喜忌参考（调取《十二月份取用》资料库）
  const zhuZiXiJi = useMemo<ZhuZiXiJiResult | null>(() => {
    if (!chart || !monthQi) return null;
    return analyzeZhuZiXiJi(chart.month.branch, monthQi, chart);
  }, [chart, monthQi]);

  // 春秋月关键因子（寅卯申酉分段 + 辰戌杂气月；含申酉余热/成凉两局判定）
  const chunQiuFactor = useMemo<ChunQiuFactorResult | null>(() => {
    if (!chart) return null;
    return getChunQiuMonthFactor(chart);
  }, [chart]);

  // 干支自合柱（柱内天干与地支藏干构成天干五合，共九柱）
  const ganZhiZiHe = useMemo<GanZhiZiHeHit[]>(() => {
    if (!chart) return [];
    return detectGanZhiZiHe(chart);
  }, [chart]);

  // 四柱限段（「限」）：年为根本(0–16)、月令为权(16–32)、日为动应(32–48)、时为结果(48+)
  const xianDuan = useMemo<XianDuanResult | null>(() => {
    if (!chart || !yongJi) return null;
    return analyzeSiZhuXianDuan(chart, yongJi, currentYear);
  }, [chart, yongJi, currentYear]);

  // 趋避与时机（06）：用神生活化趋避 + 未来十年关键年份速查（判词层·不计分）
  // 原「根本吉凶 / 六亲换太极」UI 已撤；底层 analyzeGenBenJiXiong / analyzeLiuQinHuanTaiJi 保留在引擎，可随时恢复
  const quBi = useMemo<QuBiResult | null>(() => (yongJi ? analyzeQuBi(yongJi) : null), [yongJi]);
  const keyYears = useMemo<KeyYearsResult | null>(
    () => (daYunAnalysis ? pickKeyYears(daYunAnalysis.daYunWithFortune, currentYear) : null),
    [daYunAnalysis, currentYear],
  );

  // 十二长生环序（绝为起点、由弱到强）：逐干列落月令状态、环序位与气机强弱分
  const changShengRing = useMemo<ChangShengRingResult | null>(() => {
    if (!chart || !monthQi) return null;
    return analyzeChangShengRing(chart, monthQi);
  }, [chart, monthQi]);

  // 五行取象（从理到象）：本盘五行占比 + 月令逐字喜忌 → 逐行取象判定
  const wuXingQuXiang = useMemo<WuXingQuXiangResult | null>(() => {
    if (!chart || !monthQi || !yongJi || !elementPower) return null;
    return analyzeWuXingQuXiang(chart, monthQi, yongJi, elementPower);
  }, [chart, monthQi, yongJi, elementPower]);

  // 太极二气配比（方案 B）：量化阳 / 阴二气存量与配比 → 用忌大方向建议（旁证，参与判定与否由 YONG_JI_MODE 开关控制）
  const taiJiQi = useMemo<TaiJiQiResult | null>(() => {
    if (!chart || !monthQi) return null;
    return computeTaiJiQi(chart, monthQi);
  }, [chart, monthQi]);

  // 命局中出现的干支字（用于逐字表高亮）
  const chartChars = useMemo(() => {
    const set = new Set<string>();
    if (!chart) return set;
    [chart.year, chart.month, chart.day, chart.hour].forEach((p) => {
      set.add(p.stem);
      set.add(p.branch);
      p.hiddenStems.forEach((s) => set.add(s));
    });
    return set;
  }, [chart]);

  // ===== 新栏目「象意·财富·感情·学历」数据（数据书优先级 2，独立于既有模块）=====
  const xiangYi = useMemo<XiangYiVerdict | null>(() => {
    if (!chart) return null;
    return analyzeXiangYi(chart, monthQi);
  }, [chart, monthQi]);

  const wealthVerdict = useMemo<WealthVerdict | null>(() => {
    if (!chart || !wealthNobility) return null;
    return analyzeWealthVerdict(chart, monthQi, wealthNobility, elementPower);
  }, [chart, monthQi, wealthNobility, elementPower]);

  const educationVerdict = useMemo<EducationVerdict | null>(() => {
    if (!chart || !yongJi || !elementPower) return null;
    // 2026-10-29：加入当前大运（覆盖 18-28 岁关键学业期），原局偏弱但大运为用神运时不直接判弱
    const curDY = daYunAnalysis?.daYunWithFortune?.[daYunAnalysis.currentDaYunIndex];
    return analyzeEducationVerdict(chart, yongJi, elementPower, curDY ? {
      stem: curDY.stem, branch: curDY.branch,
      letterLevel: curDY.letterLevel, displayScore: curDY.displayScore,
    } : null);
  }, [chart, yongJi, elementPower, daYunAnalysis]);

  // 古法旁证（阴阳干支命理讲义底层增量：气干/形干、四冲、六破、驿马、司令真神、生克权流转）
  const guFaPangZheng = useMemo<GuFaPangZheng | null>(() => {
    if (!chart) return null;
    return analyzeGuFaPangZheng(chart);
  }, [chart]);

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

  const analyzedBoolean = analyzed && chart && monthQi && yongJi && elementPower && pattern && wealthNobility && daYunAnalysis;
  // 全量视图：依据类折叠块默认展开（结论视图默认收起）
  const fullView = reportView === 'full';

  // 出生地时区板块 → 经度 → 真太阳时校正分钟
  const selectedRegion = BIRTH_REGION_CFG.regions.find((r) => r.key === birthRegion)
    ?? BIRTH_REGION_CFG.regions.find((r) => r.key === BIRTH_REGION_CFG.defaultKey)
    ?? BIRTH_REGION_CFG.regions[0];
  const regionOffsetMinutes = Math.round(
    (selectedRegion.longitude - BIRTH_REGION_CFG.standardMeridian) * BIRTH_REGION_CFG.minutesPerDegree,
  );
  const regionOffsetText = (() => {
    const abs = Math.abs(regionOffsetMinutes);
    const h = Math.floor(abs / 60);
    const mi = abs % 60;
    const sign = regionOffsetMinutes < 0 ? '−' : regionOffsetMinutes > 0 ? '+' : '±';
    const parts = [h > 0 ? `${h} 时` : '', mi > 0 ? `${mi} 分` : ''].filter(Boolean).join(' ');
    return `${sign}${parts || '0 分'}`;
  })();

  // 角标统一不透明白底 + 实色描边彩字：无论压在描边天干块还是实心地支块上，视觉完全一致
  // 排盘总览只出「用/忌/中」三态：月令逐字资料库中的「待定（dai）」不在总览显示问号，
  // 一律回退引擎元素级用忌 marks（大方向判定）；待定的完整信息仅保留在 09 逐字喜忌表
  type PillarMark = 'useful' | 'taboo' | 'neutral';
  const renderMarkBadge = (mark: PillarMark) => {
    const base = "rounded-none px-1.5 py-0.5 text-[10px] font-black tracking-wide";
    if (mark === 'useful') return <Badge className={base} style={{ background: '#FFFFFF', color: '#2E7654', border: '1.5px solid #2E7654', boxShadow: 'none' }}>用</Badge>;
    if (mark === 'taboo') return <Badge className={base} style={{ background: '#FFFFFF', color: '#E31C29', border: '1.5px solid #E31C29', boxShadow: 'none' }}>忌</Badge>;
    return <Badge className={base} style={{ background: '#FFFFFF', color: '#64748B', border: '1.5px solid #94A3B8', boxShadow: 'none' }}>中</Badge>;
  };
  // 四柱徽章取值：优先月令逐字资料库（xi/ji 定论），dai 待定或缺字回退引擎用忌 marks
  const pillarStemMark = (c: string, fallback: 'useful' | 'taboo' | 'neutral'): PillarMark => {
    const z = zhuZiXiJi?.stems.find((r) => r.char === c)?.mark;
    if (z === 'xi') return 'useful';
    if (z === 'ji') return 'taboo';
    return (fallback as PillarMark) ?? 'neutral';
  };
  const pillarBranchMark = (c: string, fallback: 'useful' | 'taboo' | 'neutral'): PillarMark => {
    const z = zhuZiXiJi?.branches.find((r) => r.char === c)?.mark;
    if (z === 'xi') return 'useful';
    if (z === 'ji') return 'taboo';
    return (fallback as PillarMark) ?? 'neutral';
  };

  // ===== MVP 分数明细组件 =====
  // 展示：加分合计 / 扣分合计 / 其他修正 / 趋势加成 = 综合分
  // 用 useCallback 固定组件类型（该组件只依赖 props、不闭包任何页面状态）：
  // 否则每次父组件渲染都会生成新的函数引用，React 视作新组件类型，导致表格里最多近百个
  // 分数明细实例被整体卸载重挂（展开态/焦点丢失且白做一遍 DOM 工作）。
  const ScoreBreakdown = useCallback(({ row, dense = false, stacked = false }: { row: ScoreBreakdownRow; dense?: boolean; stacked?: boolean }) => {
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

    // stacked：十年流年/近年流年小卡使用——每项固定行高、缺值透明占位，
    // 保证十列的加分/扣分/其他/命盘/综合行严格水平对齐，不再因可选项缺行上下错位
    if (stacked) {
      const line = (label: string, val: number, color: string, visible: boolean) => (
        <div
          key={label}
          className="mt-1 flex h-[19px] items-center justify-between overflow-hidden whitespace-nowrap rounded-none border px-1.5 text-[10px] font-black tabular-nums"
          style={visible
            ? { borderColor: `${color}33`, background: `${color}10`, color }
            : { borderColor: 'transparent', background: 'transparent', color: 'transparent' }}
        >
          <span className="shrink-0 opacity-70">{label}</span>
          <span className="shrink-0">{val >= 0 ? '+' : ''}{val.toFixed(1)}</span>
        </div>
      );
      return (
        <div>
          {line('加分', plusC, '#2E7654', true)}
          {line('扣分', minusC, '#9A3412', true)}
          {line('其他', otherC, '#3A4450', Math.abs(otherC) >= 0.05)}
          {line('命盘', mingPanBase, '#31669B', Math.abs(mingPanBase) >= 0.05)}
          <div
            className="mt-1 flex h-[21px] items-center justify-between overflow-hidden whitespace-nowrap rounded-none border px-1.5 text-[10px] font-black tabular-nums"
            style={{
              borderColor: displayScore >= 0 ? 'rgba(46,118,84,0.45)' : 'rgba(227,28,41,0.45)',
              background: displayScore >= 0 ? 'rgba(46,118,84,0.08)' : 'rgba(227,28,41,0.07)',
              color: displayScore >= 0 ? '#2E7654' : '#E31C29',
            }}
          >
            <span className="shrink-0 opacity-70">综合</span>
            <span className="shrink-0">{displayScore >= 0 ? '+' : ''}{displayScore.toFixed(1)}</span>
          </div>
        </div>
      );
    }

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
        {pill('加分', plusC, '#2E7654')}
        {pill('扣分', minusC, '#9A3412')}
        {Math.abs(otherC) >= 0.05 && pill('其他', otherC, '#3A4450')}
        {Math.abs(mingPanBase) >= 0.05 && pill('命盘', mingPanBase, '#31669B')}
        {Math.abs(trendC) >= 0.05 && pill('趋势', trendC, '#B98C31')}
        <span className="mx-0.5 text-[11px] font-black text-muted-foreground">=</span>
        <span
          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-black tabular-nums ${dense ? 'text-[10px]' : 'text-[11px]'}`}
          style={{
            borderColor: displayScore >= 0 ? 'rgba(46,118,84,0.45)' : 'rgba(227,28,41,0.45)',
            background: displayScore >= 0 ? 'rgba(46,118,84,0.08)' : 'rgba(227,28,41,0.07)',
            color: displayScore >= 0 ? '#2E7654' : '#E31C29',
          }}
        >
          <span className="mr-0.5 opacity-70">综合</span>
          {displayScore >= 0 ? '+' : ''}{displayScore.toFixed(1)}
        </span>
      </div>
    );
  }, []);

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
      {/* ===== 顶部信息条：单行规线 + 等宽元信息 ===== */}
      <div className="w-full border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 md:px-6">
          <span className="label-mono">沛然堂 · 八字系统</span>
          <span className="label-mono">
            纯本地计算 · v{APP_VERSION}
          </span>
        </div>
      </div>

      {/* ===== 报头：瑞士式排印横幅（非对称双栏 + 规线） ===== */}
      <section className="w-full border-b border-border bg-card">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-6 md:py-14">
          <div className="grid gap-8 md:grid-cols-[1fr_280px] md:items-end">
            <div>
              <div className="mb-5 flex items-center gap-4">
                <span className="section-num">BAZI ANALYSIS</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <h1 className="text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
                沛然堂
              </h1>
              <p className="mt-4 text-lg font-bold tracking-wide text-foreground/80 md:text-xl">
                八字系统
              </p>
              <p className="label-mono mt-4">
                PEIRANTANG BAZI SYSTEM · RUNS FULLY LOCAL
              </p>
            </div>
            <div className="border-t-2 border-foreground pt-4">
              <div className="label-mono mb-2">特别鸣谢 / ACKNOWLEDGEMENT</div>
              <div className="text-2xl font-black tracking-tight">凤梨</div>
            </div>
          </div>
        </div>
      </section>

      {/* 主体：双栏骨架 — 左：编号导航（兼目录/工具） + 右：主内容（各版块内部再分「正文 + 侧注」两列） */}
      <div className="mx-auto w-full max-w-[1440px] px-3 py-6 md:px-4 md:py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[172px_minmax(0,1fr)] lg:gap-6">

          {/* ===== 左侧边栏：锚点导航 + 站点元信息 ===== */}
          <aside className="space-y-6 md:sticky md:top-6 md:self-start">
            {/* 导航菜单：编号 + 细线列表 */}
            <nav aria-label="页面导航">
              <div className="label-mono mb-3 border-b-2 border-foreground pb-2">
                导航 / INDEX
              </div>
              <ul>
                {REPORT_SECTIONS.map((item) => (
                  <li key={item.id} className="border-b border-border">
                    <a
                      href={`#section-${item.id}`}
                      className="group flex items-center gap-3 py-2 text-[13px] font-bold text-foreground/75 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="font-mono text-[11px] text-muted-foreground group-hover:text-primary">
                        {item.no}
                      </span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* 站点元信息：定义列表 */}
            <div>
              <div className="label-mono mb-3 border-b-2 border-foreground pb-2">
                信息 / INFO
              </div>
              <dl className="space-y-1.5 text-[11px]">
                <div className="flex justify-between border-b border-border pb-1.5">
                  <dt className="text-muted-foreground">站名</dt>
                  <dd className="font-bold">沛然堂</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <dt className="text-muted-foreground">站长</dt>
                  <dd className="font-bold">灰灰</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <dt className="text-muted-foreground">类型</dt>
                  <dd className="font-bold">命理分析</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">版本</dt>
                  <dd className="font-bold">v{APP_VERSION}</dd>
                </div>
              </dl>
            </div>

            {/* 快捷工具：原右侧栏工具并入左栏，减少右栏空置 */}
            {analyzedBoolean && (
              <div>
                <div className="label-mono mb-3 border-b-2 border-foreground pb-2">
                  工具 / TOOLS
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="block w-full border border-border px-3 py-2 text-left text-[12px] font-bold text-foreground/75 transition-colors hover:border-foreground hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  → 重新排盘
                </button>
              </div>
            )}

            {/* 特殊纪念 — 独立庄重入口（墨黑块 + 朱红规线） */}
            <Link to="/memorial" className="block">
              <div className="border-l-4 border-primary bg-foreground px-4 py-4 text-center transition-colors hover:bg-foreground/90">
                <div className="text-xs font-black tracking-[0.3em] text-background">
                  特殊纪念
                </div>
                <div className="mt-1 text-[10px] tracking-widest text-background/70">
                  伟人长存 · 永垂不朽
                </div>
              </div>
            </Link>
          </aside>

          {/* ===== 中间主内容区（min-w-0：允许 grid 列收缩，防止宽图表/表格撑开整页导致水平溢出） ===== */}
          <main className="min-w-0 space-y-4 md:space-y-5">
        {/* 输入表单区 */}
        <Card className="relative">
          {/* 区块标题栏：编号 + 规线 */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
            <div className="flex items-center gap-3">
              <span className="section-num">00</span>
              <span className="text-sm font-bold tracking-[0.18em] text-foreground">
                出生信息录入
              </span>
            </div>
            <span className="label-mono hidden md:inline">
              纯本地计算
            </span>
          </div>

          <CardHeader className="pt-7 pb-4 md:px-8">
            <div>
              <CardTitle className="text-2xl font-black leading-tight tracking-tight text-foreground md:text-[30px]">
                输入出生信息
              </CardTitle>
              <CardDescription className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
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
                            color: inputMode === md ? '#FFFFFF' : 'var(--muted-foreground)',
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
                              color: gender === 'male' ? '#FFFFFF' : 'var(--foreground)',
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
                            color: '#FFFFFF',
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
                  {/* 生日输入：瑞士网格表单 */}
                  <div className="space-y-4">
                    {/* 生日三栏：年 / 月 / 日 */}
                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                      {/* 年份 */}
                      <div className="border border-border bg-muted/40 p-3">
                        <div className="label-mono mb-2">
                          年份 / YEAR
                        </div>
                        <Input
                          type="number"
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          placeholder="1990"
                          className="num-tabular !h-11 !rounded-none !border-2 !border-foreground/20 !bg-white !text-center !text-lg font-bold focus-visible:!border-foreground"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        />
                      </div>
                      {/* 月份 */}
                      <div className="border border-border bg-muted/40 p-3">
                        <div className="label-mono mb-2">
                          月份 / MONTH
                        </div>
                        <Select value={month} onValueChange={setMonth}>
                          <SelectTrigger
                            className="!h-11 !justify-center !rounded-none !border-2 !border-foreground/20 !bg-white !text-base font-bold focus-visible:!border-foreground [&>svg]:opacity-60"
                            style={{ fontFamily: 'var(--font-mono)' }}
                          >
                            <SelectValue placeholder="月份" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)} className="!rounded-none !text-sm font-medium">
                                {i + 1} 月
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* 日期 */}
                      <div className="border border-border bg-muted/40 p-3">
                        <div className="label-mono mb-2">
                          日期 / DAY
                        </div>
                        <Select value={day} onValueChange={setDay}>
                          <SelectTrigger
                            className="!h-11 !justify-center !rounded-none !border-2 !border-foreground/20 !bg-white !text-base font-bold focus-visible:!border-foreground [&>svg]:opacity-60"
                            style={{ fontFamily: 'var(--font-mono)' }}
                          >
                            <SelectValue placeholder="日期" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)} className="!rounded-none !text-sm font-medium">
                                {i + 1} 日
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 时辰 + 性别 */}
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      {/* 出生时辰 */}
                      <div className="border border-border bg-muted/40 p-3">
                        <div className="label-mono mb-2">
                          时辰 / TIME
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={hour} onValueChange={setHour}>
                            <SelectTrigger
                              className="!h-10 !justify-center !rounded-none !border-2 !border-foreground/20 !bg-white !text-sm font-bold focus-visible:!border-foreground [&>svg]:opacity-60"
                              style={{ fontFamily: 'var(--font-mono)' }}
                            >
                              <SelectValue placeholder="时" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={String(i)} className="!rounded-none !text-sm font-medium">
                                  {i.toString().padStart(2, '0')} 时
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={minute} onValueChange={setMinute}>
                            <SelectTrigger
                              className="!h-10 !justify-center !rounded-none !border-2 !border-foreground/20 !bg-white !text-sm font-bold focus-visible:!border-foreground [&>svg]:opacity-60"
                              style={{ fontFamily: 'var(--font-mono)' }}
                            >
                              <SelectValue placeholder="分" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 60 }, (_, i) => (
                                <SelectItem key={i} value={String(i)} className="!rounded-none !text-sm font-medium">
                                  {i.toString().padStart(2, '0')} 分
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {/* 性别选择 */}
                      <div className="border border-border bg-muted/40 p-3">
                        <div className="label-mono mb-2">
                          性别 / SEX
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setGender('male')}
                            className="h-10 rounded-none text-sm font-bold tracking-[0.15em] transition-colors"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              background: gender === 'male' ? '#1F2937' : 'white',
                              color: gender === 'male' ? '#FFFFFF' : 'var(--foreground)',
                              border: '1px solid ' + (gender === 'male' ? '#1F2937' : 'var(--border)'),
                            }}
                          >
                            乾造 · 男
                          </button>
                          <button
                            type="button"
                            onClick={() => setGender('female')}
                            className="h-10 rounded-none text-sm font-bold tracking-[0.15em] transition-colors"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              background: gender === 'female' ? '#E31C29' : 'white',
                              color: gender === 'female' ? '#FFFFFF' : 'var(--foreground)',
                              border: '1px solid ' + (gender === 'female' ? '#E31C29' : 'var(--border)'),
                            }}
                          >
                            坤造 · 女
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 出生地时区板块：经度决定真太阳时校正 */}
                    <div className="border border-border bg-muted/40 p-3">
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <div className="label-mono">
                          出生地 / REGION
                        </div>
                        <div className="label-mono text-muted-foreground">
                          {selectedRegion.longitude}°E · 真太阳时 {regionOffsetText}
                        </div>
                      </div>
                      <Select value={birthRegion} onValueChange={setBirthRegion}>
                        <SelectTrigger
                          className="!h-11 !w-full !justify-between !rounded-none !border-2 !border-foreground/20 !bg-white !text-sm font-bold focus-visible:!border-foreground [&>svg]:opacity-60"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          <SelectValue>{selectedRegion.name}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {BIRTH_REGION_CFG.regions.map((r) => (
                            <SelectItem key={r.key} value={r.key} className="!rounded-none !text-sm font-medium">
                              {r.name} · {r.longitude}°E · {r.cities}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-2 text-[11px] leading-snug text-muted-foreground">
                        <span className="label-mono">{selectedRegion.span}</span>
                        <span className="mx-1">·</span>
                        {selectedRegion.note}
                      </div>
                      <div className="mt-1 text-[11px] leading-snug text-muted-foreground/80">
                        1986–1991 夏令时出生按钟表时间自动回拨 1 小时；真太阳时含经度差与均时差。
                      </div>
                    </div>

                    {/* 排盘大按钮 */}
                    <div className="pt-2">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="label-mono">
                          本地计算 · 不上传任何数据
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fillExample}
                            className="rounded-none font-bold tracking-wider"
                          >
                            载入示例
                          </Button>
                          {analyzed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleReset}
                              className="rounded-none font-bold tracking-wider"
                            >
                              重新排盘
                            </Button>
                          )}
                          <Button
                            size="lg"
                            onClick={handleAnalyze}
                            className="min-w-[180px] rounded-none font-bold tracking-[0.25em]"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              background: '#E31C29',
                              color: '#FFFFFF',
                              boxShadow: 'none',
                            }}
                          >
                            开始排盘 →
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  </Fragment>)}                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* 分析结果区：主内容列 */}
        {analyzedBoolean && (
          <div>
            {/* 主内容列 */}
            <div className="space-y-5 min-w-0">
              {/* 分析结果总标题：瑞士报头 */}
              <div className="relative border-t-4 border-foreground bg-card px-5 py-6 md:px-8">
                <div className="label-mono mb-2 text-primary">REPORT / 分析报告</div>
                <h2
                  className="text-[32px] font-black leading-none tracking-tight text-foreground md:text-[44px]"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  命局分析报告
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  基于沛然堂八字命理体系 · 完整结构化解读
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
                  <span className="num-tabular text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{chart.birthInfo.solarDate}</span>
                  <span className="h-3 w-px bg-border" />
                  <span className="text-sm font-bold text-primary">{chart.gender === 'male' ? '乾造' : '坤造'}</span>
                  {/* 视图开关：结论视图（依据类默认收起）/ 全量视图（依据类默认展开） */}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="label-mono text-[10px] text-muted-foreground">视图 / VIEW</span>
                    <div className="inline-flex border border-border" role="group" aria-label="报告视图切换">
                      {([['conclusion', '结论'], ['full', '全量']] as const).map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={reportView === v}
                          onClick={() => setReportView(v)}
                          className={`px-3 py-1 text-[11px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
                            reportView === v
                              ? 'bg-foreground text-background'
                              : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>


              {/* 一、四柱排盘总览 */}
              <Card
                id="section-pillars"
                className="relative scroll-mt-6"
              >
                {/* 区块标题栏：瑞士编辑式 */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">{SECTION_META.pillars.no} / {SECTION_META.pillars.en}</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">
                      {SECTION_META.pillars.title}
                    </span>
                  </div>
                  <span className="num-tabular text-xs font-medium text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                    {chart.birthInfo.solarDate} · {chart.gender === 'male' ? '乾造' : '坤造'} · 真太阳时
                    {chart.birthInfo.trueSolarDayOffset !== 0 ? ` ${chart.birthInfo.trueSolarDate}` : ''} {chart.birthInfo.trueSolarTime}
                    {chart.birthInfo.dstApplied ? ' · 夏令时已回拨 60 分' : ''}
                    {chart.birthInfo.birthPlace && chart.birthInfo.birthPlace !== BIRTH_REGION_CFG.defaultKey
                      ? ` · 出生地 ${chart.birthInfo.birthPlace}`
                      : ''}
                  </span>
                </div>

                <CardContent className="p-4 md:p-8">
                  <SplitBody
                    notes={
                      <>
                        <ul className="space-y-2 text-[11px] leading-relaxed text-foreground">
                          <li className="flex items-start gap-2">
                            <span className="mt-0.5 inline-block size-3 shrink-0" style={{ background: '#2E7654' }} />
                            用神 · 有助平衡
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-0.5 inline-block size-3 shrink-0" style={{ background: '#E31C29' }} />
                            忌神 · 破坏平衡
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-0.5 inline-block size-3 shrink-0 border-2 border-border bg-white" />
                            中性 · 无直接助损（逐字待定字按中性计，详见逐字喜忌表）
                          </li>
                        </ul>
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          日主（日柱天干）不纳入用忌显示，保持中性视觉；藏干徽章与四柱标记同源，均取月令逐字资料库定论。
                        </p>
                      </>
                    }
                  >
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
                            const stemMark: PillarMark = isRiZhu
                              ? 'neutral'
                              : pillarStemMark(pillar.stem, yongJi.stemMarks[`${['年', '月', '日', '时'][idx]}干`]);
                            const stemStyle: React.CSSProperties =
                              !isRiZhu && stemMark === 'useful'
                                ? { background: 'rgba(46,118,84,0.07)', color: '#2E7654', border: '2px solid #2E7654', borderRadius: 0 }
                                : !isRiZhu && stemMark === 'taboo'
                                  ? { background: 'rgba(227,28,41,0.06)', color: '#E31C29', border: '2px solid #E31C29', borderRadius: 0 }
                                  : { background: 'white', color: 'var(--foreground)', border: '2px solid var(--border)', borderRadius: 0 };
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
                                        color: '#FFFFFF',
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
                            const branchMark: PillarMark = pillarBranchMark(
                              pillar.branch,
                              yongJi.branchMarks[`${['年', '月', '日', '时'][idx]}支`],
                            );
                            const branchStyle: React.CSSProperties =
                              branchMark === 'useful'
                                ? { background: '#2E7654', color: '#FFFFFF', border: '2px solid #2E7654', borderRadius: 0 }
                                : branchMark === 'taboo'
                                  ? { background: '#E31C29', color: '#FFFFFF', border: '2px solid #E31C29', borderRadius: 0 }
                                  : { background: 'white', color: 'var(--foreground)', border: '2px solid var(--border)', borderRadius: 0 };
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
                              // 与天干/地支同源：逐字定论（xi/ji）优先，待定/缺字回退引擎干支级 marks（待定按中性，与打分一致）
                              const hsMark: PillarMark = pillarStemMark(s, yongJi?.allStemMarks?.[s] ?? 'neutral');
                              const isUseful = hsMark === 'useful';
                              const isTaboo = hsMark === 'taboo';
                              const zzNote = zhuZiXiJi?.stems.find((r) => r.char === s)?.note ?? '';
                              const tagText = isUseful ? '喜用（吉）' : isTaboo ? '忌神（凶）' : '中性';
                              return (
                                <span
                                  key={i}
                                  title={`${s}：月令逐字${tagText}${zzNote ? `——${zzNote}` : ''}`}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold"
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    background: isUseful ? 'rgba(46,118,84,0.08)' : isTaboo ? 'rgba(227,28,41,0.06)' : '#F1F5F9',
                                    color: isUseful ? '#2E7654' : isTaboo ? '#E31C29' : '#64748B',
                                    border: `1px solid ${isUseful ? '#2E7654' : isTaboo ? '#E31C29' : '#E2E8F0'}`,
                                    borderRadius: 0,
                                  }}
                                >
                                  {s}
                                  {isUseful && (
                                    <span
                                      className="ml-0.5 inline-flex size-3 items-center justify-center text-[7.5px] font-bold leading-none"
                                      style={{ background: '#2E7654', color: '#FFFFFF', borderRadius: 0 }}
                                    >
                                      吉
                                    </span>
                                  )}
                                  {isTaboo && (
                                    <span
                                      className="ml-0.5 inline-flex size-3 items-center justify-center text-[7.5px] font-bold leading-none"
                                      style={{ background: '#E31C29', color: '#FFFFFF', borderRadius: 0 }}
                                    >
                                      凶
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
                  </SplitBody>
                </CardContent>
              </Card>


              {/* 四、命主速览 */}
              <Card
                id="section-overview"
                className="relative crosshair scroll-mt-6 overflow-hidden rounded-sm border-border bg-card"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">{SECTION_META.overview.no} / {SECTION_META.overview.en}</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">{SECTION_META.overview.title}</span>
                  </div>
                  <span className="label-mono hidden text-muted-foreground md:inline">用神 · 格局综合 · 学历 · 财富 · 事业</span>
                </div>
                <CardContent className="p-4 md:p-8">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                    {/* 1. 用神 */}
                    <div
                      className="rounded-none p-4"
                      style={{
                        backgroundColor: 'rgba(46,118,84,0.07)',
                        border: '2px solid #2E7654',
                      }}
                    >
                      <div className="label-mono" style={{ color: '#2E7654' }}>用神 FAVORABLE</div>
                      <div className="mt-2 text-2xl font-black" style={{ fontFamily: 'var(--font-sans)', color: '#1E5239' }}>
                        {yongJi.usefulElements.length > 0
                          ? yongJi.usefulElements.map((el) => ELEMENT_NAMES[el]).join(' · ')
                          : '—'}
                      </div>
                      <div className="mt-1 text-[10px] font-bold" style={{ color: '#2E7654' }}>
                        {yongJi.usefulElements.length > 0 ? '月气大方向 · 助平衡为吉' : '待细查'}
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
                        letterLv === 'S+' || letterLv === 'S' ? '#B0141F' :
                        letterLv === 'A+' || letterLv === 'A' ? '#1E5239' :
                        letterLv === 'B+' ? '#234C75' :
                        letterLv === 'B-' ? '#4A5461' :
                        letterLv === 'C' || letterLv === 'C-' ? '#C2410C' : '#9A3412';
                      const letterColorMap: Record<string, string> = {
                        'S+': '#E31C29','S':'#B98C31','A+':'#2E7654','A':'#4A834E',
                        'B+':'#31669B','B-':'#788491','C':'#C2410C','C-':'#9A3412','D':'#9CA3AF',
                      };
                      const letterCol = letterColorMap[letterLv] ?? '#2E7654';
                      const fmt = (n: number) => (n >= 0 ? '+' : '') + Math.round(n * 10) / 10;
                      return (
                        <div
                          className="col-span-2 p-4 md:col-span-1"
                          style={{
                            background: 'white',
                            border: `2px solid ${letterCol}`,
                            borderRadius: 0,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="label-mono" style={{ color: letterCol }}>
                              格局综合分 SCORE
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="px-2.5 py-0.5 text-[11px] font-black text-white"
                                style={{
                                  background: letterCol,
                                  borderRadius: 0,
                                  letterSpacing: '0.06em',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {letterLv}
                              </span>
                              <span
                                className="px-2 py-0.5 text-[10px] font-black"
                                style={{
                                  color: letterCol,
                                  border: `1px solid ${letterCol}`,
                                  borderRadius: 0,
                                }}
                              >
                                {lvTag}
                              </span>
                            </div>
                          </div>
                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="num-tabular text-[34px] font-black leading-none" style={{ color: letterCol, fontFamily: 'var(--font-mono)' }}>
                              {overall}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground">/ 100</span>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden" style={{ backgroundColor: '#F1F5F9', borderRadius: 0 }}>
                            <div className="h-full transition-all"
                              style={{ width: `${Math.max(0, Math.min(100, overall))}%`, background: letterCol }}
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

                    {/* 3. 学历倾向（三档 + 区间谱条，回测校准：仅两端有信号） */}
                    {educationVerdict && (() => {
                      const t = educationVerdict.tendency;
                      const col = t === 'elite' ? '#2E7654' : t === 'weak' ? '#E31C29' : '#788491';
                      const bg = t === 'elite' ? 'rgba(46,118,84,.07)' : t === 'weak' ? 'rgba(227,28,41,.06)' : 'rgba(120,132,145,.08)';
                      // 大概率区间（0=初中及以下 … 5=博士）：精英→本科~博士，中平→高中~本科，偏弱→初中~大专
                      const band: [number, number] = t === 'elite' ? [3, 5] : t === 'weak' ? [0, 2] : [1, 3];
                      const SEGS = ['初中', '高中', '大专', '本科', '硕士', '博士'];
                      return (
                        <div className="col-span-2 p-4 md:col-span-1" style={{ background: bg, border: `1px solid ${col}55`, borderRadius: 0 }}>
                          <div className="label-mono" style={{ color: col }}>学历倾向 EDUCATION</div>
                          <div className="mt-2 text-xl font-black" style={{ color: col }}>{educationVerdict.tendencyLabel}</div>
                          <div className="mt-2">
                            <div className="flex gap-[2px]">
                              {SEGS.map((s, i) => (
                                <div
                                  key={s}
                                  className="h-1.5 flex-1"
                                  style={{ background: i >= band[0] && i <= band[1] ? col : 'rgba(120,132,145,.2)' }}
                                />
                              ))}
                            </div>
                            <div className="mt-0.5 flex gap-[2px]">
                              {SEGS.map((s, i) => (
                                <div key={s} className="flex-1 text-center text-[8.5px] font-bold" style={{ color: i >= band[0] && i <= band[1] ? col : 'var(--muted-foreground)' }}>{s}</div>
                              ))}
                            </div>
                          </div>
                          <div className="mt-1 text-[10px] font-bold" style={{ color: col }}>大概率落在 {SEGS[band[0]]} ~ {SEGS[band[1]]} 区间</div>
                        </div>
                      );
                    })()}

                    {/* 4. 财富区间（区间谱条，不打分） */}
                    {wealthNobility && (() => {
                      const col = '#B98C31';
                      const SEGS = ['贫', '温饱', '小康', '小富', '大富'];
                      const wl = wealthNobility.wealthLevel;
                      const band: [number, number] = wl === '富' ? [3, 4] : wl === '小康' ? [2, 2] : wl === '小康偏下' ? [1, 2] : wl === '偏贫' ? [0, 1] : [0, 0];
                      const label = wl === '富' ? '富裕倾向' : wl === '小康' ? '小康倾向' : wl === '小康偏下' ? '温饱至小康' : '温饱偏紧';
                      return (
                        <div className="p-4" style={{ background: 'rgba(185,140,49,.06)', border: '1px solid rgba(185,140,49,.4)', borderRadius: 0 }}>
                          <div className="label-mono" style={{ color: col }}>财富 WEALTH</div>
                          <div className="mt-2 text-xl font-black" style={{ color: col }}>{label}</div>
                          <div className="mt-2">
                            <div className="flex gap-[2px]">
                              {SEGS.map((s, i) => (
                                <div key={s} className="h-1.5 flex-1" style={{ background: i >= band[0] && i <= band[1] ? col : 'rgba(120,132,145,.2)' }} />
                              ))}
                            </div>
                            <div className="mt-0.5 flex gap-[2px]">
                              {SEGS.map((s, i) => (
                                <div key={s} className="flex-1 text-center text-[8.5px] font-bold" style={{ color: i >= band[0] && i <= band[1] ? col : 'var(--muted-foreground)' }}>{s}</div>
                              ))}
                            </div>
                          </div>
                          <div className="mt-1 text-[10px] font-bold" style={{ color: col }}>大概率落在 {SEGS[band[0]]}{band[0] !== band[1] ? ` ~ ${SEGS[band[1]]}` : ''} 区间</div>
                        </div>
                      );
                    })()}

                    {/* 5. 事业地位区间（区间谱条，不打分；不判寿夭） */}
                    {wealthNobility && (() => {
                      const col = '#31669B';
                      const SEGS = ['偏弱', '平常', '显贵'];
                      const nl = wealthNobility.nobilityLevel;
                      const band: [number, number] = nl === '贵' ? [2, 2] : nl === '平常' ? [1, 1] : [0, 0];
                      const label = nl === '贵' ? '贵气倾向' : nl === '平常' ? '平常' : '偏弱';
                      return (
                        <div className="p-4" style={{ background: 'rgba(49,102,155,.06)', border: '1px solid rgba(49,102,155,.4)', borderRadius: 0 }}>
                          <div className="label-mono" style={{ color: col }}>事业 CAREER</div>
                          <div className="mt-2 text-xl font-black" style={{ color: col }}>{label}</div>
                          <div className="mt-2">
                            <div className="flex gap-[2px]">
                              {SEGS.map((s, i) => (
                                <div key={s} className="h-1.5 flex-1" style={{ background: i >= band[0] && i <= band[1] ? col : 'rgba(120,132,145,.2)' }} />
                              ))}
                            </div>
                            <div className="mt-0.5 flex gap-[2px]">
                              {SEGS.map((s, i) => (
                                <div key={s} className="flex-1 text-center text-[8.5px] font-bold" style={{ color: i >= band[0] && i <= band[1] ? col : 'var(--muted-foreground)' }}>{s}</div>
                              ))}
                            </div>
                          </div>
                          <div className="mt-1 text-[10px] font-bold" style={{ color: col }}>大概率落在 {SEGS[band[0]]}{band[0] !== band[1] ? ` ~ ${SEGS[band[1]]}` : ''} 区间</div>
                        </div>
                      );
                    })()}
                  </div>
                  <Detail
                    label="02·A 命局函数曲线 f(五行)·阴阳二气与理想虚影 · 旁证可视化（不参与评分）"
                    open={fullView}
                  >
                    <MingJuFieldChart chart={chart} yongJi={yongJi} />
                  </Detail>

                  {/* 02·B 四柱限段（「限」· 判定内核增量） */}
                  {xianDuan && (
                    <Detail
                      label={`02·B 四柱限段 · 人生阶段（判定内核增量 v${xianDuan.version}）`}
                      open={fullView}
                    >
                      <div className="space-y-3">
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          为根本、月令为权、日为动应、时为结果——天地五行流动不居，早年寄居在年、青年寄居在月、中年在日、晚年归宿寄居于时。
                          某限之柱干支为月令所喜则该阶段气机顺遂，为月令所忌则该阶段多阻力波折。
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {xianDuan.entries.map((e) => {
                            const col = e.tendency === '顺' ? '#2E7654' : e.tendency === '逆' ? '#E31C29' : '#788491';
                            const bg = e.tendency === '顺' ? 'rgba(46,118,84,.07)' : e.tendency === '逆' ? 'rgba(227,28,41,.06)' : 'rgba(120,132,145,.08)';
                            return (
                              <div
                                key={e.position}
                                className="rounded-none p-3"
                                style={{
                                  backgroundColor: bg,
                                  border: `1px solid ${col}${e.isCurrent ? 'CC' : '40'}`,
                                  borderWidth: e.isCurrent ? 2 : 1,
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="label-mono text-[9.5px]" style={{ color: col }}>
                                    {e.position} · {e.ageRange}
                                  </span>
                                  <span
                                    className="px-1.5 py-0.5 text-[10px] font-black"
                                    style={{ color: col, border: `1px solid ${col}`, borderRadius: 0, fontFamily: 'var(--font-mono)' }}
                                  >
                                    {e.tendency}{e.tendency === '平' ? '' : `·${e.tendencyLabel}`}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-baseline gap-1.5">
                                  <span className="text-2xl font-black" style={{ color: col }}>{e.ganzhi}</span>
                                  <span className="label-mono text-[9.5px] text-muted-foreground">
                                    干{e.stemMark === 'useful' ? '用' : e.stemMark === 'taboo' ? '忌' : '中'} · 支{e.branchMark === 'useful' ? '用' : e.branchMark === 'taboo' ? '忌' : '中'}
                                  </span>
                                  {e.isCurrent && (
                                    <span className="ml-auto px-1 py-0.5 text-[9px] font-black text-white" style={{ background: col, borderRadius: 0 }}>
                                      当前
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1.5 text-[10.5px] font-bold text-foreground">{e.theme}</div>
                                <div className="mt-0.5 label-mono text-[9px] leading-snug text-muted-foreground">关切：{e.keyPoint}</div>
                                <p className="mt-1.5 border-t border-border pt-1.5 text-[10px] leading-relaxed text-muted-foreground">{e.reason}</p>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[11px] font-bold leading-relaxed text-foreground">{xianDuan.verdict}</p>
                      </div>
                    </Detail>
                  )}
                </CardContent>
              </Card>


              {/* 八、月气分析 */}
              <Card id="section-monthqi" className="relative crosshair scroll-mt-6 overflow-hidden rounded-sm border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">{SECTION_META.monthqi.no} / {SECTION_META.monthqi.en}</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">{SECTION_META.monthqi.title}</span>
                  </div>
                  <span className="label-mono hidden text-muted-foreground md:inline">月令为权 · 吉凶准绳</span>
                </div>
                <CardContent className="p-4 md:p-8">
                  <Detail label="月气详析 · 阴阳二气 · 月令口诀（点击展开）" open={fullView}>
                  <SplitBody
                    notesOpen={false}
                    notes={(
                      <>
                  {/* 春秋月关键因子（寅卯申酉分段 + 辰戌杂气月）——古法辑要 04 */}
                  {chunQiuFactor && (
                    <div className="rounded-none border border-border bg-muted/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="label-mono text-primary">春秋月关键因子</span>
                          <span className="text-sm font-black text-foreground">{chunQiuFactor.taijiName}</span>
                        </div>
                        <span className="label-mono text-muted-foreground">
                          阳仪 {chunQiuFactor.yangYi} / 阴仪 {chunQiuFactor.yinYi}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-bold leading-relaxed text-foreground/80">{chunQiuFactor.general}</p>
                      {chunQiuFactor.segment && (
                        <div className="mt-3 border-t border-border pt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 text-sm font-black text-white" style={{ background: 'var(--foreground)', borderRadius: 0, fontFamily: 'var(--font-mono)' }}>
                              {chunQiuFactor.segment.name}
                            </span>
                            <span className="label-mono text-muted-foreground">{chunQiuFactor.segment.solarTermRange}</span>
                            <span className="text-xs font-bold text-muted-foreground">· {chunQiuFactor.segment.climate}</span>
                          </div>
                          <p className="mt-1.5 text-xs font-bold leading-relaxed text-foreground/80">{chunQiuFactor.segment.usage}</p>
                        </div>
                      )}
                      {chunQiuFactor.round && (
                        <div className="mt-3 border-t border-border pt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="label-mono" style={{ color: chunQiuFactor.round.name === '余热局' ? 'hsl(28 82% 48%)' : 'hsl(215 55% 38%)' }}>
                              两局判定
                            </span>
                            <span className="px-2 py-0.5 text-sm font-black text-white" style={{ background: chunQiuFactor.round.name === '余热局' ? 'hsl(28 82% 48%)' : 'hsl(215 55% 38%)', borderRadius: 0, fontFamily: 'var(--font-mono)' }}>
                              {chunQiuFactor.round.name}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs font-bold leading-relaxed text-foreground/80">{chunQiuFactor.round.judge}</p>
                          <p className="mt-1 text-xs font-bold leading-relaxed text-muted-foreground">取用：{chunQiuFactor.round.usage}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 干支自合柱标记 */}
                  {ganZhiZiHe.length > 0 && (
                    <div className="rounded-none border border-border p-4">
                      <div className="flex items-center gap-2">
                        <span className="label-mono text-primary">干支自合</span>
                        <span className="label-mono text-muted-foreground">柱内天干与地支藏干五合 · 共九柱</span>
                      </div>
                      <div className="mt-2 space-y-2">
                        {ganZhiZiHe.map((h) => (
                          <div key={h.position} className="flex flex-wrap items-baseline gap-2">
                            <span className="px-2 py-0.5 text-sm font-black text-white" style={{ background: '#2E7654', borderRadius: 0, fontFamily: 'var(--font-mono)' }}>
                              {h.position} {h.ganzhi}
                            </span>
                            <span className="label-mono text-muted-foreground">{h.he}</span>
                            <p className="w-full text-xs font-bold leading-relaxed text-foreground/80">
                              {h.description}
                              {h.openCondition ? ` 开库条件：${h.openCondition}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 月令分日用事 · 司令真神（古法旁证 · 不计分） */}
                  {guFaPangZheng && (
                    <div className="rounded-none border border-border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="label-mono text-primary">月令分日用事 · 司令真神</span>
                        <span className="label-mono text-muted-foreground">古法旁证 · 不参与评分</span>
                      </div>
                      <div className="mt-2 text-sm font-bold">
                        <span className="text-muted-foreground">{guFaPangZheng.siLing.monthName}（{guFaPangZheng.siLing.termName}）</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm font-bold">
                        <span className="text-muted-foreground">当令</span>
                        <span className="border border-border bg-card px-2 py-0.5 font-mono font-black text-foreground">{guFaPangZheng.siLing.ruler ?? '—'}</span>
                        {guFaPangZheng.siLing.rulerRange && (
                          <span className="text-xs text-muted-foreground">{guFaPangZheng.siLing.rulerRange}</span>
                        )}
                        {guFaPangZheng.siLing.daysIntoMonth !== null && (
                          <span className="text-xs text-muted-foreground">（生于交节后第 {guFaPangZheng.siLing.daysIntoMonth + 1} 天）</span>
                        )}
                      </div>
                      <div className="mt-1.5 text-sm font-bold">
                        <span className="text-muted-foreground">本气司令（全月天数最多）</span>
                        <span className="ml-1 font-mono font-black text-foreground">{guFaPangZheng.siLing.zhenShen}</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed font-bold text-muted-foreground">{guFaPangZheng.siLing.note}</p>
                    </div>
                  )}
                      </>
                    )}
                  >
                  <MonthRiZhuChangShengCard
                    chart={chart}
                    solarTermTheme={solarTermTheme}
                  />

                  <div className="flex items-center gap-4">
                    <div
                      className="flex size-16 shrink-0 items-center justify-center rounded-none text-2xl font-black"
                      style={{
                        backgroundColor: `${TERMINAL_PALETTE.primary}14`,
                        color: 'var(--foreground)',
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {monthQi.monthName.slice(0, 1)}
                    </div>
                    <div>
                      <div
                        className="text-lg font-black"
                        style={{ fontFamily: "var(--font-sans)", letterSpacing: '0.03em' }}
                      >
                        {monthQi.monthName} · {monthQi.solarTerm}
                      </div>
                      <div className="text-sm text-muted-foreground">本气：{monthQi.mainQi}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-none border border-border/60 p-3">
                      <div className="text-xs text-muted-foreground">阳气状态</div>
                      <div className={`mt-1 text-base font-semibold ${monthQi.yangState === 'strong' ? 'text-orange-500' : 'text-muted-foreground'}`}>
                        {monthQi.yangState === 'strong' ? '旺（被肯定）' : '弱（被否定）'}
                      </div>
                    </div>
                    <div className="rounded-none border border-border/60 p-3">
                      <div className="text-xs text-muted-foreground">阴气状态</div>
                      <div className={`mt-1 text-base font-semibold ${monthQi.yinState === 'strong' ? 'text-blue-500' : 'text-muted-foreground'}`}>
                        {monthQi.yinState === 'strong' ? '旺（被肯定）' : '弱（被否定）'}
                      </div>
                    </div>
                  </div>
                  <div
                    className="rounded-none p-4"
                    style={{ backgroundColor: `${TERMINAL_PALETTE.primary}0D` }}
                  >
                    <div
                      className="text-sm font-black"
                      style={{ color: 'var(--foreground)', fontFamily: "var(--font-sans)" }}
                    >
                      用{monthQi.usageDirection === 'yin' ? <span className="mark-highlight">阴</span> : <span className="mark-highlight">阳</span>}方向
                    </div>
                    <div className="mt-1 text-sm font-bold text-foreground">{monthQi.description}</div>
                  </div>
                  <p className="text-sm leading-relaxed font-bold text-muted-foreground">{monthQi.detailedDesc}</p>

{/* 十二长生环序（判定内核增量 · 绝为起点，气机强弱唯一标尺） */}
                  {changShengRing && (
                    <div className="mt-4 border border-border">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-4 py-2">
                        <span className="label-mono text-[10px] font-black text-primary">03·B / CHANG SHENG</span>
                        <span className="h-3 w-px bg-border" />
                        <span className="text-[11px] font-bold tracking-[0.12em] text-foreground">十二长生环序 · 气机强弱</span>
                        <span className="label-mono ml-auto text-[9.5px] text-muted-foreground">判定内核增量 v{changShengRing.version}</span>
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                          <span className="label-mono text-[9.5px] text-muted-foreground">环序（绝为起点）</span>
                          {changShengRing.order.map((s, i) => (
                            <span key={s} className="text-[10px] font-bold text-foreground">
                              {s}{i < changShengRing.order.length - 1 ? ' →' : ''}
                            </span>
                          ))}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)] sm:items-start">
                          <div className="mx-auto w-full max-w-[300px]">
                            <ChangShengRingChart ring={changShengRing} />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {changShengRing.entries.map((e) => {
                              const col = e.power >= 18 ? '#2E7654' : e.power <= -12 ? '#E31C29' : '#788491';
                              return (
                                <div
                                  key={e.stem}
                                  className="flex items-center gap-2 border px-2 py-1"
                                  style={{ borderColor: e.inChart ? col : 'hsl(222 10% 88%)', background: e.inChart ? `${col}0F` : 'transparent' }}
                                >
                                  <span className="font-mono text-base font-black" style={{ color: col }}>{e.stem}</span>
                                  <span className="text-[10px] font-bold text-foreground">{e.stage}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          {changShengRing.verdict}（原局所透之干以边框高亮）
                        </p>
                      </div>
                    </div>
                  )}
                  </SplitBody>
                  </Detail>
                </CardContent>
              </Card>


              {/* 原「命局模式分析」已替换为「趋避与时机」（见下方 06 GUIDANCE） */}


              {/* 九、用神忌神判断 */}
              <Card
                id="section-yongji"
                className="relative crosshair scroll-mt-6 rounded-sm border-border bg-card"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">{SECTION_META.yongji.no} / {SECTION_META.yongji.en}</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">{SECTION_META.yongji.title}</span>
                  </div>
                  <span className="label-mono hidden text-muted-foreground md:inline">平衡为则</span>
                </div>
                <CardContent className="p-4 md:p-8">
                  <SplitBody
                    notes={(
                      <>
                  {/* 太极二气配比（方案 B）：量化二气存量与配比 → 用忌大方向建议（旁证，是否参与判定由 YONG_JI_MODE 开关控制） */}
                  {taiJiQi && (() => {
                    const tq = taiJiQi;
                    const tot = tq.yangQi + tq.yinQi || 1;
                    const yangPct = Math.round((tq.yangQi / tot) * 100);
                    const yinPct = 100 - yangPct;
                    const YANG = 'hsl(28 82% 48%)';
                    const YIN = 'hsl(215 55% 38%)';
                    const bandColor = tq.band === '阳过' ? YANG : tq.band === '阴过' ? YIN : '#788491';
                    const dirLabel = tq.recommendedDirection === 'yin' ? '用阴 · 金水' : tq.recommendedDirection === 'yang' ? '用阳 · 木火' : '二气均衡';
                    const dirColor = tq.recommendedDirection === 'yin' ? YIN : tq.recommendedDirection === 'yang' ? YANG : '#788491';
                    const active = yongJi.directionSource === 'taiji';
                    return (
                      <div className="rounded-sm border border-border bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black tracking-[0.15em] text-foreground">太极二气配比</span>
                            <span className="text-xs font-bold tracking-[0.12em] text-muted-foreground">{tq.modeLabel}</span>
                          </div>
                          <span
                            className="inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-black"
                            style={{ borderColor: active ? 'rgba(46,118,84,.45)' : 'var(--border)', color: active ? '#2E7654' : 'var(--muted-foreground)' }}
                          >
                            v{tq.version} · {active ? '已参与用忌判定' : '旁证 · 现行 binary 口径'}
                          </span>
                        </div>

                        <div className="mt-3 flex h-3 w-full overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                          <div className="h-full" style={{ width: `${yangPct}%`, background: YANG }} />
                          <div className="h-full" style={{ width: `${yinPct}%`, background: YIN }} />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] font-black">
                          <span style={{ color: YANG }}>阳 {yangPct}% · {tq.yangQi.toFixed(2)}</span>
                          <span style={{ color: YIN }}>阴 {yinPct}% · {tq.yinQi.toFixed(2)}</span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-black text-white" style={{ background: bandColor, borderRadius: 0 }}>
                            {tq.band}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-black text-white" style={{ background: dirColor, borderRadius: 0 }}>
                            大方向 · {dirLabel}
                          </span>
                          <span className="text-[10px] font-bold tracking-wide text-muted-foreground">阈值 θ={tq.threshold} · 配比 {(tq.ratio * 100).toFixed(1)}%</span>
                        </div>

                        <p className="mt-2.5 text-sm leading-relaxed text-foreground/80">{tq.hardCondition}</p>
                      </div>
                    );
                  })()}

                  {/* 五行块示月令大方向；逐字取舍统一以「逐字喜忌表」为准，不再重复说明 */}
                                    {yongJi.overrideNotes.length > 0 && (
                    <div className="rounded-sm border border-border bg-muted/40 p-3.5">
                      <div className="flex items-center gap-2 text-[11px] font-black tracking-wider text-foreground">
                        <span>⚑ 干支级取用例外</span>
                        <span className="label-mono text-muted-foreground">OVERRIDE</span>
                      </div>
                      {yongJi.overrideNotes.map((note, i) => (
                        <p key={i} className="mt-1.5 text-xs font-bold leading-relaxed text-foreground/80">{note}</p>
                      ))}
                    </div>
                  )}

                  {/* 土专区：中宫承载制衡之气（数据书优先级 2，独立判定是否取用土） */}
                  {earthXiJi && (
                    <div className="rounded-sm border p-4" style={{ borderColor: 'rgba(251,191,36,.35)', background: 'rgba(251,191,36,.07)' }}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-bold" style={{ color: '#FCD34D' }}>土（中宫 · 承载制衡）</div>
                        <span
                          className="label-mono inline-flex items-center rounded-sm px-2.5 py-0.5 text-[10px] font-black"
                          style={{
                            background: earthXiJi.decision === 'useful' ? '#B98C31' : earthXiJi.decision === 'taboo' ? '#9A3412' : '#94A3B8',
                            color: '#FFFFFF',
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
                              <span className="label-mono text-[9px] font-black" style={{ color: d.mark === 'useful' ? '#B98C31' : d.mark === 'taboo' ? '#9A3412' : '#94A3B8' }}>
                                {d.mark === 'useful' ? '宜用' : d.mark === 'taboo' ? '忌' : '调和'}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-sm leading-relaxed text-muted-foreground">{yongJi.description}</p>
                      </>
                    )}
                  >
                  <div className="flex gap-4 flex-col md:flex-row">
                    <div className="flex-1 p-4" style={{ border: '2px solid #2E7654', background: 'rgba(46,118,84,0.05)', borderRadius: 0 }}>
                      <div className="label-mono" style={{ color: '#2E7654' }}>用神 FAVORABLE · 喜用</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {yongJi.usefulElements.map((el) => (
                          <span key={el} className="px-3 py-1 text-sm font-black text-white" style={{ background: '#2E7654', borderRadius: 0, fontFamily: 'var(--font-mono)' }}>
                            {ELEMENT_NAMES[el]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 text-[10px] font-bold" style={{ color: '#2E7654' }}>有利于阴阳平衡，助之则吉</div>
                    </div>
                    <div className="flex-1 p-4" style={{ border: '2px solid #E31C29', background: 'rgba(227,28,41,0.04)', borderRadius: 0 }}>
                      <div className="label-mono" style={{ color: '#E31C29' }}>忌神 TABOO · 所忌</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {yongJi.tabooElements.map((el) => (
                          <span key={el} className="px-3 py-1 text-sm font-black text-white" style={{ background: '#E31C29', borderRadius: 0, fontFamily: 'var(--font-mono)' }}>
                            {ELEMENT_NAMES[el]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 text-[10px] font-bold" style={{ color: '#B0141F' }}>破坏阴阳平衡，助之则凶</div>
                    </div>
                  </div>

{/* 逐字喜忌参考：十天干 + 十二地支，调取《十二月份取用》资料库 */}
                  {zhuZiXiJi && (() => {
                    const renderZi = (e: ZhuZiEntry) => {
                      const inChart = chartChars.has(e.char);
                      const tone = e.mark === 'xi'
                        ? { bg: 'rgba(46,118,84,.07)', border: '#2E7654', text: '#2E7654', tag: '喜' }
                        : e.mark === 'ji'
                          ? { bg: 'rgba(227,28,41,.06)', border: '#E31C29', text: '#E31C29', tag: '忌' }
                          : { bg: '#F1F5F9', border: '#CBD5E1', text: '#64748B', tag: '条件' };
                      return (
                        <div
                          key={e.char}
                          title={`${e.char}（${ELEMENT_NAMES[e.element] ?? e.element}）：${e.note}`}
                          className={`relative flex flex-col items-center px-1 py-2 transition-colors hover:bg-accent ${inChart ? '' : 'opacity-90'}`}
                          style={{ background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 0 }}
                        >
                          {inChart && <span className="absolute right-0 top-0 size-1.5" style={{ background: 'var(--foreground)' }} />}
                          <span className="text-[19px] font-black leading-none" style={{ color: tone.text }}>{e.char}</span>
                          <span className="label-mono mt-1 text-[9px] text-muted-foreground">{ELEMENT_NAMES[e.element] ?? e.element}</span>
                          <span className="mt-1 px-1 text-[9px] font-bold leading-[1.4]" style={{ background: tone.text, color: '#FFFFFF' }}>{tone.tag}</span>
                        </div>
                      );
                    };
                    // 须视柱中态势定用忌的条件字（资料未给无条件定论）：逐条列明取舍依据，不以下落不明的问号呈现
                    const daiEntries = [...zhuZiXiJi.stems, ...zhuZiXiJi.branches].filter((e) => e.mark === 'dai');
                    return (
                      <div className="border-t border-border pt-5">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="label-mono text-primary">REF / 逐字喜忌</span>
                          <span className="h-3 w-px bg-border" />
                          <span className="text-sm font-bold tracking-[0.12em] text-foreground">{zhuZiXiJi.monthBranch}月干支逐字喜忌参考</span>
                        </div>
                        {/* 月令大方向：资料无逐字定论的字按此补全；条件字标「条件」并在下方明细逐条说明 */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border border-border bg-muted/40 px-3 py-2 text-[11.5px] leading-relaxed text-foreground">
                          <span className="label-mono text-[10px] text-primary">RULE / 取用大方向</span>
                          <span className="font-bold">{zhuZiXiJi.directionLabel === '用阳 · 木火' ? '月令用阳：木火为喜、金水为忌' : '月令用阴：金水为喜、木火为忌'}</span>
                          <span className="text-muted-foreground">资料无逐字定论者按此补全（注「按大方向补」）；须辨两局或条件救应者标「条件」，依据见下方「条件字明细」。</span>
                        </div>
                        {zhuZiXiJi.roundName && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 border px-3 py-2" style={{ borderColor: 'rgba(185,140,49,.45)', background: 'rgba(185,140,49,.08)' }}>
                            <span className="label-mono text-[10px]" style={{ color: '#8A6A1F' }}>本盘定局</span>
                            <span className="px-2 py-0.5 text-[12px] font-black text-white" style={{ background: '#B98C31', borderRadius: 0 }}>{zhuZiXiJi.roundName}</span>
                            <span className="text-[11.5px] leading-relaxed text-muted-foreground">申月两局取用相反，本盘已按年月火土/金气态势判局，下表逐字据此落定。</span>
                          </div>
                        )}
                        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{zhuZiXiJi.patternNote}</p>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="label-mono mb-1.5 text-[10px] text-muted-foreground">十天干 STEMS</div>
                            <div className="grid grid-cols-5 gap-1.5">{zhuZiXiJi.stems.map(renderZi)}</div>
                          </div>
                          <div>
                            <div className="label-mono mb-1.5 text-[10px] text-muted-foreground">十二地支 BRANCHES</div>
                            <div className="grid grid-cols-6 gap-1.5">{zhuZiXiJi.branches.map(renderZi)}</div>
                          </div>
                        </div>
                        {daiEntries.length > 0 && (
                          <div className="mt-4 border-t border-border pt-3">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="label-mono text-[10px] text-muted-foreground">条件字明细 CONDITIONAL</span>
                              <span className="text-[11px] font-bold text-muted-foreground">下列字须视柱中态势定用忌，故不作无条件判定，逐条列明取舍依据：</span>
                            </div>
                            <ul className="mt-2 space-y-1.5">
                              {daiEntries.map((e) => (
                                <li key={e.char} className="flex gap-2 text-[12px] leading-relaxed">
                                  <span className="shrink-0 px-1.5 font-black text-white" style={{ background: '#64748B', fontFamily: 'var(--font-mono)', borderRadius: 0 }}>{e.char}</span>
                                  <span className="text-muted-foreground">{e.note}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="label-mono mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-border pt-3 text-[10.5px] text-muted-foreground">
                          <span className="flex items-center gap-1.5"><span className="inline-block size-3" style={{ background: '#2E7654' }} />喜 · 本月取用</span>
                          <span className="flex items-center gap-1.5"><span className="inline-block size-3" style={{ background: '#E31C29' }} />忌 · 本月所忌</span>
                          <span className="flex items-center gap-1.5"><span className="inline-block size-3" style={{ background: '#64748B' }} />条件 · 须视柱中态势（明细见上）</span>
                          <span className="flex items-center gap-1.5"><span className="inline-block size-1.5" style={{ background: 'var(--foreground)' }} />命局现字</span>
                          <span>悬停查看逐字依据</span>
                        </div>
                      </div>
                    );
                  })()}
                  </SplitBody>
                </CardContent>
              </Card>


              {/* 三、大运流年分析 */}
              <Card
                id="section-dayun"
                className="relative crosshair scroll-mt-6 rounded-sm border-border bg-card"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">{SECTION_META.dayun.no} / {SECTION_META.dayun.en}</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">{SECTION_META.dayun.title}</span>
                  </div>
                  <span className="label-mono hidden text-muted-foreground md:inline">十年大运 · 岁运引动</span>
                </div>
                <CardContent className="p-4 md:p-8">
                  <SplitBody
                    notes={(
                      <>
                  {/* 理气法 · 生克权流转（旁证 · 不计分；含当前大运掌权复核） */}
                  {guFaPangZheng && (
                    <div className="border border-border bg-muted/30 p-3">
                      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="label-mono text-[10px] font-black text-muted-foreground">理气法 · 生克权流转</span>
                        <span className="text-[10px] font-bold text-muted-foreground">旁证 · 不参与评分</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {guFaPangZheng.shengKeQuan.chain.map((s, i) => (
                          <span key={i} className="flex items-center gap-1.5">
                            {i > 0 && <span className="text-[10px] text-muted-foreground">→</span>}
                            <span
                              className="border px-2 py-0.5 text-[11px] font-black"
                              style={{
                                borderColor: `${ELEMENT_COLORS[s.element] ?? '#788491'}66`,
                                color: ELEMENT_COLORS[s.element] ?? '#788491',
                                background: `${ELEMENT_COLORS[s.element] ?? '#788491'}12`,
                              }}
                            >
                              {s.label}
                            </span>
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] font-bold leading-relaxed text-foreground">{guFaPangZheng.shengKeQuan.description}</p>
                      {guFaPangZheng.shengKeQuanShift && (
                        <div className="mt-2 border-t border-border pt-2">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                            <span className="label-mono text-[10px] font-black text-muted-foreground">当前大运掌权复核</span>
                            <span className="font-mono font-black">{guFaPangZheng.currentDaYunGanZhi}</span>
                            <span
                              className="border px-1.5 py-0.5 text-[10px] font-black"
                              style={
                                guFaPangZheng.shengKeQuanShift.shifted
                                  ? { borderColor: 'rgba(227,28,41,.45)', color: '#E31C29' }
                                  : { borderColor: 'rgba(46,118,84,.5)', color: '#2E7654' }
                              }
                            >
                              {guFaPangZheng.shengKeQuanShift.shifted ? '权已交接' : '权未交接'}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{guFaPangZheng.shengKeQuanShift.description}</p>
                        </div>
                      )}
                    </div>
                  )}
                      </>
                    )}
                  >
                  {(() => {
                    // ===== 大运/流年 新九档字母等级视觉映射（S+ > S > A+ > A > B+ > B- > C > C- > D）=====
                    const LETTER_META: Record<string, { bg: string; border: string; text: string; ring: string; labelColor: string; dot: string }> = {
                      'S+': { bg: 'rgba(227,28,41,0.10)', border: '#E31C29', text: '#B0141F', ring: '#E31C29', labelColor: '#B0141F', dot: '#E31C29' },
                      'S':  { bg: 'rgba(185,140,49,0.12)', border: '#B98C31', text: '#7A5A1E', ring: '#B98C31', labelColor: '#7A5A1E', dot: '#B98C31' },
                      'A+': { bg: 'rgba(46,118,84,0.10)', border: '#2E7654', text: '#1E5239', ring: '#2E7654', labelColor: '#1E5239', dot: '#2E7654' },
                      'A':  { bg: 'rgba(74,131,78,0.10)', border: '#4A834E', text: '#2F5A32', ring: '#4A834E', labelColor: '#2F5A32', dot: '#4A834E' },
                      'B+': { bg: 'rgba(49,102,155,0.09)', border: '#31669B', text: '#234C75', ring: '#31669B', labelColor: '#234C75', dot: '#31669B' },
                      'B-': { bg: 'rgba(120,132,145,0.10)', border: '#788491', text: '#4A5461', ring: '#788491', labelColor: '#4A5461', dot: '#788491' },
                      'C':  { bg: 'rgba(194,65,12,0.09)', border: '#C2410C', text: '#7C2D12', ring: '#C2410C', labelColor: '#7C2D12', dot: '#C2410C' },
                      'C-': { bg: 'rgba(154,52,18,0.09)', border: '#9A3412', text: '#7F1D1D', ring: '#9A3412', labelColor: '#7F1D1D', dot: '#9A3412' },
                      'D':  { bg: 'rgba(107,114,128,0.10)', border: '#6B7280', text: '#1F2937', ring: '#6B7280', labelColor: '#374151', dot: '#6B7280' },
                    };
                    // 旧五档兼容映射（数据未切换时的兜底）
                    const WUDANG_META: Record<string, { bg: string; border: string; text: string; ring: string; labelColor: string; dot: string }> = {
                      '夯':     { bg: 'rgba(185,140,49,0.12)', border: '#B98C31', text: '#7A5A1E', ring: '#B98C31', labelColor: '#7A5A1E', dot: '#B98C31' },
                      '人上人': { bg: 'rgba(49,102,155,0.09)', border: '#31669B', text: '#234C75', ring: '#31669B', labelColor: '#234C75', dot: '#31669B' },
                      'npc':    { bg: 'rgba(120,132,145,0.10)', border: '#788491', text: '#4A5461', ring: '#788491', labelColor: '#4A5461', dot: '#788491' },
                      '拉':     { bg: 'rgba(194,65,12,0.09)', border: '#C2410C', text: '#7C2D12', ring: '#C2410C', labelColor: '#7C2D12', dot: '#C2410C' },
                      '拉完了': { bg: 'rgba(154,52,18,0.09)', border: '#9A3412', text: '#7F1D1D', ring: '#9A3412', labelColor: '#7F1D1D', dot: '#9A3412' },
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
                          className="rounded-none p-4"
                          style={{ backgroundColor: 'rgba(49,102,155,0.07)', border: '1px solid rgba(49,102,155,0.25)' }}
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-bold" style={{ color: isCurrentDY ? '#31669B' : '#94A3B8' }}>
                              <span className="mark-highlight">
                                {isCurrentDY ? '当前大运' : '查看大运'}
                              </span>
                              {!isCurrentDY && (
                                <span className="ml-2 inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-black" style={{ backgroundColor: 'rgba(49,102,155,.10)', color: '#31669B', border: '1px solid rgba(49,102,155,.35)' }}>
                                  点击下方大运行可切换
                                </span>
                              )}
                              <span className="ml-2 text-[13px] font-black" style={{ fontFamily: "var(--font-sans)", color: 'var(--foreground)' }}>
                                {activeCurve.label}
                              </span>
                            </div>
                            <div
                              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-black"
                              title={'评级按「岁运调整分」（综合分 − 命盘基准）定档，与先天盘高低无关：S+ > +3.8 ｜ S: +2.6~+3.8 ｜ A+: +1.4~+2.6 ｜ A: +0.4~+1.4 ｜ B+: -0.4~+0.4 ｜ B-: -1.4~-0.4 ｜ C: -2.6~-1.4 ｜ C-: -3.8~-2.6 ｜ D < -3.8。大运 S+ 另须硬认证：干支双用、一体落实无破损、下辖十年无大破败，且同盘八步至多 1 个 S+。'}
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
                                          role="button"
                                          tabIndex={0}
                                          aria-expanded={isOpen}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              setExpandedDY(isOpen ? null : dy.index);
                                            }
                                          }}
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
                                              className="inline-flex items-center rounded-none px-2.5 py-1 text-xs font-black"
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
                                                  color: dy.score > 4 ? '#E31C29' : dy.score > 2 ? '#B98C31' : dy.score >= 0 ? '#2E7654' : dy.score >= -2 ? '#31669B' : dy.score >= -6 ? '#C2410C' : '#9A3412',
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
                                            <TableCell colSpan={6} className="whitespace-normal border-t border-dashed border-border px-2 py-4 sm:px-6">
                                              <div className="mb-2 flex items-center justify-between">
                                                <div className="text-xs font-semibold" style={{ color: '#31669B' }}>
                                                  {dy.stem}
                                                  {dy.branch}运 · 下辖十年流年（每一年的总判和量化得分）
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                  {dy.startAge} 岁起 · {dy.startYear}-{dy.endYear}
                                                </div>
                                              </div>
                                              {/* 吉凶分记：同一运里吉项与凶项各自成立，不互相抵消（老高口径） */}
                                              <div className="mb-3 grid gap-2 md:grid-cols-2">
                                                <div className="rounded-none border p-2.5" style={{ borderColor: 'rgba(46,118,84,.35)', background: 'rgba(46,118,84,.06)' }}>
                                                  <div className="mb-1 flex items-baseline justify-between">
                                                    <span className="label-mono text-[10px] font-black" style={{ color: '#2E7654' }}>吉项</span>
                                                    <span className="text-[10px] font-bold tabular-nums" style={{ color: '#2E7654' }}>
                                                      {Array.isArray(dy.jiItems) ? dy.jiItems.length : 0} 条
                                                    </span>
                                                  </div>
                                                  {Array.isArray(dy.jiItems) && dy.jiItems.length > 0 ? (
                                                    <ul className="space-y-0.5 text-[11px] leading-snug text-foreground/90">
                                                      {dy.jiItems.map((t: string, i: number) => (
                                                        <li key={i} className="whitespace-normal break-words">{t}</li>
                                                      ))}
                                                    </ul>
                                                  ) : (
                                                    <div className="text-[11px] text-muted-foreground">本运无明显吉项</div>
                                                  )}
                                                </div>
                                                <div className="rounded-none border p-2.5" style={{ borderColor: 'rgba(227,28,41,.35)', background: 'rgba(227,28,41,.05)' }}>
                                                  <div className="mb-1 flex items-baseline justify-between">
                                                    <span className="label-mono text-[10px] font-black" style={{ color: '#E31C29' }}>凶项</span>
                                                    <span className="text-[10px] font-bold tabular-nums" style={{ color: '#E31C29' }}>
                                                      {Array.isArray(dy.xiongItems) ? dy.xiongItems.length : 0} 条
                                                    </span>
                                                  </div>
                                                  {Array.isArray(dy.xiongItems) && dy.xiongItems.length > 0 ? (
                                                    <ul className="space-y-0.5 text-[11px] leading-snug text-foreground/90">
                                                      {dy.xiongItems.map((t: string, i: number) => (
                                                        <li key={i} className="whitespace-normal break-words">{t}</li>
                                                      ))}
                                                    </ul>
                                                  ) : (
                                                    <div className="text-[11px] text-muted-foreground">本运无明显凶项</div>
                                                  )}
                                                </div>
                                              </div>
                                              {/* 按容器实际宽度自适应列数（卡最小 132px），保证卡内判词能整句排下不被截断 */}
                                              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))' }}>
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
                                                          <div className="text-sm font-black" style={{ color: lmeta.text, fontFamily: "var(--font-sans)" }}>
                                                            {ln.ganzhi}
                                                          </div>
                                                        </div>
                                                        <div
                                                          className="text-sm font-bold tabular-nums"
                                                          style={{
                                                            color: ln.score > 4 ? '#E31C29' : ln.score > 2 ? '#B98C31' : ln.score >= 0 ? '#2E7654' : ln.score >= -2 ? '#31669B' : ln.score >= -6 ? '#C2410C' : '#9A3412',
                                                          }}
                                                        >
                                                          {ln.score >= 0 ? '+' : ''}
                                                          {ln.score}
                                                        </div>
                                                      </div>
                                                      <ScoreBreakdown row={ln} stacked />
                                                      <div className="mt-1 break-words text-[10px] leading-snug text-muted-foreground/90">
                                                        {compactLiuNianHint(ln.hint)}
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
                          {/* 6 张近年卡：桌面 3 列、平板 2 列，卡宽足够让判词整段排下（不再 6 列挤成窄条） */}
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {daYunAnalysis.recentLiuNian.map((ln: any) => {
                              const meta = m(ln);
                              return (
                                <div
                                  key={ln.year}
                                  className="rounded-none border p-3 text-center"
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
                                  <ScoreBreakdown row={ln} stacked />
                                  <div className="mt-1 break-words text-[10px] leading-snug font-bold text-muted-foreground">{compactLiuNianHint(ln.hint)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 未来十年关键年份：十年全量按序，绿=窗口内最吉三年，红=最凶三年，金=换运交接年 */}
                        {keyYears?.allYears?.length ? (
                          <div>
                            <div className="mb-2 text-sm font-bold">
                              <span className="mark-highlight">未来十年关键年份</span>（{keyYears.windowStart}–{keyYears.windowEnd}）
                            </div>
                            <div className="grid grid-cols-5 gap-1.5 md:grid-cols-10">
                              {keyYears.allYears.map((y) => {
                                const isJi = y.tag === 'ji';
                                const isXiong = y.tag === 'xiong';
                                const bg = isJi ? 'rgba(46,118,84,.12)' : isXiong ? 'rgba(227,28,41,.10)' : 'rgba(120,132,145,.06)';
                                const borderCol = isJi ? '#2E7654' : isXiong ? '#E31C29' : 'rgba(120,132,145,.35)';
                                const textCol = isJi ? '#2E7654' : isXiong ? '#E31C29' : 'var(--foreground)';
                                return (
                                  <div
                                    key={y.year}
                                    className="rounded-none border px-1 py-1.5 text-center"
                                    style={{
                                      background: bg,
                                      borderColor: borderCol,
                                      borderTop: y.isTransition ? '2px solid #B98C31' : `1px solid ${borderCol}`,
                                    }}
                                  >
                                    <div className="text-[10px] font-bold text-muted-foreground">{y.year}</div>
                                    <div className="text-xs font-black" style={{ color: textCol }}>{y.level}</div>
                                    <div className="text-[9px] font-bold" style={{ color: textCol }}>{y.ganzhi}</div>
                                    <div className="text-[9px] font-bold text-muted-foreground">({y.displayScore >= 0 ? '+' : ''}{y.displayScore})</div>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="mt-2 text-[10px] leading-relaxed font-bold text-muted-foreground">
                              绿底为窗口内最吉三年（宜进），红底为最凶三年（宜守），金色顶线为大运交接年（前后宜稳）。年份吉凶为气机倾向而非定数。
                            </p>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}

                                    </SplitBody>
                </CardContent>
              </Card>




              {/* 六、盘内存在太极（暂时停用，模块已隐藏；底层 analyzeTaiJiInChart 逻辑保留在 baziAnalyzer.ts，可随时恢复） */}


              {/* 特别提示模块已移除 */}


              {/* 十、象意·财富·感情·学历（《象法》数据书，优先级 2，最终参考） */}
              <Card
                id="section-xiangfa"
                className="relative crosshair scroll-mt-6 rounded-sm border-border bg-card"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3 md:px-8">
                  <div className="flex items-center gap-3">
                    <span className="label-mono text-primary">{SECTION_META.xiangfa.no} / {SECTION_META.xiangfa.en}</span>
                    <span className="h-3 w-px bg-border" />
                    <span className="text-sm font-bold tracking-[0.15em] text-foreground">{SECTION_META.xiangfa.title}</span>
                  </div>
                </div>
                <CardContent className="p-4 md:p-8">
                  {xiangYi ? (
                    <Detail label="象意 / XIANG YI · 干支象意与日主论断（点击展开）" open={fullView}>
                      <XiangYiPanel verdict={xiangYi} />
                    </Detail>
                  ) : (
                    <p className="text-center text-sm font-bold text-muted-foreground">数据计算中，请稍候…</p>
                  )}

                  {/* 老高判据复核（判词层）：柱意优先 / 十神克向 / 生气成气克门控 */}
                  {laoGaoRules && (laoGaoRules.zhuYi.length > 0 || laoGaoRules.shiShen.length > 0 || laoGaoRules.blockedKe.length > 0) && (
                    <div className="mt-4 border border-border">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-4 py-2">
                        <span className="label-mono text-[10px] font-black text-primary">L / LAO GAO</span>
                        <span className="h-3 w-px bg-border" />
                        <span className="text-[11px] font-bold tracking-[0.12em] text-foreground">老高判据复核</span>
                        <span className="label-mono ml-auto text-[9.5px] text-muted-foreground">判词层 · 不计分</span>
                      </div>
                      <div className="space-y-2 p-4 text-[11px] leading-relaxed text-muted-foreground">
                        {laoGaoRules.zhuYi.length > 0 && (
                          <div>
                            <span className="font-black text-foreground">柱意优先 · </span>
                            {laoGaoRules.zhuYi.map((z) => `${z.ganzhi}：${z.note.replace(/。$/, '')}`).join('；')}。
                          </div>
                        )}
                        {laoGaoRules.shiShen.length > 0 && (
                          <div>
                            <span className="font-black text-foreground">十神取象（克向） · </span>
                            {laoGaoRules.shiShen.join('；')}。
                          </div>
                        )}
                        {laoGaoRules.blockedKe.length > 0 && (
                          <div>
                            <span className="font-black text-foreground">生气/成气门控 · </span>
                            {laoGaoRules.blockedKe.length} 处跨气类之克未布出对应成气，判平不计：
                            {laoGaoRules.blockedKe.slice(0, 2).map((k) => `${k.from}克${k.to}`).join('、')}
                            。
                          </div>
                        )}
                      </div>
                    </div>
                  )}


                  {/* 五行取象（判定内核增量 · 从理到象）· 默认折叠（「全量」视图展开） */}
                  {wuXingQuXiang && (
                    <Detail
                      className="mt-4"
                      label={`Q / 五行取象 · 从理到象（内核增量 v${wuXingQuXiang.version}）`}
                      open={fullView}
                    >
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {wuXingQuXiang.entries.map((q) => {
                            const col = q.mark === 'useful' ? '#2E7654' : q.mark === 'taboo' ? '#E31C29' : '#788491';
                            const bg = q.mark === 'useful' ? 'rgba(46,118,84,.07)' : q.mark === 'taboo' ? 'rgba(227,28,41,.06)' : 'rgba(120,132,145,.08)';
                            return (
                              <div key={q.element} className="rounded-none p-3" style={{ backgroundColor: bg, border: `1px solid ${col}40` }}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[12px] font-black text-foreground">{q.name}{q.dominant ? ' · 主导' : ''}</span>
                                  <span className="font-mono text-[9.5px] font-black" style={{ color: col }}>{q.markLabel} · {q.powerPct}%</span>
                                </div>
                                <p className="mt-1.5 text-[10px] leading-relaxed font-bold text-foreground/80">{q.benXing}</p>
                                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{q.qiFen}</p>
                                <div className="mt-1 font-mono text-[9px] text-muted-foreground">{q.gua} · {q.wuDe}</div>
                                <ul className="mt-1.5 space-y-0.5 border-t border-border pt-1.5">
                                  {q.xiang.map((x, i) => (
                                    <li key={i} className="text-[10px] leading-relaxed text-muted-foreground">· {x}</li>
                                  ))}
                                </ul>
                                <p className="mt-1.5 border-t border-border pt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                                  <span className="font-bold text-foreground">人体：</span>{q.renTi}
                                </p>
                                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                                  <span className="font-bold text-foreground">十二月流转：</span>{q.liuZhuan}
                                </p>
                                <p className="mt-1 border-t border-border pt-1 text-[9.5px] leading-relaxed text-muted-foreground">{q.presence}</p>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] leading-relaxed font-bold text-muted-foreground">{wuXingQuXiang.verdict}</p>
                      </div>
                    </Detail>
                  )}

                  {/* 地支作用规则（判定内核增量 · 三合三会不开藏干）· 依据类，默认折叠（「全量」视图展开） */}
                  <Detail
                    className="mt-4"
                    label={`R / 地支作用规则 · ZHI ZUO YONG（内核增量 v${ZHI_ZUO_YONG_RULES.version}）`}
                    open={fullView}
                  >
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {ZHI_ZUO_YONG_RULES.rules.map((r) => (
                          <div key={r.id} className="border border-border p-2.5">
                            <div className="text-[11px] font-black text-foreground">{r.rule}</div>
                            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{r.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Detail>
                </CardContent>

                {/* ===== 古法旁证（阴阳干支命理讲义底层增量｜仅佐证解释，不参与用忌判定与大运流年评分）· 依据类，默认折叠（「全量」视图展开） ===== */}
                {guFaPangZheng && (
                  <div className="px-4 pt-4 md:px-8 md:pt-6">
                    <Detail
                      label="古法旁证 / ANCIENT CROSS-REFERENCE · 仅佐证解释（不参与用忌判定与大运流年评分）"
                      open={fullView}
                    >
                    <div className="grid gap-3 md:grid-cols-2">
                      {/* 十干定性：气干 / 形干 */}
                      <div className="border border-border bg-muted/30 p-3">
                        <div className="label-mono mb-2 text-[10px] font-black text-muted-foreground">十干定性 · 气干 / 形干</div>
                        <div className="flex flex-wrap gap-1.5">
                          {guFaPangZheng.qiXing.map((q) => (
                            <span
                              key={q.stem}
                              className="inline-flex items-center gap-1 border border-border bg-card px-2 py-0.5 text-[11px] font-bold"
                            >
                              <span className="font-mono text-sm font-black">{q.stem}</span>
                              <span className="text-[10px] text-muted-foreground">{q.qiXing}</span>
                              <span
                                className="text-[10px] font-black"
                                style={{ color: q.group === '阳' ? 'hsl(28 82% 48%)' : 'hsl(215 55% 38%)' }}
                              >
                                {q.group}集团
                              </span>
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                          气干含气多而杂、皮实耐克泄；形干含气少而精、脆弱惧克泄。同为气/形者生克彻底无情，气形相见则生克有情、留有余地。
                        </p>
                      </div>

                      {/* 天干四冲 · 地支六破 */}
                      <div className="border border-border bg-muted/30 p-3">
                        <div className="label-mono mb-2 text-[10px] font-black text-muted-foreground">天干四冲 · 地支六破</div>
                        <div className="space-y-1.5 text-[11px] font-bold">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground">天干四冲</span>
                            {guFaPangZheng.tianGanChong.length > 0 ? (
                              guFaPangZheng.tianGanChong.map((s) => (
                                <span key={s} className="border px-1.5 py-0.5" style={{ borderColor: 'rgba(227,28,41,.4)', color: '#E31C29' }}>{s}</span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">本盘未见</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground">地支六破</span>
                            {guFaPangZheng.liuPo.length > 0 ? (
                              guFaPangZheng.liuPo.map((s) => (
                                <span key={s} className="border px-1.5 py-0.5" style={{ borderColor: 'rgba(227,28,41,.4)', color: '#E31C29' }}>{s}</span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">本盘未见</span>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                          四冲（甲庚·乙辛·丙壬·丁癸）主观念对立互伤；六破（子酉·卯午·寅亥·巳申·丑辰·戌未）主暗中侵蚀破坏。
                        </p>
                      </div>

                      {/* 驿马 */}
                      <div className="border border-border bg-muted/30 p-3">
                        <div className="label-mono mb-2 text-[10px] font-black text-muted-foreground">驿马 · 三合查法</div>
                        <div className="space-y-1.5">
                          {guFaPangZheng.yiMa.map((m) => (
                            <div key={m.from} className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                              <span className="text-muted-foreground">{m.from}</span>
                              <span className="font-mono">{m.group}</span>
                              <span className="text-muted-foreground">→ 马在</span>
                              <span className="font-mono font-black">{m.ma}</span>
                              <span
                                className="ml-auto border px-1.5 py-0.5 text-[10px] font-black"
                                style={
                                  m.hit
                                    ? { borderColor: 'rgba(46,118,84,.5)', color: '#2E7654', background: 'rgba(46,118,84,.07)' }
                                    : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }
                                }
                              >
                                {m.hit ? '本盘命驿马' : '本盘未见'}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                          申子辰马在寅、寅午戌马在申、巳酉丑马在亥、亥卯未马在巳；主变动、走动、迁旅与外出机遇。
                        </p>
                      </div>

                    </div>

                    {/* 形干同性重克 · 实质压力点 */}
                    <div className="mt-3 border border-border bg-muted/30 p-3">
                      <div className="label-mono mb-2 text-[10px] font-black text-muted-foreground">形干同性重克 · 实质压力点</div>
                      {guFaPangZheng.xingGanChongKe.length > 0 ? (
                        <div className="space-y-1.5">
                          {guFaPangZheng.xingGanChongKe.map((h, i) => (
                            <div key={i} className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                              <span
                                className="border px-1.5 py-0.5 text-[10px] font-black"
                                style={
                                  h.level === '重克'
                                    ? { borderColor: 'rgba(227,28,41,.45)', color: '#E31C29', background: 'rgba(227,28,41,.06)' }
                                    : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }
                                }
                              >
                                {h.level}
                              </span>
                              <span className="font-mono font-black">{h.attacker}</span>
                              <span className="text-muted-foreground">克</span>
                              <span className="font-mono font-black">{h.defender}</span>
                              <span className="text-muted-foreground">（{h.attackerPillar} → {h.defenderPillar}）</span>
                              {h.isDayMaster && (
                                <span className="border px-1.5 py-0.5 text-[10px] font-black" style={{ borderColor: 'rgba(227,28,41,.6)', color: '#E31C29' }}>涉日主</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] font-bold text-muted-foreground">本盘天干形干之间未见无情同性之克，无实质压力点。</p>
                      )}
                      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                        形干（乙·丁·己·辛·癸）本脆弱，被同为形干者所克即「生克无情」。两柱紧贴判为重克（实质压力点），隔位判为轻克（力道次之）；气干克形干属异性、生克留有余地，不计入。
                      </p>
                    </div>
                    </Detail>
                  </div>
                )}
              </Card>


            {/* 底部操作区 */}
            <div className="flex flex-wrap justify-center gap-3 py-4">
              <Button variant="outline" size="lg" onClick={handleReset} className="font-bold">
                重新排盘
              </Button>
            </div>
            </div>
          </div>
        )}
          </main>

          {/* 右侧独立栏已取消：原目录与左栏编号导航重复，其功能并入左栏；
              原右栏空置的横向空间回收给主内容，各版块内部再以「正文 + 侧注」两列利用。 */}

        </div>
      </div>

      {/* 页脚：瑞士式 */}
      <footer className="w-full border-t-4 border-foreground bg-card py-8">
        <div className="mx-auto max-w-[1440px] px-4 text-center text-sm text-muted-foreground md:px-6">
          <div className="label-mono mb-3 text-primary">PEIRAN TANG / 沛然堂</div>
          <p className="mt-2 text-xs">本工具仅供命理研究与学习参考，不构成任何人生决策建议</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="num-tabular px-2 py-0.5 text-xs font-bold" style={{ border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }}>v{APP_VERSION}</span>
            <span className="h-3 w-px bg-border" />
            <span className="label-mono">正式版</span>
          </div>
          <p className="mt-4 text-[11px] font-medium text-muted-foreground/70">
            内部代码 · 不可商用盈利 · 公开代码仅作为无害公开供人民群众监督
          </p>
        </div>
      </footer>

      {/* 回到顶部 */}
      {showBackTop && (
        <button
          onClick={scrollToTop}
          className="back-to-top"
          aria-label="回到顶部"
        >
          ↑
        </button>
      )}
    </div>
  );
}
