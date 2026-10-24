# 沛然堂八字系统 - 需求拆解文档

## 产品概述

- **产品类型**: 命理分析工具（Web 应用）
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 命理爱好者、易学学习者、对八字命理感兴趣的普通用户
- **核心价值**: 基于沛然堂八字命理体系，输入出生信息后自动完成排盘与全维度命理分析，生成结构化、可视化的解读报告
- **界面语言**: 中文
- **主题偏好**: 浅色（中国风/水墨典雅调性）
- **导航模式**: 无导航（单页工具应用，输入→结果同一页面内流转）
- **参考手册**: 沛然堂八字具体使用方法手册（来源：https://aka.doubaocdn.com/s/cLalw3vv7v），所有分析逻辑严格遵循其中理论体系

---

## 页面结构总览

**页面文件**: `BaZiAnalyzerPage.tsx`

| 区域 | 说明 |
|-----|------|
| 顶部品牌区 | 工具名称「沛然堂 · 八字系统」+ 英文条「PEIRANTANG BAZI SYSTEM · RUNS FULLY LOCAL」+ 右侧「特别鸣谢」卡（凤梨） |
| 输入表单区 | 公历年月日时选择器 + 性别选择 + 出生地区（东五区～东九区大块时区 + 北京精确项，用于真太阳时校正） + 「开始分析」主按钮 |
| 结果展示区 | 分模块卡片式展示 7 大分析版块，垂直滚动阅读，含大运流年评分曲线等可视化 |
| 底部操作区 | 「重新排盘」按钮 + 回到顶部快捷入口 |

---

## 页面布局建议

- **布局模式**: **上下分区（单栏流式）** —— 用户先填写输入表单，提交后下方展开完整分析报告。报告内容量大，适合垂直滚动阅读。
- **视觉重心**: **结果展示区** —— 输入表单只占首屏上半部分约 40% 高度，分析结果是核心内容，占据页面绝大部分空间。
- **结果承载区**: 7 个编号版块（01 四柱排盘 / 02 命主速览 / 03 月气分析 / 04 用神忌神 / 05 大运流年 / 06 命局模式 / 07 象意解读）+ 大运流年评分曲线等可视化；初始态为**空状态**（显示「请输入出生信息开始排盘」提示 + 示例八字快速填充按钮）。
- **结果区内部结构**: 顶部「四柱排盘总览」+「命主速览」，下方按分析深度递进排列（月气分析 → 用神忌神 → 大运流年 → 命局模式 → 象意解读）。

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 天干地支/五行/藏干/十神等基础命理数据 | demo-mock | `src/data/baziData.ts` 中定义十天干、十二地支、五行生克、地支藏干、六十甲子、十二月气、十干喜忌等静态常量 | ✅ 本身就是静态规则数据 |
| 真太阳时校正与排盘计算 | demo-mock | 在 `src/utils/baziCalculator.ts` 中实现公历→农历→四柱换算算法（含二十四节气分界、真太阳时经度校正逻辑），基于规则计算，不依赖外部 API | 初始提供示例八字（如 1990 年 5 月 15 日 12 时 男）作为默认演示数据 |
| 月气分析/用神忌神/命局模式等推理逻辑 | demo-mock | 在 `src/utils/baziAnalyzer.ts` 中按沛然堂八字手册规则程序化实现：月气判断→阴阳状态→用忌标记→日干支动应→模式识别→富贵贫贱→六亲健康→大运流年全流程分析引擎 | 分析结果由引擎实时计算生成，非硬编码 mock 文本 |
| 五行力量/寒暖阴阳数据 | demo-mock | 由分析引擎计算五行旺衰得分与阴阳力量比，供用忌评分、富贵评定与命局模式调用（对应可视化模块已下线） | 无额外 mock，数据来自实时计算 |
| —（已移除）| — | **排盘历史记录功能已按要求移除**（原 `localStorage` key=`__app_peirantang_history` 不再写入；页面无历史入口，分析结果不留存本地） | 无 |

---

## 功能列表

