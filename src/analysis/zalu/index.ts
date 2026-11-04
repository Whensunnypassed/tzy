/**
 * 大杂烩线 · 八字门派登记簿
 *
 * 只收八字一门的门派：古法禄命、子平各派、调候病药、旺衰量化、象法盲派、神煞纳音。
 * 星学、占筮、三式一概不收。
 *
 * 定位：只登记，不判命。把各派「输入 → 判据 → 输出」写清楚，
 * 标明可验证性与互相冲突，供对照、引用、借接口。
 * 登记不等于采用；采用必须单列，并写明借的是哪一条接口。
 */

export type SchoolCategory = '古法与禄命' | '格局与用神' | '调候与病药' | '旺衰与量化' | '象法与盲派' | '近现代';

export type Quant = '可计算' | '部分可计算' | '不可验证';

export type Verdict = '登记' | '可借接口' | '不进判据';

export interface School {
  key: string;
  name: string;
  en: string;
  era: string;
  source: string;
  category: SchoolCategory;
  input: string;
  criterion: string;
  output: string;
  quant: Quant;
  conflict: string;
  absorb: string;
  verdict: Verdict;
}

export const ZALU_LINE = {
  key: 'zalu',
  label: '大杂烩线',
  en: 'ZALU LINE',
  note: '八字门派 · 只登记不混算',
} as const;

export const CATEGORIES: SchoolCategory[] = ['古法与禄命', '格局与用神', '调候与病药', '旺衰与量化', '象法与盲派', '近现代'];

