import React, { useState } from 'react';
import type { PeiranAnalysis, NayinRelation } from '@/analysis/peiran/nayinAnalyzer';
import { analyzeFiveDimensions } from '@/analysis/peiran/fiveDimensions';
import {
  ELEMENT_NAMES,
  ELEMENT_COLORS,
} from '@/analysis/peiran/nayinData';

export const PEIRAN_SECTIONS = [
  { id: 'peiran-xiangyi', no: '02', label: '纳音象意', en: 'NAYIN INTERPRETATION', title: '纳音象意' },
  { id: 'peiran-imagery', no: '03', label: '四柱纳音取象', en: 'NAYIN IMAGERY', title: '四柱纳音取象' },
  { id: 'peiran-overview', no: '04', label: '纳音命主速览', en: 'NAYIN PROFILE', title: '纳音命主速览' },
  { id: 'peiran-fortune', no: '05', label: '大运流年纳音', en: 'NAYIN FORTUNE', title: '大运流年纳音' },
] as const;

const JI = '#2E7654';
const XIONG = '#E31C29';
const NEUTRAL = '#788491';

const toneColor = (tone: 'ji' | 'xiong' | 'neutral') => (tone === 'ji' ? JI : tone === 'xiong' ? XIONG : NEUTRAL);
const confidenceLabel = (c: 'high' | 'medium' | 'low') => (c === 'high' ? '高' : c === 'medium' ? '中' : '低');
const relationTone = (r: NayinRelation): 'ji' | 'xiong' | 'neutral' =>
  r === 'shengYear' || r === 'yearKe' ? 'ji' : r === 'keYear' || r === 'yearSheng' ? 'xiong' : 'neutral';

function Section({
  id,
  no,
  en,
  title,
  children,
}: {
  id: string;
  no: string;
  en: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-6 border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <span className="label-mono text-primary">{no} / {en}</span>
          <span className="h-3 w-px bg-border" />
          <span className="text-sm font-bold tracking-[0.15em] text-foreground">{title}</span>
        </div>
      </div>
      <div className="p-4 md:p-8">{children}</div>
    </div>
  );
}

function Metric({
  tone,
  label,
  value,
  note,
  extra,
}: {
  tone: string;
  label: string;
  value: React.ReactNode;
  note: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col border p-4" style={{ borderColor: `${tone}55`, backgroundColor: `${tone}0F` }}>
      <div className="label-mono" style={{ color: tone }}>{label}</div>
      <div className="mt-2 text-xl font-black leading-tight" style={{ color: tone }}>{value}</div>
      {extra}
      <div className="mt-auto pt-3 text-[10px] font-bold leading-snug" style={{ color: tone }}>{note}</div>
    </div>
  );
}

function Detail({ label, open, children }: { label: string; open: boolean; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-card">
      <details open={open || undefined}>
        <summary className="label-mono cursor-pointer select-none px-4 py-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          {label}
          <span className="ml-2 text-[10px]">▾</span>
        </summary>
        <div className="border-t border-border p-4">{children}</div>
      </details>
    </div>
  );
}

function PillarNayinCard({ p }: { p: PeiranAnalysis['pillars'][number] }) {
  const tone = ELEMENT_COLORS[p.entry.element];
  return (
    <div className="border border-border bg-card p-4" style={{ borderTop: `3px solid ${tone}` }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="label-mono text-muted-foreground">{p.position}柱 · {p.label}</div>
          <div className="mt-1 font-mono text-lg font-black text-foreground">{p.ganzhi}</div>
        </div>
        <span className="px-2 py-1 text-sm font-black text-white" style={{ background: tone, borderRadius: 0 }}>
          {p.entry.name}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="label-mono" style={{ color: tone }}>{ELEMENT_NAMES[p.entry.element]} · {p.entry.yinYang === 'yang' ? '阳' : '阴'}</span>
        <span className="label-mono text-muted-foreground">十二运 · {p.stage}</span>
      </div>
      <p className="mt-2 text-[11px] font-bold leading-relaxed text-foreground/80">{p.entry.image}</p>
      <div className="mt-3 border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
        <div><span className="font-black text-foreground">喜：</span>{p.entry.likes}</div>
        <div className="mt-1"><span className="font-black text-foreground">忌：</span>{p.entry.dislikes}</div>
      </div>
      <div className="mt-3 border-t border-border pt-2">
        <span className="label-mono text-[9px] text-muted-foreground">与年命 · </span>
        <span className="text-[11px] font-black" style={{ color: toneColor(p.relationTone) }}>{p.relationLabel}</span>
      </div>
    </div>
  );
}

function FortuneBadge({ fortune }: { fortune: 'ji' | 'xiong' | 'neutral' }) {
  const color = toneColor(fortune);
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-black" style={{ color, border: `1px solid ${color}`, borderRadius: 0 }}>
      {fortune === 'ji' ? '吉' : fortune === 'xiong' ? '凶' : '平'}
    </span>
  );
}

