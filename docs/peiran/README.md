# 沛然堂线研究文章库

> 本目录是沛然堂线（纳音身命法）的研究与验证资料。  
> 代码入口：[`src/analysis/peiran/`](../../src/analysis/peiran/)  
> 规则总表：[`src/analysis/peiran/README.md`](../../src/analysis/peiran/README.md)

## 目录

| 文件 | 内容 |
|---|---|
| [`bibliography.md`](./bibliography.md) | 24 本古籍 + 6 项现代研究，含来源、可靠性、矛盾清单 |
| [`community-sources.md`](./community-sources.md) | 知乎 22 篇 + 豆瓣 21 篇正文提炼，含社区规则与矛盾 |
| [`rules.md`](./rules.md) | 38 条纳音规则原子表，按盘层/学历/财富/情感/工作分类 |
| [`theory.md`](./theory.md) | 纳音身命法三层结构、五维判断层、证据等级与扩展接口 |
| [`validation.md`](./validation.md) | 59 条视频案例 + 1180 条命海案例回测，含决策树检验与结论 |

## 当前结论

- 纯纳音五维在 1180 例公共案例上均低于多数类 baseline，未达到 >70% 硬分类目标。
- 学历在 59 条视频案例上 72.7%，但受类不平衡影响，不能作为稳定能力。
- 纳音适合做“身命/器识/取象/关系”层；五维硬分类需要正五行/十神底盘或更高质量标签。
- 04 纳音命主速览已接入“盘层/学历/财富/工作”四张倾向卡，带置信度与证据链；不承诺硬分类准确率。

## 复跑

```bash
node scripts/peiran-backtest.mjs          # 59 条视频案例
node scripts/peiran-backtest-minghai.mjs  # 1180 条命海案例
```
