# 天枢 · 沛然堂八字系统 — 工程须知

> 本文件是**接手本仓库的 agent / 开发者的第一读本**。它描述「现在的系统是什么样」，不是产品愿景。
> 版本以此为准：`src/pages/BaZiAnalyzerPage/BaZiAnalyzerPage.tsx` 的 `APP_VERSION`（当前「天枢 1.2.0」）。
> 变更记录见 `CHANGELOG.md`；架构与重构路线见 `docs/架构与版本.md`。

---

## 1. 这是什么

一个**纯本地计算**的八字分析 Web 应用，部署在 GitHub Pages。用户输入出生年月日时、性别、出生地区，前端完成排盘与全维度命理分析，不请求任何 AI / 后端接口。

- 品牌：沛然堂（页头 `PEIRANTANG BAZI SYSTEM · RUNS FULLY LOCAL`）。
- 产品名：天枢。
- 上线地址：GitHub Pages（仓库 `Whensunnypassed/tzy`）。
- 三条分析线共用同一份排盘结果：**阴阳线**（现行，元素级）、**希腊线**（希腊占星，异源对照）、**推步线**（占位，二气级，2026-11 立项）。

---

## 2. 技术栈与命令

React 18 + Vite 5 + TypeScript + Tailwind CSS v4，无 UI 框架、无后端、无数据库。

```bash
npm run dev        # 本地开发（本机沙箱下会因 EPERM 起不来，见第 10 节）
npm run build      # 生产构建（同上）
npm run preview    # 预览构建产物
npm run typecheck  # tsc --noEmit，提交前必跑
```

校验脚本（Node，手工运行，不在 CI）：

```bash
node scripts/astro-check.mjs        # 星历 + 轴点回归
node scripts/greek-selfcheck.mjs    # 希腊线自检：5 案例 × 23 项 = 125 项断言
node scripts/astrology-backtest.mjs # 希腊线历史回测
```

---

## 3. 目录结构

```
src/
  analysis/
    common/     公共层：baziCalculator（排盘/真太阳时/节气/四柱/大运）、solarTermsCalc、context（AnalysisContext 装配）
    yinyang/    阴阳线：engine.ts（月气→用忌→五行力量→格局→富贵→大运流年→六亲健康→象意）
    greek/      希腊线：ephemeris / astroChart / tables / dignity / lots / planetaryState /
                aspects / timeLords / selfCheck / analysis / judgement / rectify / stability /
                structuredData / lilly；index.ts 出 GREEK_LINE 与全部 API
    tuibu/      推步线：占位（仅 UI 骨架，未接判据；立项与任务拆分见 docs/推步线·定义与1.3任务.md）
  data/         baziData.ts（干支/藏干/十神/月气等静态规则）、cityData.ts（187 城经纬度 + 历史时区，唯一真源）
  pages/        BaZiAnalyzerPage（主页面，三线切换与渲染）、GreekLine/GreekReport（星盘事实面板）
  styles/       themes.css（宣纸水墨 / 希腊星空双主题）
```

---

## 4. 三条线

| 线 | 判据 | 现状 |
|---|---|---|
| 阴阳线 | 月令用阴 / 用阳（二分） | 已上线，`APP_VERSION` 1.2.0，125 项断言 |
| 希腊线 | 希腊占星事实层（庙旺、相位、宗派、时间主星） | 引擎完整，判读层未启用，只出事实与结构化面板 |
| 推步线 | 月令太极二气配比（连续量） | 占位：UI 骨架 + 声明「未接入判据不输出吉凶」 |

线键：`AnalysisLineKey = 'yinyang' | 'greek' | 'tuibu'`。三线**共用** `AnalysisContext`、排盘、节气、大运表；线是口径，不是平行宇宙。

推步线的定义句：**以月令太极二气之消长为唯一判据，以三元结构承载，以可回测为验。**

---

## 5. 排盘与分析口径（改动前必读）

- 时间基准：年柱 / 月柱 / 节气 / 起运，用**标准时（北京时间）**同帧判定；日柱 / 时柱用**真太阳时**（经度每差 1° 折 4 分钟 + 均时差）。
- 1986–1991 夏令时按 `TIME_BASE_CFG` 自动回拨 60 分钟。
- 年柱以**立春**为界，月柱以**节气**为界（不是农历月初一）。
- 城市库只认 `src/data/cityData.ts`，其它地方出现城市表即为重复真源，应优先删除。
- 五行力量：三档权重（天干 3 / 地支 2 / 月令并现 6 / 藏干含气 3），月令权重最高。
- 断语纪律：不判寿夭；健康只作倾向提示；婚姻/事业只给结构性描述，不出「必离」「必贵」。
- 十神只作社会关系读数，不作为吉凶判据。

