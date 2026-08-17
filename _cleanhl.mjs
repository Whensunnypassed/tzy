import fs from 'fs';
const FILE = 'src/pages/BaZiAnalyzerPage/BaZiAnalyzerPage.tsx';
const raw = fs.readFileSync(FILE, 'utf8');
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

// 需要清理的"标题级"标记位置类型：
// 1. <CardTitle ...>...</CardTitle> 内容中的 mark-highlight（已在重建时做过，检查剩余）
// 2. <AccordionTrigger ...>...</AccordionTrigger> 内容中的 mark-highlight
// 3. TOC 目录 / 其它 section title / h2/h3 class 带标题特征的 mark-highlight
// 4. 明确的标题上下文：<div className="...title...">、<h1>、<h2>、<h3>

function stripFromTaggedBlocks(arr, openRe, closeRe) {
  const out = [];
  let depth = 0;
  const MH_OPEN = /<span\s+className="mark-highlight">/g;
  const MH_CLOSE = /<\/span>/g;
  for (const l of arr) {
    let line = l;
    const opens = (line.match(openRe) || []).length;
    const closes = (line.match(closeRe) || []).length;
    if (opens > 0) depth += opens;
    if (depth > 0) line = line.replace(MH_OPEN, '').replace(MH_CLOSE, '');
    if (closes > 0) depth = Math.max(0, depth - closes);
    out.push(line);
  }
  return out;
}

let out = lines.slice();

// CardTitle
out = stripFromTaggedBlocks(out, /<CardTitle\b/g, /<\/CardTitle>/g);
// AccordionTrigger
out = stripFromTaggedBlocks(out, /<AccordionTrigger\b/g, /<\/AccordionTrigger>/g);
// h1/h2/h3/h4
out = stripFromTaggedBlocks(out, /<h[1-4]\b/g, /<\/h[1-4]>/g);

// TOC label： label: 'XXXX' 中的 mark-highlight（若用模板字符串或直接含 span）—— 暴力：去掉 { id: ..., label: ... } 行中的 mark-highlight
const tocMarkerRe = /\{\s*id:\s*'[-\w]+',\s*label:/;
for (let i = 0; i < out.length; i++) {
  if (tocMarkerRe.test(out[i])) {
    out[i] = out[i].replace(/<span\s+className="mark-highlight">/g, '').replace(/<\/span>/g, '');
  }
}

fs.writeFileSync(FILE, out.join(EOL), 'utf8');
console.log('OK. lines:', out.length);

// 再次检查：还剩多少个 mark-highlight，列出行号与前后文
const remain = [];
for (let i = 0; i < out.length; i++) {
  if (out[i].includes('mark-highlight')) remain.push({ n: i + 1, line: out[i].trim().slice(0, 180) });
}
console.log('remaining mark-highlight count:', remain.length);
for (const r of remain.slice(0, 40)) console.log(' ', r.n, ':', r.line);
