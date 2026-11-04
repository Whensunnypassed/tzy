/**
 * 推步线 P1 闸门：L0 常气层（先验曲线）自检
 *
 * 只验证「先验曲线本身的数学性质」，不涉及任何吉凶判读。
 * 用法：node scripts/tuibu-prior-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPrior() {
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  const entry = path.join(distDir, '_tuibu_entry.ts');
  const outfile = path.join(distDir, '_tuibu_prior.cjs');
  fs.writeFileSync(entry, `export * from '@/analysis/tuibu';\n`);
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

const {
  PRIOR, PRIOR_TOTAL, TERM_MONTHS, boundaryHint, branchAt, parseMinutes,
  buildSanYuan, taiYuanOf, kOperator, kProfile, fourLessons, skyMap,
  transitMarkers, isChong, isLiuHe,
  lookupAncientPlace, longitudeOffsetMinutes,
  jieBoundaryRisk, buildTuibuFrame, gregorianYearBranch,
} = loadPrior();

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures += 1;
    console.error(`✗ ${label}: 期望 ${JSON.stringify(expected)}，实得 ${JSON.stringify(actual)}`);
  }
  return ok;
}

// 1. 锚点完整性与恒和
check('锚点共 12 个', PRIOR.anchors.length, 12);
check(
  '锚点月建顺序',
  PRIOR.anchors.map((a) => a.termMonth),
  [...TERM_MONTHS],
);
check(
  '阳量序列',
  PRIOR.anchors.map((a) => a.yangQty),
  [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0],
);
check(
  '阴阳恒和',
  PRIOR.anchors.map((a) => a.yangQty + a.yinQty),
  new Array(12).fill(PRIOR_TOTAL),
);
check(
  '斜率序列',
  PRIOR.anchors.map((a) => a.dYangPerMonth),
  [1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1, 1],
);
check('卦名', PRIOR.anchors.map((a) => a.gua), ['复', '临', '泰', '大壮', '夬', '乾', '姤', '遁', '否', '观', '剥', '坤']);

// 2. 插值与边界
const at = (m, p) => PRIOR.at(m, p);
check('寅月节气点', [at('寅', 0).yangQty, at('寅', 0).yinQty], [3, 3]);
check('寅月中点', [at('寅', 0.5).yangQty, at('寅', 0.5).yinQty], [3.5, 2.5]);
check('巳月末=午月首（连续）', at('巳', 1).yangQty, at('午', 0).yangQty);
check('亥月末=子月首（连续）', at('亥', 1).yangQty, at('子', 0).yangQty);
check('越界钳制-负', at('子', -3).yangQty, at('子', 0).yangQty);
check('越界钳制-超', at('子', 3).yangQty, at('子', 1).yangQty);

// 3. 单调段（斜率为「到下一锚点」的差分：巳月是峰值，向下一月转退）
const upward = ['子', '丑', '寅', '卯', '辰'].every((m) => at(m, 0).dYangPerMonth === 1);
const peak = at('巳', 0).dYangPerMonth === -1;
const downward = ['午', '未', '申', '酉', '戌'].every((m) => at(m, 0).dYangPerMonth === -1);
const turnUp = at('亥', 0).dYangPerMonth === 1;
check('子至辰为进', upward, true);
check('巳为峰值（向前一步转退）', peak, true);
check('午至戌为退', downward, true);
check('亥转进', turnUp, true);

// 4. 时辰边界（T10 局部）
check('00:30 为子时', branchAt(30).branch, '子');
check('23:30 为子时', branchAt(23 * 60 + 30).branch, '子');
check('02:00 为丑时中段且稳定', [branchAt(120).branch, boundaryHint(120).ambiguous], ['丑', false]);
check('01:05 贴近子丑界', [boundaryHint(65).ambiguous, boundaryHint(65).neighbor], [true, '子']);
check('02:55 贴近丑寅界', [boundaryHint(175).ambiguous, boundaryHint(175).neighbor], [true, '寅']);
check('12:03 解析', parseMinutes('1990-05-15 12:03'), 723);
check('23:00 正落交界须双算', boundaryHint(23 * 60).note.includes('双算'), true);

// 5. 三元结构（T3）
check('胎元：丙寅 → 丁巳', taiYuanOf('丙', '寅'), { stem: '丁', zhi: '巳' });
check('胎元：辛巳 → 壬申', taiYuanOf('辛', '巳'), { stem: '壬', zhi: '申' });
const sy = buildSanYuan({
  year: { stem: '庚', branch: '午' },
  month: { stem: '辛', branch: '巳' },
  day: { stem: '戊', branch: '辰' },
  hour: { stem: '壬', branch: '子' },
});
check('四柱权重 10/10/8/10', [sy.weights.tai, sy.weights.month, sy.weights.day, sy.weights.hour], [10, 10, 8, 10]);
check('身取日支且低置信', [sy.shen.value.zhi, sy.shen.confidence], ['辰', 'low']);
check('支命取月支藏干', sy.ming.value, ['丙', '戊', '庚']);
check('干禄四处', sy.lu.value.map((x) => x.luZhi), ['申', '酉', '巳', '亥']);

// 6. 相位层（T4）
check('k：亥将加子时', kOperator('亥', '子'), 11);
check('k=0 伏吟', kProfile(0).name, '伏吟');
check('k=6 返吟', kProfile(6).name, '返吟');
check('k=4 全合', kProfile(4).name, '全合');
check('伏吟天地盘重合', skyMap(0)['子'], '子');
check('寅加子上：地盘子见天盘寅', skyMap(2)['子'], '寅');
const fl = fourLessons('甲', '子', 0);
check('伏吟四课同日干寄宫', fl.one, '寅');

// 7. 触发层（T5）
check('子午相冲', isChong('子', '午'), true);
check('子丑六合', isLiuHe('子', '丑'), true);
const tm = transitMarkers('午', { year: '未', month: '子', day: '子', hour: '卯' });
check('流年午冲日支子且高置信', tm.some((m) => m.kind === '冲' && m.target === 'day' && m.confidence === 'high'), true);

// 8. 古地名（T10）
check('长安经度', lookupAncientPlace('长安')?.longitude, 108.94);
check('西安别名命中', lookupAncientPlace('西安')?.name, '长安');
check('未收录地名返回 null', lookupAncientPlace('不存在的城'), null);
check('经度折分钟', Math.round(longitudeOffsetMinutes(108.94) * 100) / 100, -44.24);

// 9. 古历边界提示（T10）
check('2/4 立春窗口内', jieBoundaryRisk(2, 4).near, true);
check('2/14 非窗口', jieBoundaryRisk(2, 14).near, false);
check('立春影响年柱', jieBoundaryRisk(2, 4).affects, 'year');

// 10. 适配器（T6）
check('1990 年支', gregorianYearBranch(1990, 5, 15), '午');
const frame = buildTuibuFrame(
  { year: { stem: '庚', branch: '午' }, month: { stem: '辛', branch: '巳' }, day: { stem: '戊', branch: '辰' }, hour: { stem: '壬', branch: '子' } },
  { zhongQi: '小满', transitBranch: '午' },
);
check('小满将申加子时 k=8', frame.phase?.k, 8);
check('帧含触发窗口', Array.isArray(frame.triggers), true);

// 11. 输出表
console.log('月建  消息卦  阳  阴  斜率');
for (const a of PRIOR.anchors) {
  console.log(`${a.termMonth}    ${a.gua.padEnd(4, '　')} ${a.yangQty}   ${a.yinQty}   ${a.dYangPerMonth > 0 ? '+' : ''}${a.dYangPerMonth}`);
}

if (failures > 0) {
  console.error(`\n${failures} 项失败`);
  process.exit(1);
}
console.log('\n✓ 先验层 16 项 + 时辰边界 7 项 + 三元 6 项 + 相位 6 项 + 触发 3 项 + 地名 4 项 + 古历 3 项 + 适配器 3 项，共 48 项性质全部通过');
