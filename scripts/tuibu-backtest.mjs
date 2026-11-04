#!/usr/bin/env node
/**
 * 推步线 T8 · 判据切换回测（taiji vs binary）
 *
 * 目的：在切换 `YONG_JI_SOURCE` 之前，逐例列出两套口径的差异清单——
 *   1. 判据方向是否翻转；
 *   2. 四柱干/支喜忌 marks 哪些字翻面（翻转必须有原文依据，否则该月不切）；
 *   3. 大运九档分布是否塌缩（不出现全 A 或全 D）。
 *
 * 样本：data/tuibu-samples.json（gitignored，含未公开案例与原文结论）。
 * 现有样本不足时不报「准确率」，只报差异清单——这是协议里的硬约束。
 *
 * 运行：node scripts/tuibu-backtest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadCore() {
  const distDir = path.join(ROOT, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const entry = path.join(distDir, '_tuibu_bt_entry.ts');
  const outfile = path.join(distDir, '_tuibu_backtest.cjs');
  fs.writeFileSync(
    entry,
    `export { calculateBaZi } from '@/analysis/common/baziCalculator';
export { analyzeMonthQi, analyzeYongJi, computeTaiJiQi, resolveDirection, calculateElementPower, analyzeDaYunLiuNian } from '@/analysis/yinyang/engine';`,
  );
  esbuild.buildSync({
    entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', outfile,
    alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent',
  });
  return createRequire(import.meta.url)(outfile);
}

const { calculateBaZi, analyzeMonthQi, analyzeYongJi, computeTaiJiQi, resolveDirection, calculateElementPower, analyzeDaYunLiuNian } = loadCore();

const SAMPLES = path.join(ROOT, 'data', 'tuibu-samples.json');
if (!fs.existsSync(SAMPLES)) {
  console.log('未找到 data/tuibu-samples.json（本地样本，不入库）。');
  console.log('格式：[{ "id": "A001", "birth": "1970-06-09 08:30", "gender": "male", "place": "北京", "note": "原文结论…", "expected": "富且贵" }]');
  process.exit(0);
}

const samples = JSON.parse(fs.readFileSync(SAMPLES, 'utf8'));
if (!Array.isArray(samples) || samples.length === 0) {
  console.log('样本为空。');
  process.exit(0);
}

const parseBirth = (text) => {
  const m = /(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/.exec(text);
  if (!m) throw new Error(`无法解析出生时间：${text}`);
  return { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5] };
};

const flipOf = (a, b) => a !== b;

let directionFlips = 0;
let markFlips = 0;
const rows = [];

for (const sample of samples) {
  const b = parseBirth(sample.birth);
  const chart = calculateBaZi(b.year, b.month, b.day, b.hour, b.minute, sample.gender ?? 'male', sample.place ?? '北京');
  const monthQi = analyzeMonthQi(chart.monthBranchIndex);

  const yjBinary = analyzeYongJi(chart, monthQi, 'binary');
  const yjTaiji = analyzeYongJi(chart, monthQi, 'taiji');
  const dirBinary = resolveDirection(chart, monthQi, 'binary');
  const dirTaiji = resolveDirection(chart, monthQi, 'taiji');
  const tq = computeTaiJiQi(chart, monthQi);

  const flipped = [];
  const keys = new Set([...Object.keys(yjBinary.allStemMarks), ...Object.keys(yjBinary.allBranchMarks)]);
  for (const key of keys) {
    const a = yjBinary.allStemMarks[key] ?? yjBinary.allBranchMarks[key];
    const c = yjTaiji.allStemMarks[key] ?? yjTaiji.allBranchMarks[key];
    if (a && c && flipOf(a, c)) flipped.push(`${key}:${a}→${c}`);
  }

  const dirFlip = dirBinary !== dirTaiji;
  if (dirFlip) directionFlips += 1;
  markFlips += flipped.length;

  const elementPower = calculateElementPower(chart);
  const dy = analyzeDaYunLiuNian(chart, yjTaiji, elementPower, 2026);
  const fortunes = Array.isArray(dy?.daYunWithFortune) ? dy.daYunWithFortune.map((x) => x.fortune) : [];

  rows.push({
    id: sample.id ?? '-',
    pillars: `${chart.year.stem}${chart.year.branch}/${chart.month.stem}${chart.month.branch}/${chart.day.stem}${chart.day.branch}/${chart.hour.stem}${chart.hour.branch}`,
    band: tq.band,
    dirBinary: dirBinary === 'yin' ? '用阴' : '用阳',
    dirTaiji: dirTaiji === 'yin' ? '用阴' : '用阳',
    dirFlip,
    flipped,
    fortunes,
    note: sample.note ?? '',
    expected: sample.expected ?? '',
  });
}

console.log('推步线回测 · taiji vs binary\n');
for (const row of rows) {
  console.log(`#${row.id}  ${row.pillars}  二气：${row.band}`);
  console.log(`  方向  binary=${row.dirBinary}  taiji=${row.dirTaiji}${row.dirFlip ? '  ← 翻转' : ''}`);
  console.log(`  marks 翻转 ${row.flipped.length} 字${row.flipped.length ? '：' + row.flipped.join('，') : ''}`);
  if (row.fortunes.length) {
    const distinct = new Set(row.fortunes);
    console.log(`  大运九档：${row.fortunes.join(' ')}  ${distinct.size <= 1 && row.fortunes.length > 1 ? '← 疑似塌缩' : ''}`);
  }
  if (row.expected) console.log(`  原文结论：${row.expected}${row.note ? `（${row.note}）` : ''}`);
  console.log('');
}

console.log(`共 ${rows.length} 例；方向翻转 ${directionFlips} 例；marks 翻转合计 ${markFlips} 字。`);
console.log('说明：样本数不足 150 判定前，本表只作差异清单，不作准确率结论。');
