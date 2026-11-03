// ============================================================
// 希腊夜空 · 背景星空层
// ------------------------------------------------------------
// 三层：夜空渐变 → 银河带 → 星点闪烁；另加一轮黄道弧暗示。
// 仅在 cosmos 主题下可见。
// ============================================================

interface Props {
  active: boolean;
}

export default function StarField({ active }: Props) {
  return (
    <div className="theme-skin" aria-hidden style={{ opacity: active ? 1 : 0 }}>
      <div className="cosmos-sky" />
      <div className="cosmos-milkyway" />

      {/* 几颗亮星：带柔光 */}
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="starGlow">
            <stop offset="0%" stopColor="rgba(255, 246, 214, 0.9)" />
            <stop offset="42%" stopColor="rgba(255, 238, 190, 0.28)" />
            <stop offset="100%" stopColor="rgba(255, 238, 190, 0)" />
          </radialGradient>
          <radialGradient id="starGlowBlue">
            <stop offset="0%" stopColor="rgba(214, 230, 255, 0.85)" />
            <stop offset="42%" stopColor="rgba(180, 208, 255, 0.24)" />
            <stop offset="100%" stopColor="rgba(180, 208, 255, 0)" />
          </radialGradient>
        </defs>

        <g>
          <circle cx="1080" cy="120" r="52" fill="url(#starGlow)" />
          <circle cx="1080" cy="120" r="1.8" fill="rgba(255,250,236,0.95)" />

          <circle cx="210" cy="330" r="38" fill="url(#starGlow)" />
          <circle cx="210" cy="330" r="1.4" fill="rgba(255,248,228,0.9)" />

          <circle cx="760" cy="560" r="44" fill="url(#starGlowBlue)" />
          <circle cx="760" cy="560" r="1.6" fill="rgba(232,240,255,0.9)" />

          <circle cx="1260" cy="700" r="30" fill="url(#starGlow)" />
          <circle cx="1260" cy="700" r="1.2" fill="rgba(255,248,228,0.85)" />

          <circle cx="420" cy="780" r="26" fill="url(#starGlowBlue)" />
          <circle cx="420" cy="780" r="1.1" fill="rgba(232,240,255,0.8)" />
        </g>

        {/* 黄道弧：极淡，暗示星盘 */}
        <path
          d="M120,690 C360,430 720,330 1120,380 C1300,404 1380,470 1420,540"
          stroke="rgba(217, 179, 106, 0.10)"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M120,720 C380,470 740,372 1120,420 C1300,444 1380,506 1420,572"
          stroke="rgba(217, 179, 106, 0.05)"
          strokeWidth="1"
          fill="none"
        />
      </svg>

      <div className="cosmos-stars" />
    </div>
  );
}
