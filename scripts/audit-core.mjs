#!/usr/bin/env node
/**
 * 核心自检脚本（随机命例不变量 + 时间边界回归）
 *
 * 目的：在没有任何单测框架的前提下，给排盘/评分链路一个可重复的最小护栏。
 *   - 随机抽 600 个 1900–2200 的出生时刻 × 6 个出生地区，跑完整链路；
 *   - 校验四柱、八步大运、每运十年流年、22 字用忌 marks、九档等级、hint 同源、分数有限；
 *   - 回归 4 个时间边界用例（立春同帧、真太阳时跨日、23 点换日、夏令时命中）。
 *
 * 运行（本机无 node 于 PATH 时）：
 *   node scripts/audit-core.mjs
 *   或 $env:ELECTRON_RUN_AS_NODE='1'; & '…Trae CN.exe' scripts/audit-core.mjs
 *
 * 退出码：0 = 全部通过；1 = 有不变量失败（打印前 20 条）。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGIONS = ['北京', '东五区', '东六区', '东七区', '东八区', '东九区'];
const LETTERS = new Set(['S+', 'S', 'A+', 'A', 'B+', 'B-', 'C', 'C-', 'D']);
const STEMS = new Set('甲乙丙丁戊己庚辛壬癸'.split(''));
const BRANCHES = new Set('子丑寅卯辰巳午未申酉戌亥'.split(''));

function loadCore() {
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  const entry = path.join(distDir, '_audit_entry.ts');
  const outfile = path.join(distDir, '_audit_core.cjs');
  fs.writeFileSync(entry, `
import { calculateBaZi } from '@/utils/baziCalculator';
import { ZHUZI_XIJI_CFG } from '@/data/baziData';
import {
  analyzeMonthQi,
  analyzeYongJi,
  calculateElementPower,
  analyzeDaYunLiuNian,
} from '@/utils/baziAnalyzer';
export { calculateBaZi, ZHUZI_XIJI_CFG, analyzeMonthQi, analyzeYongJi, calculateElementPower, analyzeDaYunLiuNian };
`);
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
const failures = [];
function check(cond, message) {
  if (!cond && failures.length < 20) failures.push(message);
}

function pillarsOf(chart) {
  return [chart.year, chart.month, chart.day, chart.hour];
}

function runChain(y, m, d, h, mi, gender, place, currentYear) {
  const chart = core.calculateBaZi(y, m, d, h, mi, gender, place);
  const monthQi = core.analyzeMonthQi(chart.monthBranchIndex);
  const yongJi = core.analyzeYongJi(chart, monthQi);
  const power = core.calculateElementPower(chart);
  const dy = core.analyzeDaYunLiuNian(chart, yongJi, power, currentYear);
  return { chart, yongJi, dy };
}

function validate(tag, y, m, d, h, mi, gender, place) {
  const { chart, yongJi, dy } = runChain(y, m, d, h, mi, gender, place, 2026);
  pillarsOf(chart).forEach((p) => {
    check(STEMS.has(p.stem) && BRANCHES.has(p.branch), `${tag} 四柱非法：${p.stem}${p.branch}`);
  });
  check(chart.daYun.length === 8, `${tag} 大运步数=${chart.daYun.length}（应为 8）`);
  check(dy.daYunWithFortune.length === 8, `${tag} 评分大运步数=${dy.daYunWithFortune.length}`);
  check(Object.keys(yongJi.allStemMarks).length === 10, `${tag} 天干 marks 数量=${Object.keys(yongJi.allStemMarks).length}`);
  check(Object.keys(yongJi.allBranchMarks).length === 12, `${tag} 地支 marks 数量=${Object.keys(yongJi.allBranchMarks).length}`);
  check(Number.isFinite(chart.birthInfo.trueSolarOffset), `${tag} 真太阳时偏移非数`);
  check(chart.birthInfo.trueSolarOffset >= -200 && chart.birthInfo.trueSolarOffset <= 100, `${tag} 真太阳时偏移越界：${chart.birthInfo.trueSolarOffset}`);
  let sPlusCount = 0;
  for (const item of dy.daYunWithFortune) {
    check(LETTERS.has(item.letterLevel), `${tag} 大运等级非法：${item.letterLevel}`);
    check(Number.isFinite(item.displayScore), `${tag} 大运分数非数`);
    // 岁运同参后：大运按本柱独立定档，adjustScore 应等于 selfCompress
    check(Math.abs((item.adjustScore ?? 0) - (item.selfCompress ?? 0)) <= 0.11, `${tag} 大运 adjust≠self：${item.adjustScore}/${item.selfCompress}`);
    if (item.letterLevel === 'S+') sPlusCount += 1;
    check(Array.isArray(item.liuNian10) && item.liuNian10.length === 10, `${tag} ${item.stem}${item.branch}运流年数=${item.liuNian10?.length}`);
    for (const ln of item.liuNian10 || []) {
      check(LETTERS.has(ln.letterLevel), `${tag} 流年等级非法：${ln.letterLevel}`);
      check(Number.isFinite(ln.displayScore), `${tag} 流年分数非数`);
      check(Math.abs(ln.adjustScore ?? 0) <= 4.41, `${tag} 流年调整分越界：${ln.adjustScore}`);
      check(typeof ln.hint === 'string' && ln.hint.includes('岁运调整') && ln.hint.includes(ln.letterLevel), `${tag} 流年 hint 与评级不同源`);
    }
  }
  check(sPlusCount <= 1, `${tag} 大运 S+ 超过同盘配额：${sPlusCount}`);
  check(dy.recentLiuNian.length === 6, `${tag} 近年流年数=${dy.recentLiuNian.length}`);
  return chart;
}

// ---------- 1) 数据层：逐字喜忌 CFG 完整性 ----------
const zhuZi = core.ZHUZI_XIJI_CFG;
check(!!zhuZi && zhuZi.version === 'zhuzi-v1.0.0', `逐字喜忌 CFG 版本异常：${zhuZi?.version}`);
check(Object.keys(zhuZi.months || {}).length === 12, `逐字喜忌月份数=${Object.keys(zhuZi.months || {}).length}`);
const MARKS = new Set(['xi', 'ji', 'dai']);
for (const [month, ref] of Object.entries(zhuZi.months || {})) {
  check(Object.keys(ref.stems).length === 10, `逐字喜忌 ${month} 天干数=${Object.keys(ref.stems).length}`);
  check(Object.keys(ref.branches).length === 12, `逐字喜忌 ${month} 地支数=${Object.keys(ref.branches).length}`);
  for (const [char, row] of [...Object.entries(ref.stems), ...Object.entries(ref.branches)]) {
    check(Array.isArray(row) && MARKS.has(row[0]), `逐字喜忌 ${month}${char} 标记非法：${row?.[0]}`);
  }
}
check(Object.keys(zhuZi.rounds || {}).includes('申'), '申月两局落定表缺失');

// ---------- 2) 随机命例 ----------
let samples = 0;
for (let i = 0; i < 600; i++) {
  const dayOffset = Math.floor(Math.random() * 109573); // 1900-01-01 ~ 2200-12-31
  const dt = new Date(Date.UTC(1900, 0, 1) + dayOffset * 86400000);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  const h = Math.floor(Math.random() * 24);
  const mi = Math.floor(Math.random() * 60);
  const gender = Math.random() < 0.5 ? 'male' : 'female';
  const place = REGIONS[i % REGIONS.length];
  validate(`random#${i} ${y}-${m}-${d} ${h}:${mi} ${place}`, y, m, d, h, mi, gender, place);
  samples += 1;
}

// ---------- 3) 时间边界回归 ----------
const refDay = (y, m, d) => {
  const c = core.calculateBaZi(y, m, d, 12, 0, 'male', '北京');
  return c.day.stem + c.day.branch;
};

const boundary = [
  {
    name: '立春同帧：2026-02-04 05:00 各区域年/月柱一律 丙午/庚寅',
    run: (place) => core.calculateBaZi(2026, 2, 4, 5, 0, 'male', place),
    assert: (chart, tag) => {
      check(chart.year.stem === '丙' && chart.year.branch === '午', `${tag} 年柱=${chart.year.stem}${chart.year.branch}，应为丙午`);
      check(chart.month.stem === '庚' && chart.month.branch === '寅', `${tag} 月柱=${chart.month.stem}${chart.month.branch}，应为庚寅`);
    },
    places: ['北京', '东五区', '东八区', '东九区'],
  },
  {
    name: '真太阳时退到前一日：1991-11-15 00:30 东五区',
    run: () => core.calculateBaZi(1991, 11, 15, 0, 30, 'male', '东五区'),
    assert: (chart, tag) => {
      check(chart.birthInfo.trueSolarDayOffset === -1, `${tag} 跨日偏移=${chart.birthInfo.trueSolarDayOffset}`);
      check(chart.day.stem + chart.day.branch === refDay(1991, 11, 14), `${tag} 日柱=${chart.day.stem}${chart.day.branch}，应为 ${refDay(1991, 11, 14)}`);
    },
  },
  {
    name: '真太阳时进到次日：1991-11-15 23:30 东九区',
    run: () => core.calculateBaZi(1991, 11, 15, 23, 30, 'male', '东九区'),
    assert: (chart, tag) => {
      check(chart.birthInfo.trueSolarDayOffset === 1, `${tag} 跨日偏移=${chart.birthInfo.trueSolarDayOffset}`);
      check(chart.day.stem + chart.day.branch === refDay(1991, 11, 16), `${tag} 日柱=${chart.day.stem}${chart.day.branch}，应为 ${refDay(1991, 11, 16)}`);
    },
  },
  {
    name: '23 点换日（北京，非夏令时）：1991-11-15 23:30 → 次日子时',
    run: () => core.calculateBaZi(1991, 11, 15, 23, 30, 'male', '北京'),
    assert: (chart, tag) => {
      check(chart.day.stem + chart.day.branch === refDay(1991, 11, 16), `${tag} 日柱=${chart.day.stem}${chart.day.branch}，应为 ${refDay(1991, 11, 16)}`);
      check(chart.hour.branch === '子', `${tag} 时支=${chart.hour.branch}，应为子`);
    },
  },
  {
    name: '夏令时回拨：1990-05-15 23:30 北京 → 标准时 22:30、当日亥时',
    run: () => core.calculateBaZi(1990, 5, 15, 23, 30, 'male', '北京'),
    assert: (chart, tag) => {
      check(chart.birthInfo.dstApplied === true, `${tag} dstApplied=${chart.birthInfo.dstApplied}`);
      check(chart.birthInfo.standardTime === '22:30', `${tag} 标准时=${chart.birthInfo.standardTime}`);
      check(chart.day.stem + chart.day.branch === refDay(1990, 5, 15), `${tag} 日柱=${chart.day.stem}${chart.day.branch}，应为 ${refDay(1990, 5, 15)}`);
      check(chart.hour.branch === '亥', `${tag} 时支=${chart.hour.branch}，应为亥（回拨后 22:19）`);
    },
  },
  {
    name: '非夏令时：1988-01-15 12:00 北京 → 不回拨',
    run: () => core.calculateBaZi(1988, 1, 15, 12, 0, 'male', '北京'),
    assert: (chart, tag) => {
      check(chart.birthInfo.dstApplied === false, `${tag} dstApplied=${chart.birthInfo.dstApplied}`);
    },
  },
];

for (const item of boundary) {
  if (item.places) {
    for (const place of item.places) {
      const tag = `${item.name} @${place}`;
      item.assert(item.run(place), tag);
    }
  } else {
    item.assert(item.run(), item.name);
  }
}

// 边界用例也要过完整链路（m到评分层）
validate('boundary-chain', 2026, 2, 4, 5, 0, 'male', '东五区');

if (failures.length) {
  console.error(`✗ 核心审计未通过：${failures.length} 条`);
  failures.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
console.log(`✓ 核心审计通过：随机命例 ${samples} 例（六地区轮转），边界用例 ${boundary.length} 组`);
