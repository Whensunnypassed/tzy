#!/usr/bin/env node
/**
 * 希腊线 · 引擎自检
 *
 * 覆盖：
 *   1) 规则表全称性（界位覆盖、三分、庙旺、面、喜乐宫、ZR 年数、法尔达利亚、虚点）
 *   2) 星盘不变量（黄经范围、宫位覆盖、宗派自洽、轴点关系、落宫）
 *   3) 跨模块一致性（虚点镜像、尊贵互斥、界位无空隙）
 *   4) 多案例批量跑（不同纬度、不同宗派、不同年代）
 *
 * 运行：node scripts/greek-selfcheck.mjs
 * 退出码：0 = 全通过；1 = 有失败项
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadGreek() {
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  const entry = path.join(distDir, '_greek_entry.ts');
  const outfile = path.join(distDir, '_greek_core.cjs');
  fs.writeFileSync(
    entry,
    `
import { buildGreekModelFromChart } from '@/analysis/greek/analysis';
import { buildAstroChart } from '@/analysis/greek/astroChart';
import { runSelfCheck } from '@/analysis/greek/selfCheck';
import { judgeChart, OBSERVABLE_CRITERIA } from '@/analysis/greek/judgement';
import { rectifyBirthTime } from '@/analysis/greek/rectify';
import { assessStability } from '@/analysis/greek/stability';
import { buildStructuredData } from '@/analysis/greek/structuredData';
import { findCity } from '@/data/cityData';
export { buildGreekModelFromChart, buildAstroChart, runSelfCheck, judgeChart, OBSERVABLE_CRITERIA, rectifyBirthTime, assessStability, buildStructuredData, findCity };
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

const core = loadGreek();

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
  const model = core.buildGreekModelFromChart(chart, {
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
  const nowZr = core.buildGreekModelFromChart(chart, {
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

  // 判读层校验：六个主题齐全、每条结论有依据、档位合法
  const judgement = core.judgeChart(model);
  const validLevels = new Set(['strong', 'moderate', 'mixed', 'weak']);
  const jBad = judgement.verdicts.filter(
    (v) => !validLevels.has(v.level) || v.evidence.length < 2 || !v.headline || !v.observable,
  );
  totalPassed += jBad.length === 0 ? 1 : 0;
  totalFailed += jBad.length === 0 ? 0 : 1;
  console.log(
    `判读 ${judgement.verdicts.length} 个主题${jBad.length === 0 ? '（结构校验通过）' : `，${jBad.length} 个异常`}`,
  );
  for (const v of judgement.verdicts) {
    console.log(`  ${v.title} [${v.level}] ${v.headline}`);
  }

  // 结构化契约校验：可序列化、八段齐全
  const sd = core.buildStructuredData(model, 'male');
  const sdOk =
    typeof sd === 'object' &&
    Boolean(sd.meta && sd.input && sd.chart && sd.lilly && sd.lots && sd.arabicParts && sd.aspects && sd.timeLords && sd.dataQuality);
  totalPassed += sdOk ? 1 : 0;
  totalFailed += sdOk ? 0 : 1;
  console.log(`结构化契约 ${sdOk ? '完整' : '缺段'}（v${sd.meta.version}，质量标记 ${sd.dataQuality.flags.length} 条）`);
}

console.log(`\n合计：${totalPassed} 项通过，${totalFailed} 项失败`);

// 验前事校准：用人工事件做一次端到端演算
{
  const city = core.findCity('北京');
  const base = { year: 1990, month: 5, day: 15, hour: 12, minute: 0, city };
  const events = [
    { year: 2015, type: 'marriage' },
    { year: 2018, type: 'child' },
    { year: 2021, type: 'career' },
  ];
  const res = core.rectifyBirthTime(base, events, { windowMinutes: 10, stepMinutes: 1 });
  console.log('\n=== 验前事校准（示例事件） ===');
  console.log(res.note);
  console.log(
    `候选 ${res.candidates.length} 个，最高分 ${res.best.totalScore}，是否平坦 ${res.flat ? '是' : '否'}`,
  );
  for (const m of res.best.matches) {
    console.log(`  ${m.event.year} ${m.event.type}：${m.detail.join('；')}（小计 ${m.score}）`);
  }
}

// 判读稳定性：对同一案例做 8 切片，看结论一致率
{
  const city = core.findCity('北京');
  const st = core.assessStability(
    { year: 1990, month: 5, day: 15, hour: 12, minute: 0, city },
    { windowMinutes: 30, slices: 8, currentYear: 2026 },
  );
  console.log('\n=== 判读稳定性（±30 分钟 / 8 切片） ===');
  console.log(st.note);
  for (const t of st.themes) {
    console.log(`  ${t.title}：一致 ${(t.agreement * 100).toFixed(0)}%（${t.grade}）`);
  }
  console.log(`  总体一致率 ${(st.overall * 100).toFixed(0)}%`);
}

process.exitCode = totalFailed === 0 ? 0 : 1;