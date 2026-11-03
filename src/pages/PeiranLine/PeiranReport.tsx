import {
  ZODIAC_SIGNS,
  ZODIAC_SIGNS_EN,
  formatArc,
  SIGN_ASPECT_NAMES,
  type AstroChart,
} from '@/analysis/peiran/astroChart';

// ============================================================
// 沛然堂线 · 希腊占星（第一阶段：星盘基础）
// ------------------------------------------------------------
// 只呈现可确定性计算的事实：宗派、轴点、七政落座、整宫制宫位、整宫相位。
// 判读层（尊贵、虚点、时间主星）留待下一阶段。
// 版式沿用瑞士国际主义：直角、细规线、编号版块、等宽元信息。
// ============================================================

const PLANET_ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const;

const SECT_TEXT: Record<'diurnal' | 'nocturnal', string> = {
  diurnal: '昼盘 · DIURNAL',
  nocturnal: '夜盘 · NOCTURNAL',
};

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-1.5 last:border-b-0">
      <span className="label-mono text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold text-foreground ${mono ? 'num-tabular' : ''}`}>{value}</span>
    </div>
  );
}

export default function PeiranReport({ astro }: { astro: AstroChart | null }) {
  if (!astro) {
    return (
      <div className="border-2 border-foreground bg-card p-6 md:p-10">
        <div className="label-mono text-primary">PEIRAN LINE / 沛然堂线 · 希腊占星</div>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground md:text-3xl">等待排盘</h2>
        <p className="mt-3 max-w-xl text-sm font-bold leading-relaxed text-muted-foreground">
          请在上方填写出生日期、时刻与出生城市；希腊占星线需要经纬度与准确到分钟的时间。
        </p>
      </div>
    );
  }

  const bodyRows = PLANET_ORDER.map((key) => astro.bodies[key]);
  const aspectRows = astro.aspects.filter((a) => a.aspect !== 'conjunct' || a.distance < 8);

  return (
    <div className="space-y-5">
      {/* 星盘基础 */}
      <div className="border-2 border-foreground bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3 md:px-6">
          <div className="label-mono text-primary">
            01 / CHART · 星盘基础
          </div>
          <div className="label-mono text-muted-foreground">
            {astro.city.key} · {astro.city.lat.toFixed(2)}°N {Math.abs(astro.city.lon).toFixed(2)}°{astro.city.lon >= 0 ? 'E' : 'W'}
          </div>
        </div>

        <div className="grid gap-6 p-4 md:grid-cols-2 md:p-6">
          <div>
            <Row label="当地时刻 / LOCAL" value={`${astro.local.year}-${String(astro.local.month).padStart(2, '0')}-${String(astro.local.day).padStart(2, '0')} ${String(astro.local.hour).padStart(2, '0')}:${String(astro.local.minute).padStart(2, '0')}`} mono />
            <Row label="世界时 / UTC" value={`${astro.utc.year}-${String(astro.utc.month).padStart(2, '0')}-${String(astro.utc.day).padStart(2, '0')} ${String(astro.utc.hour).padStart(2, '0')}:${String(astro.utc.minute).padStart(2, '0')}`} mono />
            <Row
              label="时区 / TZ"
              value={`UTC${astro.utcOffsetMinutes >= 0 ? '+' : '−'}${Math.floor(Math.abs(astro.utcOffsetMinutes) / 60)}${Math.abs(astro.utcOffsetMinutes) % 60 ? `:${String(Math.abs(astro.utcOffsetMinutes) % 60).padStart(2, '0')}` : ''}`}
              mono
            />
            <Row label="时区精度 / ACCURACY" value={{ exact: '精确', approx: '近似', rough: '需核对' }[astro.timezoneAccuracy]} />
            <Row label="宗派 / SECT" value={SECT_TEXT[astro.sect]} />
          </div>

          <div>
            <Row label="上升 / ASC" value={`${astro.asc.sign} ${formatArc(astro.asc.lon)}`} />
            <Row label="中天 / MC" value={`${astro.mc.sign} ${formatArc(astro.mc.lon)}`} />
            <Row label="宫制 / HOUSES" value="整宫制 Whole Sign" />
            <Row label="太阳宫位 / SUN HOUSE" value={`第 ${astro.sunHouse} 宫`} mono />
            <Row label="当地恒星时 / RAMC" value={`${astro.ramc.toFixed(3)}°`} mono />
          </div>
        </div>

        <div className="border-t border-border px-4 py-2 text-[11px] leading-snug text-muted-foreground md:px-6">
          {astro.timezoneNote} 星历为本地自研（VSOP87 / Meeus 公开算法），七政黄经与 JPL DE441 比对误差 ≤ 3 角分。
        </div>
      </div>

      {/* 七政落座 */}
      <div className="border-2 border-foreground bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3 md:px-6">
          <div className="label-mono text-primary">02 / PLANETS · 七政落座</div>
          <div className="label-mono text-muted-foreground">TROPICAL · 回归黄道</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {['天体', '黄经', '星座', '宫位', '状态'].map((h) => (
                  <th key={h} className="label-mono px-4 py-2 text-left text-muted-foreground md:px-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((b) => (
                <tr key={b.key} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2 font-black text-foreground md:px-6">{b.name}</td>
                  <td className="num-tabular px-4 py-2 text-muted-foreground md:px-6" style={{ fontFamily: 'var(--font-mono)' }}>
                    {b.lon.toFixed(3)}°
                  </td>
                  <td className="px-4 py-2 font-bold text-foreground md:px-6">
                    {b.sign} {formatArc(b.lon)}
                  </td>
                  <td className="num-tabular px-4 py-2 text-foreground md:px-6">第 {b.house} 宫</td>
                  <td className="px-4 py-2 md:px-6">
                    {b.retrograde ? (
                      <span className="label-mono text-primary">逆行 R</span>
                    ) : (
                      <span className="label-mono text-muted-foreground">顺行</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 整宫制宫位 */}
      <div className="border-2 border-foreground bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3 md:px-6">
          <div className="label-mono text-primary">03 / HOUSES · 整宫制宫位</div>
          <div className="label-mono text-muted-foreground">WHOLE SIGN</div>
        </div>
        <div className="grid grid-cols-2 gap-[1px] bg-border sm:grid-cols-3 md:grid-cols-4">
          {astro.houseSigns.map((signIdx, i) => (
            <div key={ZODIAC_SIGNS[signIdx]} className="bg-card px-3 py-2">
              <div className="label-mono text-muted-foreground">第 {i + 1} 宫</div>
              <div className="mt-0.5 text-sm font-black text-foreground">{ZODIAC_SIGNS[signIdx]}</div>
              <div className="label-mono text-[9px] text-muted-foreground/70">{ZODIAC_SIGNS_EN[signIdx]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 整宫相位 */}
      <div className="border-2 border-foreground bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3 md:px-6">
          <div className="label-mono text-primary">04 / ASPECTS · 整宫相位</div>
          <div className="label-mono text-muted-foreground">SIGN-BASED</div>
        </div>
        {aspectRows.length === 0 ? (
          <div className="px-4 py-4 text-sm font-bold text-muted-foreground md:px-6">七政之间无整宫相位。</div>
        ) : (
          <div className="grid gap-[1px] bg-border sm:grid-cols-2 lg:grid-cols-3">
            {aspectRows.map((a) => (
              <div key={`${a.a}-${a.b}`} className="bg-card px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-black text-foreground">
                    {astro.bodies[a.a].name} — {astro.bodies[a.b].name}
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
          希腊占星以整宫计相位：相隔 3/4 宫为刑，4/8 宫为三合，2/10 宫为六合，6 宫为冲；其余为「映照」（不相见），不列入上表。
        </div>
      </div>

      {/* 下一阶段 */}
      <div className="border border-border bg-card p-4 md:p-6">
        <div className="label-mono text-muted-foreground">NEXT · 下一阶段</div>
        <p className="mt-2 text-sm font-bold leading-relaxed text-foreground">
          尊贵体系（三分主星 / 界 / 面）、七虚点、时间主星（周年推运 / 黄道释放 / 主方向）、
          阿拉伯扩展（法尔达利亚 / 太阳返照）尚未接入。
        </p>
      </div>
    </div>
  );
}
