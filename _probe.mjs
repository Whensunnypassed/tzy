import fs from 'fs';
const p = 'src/pages/BaZiAnalyzerPage/BaZiAnalyzerPage.tsx';
const s = fs.readFileSync(p, 'utf8').split(/\r?\n/);
const markers = [
  'id="section-overview"',
  'id="section-pie"',
  'id="section-taiji"',
  'id="section-special-tips"',
  'id="section-pillars"',
  'id="section-monthqi"',
  'id="section-yongji"',
  'id="section-mingju-pattern"',
  'id="section-dayun"',
  '底部操作区',
  "id: 'overview'",
  "id: 'pie'",
  '报告目录',
  '四柱排盘总览',
  '月气分析',
  '用神忌神判断',
  '命局模式',
  '大运流年',
  '<CardHeader className="pt-8 pb-5 text-center">',
  '太极等级',
];
markers.forEach(m => {
  let n = 1;
  for (const l of s) {
    if (l.includes(m)) {
      console.log(String(n).padStart(5, ' '), ':', l.trim().slice(0, 140));
      break;
    }
    n++;
  }
});
console.log('total lines:', s.length);
