/**
 * 推步线 · L4 触发层准备件：时辰边界判定（T10 之局部）
 *
 * 古法记录的时辰是两小时一档，出生时刻若落在档界附近，时柱（甚至日柱）会翻。
 * 本模块只回答「离边界多远、可能翻成哪个时辰」，**不给吉凶**。
 *
 * 边界约定：
 * - 时辰以奇数点换支：23:00 子、01:00 丑、03:00 寅 …… 21:00 亥。
 * - 子时跨日：23:00–01:00 属次日之始（早子 / 晚子两派并存，此处只标风险不裁判）。
 */

export const HOUR_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export interface BranchWindow {
  /** 时辰支 */
  branch: string;
  /** 时辰序号（0=子 … 11=亥） */
  index: number;
  /** 当前档内已过分钟数（0–119） */
  elapsed: number;
  /** 距下一档界分钟数（0–120） */
  toNext: number;
}

export interface BoundaryHint {
  /** 当前时辰 */
  branch: string;
  /** 当前时辰序号（0=子 … 11=亥） */
  index: number;
  /** 距最近档界分钟数 */
  minutesToBoundary: number;
  /** 是否在风险窗口内 */
  ambiguous: boolean;
  /** 落在交界上时，另一侧的时辰 */
  neighbor: string | null;
  /** 说明（可直接展示） */
  note: string;
}

/** 把 0–1439 分钟换算为时辰与档内位置。 */
export function branchAt(minutesOfDay: number): BranchWindow {
  const total = ((Math.round(minutesOfDay) % 1440) + 1440) % 1440;
  // 以 01:00 为丑时起点，即整体后移 60 分钟再按两小时切
  const shifted = (total + 60) % 1440;
  const index = Math.floor(shifted / 120);
  const elapsed = shifted % 120;
  return { branch: HOUR_BRANCHES[index], index, elapsed, toNext: 120 - elapsed };
}

/** 距最近时辰档界的分钟数（档界在奇数点，即每支的起止处）。 */
export function minutesToHourBoundary(minutesOfDay: number): number {
  const { elapsed } = branchAt(minutesOfDay);
  return Math.min(elapsed, 120 - elapsed);
}

/**
 * 时辰边界提示。
 * @param minutesOfDay 真太阳时换算后的当日分钟数（0–1439）
 * @param windowMinutes 风险窗口，默认 30 分钟
 */
export function boundaryHint(minutesOfDay: number, windowMinutes = 30): BoundaryHint {
  const window = Math.max(0, Math.min(60, windowMinutes));
  const { branch, index, elapsed } = branchAt(minutesOfDay);
  const distance = Math.min(elapsed, 120 - elapsed);
  const ambiguous = distance <= window;
  const prev = HOUR_BRANCHES[(index + 11) % 12];
  const next = HOUR_BRANCHES[(index + 1) % 12];
  // 刚过界（档内前半）→ 另一侧是前一支；临近下一界（后半）→ 另一侧是后一支
  const neighbor = !ambiguous ? null : elapsed <= 60 ? prev : next;

  const note = !ambiguous
    ? `${branch}时中段，距最近时辰界 ${distance} 分钟，时柱稳定`
    : distance === 0
      ? `正落${prev}、${branch}之交，两时辰须双算`
      : elapsed <= 60
        ? `刚进${branch}时 ${distance} 分钟，若前一刻出生则为${prev}时，时柱须双算`
        : `距${next}时之界 ${distance} 分钟，若稍晚出生则为${next}时，时柱须双算`;

  return { branch, index, minutesToBoundary: distance, ambiguous, neighbor, note };
}

/** 从 HH:mm 或含时间的字符串中取当日分钟数；失败返回 null。 */
export function parseMinutes(text: string | undefined | null): number | null {
  if (!text) return null;
  const match = text.match(/(\d{1,2}):(\d{2})(?!.*\d{1,2}:\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}
