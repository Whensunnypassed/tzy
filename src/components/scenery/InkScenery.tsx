// ============================================================
// 宣纸水墨 · 背景剪影层
// ------------------------------------------------------------
// 四层景深：远山 → 中景山寺 → 飞鹤 → 近景荷塘。
// 全部为内联 SVG，墨色低透明度平涂，不含渐变以外的装饰。
// 仅在 ink 主题下可见；cosmos 主题时整层淡出。
// ============================================================

interface Props {
  active: boolean;
}

const INK = '28, 26, 22';

function MountainFar() {
  return (
    <svg viewBox="0 0 1440 420" preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id="inkFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgba(${INK},0.10)`} />
          <stop offset="100%" stopColor={`rgba(${INK},0.02)`} />
        </linearGradient>
      </defs>
      <path
        d="M0,300 C120,214 200,258 300,196 C378,150 452,214 540,232 C618,248 690,150 780,168
           C872,188 936,262 1020,236 C1104,210 1176,146 1260,196 C1332,240 1392,262 1440,246
           L1440,420 L0,420 Z"
        fill="url(#inkFar)"
      />
      <path
        d="M0,342 C140,300 228,326 336,286 C432,250 520,300 640,306 C760,312 828,272 928,292
           C1024,312 1116,296 1204,268 C1292,240 1360,296 1440,304 L1440,420 L0,420 Z"
        fill={`rgba(${INK},0.07)`}
      />
    </svg>
  );
}

function MountainMid() {
  return (
    <svg viewBox="0 0 1440 300" preserveAspectRatio="none" className="h-full w-full">
      <path
        d="M0,300 L0,246 C86,232 148,250 224,214 C300,178 366,222 438,238 C512,254 566,204 642,222
           C716,240 780,268 856,258 C930,248 992,206 1068,224 C1140,244 1200,262 1276,250
           C1348,238 1400,254 1440,246 L1440,300 Z"
        fill={`rgba(${INK},0.10)`}
      />
    </svg>
  );
}

/** 中景：山寺塔影（飞檐 + 塔身 + 基座） */
function TempleSilhouette() {
  return (
    <svg viewBox="0 0 260 190" className="h-full w-full">
      <g fill={`rgba(${INK},0.16)`}>
        {/* 基座 */}
        <rect x="52" y="164" width="156" height="10" />
        {/* 塔身 */}
        <rect x="104" y="108" width="52" height="58" />
        <rect x="96" y="150" width="68" height="14" />
        {/* 下层飞檐 */}
        <path d="M74,108 C88,96 132,96 148,104 L156,110 L160,106 L104,100 L96,104 Z" />
        <path d="M88,104 L186,104 L182,98 L92,98 Z" />
        <path d="M60,110 C74,100 186,100 200,110 L200,106 C186,94 74,94 60,106 Z" />
        {/* 上层塔身 */}
        <rect x="118" y="62" width="26" height="40" />
        {/* 上层飞檐 */}
        <path d="M108,62 L154,62 L150,56 L112,56 Z" />
        <path d="M96,64 C108,52 154,52 166,64 L170,60 C156,46 106,46 92,60 Z" />
        {/* 塔刹 */}
        <rect x="129" y="34" width="4" height="22" />
        <circle cx="131" cy="30" r="5" />
        <path d="M120,40 C126,30 136,30 142,40 L138,42 C134,34 128,34 124,42 Z" />
      </g>
      {/* 檐角高光：极淡的一点留白 */}
      <path d="M60,110 C74,100 186,100 200,110" stroke={`rgba(${INK},0.05)`} strokeWidth="1" fill="none" />
    </svg>
  );
}

/** 飞鹤：三只，简笔两翼 */
function Crane({ flip = false, scale = 1 }: { flip?: boolean; scale?: number }) {
  return (
    <svg
      viewBox="0 0 120 60"
      className="h-full w-full"
      style={{ transform: `scaleX(${flip ? -1 : 1}) scale(${scale})` }}
    >
      <g fill="none" stroke={`rgba(${INK},0.34)`} strokeWidth="2.4" strokeLinecap="round">
        {/* 左翼 */}
        <path d="M58,30 C46,26 34,18 20,12" />
        {/* 右翼 */}
        <path d="M58,30 C72,26 86,20 102,15" />
        {/* 身体 */}
        <path d="M56,30 C60,32 64,31 68,29" />
        {/* 颈与头 */}
        <path d="M56,30 C50,27 44,24 40,21" />
        {/* 尾 */}
        <path d="M68,29 C74,31 80,33 86,35" />
      </g>
      <circle cx="39" cy="20.5" r="2" fill={`rgba(${INK},0.34)`} />
    </svg>
  );
}