---

## 6. 防偏离硬规则（推步线与后续改造共用）

1. 单一判据源：任何吉凶结论都要能反查到月令二气配比或现行月气二分，不允许第三条判据。
2. 标记层不进总分：旬空、月破、伏吟、返吟、神煞、天将等只标窗口，不并入用忌与评分。
3. 先验数据不出断语：十二消息卦等只作归一化分母。
4. 同名同事实只算一次：刑冲合害由八字层算一次，其余模块引用，不重算。
5. 层级物理隔离：不同来源的数据带 uncertainty，不混算。
6. 「身」（固定）与「用神」（随问而变）不同时进判据。

历史教训：纳音路线（`nayinData.ts` / `nayinAnalyzer.ts` / `fiveDimensions.ts`）已于 1.2.0 判定为错误并删除，原因是不可回测、与干支双重记账。不要复活。

---

## 7. UI 设计（Swiss International Style）

- 纸白底 + 墨黑正文 + 灰规线 + 单一朱红 `#E31C29`（主按钮、忌神、版块编号）。
- 语义色：用神石绿 `#2E7654`，忌神朱红；阳气暖橙、阴气冷靛蓝；五行用低饱和平涂色板。
- 直角（`rounded-none`）、无阴影、无渐变、无 emoji 装饰。
- 版块头统一 `label-mono 编号 / EN + 竖线 + 中文标题`；结果页 `max-w-6xl`，主列 + 右侧编号目录。
- 字体只有两族：Archivo + Noto Sans SC（正文），JetBrains Mono（元信息/数字）。
- 所有可交互元素必须有 `focus-visible` 轮廓；outline 按钮 hover 反色转黑底白字。
- 纪念页 `/memorial` 保留水墨风，不适用本节。

---

## 8. 文档纪律

- **只动 md，不碰 src**：文档类改动单独提交，前缀 `docs:`。
- 不入库：`docs/命理源流考.md`、`docs/zhouyi-xiangshu-brief.md` 等长期研究资料（已在 `.gitignore`）；`docs/工作日志.md` 亦属保密清单。
- 研究结论、简报、回测报告写本地，不进仓库；要沉淀进产品的，改写成正式文档后另议。
- 改动涉及版本时：改 `APP_VERSION` + `CHANGELOG.md` + `docs/架构与版本.md` 三处同步。

---

## 9. 已知问题与待办

- `AGENTS.md` 已于 2026-11-04 重写（此前是 10 月底的原型需求书，含「7 大版块 / 无导航」等过期描述）。
- `docs/BACKLOG.md` 仍有 12 处失效锚点（`src/utils/*`，文件已迁 `src/analysis/`）。
- `docs/PROJECT_STATUS.md`「核心文件索引」表仍有 3 处 `src/utils` 老路径。
- `docs/架构与版本.md` 有两个「## 六」标题（重构路线 / 验证基线），编号撞车。
- `CHANGELOG.md` 1.2.0 条目第 19–27 行与第 28 行对纳音路线的表述自相矛盾，需补一句「含同日回退」。
- 本机沙箱下 `npm run dev` / `build` 报 EPERM（esbuild 子进程与日志写入被拦），属环境限制，不是代码缺陷。

---

## 10. 给接手 agent 的提醒

- 先读本文 → `docs/架构与版本.md` → `CHANGELOG.md`，再动代码。
- 排盘层是命脉：改 `baziCalculator` / `solarTermsCalc` 必须跑 `typecheck` 并手工比对 3–5 个边界命例（立春前后、节气前后、夏令时区间）。
- 任何「加新神煞 / 加新断语 / 接 AI 生成」的提议，先对照第 6 节六条硬规则；违反即拒。
- 推步线未接入前，UI 上不得出现吉凶字样；验收以 `docs/推步线·定义与1.3任务.md` 的闸门 P1–P3 为准。
- 提交信息用中文，动词开头，说明「为什么」而不是「改了什么」。
