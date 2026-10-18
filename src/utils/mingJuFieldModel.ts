/**
 * 命局函数场 · 单条函数曲线模型（纯函数旁证层）
 *
 * 目的：把八字「原局 + 加入新的字」这一气机变化过程，表达为一条函数曲线 f(五行)，
 *       降低非专业用户的理解门槛。仅作旁证可视化，不写入用忌 marks、不参与评分与九档评级。
 *
 * 坐标系（可进化契约：模型层只产出数字与元数据，渲染层只消费）：
 *   X 轴 = 五行（木→火→土→金→水，5 个节点）
 *   Z 轴 = 阴阳（不是喜忌！）：阳仪（木、火）为正、阴仪（金、水）为负，
 *          土为太极枢机、不列两仪，恒居中轴（σ(土)=0）。
 *          轴值量纲 = 压缩分，满量程 ±Z_MAX。
 *   （用/忌 语义只出现在下方「选字」区，Y 轴改标阴阳后不再与其理解重复。）
 *
 *   当前函数 f（实线）：
 *     σ(木)=σ(火)=+1、σ(金)=σ(水)=−1、σ(土)=0
 *     w_e = 该五行在原局的全部柱位权重和（干取 stem 权、支取 branch 权、藏干 = branch×(0.5−0.15k)）
 *     W   = 原局全部权重（含土，注入不改变归一化基准）
 *     f(e) = Z_MAX × σ(e) × w_e / W                          // 原局基准 f₀
 *     f(e) = f₀(e) + Σ_k Δ_k(e)                             // 逐个注入字的作用向量叠加
 *     Δ_k(e) = Z_MAX × σ(e) × Δw_k(e) / W
 *     Δw_k(e)：注入字 e₀ 使 e₀ 自身 +w_add（岁运再逢再加一份名义权重）；
 *              又使「e₀ 所生」五行 +λ·w_add、使「e₀ 所克」五行 −λ·w_add（λ = shengKeCoupling）。
 *     ——可见注入不局限于该字自身五行格，而是沿五行生克传导演变为「作用向量」，
 *       故同一五行在不同命盘（用忌不同）所评出的得失结论不同（见 effects / verdict）。
 *
 *   理想函数 f*（虚线虚影）：二气配平——两仪各半
 *     T = w木+w火+w金+w水（两仪总权重，不含土）
 *     k_阳 = (T/2)/w_阳、k_阴 = (T/2)/w_阴（某侧为 0 则该侧取 0）
 *     f*(e) = Z_MAX × σ(e) × w_e × k_侧 / W
 *     实线与虚影之差 = 该五行距「本盘应去方向」的缺口：正值＝尚需增强（上移至理想），负值＝偏多需减。
 *
 * 数据单一真源：只读引擎既有导出（STEMS / BRANCHES / STEM_ELEMENTS / BRANCH_ELEMENTS /
 *              PILLAR_WEIGHTS / allStemMarks / allBranchMarks），不在模型层复制命理规则；
 *              所有可调参数集中在 MINGJU_FIELD_CFG（带 version）。
 */
import {
  STEMS,
  BRANCHES,
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  type BaZiChart,
} from './baziCalculator';
import { PILLAR_WEIGHTS, type XiJiMark, type YongJiResult } from './baziAnalyzer';

/** 五行顺序（与页面 ELEMENT_COLORS 同序） */
export const FIELD_ELEMENT_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
export type FieldElement = (typeof FIELD_ELEMENT_ORDER)[number];

export const FIELD_ELEMENT_NAMES: Record<FieldElement, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
};

/** 两仪归属：木火为阳仪（+1）、金水为阴仪（−1）、土为太极枢机（0，居中轴） */
export const FIELD_YIN_YANG_SIGN: Record<FieldElement, number> = {
  wood: 1,
  fire: 1,
  earth: 0,
  metal: -1,
  water: -1,
};

/** 两仪称谓（展示用） */
export const FIELD_YIN_YANG_LABEL: Record<FieldElement, string> = {
  wood: '阳仪',
  fire: '阳仪',
  earth: '太极枢机',
  metal: '阴仪',
  water: '阴仪',
};