/** 近景：荷塘（水波 + 荷叶 + 荷花） */
function LotusPond() {
  return (
    <svg viewBox="0 0 1440 260" preserveAspectRatio="none" className="h-full w-full">
      {/* 水波 */}
      <g stroke={`rgba(${INK},0.10)`} strokeWidth="1" fill="none">
        <path d="M0,232 C120,226 220,238 340,232 C460,226 540,240 660,234 C780,228 880,240 1000,234 C1120,228 1240,240 1360,234 L1440,232" />
        <path d="M0,246 C140,240 250,252 380,246 C510,240 600,254 730,248 C860,242 960,254 1090,248 C1220,242 1320,252 1440,246" />
      </g>

      {/* 远一点的荷叶 */}
      <g fill={`rgba(${INK},0.11)`}>
        <ellipse cx="1120" cy="214" rx="58" ry="16" />
        <ellipse cx="1244" cy="228" rx="42" ry="12" />
      </g>

      {/* 主荷叶：带缺口 */}
      <g fill={`rgba(${INK},0.15)`}>
        <path d="M212,214 C262,190 330,190 372,214 C336,232 250,232 212,214 Z" />
        <path d="M300,214 L332,196 L326,206 Z" fill="transparent" />
        <ellipse cx="470" cy="238" rx="68" ry="18" />
        <ellipse cx="612" cy="224" rx="52" ry="14" />
      </g>

      {/* 荷茎 */}
      <g stroke={`rgba(${INK},0.13)`} strokeWidth="2" fill="none">
        <path d="M292,212 C288,190 284,172 282,156" />
        <path d="M520,238 C516,214 512,196 510,180" />
      </g>

      {/* 荷花：盛开 */}
      <g fill={`rgba(${INK},0.19)`}>
        <path d="M282,156 C272,142 268,126 274,116 C280,128 284,140 286,152 Z" />
        <path d="M282,156 C294,142 300,128 296,118 C290,128 286,140 284,152 Z" />
        <path d="M283,154 C272,150 260,146 254,138 C266,138 276,144 283,150 Z" />
        <path d="M283,154 C294,150 306,146 312,138 C300,138 290,144 283,150 Z" />
        <path d="M283,152 C276,142 278,130 283,124 C288,132 288,142 285,152 Z" />
      </g>

      {/* 荷花：含苞 */}
      <g fill={`rgba(${INK},0.17)`}>
        <path d="M510,180 C504,168 504,154 510,146 C516,156 516,168 512,180 Z" />
        <path d="M510,180 C518,170 522,160 518,152 C512,160 510,170 510,180 Z" />
      </g>
    </svg>
  );
}

export default function InkScenery({ active }: Props) {
  return (
    <div
      className="theme-skin"
      aria-hidden
      style={{ opacity: active ? 1 : 0 }}
    >
      {/* 纸纤维肌理 */}
      <div className="ink-paper" />

      {/* 远山（顶部） */}
      <div className="ink-drift-slower absolute inset-x-0 top-0 h-[46vh] opacity-[0.85]">
        <MountainFar />
      </div>

      {/* 中景山（中段） */}
      <div className="ink-drift-slow absolute inset-x-0 bottom-[26vh] h-[30vh] opacity-90">
        <MountainMid />
      </div>

      {/* 山寺塔影（右侧中段） */}
      <div className="absolute right-[6vw] bottom-[40vh] hidden h-[16vh] w-[13vw] min-w-[120px] opacity-90 md:block">
        <TempleSilhouette />
      </div>

      {/* 飞鹤（左上） */}
      <div className="crane-float absolute left-[12vw] top-[18vh] h-[52px] w-[104px] opacity-80">
        <Crane />
      </div>
      <div className="crane-float absolute left-[26vw] top-[26vh] h-[34px] w-[68px] opacity-60" style={{ animationDelay: '-4s' }}>
        <Crane flip />
      </div>
      <div className="crane-float absolute left-[8vw] top-[34vh] h-[26px] w-[52px] opacity-40" style={{ animationDelay: '-8s' }}>
        <Crane />
      </div>

      {/* 荷塘（底部） */}
      <div className="absolute inset-x-0 bottom-0 h-[26vh]">
        <LotusPond />
      </div>
    </div>
  );
}