- **页面**: 八字分析工具主页面
  - **页面目标**: 用户输入出生信息，一键获取基于沛然堂八字体系的完整八字结构化分析报告
  - **功能点**:
    - **出生信息输入与排盘**: 公历年月日时选择（年/月/日/时/分）+ 性别单选（男/女）+ 出生地区下拉（东五区～东九区大块时区 + 北京精确项，用于真太阳时经度校正，`BIRTH_REGION_CFG`），点击「开始分析」后调用排盘引擎计算四柱八字、地支藏干、大运排布、当前大运流年，并展示排盘总览表（天干/地支/五行/阴阳/十神/用忌标记）
    - **月气与用神忌神分析**: 自动识别月令本气、判断阴阳旺衰状态、输出十二月气描述文本；基于月气确定用神（绿色标记）/忌神（红色标记）方向，标注每个干支的用忌属性，展示「得失口诀」（助用得吉、助忌得凶、制用得凶、制忌得喜）及应用说明
    - **命局模式分析（年月太极）**: 分析年干定位（月令十二长生吉凶）、年支作用、两仪气机（阳仪/阴仪力量）、日时应验（宜年/破坏），构成格局根本判定
    - **富贵贫贱与七大项内容分析**: 基于阳气状态判断财富程度（富/小康/贫）、基于阴气状态判断贵寿程度（贵/平常/夭）、综合评定命局层次；输出七大项分析（阴阳二气、五行程度、干支取象、宫位六亲身体、十神社会关系、干支作用刑冲合害）
    - **六亲·健康·大运流年分析**: 六亲分析（父母/配偶/子女/兄弟姐妹，结合宫位与十神）；健康分析（五行对应脏腑、被克五行→健康隐患、宫位对应身体部位）；大运流年分析（八步大运吉凶表 + 当前大运详解 + 最近5年流年提示 + 关键应期提示）；十干喜忌参考（基于日主天干展示喜忌五行及说明）
    - **重置**: 「重新排盘」按钮清空结果返回输入态（原「排盘历史记录」功能已按要求移除，本地不再保存任何排盘记录）

---

## 核心数据结构定义