/** 五行相生（施动者 → 受生者）：木→火→土→金→水→木 */
export const FIELD_SHENG_MAP: Record<FieldElement, FieldElement> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

/** 五行相克（施动者 → 受克者）：木→土→水→火→金→木 */
export const FIELD_KE_MAP: Record<FieldElement, FieldElement> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
};

/** 注入字对某一五行格的作用类型 */
export type FieldEffectKind = 'self' | 'generates' | 'controls';
/** 注入字整体得失结论（因盘而异） */
export type FieldVerdict = 'gain' | 'loss' | 'mixed' | 'flat';

/** 注入字对某五行格的作用明细（渲染层据此画箭头；得失据此评定） */
export interface MingJuFieldEffect {
  element: FieldElement;
  kind: FieldEffectKind;
  /** 该格名义权重的增减（正=增、负=减） */
  weightDelta: number;
  change: 'increase' | 'decrease';
  /** 该格在本盘的用/忌/中性 */
  mark: XiJiMark;
  /** 得失：增用=助吉、增忌=助凶、减忌=制吉、减用=制凶（中性/土枢机为平） */
  verdict: 'gain' | 'loss' | 'flat';
  /** 该格阴阳轴位移（带符号，已按 zMax/W 折算） */
  axisDelta: number;
}

/** 模型常量（算法升级只改此处，不动 UI） */
export const MINGJU_FIELD_CFG = {
  version: 'field-v6.0.0',
  zMax: 7, // 阴阳轴满量程（与 DaYunCurveChart 的 ±7 对齐）
  neutralBand: 0.3, // |z| 小于此值视为中性（趋平）
  maxInject: 8, // 最多可注入的字数（保证图面可读；渲染层始终只有「实线 + 虚影」两条线）
  injectStemWeight: 1, // 注入天干的名义单字权重
  injectBranchWeight: 1.5, // 注入地支的名义单字权重
  shengKeCoupling: 0.35, // 生克耦合 λ：注入字对「所生 / 所克」五行节点的影响强度（0 = 关断传导）
  deltaEps: 0.05, // 位移/缺口阈：|Δ| 小于此值视为无变化，不画竖线
} as const;

export type InjectKind = 'stem' | 'branch';

/** 原局字（构成基准层 f₀ 的来源） */
export interface MingJuFieldSource {
  id: string; // 年干·甲 / 日支藏·癸
  pillarKey: string; // 年 / 月 / 日 / 时
  pillarIndex: number;
  kind: 'stem' | 'branch' | 'hidden';
  char: string;
  element: FieldElement;
  weight: number;
  mark: XiJiMark;
  /** 阴阳符号（该字所属五行的两仪归属） */
  sign: number;
  /** 该字对阴阳轴的贡献 = Z_MAX × σ(元素) × weight / W */
  contribution: number;
}

/** 可注入候选字（十天干 + 十二地支，原局已含者亦在列） */
export interface MingJuFieldCandidate {
  id: string; // 干·庚 / 支·午
  kind: InjectKind;
  char: string;
  element: FieldElement;
  mark: XiJiMark;
  /** 阴阳符号（该字所属五行的两仪归属） */
  sign: number;
  weight: number;
  /** 注入后对所属五行格的阴阳位移量 δ（自身格，= effects 中 self 项的 axisDelta） */
  contribution: number;
  /** 作用向量：注入字对自身 / 所生 / 所克三类五行格的作用明细 */
  effects: MingJuFieldEffect[];
  /** 逐格阴阳轴位移（与 field.elements 同序），自身+生+克叠加 */
  axisDeltas: number[];
  /** 注入字整体得失结论（因盘而异：同一五行在不同命盘结论不同） */
  verdict: FieldVerdict;
  /** 原局已含此字（仍可注入＝岁运再逢，仅作标记，不再拦截） */
  inChart: boolean;
  injected: boolean;
}

