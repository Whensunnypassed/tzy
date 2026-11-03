import {
  ZODIAC_SIGNS,
  ZODIAC_SIGNS_EN,
  formatArc,
  SIGN_ASPECT_NAMES,
  type AstroChart,
} from '@/analysis/peiran/astroChart';
import { ZodiacTile } from '@/components/astrology/ZodiacGlyphs';
import {
  DEGREE_ASPECT_LABELS,
  MOTION_LABELS,
  ORIENTALITY_LABELS,
  SOLAR_STATE_LABELS,
  SPEED_LABELS,
  PLANET_NAMES_ZH,
  type PeiranModel,
  type Planet,
} from '@/analysis/peiran';

// ============================================================
// 沛然堂线 · 希腊占星
// ------------------------------------------------------------
// 面向用户只保留两块基础内容：星盘（上升 / 中天 / 宗派）与十二宫图。
// 其余专业数据（七政状态、尊贵、虚点、阿拉伯点、相位、时间主星）
// 收进页尾的「详细数据」，默认折叠。
// 判读模块（性格 / 事业 / 财富 / 关系 / 健康 / 流年）以占位卡呈现。
// ============================================================

const PLANET_ORDER: readonly Planet[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

/** 未来判读模块的占位 */
const PLACEHOLDERS = [
  { title: '性格与天赋', en: 'TEMPERAMENT', hint: '宗派、发光体与上升主星' },
  { title: '事业与地位', en: 'CAREER', hint: '中天、十宫与年主星' },
  { title: '财富与资源', en: 'WEALTH', hint: '福点、二宫与木星' },
  { title: '关系与婚姻', en: 'RELATIONSHIP', hint: '七宫、金星与婚姻点' },
  { title: '健康与体质', en: 'HEALTH', hint: '六宫、上升与月亮' },
  { title: '流年与应期', en: 'ANNUAL', hint: '推运、黄道释放与返照' },
] as const;

function Section({
  no,
  title,
  en,
  meta,
  children,
}: {
  no: string;
  title: string;
  en: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="cosmos-panel line-switch">
      <div className="cosmos-panel-head">
        <div className="cosmos-rule mb-3">
          <span className="cosmos-rule-diamond" />
        </div>
        <div className="cosmos-panel-no">{no} · {en}</div>
        <div className="cosmos-panel-title">{title}</div>
        {meta && <div className="cosmos-panel-en">{meta}</div>}
      </div>
      {children}
    </div>
  );
}

/** 折叠版块：默认收起，点标题展开 */
function FoldSection({
  no,
  title,
  en,
  meta,
  children,
}: {
  no: string;
  title: string;
  en: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="cosmos-panel group line-switch">
      <summary className="cosmos-panel-head block cursor-pointer list-none select-none transition-colors hover:bg-[rgba(217,179,106,0.06)]">
        <div className="cosmos-panel-no">{no} · {en}</div>
        <div className="cosmos-panel-title">{title}</div>
        <div className="cosmos-panel-en">
          {meta ? `${meta} · ` : ''}
          <span className="text-primary opacity-80 group-open:hidden">展开</span>
          <span className="hidden text-primary opacity-80 group-open:inline">收起</span>
        </div>
      </summary>
      {children}
    </details>
  );
}

function KeyValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-1.5 last:border-b-0">
      <span className="label-mono text-muted-foreground">{label}</span>
      <span className={`cosmos-prose !text-sm font-semibold ${mono ? 'num-tabular' : ''}`}>{value}</span>
    </div>
  );
}