```ts
/** 天干 */
interface HeavenlyStem {
  char: string;       // 甲乙丙丁戊己庚辛壬癸
  element: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  yinYang: 'yin' | 'yang';
}

/** 地支 */
interface EarthlyBranch {
  char: string;       // 子丑寅卯辰巳午未申酉戌亥
  element: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  yinYang: 'yin' | 'yang';
  hiddenStems: string[]; // 藏干
}

/** 四柱 */
interface FourPillars {
  year: { stem: HeavenlyStem; branch: EarthlyBranch };
  month: { stem: HeavenlyStem; branch: EarthlyBranch };
  day: { stem: HeavenlyStem; branch: EarthlyBranch };
  hour: { stem: HeavenlyStem; branch: EarthlyBranch };
}

/** 五行力量 */
interface ElementPower {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

/** 月气分析结果 */
interface MonthQiAnalysis {
  monthBranch: string;     // 月令地支
  mainQi: string;          // 本气五行
  yangState: 'strong' | 'weak';  // 阳气状态
  yinState: 'strong' | 'weak';   // 阴气状态
  usageDirection: 'yang' | 'yin'; // 用阳还是用阴
  description: string;     // 月气描述
}

/** 用神忌神标记 */
interface YongJiMarking {
  usefulGods: string[];    // 用神五行/干支
  tabooGods: string[];     // 忌神五行/干支
  stemMarks: Record<string, 'useful' | 'taboo' | 'neutral'>;
  branchMarks: Record<string, 'useful' | 'taboo' | 'neutral'>;
}

/** 大运 */
interface DaYun {
  index: number;
  stem: string;
  branch: string;
  startAge: number;
  startYear: number;
  endYear: number;
  fortune: 'ji' | 'xiong' | 'neutral'; // 吉凶
  description: string;
}

/** 完整分析报告 */
interface BaZiReport {
  basicInfo: {
    birthDate: string;
    birthTime: string;
    gender: 'male' | 'female';
    birthPlace: string;
    trueSolarTime: string;
  };
  fourPillars: FourPillars;
  tenGods: Record<string, string>; // 各干相对于日主的十神
  monthQi: MonthQiAnalysis;
  yongJi: YongJiMarking;
  elementPower: ElementPower;
  yinYangBalance: { yang: number; yin: number };
  dayStemBranchAnalysis: {
    dayMasterNature: string;
    taijiState: string;
    directReading: string;
    balanceEffect: 'positive' | 'negative' | 'weak';
  };
  mingJuPattern: {
    mainShengKe: string[];   // 主要生克关系
    patternType: 'shengke' | 'balance' | 'gainloss';
    description: string;
  };
  wealthLevel: 'rich' | 'well-off' | 'poor';
  nobilityLevel: 'noble' | 'average' | 'premature';
  overallLevel: string;
  sevenCategories: {
    yinYang: string;
    fiveElements: string;
    ganzhi: string;
    gongwei: string;
    shiShen: string;
    interaction: string;
  };
  liuQin: {
    parents: string;
    spouse: string;
    children: string;
    siblings: string;
  };
  health: {
    weakElements: string[];
    healthRisks: string[];
    bodyParts: string;
  };
  daYunList: DaYun[];
  currentDaYunIndex: number;
  recentLiuNian: Array<{ year: number; ganzhi: string; fortune: string; hint: string }>;
  shiGanXiJi: {
    dayStem: string;
    xi: string[];   // 喜
    ji: string[];   // 忌
    description: string;
  };
}

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

> 2026-10 起全站改为**瑞士国际主义设计（Swiss International Style / Helvetica 网格传统）**。Memorial 纪念页（/memorial、/memorial/mao）保留原有庄重水墨风，与主站视觉切割，不适用本指南。

## 1. 设计推导依据

- **参考意图**: Free Direction —— 参考手册提供理论体系与内容语义，不参与视觉与布局决策
- **核心情绪 / 应用类型**: 命理分析工具，追求"客观、精确、可信"的专业感，像一份排版严谨的分析报告而非命书
- **独特记忆点**: 严格基线网格 + 编号式版块（01/02…）+ 大写等宽元信息标签（label-mono）+ 单一朱红点缀，形成"瑞士印刷厂排出的命理报告"识别度

## 2. Art Direction

- **方向名**: 瑞士国际主义 · 命理报告
- **Design Style**: Swiss International Typographic Style —— 严格网格、非对称构图、功能至上；装饰为零，一切视觉元素承载信息或层级
- **DNA 参数**: 圆角 0（直角，`rounded-none`）/ 阴影 无（纯扁平，全部 shadow 置 none）/ 间距 standard（`gap-4 p-6`，网格对齐）/ 字体方向 全无衬线 + 等宽元信息 / 装饰手法 细规线（hairline）、编号版块、印刷对位角标（crosshair）、朱红下划线式高亮（mark-highlight）
- **应用类型**: Tool + Report —— 首页输入为聚焦任务流，结果页为结构化长报告

## 3. Color System

**色彩关系**: 纸白底 + 墨黑主文字 + 灰网格线 + 单一朱红（#E31C29）primary；用神石绿（#2E7654），忌神朱红，阳气暖橙（hsl(28 82% 48%)），阴气冷靛蓝（hsl(215 55% 38%)）
**配色设计理由**: 瑞士传统的中性基底（白/黑/灰）承担 90% 以上画面，色彩只在语义判断处出现——朱红既是主行动也是忌神，石绿即用神；五行色为低饱和平涂色板，服务图表与干支标记
**使用比例**: 70% 中性（纸白/墨黑/灰线） / 20% 语义辅助（石绿/靛蓝/暖橙/五行色） / 10% primary（朱红）；primary 仅用于主按钮、忌神标记、版块编号与关键状态

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(210 17% 98%) | 冷纸白底 |
| card | `--card` | `bg-card` | hsl(0 0% 100%) | 纯白卡片承载分析模块 |
| text | `--foreground` | `text-foreground` | hsl(222 14% 16%) | 墨黑正文（≈#1F2937） |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(222 10% 45%) | 中灰辅助文字 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(356 78% 50%) | 朱红 #E31C29，主CTA与忌神标记 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%) | 朱红上的白字 |
| accent | `--accent` | `bg-accent` | hsl(210 15% 94%) | 浅灰底，hover/选中 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(222 14% 16%) | 深墨文字 |
| border | `--border` | `border-border` | hsl(222 10% 85%) | 灰规线（hairline） |

**语义色提示**:
- 用神（吉）: `#2E7654`（石绿）—— 边框/实心块/文字，背景用 `rgba(46,118,84,.07)`
- 忌神（凶）: `#E31C29`（朱红）—— 背景用 `rgba(227,28,41,.06)`
- 阳气: `hsl(28 82% 48%)` 暖橙 / 阴气: `hsl(215 55% 38%)` 冷靛蓝
- 五行色（低饱和平涂）: 木 `#4A834E`、火 `#DC4824`、土 `#B98C31`、金 `#788491`、水 `#31669B`
- 九档评级色: S+ `#E31C29` / S `#B98C31` / A+ `#2E7654` / A `#4A834E` / B+ `#31669B` / B- `#788491` / C `#C2410C` / C- `#9A3412` / D `#9CA3AF`

