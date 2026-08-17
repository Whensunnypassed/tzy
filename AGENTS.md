# 天之易八字自动分析工具 - 需求拆解文档

## 产品概述

- **产品类型**: 命理分析工具（Web 应用）
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 命理爱好者、易学学习者、对八字命理感兴趣的普通用户
- **核心价值**: 基于天之易八字命理体系，输入出生信息后自动完成排盘与全维度命理分析，生成结构化、可视化的解读报告
- **界面语言**: 中文
- **主题偏好**: 浅色（中国风/水墨典雅调性）
- **导航模式**: 无导航（单页工具应用，输入→结果同一页面内流转）
- **参考手册**: 天之易八字具体使用方法手册（来源：https://aka.doubaocdn.com/s/cLalw3vv7v），所有分析逻辑严格遵循其中理论体系

---

## 页面结构总览

**页面文件**: `BaZiAnalyzerPage.tsx`

| 区域 | 说明 |
|-----|------|
| 顶部品牌区 | 工具名称「天之易八字自动分析」+ 副标题「以太极阴阳为体，以月气动应为用」 + 简短说明 |
| 输入表单区 | 公历年月日时选择器 + 性别选择 + 出生地区（用于真太阳时校正） + 「开始分析」主按钮 |
| 结果展示区 | 分模块卡片式展示11大分析内容，支持折叠/展开，含图表可视化 |
| 底部操作区 | 「重新排盘」按钮 + 回到顶部快捷入口 |

---

## 页面布局建议

- **布局模式**: **上下分区（单栏流式）** —— 用户先填写输入表单，提交后下方展开完整分析报告。报告内容量大，适合垂直滚动阅读。
- **视觉重心**: **结果展示区** —— 输入表单只占首屏上半部分约 40% 高度，分析结果是核心内容，占据页面绝大部分空间。
- **结果承载区**: 11 个可折叠卡片模块 + 五行/阴阳可视化图表区；初始态为**空状态**（显示「请输入出生信息开始排盘」提示 + 示例八字快速填充按钮）。
- **结果区内部结构**: 顶部放「自动排盘总览」+「五行/阴阳力量可视化」，下方按分析深度递进排列（月气→用忌→日干支→命局模式→富贵贫贱→七大项→六亲→健康→大运流年→十干喜忌）。

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 天干地支/五行/藏干/十神等基础命理数据 | demo-mock | `src/data/baziData.ts` 中定义十天干、十二地支、五行生克、地支藏干、六十甲子、十二月气、十干喜忌等静态常量 | ✅ 本身就是静态规则数据 |
| 真太阳时校正与排盘计算 | demo-mock | 在 `src/utils/baziCalculator.ts` 中实现公历→农历→四柱换算算法（含二十四节气分界、真太阳时经度校正逻辑），基于规则计算，不依赖外部 API | 初始提供示例八字（如 1990 年 5 月 15 日 12 时 男）作为默认演示数据 |
| 月气分析/用神忌神/命局模式等推理逻辑 | demo-mock | 在 `src/utils/baziAnalyzer.ts` 中按天之易手册规则程序化实现：月气判断→阴阳状态→用忌标记→日干支动应→模式识别→富贵贫贱→六亲健康→大运流年全流程分析引擎 | 分析结果由引擎实时计算生成，非硬编码 mock 文本 |
| 五行力量/阴阳平衡可视化数据 | demo-mock | 由分析引擎计算五行旺衰得分和阴阳力量比，传给图表组件渲染（柱状图/雷达图/对比条） | 无额外 mock，数据来自实时计算 |
| 排盘历史记录 | local-persist | `localStorage` key=`__app_tianzhiyi_history`，保存最近 10 次排盘记录（出生信息 + 时间戳） | 无 |
| 分析报告分享/复制 | import-export | `navigator.clipboard` 复制文本摘要 + `Blob + URL.createObjectURL` 导出为 .txt 格式 | 无 |

---

## 功能列表

