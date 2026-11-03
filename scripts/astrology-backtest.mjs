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
import { judgeChart } from '@/analysis/peiran/judgement';
import { findCity } from '@/data/cityData';
export { buildPeiranModelFromChart, buildAstroChart, judgeChart, findCity };
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

let usable = 0;
let exactSingle = 0;
let exactMode = 0;
let exactMean = 0;
const rows = [];

for (const c of cases) {
  const label = wealthLabel(c.wealthText);
  if (!label) continue;
  usable += 1;

  // 八个 15 分钟切片各建一盘、各跑一次判读
  const levels = SLICE_OFFSETS.map((off) => {
    const t = shiftTime(c, off);
    const chart = core.buildAstroChart({ ...t, city });
    const model = core.buildPeiranModelFromChart(chart, { currentYear: 2026, gender: c.gender });
    const judgement = core.judgeChart(model);
    return judgement.verdicts.find((v) => v.key === 'wealth').level;
  });

  // 聚合一：众数
  const counts = { strong: 0, moderate: 0, mixed: 0, weak: 0 };
  for (const l of levels) counts[l] += 1;
  const modeLevel = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  // 聚合二：档位均值（四舍五入回档）
  const meanRank = Math.round(levels.reduce((s, l) => s + RANK[l], 0) / levels.length);
  const meanLevel = LEVEL_OF_RANK[meanRank];

  // 单点：中点（偏移 0，单独补算一次）
  const midChart = core.buildAstroChart({
    year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute, city,
  });
  const midModel = core.buildPeiranModelFromChart(midChart, { currentYear: 2026, gender: c.gender });
  const midLevel = core.judgeChart(midModel).verdicts.find((v) => v.key === 'wealth').level;

  if (RANK[midLevel] === RANK[label]) exactSingle += 1;
  if (RANK[modeLevel] === RANK[label]) exactMode += 1;
  if (RANK[meanLevel] === RANK[label]) exactMean += 1;

  const dist = `强${counts.strong} 中${counts.moderate} 起${counts.mixed} 弱${counts.weak}`;
  rows.push({ id: c.id, label, midLevel, modeLevel, meanLevel, dist });
}

console.log('=== 希腊占星 · 视频案例回测（时辰切片版） ===\n');
console.log(`案例总数：${cases.length}`);
console.log(`财富标签可用：${usable}`);
console.log(`出生地：0 条有值 → 统一按北京（39.90°N / 116.41°E）`);
console.log(`时间处理：每个时辰切成 8 个 15 分钟切片，各建一盘\n`);

console.log('| 案例 | 实际档 | 中点 | 众数 | 均值 | 八片分布 |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  console.log(`| ${r.id} | ${r.label} | ${r.midLevel} | ${r.modeLevel} | ${r.meanLevel} | ${r.dist} |`);
}

const pct = (n) => (usable ? ((n / usable) * 100).toFixed(1) : '0.0');
console.log(`\n中点单盘命中：${exactSingle} / ${usable}（${pct(exactSingle)}%）`);
console.log(`八片众数命中：${exactMode} / ${usable}（${pct(exactMode)}%）`);
console.log(`八片均值命中：${exactMean} / ${usable}（${pct(exactMean)}%）`);

// 朴素基线
if (usable > 0) {
  const labelCounts = { strong: 0, moderate: 0, mixed: 0, weak: 0 };
  for (const r of rows) labelCounts[r.label] += 1;
  const modeLabel = Object.entries(labelCounts).sort((a, b) => b[1] - a[1])[0];
  console.log(`\n朴素基线（一律猜「${modeLabel[0]}」）：${modeLabel[1]} / ${usable}（${pct(modeLabel[1])}%）`);
}

console.log('\n说明：');
console.log('1. 出生地全部缺失，按北京计算，真实经度偏差会直接改变 ASC 与宫位。');
console.log('2. 出生时间只有时辰，ASC 最坏可差 30°，而本判读的财富档位依赖二宫主，二宫随 ASC 变动。');
console.log('3. 因此上表只能验证「管线能跑通」，不能作为准确率结论。');
console.log('4. 要得到可用结论，需要带出生地、精确到分钟的样本。');
