#!/usr/bin/env node
/**
 * 沛然堂线 · 纳音五维回测
 * 数据：docs/视频案例库.md（59 条视频案例，含财富/学历/职业/关键年份）
 * 输出：每维准确率、混淆矩阵、错误明细，写入 docs/peiran/validation.json
 *
 * 运行：node scripts/peiran-backtest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const MD = path.join(ROOT, 'docs', '视频案例库.md');
const OUT = path.join(DIST, 'peiran-validation.json');

function loadCore() {
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
  const entry = path.join(DIST, '_peiran_bt_entry.ts');
  const outfile = path.join(DIST, '_peiran_bt.cjs');
  fs.writeFileSync(entry, `
import { calculateBaZi, STEM_ELEMENTS, BRANCH_ELEMENTS, STEM_YINYANG, BRANCH_YINYANG, HIDDEN_STEMS, MONTH_BRANCHES, getShiShen } from '@/analysis/common/baziCalculator';
import { buildPeiranAnalysis } from '@/analysis/peiran';
import { analyzeFiveDimensions } from '@/analysis/peiran/fiveDimensions';
export { calculateBaZi, STEM_ELEMENTS, BRANCH_ELEMENTS, STEM_YINYANG, BRANCH_YINYANG, HIDDEN_STEMS, MONTH_BRANCHES, getShiShen, buildPeiranAnalysis, analyzeFiveDimensions };
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
const md = fs.readFileSync(MD, 'utf8');
const blocks = md.split(/(?=^## A\d+)/m).filter((s) => /^## A\d+/.test(s));

function field(block, name) {
  const m = block.match(new RegExp(`\\*\\*${name}\\*\\*：([^\\n]+)`));
  return m ? m[1].trim() : '';
}

function parseBirthDate(block) {
  const m = block.match(/公历\s*`?(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { year: +m[1], month: +m[2], day: +m[3] };
}

function parseBirthTime(block) {
  const m = block.match(/出生时间\*\*：`?(\d{2}):(\d{2})/);
  return m ? { hour: +m[1], minute: +m[2] } : { hour: 12, minute: 0 };
}

function parseFourPillars(block) {
  const lines = block.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!/年柱.*月柱.*日柱.*时柱/.test(lines[i])) continue;
    const next = lines[i + 1] ?? '';
    const hits = [...next.matchAll(/([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])/g)];
    if (hits.length >= 4) return hits.slice(0, 4).map((h) => h[1] + h[2]);
  }
  return null;
}

function parseDaYun(block, birthYear) {
  const line = block.split(/\r?\n/).find((l) => /大运（盘面）/.test(l)) ?? '';
  const hits = [...line.matchAll(/(\d{4})\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/g)];
  if (hits.length < 2) return null;
  return hits.map((h, i) => ({
    index: i,
    stem: h[2][0],
    branch: h[2][1],
    startYear: +h[1],
    endYear: i + 1 < hits.length ? +hits[i + 1][1] - 1 : +h[1] + 9,
    startAge: +h[1] - birthYear,
    daysToJie: 0,
  }));
}

function makePillar(stem, branch, dayStem) {
  return {
    stem,
    branch,
    stemElement: core.STEM_ELEMENTS[stem],
    branchElement: core.BRANCH_ELEMENTS[branch],
    stemYinYang: core.STEM_YINYANG[stem],
    branchYinYang: core.BRANCH_YINYANG[branch],
    hiddenStems: core.HIDDEN_STEMS[branch],
    shiShen: stem === dayStem ? '日主' : core.getShiShen(dayStem, stem),
  };
}

function makeChart(rec) {
  const date = parseBirthDate(rec.block);
  const time = parseBirthTime(rec.block);
  const pillars = parseFourPillars(rec.block);
  const gender = /女/.test(field(rec.block, '性别')) ? 'female' : 'male';
  if (!date) return null;
  if (pillars) {
    const [y, m, d, h] = pillars;
    const monthBranchIndex = core.MONTH_BRANCHES.indexOf(m[1]);
    if (monthBranchIndex < 0) return null;
    const daYun = parseDaYun(rec.block, date.year) ?? [];
    return {
      year: makePillar(y[0], y[1], d[0]),
      month: makePillar(m[0], m[1], d[0]),
      day: makePillar(d[0], d[1], d[0]),
      hour: makePillar(h[0], h[1], d[0]),
      monthBranchIndex,
      gender,
      birthInfo: {
        solarDate: `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
        solarTime: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`,
        birthPlace: '北京',
        trueSolarTime: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`,
        trueSolarOffset: 0,
        standardTime: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`,
        dstApplied: false,
        dstOffsetMinutes: 0,
        longitudeOffsetMinutes: 0,
        equationOfTimeMinutes: 0,
        trueSolarDate: `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
        trueSolarDayOffset: 0,
      },
      daYun,
    };
  }
  return core.calculateBaZi(date.year, date.month, date.day, time.hour, time.minute, gender, '北京');
}

// ---------- 标签归一化 ----------
function normWealth(text) {
  if (!text) return null;
  if (/(未提及|未量化|待定|未明确)/.test(text) && !/(小康|中上|富裕|富豪|小富|贫困|温饱|负债)/.test(text)) return null;
  if (/(富豪|亿级|千万|富裕|小富|富贵双全)/.test(text)) return 'high';
  if (/(中上|数百万|小康)/.test(text)) return 'mid';
  if (/(温饱|贫困|负债|贫穷|无富|财运不好|破财)/.test(text)) return 'low';
  return null;
}

function normEducation(text) {
  if (!text || /(未提及|待定|未明确)/.test(text)) return null;
  if (/(博士|硕士|985|211|一本|本科|大学)/.test(text)) return 'high';
  if (/(大专|高中|中专|技校)/.test(text)) return 'mid';
  if (/(初中|小学|无学历|辍学|学历不高)/.test(text)) return 'low';
  return null;
}

function normWork(text) {
  if (!text || /(未提及|未明确)/.test(text)) return null;
  if (/(学生|在读|未工作|躺平|待业|未在职)/.test(text)) return '学生/未工作';
  if (/(体制内|国企|高校|教授|官员|机关|事业单位|政府)/.test(text)) return '体制/组织';
  if (/(个体|自由职业|销售|创业|自营|做生意)/.test(text)) return '个体/自由';
  if (/(企业|大厂|职员|业务|设备维修|财务|医学|海外工作|在职)/.test(text)) return '企业/专业';
  return null;
}

function normEmotion(block) {
  const text = `${field(block, '关键年份')}\n${block}`;
  if (/(离婚|分手|感情一般|感情不好|感情不合|婚姻不幸)/.test(text)) return '波动';
  if (/(结婚|已婚|婚姻稳定|感情好|夫妻感情不错)/.test(text)) return '稳定';
  return null;
}

function normLevel(wealth, work, edu) {
  if (!wealth && !work && !edu) return null;
  if (wealth === 'high' || (work === '体制/组织' && edu === 'high')) return 'high';
  if (wealth === 'low' || edu === 'low' || work === '学生/未工作') return 'low';
  return 'mid';
}

// ---------- 回测 ----------
const cases = blocks.map((block) => {
  const id = block.match(/^## (A\d+)/)?.[1] ?? '?';
  const rec = { id, block };
  const wealth = normWealth(field(block, '财富层次'));
  const education = normEducation(field(block, '学历'));
  const work = normWork(field(block, '职业状态'));
  const emotion = normEmotion(block);
  const level = normLevel(wealth, work, education);
  return { ...rec, wealth, education, work, emotion, level, chart: makeChart(rec) };
}).filter((c) => c.chart);

const results = cases.map((c) => {
  const a = core.buildPeiranAnalysis(c.chart, 2026);
  const five = core.analyzeFiveDimensions(a, 2026);
  return { id: c.id, expected: { wealth: c.wealth, education: c.education, work: c.work, emotion: c.emotion, level: c.level }, actual: { wealth: five.wealth.grade, education: five.education.grade, work: five.work.type, emotion: five.emotion.state, level: five.level.grade }, detail: five, nayin: { year: a.yearNayin.name, day: a.dayNayin.name, chain: a.chain.kind, body: a.body.score } };
});

function accuracy(key, expectedKey = key) {
  let n = 0, ok = 0;
  const unknown = [];
  for (const r of results) {
    const e = r.expected[expectedKey];
    const a = r.actual[key];
    if (e == null) continue;
    n++;
    if (a === e) ok++;
    else unknown.push({ id: r.id, expected: e, actual: a, nayin: r.nayin });
  }
  return { key, n, ok, acc: n ? +(ok / n * 100).toFixed(1) : null, errors: unknown };
}

function confusion(key, expectedKey = key) {
  const map = {};
  for (const r of results) {
    const e = r.expected[expectedKey];
    const a = r.actual[key];
    if (e == null) continue;
    map[e] ??= {};
    map[e][a] = (map[e][a] || 0) + 1;
  }
  return map;
}

const summary = {
  generatedAt: new Date().toISOString(),
  source: 'docs/视频案例库.md',
  casesTotal: blocks.length,
  casesParsed: cases.length,
  labelCoverage: {
    wealth: cases.filter((c) => c.wealth).length,
    education: cases.filter((c) => c.education).length,
    work: cases.filter((c) => c.work).length,
    emotion: cases.filter((c) => c.emotion).length,
    level: cases.filter((c) => c.level).length,
  },
  metrics: {
    level: accuracy('level'),
    education: accuracy('education'),
    wealth: accuracy('wealth'),
    work: accuracy('work'),
    emotion: accuracy('emotion'),
  },
  confusion: {
    level: confusion('level'),
    education: confusion('education'),
    wealth: confusion('wealth'),
    work: confusion('work'),
    emotion: confusion('emotion'),
  },
  cases: results.map((r) => ({ id: r.id, expected: r.expected, actual: r.actual, nayin: r.nayin, detail: r.detail })),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));

console.log(`cases: ${cases.length}/${blocks.length}`);
console.log('label coverage:', summary.labelCoverage);
for (const k of ['level', 'education', 'wealth', 'work', 'emotion']) {
  const m = summary.metrics[k];
  console.log(`${k}: n=${m.n} acc=${m.acc}% (${m.ok}/${m.n})`);
  if (m.errors.length) console.log(`  errors:`, m.errors.slice(0, 8));
}
console.log('written', OUT);