- **页面**: 八字分析工具主页面
  - **页面目标**: 用户输入出生信息，一键获取基于天之易体系的完整八字结构化分析报告
  - **功能点**:
    - **出生信息输入与排盘**: 公历年月日时选择（年/月/日/时/分）+ 性别单选（男/女）+ 出生地区下拉（用于真太阳时经度校正），点击「开始分析」后调用排盘引擎计算四柱八字、地支藏干、大运排布、当前大运流年，并展示排盘总览表（天干/地支/五行/阴阳/十神/用忌标记）
    - **月气与用神忌神分析**: 自动识别月令本气、判断阴阳旺衰状态、输出十二月气描述文本；基于月气确定用神（绿色标记）/忌神（红色标记）方向，标注每个干支的用忌属性，展示「得失口诀」（助用得吉、助忌得凶、制用得凶、制忌得喜）及应用说明
    - **五行阴阳可视化**: 用柱状图展示金木水火土五行力量对比，用雷达图展示五行分布，用阴阳对比条展示阳气（木火）与阴气（金水）的力量平衡状态；土作为调节因素单独标注
    - **日干支动应与命局模式分析**: 分析日主五行阴阳性质、日支与日主组成的太极状态、日干支直读内容（取象）、对平衡的作用评级（积极/消极/微弱）；识别命局主要生克关系、判断命局模式类型（生克模式/平衡模式/得失模式）
    - **富贵贫贱与七大项内容分析**: 基于阳气状态判断财富程度（富/小康/贫）、基于阴气状态判断贵寿程度（贵/平常/夭）、综合评定命局层次；输出七大项分析（阴阳二气、五行程度、干支取象、宫位六亲身体、十神社会关系、干支作用刑冲合害）
    - **六亲·健康·大运流年分析**: 六亲分析（父母/配偶/子女/兄弟姐妹，结合宫位与十神）；健康分析（五行对应脏腑、被克五行→健康隐患、宫位对应身体部位）；大运流年分析（八步大运吉凶表 + 当前大运详解 + 最近5年流年提示 + 关键应期提示）；十干喜忌参考（基于日主天干展示喜忌五行及说明）
    - **报告交互与历史记录**: 所有分析模块支持折叠/展开（默认展开前 3 个核心模块，其余折叠）；「重新排盘」按钮清空结果返回输入态；自动保存最近 10 次排盘历史到本地，可点击快速回填；支持一键复制报告摘要文本

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

## 1. 设计推导依据

- **参考意图**: Free Direction —— 参考手册提供理论体系与内容语义，不参与视觉与布局决策
- **核心情绪 / 应用类型**: 命理分析工具，追求"沉静、可信、有古意但不迷信"的专业感
- **独特记忆点**: 以"水火阴阳鱼"太极圆环为核心视觉母题，贯穿排盘、阴阳平衡可视化与用神忌神标记，形成可识别的命理体系感

## 2. Art Direction

- **方向名**: 水墨命理 · 现代典籍
- **Design Style**: Editorial 经典排版 + Soft Blocks 柔色块 —— 命理内容厚重且专业，需典籍式阅读舒适感；柔色块用于五行分类与吉凶标记，降低玄秘感
- **DNA 参数**: 圆角 subtle (`rounded-md`) / 阴影 subtle (`shadow-sm`) / 间距 standard (`gap-4 p-6`) / 字体方向 衬线标题 + 无衬线正文 / 装饰手法 细横线分隔、太极图形元素、干支方格排版
- **应用类型**: Tool + Report —— 首页输入为聚焦任务流，结果页为结构化长报告

## 3. Color System

**色彩关系**: 墨黑主文字 + 宣纸米白背景 + 朱砂红 primary + 石绿 accent + 浅灰褐分隔线；用神用石绿系，忌神用朱砂系，阴阳用暖橙（阳）与冷靛蓝（阴）表达
**配色设计理由**: 取传统命理典籍的墨色、朱砂印、宣纸底与石绿批注语义，既保留东方文化气质，又通过现代比例控制避免封建迷信感；primary 朱砂只用于 CTA、忌神标记与关键状态，accent 石绿用于用神与辅助高亮
**主色推导**: 从"朱批命书"语义提取朱砂红为 primary，对应忌神与主行动；石绿为传统批注色，对应用神与辅助；阴阳二气用橙与靛蓝表达水火概念
**使用比例**: 65% 中性（墨/纸/灰褐） / 25% 辅助（石绿+靛蓝+暖橙） / 10% primary（朱砂）；primary 仅用于主按钮、忌神标记、当前大运高亮，不滥用

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(40 35% 97%) | 宣纸米白底，长阅读不刺眼 |
| card | `--card` | `bg-card` | hsl(0 0% 100%) | 纯白卡片承载分析模块 |
| text | `--foreground` | `text-foreground` | hsl(24 15% 15%) | 墨色正文，典籍质感 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(24 8% 45%) | 淡褐灰辅助文字 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(3 72% 48%) | 朱砂红，主CTA与忌神标记 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%) | 朱砂上的白字 |
| accent | `--accent` | `bg-accent` | hsl(145 35% 92%) | 石绿浅底，hover/选中与用神背景 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(145 45% 28%) | 深石绿文字，用神标签 |
| border | `--border` | `border-border` | hsl(24 12% 86%) | 浅褐灰分隔线，宣纸折痕感 |

**语义色提示**:
- 用神（吉）: bg `hsl(145 35% 92%)` / border `hsl(145 40% 75%)` / text `hsl(145 45% 28%)` —— 石绿系，饱和度与 primary 对齐
- 忌神（凶）: bg `hsl(3 70% 95%)` / border `hsl(3 65% 80%)` / text `hsl(3 72% 40%)` —— 朱砂系，直接使用 primary 色温
- 阳气（火/富）: bg `hsl(28 90% 94%)` / border `hsl(28 80% 75%)` / text `hsl(24 85% 35%)` —— 暖橙，高于 primary 明度
- 阴气（水/贵寿）: bg `hsl(210 40% 93%)` / border `hsl(210 45% 75%)` / text `hsl(215 50% 30%)` —— 冷靛蓝，与 primary 饱和度接近
- 五行色: 木 `hsl(90 35% 45%)`、火 `hsl(24 85% 50%)`、土 `hsl(38 55% 55%)`、金 `hsl(45 15% 65%)`、水 `hsl(210 50% 45%)` —— 饱和度统一 35-55%，用于图表与干支标记

