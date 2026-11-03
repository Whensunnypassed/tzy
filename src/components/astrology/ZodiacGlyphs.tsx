// ============================================================
// 十二星座图形（发光星图）
// ------------------------------------------------------------
// 每个星座用「星点 + 连线」构成可辨识的简化星图，
// 图形为主、文字为辅。颜色按四元素区分：
//   火（白羊·狮子·射手）暖金 / 土（金牛·处女·摩羯）铜金
//   风（双子·天秤·水瓶）冷青 / 水（巨蟹·天蝎·双鱼）海蓝
// ============================================================

export type SignElement = 'fire' | 'earth' | 'air' | 'water';

export const SIGN_ELEMENT_OF: readonly SignElement[] = [
  'fire',
  'earth',
  'air',
  'water',
  'fire',
  'earth',
  'air',
  'water',
  'fire',
  'earth',
  'air',
  'water',
] as const;

export const ELEMENT_GLOW: Record<SignElement, string> = {
  fire: '#E8A24A',
  earth: '#C9A227',
  air: '#8FC7D8',
  water: '#7FA8D9',
};

interface Glyph {
  /** 星点坐标（100 × 100 视口） */
  stars: Array<[number, number]>;
  /** 连线（索引对） */
  lines: Array<[number, number]>;
  /** 主星（画得更大） */
  primary: number[];
}

const GLYPHS: readonly Glyph[] = [
  // 0 白羊：一对弯角
  {
    stars: [[26, 74], [34, 54], [44, 38], [56, 38], [66, 54], [74, 74]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    primary: [2, 3],
  },
  // 1 金牛：V 形脸 + 双角
  {
    stars: [[50, 78], [41, 64], [59, 64], [50, 54], [41, 64], [25, 40], [16, 24], [59, 64], [75, 40], [84, 24]],
    lines: [[0, 1], [0, 2], [1, 2], [1, 3], [3, 2], [4, 5], [5, 6], [7, 8], [8, 9]],
    primary: [6, 9],
  },
  // 2 双子：两条并立人形
  {
    stars: [[34, 22], [34, 50], [34, 78], [66, 22], [66, 50], [66, 78]],
    lines: [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5]],
    primary: [0, 3],
  },
  // 3 巨蟹：蟹身 + 双钳
  {
    stars: [[50, 30], [50, 50], [42, 66], [58, 66], [28, 40], [24, 26], [72, 40], [76, 26]],
    lines: [[0, 1], [1, 2], [1, 3], [2, 3], [0, 4], [4, 5], [0, 6], [6, 7]],
    primary: [5, 7],
  },
  // 4 狮子：镰刀 + 后身
  {
    stars: [[30, 26], [22, 44], [28, 62], [42, 70], [58, 74], [74, 66], [84, 52]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
    primary: [0, 3],
  },
  // 5 处女：人形 + 持穗
  {
    stars: [[46, 22], [40, 40], [46, 60], [56, 76], [70, 84], [24, 34], [16, 20]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6]],
    primary: [0, 6],
  },
  // 6 天秤：天平
  {
    stars: [[22, 38], [50, 30], [78, 38], [22, 62], [14, 70], [78, 62], [86, 70]],
    lines: [[0, 1], [1, 2], [0, 3], [3, 4], [2, 5], [5, 6]],
    primary: [1],
  },
  // 7 天蝎：弯曲长尾
  {
    stars: [[26, 28], [34, 40], [44, 50], [56, 60], [68, 70], [80, 76], [90, 66], [86, 50]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
    primary: [0, 6],
  },
  // 8 射手：弓与箭
  {
    stars: [[28, 72], [24, 54], [30, 36], [44, 24], [60, 20], [50, 52], [72, 46]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [5, 2]],
    primary: [4, 6],
  },
  // 9 摩羯：三角身 + 弯尾
  {
    stars: [[24, 62], [38, 40], [56, 32], [72, 42], [84, 60], [66, 74], [44, 72]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]],
    primary: [2, 5],
  },
  // 10 水瓶：持瓶倒水
  {
    stars: [[30, 30], [46, 40], [62, 48], [78, 56], [34, 64], [50, 74], [20, 74]],
    lines: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 6], [2, 5]],
    primary: [0, 3],
  },
  // 11 双鱼：双鱼 + 系带
  {
    stars: [[22, 32], [32, 50], [46, 68], [78, 68], [68, 50], [54, 32]],
    lines: [[0, 1], [1, 2], [3, 4], [4, 5], [2, 5]],
    primary: [2, 3],
  },
] as const;

export interface ZodiacGlyphProps {
  signIndex: number;
  /** 像素尺寸 */
  size?: number;
  /** 是否发光（cosmos 主题用） */
  glow?: boolean;
  className?: string;
}

/** 单个星座星图 */
export function ZodiacGlyph({ signIndex, size = 72, glow = true, className = '' }: ZodiacGlyphProps) {
  const g = GLYPHS[signIndex] ?? GLYPHS[0];
  const color = ELEMENT_GLOW[SIGN_ELEMENT_OF[signIndex] ?? 'fire'];

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-hidden
      className={`${glow ? 'zodiac-glyph' : ''} ${className}`}
      style={{ color }}
    >
      <g stroke={color} strokeWidth="0.9" opacity="0.55" strokeLinecap="round">
        {g.lines.map(([a, b], i) => {
          const p1 = g.stars[a];
          const p2 = g.stars[b];
          if (!p1 || !p2) return null;
          return <line key={i} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} />;
        })}
      </g>
      <g fill={color}>
        {g.stars.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={g.primary.includes(i) ? 2.4 : 1.5}
            opacity={g.primary.includes(i) ? 1 : 0.78}
          />
        ))}
      </g>
      {/* 主星光晕 */}
      {g.stars.map(([x, y], i) =>
        g.primary.includes(i) ? (
          <circle key={`halo-${i}`} cx={x} cy={y} r="6" fill={color} opacity="0.16" />
        ) : null,
      )}
    </svg>
  );
}

/** 十二宫床位：宫号 + 星座 + 落宫天体 */
export interface ZodiacTileProps {
  signIndex: number;
  house: number;
  signName: string;
  signEn: string;
  bodies?: string[];
  size?: number;
}

export function ZodiacTile({ signIndex, house, signName, signEn, bodies = [], size = 76 }: ZodiacTileProps) {
  const color = ELEMENT_GLOW[SIGN_ELEMENT_OF[signIndex] ?? 'fire'];
  return (
    <div className="zodiac-tile">
      <div className="label-mono text-[9px]" style={{ color, opacity: 0.75 }}>
        {String(house).padStart(2, '0')} HOUSE
      </div>
      <ZodiacGlyph signIndex={signIndex} size={size} />
      <div className="text-[13px] font-bold" style={{ color: 'var(--foreground)', letterSpacing: '0.16em' }}>
        {signName}
      </div>
      <div className="label-mono text-[8px]" style={{ color: 'var(--muted-foreground)' }}>
        {signEn}
      </div>
      {bodies.length > 0 && (
        <div className="mt-0.5 flex flex-wrap justify-center gap-1">
          {bodies.map((b) => (
            <span
              key={b}
              className="text-[10px] font-bold"
              style={{ color, textShadow: '0 0 8px currentColor' }}
            >
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
