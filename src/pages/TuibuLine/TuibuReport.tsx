import type { BaZiChart } from '@/analysis/common/baziCalculator';
import type { YinyangAnalysis } from '@/analysis/common/context';
import { computeTaiJiQi } from '@/analysis/yinyang/engine';
import {
  PRIOR,
  TERM_MONTHS,
  boundaryHint,
  parseMinutes,
  buildSanYuan,
  buildTuibuFrame,
  gregorianYearBranch,
  type TermMonth,
} from '@/analysis/tuibu';

/**
 * 推步线 · P1（L0 已接）
 *
 * 已接入：prior.ts —— 十二消息卦先验曲线，只作归一化分母与「偏离常气」参照。
 * 未接入：L1 三元、L2 相位、L3 二气判据、L4 触发。
 *
 * 接入顺序（闸门制，过关才进下一层）：
 *   P1 prior.ts    L0 消息卦先验 → 只作归一化分母   ✅
 *   P2 sanyuan.ts  L1 三元三出口 → 只作结构承载
 *   P3 phase.ts    L2 天地盘相位指纹 → 只作展示
 *   P4 trigger.ts  L4 双尺度时窗 → 只作标签，不进总分
 */

const LAYERS = [
  {
    no: 'L0',
    title: '常气 · 先验',
    src: '周易 · 十二消息卦',
    body: '月令相位落在年周期上的基线阳阴量与斜率，按节气取 12 锚点插值。只作归一化分母与「偏离常气」的参照。',
    state: '已接入 prior.ts',
  },
  {
    no: 'L1',
    title: '承载 · 结构',
    src: '李虚中 · 三元',
    body: '干禄（名禄贵权）、支命（金珠积富）、身（材能器识与人伦）三出口并列；胎、月、日、时十分制权重入宫位。身不产气量。',
    state: '已接入 sanyuan.ts',
  },
  {
    no: 'L2',
    title: '相位 · 时刻',
    src: '大六壬 · 月将加时',
    body: 'k =（月将 − 占时）mod 12 的相位指纹，以及该 k 下十二宫生克合冲刑害破的分布。只作时刻标记。',
    state: '已接入 phase.ts',
  },
  {
    no: 'L3',
    title: '判据 · 二气',
    src: '方案B 气存量',
    body: '本线唯一的判据：阳阴配比 S、用忌方向、偏离常气 Δ。全链路只许有一个判据源，各术不得自出吉凶。',
    state: '复用引擎 taiji 口径',
  },
  {
    no: 'L4',
    title: '触发 · 应期',
    src: '六爻 · 月建日辰',
    body: '大运（慢）/ 流年（快）/ 月建（更快）双尺度时窗，旬空、月破、暗动、回头生克只挂标记，永不并入总分。',
    state: '已接入 trigger.ts',
  },
] as const;

const RULES = [
  '单一判据源：吉凶只由 L3 出，任何一层想直接给吉凶，架构上即拒绝。',
  '标记不进总分：旬空、月破、天将、课体、神煞只作标记。',
  '先验不作断语：消息卦曲线只做分母，残差 Δ 可作指标，不得单独成句。',
  '同名同事实只算一次：刑冲合害由八字层算，六壬层只引用不计权；纳音不独立成气。',
  '层级物理隔离：判据 / 修饰 / 触发 / 标记分文件，带 uncertainty 字段，可单独替换与证伪。',
  '名实一致：三线是三个口径，不是三套命理；推步线不新增第四套算法。',
];

function isTermMonth(value: string): value is TermMonth {
  return (TERM_MONTHS as readonly string[]).includes(value);
}

/** 月建 → 本月已过的中气（月将换将依据）。 */
const ZHONG_QI_BY_MONTH: Record<string, string> = {
  寅: '雨水', 卯: '春分', 辰: '谷雨', 巳: '小满', 午: '夏至', 未: '大暑',
  申: '处暑', 酉: '秋分', 戌: '霜降', 亥: '小雪', 子: '冬至', 丑: '大寒',
};

const ELEMENT_CN: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };

