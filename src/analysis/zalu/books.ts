/**
 * 大杂烩线 · 书目与原文（挂在门派后面，不单独成站）
 *
 * 每条只回答三件事：哪本书、哪一段、这段是不是我亲自读到的。
 * status: '已读原文' | '仅见目录' | '未见原文'
 * 未见原文的条目不引转述、不引二手，宁可空着。
 */
export type BookStatus = '已读原文' | '仅见目录' | '未见原文';

export interface BookEntry {
  school: string;
  book: string;
  author: string;
  version: string;
  quote: string;
  source: string;
  status: BookStatus;
  note?: string;
}

export const BOOKS: BookEntry[] = [
  {
    school: '李虚中三命', book: '《李虚中命书》三卷', author: '旧题唐·李虚中撰（四库馆臣判非一人手笔）',
    version: '四库全书本，自《永乐大典》辑出',
    quote: '「三元者，干禄、支命、纳音身，各分衰旺之地。」「干主名禄贵权…支主金珠积富…纳音主材能器识，为人伦亲属之宗。」',
    source: 'https://lfglib.cn/text/yilib/208452.html', status: '已读原文',
    note: '三卷全读；提要已判「不尽出虚中手」。',
  },
  {
    school: '古法宫位', book: '《渊海子平》卷一「论起胎法」「论起息法」', author: '宋·徐升编，明清汪竹亭、杨淙增校',
    version: '明刻本系统，识典古籍影印',
    quote: '「论起胎法：但从本生月前四位是也。」「论起息法：取日主上天干合处、地支合处是也。」',
    source: 'https://www.shidianguji.com/book/NGJ892411999032112149610', status: '已读原文',
    note: '胎元可查的早期算法之一。',
  },
  {
    school: '纳音派', book: '《三命通会》卷一「论纳音取象」「总论纳音」', author: '明·万民英',
    version: '四库全书十二卷本，标点取自维基文库',
    quote: '「以干为禄定贵贱，以支为命定修短，以纳音为身察盛衰。」「纳音与易纳甲同法，乾纳甲坤纳癸，始于乾而终于坤。」',
    source: 'https://mingge.org/canon/sanming/0', status: '已读原文',
    note: '纳音与禄、命并列为「三才」，不是野路子。',
  },
  {
    school: '神煞派', book: '《渊海子平》卷一「神煞诸篇」', author: '宋·徐升编',
    version: '同上识典古籍本',
    quote: '「甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎。」',
    source: 'https://www.shidianguji.com/book/NGJ892411999032112149610', status: '已读原文',
    note: '神煞在宋元命书里是成体系的歌诀。',
  },
  {
    school: '子平法', book: '《渊海子平》「论日为主」', author: '宋·徐升编',
    version: '同上',
    quote: '「宋时方有子平之说，取日干为主，以年为根，以月为苗，以日为花，以时为果，以生旺死绝休囚制化决人生休咎。」',
    source: 'https://www.shidianguji.com/book/NGJ892411999032112149610', status: '已读原文',
    note: '「日干为主」的出处。',
  },
  {
    school: '子平真诠', book: '《子平真诠》八「论用神」', author: '清·沈孝瞻',
    version: '民国刊本',
    quote: '「八字用神，专求月令，以日干配月令地支，而生克不同，格局分焉。」',
    source: 'https://www.diancangwang.cn/xuanxuewushu/03cf53eede8a', status: '已读原文',
  },
  {
    school: '滴天髓', book: '《滴天髓阐微》天道第二', author: '传京图撰，任铁樵注，袁树珊辑',
    version: '民国刊本',
    quote: '「欲识三元万法宗，先观帝载与神功。」任注：「干为天元，支为地元，支中所藏为人元。」',
    source: 'https://www.gushiwen.cn/guwen/bookv_b591655cd258.aspx', status: '已读原文',
    note: '此处「三元」是天地人，与李虚中三元同名异实。',
  },
  {
    school: '三命通会', book: '《三命通会》卷一「原造化之始」', author: '明·万民英',
    version: '四库全书十二卷本',
    quote: '「以人生年月日时所得干支立为四柱，以推一生吉凶，亦理之自然者也。」',
    source: 'https://mingge.org/canon/sanming/0', status: '已读原文',
  },
  {
    school: '星平会海', book: '《星平会海》卷之首', author: '题「武当山玉虚宫…霞阳水中龙编作」',
    version: '清增补本',
    quote: 'OCR 错讹严重，只能辨「夫星辰之入垣局，如仕宦之在朝堂上」等句，不可逐字引。',
    source: 'https://www.shidianguji.com/book/CADAL02055515', status: '仅见目录',
  },
  {
    school: '穷通宝鉴', book: '《穷通宝鉴》卷一「五行总论」', author: '清·余春台辑《栏江网》，民国徐乐吾增注',
    version: '民国《造化元钥评注》本',
    quote: '「五行者，本乎天地之间而不穷者也，故谓之行。」「故高者抑之使平，下者举之使崇…贵在折衷，归于中道。」',
    source: 'https://www.gushiwen.cn/guwen/bookv_e96f74b03cf3.aspx', status: '已读原文',
  },
  {
    school: '神峰通考', book: '《神峰通考》「病药说类」', author: '明·张楠（原名《命理正宗辟谬大全》）',
    version: '通行本',
    quote: '「有病方为贵，无伤不是奇；格中如去病，财禄两相随。」自述「屡以中和而究人之造化，十无一二有验…则尝八九而得」。',
    source: 'https://guoxue3000.com/books/428/chapters/9', status: '已读原文',
    note: '作者自己承认纯中和论十验一二。',
  },
  {
    school: '从格专旺', book: '《滴天髓》「从象」「化象」', author: '同滴天髓条',
    version: '同上',
    quote: '—',
    source: '—',
    status: '仅见目录',
    note: '只核到目录与通行转述，原文句子未逐字核对，不引。',
  },
  {
    school: '十神派', book: '《渊海子平》「十神」', author: '宋·徐升编',
    version: '同上',
    quote: '「克我者为正官偏官，生我者为正印偏印，我克者为正财偏财，我生者为伤官食神。」',
    source: 'https://www.shidianguji.com/book/NGJ892411999032112149610', status: '已读原文',
  },
  {
    school: '新派旺衰', book: '《八字泄天机》一系', author: '当代（李涵辰等）',
    version: '民间排印本',
    quote: '—', source: '—', status: '未见原文',
    note: '网上转述互相矛盾，不上。',
  },
  {
    school: '量化改良派', book: '新派后续量化尝试', author: '当代',
    version: '网文与软件文档',
    quote: '—', source: '—', status: '未见原文',
  },
  {
    school: '盲派', book: '盲派口诀（无定本）', author: '民间师承',
    version: '抄本/口传',
    quote: '—', source: '—', status: '未见原文',
  },
  {
    school: '段建业盲派', book: '段建业一系', author: '段建业',
    version: '公开出版物未核',
    quote: '—', source: '—', status: '未见原文',
  },
  {
    school: '现代象法派', book: '现代象法（象法/病药混杂）', author: '当代',
    version: '网文',
    quote: '—', source: '—', status: '未见原文',
  },
  {
    school: '民国命理', book: '韦千里《千里命稿》、袁树珊《命理探源》', author: '民国',
    version: '民国排印本（未见影印）',
    quote: '—', source: '—', status: '仅见目录',
  },
  {
    school: '当代普及派', book: '邵伟华《四柱预测学》', author: '当代',
    version: '1990 年代通行本',
    quote: '—', source: '—', status: '仅见目录',
  },
];

export const bookStats = () => ({
  total: BOOKS.length,
  read: BOOKS.filter((b) => b.status === '已读原文').length,
  toc: BOOKS.filter((b) => b.status === '仅见目录').length,
  none: BOOKS.filter((b) => b.status === '未见原文').length,
});