## 4. 字体与节奏

- **font-display**: Noto Serif SC —— 标题与干支排盘用衬线，呼应命理学典籍气质
- **font-body**: Noto Sans SC —— 分析正文与说明用无衬线，保证长文阅读效率
- **字号**: H1 text-4xl ~ text-5xl（Noto Serif SC）；H2 text-xl ~ text-2xl（衬线）；body text-base；muted text-sm；干支大字 text-3xl ~ text-4xl（排盘格内）
- **圆角**: subtle (`rounded-md`) —— 卡片与输入框微圆，保留典籍方正感

## 5. 全局布局契约

- **Reference Layout Use**: 按需求结构推导，首页为聚焦输入，结果页为模块式长报告
- **Page / Section Order**: 首页（输入表单+开始分析）→ 结果页（排盘→月气→用忌→日主→命局模式→富贵贫贱→七大项→六亲→健康→大运流年→十干喜忌）
- **Standard Content Zone**: 结果页 `max-w-5xl mx-auto`；首页表单收窄至 `max-w-xl`
- **Shell / Frame Alignment**: 内容容器与框架同宽，顶部简洁导航 + 重新排盘按钮
- **Padding & Rhythm**: `px-4 md:px-6 lg:px-8 py-10 md:py-14`，卡片间距 `gap-5`，模块间 `space-y-8`
- **Full-bleed Zones**: 首页 Hero / 结果页顶部排盘横幅可全宽背景，内部内容受内容区约束
- **Local Narrowing**: 输入表单、日主分析正文、十干喜忌等文本区可在容器内收窄至 `max-w-2xl`
- **Overflow Strategy**: 大运流年时间线、五行雷达图、刑冲合害表格使用 `overflow-x-auto`
- **Flexibility Boundary**: 允许移动端卡片内边距与列数调整；主色、圆角、阴影、干支方格样式全站统一

## 6. 视觉与动效

- **装饰**: 细线分隔、干支方格排版、极简太极图形
- **阴影/边界**: 轻阴影 + 1px 边框，卡片微浮起；用神/忌神标签用填充色+边框
- **动效**: 克制 —— 折叠展开用 200ms ease；hover 用浅底过渡；分析结果入场用轻微上移淡入；避免夸张动效

## 7. 组件原则

- 排盘用 2×4 干支方格：天干在上、地支在下，每格标注五行与阴阳小圆点，用神绿边/忌神红边
- 阴阳平衡用横向对比条：左侧暖色（阳）右侧冷色（阴），中间垂直分隔线为平衡中点
- 五行力量用柱状图或雷达图，柱色对应五行色
- 可折叠卡片：标题左对齐 + 右侧展开箭头，展开状态下边框高亮
- 所有按钮、输入框、折叠卡片必须有 Default / Hover / Active / Focus-visible / Disabled 状态
- Primary 朱砂按钮仅用于"开始分析"与关键行动；"重新排盘"用 outline 次级按钮

## 8. Image Direction

- **Image Role**: 首页 Hero 背景氛围图 + 结果页排盘区顶部装饰图形
- **Image Art Direction**: 极简东方水墨风格，大面积留白，底部隐约山峦/水面剪影，中央上方一轮暖日光晕对应阳气概念，整体低对比、低饱和，不抢文字焦点；作为文字背景使用，需保证前景表单高可读
- **Image Prompt Keywords**: 东方水墨山水, 极简留白, 宣纸纹理, 暖日光晕, 淡墨远山, 水平构图, 低饱和度, 典籍气质, 底部剪影, 大面积负空间
- **Image Avoidance**: 避免八卦符号堆砌、算命先生形象、锦鲤铜钱等俗套命理元素、高饱和度渐变、3D 渲染感、通用图库商务人物

## 9. Anti-patterns

- **Feudal mysticism**: 满页八卦、太极、符咒、金色龙纹等玄学堆砌；本产品是专业分析工具，视觉克制，只用极简太极与五行色做语义标记
- **Rainbow five elements**: 五行五色饱和度过高导致页面像儿童读物；统一饱和度 35-55%，以墨色和纸白为基底
- **SaaS default drift**: 回到蓝色按钮 + 灰白卡片 + 通用图表；必须用朱砂/石绿/墨色/宣纸底色建立命理工具识别度
- **Status color overload**: 用神/忌神/阴阳/五行全用饱和色填满；颜色按层级使用，基础信息只用墨色，关键判断才上色
- **Invisible interaction**: 干支格、折叠卡片、大运节点只有颜色没有焦点状态；所有可交互元素必须有 focus-visible 轮廓
- **Typography chaos**: 干支、标题、正文、说明全用不同字重字号混搭；标题统一 Noto Serif SC，正文 Noto Sans SC，干支用大号衬线但与标题同族