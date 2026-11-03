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
// 沛然堂线 · 希腊占星事实面板
// ------------------------------------------------------------
// 本页只呈现「可确定性计算的事实」，不写任何吉凶断论：
//   星盘 / 七政状态 / 尊贵 / 虚点 / 相位 / 时间主星 / 自检
// 判读层（把事实翻译成人事结论）留待下一阶段。
// ============================================================

const PLANET_ORDER: readonly Planet[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

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
  const sc = model.selfCheck;

  // 各宫落星（用于十二宫床位图）
  const bodiesByHouse = (house: number): string[] =>
    PLANET_ORDER.filter((p) => chart.bodies[p].house === house).map((p) => PLANET_NAMES_ZH[p]);

  return (
    <div className="space-y-6">
      {/* 线上公告：碑刻式入场 */}
      <div className="rise-in">
        <div className="cosmos-rule">
          <span className="cosmos-rule-diamond" />
        </div>
        <div className="cosmos-title mt-4 text-[10px] md:text-[11px]">
          ΚΑΤΑΣΤΑΣΙΣ · THE HELLENISTIC CHART
        </div>
        <h2 className="cosmos-title mt-2 text-3xl leading-tight md:text-5xl">星 盘 事 实</h2>
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
            <KeyValue label="当地时刻 / LOCAL" value={`${chart.local.year}-${String(chart.local.month).padStart(2, '0')}-${String(chart.local.day).padStart(2, '0')} ${String(chart.local.hour).padStart(2, '0')}:${String(chart.local.minute).padStart(2, '0')}`} mono />
            <KeyValue label="世界时 / UTC" value={`${chart.utc.year}-${String(chart.utc.month).padStart(2, '0')}-${String(chart.utc.day).padStart(2, '0')} ${String(chart.utc.hour).padStart(2, '0')}:${String(chart.utc.minute).padStart(2, '0')}`} mono />
            <KeyValue label="时区 / TZ" value={`UTC${chart.utcOffsetMinutes >= 0 ? '+' : '−'}${Math.floor(Math.abs(chart.utcOffsetMinutes) / 60)}${Math.abs(chart.utcOffsetMinutes) % 60 ? `:${String(Math.abs(chart.utcOffsetMinutes) % 60).padStart(2, '0')}` : ''}`} mono />
            <KeyValue label="时区精度 / ACCURACY" value={{ exact: '精确', approx: '近似', rough: '需核对' }[chart.timezoneAccuracy]} />
            <KeyValue label="宗派 / SECT" value={chart.sect === 'diurnal' ? '昼盘 · DIURNAL' : '夜盘 · NOCTURNAL'} />
          </div>
          <div>
            <KeyValue label="上升 / ASC" value={`${chart.asc.sign} ${formatArc(chart.asc.lon)}`} />
            <KeyValue label="中天 / MC" value={`${chart.mc.sign} ${formatArc(chart.mc.lon)}`} />
            <KeyValue label="宫制 / HOUSES" value="整宫制 Whole Sign" />
            <KeyValue label="各点 Almuten / ASC" value={`${PLANET_NAMES_ZH[model.almutenAsc.planet]}（${model.almutenAsc.score} 分${model.almutenAsc.resolvedByRuler ? ' · 回退守护星' : ''}）`} />
            <KeyValue label="当地恒星时 / RAMC" value={`${chart.ramc.toFixed(3)}°`} mono />
          </div>
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] leading-snug text-muted-foreground md:px-6">
          {chart.timezoneNote} 星历为本地自研（VSOP87 / Meeus 公开算法），七政黄经与 JPL DE441 比对误差 ≤ 3 角分。
        </div>
      </Section>

      {/* 02 十二宫位：星座图形为主 */}
      <Section no="02" title="十二宫位" en="THE TWELVE HOUSES" meta="WHOLE SIGN · 以图形为主">
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
        <div className="border-t border-border px-4 py-2 text-[11px] leading-snug text-muted-foreground md:px-6">
          整宫制：上升点所在星座为第 1 宫，其余按黄道顺序排布；方格内的发光字为落入该宫的天体。
        </div>
      </Section>

      {/* 03 七政落座 + 状态 */}
      <Section no="03" title="七政落座与状态" en="PLANETS" meta="TROPICAL · 回归黄道">
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
        <div className="border-t border-border px-4 py-2 text-[11px] leading-snug text-muted-foreground md:px-6">
          尊贵计分：庙 5 / 旺 4 / 三分 3 / 界 2 / 面 1 / 陷 −5 / 落 −4。界位用埃及界。
          状态判定：与太阳距角 ≤17′ 为「中心」、≤8.5° 为「燃烧」、≤17° 为「日光下」；速度相对平均日行度 ±10% 判疾行 / 迟行。
        </div>
      </Section>

      {/* 04 七虚点 */}
      <Section no="04" title="七虚点" en="LOTS" meta={chart.sect === 'diurnal' ? '昼盘公式' : '夜盘公式'}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {['虚点', '位置', '宫位', '公式', '主星'].map((h) => (
                  <th key={h} className="label-mono px-3 py-2 text-left text-muted-foreground md:px-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(model.lots.lots).map((l) => (
                <tr key={l.key} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 font-black text-foreground md:px-4">
                    {l.nameZh}
                    <span className="label-mono ml-2 text-[9px] text-muted-foreground">{l.nameEn}</span>
                  </td>
                  <td className="px-3 py-2 font-bold text-foreground md:px-4">
                    {ZODIAC_SIGNS[l.signIndex]} {formatArc(l.lon)}
                  </td>
                  <td className="num-tabular px-3 py-2 text-foreground md:px-4">第 {l.house} 宫</td>
                  <td className="px-3 py-2 text-[11px] font-bold text-muted-foreground md:px-4" style={{ fontFamily: 'var(--font-mono)' }}>
                    {l.formula}
                  </td>
                  <td className="px-3 py-2 text-sm font-bold text-foreground md:px-4">{PLANET_NAMES_ZH[l.ruler]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] leading-snug text-muted-foreground md:px-6">
          七虚点按 Paulus Alexandrinus 定义，昼夜按宗派互换。福点与精神点关于上升点对称（F + S ≡ 2·ASC）。
        </div>
      </Section>

      {/* 05 相位 */}
      <Section
        no="05"
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
                  {a.applying ? '入相' : '出相'} · 偏离 {a.deviation.toFixed(2)}° / orb {a.orbLimit}°
                  {a.exacting ? ' · 精确' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
        {model.aversions.length > 0 && (
          <div className="border-t border-border px-4 py-3 md:px-6">
            <div className="label-mono mb-2 text-muted-foreground">映照 / AVERSION（整宫相隔 1·5·7·11，彼此不相见）</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-foreground">
              {model.aversions.map((v) => (
                <span key={`${v.a}-${v.b}`}>
                  {v.labelA} — {v.labelB}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="border-t border-border px-4 py-2 text-[11px] leading-snug text-muted-foreground md:px-6">
          容许度：合 8° / 冲 8° / 三合 7° / 刑 7° / 六合 5°。整宫相位另见 01 星盘基础（按星座计）。
          {model.voidOfCourse && (
            <>
              {' '}空亡判定：
              {PLANET_ORDER.filter((p) => model.voidOfCourse[p]?.isVoid)
                .map((p) => PLANET_NAMES_ZH[p])
                .join('、') || '无'}
              。
            </>
          )}
        </div>
      </Section>

      {/* 06 时间主星 */}
      <Section no="06" title="时间主星" en="TIME LORDS" meta={`当前 ${model.age} 岁 · ${currentYearLabel(model)}`}>
        <div className="grid gap-6 p-4 md:grid-cols-2 md:p-6">
          <div>
            <div className="label-mono mb-2 text-muted-foreground">周年推运 / PROFECTIONS</div>
            <KeyValue label="推运宫位" value={`第 ${model.profections.house} 宫`} mono />
            <KeyValue label="推运星座" value={model.profections.signName} />
            <KeyValue label="年主星" value={model.profections.lordName} />
            <div className="mt-3">
              <div className="label-mono mb-1 text-muted-foreground">月推运 / MONTHLY</div>
              <div className="grid grid-cols-3 gap-[1px] bg-border text-[11px]">
                {model.profections.monthly.map((m) => (
                  <div key={m.month} className="bg-card px-2 py-1">
                    <span className="label-mono text-[9px] text-muted-foreground">{m.month}月</span>
                    <div className="font-bold text-foreground">{m.signName}</div>
                    <div className="text-[9px] text-muted-foreground">{m.lordName}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="label-mono mb-2 text-muted-foreground">法尔达利亚 / FIRDARIA</div>
            <KeyValue
              label="当前主期"
              value={model.currentFirdaria ? `${model.currentFirdaria.lordName}（${model.currentFirdaria.startAge.toFixed(1)}–${model.currentFirdaria.endAge.toFixed(1)} 岁）` : '—'}
            />
            <KeyValue label="宗派序列" value={chart.sect === 'diurnal' ? '昼盘九期' : '夜盘九期'} />
            <div className="mt-3">
              <div className="label-mono mb-1 text-muted-foreground">主期序列 / PERIODS</div>
              <div className="flex flex-wrap gap-[1px] bg-border">
                {model.firdaria.periods.map((p) => (
                  <div key={p.index} className="bg-card px-2 py-1 text-[10px]">
                    <span className="font-bold text-foreground">{p.lordName}</span>
                    <span className="ml-1 text-muted-foreground">
                      {p.startAge.toFixed(0)}–{p.endAge.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4 md:p-6">
          <div className="label-mono mb-2 text-muted-foreground">
            黄道释放 / ZODIACAL RELEASING（自{model.zodiacalReleasing.startLot === 'fortune' ? '福点' : '精神点'}释放，360 天年）
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['层级', '星座', '主星', '起始', '结束', '标记'].map((h) => (
                    <th key={h} className="label-mono px-3 py-2 text-left text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.zodiacalReleasing.level1.map((p) => (
                  <tr key={`${p.level}-${p.signIndex}-${p.startDays}`} className="border-b border-border last:border-b-0">
                    <td className="label-mono px-3 py-2 text-muted-foreground">L1</td>
                    <td className="px-3 py-2 font-bold text-foreground">{p.signName}</td>
                    <td className="px-3 py-2 text-foreground">{p.lordName}</td>
                    <td className="num-tabular px-3 py-2 text-[11px] text-muted-foreground">{p.startUtc.year}-{String(p.startUtc.month).padStart(2, '0')}</td>
                    <td className="num-tabular px-3 py-2 text-[11px] text-muted-foreground">{p.endUtc.year}-{String(p.endUtc.month).padStart(2, '0')}</td>
                    <td className="px-3 py-2">
                      {p.isPeak && <span className="label-mono text-primary">PEAK</span>}
                      {p.isLoosing && <span className="label-mono ml-2 text-muted-foreground">解结</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[11px] leading-snug text-muted-foreground">
            PEAK = 该段星座与福点成角（自身 / 第 4 / 7 / 10 宫）；解结 = 走完十二星座后跳至对宫。
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
              <KeyValue label="解算残差" value={`${model.solarReturn.residualDeg.toExponential(2)}°`} mono />
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
      </Section>

      {/* 07 整宫相位简表 */}
      <Section no="07" title="整宫相位" en="SIGN ASPECTS" meta="WHOLE SIGN">
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
        <div className="border-t border-border px-4 py-2 text-[11px] leading-snug text-muted-foreground md:px-6">
          希腊占星以整宫计相位：相隔 3/9 宫为刑，4/8 宫为三合，2/10 宫为六合，6 宫为冲；1/5/7/11 宫为映照。
        </div>
      </Section>

      {/* 08 自检 */}
      <Section
        no="08"
        title="引擎自检"
        en="SELF-CHECK"
        meta={`${sc.passed} 通过 / ${sc.failed} 失败`}
      >
        <div className="grid gap-[1px] bg-border sm:grid-cols-2 lg:grid-cols-3">
          {sc.items.map((item) => (
            <div key={item.id} className="bg-card px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="label-mono text-[9px] text-muted-foreground">{item.id}</span>
                <span className="label-mono" style={{ color: item.passed ? '#2E7654' : 'var(--primary)' }}>
                  {item.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] font-black text-foreground">{item.name}</div>
              <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{item.detail}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] leading-snug text-muted-foreground md:px-6">
          自检覆盖：规则表全称性（界位 / 三分 / 庙旺 / 面 / 喜乐宫 / 黄道释放年数 / 法尔达利亚 / 虚点）、
          星盘不变量（黄经范围 / 宫位覆盖 / 宗派自洽 / 轴点关系 / 落宫）、跨模块一致性（虚点镜像 / 尊贵互斥 / 界位无空隙）。
        </div>
      </Section>

      {/* 说明 */}
      <div className="cosmos-panel p-4 md:p-6">
        <div className="cosmos-rule mb-3">
          <span className="cosmos-rule-diamond" />
        </div>
        <div className="cosmos-panel-no text-center">SCOPE · 本页范围</div>
        <p className="cosmos-prose mt-3 text-center">
          本页只输出可确定性计算的事实，不含吉凶判读。尊贵 / 虚点 / 时间主星均按传统定义计算，
          判读层（把事实翻译为人事结论）尚未启用。
        </p>
        <p className="mt-3 text-center text-[11px] leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
          未接入：主方向（primary directions，口径分歧未决）、阿拉伯扩展虚点（公式分歧未决）、
          卜卦与择时（需独立输入模型）。
        </p>
      </div>
    </div>
  );
}

/** 显示当前年份标签（取自返照年） */
function currentYearLabel(model: PeiranModel): string {
  return `${model.solarReturn.utc.year} 年`;
}
