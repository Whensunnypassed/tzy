#!/usr/bin/env node
/**
 * 沛然堂线 · 引擎自检
 *
 * 覆盖：
 *   1) 规则表全称性（界位覆盖、三分、庙旺、面、喜乐宫、ZR 年数、法尔达利亚、虚点）
 *   2) 星盘不变量（黄经范围、宫位覆盖、宗派自洽、轴点关系、落宫）
 *   3) 跨模块一致性（虚点镜像、尊贵互斥、界位无空隙）
 *   4) 多案例批量跑（不同纬度、不同宗派、不同年代）
 *
 * 运行：node scripts/peiran-selfcheck.mjs
 * 退出码：0 = 全通过；1 = 有失败项
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPeiran() {
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  const entry = path.join(distDir, '_peiran_entry.ts');
  const outfile = path.join(distDir, '_peiran_core.cjs');
  fs.writeFileSync(
    entry,
    `
import { buildPeiranModelFromChart } from '@/analysis/peiran/analysis';
import { buildAstroChart } from '@/analysis/peiran/astroChart';
import { runSelfCheck } from '@/analysis/peiran/selfCheck';
import { findCity } from '@/data/cityData';
export { buildPeiranModelFromChart, buildAstroChart, runSelfCheck, findCity };
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

const core = loadPeiran();

const CASES = [
  { label: '1990-05-15 12:00 北京（昼盘/北纬）', y: 1990, m: 5, d: 15, h: 12, mi: 0, city: '北京' },
  { label: '2000-01-01 00:30 北京（夜盘/北纬）', y: 2000, m: 1, d: 1, h: 0, mi: 30, city: '北京' },
  { label: '1988-11-20 08:30 上海（昼盘/中纬）', y: 1988, m: 11, d: 20, h: 8, mi: 30, city: '上海' },
  { label: '2024-06-15 22:00 悉尼（夜盘/南纬）', y: 2024, m: 6, d: 15, h: 22, mi: 0, city: '悉尼' },
  { label: '1975-03-08 14:20 乌鲁木齐（高纬）', y: 1975, m: 3, d: 8, h: 14, mi: 20, city: '乌鲁木齐' },
];

let totalFailed = 0;
let totalPassed = 0;

for (const c of CASES) {
  const city = core.findCity(c.city);
  if (!city) {
    console.log(`[SKIP] city not found: ${c.city}`);
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
  const model = core.buildPeiranModelFromChart(chart, {
    currentYear: 2026,
    now: { year: 2026, month: 11, day: 3, hour: 0, minute: 0 },
  });

  console.log(`\n=== ${c.label} ===`);
  console.log(`ASC ${chart.asc.sign} ${chart.asc.lon.toFixed(2)}° · MC ${chart.mc.sign} ${chart.mc.lon.toFixed(2)}° · ${chart.sect}`);

  const dign = Object.values(model.dignities)
    .map((d) => {
      const kinds = d.kinds.filter((k) => k !== 'peregrine').join('/') || '无';
      return `${d.planet}:${kinds}(${d.score})`;
    })
    .join('  ');
  console.log(`尊贵 ${dign}`);

  const lots = Object.values(model.lots.lots)
    .map((l) => `${l.nameZh} ${l.signDeg.toFixed(2)}°${['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'][l.signIndex]} 第${l.house}宫`)
    .join(' | ');
  console.log(`虚点 ${lots}`);

  console.log(
    `推运 ${model.age} 岁 → 第 ${model.profections.house} 宫 ${model.profections.signName}，年主星 ${model.profections.lordName}`,
  );

  const zr1 = model.zodiacalReleasing.level1;
  const nowZr = core.buildPeiranModelFromChart(chart, {
    currentYear: 2026,
    now: { year: 2026, month: 11, day: 3, hour: 0, minute: 0 },
  }).zodiacalReleasing.level1.find(
    (p) => 2026 - c.y >= p.startDays / 360 && 2026 - c.y < p.endDays / 360,
  );
  console.log(
    `黄道释放 L1 共 ${zr1.length} 段；首段 ${zr1[0].signName} ${zr1[0].startUtc.year}-${String(zr1[0].startUtc.month).padStart(2, '0')} → ${zr1[0].endUtc.year}-${String(zr1[0].endUtc.month).padStart(2, '0')}${nowZr ? `；当前 ${nowZr.signName}${nowZr.isPeak ? '（peak）' : ''}` : ''}`,
  );

  const fir = model.currentFirdaria;
  console.log(`法尔达利亚 当前主期 ${fir ? `${fir.lordName}（${fir.startAge.toFixed(1)}–${fir.endAge.toFixed(1)} 岁）` : '—'}`);

  console.log(
    `太阳返照 ${model.solarReturn.utc.year}-${String(model.solarReturn.utc.month).padStart(2, '0')}-${String(model.solarReturn.utc.day).padStart(2, '0')} ${String(model.solarReturn.utc.hour).padStart(2, '0')}:${String(model.solarReturn.utc.minute).padStart(2, '0')} UTC，残差 ${model.solarReturn.residualDeg.toExponential(2)}°`,
  );

  const sc = model.selfCheck;
  totalPassed += sc.passed;
  totalFailed += sc.failed;
  console.log(`自检 ${sc.passed} 通过 / ${sc.failed} 失败`);
  if (sc.failed > 0) {
    for (const item of sc.items.filter((i) => !i.passed)) {
      console.log(`  [FAIL] ${item.id} ${item.name} — ${item.detail}`);
    }
  }
}

console.log(`\n合计：${totalPassed} 项通过，${totalFailed} 项失败`);
process.exitCode = totalFailed === 0 ? 0 : 1;
