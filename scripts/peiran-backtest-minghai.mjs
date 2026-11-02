#!/usr/bin/env node
/**
 * 沛然堂线 · 纳音五维大样本回测（命海拾遗 1180 例）
 * 数据：%TEMP%/tzy-minghai-cases.jsonl（公共案例库，结构化标签）
 * 输出：dist/peiran-minghai-validation.json
 *
 * 运行：node scripts/peiran-backtest-minghai.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(process.env.TEMP || '/tmp', 'tzy-minghai-cases.jsonl');
const OUT = path.join(DIST, 'peiran-minghai-validation.json');

function loadCore() {
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
  const entry = path.join(DIST, '_peiran_mh_entry.ts');
  const outfile = path.join(DIST, '_peiran_mh.cjs');
  fs.writeFileSync(entry, `
import { STEM_ELEMENTS, BRANCH_ELEMENTS, STEM_YINYANG, BRANCH_YINYANG, HIDDEN_STEMS, MONTH_BRANCHES, getShiShen } from '@/analysis/common/baziCalculator';
import { buildPeiranAnalysis } from '@/analysis/peiran';
import { analyzeFiveDimensions } from '@/analysis/peiran/fiveDimensions';
export { STEM_ELEMENTS, BRANCH_ELEMENTS, STEM_YINYANG, BRANCH_YINYANG, HIDDEN_STEMS, MONTH_BRANCHES, getShiShen, buildPeiranAnalysis, analyzeFiveDimensions };
`);
  esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', outfile, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
  return createRequire(import.meta.url)(outfile);
}

const core = loadCore();
const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const JIAZI60 = [];
for (let i = 0; i < 60; i++) JIAZI60.push(STEMS[i % 10] + BRANCHES[i % 12]);

function inferBirthYear(yearGanzhi, currentYear = 2026) {
  let best = 1985;
  let bestDist = 999;
  for (let y = 1930; y <= 2010; y++) {
    const idx = ((y - 1984) % 60 + 60) % 60;
    if (JIAZI60[idx] !== yearGanzhi) continue;
    const dist = Math.abs(y - 1985);
    if (dist < bestDist) { best = y; bestDist = dist; }
  }
  return best;
}

function makePillar(ganzhi, dayStem) {
  const stem = ganzhi[0];
  const branch = ganzhi[1];
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
  const gender = rec.gender === 1 ? 'male' : 'female';
  const birthYear = inferBirthYear(rec.year_ganzhi);
  const y = makePillar(rec.year_ganzhi, rec.day_ganzhi[0]);
  const m = makePillar(rec.month_ganzhi, rec.day_ganzhi[0]);
  const d = makePillar(rec.day_ganzhi, rec.day_ganzhi[0]);
  const h = makePillar(rec.hour_ganzhi, rec.day_ganzhi[0]);
  const monthBranchIndex = core.MONTH_BRANCHES.indexOf(m.branch);
  if (monthBranchIndex < 0) return null;
  const shun = (core.STEM_YINYANG[y.stem] === 'yang' && gender === 'male')
    || (core.STEM_YINYANG[y.stem] === 'yin' && gender === 'female');
  const monthIdx = JIAZI60.indexOf(rec.month_ganzhi);
  const startAge = 5;
  const daYun = [];
  for (let i = 0; i < 8; i++) {
    const idx = shun ? (monthIdx + 1 + i) % 60 : (((monthIdx - 1 - i) % 60) + 60) % 60;
    const gz = JIAZI60[idx];
    daYun.push({ index: i, stem: gz[0], branch: gz[1], startAge: startAge + i * 10, startYear: birthYear + startAge + i * 10, endYear: birthYear + startAge + i * 10 + 9, daysToJie: 0 });
  }
  return {
    year: y, month: m, day: d, hour: h, monthBranchIndex, gender,
    birthInfo: {
      solarDate: `${birthYear}-01-01`, solarTime: '12:00', birthPlace: '北京',
      trueSolarTime: '12:00', trueSolarOffset: 0, standardTime: '12:00',
      dstApplied: false, dstOffsetMinutes: 0, longitudeOffsetMinutes: 0, equationOfTimeMinutes: 0,
      trueSolarDate: `${birthYear}-01-01`, trueSolarDayOffset: 0,
    },
    daYun,
  };
}

function normWealth(v) {
  if (!v) return null;
  if (v === '富裕' || v === '富贵' || v === '小富') return 'high';
  if (v === '小康') return 'mid';
  if (v === '温饱' || v === '负债') return 'low';
  return null;
}

function normEdu(v) {
  if (!v) return null;
  if (['本科', '研究生', '硕士', '博士', '博士后'].includes(v)) return 'high';
  if (['大专', '中专', '高中', '技校'].includes(v)) return 'mid';
  if (['初中', '小学'].includes(v)) return 'low';
  return null;
}

function normWork(v) {
  if (!v) return null;
  if (v === '公职' || v === '国企') return '体制/组织';
  if (v === '医教金融' || v === '私企白领' || v === '金融') return '企业/专业';
  if (v === '自由职业' || v === '经商') return '个体/自由';
  return null;
}

function normEmotion(v) {
  if (!v) return null;
  if (v === '已婚(初婚)') return '稳定';
  if (v === '二婚' || v === '三婚及以上' || v === '离异' || v === '丧偶') return '波动';
  return null;
}

function normLevel(v) {
  if (!v) return null;
  if (v === '富裕家庭' || v === '城市小康家庭') return 'high';
  if (v === '城市普通家庭' || v === '公职') return 'mid';
  if (v === '农村普通家庭' || v === '温饱' || v === '单亲家庭' || v === '送养') return 'low';
  return null;
}

const lines = fs.readFileSync(SRC, 'utf8').trim().split(/\r?\n/);
const cases = [];
for (const line of lines) {
  let rec;
  try { rec = JSON.parse(line); } catch { continue; }
  const label = rec.label ? JSON.parse(rec.label) : {};
  const chart = makeChart(rec);
  if (!chart) continue;
  cases.push({
    id: rec.id,
    chart,
    expected: {
      wealth: normWealth(label['财富层次']),
      education: normEdu(label['学历']),
      work: normWork(label['职业类别']),
      emotion: normEmotion(label['婚姻状态']),
      level: normLevel(label['出身']),
    },
  });
}

const CHAIN_KINDS = ['shengUp', 'shengDown', 'keDown', 'keUp', 'mixed', 'same'];
const RELS = ['same', 'shengYear', 'yearSheng', 'keYear', 'yearKe'];
const ELS = ['wood', 'fire', 'earth', 'metal', 'water'];

function featureVector(a) {
  const oneHot = (vals, v) => vals.map((x) => (x === v ? 1 : 0));
  const counts = { same: 0, shengYear: 0, yearSheng: 0, keYear: 0, yearKe: 0 };
  for (const p of a.pillars.slice(1)) counts[p.relation]++;
  const daYunAvg = a.daYun.length ? a.daYun.reduce((s, d) => s + d.fortuneScore, 0) / a.daYun.length : 0;
  const cur = a.daYun.find((d) => d.startYear <= 2026 && d.endYear >= 2026) ?? a.daYun[0];
  return [
    a.body.score,
    a.xingChong.hits.length,
    a.patterns.length,
    a.pure.isPure ? 1 : 0,
    a.pure.label === '一行独盛' ? 1 : 0,
    ...oneHot(CHAIN_KINDS, a.chain.kind),
    ...oneHot(ELS, a.yearNayin.element),
    ...oneHot(ELS, a.dayNayin.element),
    ...oneHot(RELS, a.pillars[2].relation),
    ...oneHot(RELS, a.pillars[1].relation),
    ...oneHot(RELS, a.pillars[3].relation),
    ...RELS.map((k) => counts[k]),
    ...oneHot(RELS, a.taiYuan.relation),
    daYunAvg,
    cur ? cur.fortuneScore : 0,
  ];
}

const FEATURE_NAMES = [
  'body', 'xing', 'patterns', 'pure', 'pureStrong',
  ...CHAIN_KINDS.map((k) => `chain:${k}`),
  ...ELS.map((e) => `yearEl:${e}`),
  ...ELS.map((e) => `dayEl:${e}`),
  ...RELS.map((r) => `dayRel:${r}`),
  ...RELS.map((r) => `monthRel:${r}`),
  ...RELS.map((r) => `hourRel:${r}`),
  ...RELS.map((r) => `count:${r}`),
  ...RELS.map((r) => `taiYuan:${r}`),
  'daYunAvg', 'currentDaYun',
];

const results = cases.map((c) => {
  const a = core.buildPeiranAnalysis(c.chart, 2026);
  const five = core.analyzeFiveDimensions(a, 2026);
  return {
    id: c.id,
    expected: c.expected,
    actual: { wealth: five.wealth.grade, education: five.education.grade, work: five.work.type, emotion: five.emotion.state, level: five.level.grade },
    detail: five,
    features: featureVector(a),
    nayin: { year: a.yearNayin.name, day: a.dayNayin.name, chain: a.chain.kind, body: a.body.score },
  };
});

function accuracy(key) {
  let n = 0, ok = 0;
  const errors = [];
  for (const r of results) {
    const e = r.expected[key];
    const a = r.actual[key];
    if (e == null) continue;
    n++;
    if (a === e) ok++;
    else if (errors.length < 20) errors.push({ id: r.id, expected: e, actual: a, nayin: r.nayin });
  }
  return { key, n, ok, acc: n ? +(ok / n * 100).toFixed(1) : null, errors };
}

function confusion(key) {
  const map = {};
  for (const r of results) {
    const e = r.expected[key];
    const a = r.actual[key];
    if (e == null) continue;
    map[e] ??= {};
    map[e][a] = (map[e][a] || 0) + 1;
  }
  return map;
}

// ---------- 浅层决策树实验：用于发现可翻译成规则的纳音特征 ----------
function gini(labels) {
  const n = labels.length;
  if (!n) return 0;
  const c = {};
  for (const l of labels) c[l] = (c[l] || 0) + 1;
  let g = 1;
  for (const k in c) g -= (c[k] / n) ** 2;
  return g;
}

function majority(labels) {
  const c = {};
  for (const l of labels) c[l] = (c[l] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function buildTree(rows, labels, indices, depth = 0, maxDepth = 4, minSamples = 25) {
  const ys = indices.map((i) => labels[i]);
  const leaf = { leaf: majority(ys), n: indices.length, dist: ys.reduce((a, y) => ((a[y] = (a[y] || 0) + 1), a), {}) };
  if (depth >= maxDepth || indices.length < minSamples || new Set(ys).size === 1) return leaf;
  const parentGini = gini(ys);
  let best = null;
  for (let f = 0; f < rows[0].length; f++) {
    const vals = [...new Set(indices.map((i) => rows[i][f]))].sort((a, b) => a - b);
    for (let k = 0; k < vals.length - 1; k++) {
      const threshold = (vals[k] + vals[k + 1]) / 2;
      const left = indices.filter((i) => rows[i][f] <= threshold);
      const right = indices.filter((i) => rows[i][f] > threshold);
      if (!left.length || !right.length) continue;
      const weighted = (left.length * gini(left.map((i) => labels[i])) + right.length * gini(right.map((i) => labels[i]))) / indices.length;
      const gain = parentGini - weighted;
      if (!best || gain > best.gain) best = { gain, f, threshold, left, right };
    }
  }
  if (!best || best.gain < 0.002) return leaf;
  return {
    feature: best.f, threshold: best.threshold, gain: +best.gain.toFixed(4),
    left: buildTree(rows, labels, best.left, depth + 1, maxDepth, minSamples),
    right: buildTree(rows, labels, best.right, depth + 1, maxDepth, minSamples),
  };
}

function predictTree(node, x) {
  if (node.leaf !== undefined) return node.leaf;
  return x[node.feature] <= node.threshold ? predictTree(node.left, x) : predictTree(node.right, x);
}

function printTree(node, indent = '') {
  if (node.leaf !== undefined) return `${indent}=> ${node.leaf} (n=${node.n}, ${JSON.stringify(node.dist)})`;
  return `${indent}${FEATURE_NAMES[node.feature]} <= ${node.threshold} (gain ${node.gain})\n${printTree(node.left, indent + '  ')}\n${printTree(node.right, indent + '  ')}`;
}

function hashId(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 1000;
  return h;
}

for (const dim of ['level', 'education', 'wealth', 'work', 'emotion']) {
  const usable = results.filter((r) => r.expected[dim] != null);
  const train = usable.filter((r) => hashId(r.id) < 700);
  const test = usable.filter((r) => hashId(r.id) >= 700);
  const trainLabels = train.map((r) => r.expected[dim]);
  const tree = buildTree(train.map((r) => r.features), trainLabels, train.map((_, i) => i));
  const trainAcc = train.length ? train.filter((r) => predictTree(tree, r.features) === r.expected[dim]).length / train.length : 0;
  const testAcc = test.length ? test.filter((r) => predictTree(tree, r.features) === r.expected[dim]).length / test.length : 0;
  const baseline = test.length ? test.filter((r) => r.expected[dim] === majority(trainLabels)).length / test.length : 0;
  console.log(`\n=== tree ${dim} train=${train.length} test=${test.length} trainAcc=${(trainAcc * 100).toFixed(1)}% testAcc=${(testAcc * 100).toFixed(1)}% baseline=${(baseline * 100).toFixed(1)}%`);
  console.log(printTree(tree).split('\n').slice(0, 18).join('\n'));
}


const summary = {
  generatedAt: new Date().toISOString(),
  source: SRC,
  casesTotal: lines.length,
  casesParsed: cases.length,
  labelCoverage: {
    wealth: cases.filter((c) => c.expected.wealth).length,
    education: cases.filter((c) => c.expected.education).length,
    work: cases.filter((c) => c.expected.work).length,
    emotion: cases.filter((c) => c.expected.emotion).length,
    level: cases.filter((c) => c.expected.level).length,
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
};

fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
console.log(`cases: ${cases.length}/${lines.length}`);
console.log('coverage', summary.labelCoverage);
for (const k of ['level', 'education', 'wealth', 'work', 'emotion']) {
  const m = summary.metrics[k];
  console.log(`${k}: n=${m.n} acc=${m.acc}% (${m.ok}/${m.n})`);
}
console.log('written', OUT);
