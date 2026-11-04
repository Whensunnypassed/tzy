# 沛然堂线（希腊占星）

状态：**随天枢 1.2.0 发布（2026-11-03）**。事实层与判读层均已落地。
原纳音身命法路线判定为错误，相关数据书、五维评分与回测脚本已清空，本文档改为当前引擎索引。

## 引擎模块

| 文件 | 职责 |
| --- | --- |
| `ephemeris.ts` | 自研七政黄历；对 NASA JPL Horizons DE441 误差 ≤3 角分；两套日数历元（行星用 Schlyter 1999-12-31，恒星时用真 J2000） |
| `astroChart.ts` | 恒星时 / ASC / MC / 整宫制 / 宗派 / 整宫相位；携带 `timePrecision` |
| `tables.ts` | 静态规则唯一真源：庙旺陷落、三分主星、埃及界、36 面、喜乐宫、宫位吉凶分档、黄道释放年数、法尔达利亚、七虚点与阿拉伯点公式 |
| `dignity.ts` | 尊贵判定 + 点位 almuten 计分 |
| `lots.ts` | 七虚点（Paulus）+ 10 项阿拉伯点（昼夜互换，婚姻点按性别） |
| `planetaryState.ts` | 东出西入 / 燃烧 / 中心 / 顺逆留 / 疾迟 / 喜乐宫 / 宗派半球 |
| `aspects.ts` | 度相位（入相出相）、空亡、映照、光线收集 |
| `timeLords.ts` | 周年推运、黄道释放 L1–L2、法尔达利亚、太阳返照 |
| `lilly.ts` | Lilly 计分表（本质 + 偶然，量程 −38 ~ +38） |
| `judgement.ts` | 六主题判读：四档校准阈值 → 六段区间谱 + 大概率区间 + 两句读法 + 加减分来源 |
| `structuredData.ts` | 结构化契约 v1.0.0 + 数据质量标记（时区精度 / 时刻精度 / 性别缺失 / 自检失败） |
| `rectify.ts` | 验前事出生时间校准：按年龄分组事件、覆盖度检查、±20 分钟扫描排序 |
| `stability.ts` | ±30 分钟 8 切片，统计六主题档位一致率 |
| `selfCheck.ts` | 23 项自检（T1–T9 / C1–C5 / X1–X5 / L1–L4） |
| `analysis.ts` | `buildPeiranModel` 单次装配，展示层只读 |

## 页面

- 入口：[`src/pages/PeiranLine/PeiranReport.tsx`](../../src/pages/PeiranLine/PeiranReport.tsx)
- 01 星盘基础 → 02 十二宫位（吉 / 平 / 凶角标与光效）→ 03 命理解读（六张区间卡）→ 04–10 详细数据折叠
- 双主题：宣纸水墨（阴阳线）/ 希腊星空（沛然堂线），由 `src/styles/themes.css` 驱动

## 验证

```powershell
node scripts/astro-check.mjs        # 七政黄经对 JPL DE441 + ASC 自洽
node scripts/peiran-selfcheck.mjs   # 5 案例 × 23 项 = 125 项断言
```

## 资料台账

[`docs/astrology/resources.md`](../astrology/resources.md)

## 已知遗留

- Al-Biruni 虚点表逐条对照：缺原文 PDF（*Book of Instruction in the Elements of the Art of Astrology*）
- 28 星宿：用户明确暂缓
- 判读阈值虽已校准，回测命中率仍低于「一律猜中平」基线，样本量不足