export default function TuibuReport({ chart, analysis }: { chart: BaZiChart | null; analysis: YinyangAnalysis | null }) {
  const pillars = chart
    ? [
        { label: '年柱', stem: chart.year.stem, branch: chart.year.branch },
        { label: '月柱', stem: chart.month.stem, branch: chart.month.branch },
        { label: '日柱', stem: chart.day.stem, branch: chart.day.branch },
        { label: '时柱', stem: chart.hour.stem, branch: chart.hour.branch },
      ]
    : [];

  const monthBranch = chart?.month.branch ?? '';
  const anchor = isTermMonth(monthBranch) ? PRIOR.anchorOf(monthBranch) : null;
  const trueSolarMinutes = parseMinutes(chart?.birthInfo.trueSolarTime);
  const edge = trueSolarMinutes === null ? null : boundaryHint(trueSolarMinutes);

  // L1–L4：结构、相位、判据、触发（判据走 taiji 口径，全链路同源）
  const sanYuan = chart ? buildSanYuan(chart) : null;
  const zhongQi = chart ? (ZHONG_QI_BY_MONTH[chart.month.branch] ?? null) : null;
  const frame = chart
    ? buildTuibuFrame(chart, {
        zhongQi: zhongQi ?? undefined,
        transitBranch: gregorianYearBranch(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
      })
    : null;
  const taiJi = chart && analysis ? computeTaiJiQi(chart, analysis.monthQi) : null;
  const useText = analysis ? analysis.yongJi.usefulElements.map((el) => ELEMENT_CN[el] ?? el).join('、') : '';
  const tabooText = analysis ? analysis.yongJi.tabooElements.map((el) => ELEMENT_CN[el] ?? el).join('、') : '';

  return (
    <div className="space-y-5">
      {/* 线头 */}
      <div className="border-2 border-foreground bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-5 py-4 md:px-8">
          <div>
            <div className="label-mono text-primary">TUIBU LINE / 推步线</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground md:text-3xl">推 步 线</h2>
          </div>
          <div className="label-mono text-muted-foreground">COMPUTING THE QI · P1–P3 / L0–L4</div>
        </div>
        <div className="px-5 py-4 md:px-8 md:py-5">
          <p className="max-w-3xl text-[12px] font-bold leading-relaxed text-foreground/80 md:text-[13px]">
            推步者，步算天时以知来也。本线以月令太极二气之消长为唯一判据，用三元结构承载，
            借消息卦定先验、借六爻定应期，以可回测为验。
          </p>
        </div>
      </div>

      {/* 状态声明 */}
      <div className="border-l-4 border-primary bg-card px-5 py-4 md:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="label-mono text-primary">STATUS / P3</span>
          <span className="text-[12px] font-bold text-foreground">
            L0–L4 已接入；判据走 taiji 口径，全链路同源（格局、富贵、大运均只读这一个方向）。
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          48 项性质自检通过（先验曲线、时辰边界、胎元、相位、触发、古地名、古历窗口、适配器）。
          仍不判寿夭、不背书具体事件；吉凶只由 L3 出，其余各层只标不入分。
        </p>
      </div>

      {/* L0 先验读数（真实排盘） */}
      <div className="border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 md:px-8">
          <span className="label-mono text-primary">L0 常气 / PRIOR CURVE</span>
          <span className="h-3 w-px bg-border" />
          <span className="label-mono text-muted-foreground">只作归一化分母 · 不作断语</span>
        </div>

        {anchor ? (
          <>
            <div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-5 md:divide-y-0">
              <div className="px-4 py-4 md:px-5">
                <div className="label-mono text-muted-foreground">月建 / 节气月</div>
                <div className="mt-1 text-2xl font-black text-foreground">
                  {anchor.termMonth}
                  <span className="ml-2 text-sm font-bold text-muted-foreground">消息卦 · {anchor.gua}</span>
                </div>
              </div>
              <div className="px-4 py-4 md:px-5">
                <div className="label-mono text-muted-foreground">先验阳量</div>
                <div className="mt-1 text-2xl font-black text-foreground">
                  {anchor.yangQty}
                  <span className="ml-1 text-sm font-bold text-muted-foreground">/ 6</span>
                </div>
              </div>
              <div className="px-4 py-4 md:px-5">
                <div className="label-mono text-muted-foreground">先验阴量</div>
                <div className="mt-1 text-2xl font-black text-foreground">
                  {anchor.yinQty}
                  <span className="ml-1 text-sm font-bold text-muted-foreground">/ 6</span>
                </div>
              </div>
              <div className="px-4 py-4 md:px-5">
                <div className="label-mono text-muted-foreground">斜率 / 进退休</div>
                <div className="mt-1 text-2xl font-black text-foreground">
                  {anchor.dYangPerMonth > 0 ? '+' : ''}
                  {anchor.dYangPerMonth}
                  <span className="ml-2 text-sm font-bold text-muted-foreground">
                    {anchor.dYangPerMonth > 0 ? '进' : '退'}
                  </span>
                </div>
              </div>
              <div className="px-4 py-4 md:px-5">
                <div className="label-mono text-muted-foreground">时节位置</div>
                <div className="mt-1 text-sm font-bold leading-snug text-foreground">
                  节气点读数
                  <div className="label-mono mt-0.5 text-muted-foreground">月内插值待接入</div>
                </div>
              </div>
            </div>

            {/* 十二消息卦条带 */}
            <div className="border-t border-border px-3 py-4 md:px-5">
              <div className="grid grid-cols-6 gap-1 md:grid-cols-12">
                {PRIOR.anchors.map((item) => {
                  const active = item.termMonth === anchor.termMonth;
                  return (
                    <div
                      key={item.termMonth}
                      className={`border px-1 py-2 text-center ${
                        active ? 'border-2 border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className={`text-sm font-black ${active ? 'text-primary' : 'text-foreground'}`}>
                        {item.termMonth}
                      </div>
                      <div className="label-mono mt-0.5 text-muted-foreground">{item.gua}</div>
                      <div className="mt-1.5 flex h-1.5 overflow-hidden">
                        <span className="block bg-[hsl(28_82%_48%)]" style={{ width: `${(item.yangQty / 6) * 100}%` }} />
                        <span className="block bg-[hsl(215_55%_38%)]" style={{ width: `${(item.yinQty / 6) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                上排＝十二消息卦（复 → 乾 → 姤 → 坤），橙＝阳量、靛＝阴量，恒和为 6。当前月建以朱框标出；
                读的是「命局落在年周期的哪一相位」，不是吉凶。
              </p>
            </div>
          </>
        ) : (
          <div className="px-5 py-8 text-center text-[12px] font-bold text-muted-foreground md:px-8">
            输入出生信息并排盘后，此处显示 L0 先验读数。
          </div>
        )}
      </div>

      {/* 已排盘时的四柱底座（只陈述，不判读） */}
      {chart && (
        <div className="border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="label-mono text-muted-foreground">命盘底座 / FOUNDATION</span>
            <span className="label-mono text-muted-foreground">真太阳时 {chart.birthInfo.trueSolarTime}</span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-border">
            {pillars.map((p) => (
              <div key={p.label} className="px-3 py-4 text-center md:px-6">
                <div className="label-mono text-muted-foreground">{p.label}</div>
                <div className="mt-1.5 text-2xl font-black tracking-wider text-foreground md:text-3xl">
                  {p.stem}
                  {p.branch}
                </div>
              </div>
            ))}
          </div>
          {edge && (
            <div
              className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t px-5 py-3 md:px-8 ${
                edge.ambiguous ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <span className={`label-mono ${edge.ambiguous ? 'text-primary' : 'text-muted-foreground'}`}>
                时辰边界 / HOUR EDGE
              </span>
              <span className="text-[11px] font-bold text-foreground/80">{edge.note}</span>
            </div>
          )}
        </div>
      )}

      {/* L1 三元结构（只陈述，不产气） */}
      {sanYuan && (
        <div className="border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 md:px-8">
            <span className="label-mono text-primary">L1 三元 / SAN YUAN</span>
            <span className="h-3 w-px bg-border" />
            <span className="label-mono text-muted-foreground">干禄 · 支命 · 身 · 不产气量</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
            <div className="bg-card px-4 py-4 md:px-5">
              <div className="label-mono text-muted-foreground">胎元</div>
              <div className="mt-1 text-2xl font-black tracking-wider text-foreground">
                {sanYuan.taiYuan.stem}{sanYuan.taiYuan.zhi}
              </div>
              <div className="label-mono mt-1 text-muted-foreground">权重 {sanYuan.weights.tai}</div>
            </div>
            <div className="bg-card px-4 py-4 md:px-5">
              <div className="label-mono text-muted-foreground">干禄 / 名禄贵权</div>
              <div className="mt-1 text-sm font-black leading-relaxed text-foreground">
                {sanYuan.lu.value.map((item) => `${item.gan}→${item.luZhi}`).join('　')}
              </div>
              <div className="label-mono mt-1 text-muted-foreground">四干禄位</div>
            </div>
            <div className="bg-card px-4 py-4 md:px-5">
              <div className="label-mono text-muted-foreground">支命 / 金珠积富</div>
              <div className="mt-1 text-2xl font-black tracking-wider text-foreground">
                {sanYuan.ming.value.join('')}
              </div>
              <div className="label-mono mt-1 text-muted-foreground">月支藏干</div>
            </div>
            <div className="bg-card px-4 py-4 md:px-5">
              <div className="label-mono text-muted-foreground">身 / 材能器识</div>
              <div className="mt-1 text-2xl font-black tracking-wider text-foreground">{sanYuan.shen.value.zhi}</div>
              <div className="label-mono mt-1 text-muted-foreground">{sanYuan.shen.value.palace} · 待考口径</div>
            </div>
          </div>
          <p className="border-t border-border px-5 py-3 text-[10px] leading-relaxed text-muted-foreground md:px-8">
            李虚中四柱权重：胎 {sanYuan.weights.tai} / 月 {sanYuan.weights.month} / 日 {sanYuan.weights.day} / 时 {sanYuan.weights.hour}。
            本项目不搬纳音本体，「身」以日支宫位承载并标为低置信，只作结构展示。
          </p>
        </div>
      )}

      {/* L2 相位（时刻指纹，只作标记） */}
      {frame?.phase && (
        <div className="border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 md:px-8">
            <span className="label-mono text-primary">L2 相位 / MONTH GENERAL</span>
            <span className="h-3 w-px bg-border" />
            <span className="label-mono text-muted-foreground">月将加时 · k 指纹 · 不判吉凶</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
            <div className="bg-card px-4 py-4 md:px-5">
              <div className="label-mono text-muted-foreground">中气 / 月将</div>
              <div className="mt-1 text-2xl font-black text-foreground">
                {frame.phase.general}
                <span className="ml-2 text-sm font-bold text-muted-foreground">{frame.phase.zhongQi}</span>
              </div>
            </div>
            <div className="bg-card px-4 py-4 md:px-5">
              <div className="label-mono text-muted-foreground">k = 将 − 时</div>
              <div className="mt-1 text-2xl font-black text-foreground">
                {frame.phase.k}
                <span className="ml-2 text-sm font-bold text-muted-foreground">{frame.phase.profile.name}</span>
              </div>
            </div>
            <div className="bg-card px-4 py-4 md:px-5">
              <div className="label-mono text-muted-foreground">四课</div>
              <div className="mt-1 font-mono text-sm font-bold leading-relaxed text-foreground">
                {frame.phase.lessons.one} / {frame.phase.lessons.two} / {frame.phase.lessons.three} / {frame.phase.lessons.four}
              </div>
            </div>
            <div className="bg-card px-4 py-4 md:px-5">
              <div className="label-mono text-muted-foreground">结构性质</div>
              <div className="mt-1 text-[11px] font-bold leading-relaxed text-foreground/80">{frame.phase.profile.note}</div>
            </div>
          </div>
          <p className="border-t border-border px-5 py-3 text-[10px] leading-relaxed text-muted-foreground md:px-8">
            月将按中气换将；k=0 伏吟、k=6 返吟是参数化端点，不是特例。天将、课体、类神一律不进本层。
          </p>
        </div>
      )}

      {/* L3 判据（唯一吉凶出口） */}
      {analysis && taiJi && (
        <div className="border-2 border-primary bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-primary px-5 py-3 md:px-8">
            <span className="label-mono text-primary">L3 判据 / ONLY JUDGEMENT</span>
            <span className="h-3 w-px bg-border" />
            <span className="label-mono text-muted-foreground">月令太极二气 · taiji 口径 · 全链路同源</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
            <div className="bg-card px-4 py-4 md:px-5">
              <div className="label-mono text-muted-foreground">阳量 / 阴量</div>
              <div className="mt-1 text-2xl font-black text-foreground">
                {Math.round(taiJi.yangQi)}
                <span className="mx-1 text-sm text-muted-foreground">/</span>
                {Math.round(taiJi.yinQi)}
              </div>
              <div className="label-mono mt-1 text-muted-foreground">{taiJi.band} · 差 {(taiJi.balance / Math.max(taiJi.yangQi + taiJi.yinQi, 1) * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-card px-4 py-4 md:px-5">
              <div className="label-mono text-muted-foreground">判据方向</div>
              <div className={`mt-1 text-2xl font-black ${analysis.direction === 'yin' ? 'text-[hsl(215_55%_38%)]' : 'text-[hsl(28_82%_48%)]'}`}>
                {analysis.direction === 'yin' ? '用阴' : '用阳'}
              </div>
              <div className="label-mono mt-1 text-muted-foreground">{analysis.directionSource === 'taiji' ? '二气配比' : '逐月固化'}</div>
            </div>
            <div className="bg-card px-4 py-4 md:px-5">
              <div className="label-mono text-muted-foreground">用神 / 忌神</div>
              <div className="mt-1 text-lg font-black leading-relaxed">
                <span className="text-[#2E7654]">{useText || '—'}</span>
                <span className="mx-2 text-muted-foreground">/</span>
                <span className="text-primary">{tabooText || '—'}</span>
              </div>
            </div>
            <div className="bg-card px-4 py-4 md:px-5">
              <div className="label-mono text-muted-foreground">格局 / 富贵</div>
              <div className="mt-1 text-[11px] font-bold leading-relaxed text-foreground/80">
                {analysis.pattern?.description ? analysis.pattern.description.slice(0, 46) : '—'}
              </div>
              <div className="label-mono mt-1 text-muted-foreground">判读层不发背书</div>
            </div>
          </div>
          <p className="border-t border-primary px-5 py-3 text-[10px] leading-relaxed text-muted-foreground md:px-8">
            {taiJi.verdict}
          </p>
        </div>
      )}

      {/* L4 触发窗口（只标不进分） */}
      {frame && (
        <div className="border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 md:px-8">
            <span className="label-mono text-primary">L4 触发 / WINDOWS</span>
            <span className="h-3 w-px bg-border" />
            <span className="label-mono text-muted-foreground">流年支照四柱 · 只标不进分</span>
          </div>
          {frame.triggers.length > 0 ? (
            <ul className="divide-y divide-border">
              {frame.triggers.map((marker, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 md:px-8">
                  <span className="min-w-10 text-sm font-black text-foreground">
                    {marker.target === 'year' ? '年' : marker.target === 'month' ? '月' : marker.target === 'day' ? '日' : '时'}支
                  </span>
                  <span className="label-mono text-primary">{marker.kind}</span>
                  <span className="text-[11px] text-foreground/80">
                    {marker.natalBranch} × {marker.transitBranch}
                  </span>
                  <span className="label-mono text-muted-foreground">{marker.confidence}</span>
                  <span className="w-full text-[10px] leading-relaxed text-muted-foreground md:w-auto">{marker.note}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-6 text-center text-[12px] font-bold text-muted-foreground md:px-8">
              今岁流年支与四柱无冲合害刑，本层无窗口标记。
            </div>
          )}
        </div>
      )}

      {/* 五层供养图 */}
      <div className="border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3 md:px-8">
          <span className="label-mono text-primary">五层供养 / SUPPLY CHAIN</span>
          <span className="h-3 w-px bg-border" />
          <span className="label-mono text-muted-foreground">四术各守一层，全部单向下灌</span>
        </div>
        <div className="divide-y divide-border">
          {LAYERS.map((layer) => (
            <div key={layer.no} className="grid gap-2 px-5 py-4 md:grid-cols-[64px_1fr_180px] md:items-start md:gap-6 md:px-8">
              <div>
                <div className={`text-lg font-black tracking-tight ${layer.no === 'L3' ? 'text-primary' : 'text-foreground'}`}>
                  {layer.no}
                </div>
                <div className="label-mono mt-0.5 text-muted-foreground">{layer.state}</div>
              </div>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-sm font-black text-foreground">{layer.title}</span>
                  <span className="label-mono text-muted-foreground">{layer.src}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground md:text-[12px]">{layer.body}</p>
              </div>
              <div className="label-mono text-muted-foreground md:text-right">
                {layer.no === 'L3' ? 'ONLY JUDGEMENT' : 'NO JUDGEMENT'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 六条硬规则 */}
      <div className="border border-border bg-card">
        <div className="border-b border-border px-5 py-3 md:px-8">
          <span className="label-mono text-primary">防偏离六条 / ANTI-DRIFT RULES</span>
        </div>
        <ol className="divide-y divide-border">
          {RULES.map((rule, i) => (
            <li key={i} className="flex gap-4 px-5 py-3 md:px-8">
              <span className="label-mono mt-0.5 shrink-0 text-primary">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-[11px] font-bold leading-relaxed text-foreground/80 md:text-[12px]">{rule}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