/** 三维曲线的一层：第 0 层为原局基准，其后每层叠加一个字 */
export interface MingJuFieldLayer {
  index: number;
  label: string;
  layerKind: 'base' | 'inject';
  char?: string;
  charKind?: InjectKind;
  element?: FieldElement;
  values: number[]; // 该层的阴阳值（累积）
  delta: number; // 本层新增字自身的阴阳位移（该字所属五行格的层间差）
  deltaIndex?: number; // 该字所属五行格下标
  /** 本层新增字逐格阴阳轴位移（与 field.elements 同序，含生克传导） */
  deltas: number[];
  /** 本层新增字的作用明细（自身 / 生 / 克） */
  effects: MingJuFieldEffect[];
  /** 本层新增字的整体得失结论 */
  verdict: FieldVerdict;
  injectedIds: string[];
}

/** 两仪二气存量（权重口径） */
export interface MingJuFieldQi {
  yangWeight: number; // 阳仪权重（木+火）
  yinWeight: number; // 阴仪权重（金+水）
  earthWeight: number; // 太极枢机权重（土）
  imbalance: number; // 阳 − 阴（正=偏阳，负=偏阴）
  idealSideWeight: number; // 理想配平后每侧权重（=两仪总权重/2）
}

export interface MingJuField {
  version: string;
  elements: FieldElement[];
  elementNames: string[];
  /** 第 0 层 = 原局基准 f₀ */
  base: number[];
  /** 理想函数虚影 f*（二气配平，固定参照线，不随注入变化） */
  ideal: number[];
  sources: MingJuFieldSource[];
  /** 全部 22 个可注入字的目录（供 UI 渲染选择器） */
  candidates: MingJuFieldCandidate[];
  /** 已注入字（按注入顺序） */
  injected: MingJuFieldCandidate[];
  layers: MingJuFieldLayer[];
  /** 原局已含的字（干/支/藏干去重） */
  presentChars: string[];
  /** 五行权重（原局，含藏干） */
  elementWeights: Record<FieldElement, number>;
  qi: MingJuFieldQi;
  totalWeight: number;
  zMax: number;
  maxInject: number;
  warnings: string[];
}

const ELEMENT_INDEX: Record<string, number> = Object.fromEntries(
  FIELD_ELEMENT_ORDER.map((e, i) => [e, i]),
);

const round3 = (n: number) => Math.round(n * 1000) / 1000;

function signOfElement(element: FieldElement): number {
  return FIELD_YIN_YANG_SIGN[element] ?? 0;
}

/**
 * 构建命局函数场。
 * @param injectedIds 用户注入的字 id 集合（如 '干·庚' / '支·午'），按注入顺序决定层序
 */