## 4. 字体与节奏

- **font-sans**: Archivo + Noto Sans SC —— 标题、正文、干支全部无衬线；H1/H2 用 800-900 字重 + 紧字距（tracking-tight）
- **font-mono**: JetBrains Mono —— 元信息标签（label-mono）、版块编号（01/SECTION）、数字（num-tabular 等宽数字）、干支五行小注
- **字号**: H1 text-5xl ~ text-7xl（黑体极粗）；H2 text-xl ~ text-2xl；body text-base；muted/label text-[11px]；干支大字 text-3xl ~ text-4xl
- **圆角**: 0 —— 全站直角，任何 rounded-* 仅 rounded-none（圆形仅用于色点图例等几何元素）

## 5. 全局布局契约

- **Reference Layout Use**: 严格网格；首页报头为非对称双栏（大标题+特别鸣谢卡），结果页为编号版块纵列
- **Page / Section Order**: 首页（输入表单+开始排盘）→ 结果页（01 四柱排盘 → 02 命主速览 → 03 月气分析 → 04 用神忌神 → 05 大运流年 → 06 命局模式 → 07 象意解读）
- **Standard Content Zone**: 结果页 `max-w-6xl mx-auto`，主内容列 + 右侧编号目录边栏（lg 以上）；首页表单 `max-w-xl`
- **Shell / Frame Alignment**: 版块头栏统一 `label-mono 编号 / EN + 竖线 + 中文标题` 结构；卡头 `border-b`，内容区 `p-4 md:p-8`
- **Padding & Rhythm**: 版块间距 `space-y-5`；网格列间距 `gap-3 md:gap-4`；一切对齐基线网格
- **Full-bleed Zones**: 报头与页脚可全宽，内部内容受内容区约束；页脚 `border-t-4 border-foreground`
- **Overflow Strategy**: 大运流年时间线、刑冲合害表格使用 `overflow-x-auto`
- **Flexibility Boundary**: 允许移动端调整列数；朱红/墨黑/灰线/直角/编号版块样式全站统一

## 6. 视觉与动效

- **装饰**: 仅规线（1px border / hairline）、编号、对位角标（crosshair）、朱红下划线高亮（mark-highlight）；禁止渐变、阴影、emoji 装饰符号
- **阴影/边界**: 无阴影；层级靠边框粗细（1px 常规 / 2px 强调 / 4px 报头页脚）与留白
- **动效**: 克制 —— 折叠展开 200ms ease；hover 用底色过渡或反色（outline 按钮 hover 变黑底白字）；结果入场轻微上移淡入（reveal）；无弹跳、无闪烁、无跟随特效

## 7. 组件原则

- 排盘用 2×4 干支方格：天干在上（描边块）、地支在下（实心块），用神绿/忌神红/中性灰，直角无圆角
- 阴阳/寒热对比用横向条或环形图，平涂色，无 glow
- 五行力量用柱状图或雷达图，柱色对应五行平涂色
- 可折叠卡片：编号标题左对齐 + 右侧展开箭头；卡头 `label-mono` 元信息
- 所有按钮、输入框、折叠卡片必须有 Default / Hover / Active / Focus-visible / Disabled 状态
- Primary 朱红按钮仅用于"开始排盘"与关键行动；"重新排盘"等用 outline（hover 黑底反白）

## 8. Image Direction

- **Image Role**: 主站不使用氛围图/插画；视觉表达完全由网格、排版与语义色承担
- **若必须配图**: 极简几何/抽象构成，单色或双色调，高对比，无装饰性纹理

## 9. Anti-patterns

- **Gradient & shadow drift**: 重新引入渐变、阴影、圆角即破坏瑞士体系；一切平面、直角、规线
- **Emoji decoration**: ✦♡✿🚀 等装饰符号禁止出现在 UI（引擎输出文本中的符号除外）
- **Rainbow five elements**: 五行色饱和度过高像儿童读物；只用低饱和平涂色板
- **Status color overload**: 用神/忌神/阴阳/五行全用饱和色填满；中性信息只用墨黑与灰线，关键判断才上色
- **Invisible interaction**: 所有可交互元素必须有 focus-visible 轮廓
- **Typography chaos**: 全站仅无衬线（Archivo/Noto Sans SC）+ 等宽（JetBrains Mono）两族；禁止衬线、禁止手写体、禁止多字重混搭无层级