function MarkerBadges({ markers }: { markers: string[] }) {
  if (!markers.length) return <span className="text-[10px] text-muted-foreground">—</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {markers.map((m) => {
        const romance = m.includes('桃花') || m.includes('沐浴');
        const color = romance ? '#B98C31' : '#31669B';
        const label = romance ? '情' : '学';
        return (
          <span key={m} className="inline-flex items-center gap-1 border px-1 py-0.5 text-[9px] font-black" style={{ borderColor: `${color}66`, color, background: `${color}0F`, borderRadius: 0 }} title={m}>
            {label}
          </span>
        );
      })}
    </span>
  );
}

export default function PeiranReport({ analysis, fullView }: { analysis: PeiranAnalysis; fullView: boolean }) {
  const [showAllYears, setShowAllYears] = useState(false);
  const yearTone = ELEMENT_COLORS[analysis.yearNayin.element];
  const dayTone = ELEMENT_COLORS[analysis.dayNayin.element];
  const bodyTone = analysis.body.level === 'strong' ? JI : analysis.body.level === 'weak' ? XIONG : NEUTRAL;
  const currentYear = new Date().getFullYear();
  const current = analysis.daYun.find((d) => d.startYear <= currentYear && d.endYear >= currentYear) ?? analysis.daYun[0];
  const currentLiuNian = analysis.liuNian.find((l) => l.year === currentYear) ?? analysis.liuNian[0];
  const five = analyzeFiveDimensions(analysis, currentYear);

  return (
    <div className="space-y-5">
      {/* 02 纳音象意 */}
      <Section id="peiran-xiangyi" no="02" en="NAYIN INTERPRETATION" title="纳音象意">
        <div className="grid gap-3 md:grid-cols-2">
          {analysis.patterns.length > 0 ? analysis.patterns.map((p) => (
            <div key={p.name} className="border-2 border-foreground bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="label-mono text-primary">{p.en}</div>
                  <div className="mt-1 text-lg font-black text-foreground">{p.name}</div>
                </div>
                <span className="label-mono text-[9px] text-muted-foreground">{p.source}</span>
              </div>
              <p className="mt-2 text-[11px] font-bold leading-relaxed text-muted-foreground">条件：{p.condition}</p>
              <p className="mt-2 text-sm font-black leading-relaxed text-foreground">{p.verdict}</p>
            </div>
          )) : (
            <div className="border border-border bg-card p-4 md:col-span-2">
              <div className="label-mono text-muted-foreground">象格 / PATTERNS</div>
              <p className="mt-2 text-[11px] font-bold leading-relaxed text-muted-foreground">
                本盘未见《兰台妙选》所列象格。
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* 03 四柱纳音取象 */}
      <Section id="peiran-imagery" no="03" en="NAYIN IMAGERY" title="四柱纳音取象">
        <div className="grid gap-3 md:grid-cols-2">
          {analysis.pillars.map((p) => <PillarNayinCard key={p.position} p={p} />)}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="border-2 border-foreground bg-card p-4">
            <div className="label-mono text-primary">日柱纳音 · 性情</div>
            <div className="mt-2 text-2xl font-black" style={{ color: dayTone }}>{analysis.dayNature.name}</div>
            <p className="mt-2 text-sm font-bold leading-relaxed text-foreground">{analysis.dayNature.personality}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.dayNature.keywords.map((k) => (
                <span key={k} className="border px-2 py-0.5 text-[10px] font-black" style={{ borderColor: `${dayTone}55`, color: dayTone }}>{k}</span>
              ))}
            </div>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="label-mono text-muted-foreground">胎元纳音 / TAI YUAN</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-lg font-black text-foreground">{analysis.taiYuan.ganzhi}</span>
              <span className="text-xl font-black" style={{ color: ELEMENT_COLORS[analysis.taiYuan.entry.element] }}>{analysis.taiYuan.entry.name}</span>
            </div>
            <p className="mt-2 text-[11px] font-bold leading-relaxed text-muted-foreground">{analysis.taiYuan.note}</p>
            <div className="mt-3 label-mono text-[10px]" style={{ color: toneColor(relationTone(analysis.taiYuan.relation)) }}>
              {analysis.taiYuan.relationLabel}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Detail label="P / 纳音喜忌 · 六十甲子性质吉凶" open={fullView}>
            <div className="grid gap-2 sm:grid-cols-2">
              {analysis.pillars.map((p) => (
                <div key={p.position} className="border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black text-foreground">{p.position}柱 {p.entry.name}</span>
                    <span className="label-mono" style={{ color: ELEMENT_COLORS[p.entry.element] }}>{ELEMENT_NAMES[p.entry.element]}</span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground"><span className="font-black text-foreground">喜：</span>{p.entry.likes}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground"><span className="font-black text-foreground">忌：</span>{p.entry.dislikes}</p>
                </div>
              ))}
            </div>
          </Detail>
        </div>
      </Section>

      {/* 04 纳音命主速览（含纳音生克与身命） */}
      <Section id="peiran-overview" no="04" en="NAYIN PROFILE" title="纳音命主速览">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <Metric
            tone={yearTone}
            label="年命纳音 / BODY"
            value={analysis.yearNayin.name}
            note={`${ELEMENT_NAMES[analysis.yearNayin.element]} · ${analysis.yearNayin.yinYang === 'yang' ? '阳' : '阴'} · 先天禀赋与祖业根基`}
          />
          <Metric
            tone={dayTone}
            label="日柱纳音 / SELF"
            value={analysis.dayNayin.name}
            note={analysis.dayNature.personality}
          />
          <Metric
            tone={bodyTone}
            label="身强弱 / STRENGTH"
            value={`${analysis.body.label} · ${analysis.body.score}`}
            note={`年命纳音在${analysis.chart.month.branch}月为「${analysis.body.seasonState}」`}
            extra={
              <div className="mt-3">
                <div className="h-1.5 w-full bg-border">
                  <div className="h-full" style={{ width: `${analysis.body.score}%`, background: bodyTone }} />
                </div>
                <div className="mt-1 flex justify-between text-[9px] font-black text-muted-foreground">
                  <span>弱</span><span>中和</span><span>强</span>
                </div>
              </div>
            }
          />
          <Metric
            tone={analysis.pure.isPure ? ELEMENT_COLORS[analysis.pure.element ?? 'earth'] : NEUTRAL}
            label="纳音结构 / STRUCTURE"
            value={analysis.pure.isPure ? analysis.pure.label : analysis.sanHe.element ? analysis.sanHe.label : '多行并见'}
            note={analysis.pure.isPure ? analysis.pure.verdict : analysis.sanHe.verdict}
          />
          <Metric
            tone={ELEMENT_COLORS[analysis.taiYuan.entry.element]}
            label="胎元纳音 / TAI YUAN"
            value={analysis.taiYuan.entry.name}
            note={`${analysis.taiYuan.ganzhi} · ${analysis.taiYuan.relationLabel}`}
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Metric
            tone="#3A4450"
            label="盘层倾向 / LEVEL"
            value={five.level.label}
            note={`判断依据：${five.level.basis} · 置信 ${confidenceLabel(five.level.confidence)}`}
          />
          <Metric
            tone="#31669B"
            label="学历倾向 / EDUCATION"
            value={five.education.label}
            note={`判断依据：${five.education.basis} · 置信 ${confidenceLabel(five.education.confidence)}`}
          />
          <Metric
            tone="#B98C31"
            label="财富倾向 / WEALTH"
            value={five.wealth.label}
            note={`判断依据：${five.wealth.basis} · 置信 ${confidenceLabel(five.wealth.confidence)}`}
          />
          <Metric
            tone="#2E7654"
            label="工作取向 / WORK"
            value={five.work.type}
            note={`判断依据：${five.work.basis} · 置信 ${confidenceLabel(five.work.confidence)}`}
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="border border-border bg-card p-4">
            <div className="label-mono text-muted-foreground">根气 / ROOT</div>
            <div className="mt-1 text-lg font-black" style={{ color: analysis.genRoot.rooted ? JI : XIONG }}>
              {analysis.genRoot.label}
            </div>
            <p className="mt-2 text-[10px] font-bold leading-relaxed text-muted-foreground">{analysis.genRoot.note}</p>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="label-mono text-muted-foreground">年命位次 / RANK</div>
            <div className="mt-1 text-lg font-black text-foreground">{analysis.rank.year.label}</div>
            <p className="mt-2 text-[10px] font-bold leading-relaxed text-muted-foreground">
              日柱为{analysis.rank.day.label}。位次只作平台与量级的旁证，不作吉凶硬断。
            </p>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="label-mono text-muted-foreground">时柱归宿 / DESTINY</div>
            <div className="mt-1 text-lg font-black" style={{ color: analysis.hourDestiny.hit ? JI : NEUTRAL }}>
              {analysis.hourDestiny.label}
            </div>
            <p className="mt-2 text-[10px] font-bold leading-relaxed text-muted-foreground">{analysis.hourDestiny.note}</p>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="label-mono text-muted-foreground">空亡 / VOID</div>
            <div className="mt-1 text-lg font-black text-foreground">
              {analysis.kongWang.hits.length ? analysis.kongWang.hits.join('、') : '未落空亡'}
            </div>
            <p className="mt-2 text-[10px] font-bold leading-relaxed text-muted-foreground">{analysis.kongWang.note}</p>
          </div>
        </div>

        <div className="mt-4 border-2 border-foreground bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            {analysis.pillars.map((p, i) => (
              <React.Fragment key={p.position}>
                {i > 0 && <span className="text-[11px] font-black text-muted-foreground">→</span>}
                <div className="border px-2 py-1 text-center" style={{ borderColor: `${ELEMENT_COLORS[p.entry.element]}66`, background: `${ELEMENT_COLORS[p.entry.element]}0F` }}>
                  <div className="label-mono text-[9px] text-muted-foreground">{p.position}</div>
                  <div className="text-sm font-black" style={{ color: ELEMENT_COLORS[p.entry.element] }}>{p.entry.name}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="mt-3 text-xs font-bold leading-relaxed text-foreground">{analysis.chain.verdict}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.chain.details.map((d, i) => (
              <span key={i} className="border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{d}</span>
            ))}
          </div>
          <div className="mt-3">
            <span className="px-2 py-1 text-[11px] font-black text-white" style={{ background: toneColor(analysis.chain.tone), borderRadius: 0 }}>
              {analysis.chain.label}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="border border-border bg-card p-4">
            <div className="label-mono text-muted-foreground">三合局 / SAN HE</div>
            <div className="mt-1 text-sm font-black text-foreground">{analysis.sanHe.label}</div>
            <p className="mt-1 text-[11px] font-bold leading-relaxed text-muted-foreground">{analysis.sanHe.verdict}</p>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="label-mono text-muted-foreground">刑冲害 / XING CHONG</div>
            <p className="mt-1 text-[11px] font-bold leading-relaxed text-foreground/80">{analysis.xingChong.note}</p>
            {analysis.xingChong.danger && (
              <p className="mt-2 border-l-2 border-primary pl-2 text-[10px] font-black leading-relaxed text-primary">
                年命纳音受日/时纳音克，年支又见刑冲，古法视为压力较重之象。
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* 05 大运流年纳音 */}
      <Section id="peiran-fortune" no="05" en="NAYIN FORTUNE" title="大运流年纳音">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border-2 border-foreground bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="label-mono text-primary">当前大运 / CURRENT</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-black text-foreground">{current?.ganzhi ?? '—'}</span>
                  <span className="text-lg font-black" style={{ color: ELEMENT_COLORS[current?.entry.element ?? 'earth'] }}>{current?.entry.name ?? '—'}</span>
                </div>
                <div className="mt-1 text-[11px] font-bold text-muted-foreground">
                  {current?.relationLabel} · 十二运 {current?.stage}
                </div>
                <div className="mt-2"><MarkerBadges markers={current?.markers ?? []} /></div>
              </div>
              <div className="flex items-center gap-3">
                {current && <FortuneBadge fortune={current.fortune} />}
                <span className="text-xl font-black tabular-nums" style={{ color: current ? toneColor(current.fortune) : NEUTRAL }}>
                  {current ? `${current.fortuneScore >= 0 ? '+' : ''}${current.fortuneScore.toFixed(1)}` : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="label-mono text-primary">当前流年 / YEAR</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-black text-foreground">{currentLiuNian?.year ?? currentYear}</span>
                  <span className="text-lg font-black" style={{ color: ELEMENT_COLORS[currentLiuNian?.entry.element ?? 'earth'] }}>{currentLiuNian?.ganzhi} · {currentLiuNian?.entry.name}</span>
                </div>
                <div className="mt-1 text-[11px] font-bold text-muted-foreground">
                  {currentLiuNian?.relationLabel} · 十二运 {currentLiuNian?.stage}
                </div>
                <div className="mt-2"><MarkerBadges markers={currentLiuNian?.markers ?? []} /></div>
              </div>
              <div className="flex items-center gap-3">
                {currentLiuNian && <FortuneBadge fortune={currentLiuNian.fortune} />}
                <span className="text-xl font-black tabular-nums" style={{ color: currentLiuNian ? toneColor(currentLiuNian.fortune) : NEUTRAL }}>
                  {currentLiuNian ? `${currentLiuNian.fortuneScore >= 0 ? '+' : ''}${currentLiuNian.fortuneScore.toFixed(1)}` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 text-[10px] font-bold text-muted-foreground">
          十二运以日柱纳音{analysis.dayNayin.name}起长生，顺排；情=桃花/沐浴，学=学堂/词馆/文气得令。
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-foreground">
                {['大运', '纳音', '与年命', '十二运', '吉凶', '评分', '标志', '备注'].map((h) => (
                  <th key={h} className="label-mono px-2 py-2 text-[10px] text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.daYun.map((d) => (
                <tr key={d.index} className="border-b border-border">
                  <td className="px-2 py-2 text-[12px] font-black text-foreground">{d.ganzhi}<span className="ml-1 text-[10px] font-bold text-muted-foreground">{d.startAge}岁</span></td>
                  <td className="px-2 py-2 text-[11px] font-black" style={{ color: ELEMENT_COLORS[d.entry.element] }}>{d.entry.name}</td>
                  <td className="px-2 py-2 text-[10px] font-bold" style={{ color: toneColor(relationTone(d.relation)) }}>{d.relationLabel}</td>
                  <td className="px-2 py-2 text-[10px] font-bold text-muted-foreground">{d.stage}{d.badStage ? ' · 忌' : ''}</td>
                  <td className="px-2 py-2"><FortuneBadge fortune={d.fortune} /></td>
                  <td className="px-2 py-2 text-[10px] font-black tabular-nums" style={{ color: toneColor(d.fortune) }}>
                    {d.fortuneScore >= 0 ? '+' : ''}{d.fortuneScore.toFixed(1)}
                  </td>
                  <td className="px-2 py-2"><MarkerBadges markers={d.markers} /></td>
                  <td className="px-2 py-2 text-[10px] leading-relaxed text-muted-foreground">{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="label-mono text-muted-foreground">流年纳音 / 未来十年</div>
          <button
            type="button"
            onClick={() => setShowAllYears((v) => !v)}
            className="border border-border px-3 py-1 text-[11px] font-bold text-foreground/75 transition-colors hover:border-foreground hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {showAllYears ? '收起' : '展开十年'}
          </button>
        </div>
        {(showAllYears || fullView) && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-foreground">
                  {['年份', '干支', '纳音', '与年命', '十二运', '吉凶', '评分', '标志', '判词'].map((h) => (
                    <th key={h} className="label-mono px-2 py-2 text-[10px] text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.liuNian.map((ln) => (
                  <tr key={ln.year} className="border-b border-border">
                    <td className="px-2 py-2 text-[12px] font-black text-foreground">{ln.year}</td>
                    <td className="px-2 py-2 font-mono text-[11px] font-bold text-foreground">{ln.ganzhi}</td>
                    <td className="px-2 py-2 text-[11px] font-black" style={{ color: ELEMENT_COLORS[ln.entry.element] }}>{ln.entry.name}</td>
                    <td className="px-2 py-2 text-[10px] font-bold" style={{ color: toneColor(relationTone(ln.relation)) }}>{ln.relationLabel}</td>
                    <td className="px-2 py-2 text-[10px] font-bold text-muted-foreground">{ln.stage}{ln.badStage ? ' · 忌' : ''}</td>
                    <td className="px-2 py-2"><FortuneBadge fortune={ln.fortune} /></td>
                    <td className="px-2 py-2 text-[10px] font-black tabular-nums" style={{ color: toneColor(ln.fortune) }}>
                      {ln.fortuneScore >= 0 ? '+' : ''}{ln.fortuneScore.toFixed(1)}
                    </td>
                    <td className="px-2 py-2"><MarkerBadges markers={ln.markers} /></td>
                    <td className="px-2 py-2 text-[10px] leading-relaxed text-muted-foreground">{ln.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