export function buildMingJuField(
  chart: BaZiChart,
  yongJi: YongJiResult,
  injectedIds: ReadonlySet<string> = new Set(),
): MingJuField {
  const { zMax, neutralBand, maxInject, injectStemWeight, injectBranchWeight, shengKeCoupling } =
    MINGJU_FIELD_CFG;
  const warnings: string[] = [];

  const pillars: Array<{ key: string; pillar: BaZiChart['year'] }> = [
    { key: '年', pillar: chart.year },
    { key: '月', pillar: chart.month },
    { key: '日', pillar: chart.day },
    { key: '时', pillar: chart.hour },
  ];

  // ---------- 原局字 ----------
  const sources: MingJuFieldSource[] = [];
  const presentChars = new Set<string>();
  const elementWeights: Record<FieldElement, number> = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };
  const pushSource = (s: Omit<MingJuFieldSource, 'sign' | 'contribution'>) => {
    elementWeights[s.element] += s.weight;
    sources.push({ ...s, sign: signOfElement(s.element), contribution: 0 });
  };

  pillars.forEach(({ key, pillar }, i) => {
    const w = PILLAR_WEIGHTS[i] ?? { stem: 1, branch: 1 };
    presentChars.add(pillar.stem);
    presentChars.add(pillar.branch);

    pushSource({
      id: `${key}干·${pillar.stem}`,
      pillarKey: key,
      pillarIndex: i,
      kind: 'stem',
      char: pillar.stem,
      element: STEM_ELEMENTS[pillar.stem] as FieldElement,
      weight: w.stem,
      mark: yongJi.allStemMarks[pillar.stem] ?? 'neutral',
    });

    pushSource({
      id: `${key}支·${pillar.branch}`,
      pillarKey: key,
      pillarIndex: i,
      kind: 'branch',
      char: pillar.branch,
      element: BRANCH_ELEMENTS[pillar.branch] as FieldElement,
      weight: w.branch,
      mark: yongJi.allBranchMarks[pillar.branch] ?? 'neutral',
    });

    // 藏干（主次递减，与 calculateElementPower 同权重口径）
    pillar.hiddenStems.forEach((hs, k) => {
      const hw = w.branch * (0.5 - k * 0.15);
      presentChars.add(hs);
      if (hw <= 0) return;
      pushSource({
        id: `${key}支藏·${hs}`,
        pillarKey: key,
        pillarIndex: i,
        kind: 'hidden',
        char: hs,
        element: STEM_ELEMENTS[hs] as FieldElement,
        weight: hw,
        mark: yongJi.allStemMarks[hs] ?? 'neutral',
      });
    });
  });

  const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0) || 1;

  // ---------- 原局基准 f₀（阴阳轴） ----------
  const base = FIELD_ELEMENT_ORDER.map((e) =>
    round3((zMax * signOfElement(e) * elementWeights[e]) / totalWeight),
  );
  for (const s of sources) {
    s.contribution = round3((zMax * s.sign * s.weight) / totalWeight);
  }

  // ---------- 理想函数 f*（二气配平：两仪各半） ----------
  const yangWeight = elementWeights.wood + elementWeights.fire;
  const yinWeight = elementWeights.metal + elementWeights.water;
  const yiTotal = yangWeight + yinWeight;
  const idealSideWeight = yiTotal / 2;
  const kYang = yangWeight > 1e-6 ? idealSideWeight / yangWeight : 0;
  const kYin = yinWeight > 1e-6 ? idealSideWeight / yinWeight : 0;
  const ideal = FIELD_ELEMENT_ORDER.map((e) => {
    const sign = signOfElement(e);
    const k = sign > 0 ? kYang : sign < 0 ? kYin : 0;
    return round3((zMax * sign * elementWeights[e] * k) / totalWeight);
  });

  const qi: MingJuFieldQi = {
    yangWeight: round3(yangWeight),
    yinWeight: round3(yinWeight),
    earthWeight: round3(elementWeights.earth),
    imbalance: round3(yangWeight - yinWeight),
    idealSideWeight: round3(idealSideWeight),
  };

  // ---------- 可注入目录（十天干 + 十二地支；原局已含者仍可注入） ----------
  // 五行格在本盘的用/忌（土为太极枢机、中轴不动，恒判中性；木火金水取自月令元素级二分）
  const elemMark = (e: FieldElement): XiJiMark => {
    if (e === 'earth') return 'neutral';
    if (yongJi.usefulElements.includes(e)) return 'useful';
    if (yongJi.tabooElements.includes(e)) return 'taboo';
    return 'neutral';
  };
  // 得失口诀：增用=助用吉、增忌=助忌凶、减忌=制忌吉、减用=制用凶；中性（含土）为平
  const judgeEffect = (mark: XiJiMark, change: 'increase' | 'decrease'): 'gain' | 'loss' | 'flat' => {
    if (mark === 'neutral') return 'flat';
    if (change === 'increase') return mark === 'useful' ? 'gain' : 'loss';
    return mark === 'taboo' ? 'gain' : 'loss';
  };
  // 注入字 e₀ 的作用向量：自身 +w_add、所生 +λ·w_add、所克 −λ·w_add
  const buildEffects = (element: FieldElement, wAdd: number): MingJuFieldEffect[] => {
    const items: Array<{ element: FieldElement; kind: FieldEffectKind; weightDelta: number }> = [
      { element, kind: 'self', weightDelta: wAdd },
      { element: FIELD_SHENG_MAP[element], kind: 'generates', weightDelta: shengKeCoupling * wAdd },
      { element: FIELD_KE_MAP[element], kind: 'controls', weightDelta: -shengKeCoupling * wAdd },
    ];
    return items.map(({ element: el, kind, weightDelta }) => {
      const change: 'increase' | 'decrease' = weightDelta >= 0 ? 'increase' : 'decrease';
      const mark = elemMark(el);
      return {
        element: el,
        kind,
        weightDelta: round3(weightDelta),
        change,
        mark,
        verdict: judgeEffect(mark, change),
        axisDelta: round3((zMax * signOfElement(el) * weightDelta) / totalWeight),
      };
    });
  };

  const candidates: MingJuFieldCandidate[] = [];
  const pushCandidate = (char: string, kind: InjectKind) => {
    const element = (kind === 'stem' ? STEM_ELEMENTS[char] : BRANCH_ELEMENTS[char]) as FieldElement;
    const mark = (kind === 'stem' ? yongJi.allStemMarks[char] : yongJi.allBranchMarks[char]) ?? 'neutral';
    const weight = kind === 'stem' ? injectStemWeight : injectBranchWeight;
    const sign = signOfElement(element);
    const effects = buildEffects(element, weight);
    const axisDeltas = FIELD_ELEMENT_ORDER.map((el) => {
      const eff = effects.find((x) => x.element === el);
      return eff ? eff.axisDelta : 0;
    });
    const gains = effects.filter((e) => e.verdict === 'gain').length;
    const losses = effects.filter((e) => e.verdict === 'loss').length;
    const verdict: FieldVerdict =
      gains > losses ? 'gain' : losses > gains ? 'loss' : gains === 0 && losses === 0 ? 'flat' : 'mixed';
    candidates.push({
      id: `${kind === 'stem' ? '干' : '支'}·${char}`,
      kind,
      char,
      element,
      mark,
      sign,
      weight,
      contribution: round3((zMax * sign * weight) / totalWeight),
      effects,
      axisDeltas,
      verdict,
      inChart: presentChars.has(char), // 仅作标记（岁运再逢），不拦截注入
      injected: false,
    });
  };
  STEMS.forEach((s) => pushCandidate(s, 'stem'));
  BRANCHES.forEach((b) => pushCandidate(b, 'branch'));

  // ---------- 注入层（累积） ----------
  const layers: MingJuFieldLayer[] = [
    {
      index: 0,
      label: '原局 f₀',
      layerKind: 'base',
      values: base.slice(),
      delta: 0,
      deltas: FIELD_ELEMENT_ORDER.map(() => 0),
      effects: [],
      verdict: 'flat',
      injectedIds: [],
    },
  ];

  const injected: MingJuFieldCandidate[] = [];
  const acc = [...base];
  for (const id of injectedIds) {
    if (injected.length >= maxInject) {
      warnings.push(`最多可注入 ${maxInject} 个字，超出部分未计入曲线。`);
      break;
    }
    const cand = candidates.find((c) => c.id === id);
    if (!cand) continue;
    const idx = ELEMENT_INDEX[cand.element];
    if (idx === undefined) continue;
    // 作用向量叠加：自身格 + 所生格 + 所克格，非仅字所属五行
    for (let i = 0; i < acc.length; i += 1) acc[i] += cand.axisDeltas[i] ?? 0;
    cand.injected = true;
    injected.push(cand);
    layers.push({
      index: layers.length,
      label: `注入 ${cand.char}`,
      layerKind: 'inject',
      char: cand.char,
      charKind: cand.kind,
      element: cand.element,
      values: acc.map(round3),
      delta: cand.contribution,
      deltaIndex: idx,
      deltas: cand.axisDeltas.slice(),
      effects: cand.effects,
      verdict: cand.verdict,
      injectedIds: injected.map((c) => c.id),
    });
  }

  if (base.every((v) => Math.abs(v) < neutralBand)) {
    warnings.push('两仪权重俱薄、原局基准曲线趋平，此时以理想虚影（二气配平线）为主要参照。');
  }

  return {
    version: MINGJU_FIELD_CFG.version,
    elements: [...FIELD_ELEMENT_ORDER],
    elementNames: FIELD_ELEMENT_ORDER.map((e) => FIELD_ELEMENT_NAMES[e]),
    base: base.map(round3),
    ideal: ideal.map(round3),
    sources,
    candidates,
    injected,
    layers,
    presentChars: [...presentChars],
    elementWeights,
    qi,
    totalWeight: round3(totalWeight),
    zMax,
    maxInject,
    warnings,
  };
}
