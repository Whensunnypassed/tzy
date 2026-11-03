#!/usr/bin/env node
/**
 * 希腊占星 · 视频案例回测
 *
 * 数据源：docs/视频案例库.md（59 条，由 B 站视频提取）
 *
 * 已知数据缺陷（脚本会显式列出，不影响运行）：
 *   1. 出生地全部未提及 → 按规则统一取北京经纬度（39.90°N / 116.41°E）
 *   2. 出生时间只有时辰（2 小时粒度）→ ASC 误差最大可达 ±30°，
 *      凡依赖上升点与宫位的判读（性格 / 事业 / 财富 / 关系 / 健康）都不可靠
 *   3. 财富标签大量为「未提及 / 未量化」，可用样本远少于 59
 *
 * 因此本回测只作「管线连通性与基线参考」，不作准确性结论。
 *
 * 运行：node scripts/astrology-backtest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadCore() {
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  const entry = path.join(distDir, '_astro_bt_entry.ts');
  const outfile = path.join(distDir, '_astro_backtest.cjs');
  fs.writeFileSync(
    entry,
    `
import { buildPeiranModelFromChart } from '@/analysis/peiran/analysis';
import { buildAstroChart } from '@/analysis/peiran/astroChart';
import { judgeChart, setLevelThresholds } from '@/analysis/peiran/judgement';
import { findCity } from '@/data/cityData';
export { buildPeiranModelFromChart, buildAstroChart, judgeChart, setLevelThresholds, findCity };
`,
  );
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile,
    alias: { '@': path.join(ROOT, 'src') },
    logLevel: 'silent',
  });
  return createRequire(import.meta.url)(outfile);
}

const core = loadCore();

/** 解析视频案例库 Markdown */
function parseCases(md) {
  const blocks = md.split(/\n## (A\d+)\s*\n/).slice(1);
  const cases = [];
  for (let i = 0; i < blocks.length; i += 2) {
    const id = blocks[i];
    const body = blocks[i + 1] ?? '';
    const dateM = body.match(/出生日期\**：公历\s*`(\d{4})-(\d{1,2})-(\d{1,2})`/);
    const timeM = body.match(/出生时间\**：`(\d{1,2}):(\d{2})`/);
    const genderM = body.match(/性别\**：(男|女)/);
    const wealthM = body.match(/财富层次\**：([^\n]+)/);
    const careerM = body.match(/职业状态\**：([^\n]+)/);
    if (!dateM || !timeM || !genderM) continue;
    cases.push({
      id,
      year: Number(dateM[1]),
      month: Number(dateM[2]),
      day: Number(dateM[3]),
      hour: Number(timeM[1]),
      minute: Number(timeM[2]),
      gender: genderM[1] === '男' ? 'male' : 'female',
      wealthText: wealthM ? wealthM[1].trim() : '未提及',
      careerText: careerM ? careerM[1].trim() : '未提及',
    });
  }
  return cases;
}

/** 把自由文本的财富描述映射到四档（返回 null 表示不可用作标签） */
function wealthLabel(text) {
  if (/富裕|大富|富贵双全|几千万|上亿/.test(text)) return 'strong';
  if (/中上|小富|小康|数百万|几百万/.test(text)) return 'moderate';
  if (/普通|一般|一般家庭/.test(text)) return 'mixed';
  if (/贫|很差|比较差|负债/.test(text)) return 'weak';
  return null;
}

const RANK = { strong: 3, moderate: 2, mixed: 1, weak: 0 };
const LEVEL_OF_RANK = { 3: 'strong', 2: 'moderate', 1: 'mixed', 0: 'weak' };

/** 时辰窗口切片：以给定时刻为中点，前后各取 4 个 15 分钟切片 */
const SLICE_OFFSETS = [-52.5, -37.5, -22.5, -7.5, 7.5, 22.5, 37.5, 52.5];

function shiftTime(c, offsetMin) {
  const d = new Date(Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute + offsetMin));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

const md = fs.readFileSync(path.join(ROOT, 'docs', '视频案例库.md'), 'utf8');
const cases = parseCases(md);

// 地区统一按北京（案例库出生地全部未提及）
const city = core.findCity('北京');

// 先把所有案例 × 所有切片的模型算好并缓存；
// 模型与阈值无关，切换阈值只需重跑 judgeChart。
const cached = [];
for (const c of cases) {
  const label = wealthLabel(c.wealthText);
  if (!label) continue;
  const models = SLICE_OFFSETS.map((off) => {
    const t = shiftTime(c, off);
    const chart = core.buildAstroChart({ ...t, city });
    return core.buildPeiranModelFromChart(chart, { currentYear: 2026, gender: c.gender });
  });
  const midChart = core.buildAstroChart({
    year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute, city,
  });
  cached.push({
    id: c.id,
    label,
    models,
    midModel: core.buildPeiranModelFromChart(midChart, { currentYear: 2026, gender: c.gender }),
  });
}

/** 用当前阈值评估一轮 */
function evaluate() {
  let exactSingle = 0;
  let exactMode = 0;
  let exactMean = 0;
  const predCounts = { strong: 0, moderate: 0, mixed: 0, weak: 0 };
  const rows = [];

  for (const item of cached) {
    const levels = item.models.map((m) =>
      core.judgeChart(m).verdicts.find((v) => v.key === 'wealth').level,
    );
    const midLevel = core.judgeChart(item.midModel).verdicts.find((v) => v.key === 'wealth').level;

    const counts = { strong: 0, moderate: 0, mixed: 0, weak: 0 };
    for (const l of levels) counts[l] += 1;
    const modeLevel = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const meanRank = Math.round(levels.reduce((s, l) => s + RANK[l], 0) / levels.length);
    const meanLevel = LEVEL_OF_RANK[meanRank];

    predCounts[modeLevel] += 1;
    if (RANK[midLevel] === RANK[item.label]) exactSingle += 1;
    if (RANK[modeLevel] === RANK[item.label]) exactMode += 1;
    if (RANK[meanLevel] === RANK[item.label]) exactMean += 1;

    rows.push({ id: item.id, label: item.label, midLevel, modeLevel, meanLevel, dist: counts });
  }

  return { exactSingle, exactMode, exactMean, predCounts, rows, usable: cached.length };
}

const GRIDS = [
  { name: '当前 12/2/−8', strong: 12, moderate: 2, mixed: -8 },
  { name: '16/4/−8', strong: 16, moderate: 4, mixed: -8 },
  { name: '18/6/−6', strong: 18, moderate: 6, mixed: -6 },
  { name: '20/8/−4', strong: 20, moderate: 8, mixed: -4 },
  { name: '22/10/−2', strong: 22, moderate: 10, mixed: -2 },
];

console.log('=== 判读档位阈值网格校准 ===\n');
console.log(`样本：${cached.length} 条有明确财富标签的视频案例（出生地按北京，时间按时辰切片）\n`);
console.log('| 阈值 | 中点命中 | 众数命中 | 均值命中 | 预测分布（强/中/起/弱） |');
console.log('| --- | --- | --- | --- | --- |');

const results = [];
for (const g of GRIDS) {
  core.setLevelThresholds({ strong: g.strong, moderate: g.moderate, mixed: g.mixed });
  const r = evaluate();
  results.push({ g, r });
  const usable = r.usable;
  const pct = (n) => `${((n / usable) * 100).toFixed(1)}%`;
  console.log(
    `| ${g.name} | ${pct(r.exactSingle)} | ${pct(r.exactMode)} | ${pct(r.exactMean)} | ${r.predCounts.strong}/${r.predCounts.moderate}/${r.predCounts.mixed}/${r.predCounts.weak} |`,
  );
}

// 标签真实分布（用于看预测是否偏离）
const labelCounts = { strong: 0, moderate: 0, mixed: 0, weak: 0 };
for (const item of cached) labelCounts[item.label] += 1;
console.log(
  `\n实际标签分布（强/中/起/弱）：${labelCounts.strong}/${labelCounts.moderate}/${labelCounts.mixed}/${labelCounts.weak}`,
);
console.log('朴素基线：一律猜「中平」得 ' + `${((labelCounts.moderate / cached.length) * 100).toFixed(1)}%`);

console.log('\n说明：');
console.log('1. 出生地全部缺失，按北京计算，ASC 与宫位存在系统性偏差。');
console.log('2. 出生时间只有时辰，切片跨度大，判读结论会翻转。');
console.log('3. 因此本表只用于观察「阈值是否让预测分布更接近真实分布」，不作为准确率定论。');
