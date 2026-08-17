import fs from 'fs';

const FILE = 'src/pages/BaZiAnalyzerPage/BaZiAnalyzerPage.tsx';
const raw = fs.readFileSync(FILE, 'utf8');
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);
console.log('total lines:', lines.length);

// 定位各模块边界（1-based）
function findLine(pred, start = 1) {
  for (let i = start; i <= lines.length; i++) if (pred(lines[i - 1], i)) return i;
  return -1;
}

function findModule(startMarker, endAfterMarker, startOffset = 1) {
  const s = findLine(l => l.includes(startMarker), startOffset);
  if (s < 0) throw new Error('not found start: ' + startMarker);
  // 找到下一个 module 的注释行或底部操作区作为结束（上一行），
  // 具体：依次查找 下一个 "              {/*" 或 "            {/* 底部操作区 */}"
  const e = findLine((l, i) => {
    if (i <= s) return false;
    // 非太极注释、非 Pie/TODO 的注释（模块开始）
    if (/^ *\{\/\*\s*(一|二|三|四|五|六|七|八|九|十|[一二三四五六七八九十]·[A-Z]|底部操作区|右：报告目录)/.test(l)) return true;
    return false;
  }, s + 1);
  if (e < 0) return { start: s, end: lines.length };
  return { start: s, end: e - 1 };
}

const OVERVIEW = findModule('命主速览条：4 格核心信息');
console.log('overview:', OVERVIEW);
const PIE = findModule('二·A：寒热气·阴阳气占比');
console.log('pie:', PIE);
const TAIJI = findModule('二·B：盘内存在太极');
console.log('taiji:', TAIJI);
const SPECIAL = findModule('二·C：特别提示');
console.log('special:', SPECIAL);
const PILLARS = findModule('三、四柱排盘总览（独立）');
console.log('pillars:', PILLARS);
// 月气：注释 "三、月气分析（天之易核心）— 放前面"
const MONTHQI = findModule('三、月气分析（天之易核心）');
console.log('monthqi:', MONTHQI);
const YONGJI = findModule('四、用神忌神判断');
console.log('yongji:', YONGJI);
const MINGJU = findModule('五、命局模式分析');
console.log('mingju:', MINGJU);
const DAYUN = findModule('六、大运流年分析');
console.log('dayun:', DAYUN);

const FOOT_START = findLine(l => l.includes('底部操作区'), MINGJU.end);
console.log('FOOT_START:', FOOT_START);

// ==== Helpers ====
function sliceL(a, b) { return lines.slice(a - 1, b); }

function stripTitleHighlights(modLines) {
  const out = [];
  let inCardTitle = false;
  const MH_OPEN = /<span\s+className="mark-highlight">/g;
  const MH_CLOSE = /<\/span>/g;
  for (const l of modLines) {
    let line = l;
    const hasOpen = /<CardTitle\b/.test(line);
    const hasClose = /<\/CardTitle>/.test(line);
    if (hasOpen) inCardTitle = true;
    if (inCardTitle) {
      line = line.replace(MH_OPEN, '').replace(MH_CLOSE, '');
    }
    if (hasClose) inCardTitle = false;
    out.push(line);
  }
  return out;
}

// ==== 取模块并进行清洗/转换 ====
let headerBlock = sliceL(626, 649); // "命局分析报告" 标题 + 副标题
let beforeAll = sliceL(1, 625);
let afterAll = sliceL(FOOT_START, lines.length);

// 1. 四柱排盘
let pillars = stripTitleHighlights(sliceL(PILLARS.start, PILLARS.end));
pillars[0] = '              {/* 一、四柱排盘总览 */}';

// 2. 大运流年
let dayun = stripTitleHighlights(sliceL(DAYUN.start, DAYUN.end));
dayun[0] = '              {/* 二、大运流年分析 */}';

// 3. 命主速览（标题级没 mark-highlight 可跳过，但还是按规范走）
let overview = sliceL(OVERVIEW.start, OVERVIEW.end);
overview[0] = '              {/* 三、命主速览 */}';

// 4. 寒热·阴阳占比
let pie = stripTitleHighlights(sliceL(PIE.start, PIE.end));
pie[0] = '              {/* 四、寒热气·阴阳气占比 */}';

// 5. 盘内存在太极 —— 重写 3 列为 2 列（太极名称 + 吉凶），去掉等级/判定依据数
let taijiArr = stripTitleHighlights(sliceL(TAIJI.start, TAIJI.end));
// 找块开始（CardContent 一行）
const blockStartIdx = taijiArr.findIndex(l => /<CardContent className="space-y-5/.test(l));
const jiDeCommentIdx = taijiArr.findIndex(l => /太极吉凶所得/.test(l));
// 找第一个 grid gap-4 md:grid-cols-3 的行
const grid3Idx = taijiArr.findIndex(l => l.includes('grid gap-4 md:grid-cols-3'));
// 把 blockStartIdx..jiDeCommentIdx-1 段整体替换
const before = taijiArr.slice(0, blockStartIdx);
const after = taijiArr.slice(jiDeCommentIdx);

const repl = [
  taijiArr[blockStartIdx],
  '',
  '                  <div className="grid gap-4 md:grid-cols-2">',
  '                    <div',
  '                      className="rounded-xl p-4 text-center"',
  '                      style={{',
  '                        backgroundColor: `${solarTermTheme.palette.primary}0D`,',
  '                        border: `1px solid ${solarTermTheme.palette.primary}22`,',
  '                      }}',
  '                    >',
  '                      <div className="text-[11px] font-black tracking-[0.25em] text-muted-foreground">盘内有什么太极</div>',
  '                      <div',
  '                        className="mt-3 text-[24px] font-black leading-[1.2] md:text-[30px]"',
  '                        style={{ fontFamily: "\'Noto Serif SC\', serif", color: \'var(--foreground)\' }}',
  '                      >',
  '                        {taiji.taijiType}',
  '                      </div>',
  '                    </div>',
  '                    <div',
  '                      className="rounded-xl p-4 text-center"',
  '                      style={{',
  '                        backgroundColor:',
  "                          taiji.jiXiong === '大吉' ? 'rgba(16,185,129,0.10)'",
  "                          : taiji.jiXiong === '吉' ? 'rgba(16,185,129,0.07)'",
  "                          : taiji.jiXiong === '平' ? 'rgba(107,114,128,0.08)'",
  "                          : taiji.jiXiong === '凶' ? 'rgba(239,68,68,0.08)'",
  "                          : 'rgba(185,28,28,0.10)',",
  '                        border:',
  '                          `1px solid ${',
  "                            taiji.jiXiong === '大吉' ? 'rgba(16,185,129,0.35)'",
  "                            : taiji.jiXiong === '吉' ? 'rgba(16,185,129,0.25)'",
  "                            : taiji.jiXiong === '平' ? 'rgba(107,114,128,0.25)'",
  "                            : taiji.jiXiong === '凶' ? 'rgba(239,68,68,0.30)'",
  "                            : 'rgba(185,28,28,0.40)'",
  '                          }`,',
  '                      }}',
  '                    >',
  '                      <div className="text-[11px] font-black tracking-[0.25em] text-muted-foreground">此太极是吉是凶</div>',
  '                      <div',
  '                        className="mt-2 text-[32px] font-black leading-none"',
  '                        style={{',
  '                          fontFamily: "\'Noto Serif SC\', serif",',
  '                          color:',
  "                            taiji.jiXiong === '大吉' ? '#059669'",
  "                            : taiji.jiXiong === '吉' ? '#047857'",
  "                            : taiji.jiXiong === '平' ? '#374151'",
  "                            : taiji.jiXiong === '凶' ? '#DC2626'",
  "                            : '#B91C1C',",
  '                        }}',
  '                      >',
  '                        {taiji.jiXiong}',
  '                      </div>',
  '                    </div>',
  '                  </div>',
  '',
];

let taijiFinal = [].concat(before, repl, after);
taijiFinal[0] = '              {/* 五、盘内存在太极 */}';

// 6. 特别提示
let special = stripTitleHighlights(sliceL(SPECIAL.start, SPECIAL.end));
special[0] = '              {/* 六、特别提示 */}';

// 7. 月气分析 —— 删除标题的（天之易核心）后缀
let monthqi = stripTitleHighlights(sliceL(MONTHQI.start, MONTHQI.end));
for (let i = 0; i < monthqi.length; i++) {
  if (monthqi[i].includes('月气分析（天之易核心）')) {
    monthqi[i] = monthqi[i].replace('月气分析（天之易核心）', '月气分析');
  }
}
monthqi[0] = '              {/* 七、月气分析 */}';

// 8. 用神判断
let yongji = stripTitleHighlights(sliceL(YONGJI.start, YONGJI.end));
yongji[0] = '              {/* 八、用神忌神判断 */}';

// 9. 命局模式
let mingju = stripTitleHighlights(sliceL(MINGJU.start, MINGJU.end));
mingju[0] = '              {/* 九、命局模式分析 */}';

// 拼接新 body
const newBody = [].concat(
  headerBlock, [''],
  pillars, [''],
  dayun, [''],
  overview, [''],
  pie, [''],
  taijiFinal, [''],
  special, [''],
  monthqi, [''],
  yongji, [''],
  mingju,
);

// 替换 TOC（afterAll 中）
function replaceTOC(arr) {
  const out = [];
  let i = 0;
  while (i < arr.length) {
    const l = arr[i];
    if (l.includes("id: 'overview', label:")) {
      out.push("                { id: 'pillars', label: '一、四柱排盘' },");
      out.push("                { id: 'dayun', label: '二、大运流年' },");
      out.push("                { id: 'overview', label: '三、命主速览' },");
      out.push("                { id: 'pie', label: '四、寒热·阴阳占比' },");
      out.push("                { id: 'taiji', label: '五、盘内存在太极' },");
      out.push("                { id: 'special-tips', label: '六、特别提示' },");
      out.push("                { id: 'monthqi', label: '七、月气分析' },");
      out.push("                { id: 'yongji', label: '八、用神判断' },");
      out.push("                { id: 'mingju-pattern', label: '九、命局模式' },");
      // 跳过原来 8/9 行（直到 dayun 后为止）
      let j = i;
      for (; j < arr.length; j++) if (arr[j].includes("id: 'dayun'")) break;
      i = j + 1;
      continue;
    }
    out.push(l);
    i++;
  }
  return out;
}
const afterFinal = replaceTOC(afterAll);

const final = [].concat(beforeAll, newBody, afterFinal).join(EOL);
fs.writeFileSync(FILE, final, 'utf8');
console.log('WRITE OK, new lines:', final.split(/\r?\n/).length);