export default function PeiranReport({ model }: { model: PeiranModel | null }) {
  if (!model) {
    return (
      <div className="cosmos-panel line-switch p-6 md:p-10">
        <div className="cosmos-rule mb-4">
          <span className="cosmos-rule-diamond" />
        </div>
        <div className="cosmos-title text-[10px]">PEIRAN LINE · HELLENISTIC</div>
        <h2 className="cosmos-title mt-3 text-3xl md:text-4xl">等 待 排 盘</h2>
        <p className="cosmos-subtitle mt-3 text-[12px] leading-loose">
          请在上方填写出生日期、时刻与出生城市
        </p>
      </div>
    );
  }

  const chart: AstroChart = model.chart;
  const dignities = model.dignities;
  const states = model.planetStates;

  const bodiesByHouse = (house: number): string[] =>
    PLANET_ORDER.filter((p) => chart.bodies[p].house === house).map((p) => PLANET_NAMES_ZH[p]);

  return (
    <div className="space-y-6">
      {/* 入场公告 */}
      <div className="rise-in">
        <div className="cosmos-rule">
          <span className="cosmos-rule-diamond" />
        </div>
        <div className="cosmos-title mt-4 text-[10px] md:text-[11px]">
          ΚΑΤΑΣΤΑΣΙΣ · THE HELLENISTIC CHART
        </div>
        <h2 className="cosmos-title mt-2 text-3xl leading-tight md:text-5xl">星 盘</h2>
        <p className="cosmos-subtitle mt-3 text-[11px] leading-loose md:text-[12px]">
          {chart.city.key} · {chart.sect === 'diurnal' ? '昼盘' : '夜盘'} · 整宫制
        </p>
        <div className="cosmos-rule mt-4">
          <span className="cosmos-rule-diamond" />
        </div>
      </div>

      {/* 01 星盘基础 */}
      <Section
        no="01"
        title="星盘基础"
        en="CHART"
        meta={`${chart.city.key} · ${chart.city.lat.toFixed(2)}°N ${Math.abs(chart.city.lon).toFixed(2)}°${chart.city.lon >= 0 ? 'E' : 'W'}`}
      >
        <div className="grid gap-6 p-4 md:grid-cols-2 md:p-6">
          <div>
            <KeyValue
              label="当地时刻 / LOCAL"
              value={`${chart.local.year}-${String(chart.local.month).padStart(2, '0')}-${String(chart.local.day).padStart(2, '0')} ${String(chart.local.hour).padStart(2, '0')}:${String(chart.local.minute).padStart(2, '0')}`}
              mono
            />
            <KeyValue
              label="世界时 / UTC"
              value={`${chart.utc.year}-${String(chart.utc.month).padStart(2, '0')}-${String(chart.utc.day).padStart(2, '0')} ${String(chart.utc.hour).padStart(2, '0')}:${String(chart.utc.minute).padStart(2, '0')}`}
              mono
            />
            <KeyValue label="宗派 / SECT" value={chart.sect === 'diurnal' ? '昼盘 · DIURNAL' : '夜盘 · NOCTURNAL'} />
          </div>
          <div>
            <KeyValue label="上升 / ASC" value={`${chart.asc.sign} ${formatArc(chart.asc.lon)}`} />
            <KeyValue label="中天 / MC" value={`${chart.mc.sign} ${formatArc(chart.mc.lon)}`} />
            <KeyValue label="宫制 / HOUSES" value="整宫制 Whole Sign" />
          </div>
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] leading-snug text-muted-foreground md:px-6">
          {chart.timezoneNote}
        </div>
      </Section>

      {/* 02 十二宫位 */}
      <Section no="02" title="十二宫位" en="THE TWELVE HOUSES" meta="WHOLE SIGN">
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:p-6 lg:grid-cols-4">
          {chart.houseSigns.map((signIdx, i) => {
            const house = i + 1;
            return (
              <ZodiacTile
                key={house}
                house={house}
                signIndex={signIdx}
                signName={ZODIAC_SIGNS[signIdx]}
                signEn={ZODIAC_SIGNS_EN[signIdx]}
                bodies={bodiesByHouse(house)}
              />
            );
          })}
        </div>
      </Section>

      {/* 03 判读模块占位 */}
      <Section no="03" title="命理解读" en="READING" meta="COMING SOON">
        <div className="grid gap-3 p-4 sm:grid-cols-2 md:p-6 lg:grid-cols-3">
          {PLACEHOLDERS.map((p) => (
            <div
              key={p.en}
              className="border border-dashed border-border px-4 py-5 text-center"
              style={{ borderColor: 'rgba(217,179,106,0.22)' }}
            >
              <div className="cosmos-panel-no opacity-70">{p.en}</div>
              <div className="cosmos-panel-title mt-1 !text-[15px] opacity-70">{p.title}</div>
              <div className="cosmos-panel-en mt-1">{p.hint}</div>
              <div className="cosmos-panel-en mt-2 !text-[8px] opacity-50">待开放</div>
            </div>
          ))}
        </div>
      </Section>

      {/* 详细数据：全部折叠 */}
      <div className="pt-2">
        <div className="cosmos-rule mb-4">
          <span className="cosmos-rule-diamond" />
        </div>
        <div className="cosmos-title text-[10px]">APPENDIX · 详细数据</div>
        <p className="cosmos-subtitle mt-2 text-[10px] leading-loose opacity-70">
          以下为星盘的技术明细，供进阶查阅
        </p>
      </div>

      {/* 04 七政落座与状态 */}
      <FoldSection no="04" title="七政落座" en="PLANETS" meta="TROPICAL">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {['天体', '星座', '宫位', '庙旺', '三分', '界', '面', '分数', '状态'].map((h) => (
                  <th key={h} className="label-mono px-3 py-2 text-left text-muted-foreground md:px-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLANET_ORDER.map((p) => {
                const d = dignities[p];
                const st = states[p];
                const statusTags: string[] = [];
                if (st.solarState !== 'free') statusTags.push(SOLAR_STATE_LABELS[st.solarState]);
                if (st.orientality !== 'n/a') statusTags.push(ORIENTALITY_LABELS[st.orientality]);
                statusTags.push(MOTION_LABELS[st.motion]);
                statusTags.push(SPEED_LABELS[st.speed]);
                if (st.inJoy) statusTags.push(`喜乐第${st.joyHouse}宫`);
                if (st.inSectHemisphere) statusTags.push('宗派半球');
                return (
                  <tr key={p} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 font-black text-foreground md:px-4">{PLANET_NAMES_ZH[p]}</td>
                    <td className="px-3 py-2 font-bold text-foreground md:px-4">
                      {d.signName} {formatArc(d.lon)}
                    </td>
                    <td className="num-tabular px-3 py-2 text-foreground md:px-4">第 {chart.bodies[p].house} 宫</td>
                    <td className="px-3 py-2 md:px-4">
                      {d.kinds.includes('domicile') ? <span className="label-mono text-[#2E7654]">庙</span> : null}
                      {d.kinds.includes('exaltation') ? <span className="label-mono ml-1 text-[#2E7654]">旺</span> : null}
                      {d.kinds.includes('detriment') ? <span className="label-mono ml-1 text-primary">陷</span> : null}
                      {d.kinds.includes('fall') ? <span className="label-mono ml-1 text-primary">落</span> : null}
                      {d.kinds.includes('peregrine') ? <span className="label-mono ml-1 text-muted-foreground">无</span> : null}
                    </td>
                    <td className="px-3 py-2 md:px-4">
                      {d.kinds.includes('triplicity') ? (
                        <span className="label-mono text-foreground">
                          三分{d.triplicityRole === 'day' ? '·昼主' : d.triplicityRole === 'night' ? '·夜主' : '·参与'}
                        </span>
                      ) : (
                        <span className="label-mono text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 md:px-4">
                      {d.kinds.includes('bound') ? <span className="label-mono text-foreground">界</span> : <span className="label-mono text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 md:px-4">
                      {d.kinds.includes('face') ? <span className="label-mono text-foreground">面</span> : <span className="label-mono text-muted-foreground">—</span>}
                    </td>
                    <td className="num-tabular px-3 py-2 font-bold text-foreground md:px-4">{d.score}</td>
                    <td className="px-3 py-2 text-[11px] font-bold text-muted-foreground md:px-4">{statusTags.join(' · ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </FoldSection>

      {/* 05 七虚点 */}
      <FoldSection no="05" title="七虚点" en="LOTS" meta={chart.sect === 'diurnal' ? '昼盘公式' : '夜盘公式'}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {['虚点', '位置', '宫位'].map((h) => (
                  <th key={h} className="label-mono px-3 py-2 text-left text-muted-foreground md:px-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(model.lots.lots).map((l) => (
                <tr key={l.key} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 font-black text-foreground md:px-4">{l.nameZh}</td>
                  <td className="px-3 py-2 font-bold text-foreground md:px-4">
                    {ZODIAC_SIGNS[l.signIndex]} {formatArc(l.lon)}
                  </td>
                  <td className="num-tabular px-3 py-2 text-foreground md:px-4">第 {l.house} 宫</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FoldSection>

      {/* 06 阿拉伯点 */}
      <FoldSection no="06" title="阿拉伯点" en="ARABIC PARTS" meta="10 点">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {['阿拉伯点', '位置', '宫位'].map((h) => (
                  <th key={h} className="label-mono px-3 py-2 text-left text-muted-foreground md:px-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {model.arabicLots.map((l) => (
                <tr key={l.key} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 md:px-4">
                    <span className="text-sm font-black text-foreground">{l.nameZh}</span>
                    {l.genderUndetermined && (
                      <span className="label-mono ml-2 text-[9px] text-primary">仅参考</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-bold text-foreground md:px-4">
                    {ZODIAC_SIGNS[l.signIndex]} {formatArc(l.lon)}
                  </td>
                  <td className="num-tabular px-3 py-2 text-foreground md:px-4">第 {l.house} 宫</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FoldSection>

      {/* 07 相位 */}
      <FoldSection
        no="07"
        title="相位"
        en="ASPECTS"
        meta={`${model.degreeAspects.length} 组度相位 · ${model.aversions.length} 组映照`}
      >
        <div className="grid gap-[1px] bg-border sm:grid-cols-2 lg:grid-cols-3">
          {model.degreeAspects.map((a) => (
            <div key={`${a.a}-${a.b}-${a.type}`} className="bg-card px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-black text-foreground">
                  {a.labelA} — {a.labelB}
                </span>
                <span className="label-mono text-muted-foreground">{a.actual.toFixed(2)}°</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                <span
                  className="label-mono"
                  style={{ color: a.type === 'opposition' || a.type === 'square' ? 'var(--primary)' : '#2E7654' }}
                >
                  {DEGREE_ASPECT_LABELS[a.type]}
                </span>
                <span className="label-mono text-[9px] text-muted-foreground">
                  {a.applying ? '入相' : '出相'}
                </span>
              </div>
            </div>
          ))}
        </div>
        {model.aversions.length > 0 && (
          <div className="border-t border-border px-4 py-3 md:px-6">
            <div className="label-mono mb-2 text-muted-foreground">映照 / AVERSION</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-foreground">
              {model.aversions.map((v) => (
                <span key={`${v.a}-${v.b}`}>
                  {v.labelA} — {v.labelB}
                </span>
              ))}
            </div>
          </div>
        )}
      </FoldSection>

      {/* 08 时间主星 */}
      <FoldSection no="08" title="时间主星" en="TIME LORDS" meta={`当前 ${model.age} 岁`}>
        <div className="grid gap-6 p-4 md:grid-cols-2 md:p-6">
          <div>
            <div className="label-mono mb-2 text-muted-foreground">周年推运 / PROFECTIONS</div>
            <KeyValue label="推运宫位" value={`第 ${model.profections.house} 宫`} mono />
            <KeyValue label="推运星座" value={model.profections.signName} />
            <KeyValue label="年主星" value={model.profections.lordName} />
          </div>
          <div>
            <div className="label-mono mb-2 text-muted-foreground">法尔达利亚 / FIRDARIA</div>
            <KeyValue
              label="当前主期"
              value={model.currentFirdaria ? `${model.currentFirdaria.lordName}（${model.currentFirdaria.startAge.toFixed(1)}–${model.currentFirdaria.endAge.toFixed(1)} 岁）` : '—'}
            />
          </div>
        </div>
        <div className="border-t border-border p-4 md:p-6">
          <div className="label-mono mb-2 text-muted-foreground">
            黄道释放 / ZODIACAL RELEASING（自{model.zodiacalReleasing.startLot === 'fortune' ? '福点' : '精神点'}释放）
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['星座', '主星', '起始', '结束', '标记'].map((h) => (
                    <th key={h} className="label-mono px-3 py-2 text-left text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.zodiacalReleasing.level1.map((p) => (
                  <tr key={`${p.level}-${p.signIndex}-${p.startDays}`} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 font-bold text-foreground">{p.signName}</td>
                    <td className="px-3 py-2 text-foreground">{p.lordName}</td>
                    <td className="num-tabular px-3 py-2 text-[11px] text-muted-foreground">{p.startUtc.year}-{String(p.startUtc.month).padStart(2, '0')}</td>
                    <td className="num-tabular px-3 py-2 text-[11px] text-muted-foreground">{p.endUtc.year}-{String(p.endUtc.month).padStart(2, '0')}</td>
                    <td className="px-3 py-2">
                      {p.isPeak && <span className="label-mono text-primary">PEAK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="border-t border-border p-4 md:p-6">
          <div className="label-mono mb-2 text-muted-foreground">
            太阳返照 / SOLAR RETURN（{model.solarReturn.utc.year} 年）
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <KeyValue
                label="返照时刻 / UTC"
                value={`${model.solarReturn.utc.year}-${String(model.solarReturn.utc.month).padStart(2, '0')}-${String(model.solarReturn.utc.day).padStart(2, '0')} ${String(model.solarReturn.utc.hour).padStart(2, '0')}:${String(model.solarReturn.utc.minute).padStart(2, '0')}`}
                mono
              />
              <KeyValue label="返照 ASC" value={`${model.solarReturn.chart.asc.sign} ${formatArc(model.solarReturn.chart.asc.lon)}`} />
              <KeyValue label="返照 MC" value={`${model.solarReturn.chart.mc.sign} ${formatArc(model.solarReturn.chart.mc.lon)}`} />
            </div>
            <div>
              <div className="label-mono mb-1 text-muted-foreground">返照盘七政落座</div>
              <div className="space-y-1 text-[11px] font-bold text-foreground">
                {PLANET_ORDER.map((p) => {
                  const b = model.solarReturn.chart.bodies[p];
                  return (
                    <div key={p} className="flex justify-between gap-3 border-b border-border pb-1 last:border-b-0">
                      <span>{PLANET_NAMES_ZH[p]}</span>
                      <span className="text-muted-foreground">
                        {b.sign} {formatArc(b.lon)} · 第 {b.house} 宫
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </FoldSection>

      {/* 09 整宫相位 */}
      <FoldSection no="09" title="整宫相位" en="SIGN ASPECTS" meta="WHOLE SIGN">
        {chart.aspects.length === 0 ? (
          <div className="px-4 py-4 text-sm font-bold text-muted-foreground md:px-6">七政之间无整宫相位。</div>
        ) : (
          <div className="grid gap-[1px] bg-border sm:grid-cols-2 lg:grid-cols-3">
            {chart.aspects.map((a) => (
              <div key={`${a.a}-${a.b}`} className="bg-card px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-black text-foreground">
                    {PLANET_NAMES_ZH[a.a as Planet]} — {PLANET_NAMES_ZH[a.b as Planet]}
                  </span>
                  <span className="label-mono text-muted-foreground">{a.distance.toFixed(1)}°</span>
                </div>
                <div className="mt-0.5">
                  <span
                    className="label-mono"
                    style={{ color: a.aspect === 'opposition' || a.aspect === 'square' ? 'var(--primary)' : '#2E7654' }}
                  >
                    {SIGN_ASPECT_NAMES[a.aspect]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </FoldSection>
    </div>
  );
}
