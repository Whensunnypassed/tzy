#!/usr/bin/env node
/**
 * 大杂烩线 · 视频案例回测
 *
 * 数据源：docs/视频案例库.md（59 条，B 站视频提取）
 * 只测有外部标签的两项：学业、财富。爱情无外部标签，不进回测。
 *
 * 指标（从严到宽，全部公开）：
 *   四档全中 —— 预测档位与标注档位完全一致
 *   相邻命中 —— 差不超过一档
 *   二值命中 —— 学业 ≥本科 / 财富 ≥小康（把任务收成「过不过线」）
 *   多数类基线 — 全部猜样本里最多的那一档
 *
 * 标签口径：
 *   - 「未提及 / 未量化 / 未说明」以及「家庭口径」一律不作标签（判的是命主本人）
 *   - 「待定 / 在读」不作学历标签
 *
 * 运行：node scripts/zalu-backtest.mjs [--verbose]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');

function loadCore() {
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  const entry = path.join(distDir, '_zalu_bt_entry.ts');
  const outfile = path.join(distDir, '_zalu_backtest.cjs');
  fs.writeFileSync(
    entry,
    `
import { calculateBaZi } from '@/analysis/common/baziCalculator';
import { judgeZalu, zaluFeatures } from '@/analysis/zalu/judge';
import { findCity } from '@/data/cityData';
export { calculateBaZi, judgeZalu, zaluFeatures, findCity };
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
    const eduM = body.match(/学历\**：([^\n]+)/);
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
      eduText: eduM ? eduM[1].trim() : '未提及',
    });
  }
  return cases;
}

/** 财富文本 → 大杂烩线的四档；null 表示不可作标签 */
function wealthLabel(text) {
  if (/未提及|未量化|未说明|家庭口径/.test(text)) return null;
  if (/富裕|大富|富贵|几千万|上亿|小富|中上|数百万|几百万/.test(text)) return '富';
  if (/小康/.test(text)) return '小康';
  if (/温饱|普通|一般|工资|打工/.test(text)) return '温饱';
  if (/贫|负债|很差|落魄/.test(text)) return '紧';
  return null;
}

/** 学历文本 → 大杂烩线的四档；null 表示不可作标签 */
function eduLabel(text) {
  if (/未提及|未说明|待定|在读|家庭口径/.test(text)) return null;
  if (/博士|硕士|研究生/.test(text)) return '本科以上';
  if (/本科|大学|一本|二本|三本|211|985/.test(text)) return '本科';
  if (/大专|专科|高职|中专|高中|技校|职高/.test(text)) return '大专 / 中专';
  if (/初中|小学|辍学|没上大学|没考上|高考落榜|学历不高/.test(text)) return '初中及以下';
  return null;
}

const WEALTH_RANK = { 紧: 0, 温饱: 1, 小康: 2, 富: 3 };
const EDU_RANK = { 初中及以下: 0, '大专 / 中专': 1, 本科: 2, '本科以上': 3 };

const md = fs.readFileSync(path.join(ROOT, 'docs', '视频案例库.md'), 'utf8');
const cases = parseCases(md);

const rows = [];
for (const c of cases) {
  const wLabel = wealthLabel(c.wealthText);
  const eLabel = eduLabel(c.eduText);
  if (!wLabel && !eLabel) continue;
  const chart = core.calculateBaZi(c.year, c.month, c.day, c.hour, c.minute, c.gender, '北京');
  const v = core.judgeZalu(chart);
  rows.push({
    id: c.id,
    bazi: `${chart.year.stem}${chart.year.branch} ${chart.month.stem}${chart.month.branch} ${chart.day.stem}${chart.day.branch} ${chart.hour.stem}${chart.hour.branch}`,
    wLabel,
    wPred: v.caifu.level,
    wScore: v.caifu.score,
    eLabel,
    ePred: v.xueye.level,
    eScore: v.xueye.score,
  });
}

function metrics(list, labelKey, predKey, rankTable, positiveRank) {
  const usable = list.filter((r) => r[labelKey]);
  if (usable.length === 0) return null;
  let exact = 0;
  let near = 0;
  let binary = 0;
  const confusion = {};
  for (const r of usable) {
    const a = rankTable[r[labelKey]];
    const p = rankTable[r[predKey]];
    if (a === p) exact += 1;
    if (Math.abs(a - p) <= 1) near += 1;
    if ((a >= positiveRank ? 1 : 0) === (p >= positiveRank ? 1 : 0)) binary += 1;
    const key = `${r[labelKey]} → ${r[predKey]}`;
    confusion[key] = (confusion[key] ?? 0) + 1;
  }
  const counts = {};
  for (const r of usable) counts[r[labelKey]] = (counts[r[labelKey]] ?? 0) + 1;
  const majority = Math.max(...Object.values(counts));
  return {
    n: usable.length,
    exact: exact / usable.length,
    near: near / usable.length,
    binary: binary / usable.length,
    majority: majority / usable.length,
    confusion,
  };
}

const edu = metrics(rows, 'eLabel', 'ePred', EDU_RANK, 2);
const wealth = metrics(rows, 'wLabel', 'wPred', WEALTH_RANK, 2);

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const show = (name, m) => {
  if (!m) {
    console.log(`\n## ${name}：无可标注样本`);
    return;
  }
  console.log(`\n## ${name}  n=${m.n}`);
  console.log(`  四档全中 ${pct(m.exact)}｜相邻命中 ${pct(m.near)}｜二值命中 ${pct(m.binary)}｜多数类基线 ${pct(m.majority)}`);
  const conf = Object.entries(m.confusion).sort((a, b) => b[1] - a[1]);
  console.log(`  混淆：${conf.map(([k, v]) => `${k} ×${v}`).join('；')}`);
};

console.log(`案例总数 ${cases.length}｜可标注：学业 ${edu ? edu.n : 0}｜财富 ${wealth ? wealth.n : 0}`);
show('学业', edu);
show('财富', wealth);

if (VERBOSE) {
  console.log('\n## 逐条');
  for (const r of rows) {
    console.log(
      `${r.id} ${r.bazi}｜财富 ${r.wLabel ?? '—'}→${r.wPred}(${r.wScore})｜学业 ${r.eLabel ?? '—'}→${r.ePred}(${r.eScore})`,
    );
  }
}

if (process.argv.includes('--features')) {
  console.log('\n## 特征');
  for (const c of cases) {
    const chart = core.calculateBaZi(c.year, c.month, c.day, c.hour, c.minute, c.gender, '北京');
    const f = core.zaluFeatures(chart);
    console.log(
      `${c.id} ${chart.day.stem}${chart.day.branch} 月${chart.month.branch}｜印${f.yin.toFixed(2)} 官${f.guan.toFixed(2)} 食${f.shi.toFixed(2)} 财${f.cai.toFixed(2)} 劫${f.jie.toFixed(2)}｜${f.season} ${f.strong ? '强' : '弱'} 调${f.bal.toFixed(2)}`,
    );
  }
}

console.log('\n说明：本回测只覆盖有外部标签的样本；爱情无标签，不入统计。');