export const SCHOOLS: School[] = [
  // ── 古法与禄命 ────────────────────────────────────────────
  {
    key: 'lixuzhong',
    name: '李虚中三命',
    en: 'LI XUZHONG',
    era: '唐',
    source: '《李虚中命书》（四库辑本，托名成分大）',
    category: '古法与禄命',
    input: '生辰年月日时',
    criterion: '年为本、日为主；干禄、支命、纳音身；胎月日时十分制权重',
    output: '名禄、积富、器识、六亲宫位',
    quant: '部分可计算',
    conflict: '年本位与子平「日干为主」直接冲突',
    absorb: '三元结构、胎月日时权重、性情语料',
    verdict: '可借接口',
  },
  {
    key: 'gongwei',
    name: '古法宫位（胎元/命宫/身宫）',
    en: 'PALACE',
    era: '唐宋',
    source: '禄命古法；后世命书沿用',
    category: '古法与禄命',
    input: '生辰四柱',
    criterion: '胎元、命宫、身宫，宫位对应六亲与身体',
    output: '六亲、身体、格局辅证',
    quant: '部分可计算',
    conflict: '宫位对应各书不一；与十神取象重复记账',
    absorb: '宫位只作旁证，不并入用忌',
    verdict: '登记',
  },
  {
    key: 'nayin',
    name: '纳音派',
    en: 'NAYIN',
    era: '汉唐以降',
    source: '六十甲子纳音；《三命通会》收录',
    category: '古法与禄命',
    input: '四柱干支',
    criterion: '纳音五行取象（海中金、炉中火…）',
    output: '器识、亲属、象意',
    quant: '不可验证',
    conflict: '与干支五行双重记账，结论常与子平相反',
    absorb: '本项目 1.2.0 已判定删除，不再复活',
    verdict: '不进判据',
  },
  {
    key: 'shensha',
    name: '神煞派',
    en: 'SHENSHA',
    era: '唐宋—明清',
    source: '《三命通会》神煞篇',
    category: '古法与禄命',
    input: '四柱干支',
    criterion: '天乙、桃花、驿马、空亡、羊刃等',
    output: '吉凶断语',
    quant: '不可验证',
    conflict: '条目互相矛盾；同一盘可同时「贵」与「凶」',
    absorb: '只标时间窗口，不进总分',
    verdict: '不进判据',
  },

  // ── 格局与用神 ────────────────────────────────────────────
  {
    key: 'ziping',
    name: '子平法（渊海子平）',
    en: 'ZIPING',
    era: '宋',
    source: '传徐子平；徐升《渊海子平》',
    category: '格局与用神',
    input: '生辰四柱',
    criterion: '日干为主、十神、月令用神、格局、大运流年',
    output: '六亲、事业、婚姻、岁运吉凶',
    quant: '部分可计算',
    conflict: '与李虚中年本位冲突；与纳音不通约',
    absorb: '十神只作社会关系读数，不作吉凶判据',
    verdict: '登记',
  },
  {
    key: 'zhenquan',
    name: '子平真诠',
    en: 'ZHENQUAN',
    era: '清',
    source: '沈孝瞻《子平真诠》',
    category: '格局与用神',
    input: '生辰四柱',
    criterion: '月令用神、顺逆、成格破格、相神救应',
    output: '格局成败、层次高低',
    quant: '部分可计算',
    conflict: '与旺衰派「身强身弱」互斥；与调候派取用不同',
    absorb: '格局成败与救应的结构判断',
    verdict: '可借接口',
  },
  {
    key: 'ditiansui',
    name: '滴天髓',
    en: 'DITIANSUI',
    era: '传宋明，清注',
    source: '传京图、刘基；任铁樵注',
    category: '格局与用神',
    input: '生辰四柱',
    criterion: '气势流通、中和、顺逆、清浊',
    output: '格局高低、用忌方向',
    quant: '部分可计算',
    conflict: '重气势轻神煞，与神煞派互斥',
    absorb: '气势与中和的语言；量化须自建',
    verdict: '登记',
  },
  {
    key: 'sanming',
    name: '三命通会系',
    en: 'SANMING',
    era: '明',
    source: '万民英《三命通会》',
    category: '格局与用神',
    input: '生辰四柱',
    criterion: '纳音、神煞、子平格局并置',
    output: '命格、神煞、六亲、寿夭',
    quant: '部分可计算',
    conflict: '书内纳音与子平两套判据并存、互不通约',
    absorb: '术语与象意辞典，不作算法',
    verdict: '登记',
  },
  {
    key: 'xingping',
    name: '星平会海',
    en: 'XINGPING',
    era: '明',
    source: '《星平会海》',
    category: '格局与用神',
    input: '生辰四柱 + 星曜',
    criterion: '子平与五星合参',
    output: '命格、星曜吉凶',
    quant: '部分可计算',
    conflict: '两套坐标系并置，判据来源不单一',
    absorb: '只作旁证，不混算',
    verdict: '登记',
  },

  // ── 调候与病药 ────────────────────────────────────────────
  {
    key: 'qiongtong',
    name: '穷通宝鉴（调候）',
    en: 'QIONGTONG',
    era: '清',
    source: '余春台辑《穷通宝鉴》',
    category: '调候与病药',
    input: '日干 + 月令',
    criterion: '十干在十二月的调候用神表',
    output: '调候用神与喜忌',
    quant: '部分可计算',
    conflict: '与格局派取用常相反（调候优先 vs 格局优先）',
    absorb: '调候方向（寒暖燥湿）可作独立读数',
    verdict: '可借接口',
  },
  {
    key: 'shenfeng',
    name: '神峰通考（病药）',
    en: 'SHENFENG',
    era: '明',
    source: '张楠《神峰通考》',
    category: '调候与病药',
    input: '生辰四柱',
    criterion: '病药说：命有病，药到病除则贵',
    output: '用神即「药」、格局成败',
    quant: '部分可计算',
    conflict: '与扶抑派「身弱喜印比」结论常相反',
    absorb: '「病—药」对举的结构，可作判断框架',
    verdict: '可借接口',
  },
  {
    key: 'congge',
    name: '从格专旺派',
    en: 'CONGGE',
    era: '明清以降',
    source: '命书通说；近人发挥',
    category: '调候与病药',
    input: '生辰四柱',
    criterion: '从财、从杀、从儿、专旺；弃命从势',
    output: '特殊格局的取用与吉凶',
    quant: '部分可计算',
    conflict: '与扶抑派「身弱喜印比」直接矛盾',
    absorb: '「顺其势」的判法可作对照口径',
    verdict: '登记',
  },

  // ── 旺衰与量化 ────────────────────────────────────────────
  {
    key: 'xinpai',
    name: '新派旺衰',
    en: 'XINPAI',
    era: '当代',
    source: '李涵辰一系',
    category: '旺衰与量化',
    input: '生辰四柱',
    criterion: '干支计分、旺衰百分比、用忌打分',
    output: '旺衰强弱、用忌、岁运分数',
    quant: '部分可计算',
    conflict: '权重无古籍依据，各家分值互不相同',
    absorb: '只借计分形式，权重须自定并公开',
    verdict: '登记',
  },
  {
    key: 'lianghua',
    name: '量化改良派',
    en: 'QUANT',
    era: '当代',
    source: '各软件与课程体系',
    category: '旺衰与量化',
    input: '生辰四柱',
    criterion: '加权求和、阈值分档、软件判语',
    output: '评分与分档结论',
    quant: '部分可计算',
    conflict: '阈值与权重不公开，无法复现',
    absorb: '可借「可回测」的工程形式，不借分值',
    verdict: '登记',
  },
  {
    key: 'shishen',
    name: '十神派',
    en: 'SHISHEN',
    era: '明清—当代',
    source: '子平诸书；当代课程',
    category: '旺衰与量化',
    input: '生辰四柱',
    criterion: '十神组合、透干、坐支、宫位',
    output: '社会关系与事象',
    quant: '部分可计算',
    conflict: '十神判吉凶与五行生克判吉凶常相反',
    absorb: '只作社会关系读数',
    verdict: '登记',
  },

  // ── 象法与盲派 ────────────────────────────────────────────
  {
    key: 'mangpai',
    name: '盲派',
    en: 'MANGPAI',
    era: '民间口传',
    source: '无定本，师承口诀',
    category: '象法与盲派',
    input: '生辰四柱',
    criterion: '主宾、象法、宫位、神煞、做功',
    output: '事象直断（婚、财、灾、寿）',
    quant: '不可验证',
    conflict: '与格局法互斥；同一盘常出相反断语',
    absorb: '象法语料可作表达层素材，不进判据',
    verdict: '不进判据',
  },
  {
    key: 'duanmang',
    name: '段建业盲派',
    en: 'DUAN',
    era: '当代',
    source: '段建业一系',
    category: '象法与盲派',
    input: '生辰四柱',
    criterion: '宾主、体用、象法、做功、理法',
    output: '六亲与事象',
    quant: '不可验证',
    conflict: '与子平格局、旺衰皆不同源',
    absorb: '体用二分、宾主语言',
    verdict: '登记',
  },
  {
    key: 'xiangfa',
    name: '象法派（现代）',
    en: 'IMAGE',
    era: '当代',
    source: '各家取象课程',
    category: '象法与盲派',
    input: '生辰四柱',
    criterion: '干支取象、类象类比',
    output: '生活化事象',
    quant: '不可验证',
    conflict: '取象无边界，任何结论都能自圆',
    absorb: '只作表达层比喻，不进判据',
    verdict: '不进判据',
  },

  // ── 近现代 ────────────────────────────────────────────────
  {
    key: 'mingao',
    name: '民国命理',
    en: 'REPUBLIC',
    era: '民国',
    source: '韦千里《千里命稿》、袁树珊',
    category: '近现代',
    input: '生辰四柱',
    criterion: '子平格局 + 命稿体例（先看格局再断事）',
    output: '命稿式全批',
    quant: '部分可计算',
    conflict: '体例统一，但断事仍依赖经验',
    absorb: '报告结构与行文体例',
    verdict: '可借接口',
  },
  {
    key: 'shao',
    name: '当代普及派',
    en: 'POPULAR',
    era: '1980s 后',
    source: '邵伟华一系及教材',
    category: '近现代',
    input: '生辰四柱',
    criterion: '简化子平：旺衰 + 十神 + 断语',
    output: '大众化结论',
    quant: '部分可计算',
    conflict: '简化后判据互相打架，常自相矛盾',
    absorb: '只借科普语言',
    verdict: '登记',
  },
];

export function schoolsByCategory(): Array<{ category: SchoolCategory; schools: School[] }> {
  return CATEGORIES.map((category) => ({
    category,
    schools: SCHOOLS.filter((s) => s.category === category),
  }));
}

export function schoolStats() {
  return {
    total: SCHOOLS.length,
    computable: SCHOOLS.filter((s) => s.quant === '可计算').length,
    partial: SCHOOLS.filter((s) => s.quant === '部分可计算').length,
    unverifiable: SCHOOLS.filter((s) => s.quant === '不可验证').length,
    absorbable: SCHOOLS.filter((s) => s.verdict === '可借接口').length,
  };
}

export { BOOKS, bookStats, type BookEntry, type BookStatus } from './books';
