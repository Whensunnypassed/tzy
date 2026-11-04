import { judgeZalu, type ZaluVerdict } from '@/analysis/zalu/judge';
import type { BaZiChart } from '@/analysis/common/baziCalculator';

interface DaYunLike {
  stem: string;
  branch: string;
  startAge: number;
  startYear: number;
  endYear: number;
  fortune: string;
  displayScore: number;
  description: string;
}

interface ZaluProps {
  chart: BaZiChart;
  analysis?: {
    daYunAnalysis?: {
      daYunWithFortune: DaYunLike[];
      currentDaYunIndex: number;
    };
  };
}

const SECTIONS = [
  { no: '01', en: 'VERDICT', title: '总断' },
  { no: '02', en: 'ACADEMIC', title: '学业' },
  { no: '03', en: 'LOVE', title: '爱情' },
  { no: '04', en: 'WEALTH', title: '财富' },
  { no: '05', en: 'FORTUNE', title: '行运' },
] as const;

/** 与阴阳线同一套版块头：编号 / EN + 竖线 + 中文 */
function SectionHead({ no, en, title }: { no: string; en: string; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border pb-3">
      <span className="label-mono text-primary">{no} / {en}</span>
      <span className="h-3 w-px bg-border" />
      <span className="text-sm font-bold tracking-[0.15em]">{title}</span>
    </div>
  );
}

const STEM_EL: Record<string, string> = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const GEN: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CTRL: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const YANG = new Set('甲丙戊庚壬子寅辰午申戌');

const tenGod = (me: string, other: string) => {
  const a = STEM_EL[me], b = STEM_EL[other];
  const same = YANG.has(me) === YANG.has(other);
  if (a === b) return same ? '比肩' : '劫财';
  if (GEN[a] === b) return same ? '食神' : '伤官';
  if (CTRL[a] === b) return same ? '偏财' : '正财';
  if (CTRL[b] === a) return same ? '七杀' : '正官';
  return same ? '偏印' : '正印';
};

const fortuneHint = (god: string, gender: 'male' | 'female') => {
  if (/印/.test(god)) return '学业有靠，财宜守';
  if (/官/.test(god)) return gender === 'female' ? '名位与感情同动' : '名位上升，感情次之';
  if (/财/.test(god)) return gender === 'male' ? '财务与感情同动' : '进财，感情慢';
  if (/食|伤/.test(god)) return '凭技艺吃饭，感情少主动';
  return '同辈拉扯，破财之象';
};

export function ZaluReport({ chart, analysis }: ZaluProps) {
  const v = judgeZalu(chart);
  const duns = analysis?.daYunAnalysis?.daYunWithFortune ?? [];
  const current = analysis?.daYunAnalysis?.currentDaYunIndex ?? 0;
  const cards: ZaluVerdict[] = [v.xueye, v.aiqing, v.caifu];

  return (
    <div className="space-y-5">
      <section className="border border-border bg-card p-4 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-foreground pb-4">
          <div>
            <p className="label-mono text-muted-foreground">ZALU LINE / 大杂烩线</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">断法</h2>
          </div>
          <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
            各派取一条能落成规则的判据，搓成一条线：只用四柱，判学业、爱情、财富。
          </p>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <SectionHead {...SECTIONS[0]} />
            <div className="mt-4 grid gap-px border border-border bg-border md:grid-cols-3">
              {cards.map((c) => (
                <article key={c.title} className="bg-card p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="label-mono text-muted-foreground">{c.title}</p>
                    <span className="num-tabular text-[11px] text-muted-foreground">{c.score}</span>
                  </div>
                  <p className="mt-1 text-2xl font-black tracking-tight">{c.level}</p>
                  <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{c.caveat}</p>
                </article>
              ))}
            </div>
          </div>

          {cards.map((c) => (
            <div key={c.title}>
              <SectionHead no={SECTIONS[cards.indexOf(c) + 1].no} en={SECTIONS[cards.indexOf(c) + 1].en} title={c.title} />
              <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="border border-border p-4">
                  <p className="label-mono text-muted-foreground">结论</p>
                  <p className="mt-1 text-3xl font-black tracking-tight">{c.level}</p>
                  <p className="num-tabular mt-2 text-[11px] text-muted-foreground">分 {c.score}</p>
                </div>
                <div className="border border-border p-4">
                  <p className="label-mono text-muted-foreground">依据 / BASIS</p>
                  <ul className="mt-2 space-y-2 text-[12px] leading-relaxed">
                    {c.lines.map((line) => (
                      <li key={line} className="border-l-2 border-primary/40 pl-3">{line}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[10px] text-muted-foreground">{c.caveat}</p>
                </div>
              </div>
            </div>
          ))}

          <div>
            <SectionHead {...SECTIONS[4]} />
            {duns.length === 0 ? (
              <p className="mt-4 text-[11px] text-muted-foreground">需要出生年份才能排大运；本页暂未接入。</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 font-normal">大运</th>
                      <th className="py-2 pr-4 font-normal">年龄</th>
                      <th className="py-2 pr-4 font-normal">年份</th>
                      <th className="py-2 pr-4 font-normal">十神</th>
                      <th className="py-2 font-normal">对三判的影响</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duns.slice(0, 8).map((d, i) => {
                      const god = tenGod(chart.day.stem, d.stem);
                      return (
                        <tr key={`${d.stem}${d.branch}`} className={`border-b border-border/70 ${i === current ? 'bg-accent/40' : ''}`}>
                          <td className="py-2.5 pr-4 text-[13px] font-black">
                            {d.stem}{d.branch}
                            {i === current ? <span className="label-mono ml-1 text-primary">当前</span> : null}
                          </td>
                          <td className="py-2.5 pr-4 text-foreground/80">{d.startAge}–{d.startAge + 9} 岁</td>
                          <td className="py-2.5 pr-4 text-foreground/80">{d.startYear}–{d.endYear}</td>
                          <td className="py-2.5 pr-4 text-foreground/80">{god}</td>
                          <td className="py-2.5 text-foreground/80">{fortuneHint(god, chart.gender)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-[10px] text-muted-foreground">
            <span>取：子平印星 · 真诠月令 · 通会财官 · 宫位 · 冲合</span>
            <span>舍：神煞 · 纳音 · 寿夭</span>
          </div>
        </div>
      </section>
    </div>
  );
}
