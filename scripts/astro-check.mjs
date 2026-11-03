#!/usr/bin/env node
/**
 * 希腊占星基础自检（星历 + 轴点）
 *
 * 目的：在没有单测框架的前提下，给自研星历一个可重复的护栏。
 *   · 打包 src/analysis/peiran/astroChart.ts；
 *   · 打印若干已知案例的七政黄经、上升点、中天、宫位；
 *   · 可选地读取 dist/_astro_expected.json（由外部权威星历填入）做误差比对。
 *
 * 运行：node scripts/astro-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadAstro() {
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  const entry = path.join(distDir, '_astro_entry.ts');
  const outfile = path.join(distDir, '_astro_core.cjs');
  fs.writeFileSync(
    entry,
    `
import { buildAstroChart, formatZodiac, ZODIAC_SIGNS } from '@/analysis/peiran/astroChart';
import { findCity, resolveUtcOffsetMinutes } from '@/data/cityData';
export { buildAstroChart, formatZodiac, ZODIAC_SIGNS, findCity, resolveUtcOffsetMinutes };
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

const core = loadAstro();

const CASES = [
  { label: '1990-05-15 12:00 北京', y: 1990, m: 5, d: 15, h: 12, mi: 0, city: '北京' },
  { label: '2000-01-01 12:00 伦敦', y: 2000, m: 1, d: 1, h: 12, mi: 0, city: '伦敦' },
  { label: '2024-01-01 00:00 北京', y: 2024, m: 1, d: 1, h: 0, mi: 0, city: '北京' },
  { label: '1988-11-20 08:30 上海', y: 1988, m: 11, d: 20, h: 8, mi: 30, city: '上海' },
];

const rows = [];
for (const c of CASES) {
  const city = core.findCity(c.city);
  if (!city) {
    console.error(`city not found: ${c.city}`);
    continue;
  }
  const chart = core.buildAstroChart({
    year: c.y,
    month: c.m,
    day: c.d,
    hour: c.h,
    minute: c.mi,
    city,
  });
  rows.push({ case: c.label, chart });
  console.log(`\n=== ${c.label} → UTC ${chart.utc.year}-${String(chart.utc.month).padStart(2, '0')}-${String(chart.utc.day).padStart(2, '0')} ${String(chart.utc.hour).padStart(2, '0')}:${String(chart.utc.minute).padStart(2, '0')} (${chart.utcOffsetMinutes}min, ${chart.timezoneAccuracy}) ===`);
  console.log(`ASC ${core.formatZodiac(chart.asc.lon)}  MC ${core.formatZodiac(chart.mc.lon)}  ${chart.sect === 'diurnal' ? '昼盘' : '夜盘'}`);
  for (const key of ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
    const b = chart.bodies[key];
    console.log(`  ${b.name}\t${core.formatZodiac(b.lon)}\t${String(b.lon.toFixed(4)).padStart(9)}°\t宫 ${String(b.house).padStart(2)}${b.retrograde ? ' R' : ''}`);
  }
}

// 轴点自洽：太阳恰在东方地平线（ASC 与太阳黄经重合）时的时刻，
// 应落在常识日出窗口内。二分搜索最小差值。
function ascSunDiff(year, month, day, minutes, city) {
  const chart = core.buildAstroChart({
    year,
    month,
    day,
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
    city,
  });
  const diff = Math.abs(((chart.asc.lon - chart.bodies.sun.lon + 540) % 360) - 180);
  return { diff, chart };
}

const beijing = core.findCity('北京');
let lo = 240; // 04:00
let hi = 420; // 07:00
let best = ascSunDiff(1990, 5, 15, lo, beijing);
for (let k = 0; k < 24; k += 1) {
  const mid = Math.round((lo + hi) / 2);
  const probe = ascSunDiff(1990, 5, 15, mid, beijing);
  if (probe.diff < best.diff) best = probe;
  // ASC 随时刻递增；差值在日出前为正、日出后为负
  const before = ascSunDiff(1990, 5, 15, mid - 1, beijing).diff;
  const after = ascSunDiff(1990, 5, 15, mid + 1, beijing).diff;
  if (before > probe.diff && after > probe.diff) {
    best = probe;
    break;
  }
  if (after < before) lo = mid;
  else hi = mid;
}

const hh = String(Math.floor(Math.round((lo + hi) / 2) / 60)).padStart(2, '0');
const mm = String(Math.round((lo + hi) / 2) % 60).padStart(2, '0');
console.log(`\n轴点自洽：1990-05-15 北京，ASC=太阳黄经 的时刻约 ${hh}:${mm}，残差 ${best.diff.toFixed(3)}°`);
if (best.diff > 0.5) {
  console.log('[FAIL] ASC 与太阳黄经无法在日出窗口内重合（阈值 0.5°）');
  process.exitCode = 1;
}

// 与权威值比对（scripts/astro-expected.json，基线为 NASA JPL Horizons DE441）
const expectedPath = path.join(ROOT, 'scripts', 'astro-expected.json');
if (fs.existsSync(expectedPath)) {
  const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
  let failures = 0;
  for (const row of rows) {
    const exp = expected[row.case];
    if (!exp) continue;
    for (const [key, target] of Object.entries(exp.bodies ?? {})) {
      const actual = row.chart.bodies[key].lon;
      const diff = Math.abs(((actual - target + 540) % 360) - 180);
      const tol = key === 'moon' ? 0.6 : 0.1;
      if (diff > tol) {
        failures += 1;
        console.log(`\n[FAIL] ${row.case} ${key}: actual ${actual.toFixed(3)} vs expected ${target} Δ ${diff.toFixed(3)}° (>${tol}°)`);
      }
    }
    if (typeof exp.asc === 'number') {
      const diff = Math.abs(((row.chart.asc.lon - exp.asc + 540) % 360) - 180);
      if (diff > 0.5) {
        failures += 1;
        console.log(`\n[FAIL] ${row.case} ASC: actual ${row.chart.asc.lon.toFixed(3)} vs expected ${exp.asc} Δ ${diff.toFixed(3)}°`);
      }
    }
  }
  console.log(failures === 0 ? '\n比对通过：全部在容差内。' : `\n比对失败 ${failures} 项。`);
  process.exitCode = failures === 0 ? 0 : 1;
}
