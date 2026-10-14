// 天之易八字分析引擎
// 严格遵循：以月气为权，以阴阳平衡为吉凶，以动应为发生
// 文案补充资料：《自然易鉴》（丁甲福）原文，融合十干/地支/月令/四象/十神/人事/健康断法

import {
  type BaZiChart,
  type Pillar,
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  STEM_YINYANG,
  BRANCH_YINYANG,
  getShiShen,
  getLiuNianList,
  getCurrentDaYunIndex,
} from './baziCalculator';

import {
  SHI_ER_CHANG_SHENG,
  WU_HU_DUN_MONTH_STEM,
  NIAN_YUE_TAIJI_DEFS,
  NIAN_YUE_TAIJI_CASES,
  NIAN_TAIJI_RULES,
} from '../data/baziData';

// 四象与四季月令气机真机（《自然易鉴》第七章第二节）
export const FOUR_SYMBOL_META: Record<string, {
  symbol: '少阳' | '老阳' | '少阴' | '老阴';
  months: string;
  qiNature: string;
  coreXiJi: string;
  coreMantra: string;
}> = {
  少阳: {
    symbol: '少阳',
    months: '寅、卯、辰（春月）',
    qiNature: '春为少阳生发之气，木旺司权，余寒未消，整体气寒',
    coreXiJi: '春抓丙癸太极，丙火布温、癸水余寒共存，二气无伤则富贵双全；丙无伤则富、癸无伤则贵，寒则木滞无荣、贫贱多磨',
    coreMantra: '寅月初春：丙火成阳、戊土止寒；卯月仲春：以成温为准，见水即体阴用阳、金落实年支则破格；辰月暮春：救癸水为贵，甲木克土救水、庚金泄土生水，忌戊土无制',
  },
  老阳: {
    symbol: '老阳',
    months: '巳、午、未（夏月）',
    qiNature: '夏为老阳鼎盛之气，火旺司权，燥热当令，整体气燥',
    coreXiJi: '夏抓丁壬太极，首用庚金：巳长生、午沐浴、未冠带，孤金成富、凉土晦火、通水发贵；巳未月水木须齐见、孤见皆败；午月慎用壬癸——丑戌晦火得富亦克水失贵，有庚辛金通关则无虑；忌火土熔金',
    coreMantra: '巳月、未月：庚金第一，水木齐见为辅（孤水被土克、孤木生火皆败）；午月：庚金首用，丑戌晦火得富而克水失贵，慎用壬癸，有庚辛金通关则无虑，土克水明确时取木（水生木、木克土）救水；三月皆忌火土熔金',
  },
  少阴: {
    symbol: '少阴',
    months: '申、酉、戌（秋月）',
    qiNature: '秋为少阴收敛之气，金旺司权，肃杀偏重，整体气凉',
    coreXiJi: '秋抓丁壬太极，申酉分两局：余热局（火土旺）用水木克土、金泄土，忌木火克金；成凉局（金气得布）用木火扶阳炼金。戌月甲木第一、丙丁火辅，土性双面——制水取贵、晦火失富',
    coreMantra: '申酉月：辨余热与成凉，土得火烘为余热（水木克土），土凉金强为成凉（木火助阳）；戌月：甲木克土解晦为第一用神，有甲贵之说，忌独旺土晦火、无制金凉',
  },
  老阴: {
    symbol: '老阴',
    months: '亥、子、丑（冬月）',
    qiNature: '冬为老阴极盛之气，水旺司权，寒凉彻骨，整体气寒',
    coreXiJi: '冬抓戊丙（己）太极，止寒为根本：亥、子用阳土（辰、未）克水制寒，丑用己土本气止寒（取贵之根）；丙丁火生土助阳，子月木须生火（木火土相生）方为用，忌庚辛金助水、子月壬癸水无制、丑月辛金泄土生水',
    coreMantra: '亥月：土止寒第一、甲木泄水次之；子月：辰未阳土第一、丙丁火生土第二，庚辛金、壬癸水皆忌，木唯生火（木火土相生）方可用，水生木而木克土不吉；丑月：己土止寒为贵气之根，丙火暖局、甲木生火，忌辛金透干泄土生水',
  },
};

const FOUR_SYMBOL_BY_MBI = ['少阳', '少阳', '少阳', '老阳', '老阳', '老阳', '少阴', '少阴', '少阴', '老阴', '老阴', '老阴'] as const;

// 十二月气信息
const MONTH_QI_INFO: Record<number, {
  monthName: string;
  solarTerm: string;
  mainQi: string;
  mainQiElement: string;
  usageDirection: 'yang' | 'yin';
  yangState: 'strong' | 'weak';
  yinState: 'strong' | 'weak';
  fourSymbol: '少阳' | '老阳' | '少阴' | '老阴';
  description: string;
  detailedDesc: string;
  coreXiJi: string;
}> = {
  0: { // 寅月
    monthName: '寅月',
    solarTerm: '立春',
    mainQi: '甲木',
    mainQiElement: 'wood',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '少阳',
    description: '初春寒气尚存、阳气初动，气机生发偏弱，最喜火暖局暖化寒湿，辅土固本，忌金水泛滥加重寒气',
    detailedDesc: '寅月为正月，立春之后，木气当权，少阳初始阶段。此时冬寒未尽，阳气初布，地球尚未温暖。木主温，为少阳初始阶段。寒气（金水）仍强，寒气未消，故需要用阳气（火土）来平衡。戊土止寒，丙火成阳，为寅月核心用神方向。《自然易鉴》：寒木喜暖，以火为尊，暖则生发有成、格局清贵，寒则木滞无荣、贫贱多磨。',
    coreXiJi: '用神：丙火（成阳）、戊土（止寒）。忌神：金水（加重寒气）。辅神：丁火暖化、木助生发',
  },
  1: { // 卯月
    monthName: '卯月',
    solarTerm: '惊蛰',
    mainQi: '乙木',
    mainQiElement: 'wood',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '少阳',
    description: '木气纯粹、气机舒展，以成温为标准；喜火助生发，见水余寒则体阴用阳，金落实年支则不成温，忌温气被金水否定',
    detailedDesc: '卯月为二月，惊蛰之后，温气已成。乙木当令，少阳气成，甲木帝旺持续布温；然癸水在卯长生，余寒尚存，温气落实亦易受否定。年月不否定乙木温气即为成温：一般见水即作体阴用阳论；见金须看是否落实于年支，落实则不以成温论，未落实之金仅为辅用。核心仍在丙癸太极，其余干支皆为扶抑丙癸的辅助。',
    coreXiJi: '用神：丁火（泄木成阳）、丙火（暖局）。忌神：水（余寒否定温气，见水即体阴用阳）、金落实年支（不成温）。辅神：未落实之金修整成材',
  },
  2: { // 辰月
    monthName: '辰月',
    solarTerm: '清明',
    mainQi: '戊土',
    mainQiElement: 'earth',
    usageDirection: 'yin',
    yangState: 'strong',
    yinState: 'weak',
    fourSymbol: '少阳',
    description: '暮春戊土当令、温湿交接，辰为湿土藏癸，气机模糊（辰戌无贵），核心在救癸水、存阴气；喜甲木克土救水、庚金泄土生水，忌戊土无制',
    detailedDesc: '辰月为三月，清明之后，戊土当令、气进五阳，温而不热、润而不寒，阴阳不显、气机呆滞。辰中戊土克癸水，癸水为唯一贵气来源，无需常规体用判断：①甲木克土救水为第一救应，木须得水润，木旺无润则生火助土、徒劳无功；②庚金泄土生水，辛金无力。戊土无制则晦火克水、阴阳俱伤、无富无贵；癸水有气则局活、富贵可成。辰中戊癸自合主暗昧，辰戌相见主情感婚姻破败，多由后天环境导致，不影响富贵格局。',
    coreXiJi: '用神：癸水（唯一贵气来源）、甲木（第一救应，克土救水）、庚金（泄土生水，辛金无力）。忌神：戊土无制（晦火克水、阴阳俱伤）。注：木须得水润方有效',
  },
  3: { // 巳月
    monthName: '巳月',
    solarTerm: '立夏',
    mainQi: '丙火',
    mainQiElement: 'fire',
    usageDirection: 'yin',
    yangState: 'strong',
    yinState: 'weak',
    fourSymbol: '老阳',
    description: '初夏六阳纯阳、阳气大显，庚金长生为月令最有力之阴，首用庚金凉土晦火、生水存阴；水木须齐见、孤见皆败，忌火土过旺熔金',
    detailedDesc: '巳月为四月，立夏之后，丙火当权，气进六阳。壬绝癸胎、水形同虚设，戊土虎踞、滴水立涸，执"用水制火"之常理反入歧途。首用庚金：庚金长生在巳，为月令规定下最有力的平衡因子，凉土晦火、生水存阴，富贵相依；唯丙丁透干而金无救应，则金熔火海，富亦艰辛。水木救阴须齐见：孤水被旺土所克、孤木生火助纣；戌丑二土为阴土，晦火存金，反成富基。',
    coreXiJi: '用神：庚金（第一用神，凉土晦火、生水存阴）。辅用：水木齐见、戌丑阴土晦火。忌神：火土过旺、丙丁熔金、孤水孤木',
  },
  4: { // 午月
    monthName: '午月',
    solarTerm: '芒种',
    mainQi: '丁火',
    mainQiElement: 'fire',
    usageDirection: 'yin',
    yangState: 'strong',
    yinState: 'weak',
    fourSymbol: '老阳',
    description: '盛夏阳极、丁己成热，庚金首用；丑戌二土晦火有吉，然土晦火得富亦克水失贵，故慎用壬癸，有庚辛金通关则无虑；土克水明确时取木（水生木、木克土）救水',
    detailedDesc: '午月为五月，芒种之后，丁火当权，火炎土燥、万物焦灼，阴气弱极。①庚金为第一用神：庚金沐浴有气，为午中唯一能立足之阴，干透庚或支会申酉，平衡火势、稳财源、通水发贵，孤金成富；丙丁透干而庚无依，则烈火熔金反成凶象。②丑戌二土晦火有吉：阴土晦火存金可致富贵，然土晦火得富的同时克水，水伤则失贵，故壬癸水须慎用。③若柱有庚辛金，土生金、金生水接续通关，则水不足为虑。④土克水态势明确时，可取木为救：水来生木、木去克土，解土克水之困。无金水平衡则火炎土燥、躁妄无德。',
    coreXiJi: '用神：庚金（首用，孤金成富、通水发贵）、丑戌阴土（晦火存金得富）。慎用：壬癸水（土克水则失贵，有庚辛金通关则无虑）。救应：土克水明确时取木（水生木、木克土）。忌神：烈火熔金、火土焦枯',
  },
  5: { // 未月
    monthName: '未月',
    solarTerm: '小暑',
    mainQi: '己土',
    mainQiElement: 'earth',
    usageDirection: 'yin',
    yangState: 'strong',
    yinState: 'weak',
    fourSymbol: '老阳',
    description: '暮夏火土成党、地表极热、二阴进气，庚金冠带有气，首用庚金泄火生水，水木须齐见，阴土晦火可为富基但土过伤水，忌火土燥热熔金',
    detailedDesc: '未月为六月，小暑之后，己土当令，地表储热至盛，然阳极生阴、二阴进气、热极藏寒。取用与巳午月同理：首推庚金，冠带有气，泄火、平衡旺土、生水润燥，申酉金助力更佳，唯丁火透干无制则熔金败局；水木须齐见，孤水被土克、孤木生火，壬癸养墓气弱须庚金引水；丑戌阴土晦火藏金可成富基，然土太过则金埋水涸、富而不久。',
    coreXiJi: '用神：庚金（第一用神，泄火、平衡土、生水润燥）。辅用：水木齐见、丑戌阴土晦火（土过伤水、富不久）。忌神：火土燥热、丁火熔金',
  },
  6: { // 申月
    monthName: '申月',
    solarTerm: '立秋',
    mainQi: '庚金',
    mainQiElement: 'metal',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '少阴',
    description: '初秋三阴生长、阴阳交错，丁壬太极定局：地热犹存为余热之申，金气得布为成凉之申，两局取用相反，以土是否得火烘热为辨',
    detailedDesc: '申月为七月，立秋之后，庚金临官当令、壬水长生，然丁火沐浴、土受金泄，余热未散尽。金为少阴初始，主凉主降。申月最复杂，须分两局：①余热之申（阳体阴用）：火土旺、金难舒展，见土埋金、忌木火克金，宜水木克土、动金泄土；②成凉之申（阴体阳用）：无火有水、金气得布，宜木火助阳制衡金凉。土性双面：制水取贵、晦火失富。',
    coreXiJi: '余热之申：用水木克土、金泄土，忌木火克金、土旺埋金；成凉之申：用木火扶阳炼金，忌金水再旺。土双面（制水取贵、晦火失富）',
  },
  7: { // 酉月
    monthName: '酉月',
    solarTerm: '白露',
    mainQi: '辛金',
    mainQiElement: 'metal',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '少阴',
    description: '仲秋四阴生长、金气专旺成凉，丁壬太极定局：丁己长生、地热犹存为余热之酉，无火见水为成凉之酉，两局取用相反，以土是否得火烘热为辨',
    detailedDesc: '酉月为八月，白露之后，辛金当权，金气专旺、成凉定型，然丁己在酉长生，地表余温尚存，未至极寒。须分两局：①余热之酉：火土旺、金气受制，见土埋金、忌木火克金，宜水木克土、动金泄土；②成凉之酉：金气得布、土凉无热，宜火克金、木生火助阳。土性双面：制水取贵、晦火失富。',
    coreXiJi: '余热之酉：用水木克土、金泄土，忌木火克金、土旺埋金；成凉之酉：用木火扶阳炼金，忌金水再旺。土双面（制水取贵、晦火失富）',
  },
  8: { // 戌月
    monthName: '戌月',
    solarTerm: '寒露',
    mainQi: '戊土',
    mainQiElement: 'earth',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '少阴',
    description: '暮秋五阴成局、阳气最弱，首用甲木克土解晦、助火破阴，丙丁火扶阳救丁，忌独旺土晦火、无制金凉、无制水寒',
    detailedDesc: '戌月为九月，寒露之后，戊土当令、气进五阴，火余之热、金气之伏，主体成凉、体阴用阳，破阴显阳为核心。第一用神甲木：克旺土、解火晦、制凉金，有"甲贵"之说；丙丁火扶阳救丁为辅。土忌独旺，旺土晦火则阴阳俱伤；辛金冠带无制，金泄土凉、层次愈低；壬水有当令土制方贵（壬戌为玄武贵）。',
    coreXiJi: '用神：甲木（第一用神，克土解晦、破阴显阳）、丙丁火（扶阳救丁）。忌神：独旺土晦火、无制金、无制水。注：水有制则贵显（壬戌玄武贵）',
  },
  9: { // 亥月
    monthName: '亥月',
    solarTerm: '立冬',
    mainQi: '壬水',
    mainQiElement: 'water',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '老阴',
    description: '初冬六阴阴极、壬水当令，首用阳土（辰未）克水制寒为贵气之源，次用甲木泄水（甲优于乙），火暖土为辅助，忌木水乱动、金助寒',
    detailedDesc: '亥月为十月，立冬之后，壬水临官当权，寒气极盛；亥中藏甲、甲木长生，寒中藏温，俗称"小阳春"。用土克水为贵气之源，阳土（辰、未）尤佳，土得火生则富贵双全，土无力则仅安稳、不显贵。次用甲木泄水，甲木生气耐寒，优于乙木；火为辅助，暖土助阳、破除阴寒。动木见水多贫困，无火仅有戊土则衣食无忧、无大富贵。',
    coreXiJi: '用神：戊土/辰未土（第一，克水制寒、贵气之源）、甲木（次用，泄水生温）。辅用：丙火（暖土助阳）。忌神：金（助水增寒）、木水乱动',
  },
  10: { // 子月
    monthName: '子月',
    solarTerm: '大雪',
    mainQi: '癸水',
    mainQiElement: 'water',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '老阴',
    description: '深冬寒气最盛、癸水成寒、一阳来复，首用土止寒制水（辰未阳土最好），次用丙丁火肯定土气，庚辛金、壬癸水皆忌；木须生火（木→火→土）方可用，水去生木、木转克土则不吉',
    detailedDesc: '子月为十一月，大雪之后，癸水临官、壬水帝旺，寒气彻骨、万物蛰伏，整体体阴用阳。①首用土止寒：土制水隔寒、稳住格局，阳土辰未最为可贵，土弱无力则水横流局势乱。②次用丙丁火：火之要在肯定土、生扶土气，使土有力止寒，丙火太阳亦可解冰封；丁火绝地力薄，火土同见以土卫火为佳。③庚辛金、壬癸水皆为忌神：金助水增寒，水旺无制则冰封格局、奔波劳碌。④木须视去向取用：木去生火（肯定火，成木→火→土相生）方可为用；若水去生木、木转而克土（水肯定木则木克土），破坏止寒之土，则为不吉。《穷通宝鉴》"专用丙火解冻"为旧法，本体系以土止寒为根本、火生土为助。',
    coreXiJi: '用神：辰未阳土（第一，止寒制水）、丙丁火（次用，生扶土气、解冻）。辅用：木（唯生火成木火土相生时可用）。忌神：庚辛金（助水增寒）、壬癸水（寒水无制）。注：水生木而木克土不吉',
  },
  11: { // 丑月
    monthName: '丑月',
    solarTerm: '小寒',
    mainQi: '己土',
    mainQiElement: 'earth',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '老阴',
    description: '暮冬湿寒极重、二阳并进，己土当令克癸止寒为取贵根本，丙火助阳暖局，甲木冠带可生火，忌辛金泄土生水、寒湿不化',
    detailedDesc: '丑月为十二月，小寒之后至立春前夕，己土当令、气进二阳，寒中藏生。己土担负克水止寒大任，丑中藏己癸本身具克制结构，己土动则贵气生，为止寒要素、取贵之根。丙火暖局助阳，甲木冠带有气、动木生火，木火齐动则富贵双全。丑中辛金为变数：辛金泄土生水，再透金干则土虚水旺、反不为贵。《穷通宝鉴》"专用丙火解冻、戊透清贵"为旧法，本体系以己土止寒为本、丙火为助。',
    coreXiJi: '用神：己土（第一，本气止寒、取贵之根）、丙火（助阳暖局）。辅用：甲木（冠带生火）。忌神：辛金（泄土生水助寒）、寒湿不化',
  },
};

// 五行与阴阳归属
// 木火属阳（温→热），金属阴（凉→寒）
// 阳气 = 木火 + 燥土（戊、未、戌），阴气 = 金水 + 湿土（己、丑、辰）
// 土不再作为中性第三元（文献：戊=阳土、己=阴土；未戌燥土=阳、丑辰湿土=阴，燥湿对应寒热）
const YANG_ELEMENTS = new Set(['wood', 'fire']);
const YIN_ELEMENTS = new Set(['metal', 'water']);

// 土的阴阳归属（燥湿对应寒热）
const EARTH_YANG_GANZHI = new Set(['戊', '未', '戌']); // 阳土/燥土
const EARTH_YIN_GANZHI = new Set(['己', '丑', '辰']); // 阴土/湿土

// 土的喜用判断（按月令季节 + 干支级 + 命局水气/阴阳占比）
//   冬月(亥子丑)：走土吉，四土皆可止寒制水（辰未首选、丑戌次之、戊己皆可用）
//   夏月(巳午未)：丑戌吉（阴土晦火存金）；辰未「地支见水则凶、无水次选」（辰克水毁火、未燥晦火）
//   春月(寅卯)：土止寒固本；但阴气不显（阴气占比 < 30%，参照「寒热·阴阳占比」模块）时勿土克水 → 忌
//   辰月：辰土晦火克水需制 → 忌；秋月(申酉)：忌土旺（土旺晦火、失富）；戌月：独旺土 → 忌
const YIN_NOT_APPARENT_THRESHOLD = 30; // 阴气占比低于此值视为「不显」（可调）
export function judgeEarthXiJi(
  ganzhi: string,
  chart: BaZiChart,
  yinYangPct?: { yang: number; yin: number },
): 'useful' | 'taboo' | 'neutral' {
  const monthBranchIndex = chart.monthBranchIndex;
  const branches = [chart.year.branch, chart.month.branch, chart.day.branch, chart.hour.branch];
  // 地支见水：命局四支中出现水支（亥 / 子）
  const branchSeesWater = branches.some((b) => BRANCH_ELEMENTS[b] === 'water');
  // 阴气显不显：结合「寒热·阴阳占比」模块，阴气占比不足三成视为「不显」
  const yy = yinYangPct ?? calculateYinYangBalance(chart);
  const yinNotApparent = yy.yin < YIN_NOT_APPARENT_THRESHOLD;

  // 冬月（亥子丑）：走土吉（止寒制水）
  if ([9, 10, 11].includes(monthBranchIndex)) return 'useful';
  // 夏月（巳午未）：丑戌吉；辰未见水则凶、无水次选
  if ([3, 4, 5].includes(monthBranchIndex)) {
    if (ganzhi === '丑' || ganzhi === '戌') return 'useful';
    if (ganzhi === '辰' || ganzhi === '未') return branchSeesWater ? 'taboo' : 'useful';
    return 'useful'; // 戊己（夏月有吉有凶，缺十神语境时默认按可用）
  }
  // 春月（寅卯）：土止寒固本；阴气不显则勿土克水（过克已弱之水气）
  if ([0, 1].includes(monthBranchIndex)) return yinNotApparent ? 'taboo' : 'useful';
  // 辰月：辰土晦火克水需制 → 忌
  if (monthBranchIndex === 2) return 'taboo';
  // 秋月（申酉）：忌土旺（土旺晦火、失富）
  if ([6, 7].includes(monthBranchIndex)) return 'taboo';
  // 戌月：独旺土 → 忌
  if (monthBranchIndex === 8) return 'taboo';
  return 'neutral';
}

export interface MonthQiResult {
  monthName: string;
  solarTerm: string;
  mainQi: string;
  mainQiElement: string;
  usageDirection: 'yang' | 'yin';
  yangState: 'strong' | 'weak';
  yinState: 'strong' | 'weak';
  fourSymbol: '少阳' | '老阳' | '少阴' | '老阴';
  description: string;
  detailedDesc: string;
  coreXiJi: string;
  coreMantra?: string;
}

export function analyzeMonthQi(monthBranchIndex: number): MonthQiResult {
  const raw = MONTH_QI_INFO[monthBranchIndex];
  const fourSymbol = FOUR_SYMBOL_BY_MBI[monthBranchIndex];
  const meta = FOUR_SYMBOL_META[fourSymbol];
  return {
    ...raw,
    fourSymbol: raw.fourSymbol,
    coreXiJi: `${raw.coreXiJi}。四时核心口诀：${meta.coreXiJi}（${meta.months}）`,
    coreMantra: meta.coreMantra,
  };
}

// 用神忌神判断
// 阳气旺→用阴气（金水）平衡；阴气旺→用阳气（火土）平衡
export type XiJiMark = 'useful' | 'taboo' | 'neutral';

// 月令对元素级二分规则的「无条件」覆盖（干支同效）。
// 只录入《十二月份取用》中不依赖柱中组合即成立的定论；
// 须视落实态势的条件取舍（午月木救水、卯月金、申酉余热局等）仍由月气文案承载，待条件模型实现。
const MONTH_ELEMENT_XIJI_OVERRIDES: Record<string, Partial<Record<string, XiJiMark>>> = {
  // 午月壬癸水「慎用」：丑戌晦火得富的同时克水、水伤失贵，须庚辛金通关方无虑——非一概为用
  午: { water: 'neutral' },
};

// 月令天干粒度覆盖（只及指定天干，不扩及同五行他干与地支藏干）
const MONTH_STEM_XIJI_OVERRIDES: Record<string, Record<string, XiJiMark>> = {
  // 辰月体阴用阳、首在救癸水：甲木疏土救水为第一救应（乙木力弱不预，仍按忌论）
  辰: { 甲: 'useful' },
};

export interface YongJiResult {
  usefulElements: string[];
  tabooElements: string[];
  stemMarks: Record<string, XiJiMark>;
  branchMarks: Record<string, XiJiMark>;
  // 本月令下全部十天干 / 十二地支的干支级判定（含覆盖与土独立判定），供藏干标记与逐字喜忌表调取
  allStemMarks: Record<string, XiJiMark>;
  allBranchMarks: Record<string, XiJiMark>;
  // 干支级取用例外说明（仅覆盖生效的月令有内容），供 UI 展示与报告引用
  overrideNotes: string[];
  description: string;
}

export function analyzeYongJi(chart: BaZiChart, monthQi: MonthQiResult): YongJiResult {
  let usefulElements: string[] = [];
  let tabooElements: string[] = [];

  // 木火金水的元素级用忌（木火属阳、金水属阴）；土单独走干支级 judgeEarthXiJi（不再把土整类归为用神/忌神/中性）
  if (monthQi.usageDirection === 'yin') {
    usefulElements = ['metal', 'water'];
    tabooElements = ['wood', 'fire'];
  } else {
    usefulElements = ['fire', 'wood'];
    tabooElements = ['metal', 'water'];
  }

  const stemMarks: Record<string, 'useful' | 'taboo' | 'neutral'> = {};
  const branchMarks: Record<string, 'useful' | 'taboo' | 'neutral'> = {};

  const pillars: Pillar[] = [chart.year, chart.month, chart.day, chart.hour];
  const pillarNames = ['年', '月', '日', '时'];

  const markElement = (el: string, ganzhi: string, isStem: boolean): XiJiMark => {
    // ① 天干粒度覆盖优先（辰月甲木）
    if (isStem) {
      const stemOverride = MONTH_STEM_XIJI_OVERRIDES[chart.month.branch]?.[ganzhi];
      if (stemOverride) return stemOverride;
    }
    // ② 土独立判定
    if (el === 'earth') return judgeEarthXiJi(ganzhi, chart);
    // ③ 元素级月令覆盖（午月水慎用）
    const elOverride = MONTH_ELEMENT_XIJI_OVERRIDES[chart.month.branch]?.[el];
    if (elOverride) return elOverride;
    // ④ 月令大方向二分
    if (usefulElements.includes(el)) return 'useful';
    if (tabooElements.includes(el)) return 'taboo';
    return 'neutral';
  };

  // 干支级标记唯一来源：月令逐字资料库 ZHUZI_XIJI_REF（喜=用/忌=忌/待定=中）；
  // markElement 四级判定仅作资料库缺字时的兜底
  pillars.forEach((pillar, idx) => {
    const key = `${pillarNames[idx]}干`;
    stemMarks[key] = monthCharMark(chart.month.branch, pillar.stem, true, markElement(pillar.stemElement, pillar.stem, true));

    const bKey = `${pillarNames[idx]}支`;
    branchMarks[bKey] = monthCharMark(chart.month.branch, pillar.branch, false, markElement(pillar.branchElement, pillar.branch, false));
  });

  // 全部十天干 / 十二地支在本月令下的干支级判定（四柱 marks、藏干、大运流年打分同源）
  const allStemMarks: Record<string, XiJiMark> = {};
  STEMS_ORDER.forEach((s) => { allStemMarks[s] = monthCharMark(chart.month.branch, s, true, markElement(STEM_ELEMENTS[s], s, true)); });
  const allBranchMarks: Record<string, XiJiMark> = {};
  BRANCHES_ORDER.forEach((b) => { allBranchMarks[b] = monthCharMark(chart.month.branch, b, false, markElement(BRANCH_ELEMENTS[b], b, false)); });

  // 覆盖生效时的干支级取用例外说明
  const overrideNotes: string[] = [];
  if (chart.month.branch === '辰') {
    overrideNotes.push('辰月用阴大方向下，甲木疏土救癸水为第一救应，见甲不作忌神论（乙木力弱不预）；癸水为正官，忌土重埋光。');
  }
  if (chart.month.branch === '午') {
    overrideNotes.push('午月以庚金为首用；壬癸水慎用——丑戌晦火得富亦克水失贵，须庚辛金通关方无虑，土克水态势明确时反取木（水生木、木克土）救水。');
  }
  if (chart.month.branch === '巳') {
    overrideNotes.push('巳月以庚金为首用；水木须齐见——孤水被旺土所克、孤木生火助土皆败，壬癸水、甲乙木单见不作确定用神论，逐字标「？」者即此条件取舍。');
  }
  if (chart.month.branch === '未') {
    overrideNotes.push('未月取用同巳午：庚金首用；壬癸水须庚金引水藏根、水木齐见方用，孤见皆败；丑戌阴土晦火藏金可成富基，土过则伤水。');
  }
  if (chart.month.branch === '申') {
    overrideNotes.push('申月须先定局：余热局（火土旺）用水木克土、金泄土，忌木火克金、土旺埋金；成凉局（金气得布）用木火扶阳炼金，忌金水再旺。两局取用相反，定局之前逐字一律待定（显示问号），引擎按中性不增减分。');
  }
  if (chart.month.branch === '酉') {
    overrideNotes.push('酉月多数按成凉论（用木火、忌金水）；若土得火烘成余热局则喜忌反转。土性双面（制水取贵、晦火失富）独立判定，逐字标「？」者须视柱中态势。');
  }

  const direction = monthQi.usageDirection === 'yin' ? '阴气（金水）' : '阳气（火土）';
  const fsMeta = FOUR_SYMBOL_META[monthQi.fourSymbol];
  const description = `${monthQi.fourSymbol}${fsMeta.qiNature}。月气${monthQi.yangState === 'strong' ? '阳气盛旺' : '阴气强盛'}，以${direction}为用神，平衡阴阳。四时气机真机：${fsMeta.coreXiJi}。助用神则得吉，助忌神则得凶；制用神则得凶，制忌神则得吉（制忌得喜）。`;

  return {
    usefulElements,
    tabooElements,
    stemMarks,
    branchMarks,
    allStemMarks,
    allBranchMarks,
    overrideNotes,
    description,
  };
}

// ============================================================
// 年月太极分析（《太极阴阳法·年月分析核心基础》）
// 核心定论：年为命局根本，年月组合构成命局核心太极，日时为根本太极的动态应验环节；
//           吉凶唯一依据为阴阳二气的存缺、损伤、平衡状态；十神不参与富贵贫贱判断。
// 判定流程：五虎遁搭年月框架 → 年干定位（先天年吉）→ 年支三类作用 → 两仪气机厚薄（十二长生量化）
//           → 年月太极三态（完整/受损/绝境）→ 日时动态应验（维护/破坏）
// ============================================================
export interface NianYueYiGong {
  stem: string;   // 仪的核心天干
  state: '彰显' | '暗藏' | '不见';
  power: number;  // 0~100 气机力量分
  changSheng: string; // 该天干落月令的十二长生状态
  desc: string;
  // 结构化输出：明确结论 + 论据要点（供 UI 四小模块清晰呈现）
  role: string;   // 该仪象征（如「阳仪 · 富气」「阴仪 · 贵气」）
  verdict: string; // 单句定论（气机厚薄/受救/须补）
  factors: string[]; // 论据要点：透藏、十二长生、受克
}

export interface NianYueTaiJiResult {
  // —— 年月框架 ——
  yearGZ: string;
  monthGZ: string;
  wuHuDunValid: boolean;
  wuHuDunDesc: string;
  yearStemChangSheng: string;       // 年干落月令的十二长生状态
  // —— 年干先天吉凶 ——
  yearStemJiXiong: '先天年吉' | '先天年平' | '先天年忌';
  yearStemReason: string;
  yearStemFactors: string[]; // 年干定位论据要点
  // —— 年支三类作用 ——
  yearBranchAction: '落实兑现' | '阻碍否定' | '制衡借利' | '中平';
  yearBranchReason: string;
  yearBranchFactors: string[]; // 年支作用论据要点
  // —— 月令两仪 ——
  taijiName: string;
  taijiNote: string;
  yangYi: NianYueYiGong;
  yinYi: NianYueYiGong;
  // —— 年月太极三态 ——
  state: '两仪完整' | '两仪受损' | '两仪绝境';
  stateDesc: string;
  // —— 日时动态应验 ——
  riShiEffect: '维护' | '破坏' | '中平';
  riShiReason: string;
  riShiItems: { char: string; pillar: string; effect: '维护' | '破坏' | '中平'; why: string }[]; // 逐字作用明细
  riShiYiNian: boolean; // 宜年：日时干支对年干起吉作用（生扶所需或克制伤年因素）
  // —— 综合结论 ——
  verdict: string;
  evidence: string[];
  matchedCase: { title: string; analysis: string } | null;
}

const STEMS_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ============================================================
// 干支逐字喜忌参考（调取自 reference/docs/十二月份取用.md 逐字定论）
// xi=喜用 / ji=忌 / dai=待定（取用须视柱中态势、组合或格局两局而定，参考资料无无条件定论）
// 与四柱总览的「月令大方向」互补：大方向定元素二分，逐字表定每个字的详细取舍。
// ============================================================
export type ZhuZiMark = 'xi' | 'ji' | 'dai';
export interface ZhuZiEntry {
  char: string;
  element: string;
  mark: ZhuZiMark;
  note: string;
}
export interface ZhuZiXiJiResult {
  monthBranch: string;
  directionLabel: string;   // 月令大方向（与四柱总览一致）
  patternNote: string;      // 本月取用总纲（含两局等特殊口径）
  stems: ZhuZiEntry[];      // 十天干逐字
  branches: ZhuZiEntry[];   // 十二地支逐字
  source: string;
}

type ZhuZiRefRow = [ZhuZiMark, string];
interface ZhuZiMonthRef {
  patternNote: string;
  stems: Record<string, ZhuZiRefRow>;
  branches: Record<string, ZhuZiRefRow>;
}

const ZHUZI_XIJI_REF: Record<string, ZhuZiMonthRef> = {
  寅: {
    patternNote: '寅月余寒与布温太极：阳仪甲丙布温，阴仪癸水余寒。取用以护温气、不被金水阴气否定为要；丙癸对比即见吉凶，丙为富基、癸为贵基，两不伤则富贵双全。',
    stems: {
      甲: ['xi', '阳仪：甲木布温、少阳生发，去平衡冬天余寒'],
      乙: ['xi', '木之成气在寅帝旺，同甲助布温'],
      丙: ['xi', '阳仪核心、富之基础；长生之气布温渐强'],
      丁: ['xi', '同气丙火扶阳仪（丁在寅为死地，力薄）'],
      戊: ['xi', '按大方向补：寅丑同为止寒，戊土长生，丙火之温落实于土；唯寅木旺而克土，力有折扣'],
      己: ['dai', '土双面：己在寅为死地，止寒力弱，木克土重，须视柱中火气'],
      庚: ['ji', '金克木，否定阳仪温气（庚在寅为绝地）'],
      辛: ['ji', '同庚（辛在寅为胎地，力薄）'],
      壬: ['ji', '水助余寒、熄灭丙火温气（壬在寅为病地）'],
      癸: ['ji', '余寒成气，阴仪不可再增（癸沐浴）'],
    },
    branches: {
      寅: ['xi', '阳仪之地，藏甲丙戊，气进三阳'],
      卯: ['xi', '木之成气，助布温'],
      辰: ['dai', '湿土晦火蓄水，须视态势'],
      巳: ['xi', '火之温助阳仪（巳藏庚，防带凉气）'],
      午: ['xi', '火气炽助布温'],
      未: ['dai', '燥土藏火亦藏水，取舍未定'],
      申: ['ji', '金凉否定温气'],
      酉: ['ji', '金旺克木'],
      戌: ['dai', '土双面：燥土晦初生之火，亦藏丁火，助损随势'],
      亥: ['ji', '水寒助余寒'],
      子: ['ji', '余寒成气，否定温气'],
      丑: ['xi', '按大方向补：寅丑同为艮卦止寒，丑土接续冬末止寒之功；唯藏癸水余寒'],
    },
  },
  卯: {
    patternNote: '卯月四阳之气成温，癸水余寒长生尚存；一般以成温为标准：年月不否定乙木温气即为成温，见水即体阴用阳，见金须看是否落实年支。',
    stems: {
      甲: ['xi', '帝旺持续布温，成温之标准'],
      乙: ['xi', '卯之本气，温气已落实'],
      丙: ['xi', '沐浴有气，布温之力渐强'],
      丁: ['xi', '同气丙火（丁在卯为病地，力薄）'],
      戊: ['dai', '春月之土须视阴气显否'],
      己: ['dai', '同戊'],
      庚: ['dai', '见金看是否落实年支：落实则不以成温论'],
      辛: ['dai', '同庚（辛在卯为绝地，力薄）'],
      壬: ['ji', '水生木而克木之阳气，否定温气'],
      癸: ['ji', '余寒长生有气，不可再增'],
    },
    branches: {
      寅: ['xi', '木之地助成温'],
      卯: ['xi', '温气落实之本气'],
      辰: ['dai', '湿土晦火'],
      巳: ['xi', '火助温'],
      午: ['xi', '火气助阳'],
      未: ['dai', '燥土，势未定'],
      申: ['dai', '金落实与否定成温与否'],
      酉: ['dai', '同申（辛绝力薄）'],
      戌: ['dai', '燥土晦火'],
      亥: ['ji', '水寒否定温气'],
      子: ['ji', '水沐浴之地，否定成温'],
      丑: ['dai', '湿土蓄水'],
    },
  },
  辰: {
    patternNote: '辰月温重阴阳不明，富贵关键在救癸水令水有气：甲木疏土救水为第一救应，庚金泄土生水次之；忌戊土无制晦火克水、阴阳全伤。',
    stems: {
      甲: ['xi', '第一救应：甲木穿土救水（乙木力弱不预，以忌论）'],
      乙: ['ji', '成气而力弱难救水，仍以忌论'],
      丙: ['ji', '按大方向补：火生土助克水；须水气充足，火暖方得既济'],
      丁: ['ji', '按大方向补：同丙，衰地助土'],
      戊: ['ji', '当令晦火克水，透而无制则阴阳全伤'],
      己: ['ji', '同气戊土，埋光克水'],
      庚: ['xi', '生气养地，泄土生水自然顺畅'],
      辛: ['xi', '按大方向补：金可泄土气，唯辛在辰墓地无力、有埋金之嫌，吉力打折'],
      壬: ['xi', '水气得助，阴仪不绝则贵气有根'],
      癸: ['xi', '所救之对象：癸水得救则灵慧可现'],
    },
    branches: {
      寅: ['dai', '木克土须得水润方救水；孤木生火反害'],
      卯: ['dai', '同寅，亦须水润'],
      辰: ['ji', '本气戊土，晦火克水'],
      巳: ['dai', '火土同宫，须辨阴阳明暗'],
      午: ['ji', '按大方向补：火旺助土克水，须柱中木水救应'],
      未: ['dai', '双面：本气己土助辰土克水为忌向，藏乙木疏土存阴为喜向；亥卯未合木局则克土救水转喜，须视合化'],
      申: ['xi', '庚金之地，泄土生水'],
      酉: ['xi', '按大方向补：辰酉合金有生水之象，唯易被辰土所埋，难起大用'],
      戌: ['xi', '用戌冲辰开水库，借辛金成气平衡乙木温气；救水之力不及甲庚'],
      亥: ['xi', '癸水之地，阴气得根'],
      子: ['xi', '水气得助，贵气有源'],
      丑: ['dai', '湿土蓄水，助损未定'],
    },
  },
  巳: {
    patternNote: '巳月六阳炽盛、水绝胎虚设：首用庚金凉土存水，如钥启枢立成富局；用水木须齐见（孤水被土克、孤木生火助土），阴土丑戌晦火存金为另一路。',
    stems: {
      甲: ['dai', '孤木生火助土克水；与水齐见方为救阴'],
      乙: ['dai', '同甲'],
      丙: ['ji', '当令炽盛；透干则金无救应、金熔火海'],
      丁: ['ji', '帝旺虚张，热极伤阴'],
      戊: ['ji', '虎踞滴水立涸，绝阴气'],
      己: ['ji', '按大方向补：己土帝旺助火土克水（阴土晦火之功只在丑戌支位）'],
      庚: ['xi', '首用：长生在巳，凉土晦火、保证水有气，富贵相依'],
      辛: ['xi', '按大方向补：同庚泄土生水，唯辛在巳为死地，力薄'],
      壬: ['dai', '绝地孤水必败；须水木齐见有根'],
      癸: ['dai', '胎地，同壬'],
    },
    branches: {
      寅: ['dai', '孤木生火助纣'],
      卯: ['dai', '同寅'],
      辰: ['dai', '湿土晦火亦蓄水'],
      巳: ['ji', '本气火土炽盛'],
      午: ['ji', '火气极盛熔金涸水'],
      未: ['ji', '按大方向补：未当夏末燥土助火党，非丑戌晦火存金之比'],
      申: ['xi', '动申如透庚，立成富局'],
      酉: ['xi', '按大方向补：巳酉半合金局，助庚辛清气'],
      戌: ['xi', '阴土晦火存金，反成富基'],
      亥: ['dai', '水木暗藏，须看态势'],
      子: ['dai', '孤水被旺土克'],
      丑: ['xi', '阴土晦火，亦藏癸水之气'],
    },
  },
  午: {
    patternNote: '午月阳极阴生、丁己一气真热：庚金首用（孤金成富），丑戌晦火存金得富；壬癸水须慎用——土晦火同时克水失贵，须庚辛通关无虑；土克水态势明确时方取木救水。',
    stems: {
      甲: ['dai', '孤木生火助纣；土克水态势明确时方为救'],
      乙: ['dai', '同甲'],
      丙: ['ji', '帝旺阳极熔金，须有制'],
      丁: ['ji', '司令极热，旺而无制为灼'],
      戊: ['ji', '土克水晦火，得富亦伤贵'],
      己: ['ji', '同气戊土，热土助火'],
      庚: ['xi', '首用：沐浴有气，抗火、稳财、通水发贵'],
      辛: ['xi', '辅庚金通关生水；有庚辛则水不足虑'],
      壬: ['dai', '胎地慎用：无庚辛通关则被旺土克'],
      癸: ['dai', '绝地，同壬慎用'],
    },
    branches: {
      寅: ['dai', '木救有条件，孤木生火'],
      卯: ['dai', '同寅'],
      辰: ['dai', '水库亦晦火克水，助损并存'],
      巳: ['ji', '火助阳极'],
      午: ['ji', '火气极盛'],
      未: ['ji', '按大方向补：午未合火土，当令燥土助旺克水，非丑戌晦火存金之比'],
      申: ['xi', '金气得地，发用通水'],
      酉: ['xi', '金凉辅庚辛'],
      戌: ['xi', '晦火存金，取贵'],
      亥: ['dai', '孤水慎用'],
      子: ['dai', '水在阳刃之地，须看态势'],
      丑: ['xi', '晦火存金得富，亦藏癸'],
    },
  },
  未: {
    patternNote: '未月极热二阴、火土成党：首用庚金调燥泄土，次水木并见（孤水被克、孤木生火皆败），阴土丑戌晦火藏金；忌丁火透无制熔金壮土。用土晦火须防水伤——富而不久之诫。',
    stems: {
      甲: ['dai', '孤木生火旺土；水木齐见方用'],
      乙: ['dai', '同甲（养地力弱）'],
      丙: ['ji', '衰而仍炽，助火党'],
      丁: ['ji', '司令成气，透无制则熔金壮土'],
      戊: ['ji', '燥土助火克水'],
      己: ['ji', '当令燥土，极热'],
      庚: ['xi', '首用：冠带有气，平衡火、泄土、生水'],
      辛: ['xi', '按大方向补：同庚泄土生水，唯辛在未为衰地，辅庚力薄'],
      壬: ['dai', '养地微弱，须庚引水藏根'],
      癸: ['dai', '墓地，同壬'],
    },
    branches: {
      寅: ['dai', '孤木生火'],
      卯: ['dai', '同寅'],
      辰: ['dai', '湿土晦火，见水则凶'],
      巳: ['ji', '火助火党'],
      午: ['ji', '火土炽盛'],
      未: ['ji', '当令燥土，火库'],
      申: ['xi', '泄土生水，富局可立'],
      酉: ['xi', '同申制燥'],
      戌: ['xi', '晦火藏辛，阴中藏贵'],
      亥: ['dai', '水木暗藏须势'],
      子: ['dai', '弱水须引'],
      丑: ['xi', '冲未晦火，阴气露出'],
    },
  },
  申: {
    patternNote: '申月余热／成凉两局取用完全相反，须先定局再论逐字：土得火烘、火土旺为余热局（喜金水泄土、忌木火克金）；年月无火或水透水藏、金气得布为成凉局（喜木火扶阳炼金、忌金水再旺）。两局未定之前，逐字喜忌一律存疑标「？」。丁壬为秋之太极。',
    stems: {
      甲: ['dai', '两局相反：成凉局木生火助阳为喜；余热局须水润之木制土，孤木生火克金则忌'],
      乙: ['dai', '同甲而力弱，且须看落实'],
      丙: ['dai', '两局相反：成凉局火克金调候为喜；余热局透火熔金大凶'],
      丁: ['dai', '两局相反：丁为秋太极阳仪，成凉局制金，余热局则为忌'],
      戊: ['dai', '土双面：制水则有贵，晦火则失富，再随两局反转'],
      己: ['dai', '同戊，沐浴余气'],
      庚: ['dai', '两局相反：成凉局金旺克木为忌；余热局庚为首用'],
      辛: ['dai', '两局相反：同庚，帝旺力强'],
      壬: ['dai', '两局相反：成凉局水克火为忌；余热局金生水取贵'],
      癸: ['dai', '两局相反：死地力弱，亦须先定局'],
    },
    branches: {
      寅: ['dai', '两局相反：木火助阳制金（成凉喜），木生火克金（余热忌）'],
      卯: ['dai', '同寅'],
      辰: ['dai', '土双面＋水库，随局定助损'],
      巳: ['dai', '两局相反：火制金（成凉喜），火助余热（余热忌）'],
      午: ['dai', '同巳'],
      未: ['dai', '燥土晦火，随局定'],
      申: ['dai', '两局相反：本气庚金，成凉为忌、余热为用'],
      酉: ['dai', '同申'],
      戌: ['dai', '燥土藏火藏金，随局定'],
      亥: ['dai', '壬甲同藏，水忌木喜交战，趋向成凉'],
      子: ['dai', '见水趋成凉，须先定局'],
      丑: ['dai', '湿土蓄水，随局定'],
    },
  },
  酉: {
    patternNote: '酉月四阴成凉、金气专旺，多数成凉为体（体阴用阳）：火克金、木生火；土两面（制水有贵、晦火失富），水助凉。若土得火烘为余热局，喜忌相反。',
    stems: {
      甲: ['xi', '木生火助阳，制金凉'],
      乙: ['xi', '同甲（绝地力薄）'],
      丙: ['xi', '火可调候，制专旺之金'],
      丁: ['xi', '长生有气，秋太极阳仪，成凉局制金'],
      戊: ['dai', '两面：制水有贵，晦火失富'],
      己: ['dai', '同戊（长生助火）'],
      庚: ['ji', '帝旺金旺无制'],
      辛: ['ji', '司令凉气专旺'],
      壬: ['ji', '水助凉克火'],
      癸: ['ji', '同壬（病地力薄）'],
    },
    branches: {
      寅: ['xi', '木之生气助火'],
      卯: ['xi', '同寅'],
      辰: ['dai', '湿土晦火亦藏金'],
      巳: ['xi', '火制金'],
      午: ['xi', '火旺制金'],
      未: ['dai', '燥土晦火'],
      申: ['ji', '金之地专旺'],
      酉: ['ji', '本气凉气已成'],
      戌: ['dai', '火库藏金'],
      亥: ['dai', '水藏木，势未定'],
      子: ['ji', '水助凉'],
      丑: ['dai', '湿土生金助凉'],
    },
  },
  戌: {
    patternNote: '戌月五阴剥落、阳气潜藏：首用甲木克旺土辅弱火破阴显阳（戌月之甲有贵说），火助阳救丁；忌土旺晦火、金旺克木；壬水透而有制为玄武贵。',
    stems: {
      甲: ['xi', '第一用神：穿土辅火制凉金，「甲木在戌，有甲贵之说」'],
      乙: ['ji', '墓地伏藏，成气不能破阴'],
      丙: ['xi', '墓地力薄，得甲木之生方助阳'],
      丁: ['xi', '养地余温，所救之阳仪'],
      戊: ['ji', '当令土旺晦火，阴阳皆伤'],
      己: ['ji', '同气戊土'],
      庚: ['ji', '金凉泄土，阳气愈衰'],
      辛: ['ji', '冠带旺，金旺克木低层次'],
      壬: ['dai', '透而有戌土制为玄武贵；无制则助寒'],
      癸: ['ji', '衰地寒水，无气可制'],
    },
    branches: {
      寅: ['xi', '甲木之地，破阴有源'],
      卯: ['xi', '木助甲制土'],
      辰: ['dai', '水库湿土，助损未定'],
      巳: ['xi', '火助阳'],
      午: ['xi', '火旺救丁'],
      未: ['dai', '土双面：燥土晦火，亦藏乙木，须辨'],
      申: ['ji', '按大方向补：申藏庚壬，金寒水冷助阴，须火制'],
      酉: ['ji', '金旺克木'],
      戌: ['ji', '本气土旺晦火'],
      亥: ['dai', '壬藏甲，须看制化'],
      子: ['ji', '寒水无制'],
      丑: ['dai', '湿土晦火助寒'],
    },
  },
  亥: {
    patternNote: '亥月六阴极寒、壬水当令藏甲：用土克水（阳土戊、未辰尤贵），用木泄水（甲优于乙），用火肯定土；火土并行名利双收，动木见水则多贫困。',
    stems: {
      甲: ['xi', '长生少阳之木泄水寒，「甲木动者优于乙木」'],
      乙: ['ji', '死地，无力泄水'],
      丙: ['xi', '火肯定土，暖局之源'],
      丁: ['xi', '按大方向补：同丙火暖局肯定土气，唯丁在亥为胎地，力弱须土扶'],
      戊: ['xi', '阳土制水止寒，贵气之源'],
      己: ['dai', '土双面：阴湿之土助水，止寒制力不明'],
      庚: ['ji', '金生水助寒'],
      辛: ['ji', '同庚（沐浴力薄）'],
      壬: ['ji', '当令极旺，泛滥伤阳'],
      癸: ['ji', '帝旺冰冻，须制'],
    },
    branches: {
      寅: ['xi', '甲木之地泄水，藏火'],
      卯: ['dai', '条件矛盾：亥卯合木泄水本吉，水旺而动木不见火土则多贫困'],
      辰: ['xi', '阳土水库，制寒有贵'],
      巳: ['xi', '火土并行，肯定土气'],
      午: ['xi', '火旺土得生'],
      未: ['xi', '阳土燥，制水止寒'],
      申: ['ji', '按大方向补：申藏庚壬，金生水助寒'],
      酉: ['ji', '金凉生水'],
      戌: ['dai', '土双面：燥土火库可止寒，亦晦火助损，势未定'],
      亥: ['ji', '本气极寒'],
      子: ['ji', '水旺无制，奔波之象'],
      丑: ['dai', '土双面：湿土蓄水助寒，亦能止寒'],
    },
  },
  子: {
    patternNote: '子月老阴当权、癸水冰冻，一阳来复：首用辰未阳土止寒，次用丙丁火肯定土气生扶土；庚辛金、壬癸水皆忌；木须去生火方为用，水生木而木克土则不吉（与亥月甲木泄水不同）。',
    stems: {
      甲: ['dai', '须入火链（木生火、火扶土）方用；得水生而克土则不吉'],
      乙: ['dai', '同甲，力更弱'],
      丙: ['xi', '解冻太阳之火，肯定土气之关键'],
      丁: ['xi', '助丙，绝地利薄须有根'],
      戊: ['xi', '阳土制水止寒'],
      己: ['dai', '湿土冻结，止寒力不明'],
      庚: ['ji', '金生水增寒，动金主贫困劳碌'],
      辛: ['ji', '同庚'],
      壬: ['ji', '帝旺泛滥，无戊制则奔波到老'],
      癸: ['ji', '临官冰冻成气'],
    },
    branches: {
      寅: ['xi', '木之温气，「一寅破百寒」，先苦后甜'],
      卯: ['dai', '水生木、木克土之虞'],
      辰: ['xi', '阳土第一用：止寒有贵气之象'],
      巳: ['xi', '火土并行，助阳止寒'],
      午: ['xi', '火之地解冻'],
      未: ['xi', '阳土燥，制水'],
      申: ['ji', '金生水助寒'],
      酉: ['ji', '同申'],
      戌: ['xi', '按大方向补：燥土含火库可止寒，唯力逊辰未阳土'],
      亥: ['ji', '壬藏甲，助寒'],
      子: ['ji', '本气老阴极寒'],
      丑: ['dai', '矛盾：子丑合，化土则止寒、蓄水则助寒，须辨合化'],
    },
  },
  丑: {
    patternNote: '丑月阴极阳动、己土司令止寒为贵气之根：丙火助之，甲木动而生火、火助土克水则富贵双全；尤忌辛金泄土生水，助寒为祸。',
    stems: {
      甲: ['xi', '冠带有气，动木生火、火助土克水'],
      乙: ['xi', '按大方向补：同甲生火助土，唯乙在丑为衰地，力弱'],
      丙: ['xi', '解冻助土，「见火不孤」'],
      丁: ['xi', '墓地力薄，亦助丙'],
      戊: ['xi', '透戊清贵，助土制水'],
      己: ['xi', '本气止寒，贵气之根'],
      庚: ['ji', '墓地亦泄土生水'],
      辛: ['ji', '养地为寒中变数：泄己土、助癸水'],
      壬: ['ji', '衰地，「见壬为水浸湖田」'],
      癸: ['ji', '冠带寒成气至极'],
    },
    branches: {
      寅: ['xi', '木之温气助火'],
      卯: ['xi', '按大方向补：木生火助阳，唯冬木气弱，吉力打折'],
      辰: ['dai', '土双面：湿土同气可止寒，亦为水库助水'],
      巳: ['xi', '火暖局'],
      午: ['xi', '火旺土得生'],
      未: ['dai', '燥土制水，亦冲丑'],
      申: ['ji', '金生水助寒'],
      酉: ['ji', '同申'],
      戌: ['dai', '燥土火库'],
      亥: ['ji', '极水助寒'],
      子: ['ji', '寒冰同气'],
      丑: ['xi', '本气止寒，亦藏己'],
    },
  },
};

export function analyzeZhuZiXiJi(monthBranch: string, monthQi: MonthQiResult): ZhuZiXiJiResult {
  const ref = ZHUZI_XIJI_REF[monthBranch];
  const directionLabel = monthQi.usageDirection === 'yin' ? '用阴 · 金水' : '用阳 · 木火';
  if (!ref) {
    // 兜底：无参考资料时按元素级大方向推导，土一律待定
    const fallback = (el: string): [ZhuZiMark, string] => {
      if (el === 'earth') return ['dai', '土须独立判定，暂无法定论'];
      if (monthQi.usageDirection === 'yin') return el === 'metal' || el === 'water' ? ['xi', '月令大方向为用'] : ['ji', '月令大方向为忌'];
      return el === 'wood' || el === 'fire' ? ['xi', '月令大方向为用'] : ['ji', '月令大方向为忌'];
    };
    return {
      monthBranch, directionLabel, patternNote: monthQi.description,
      stems: STEMS_ORDER.map((s) => { const [m, n] = fallback(STEM_ELEMENTS[s]); return { char: s, element: STEM_ELEMENTS[s], mark: m, note: n }; }),
      branches: BRANCHES_ORDER.map((b) => { const [m, n] = fallback(BRANCH_ELEMENTS[b]); return { char: b, element: BRANCH_ELEMENTS[b], mark: m, note: n }; }),
      source: '《十二月份取用》（资料缺月，按大方向推导）',
    };
  }
  return {
    monthBranch,
    directionLabel,
    patternNote: ref.patternNote,
    stems: STEMS_ORDER.map((s) => {
      const row = ref.stems[s] ?? ['dai', '参考资料无定论，须视柱中态势'];
      return { char: s, element: STEM_ELEMENTS[s], mark: row[0], note: row[1] };
    }),
    branches: BRANCHES_ORDER.map((b) => {
      const row = ref.branches[b] ?? ['dai', '参考资料无定论，须视柱中态势'];
      return { char: b, element: BRANCH_ELEMENTS[b], mark: row[0], note: row[1] };
    }),
    source: '《十二月份取用》',
  };
}

// ============================================================
// 月令逐字资料库 → 引擎用忌标记 的唯一映射
// 喜(xi)=用神、忌(ji)=忌神、待定(dai)=中性（无法判断不加减分）
// 四柱徽章、藏干、大运流年打分、吉凶分析均以此为准，保证「资料库逐字喜忌」与各处标记同源
// ============================================================
const ZHUZI_TO_XIJI: Record<ZhuZiMark, XiJiMark> = { xi: 'useful', ji: 'taboo', dai: 'neutral' };

export function monthCharMark(
  monthBranch: string,
  char: string,
  isStem: boolean,
  fallback: XiJiMark = 'neutral',
): XiJiMark {
  const ref = ZHUZI_XIJI_REF[monthBranch];
  if (!ref) return fallback;
  const row = isStem ? ref.stems[char] : ref.branches[char];
  return row ? ZHUZI_TO_XIJI[row[0]] : fallback;
}

// 十二长生 → 气机强弱分（长生/临官/帝旺/冠带=有力，沐浴/养/衰/病/胎=中平，死/墓/绝=无力）
const CHANG_SHENG_POWER: Record<string, number> = {
  长生: 20, 临官: 22, 帝旺: 24, 冠带: 18,
  沐浴: 8, 养: 6, 衰: 4, 病: 2, 胎: 2,
  死: -18, 墓: -12, 绝: -20,
};

const HIDDEN_STEM_MAP: Record<string, string[]> = {
  子: ['癸'], 丑: ['己', '辛', '癸'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '戊', '壬'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};

export function analyzeNianYueTaiJi(
  chart: BaZiChart,
  monthQi: MonthQiResult,
  yongJi: YongJiResult,
): NianYueTaiJiResult {
  // 五行生克（局部映射，避免依赖文件后部导出的 SHENG_ORDER/KE_ORDER 造成的声明顺序问题）
  const KE_MAP: Record<string, string> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
  const SHENG_MAP: Record<string, string> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
  const pillars: Pillar[] = [chart.year, chart.month, chart.day, chart.hour];
  const chartStems = pillars.map((p) => p.stem);
  const chartBranches = pillars.map((p) => p.branch);
  const evidence: string[] = [];

  // ① 五虎遁·年上起月：验证年月组合是否依五虎遁成立（年干定月干，确立命局基础太极框架）
  const firstMonthStem = WU_HU_DUN_MONTH_STEM[chart.year.stem];
  const firstIdx = STEMS_ORDER.indexOf(firstMonthStem);
  const expectedMonthStem = STEMS_ORDER[(firstIdx + chart.monthBranchIndex) % 10];
  const wuHuDunValid = expectedMonthStem === chart.month.stem;
  const wuHuDunDesc = `依五虎遁，${chart.year.stem}年自${firstMonthStem}寅月起顺推至${monthQi.monthName}得${expectedMonthStem}干${chart.month.branch}，与排盘${wuHuDunValid ? '一致（年月太极框架成立）' : '不一致（按交节时刻修正所致）'}。年干定月干，确立命局基础太极框架；月令具备全局规制权，统一定局中所有天干旺衰状态。`;
  evidence.push(wuHuDunDesc);

  // ② 月令两仪（当月固有太极：阳仪、阴仪核心干支）
  const taijiDef = NIAN_YUE_TAIJI_DEFS.find((t) => t.months.includes(monthQi.monthName))
    ?? NIAN_YUE_TAIJI_DEFS[0];

  // ③ 年干定位：置于月令规制下，判其是否为月令平衡因子 → 先天年吉
  const yearStemChangSheng = SHI_ER_CHANG_SHENG[chart.month.branch]?.[chart.year.stem] ?? '—';
  let yearStemJiXiong: NianYueTaiJiResult['yearStemJiXiong'];
  let yearStemReason: string;
  const yearStemMark = yongJi.stemMarks['年干'];
  const yearEl = elementName(STEM_ELEMENTS[chart.year.stem]);
  const yearStemFactors: string[] = [];
  // 命中两仪只表明「身份」，不直接定吉凶：当令已盛之一仪再见反为忌
  // （如夏月丙为阳仪却忌火、寅月癸为阴仪而余寒不可增、冬月壬为阴仪当令而忌水旺），
  // 吉凶一律以月令逐字喜忌（资料库 monthCharMark）为准。
  const yearHitsYi = chart.year.stem === taijiDef.yangYi ? `阳仪「${taijiDef.yangYi}」`
    : chart.year.stem === taijiDef.yinYi ? `阴仪「${taijiDef.yinYi}」` : '';
  const yiFactor = yearHitsYi
    ? `仪神身份：年干${chart.year.stem}即${taijiDef.name}${yearHitsYi}（${yearHitsYi.startsWith('阳') ? taijiDef.yangYiMeaning : taijiDef.yinYiMeaning}）；然仪神须为月令所需方吉`
    : '';
  if (yearStemMark === 'useful') {
    yearStemJiXiong = '先天年吉';
    yearStemReason = `年干${chart.year.stem}（${yearEl}）为${monthQi.monthName}月令所需的平衡因子${yearHitsYi ? `，正命中${yearHitsYi}` : ''}，先天年吉，此根基永久存在。年干落月令十二长生「${yearStemChangSheng}」，${CHANG_SHENG_POWER[yearStemChangSheng] >= 0 ? '气机有力，先天根基扎实' : '气机偏弱，先天根基稍薄'}。`;
    if (yiFactor) yearStemFactors.push(yiFactor + '，月令正需此仪，喜忌与仪神身份一致');
    yearStemFactors.push(`月令喜用：年干${chart.year.stem}（${yearEl}）属${monthQi.monthName}逐字喜用（${monthQi.usageDirection === 'yin' ? '用阴·金水调阳' : '用阳·木火衡阳'}大方向下的干支定论）`);
    yearStemFactors.push(`十二长生：年干落月令为「${yearStemChangSheng}」，${CHANG_SHENG_POWER[yearStemChangSheng] >= 0 ? '气机有力，根基扎实' : '气机偏弱，根基稍薄'}`);
    yearStemFactors.push('定论：先天年吉，年上吉气永久存在，为命局最根本的依托');
  } else if (yearStemMark === 'taboo') {
    yearStemJiXiong = '先天年忌';
    yearStemReason = `年干${chart.year.stem}（${yearEl}）${yearHitsYi ? `虽为${taijiDef.name}${yearHitsYi}，然仪神非「见则吉」——${monthQi.monthName}月令不取此仪（当令一方已足、或逆势助旺），再见反破坏平衡，` : ''}属月令忌神方向，违背月令规制，先天年忌——凶性底色存在，需年月日时制衡方能转圜。年干落月令十二长生「${yearStemChangSheng}」。`;
    if (yiFactor) yearStemFactors.push(yiFactor + `，但${monthQi.monthName}此仪已盛/逆势，再见反成忌神——非「见仪即吉」`);
    yearStemFactors.push(`月令所忌：年干${chart.year.stem}（${yearEl}）属${monthQi.monthName}逐字忌神，违背月令规制`);
    yearStemFactors.push(`十二长生：年干落月令为「${yearStemChangSheng}」，${CHANG_SHENG_POWER[yearStemChangSheng] >= 0 ? '气机有力，忌神愈盛' : '气机偏弱，凶性稍减'}`);
    yearStemFactors.push('定论：先天年忌，凶性底色存在，须柱中制衡方得转圜');
  } else {
    yearStemJiXiong = '先天年平';
    yearStemReason = `年干${chart.year.stem}（${yearEl}）${yearHitsYi ? `为${taijiDef.name}${yearHitsYi}，但月令逐字喜忌存疑/有条件（须视柱中态势、两局），` : ''}先天年平——根基平常，吉凶全凭岁运引动与柱中组合。年干落月令十二长生「${yearStemChangSheng}」。`;
    if (yiFactor) yearStemFactors.push(yiFactor + '，唯此字取用有条件（两局/救应），暂不作吉凶定论');
    else yearStemFactors.push(`中性：年干${chart.year.stem}（${yearEl}）不在月令核心喜忌之上`);
    yearStemFactors.push(`十二长生：年干落月令为「${yearStemChangSheng}」`);
    yearStemFactors.push('定论：先天年平，根基平常，吉凶全凭岁运引动');
  }
  evidence.push(`年干定位：${yearStemReason}`);

  // ④ 年支作用：年干主天象契机，年支主落地成形（在天成象，在地成形）
  // 判定优先级（按《太极阴阳法》甲X年·丙寅月案例校准）：
  //   核心关切是阴仪贵气的保全——年支伤阴仪（克/火蒸水/土晦火）→ 阻碍否定；
  //   年支落实阴仪（同气/生）或稳固阳仪 → 落实兑现；其余视月令喜忌。
  const yearBranchEl = chart.year.branchElement;
  const yearStemEl = chart.year.stemElement;
  const yangYiEl = STEM_ELEMENTS[taijiDef.yangYi];   // 阳仪元素（富气）
  const yinYiEl = STEM_ELEMENTS[taijiDef.yinYi];     // 阴仪元素（贵气）
  // 月令反转：亥子丑水旺当令、戌月壬喜土制——火土克水是「制衡寒水」扶助阳仪，非伤阴；
  //           巳午未阳仪丙火已极——木火同气/生火是「助旺燥热」（熔金之患），非稳固阳仪。
  const waterStrongMonth = ['亥月', '子月', '丑月', '戌月'].includes(monthQi.monthName);
  const yangFullMonth = ['巳月', '午月', '未月'].includes(monthQi.monthName);
  const zhiHengHanShui = waterStrongMonth && yinYiEl === 'water'
    && (yearBranchEl === 'earth' || yearBranchEl === 'fire');
  const branchShangYin = !zhiHengHanShui && (
      KE_MAP[yearBranchEl] === yinYiEl                               // 年支克阴仪（如辰土克癸水）
      || (yinYiEl === 'water' && yearBranchEl === 'fire')            // 火旺蒸干水（如午火蒸癸水，冬月除外）
      || (yinYiEl === 'fire' && yearBranchEl === 'earth')            // 土晦火（如戌土晦丁火）
    );
  const branchFuYin = !waterStrongMonth
    && (yearBranchEl === yinYiEl || SHENG_MAP[yearBranchEl] === yinYiEl);  // 同气/生阴仪（如寅月子水落实癸；冬月助寒不算）
  const branchFuYang = !yangFullMonth
    && (yearBranchEl === yangYiEl || SHENG_MAP[yearBranchEl] === yangYiEl); // 稳固阳仪（如寅木助丙火；夏月助旺不算）
  const branchZhuWangYang = yangFullMonth
    && (yearBranchEl === yangYiEl || SHENG_MAP[yearBranchEl] === yangYiEl); // 夏月木火助旺阳仪（凶向）
  let yearBranchAction: NianYueTaiJiResult['yearBranchAction'];
  let yearBranchReason: string;
  const yearBranchFactors: string[] = [];
  const branchKeStem = KE_MAP[yearBranchEl] === yearStemEl; // 年支克年干（五行关系层，仅作参考因素）
  // 年支作用的第一依据是月令逐字资料库（与四柱徽章、日时应验同源）；
  // 泛化五行生克（如「土克水」）不能翻转干支级定论——辰月戌土冲辰开水库反为喜、未为木库双面待定。
  const yearBranchMark: XiJiMark = yongJi.branchMarks['年支'] ?? 'neutral';
  const zzBranchNote = ZHUZI_XIJI_REF[chart.month.branch]?.branches[chart.year.branch]?.[1] ?? '';
  const markLabel = yearBranchMark === 'useful' ? '月令逐字喜用'
    : yearBranchMark === 'taboo' ? '月令逐字所忌' : '月令逐字待定/中性';
  // 五行关系描述（参考因素，不单独决定吉凶）
  const gxRel = branchKeStem ? `五行关系上克年干${chart.year.stem}，`
    : branchShangYin ? `五行关系上克伤阴仪「${taijiDef.yinYi}」，`
    : zhiHengHanShui ? '火土制寒暖局，'
    : branchZhuWangYang ? '木火助旺当令阳仪，'
    : branchFuYin ? `同气/生扶阴仪「${taijiDef.yinYi}」，`
    : branchFuYang ? `同气/稳固阳仪「${taijiDef.yangYi}」，` : '';
  yearBranchFactors.push(`年支${chart.year.branch}（${elementName(yearBranchEl)}）：${markLabel}${zzBranchNote ? `——${zzBranchNote}` : ''}`);
  if (gxRel) yearBranchFactors.push(`参考因素：${gxRel}然须让位于月令干支定论`);
  if (yearStemJiXiong === '先天年吉') {
    if (yearBranchMark === 'taboo') {
      yearBranchAction = '阻碍否定';
      yearBranchReason = `年干得吉，但年支${chart.year.branch}为${monthQi.monthName}逐字所忌${zzBranchNote ? `（${zzBranchNote}）` : ''}，予以否定：先天契机佳，现实落地阻碍重重，人生跌宕起伏。`;
      yearBranchFactors.push('定论：年支为月令忌神，否定年干吉气——契机虽佳，落地多阻');
    } else if (yearBranchMark === 'useful') {
      yearBranchAction = '落实兑现';
      yearBranchReason = `年干得吉，年支${chart.year.branch}为${monthQi.monthName}逐字喜用${zzBranchNote ? `（${zzBranchNote}）` : ''}，先天年吉落地成形、兑现有力，若日时无破坏则完整兑现。`;
      yearBranchFactors.push('定论：在天成象、在地成形——年支为月令喜用，年吉落地兑现有力');
    } else {
      yearBranchAction = '中平';
      yearBranchReason = `年干得吉，年支${chart.year.branch}在${monthQi.monthName}取用有条件/双面${zzBranchNote ? `（${zzBranchNote}）` : ''}，不构成确定否定，先天年吉落地中性，须视日时、岁运合局引动（如三合三会、冲刑）而定。`;
      yearBranchFactors.push('定论：年支双面待定，非确定否定——合化向喜则助、向忌则阻，吉凶视岁运引动');
    }
  } else if (yearStemJiXiong === '先天年忌') {
    if (yearBranchMark === 'useful') {
      yearBranchAction = '制衡借利';
      yearBranchReason = `年干为忌，年支${chart.year.branch}为${monthQi.monthName}逐字喜用${zzBranchNote ? `（${zzBranchNote}）` : ''}，制衡年干之忌：可借之得阶段性利好，但凶性底色不变，逢气机引动之时必应凶。`;
      yearBranchFactors.push('定论：年支为月令喜用、制衡年忌——可借阶段性利好，凶性底色不变');
    } else {
      yearBranchAction = '中平';
      yearBranchReason = `年干为忌，年支${chart.year.branch}${yearBranchMark === 'taboo' ? '亦为月令所忌，凶性无制' : `取用有条件/双面${zzBranchNote ? `（${zzBranchNote}）` : ''}`}，全凭日时、岁运引动。`;
      yearBranchFactors.push(yearBranchMark === 'taboo' ? '定论：年支同为忌神，凶性无从化解' : '定论：年支双面待定，制衡与否视岁运合局');
    }
  } else {
    yearBranchAction = '中平';
    yearBranchReason = `年干先天年平，年支${chart.year.branch}为${monthQi.monthName}${markLabel}${zzBranchNote ? `（${zzBranchNote}）` : ''}，落地平常，吉凶视岁运引动。`;
    yearBranchFactors.push('定论：年干年平、年支无确定扶抑，落地平常，吉凶视岁运引动');
  }
  evidence.push(`年支作用：${yearBranchReason}`);

  // ⑤ 两仪气机厚薄评估（十二长生为唯一气机强弱标准 + 透干/藏干/无现）
  const evalYi = (yiStem: string, role: string): NianYueYiGong => {
    const el = elementName(STEM_ELEMENTS[yiStem]);
    const cs = SHI_ER_CHANG_SHENG[chart.month.branch]?.[yiStem] ?? '—';
    let power = CHANG_SHENG_POWER[cs] ?? 0;
    let state: NianYueYiGong['state'];
    const factors: string[] = [];
    if (chartStems.includes(yiStem)) {
      power += 60;
      state = '彰显';
      factors.push(`透干彰显：${yiStem}现于四柱天干（${chartStems.filter((s) => s === yiStem).length}处），气机明显发用`);
    } else if (chartBranches.some((b) => (HIDDEN_STEM_MAP[b] || []).includes(yiStem))) {
      power += 40;
      state = '暗藏';
      factors.push(`地支暗藏：${yiStem}藏于${chartBranches.filter((b) => (HIDDEN_STEM_MAP[b] || []).includes(yiStem)).join('、')}，有根而未透`);
    } else {
      state = '不见';
      factors.push(`全盘不见：${yiStem}不透不藏，此仪之气缺位`);
    }
    factors.push(`月令长生：${yiStem}落${chart.month.branch}月为「${cs}」，${(CHANG_SHENG_POWER[cs] ?? 0) >= 18 ? '得令气厚' : (CHANG_SHENG_POWER[cs] ?? 0) >= 0 ? '气机中平' : '失令气薄'}`);
    // 受克损伤（四柱天干克此仪）
    const hurtByStems = chartStems.filter((s) => KE_MAP[STEM_ELEMENTS[s]] === STEM_ELEMENTS[yiStem]);
    const hurtBy = hurtByStems.length;
    const hurt = hurtBy * 14;
    power -= hurt;
    if (hurtBy > 0) factors.push(`受克损伤：被天干${hurtByStems.join('、')}克制（力量分 -${hurt}）`);
    else factors.push('无天干克制：此仪不受柱中明面克损');
    const finalPower = Math.max(-30, Math.min(100, power));
    const verdict = finalPower >= 50 ? '气机深厚，此仪为格局得力支柱'
      : finalPower >= 20 ? '气机尚可，此仪有根须养护'
      : finalPower > 0 ? '气机偏薄，此仪须日时岁运补益'
      : '气机衰绝，此仪破缺，富贵根基大损';
    const desc = `${yiStem}（${el}）${state}：落月令十二长生「${cs}」，${hurtBy > 0 ? `受天干${hurtByStems.join('、')}克制（-${hurt}）` : '无天干克制'}，气机力量分 ${finalPower}`;
    return { stem: yiStem, state, power: finalPower, changSheng: cs, desc, role, verdict, factors };
  };
  const yangYi = evalYi(taijiDef.yangYi, '阳仪 · 富气');
  const yinYi = evalYi(taijiDef.yinYi, '阴仪 · 贵气');
  evidence.push(`两仪评估：阳仪${yangYi.desc}；阴仪${yinYi.desc}`);

  // ⑥ 年月太极三态（完整/受损/绝境）
  // 常规：阳仪彰显（≥50）+ 阴仪有根（≥40）→ 完整；全盘木火特例：阳仪彰显（≥60）+ 阴仪暗藏有气（≥20）且不受重创 → 亦完整
  let state: NianYueTaiJiResult['state'];
  let stateDesc: string;
  const yangOk = yangYi.power >= 50;
  const yinOk = yinYi.power >= 40;
  const yinRooted = yinYi.power >= 20 && yinYi.state === '暗藏';
  if ((yangOk && yinOk) || (yangYi.power >= 60 && yinRooted)) {
    state = '两仪完整';
    stateDesc = `${taijiDef.name}两仪保全：阳仪「${taijiDef.yangYi}」气机彰显，阴仪「${taijiDef.yinYi}」${yinOk ? '有根稳固' : '暗藏无伤'}——年月太极根基完好，格局成贵成富的基础具备。${yangYi.power >= 60 && yinRooted ? '（全盘木火格局特例：阳仪彰显、阴仪暗藏无伤，亦可成富贵。）' : ''}`;
  } else if (yangYi.power >= 20 && yinYi.power >= 20) {
    state = '两仪受损';
    stateDesc = `${taijiDef.name}两仪受损：阳仪「${taijiDef.yangYi}」${yangOk ? '尚可' : '气机偏弱'}，阴仪「${taijiDef.yinYi}」${yinOk ? '尚可' : '气机受抑'}——年月太极未绝，仍有富贵余地，成色取决于日时能否补救${yangYi.power < yinYi.power ? taijiDef.yangYi : taijiDef.yinYi}。`;
  } else {
    state = '两仪绝境';
    stateDesc = `${taijiDef.name}两仪绝境：${yangYi.power < 20 ? `阳仪「${taijiDef.yangYi}」` : `阴仪「${taijiDef.yinYi}」`}彻底无根或遭重创压制，阴阳隔绝，年月太极不立——格局偏枯，最需日时/岁运大力度救助。`;
  }
  evidence.push(`年月太极三态：${state}。${stateDesc}`);

  // ⑦ 日时动态应验（日时为年月太极的动态应验环节：月令喜用到位=维护，月令所忌到位=破坏）
  // 术语「宜年」：日时干支对年干起吉作用——生扶年干所需（如年干癸受伤，日时动庚辛金、壬癸水），
  // 或克制对年干不吉的因素，即为「宜年」；反之助忌伤年则不宜。
  // 判定一律以月令逐字资料库为准（不能只看对两仪元素的生克：夏月水克阳仪火反为救应、冬月土克阴仪水是止寒）。
  const riShi: Array<{ char: string; el: string; isStem: boolean }> = [
    { char: chart.day.stem, el: chart.day.stemElement, isStem: true },
    { char: chart.day.branch, el: chart.day.branchElement, isStem: false },
    { char: chart.hour.stem, el: chart.hour.stemElement, isStem: true },
    { char: chart.hour.branch, el: chart.hour.branchElement, isStem: false },
  ];
  const zzRefMonth = ZHUZI_XIJI_REF[chart.month.branch];
  const hurtsYearEl = (Object.keys(KE_MAP) as string[]).find((k) => KE_MAP[k] === yearStemEl) ?? '';
  const riShiPillars = ['日干', '日支', '时干', '时支'];
  const riShiItems = riShi.map((r, i) => {
    const mark = r.isStem ? yongJi.allStemMarks[r.char] : yongJi.allBranchMarks[r.char];
    const note = zzRefMonth ? (r.isStem ? zzRefMonth.stems[r.char]?.[1] : zzRefMonth.branches[r.char]?.[1]) ?? '' : '';
    let effect: '维护' | '破坏' | '中平';
    let why: string;
    if (mark === 'useful') {
      effect = '维护';
      why = `月令逐字喜用：${note || `${r.char}为${monthQi.monthName}喜用`}，维护年月太极`;
    } else if (mark === 'taboo') {
      effect = '破坏';
      why = `月令逐字所忌：${note || `${r.char}为${monthQi.monthName}忌神`}，破坏月令平衡`;
    } else {
      effect = '中平';
      why = note && note.startsWith('？') ? `取用有条件、暂不判吉凶：${note}` : (note || '非月令核心喜忌，应验视岁运引动');
    }
    // 年干关系附加说明（宜年判定的论据）
    if (r.el === yearStemEl || SHENG_MAP[r.el] === yearStemEl) why += `；并生扶年干${chart.year.stem}`;
    else if (KE_MAP[r.el] === yearStemEl) why += `；并克制年干${chart.year.stem}`;
    else if (hurtsYearEl && KE_MAP[r.el] === hurtsYearEl) why += `；克制伤年干之${elementName(hurtsYearEl)}，解救年干`;
    return { char: r.char, pillar: riShiPillars[i], effect, why };
  });
  const hurtCount = riShiItems.filter((x) => x.effect === '破坏').length;
  const helpCount = riShiItems.filter((x) => x.effect === '维护').length;
  let riShiEffect: NianYueTaiJiResult['riShiEffect'];
  let riShiReason: string;
  if (hurtCount > 0 && hurtCount >= helpCount) {
    riShiEffect = '破坏';
    riShiReason = `日时${riShiItems.filter((x) => x.effect === '破坏').map((x) => x.char).join('、')}为月令逐字所忌，破坏年月太极——先天年月吉气落地受阻，人生得失起伏明显。`;
  } else if (helpCount > 0) {
    riShiEffect = '维护';
    riShiReason = `日时${riShiItems.filter((x) => x.effect === '维护').map((x) => x.char).join('、')}为月令逐字喜用，年月太极得日时动态维护，先天吉气可落地兑现。`;
  } else {
    riShiEffect = '中平';
    riShiReason = '日时干支无月令明确喜忌（中性或取用有条件），先天年月吉凶应验视岁运引动与柱中组合而定。';
  }
  evidence.push(`日时动态应验：${riShiReason}`);

  // 宜年：日时干支对年干起吉作用——年干为吉时生扶之或克制伤年因素；年干为忌时制衡之
  let riShiYiNian = false;
  if (yearStemJiXiong === '先天年吉') {
    riShiYiNian = riShi.some((r) => r.el === yearStemEl || SHENG_MAP[r.el] === yearStemEl || (hurtsYearEl && KE_MAP[r.el] === hurtsYearEl));
  } else if (yearStemJiXiong === '先天年忌') {
    riShiYiNian = riShi.some((r) => KE_MAP[r.el] === yearStemEl);
  }
  if (riShiYiNian) evidence.push('宜年：日时干支对年干起吉作用（生扶年吉所需，或克制伤年/年忌因素），先天吉气得后天维护。');

  // ⑧ 综合结论
  const matched = NIAN_YUE_TAIJI_CASES.find((c) => c.yearGZ === `${chart.year.stem}${chart.year.branch}` && c.monthGZ === `${chart.month.stem}${chart.month.branch}`) ?? null;
  if (matched) evidence.push(`命中参考格局「${matched.title}」：${matched.analysis}`);

  let verdict: string;
  if (yearStemJiXiong === '先天年吉' && yearBranchAction === '落实兑现' && state === '两仪完整' && riShiEffect !== '破坏') {
    verdict = `先天年吉·完整兑现：${chart.year.stem}${chart.year.branch}年干得吉、年支落实，${taijiDef.name}两仪保全，日时无破坏——先天根基永久存在，格局成富贵的基础已具备。`;
  } else if (yearStemJiXiong === '先天年吉' && (yearBranchAction === '阻碍否定' || riShiEffect === '破坏')) {
    verdict = `先天年吉·落地受阻：先天契机极佳，但${yearBranchAction === '阻碍否定' ? '年支' : '日时'}予以否定，现实落地阻碍重重——人生跌宕起伏，大起大落之象，需岁运补缺方见成效。`;
  } else if (yearStemJiXiong === '先天年忌' && yearBranchAction === '制衡借利') {
    verdict = `先天年忌·借忌得利：年干为忌而年支制衡，可借忌神得阶段性利好，但凶性底色不变——逢忌神气机引动之时必应凶，宜守不宜攻。`;
  } else if (state === '两仪绝境') {
    verdict = `年月太极绝境：${taijiDef.name}阴阳隔绝，格局偏枯——富贵根基薄弱，最需日时、岁运大力度救助，后天修身立德尤为关键。`;
  } else {
    verdict = `${yearStemJiXiong}，${yearBranchAction}，${state}——格局根基${state === '两仪完整' ? '扎实' : state === '两仪受损' ? '中平、有补救余地' : '偏薄'}，${riShiEffect === '破坏' ? '日时添阻，宜守待时' : riShiEffect === '维护' ? '日时维护，可期有成' : '平顺待引动'}。`;
  }

  return {
    yearGZ: `${chart.year.stem}${chart.year.branch}`,
    monthGZ: `${chart.month.stem}${chart.month.branch}`,
    wuHuDunValid,
    wuHuDunDesc,
    yearStemChangSheng,
    yearStemJiXiong,
    yearStemReason,
    yearStemFactors,
    yearBranchAction,
    yearBranchReason,
    yearBranchFactors,
    taijiName: taijiDef.name,
    taijiNote: taijiDef.note,
    yangYi,
    yinYi,
    state,
    stateDesc,
    riShiEffect,
    riShiReason,
    riShiItems,
    riShiYiNian,
    verdict,
    evidence,
    matchedCase: matched ? { title: matched.title, analysis: matched.analysis } : null,
  };
}

// 五行力量计算（简化评分）
export function calculateElementPower(chart: BaZiChart): {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
} {
  const power = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const pillars: Pillar[] = [chart.year, chart.month, chart.day, chart.hour];
  const weights = [
    { stem: 1.0, branch: 1.5 }, // 年
    { stem: 1.2, branch: 2.5 }, // 月（月令最重）
    { stem: 1.5, branch: 1.8 }, // 日
    { stem: 0.8, branch: 1.2 }, // 时
  ];

  pillars.forEach((pillar, idx) => {
    const w = weights[idx];
    // 天干
    power[pillar.stemElement as keyof typeof power] += w.stem;
    // 地支
    power[pillar.branchElement as keyof typeof power] += w.branch;
    // 藏干（按主次递减权重）
    pillar.hiddenStems.forEach((stem, i) => {
      const hiddenWeight = w.branch * (0.5 - i * 0.15);
      const el = STEM_ELEMENTS[stem];
      if (el && hiddenWeight > 0) {
        power[el as keyof typeof power] += hiddenWeight;
      }
    });
  });

  // 归一化为百分比
  const total = Object.values(power).reduce((a, b) => a + b, 0);
  const normalized = { ...power };
  Object.keys(normalized).forEach((k) => {
    normalized[k as keyof typeof normalized] = Math.round((normalized[k as keyof typeof normalized] / total) * 100);
  });

  return normalized;
}

// 阴阳平衡计算（土不再作为中性第三元：燥土未戌/阳土戊→阳，湿土丑辰/阴土己→阴）
export function calculateYinYangBalance(chart: BaZiChart): { yang: number; yin: number } {
  let yang = 0;
  let yin = 0;
  const pillars: Pillar[] = [chart.year, chart.month, chart.day, chart.hour];
  const weights = [
    { stem: 1.0, branch: 1.5 }, // 年
    { stem: 1.2, branch: 2.5 }, // 月
    { stem: 1.5, branch: 1.8 }, // 日
    { stem: 0.8, branch: 1.2 }, // 时
  ];

  const addYang = (v: number) => { yang += v; };
  const addYin = (v: number) => { yin += v; };
  const addByEl = (el: string | undefined, ganzhi: string, v: number) => {
    if (el === 'earth') { (EARTH_YANG_GANZHI.has(ganzhi) ? addYang : addYin)(v); }
    else if (el === 'wood' || el === 'fire') addYang(v);
    else addYin(v);
  };

  pillars.forEach((pillar, idx) => {
    const w = weights[idx];
    // 天干
    addByEl(pillar.stemElement, pillar.stem, w.stem);
    // 地支
    addByEl(pillar.branchElement, pillar.branch, w.branch);
    // 藏干
    pillar.hiddenStems.forEach((st, i) => {
      const hEl = STEM_ELEMENTS[st];
      const hw = w.branch * (0.5 - i * 0.15);
      if (!hEl || hw <= 0) return;
      addByEl(hEl, st, hw);
    });
  });

  const total = yang + yin;
  return {
    yang: Math.round((yang / total) * 100),
    yin: Math.round((yin / total) * 100),
  };
}

// 寒热气计算（《自然易鉴》核心：寒热 = 水火配比，是格局的第一标尺）
// 热气 = 丙丁火 + 巳午未（火之根）；寒气 = 壬癸水 + 亥子丑（水之根）
// 木（温，助热）、金（凉，助寒）；土不再计为中性：戊/未/戌燥土→热，己/丑/辰湿土→寒
export function calculateColdHotBalance(chart: BaZiChart): { hot: number; cold: number } {
  let hot = 0;
  let cold = 0;
  const pillars: Pillar[] = [chart.year, chart.month, chart.day, chart.hour];
  // 月令权重放大：月令决定寒热基调
  const weights = [1.0, 2.2, 1.2, 0.9];

  pillars.forEach((pillar, idx) => {
    const w = weights[idx];
    // 天干：丙丁→热，壬癸→寒，甲乙→助热（温），庚辛→助寒（凉），戊→热（阳土），己→寒（湿土）
    const sEl = pillar.stemElement;
    let sScore = 0;
    let sCat: 'hot' | 'cold' = 'hot';
    if (sEl === 'fire') { sScore = w * 1.2; sCat = 'hot'; }
    else if (sEl === 'water') { sScore = w * 1.2; sCat = 'cold'; }
    else if (sEl === 'wood') { sScore = w * 0.6; sCat = 'hot'; }
    else if (sEl === 'metal') { sScore = w * 0.6; sCat = 'cold'; }
    else { sScore = w * 0.4; sCat = pillar.stem === '戊' ? 'hot' : 'cold'; }
    if (sCat === 'hot') hot += sScore;
    else cold += sScore;

    // 地支：巳午未→热（火局），亥子丑→寒（水局），寅卯辰→助热（温），申酉戌→助寒（凉）
    const bEl = pillar.branchElement;
    const branch = pillar.branch;
    let bBase = w * 1.5;
    // 巳午未 / 亥子丑 加成
    if (['巳', '午', '未'].includes(branch)) bBase *= 1.3;
    else if (['亥', '子', '丑'].includes(branch)) bBase *= 1.3;
    let bCat: 'hot' | 'cold' = 'hot';
    if (bEl === 'fire') bCat = 'hot';
    else if (bEl === 'water') bCat = 'cold';
    else if (bEl === 'wood') bCat = 'hot';
    else if (bEl === 'metal') bCat = 'cold';
    else { // 土：未戌偏热（燥土），丑辰偏寒（湿土）
      if (['未', '戌'].includes(branch)) bCat = 'hot';
      else bCat = 'cold';
      bBase *= 0.55;
    }
    if (bCat === 'hot') hot += bBase;
    else cold += bBase;

    // 藏干：比例加权（戊→热，己→寒）
    pillar.hiddenStems.forEach((st, i) => {
      const hEl = STEM_ELEMENTS[st];
      const hw = w * 0.35 * (1 - i * 0.15);
      if (!hEl || hw <= 0) return;
      if (hEl === 'fire') hot += hw;
      else if (hEl === 'water') cold += hw;
      else if (hEl === 'wood') hot += hw * 0.5;
      else if (hEl === 'metal') cold += hw * 0.5;
      else if (st === '戊') hot += hw * 0.4;
      else cold += hw * 0.4;
    });
  });

  const total = hot + cold;
  return {
    hot: Math.max(0, Math.min(100, Math.round((hot / total) * 100))),
    cold: Math.max(0, Math.min(100, 100 - Math.round((hot / total) * 100))),
  };
}

// 盘内是否存在太极（《自然易鉴》：太极 = 用神根气 + 忌神有制 + 阴阳二气同显且有通道）
// 返回：是否存在太极 + 太极之吉凶等级 + 太极吉凶所得（结构化描述）
export function analyzeTaiJiInChart(
  chart: BaZiChart,
  monthQi: MonthQiResult,
  yongJi: YongJiResult,
  elementPower: { wood: number; fire: number; earth: number; metal: number; water: number },
  yinYangPct: { yang: number; yin: number },
): {
  exists: boolean;
  level: '真太极' | '半太极' | '假太极' | '无太极';
  taijiType: string;   // 直接描述"是什么太极"（如：丙癸太极、土克水太极、水克火太极等）
  jiXiong: '大吉' | '吉' | '平' | '凶' | '大凶';
  gain: string[];   // 太极之吉所得
  loss: string[];   // 太极之凶所失
  evidence: string[];
} {
  const pillars: Pillar[] = [chart.year, chart.month, chart.day, chart.hour];
  const pillarNames = ['年', '月', '日', '时'];
  void pillarNames; void yongJi; void yinYangPct;

  // ===== 基础表：元素 ↔ 五行中文名 =====
  const EL_NAME: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
  const STEM_EL: Record<string, string> = {
    甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth',
    庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
  };
  const BR_EL: Record<string, string> = {
    子: 'water', 丑: 'earth', 寅: 'wood', 卯: 'wood', 辰: 'earth', 巳: 'fire',
    午: 'fire', 未: 'earth', 申: 'metal', 酉: 'metal', 戌: 'earth', 亥: 'water',
  };

  // ===== A. 天干列表 + 地支列表 =====
  const stems = pillars.map(p => p.stem);      // 4 天干
  const branches = pillars.map(p => p.branch); // 4 地支
  const stemPairs: Array<{ a: string; b: string; ai: number; bi: number }> = [];
  for (let i = 0; i < stems.length; i++) for (let j = i + 1; j < stems.length; j++) {
    stemPairs.push({ a: stems[i], b: stems[j], ai: i, bi: j });
  }
  const branchPairs: Array<{ a: string; b: string; ai: number; bi: number }> = [];
  for (let i = 0; i < branches.length; i++) for (let j = i + 1; j < branches.length; j++) {
    branchPairs.push({ a: branches[i], b: branches[j], ai: i, bi: j });
  }

  // ===== B. 五行相克/相生定义（数据库《自然易鉴》吉凶基调和原文证据）=====
  // ke=主克/主生, bei=被克/被生；baseJi 依据原文
  type PairDef = {
    name: string;
    ke: string; bei: string;
    baseJi: '吉' | '凶' | '中';
    evidence: string;
  };
  const pairDefs: PairDef[] = [
    { name: '土克水太极', ke: 'earth', bei: 'water', baseJi: '吉', evidence: '止寒存温、定格局根基，春月/冬月尤其主吉（财库稳固、贵气有根）' },
    { name: '水克火太极', ke: 'water', bei: 'fire',  baseJi: '凶', evidence: '寒气否定阳气（火），破格伤富，夏月见之大凶（伤富源、精神头不足）' },
    { name: '火克金太极', ke: 'fire',  bei: 'metal', baseJi: '中', evidence: '夏月丙丁熔庚辛为燥（凶偏）；秋月丁火炼金为器（吉偏）' },
    { name: '金克木太极', ke: 'metal', bei: 'wood',  baseJi: '中', evidence: '春金克温（甲/乙）主凶；秋金得火成器、克木成材主吉' },
    { name: '木克土太极', ke: 'wood',  bei: 'earth', baseJi: '凶', evidence: '克财克印，泄温助寒；脾胃/不动产易受损，六亲缘分薄' },
    { name: '木生火太极', ke: 'wood',  bei: 'fire',  baseJi: '吉', evidence: '木温化火温，阳主富、财运事业易得提升（春月最吉）' },
    { name: '金生水太极', ke: 'metal', bei: 'water', baseJi: '吉', evidence: '金凉水润，秋/冬生水之源，阴气有根、不致燥热' },
    { name: '水生木太极', ke: 'water', bei: 'wood',  baseJi: '吉', evidence: '水寒养木温，冬/春月少阳生机得养（亥中甲木为小阳春）' },
    { name: '火生土太极', ke: 'fire',  bei: 'earth', baseJi: '中', evidence: '火暖土成，根基厚重；过则燥热伤阴' },
    { name: '土生金太极', ke: 'earth', bei: 'metal', baseJi: '吉', evidence: '土厚金藏，印星资财之源；辰戌丑未月见之为佳' },
  ];
  const pairMatch = (aEl: string, bEl: string): PairDef | null => {
    return pairDefs.find(p => (p.ke === aEl && p.bei === bEl) || (p.ke === bEl && p.bei === aEl)) || null;
  };

  // ===== C. 月令专属「天干对峙太极」：春丙癸、秋丁壬、夏庚丙、冬丙壬 =====
  // 取相制对峙两干：春月丙火布温与癸水余寒共存、秋月丁火余热与壬水新凉交汇、
  // 夏月庚凉制丙热（庚金为夏月第一用神）、冬月丙暖制壬寒（土止寒为根本、丙火为助）。
  // 注意与 NIAN_YUE_TAIJI_DEFS 的「救应太极」（夏庚癸、冬丙甲，供 analyzeNianYueTaiJi 使用）区分，
  // 两者分属天干对峙与月令气机两个分析层面，勿混为一谈。
  // 严格按用户要求：太极必须存在于「天干与天干」或「地支与地支」中；藏干仅作辅助证据
  type StemExclusive = {
    name: string; months: string[]; s1: string; s2: string;
    baseJi: '吉' | '凶' | '中';
    evidence: string;
  };
  const stemExclusiveDefs: StemExclusive[] = [
    {
      name: '丙癸太极', months: ['寅月', '卯月', '辰月'], s1: '丙', s2: '癸', baseJi: '吉',
      evidence: '春月核心：丙火布温、癸水余寒共存（寅卯辰月原文：「只需抓丙癸太极，平衡二气即断富贵」）',
    },
    {
      name: '丁壬太极', months: ['申月', '酉月', '戌月'], s1: '丁', s2: '壬', baseJi: '吉',
      evidence: '秋月核心：丁火余热、壬水新凉交汇（原文：「丁壬太极定格局，丁壬二气定吉凶」）',
    },
    {
      name: '庚丙太极', months: ['巳月', '午月', '未月'], s1: '庚', s2: '丙', baseJi: '吉',
      evidence: '夏月核心：庚凉调候，丙热被制；原文：「巳午未庚金为第一用神，平衡丙丁燥热」',
    },
    {
      name: '丙壬太极', months: ['亥月', '子月', '丑月'], s1: '丙', s2: '壬', baseJi: '吉',
      evidence: '冬月核心：丙火太阳暖寒，壬水当令寒极；暖寒交汇太极，原文：「冬不离丙，壬寒制火成局」',
    },
  ];

  // ===== D. 开始判定 =====
  type TaijiHit = {
    kind: '天干-天干' | '地支-地支' | '月令专属干支-天干对' | '月令专属干支-地支藏干对';
    name: string;
    baseJi: '吉' | '凶' | '中';
    evidence: string;
    weight: number; // 用于加权
  };
  const hits: TaijiHit[] = [];

  // D-1. 天干 ↔ 天干 五行成对太极（严格：四柱"天干"两两）
  for (const p of stemPairs) {
    const aEl = STEM_EL[p.a];
    const bEl = STEM_EL[p.b];
    const m = pairMatch(aEl, bEl);
    if (m) {
      hits.push({
        kind: '天干-天干',
        name: m.name,
        baseJi: m.baseJi,
        weight: 3,
        evidence: `【天干对】${pillarNames[p.ai]}干${p.a}（${EL_NAME[aEl]}）↔ ${pillarNames[p.bi]}干${p.b}（${EL_NAME[bEl]}）→ ${m.name}。说明：${m.evidence}`,
      });
    }
  }

  // D-2. 地支 ↔ 地支 五行成对太极（严格：四柱"地支"两两）
  for (const p of branchPairs) {
    const aEl = BR_EL[p.a];
    const bEl = BR_EL[p.b];
    const m = pairMatch(aEl, bEl);
    if (m) {
      hits.push({
        kind: '地支-地支',
        name: m.name,
        baseJi: m.baseJi,
        weight: 2,
        evidence: `【地支对】${pillarNames[p.ai]}支${p.a}（${EL_NAME[aEl]}）↔ ${pillarNames[p.bi]}支${p.b}（${EL_NAME[bEl]}）→ ${m.name}。说明：${m.evidence}`,
      });
    }
  }

  // D-3. 月令专属干支太极（最高优先级）—— 先看「天干↔天干」是否同时出现，否则退而看「藏干对」
  const want = stemExclusiveDefs.find(t => t.months.includes(monthQi.monthName));
  if (want) {
    const s1InStems = stems.includes(want.s1);
    const s2InStems = stems.includes(want.s2);
    if (s1InStems && s2InStems) {
      // 真·天干对
      hits.push({
        kind: '月令专属干支-天干对',
        name: want.name,
        baseJi: want.baseJi,
        weight: 6, // 最高权重
        evidence: `【月令专属·天干同现】${want.s1}${want.s2}于四柱天干中双双透出 → ${want.name}（真）。原文：${want.evidence}`,
      });
    } else {
      // 查地支藏干是否"两边都有气"（半太极）
      const HIDDEN: Record<string, string[]> = {
        子: ['癸'], 丑: ['己', '辛', '癸'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
        辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
        申: ['庚', '戊', '壬'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
      };
      const s1Hidden = branches.some(b => (HIDDEN[b] || []).includes(want.s1));
      const s2Hidden = branches.some(b => (HIDDEN[b] || []).includes(want.s2));
      if (s1Hidden && s2Hidden) {
        hits.push({
          kind: '月令专属干支-地支藏干对',
          name: want.name,
          baseJi: want.baseJi === '吉' ? '中' : want.baseJi, // 藏干版降一级权重
          weight: 3,
          evidence: `【月令专属·藏干有气】${want.s1}（${s1InStems ? '天干透出' : '藏干有气'}）· ${want.s2}（${s2InStems ? '天干透出' : '藏干有气'}）→ ${want.name}（半）。原文：${want.evidence}`,
        });
      }
    }
  }

  // ===== E. 元素力量加成：成对对峙力量 ≥7% 的做额外加权（只作为权重加成，不作为是否存在的依据）=====
  const ep = elementPower;
  for (const h of hits) {
    const m = pairDefs.find(p => p.name === h.name);
    if (!m) continue;
    const total = ep[m.ke as keyof typeof ep] + ep[m.bei as keyof typeof ep];
    if (total >= 20) h.weight += 1;
    if (total >= 40) h.weight += 1;
  }

  // ===== F. 去重（同名太极只保留最高权重一条） =====
  const byName = new Map<string, TaijiHit>();
  for (const h of hits) {
    const cur = byName.get(h.name);
    if (!cur || h.weight > cur.weight) byName.set(h.name, h);
  }
  const finalHits = Array.from(byName.values()).sort((a, b) => b.weight - a.weight);

  // ===== G. 判定证据（全部中文，不夹杂英文） =====
  const evidence: string[] = [];
  evidence.push(`月令：${monthQi.monthName}（${monthQi.solarTerm}），四象：${monthQi.fourSymbol}`);
  if (want) {
    const s1Has = stems.includes(want.s1) || branches.some(b => {
      const HIDDEN: Record<string, string[]> = {子:['癸'],丑:['己','辛','癸'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','戊','庚'],午:['丁','己'],未:['己','丁','乙'],申:['庚','戊','壬'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
      return (HIDDEN[b]||[]).includes(want.s1);
    });
    const s2Has = stems.includes(want.s2) || branches.some(b => {
      const HIDDEN: Record<string, string[]> = {子:['癸'],丑:['己','辛','癸'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','戊','庚'],午:['丁','己'],未:['己','丁','乙'],申:['庚','戊','壬'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
      return (HIDDEN[b]||[]).includes(want.s2);
    });
    if (!s1Has || !s2Has) {
      const miss: string[] = [];
      if (!stems.includes(want.s1)) miss.push(`${want.s1}天干未现`); else if (!s1Has) miss.push(`${want.s1}藏干也无`);
      if (!stems.includes(want.s2)) miss.push(`${want.s2}天干未现`); else if (!s2Has) miss.push(`${want.s2}藏干也无`);
      evidence.push(`【月令本该】${want.months.join('／')}应以「${want.name}」为核心真机；今${miss.length ? miss.join('、') : '二气相弱'}，故月令专属太极需降级看待`);
    }
  }
  if (finalHits.length === 0) {
    evidence.push('命局天干天干之间、地支地支之间，未形成明显的五行动克成对对峙；亦未满足月令专属干支太极的成立条件');
  } else {
    for (const h of finalHits.slice(0, 5)) evidence.push(h.evidence);
  }
  // 元素百分比做一条补充
  evidence.push(`五行占比：木${Math.round(ep.wood)}% 火${Math.round(ep.fire)}% 土${Math.round(ep.earth)}% 金${Math.round(ep.metal)}% 水${Math.round(ep.water)}%`);

  // ===== H. 综合吉凶判定（按权重累加）=====
  let ji = 0, xiong = 0;
  for (const h of finalHits) {
    if (h.baseJi === '吉') ji += h.weight;
    else if (h.baseJi === '凶') xiong += h.weight;
    else { ji += h.weight * 0.5; xiong += h.weight * 0.5; }
  }
  if (finalHits.length === 0) xiong += 3;

  let jiXiong: '大吉' | '吉' | '平' | '凶' | '大凶';
  const diff = ji - xiong;
  if      (diff >= 6) jiXiong = '大吉';
  else if (diff >= 2) jiXiong = '吉';
  else if (diff > -2) jiXiong = '平';
  else if (diff > -6) jiXiong = '凶';
  else                jiXiong = '大凶';

  // ===== I. level =====
  let level: '真太极' | '半太极' | '假太极' | '无太极' = '无太极';
  const hasExclusiveTrue = finalHits.some(h => h.kind === '月令专属干支-天干对');
  if      (finalHits.length === 0) level = '无太极';
  else if (hasExclusiveTrue && finalHits.length >= 2) level = '真太极';
  else if (finalHits.length >= 2) level = '半太极';
  else                            level = '假太极';

  // ===== J. taijiType（直接说"是什么太极"，不写等级） =====
  const names = finalHits.map(h => h.name).slice(0, 3);
  let taijiType: string;
  if (names.length === 0) taijiType = '无太极（命局天干地支未形成成对等峙）';
  else if (names.length === 1) taijiType = names[0];
  else taijiType = names.join(' · ');

  // ===== K. 吉凶所得 / 所失 =====
  const gain: string[] = [];
  const loss: string[] = [];
  if (jiXiong === '大吉') {
    gain.push('太极成局（含月令专属真机），富贵根基稳固，名利双收之象');
    gain.push('阴阳二气有制有化，身体康健、福寿绵长');
    gain.push('事业多遇贵人提挈，可成大器');
  } else if (jiXiong === '吉') {
    gain.push('太极成立，可保事业小成、衣食丰足');
    gain.push('健康平顺，无大灾大病');
    gain.push('关键节点常有转机，非死局');
  } else if (jiXiong === '平') {
    gain.push('吉凶互抵，一生稳中求进即可');
    loss.push('难得大富大贵，需步步为营');
  } else if (jiXiong === '凶') {
    loss.push('太极偏凶向：克战偏胜一方，易起破财、病痛、是非');
    loss.push('六亲助力有限，凡事多靠自己');
    loss.push('岁运失衡时容易出变故，宜守不宜攻');
  } else {
    loss.push('命局偏枯，太极不立：根基不稳');
    loss.push('健康易出问题，需重点养护');
    loss.push('事业财富难有大突破，需后天勤勉修德补命');
  }
  // 个性化条目
  if (finalHits.some(h => h.name === '土克水太极')) gain.push('土克水为吉：止寒救阳，财库稳固、贵气有根');
  if (finalHits.some(h => h.name === '木生火太极')) gain.push('木生火为吉：木温化火温，阳主富、财运事业易得提升');
  if (finalHits.some(h => h.name === '丙癸太极'))   gain.push('丙癸太极成立：春月核心真机已备，丙无伤则富、癸无伤则贵');
  if (finalHits.some(h => h.name === '丁壬太极'))   gain.push('丁壬太极成立：秋余热与新凉交汇得体，格局层次清晰');
  if (finalHits.some(h => h.name === '庚丙太极'))   gain.push('庚丙太极成立：夏月调候真机（庚凉制丙热），富贵有凭');
  if (finalHits.some(h => h.name === '丙壬太极'))   gain.push('丙壬太极成立：冬月暖寒交汇，丙暖有根则贵、壬寒有制则富');
  if (finalHits.some(h => h.name === '水克火太极')) loss.push('水克火为凶：寒气否定阳气（火），易伤富源、精神头不足');
  if (finalHits.some(h => h.name === '木克土太极')) loss.push('木克土为凶：克财克印，脾胃/不动产易受损，六亲缘分薄');

  return { exists: level !== '无太极', level, taijiType, jiXiong, gain, loss, evidence };
}

// 特别提示：条目式行动提示——每条 = 类别 + 一句话结论 + 可操作提醒 + 出处
// 只保留对命主「该怎么办」有直接指导意义的条目，避免与月气/用忌版块重复堆砌长文
export interface SpecialTip {
  level: '吉' | '平' | '凶' | '关键';
  category: string;   // 类别标签（月令真机 / 命局模式 / 日柱取象 / 用忌态势 / 岁运提醒）
  conclusion: string; // 一句话结论
  action: string;     // 可操作提醒（注意什么、往哪个方向用力）
  source: string;
}

export function extractSpecialTips(
  chart: BaZiChart,
  monthQi: MonthQiResult,
  yongJi: YongJiResult,
  pattern: { patternType: string; description: string },
  jiaziPillars: { ganzhi: string; coreMeaning: string }[] | null,
): SpecialTip[] {
  const tips: SpecialTip[] = [];
  const usefulNames = yongJi.usefulElements.map(elementName).join('、');
  const tabooNames = yongJi.tabooElements.map(elementName).join('、');

  // 1. 月令真机——一生取用的总纲
  tips.push({
    level: '关键',
    category: '月令真机',
    conclusion: `${monthQi.monthName}（${monthQi.solarTerm}）月令规定：${monthQi.coreXiJi}`,
    action: `一生顺用神（${usefulNames || '见月令'}）之气则吉，顺忌神（${tabooNames || '见月制衡'}）之气则凶；择业、方位、颜色、岁运进退皆以「扶用抑忌」为第一准绳。`,
    source: '《自然易鉴》四象月令核心喜忌',
  });

  // 2. 命局模式——格局层次判断
  const patternLevel: '吉' | '平' | '凶' | '关键' =
    pattern.patternType.includes('上等') ? '吉'
    : pattern.patternType.includes('忌神') ? '凶'
    : pattern.patternType.includes('平衡') ? '吉'
    : '平';
  tips.push({
    level: patternLevel,
    category: '命局模式',
    conclusion: `命局成「${pattern.patternType}」：${pattern.description}`,
    action: patternLevel === '吉'
      ? '格局根基得力，可在用神方向上积极进取，逢用神岁运放大成果。'
      : patternLevel === '凶'
      ? '忌神主导之处为一生破口，凡事预留退路，逢忌神引动之岁运宜守不宜攻。'
      : '格局吉凶参半，成事靠岁运引动与后天选择，顺用神方向稳步积累。',
    source: '命局模式分析',
  });

  // 3. 日柱本气——命主自身的核心象义
  if (jiaziPillars && jiaziPillars.length > 0) {
    const dayGZ = `${chart.day.stem}${chart.day.branch}`;
    const match = jiaziPillars.find((p) => p.ganzhi === dayGZ);
    if (match) {
      tips.push({
        level: '关键',
        category: '日柱取象',
        conclusion: `日柱${dayGZ}本气释义：${match.coreMeaning}`,
        action: '日柱为命主与配偶宫之根本，上述取象是自身禀赋与婚姻状态的主线，宜据此扬长补短。',
        source: '六十甲子·日柱本气',
      });
    }
  }

  // 4. 用忌态势——命局内力的多寡
  const youShenCount = Object.values(yongJi.stemMarks).filter((v) => v === 'useful').length
    + Object.values(yongJi.branchMarks).filter((v) => v === 'useful').length;
  const jiShenCount = Object.values(yongJi.stemMarks).filter((v) => v === 'taboo').length
    + Object.values(yongJi.branchMarks).filter((v) => v === 'taboo').length;
  if (youShenCount >= 4) {
    tips.push({
      level: '吉',
      category: '用忌态势',
      conclusion: `用神显达：命局干支共 ${youShenCount} 处得用神气机，自身助力充足。`,
      action: '做事多得天时地利人和，可顺大势进取；逢用神岁运大胆作为，勿自耗福。',
      source: '用神判断',
    });
  } else if (jiShenCount >= 5) {
    tips.push({
      level: '凶',
      category: '用忌态势',
      conclusion: `忌神偏盛：命局干支共 ${jiShenCount} 处为忌神气机，破口较多。`,
      action: '易有小人、破财、病痛等烦恼；凡事宜守不宜攻，逢忌神岁运提前减杠杆、重养生。',
      source: '用神判断',
    });
  } else {
    tips.push({
      level: '平',
      category: '用忌态势',
      conclusion: `用神 ${youShenCount} 处、忌神 ${jiShenCount} 处，命局内力吉凶大致均衡。`,
      action: '一生得失主要看岁运引动：提前掌握用神/忌神流年节奏，逢吉发力、逢凶蛰伏。',
      source: '用神判断',
    });
  }

  return tips;
}

// 日干支动应分析
export function analyzeDayStemBranch(chart: BaZiChart, yongJi: YongJiResult): {
  dayMasterNature: string;
  dayMasterElement: string;
  dayMasterYinYang: 'yin' | 'yang';
  taijiState: string;
  directReading: string;
  balanceEffect: 'positive' | 'negative' | 'weak';
} {
  const day = chart.day;
  const stemElement = day.stemElement;
  const branchElement = day.branchElement;

  // 日主性质（《自然易鉴》第五章第二节十干真义）
  const stemNatureMap: Record<string, string> = {
    wood: day.stemYinYang === 'yang'
      ? '甲木为阳木，参天大树、栋梁之木，少阳阳气。得令得地为栋梁之才，胸怀大志、格局开阔、能担大任；虚浮无根则眼高手低、心高气傲、有志难伸'
      : '乙木为阴木，花草藤蔓、柔顺之木。得用聪慧灵巧、人缘极佳、善于借力、稳中求富；失用优柔寡断、软弱纠结、依附他人、难成大器',
    fire: day.stemYinYang === 'yang'
      ? '丙火为阳火，太阳烈火、普照之火，老阳纯阳。得令气场强大、光明磊落、贵人云集、名利双收、福寿双全；失用张扬急躁、刚愎自用、是非缠身、起伏极大'
      : '丁火为阴火，灯火烛光、温润之火。得用心思缜密、温文尔雅、才华内敛、技艺傍身、稳步致富；失用自卑怯懦、才华埋没、心力不足、运势低迷',
    earth: day.stemYinYang === 'yang'
      ? '戊土为阳土，高山厚土、城墙之土。得地忠厚踏实、格局厚重、聚财守福、根基稳固、一生安稳富贵；失用固执愚钝、封闭保守、不思变通、财运阻滞'
      : '己土为阴土，田园湿土、温润之土。得用心思细腻、踏实肯干、善于积累、家庭和睦、福禄绵长；失用消极纠结、心胸狭隘、多思多虑、琐事缠身',
    metal: day.stemYinYang === 'yang'
      ? '庚金为阳金，刀剑矿石、刚硬之金。得炼杀伐有度、智勇双全、执行力强、事业有成、掌权得势；失用刚硬刻薄、争强好胜、冲动惹祸、刑伤不断'
      : '辛金为阴金，珠宝首饰、精致之金。得用气质高雅、心思缜密、才华出众、名利兼得、人缘优越；失用敏感多疑、虚荣狭隘、自我内耗、难得顺遂',
    water: day.stemYinYang === 'yang'
      ? '壬水为阳水，江河湖海、浩荡之水，老阴完整单位，为寒之极。得地格局开阔、聪慧机敏、善于变通、机遇良多、富贵可期；失用漂浮不定、意志薄弱、贪多无成、破财耗福'
      : '癸水为阴水，雨露溪流、温润之水。得用心思缜密、谋划周全、低调聚财、智慧过人、一生平稳有福；失用消极多疑、悲观自卑、体弱多疾、运势低迷',
  };

  // 太极状态
  const getElementShengKe = (a: string, b: string): string => {
    const sheng: Record<string, string> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
    const ke: Record<string, string> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
    if (a === b) return '同气';
    if (sheng[a] === b) return '干生支';
    if (sheng[b] === a) return '支生干';
    if (ke[a] === b) return '干克支（盖头）';
    if (ke[b] === a) return '支克干（截脚）';
    return '相互作用';
  };

  const relation = getElementShengKe(stemElement, branchElement);
  const taijiState = `日柱${day.stem}${day.branch}为一太极：天干${elementName(stemElement)}${day.stemYinYang === 'yang' ? '阳' : '阴'}，地支${elementName(branchElement)}${day.branchYinYang === 'yang' ? '阳' : '阴'}。干支关系为「${relation}」，体现${getRelationMeaning(relation)}。`;

  // 直读
  const directReading = getDirectReading(day.stem, day.branch, chart.gender);

  // 平衡作用
  const stemIsUseful = yongJi.stemMarks['日干'] === 'useful';
  const branchIsUseful = yongJi.branchMarks['日支'] === 'useful';
  let balanceEffect: 'positive' | 'negative' | 'weak';
  if (stemIsUseful && branchIsUseful) balanceEffect = 'positive';
  else if (!stemIsUseful && !branchIsUseful) balanceEffect = 'negative';
  else balanceEffect = 'weak';

  return {
    dayMasterNature: stemNatureMap[stemElement] || '',
    dayMasterElement: stemElement,
    dayMasterYinYang: day.stemYinYang,
    taijiState,
    directReading,
    balanceEffect,
  };
}

const elementName = (el: string): string => {
  const map: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
  return map[el] || el;
};

const getRelationMeaning = (relation: string): string => {
  const map: Record<string, string> = {
    '同气': '干支一气，力量集中，该五行强盛',
    '干生支': '天干生地支，动中生静，来源引导落实',
    '支生干': '地支生天干，静中生动，落实支持来源',
    '干克支（盖头）': '天干克地支，盖头之象，来源否定落实',
    '支克干（截脚）': '地支克天干，截脚之象，落实否定来源',
    '相互作用': '干支相互作用，形成独特太极状态',
  };
  return map[relation] || '';
};

const getDirectReading = (stem: string, branch: string, gender: string): string => {
  // 简化直读：基于 60 甲子直读口诀
  const readings: Record<string, string> = {
    '甲子': '木坐水上，聪明灵秀，水木清华，学业有成',
    '甲戌': '木坐土上，木克土为财，财务之事，肠胃之疾',
    '甲申': '木坐金上，金克木伤，官杀压身，压力重重',
    '甲午': '木坐火上，木火通明，文章学业，名声远扬',
    '甲辰': '木坐湿土，培木之基，事业稳进，家财渐丰',
    '甲寅': '木坐木上，干支一气，身强气盛，独立自主',
    '乙丑': '木坐湿土，财库之象，理财有道，积蓄颇丰',
    '乙亥': '木坐水上，水生木旺，智慧生发，贵人相助',
    '乙酉': '木坐金上，七杀当头，果敢勇毅，但易受伤',
    '乙未': '木坐土上，食神生财，技艺谋生，财源不绝',
    '乙巳': '木坐火上，伤官吐秀，聪明多才，技艺精湛',
    '乙卯': '木坐木上，干支一气，性格刚毅，独立自主',
    '丙子': '火坐水上，水火既济，官星清透，贵气显现',
    '丙寅': '火坐木上，木火相生，印星护身，学业事业',
    '丙辰': '火坐土上，食神生财，才华横溢，事业发展',
    '丙午': '火坐火上，干支一气，阳刚热烈，性情豪爽',
    '丙申': '火坐金上，财星在支，求财欲望，经济头脑',
    '丙戌': '火坐土上，火土相生，食伤生财，事业有成',
    '丁丑': '火坐湿土，食神生财，细水长流，稳扎稳打',
    '丁卯': '火坐木上，印星生身，文采飞扬，学业优秀',
    '丁巳': '火坐火上，干支一气，热情奔放，积极向上',
    '丁未': '火坐土上，食神生财，技艺得财，名声渐起',
    '丁酉': '火坐金上，财星在支，求财有心，理财能力',
    '丁亥': '火坐水上，官星得位，贵气暗藏，事业前景',
    '戊子': '土坐水上，财星在支，偏财之命，投资机遇',
    '戊寅': '土坐木上，木克土官，官星压身，事业压力',
    '戊辰': '土坐土上，干支一气，厚重稳健，事业有成',
    '戊午': '土坐火上，火生土旺，印星护身，贵人扶持',
    '戊申': '土坐金上，土生金泄，食神生财，聪明智慧',
    '戊戌': '土坐土上，干支一气，厚重如山，财运丰厚',
    '己丑': '土坐土上，干支一气，踏实稳重，蓄势待发',
    '己卯': '土坐木上，官星克身，事业压力，责任心强',
    '己巳': '土坐火上，印星生身，文明好学，事业稳定',
    '己未': '土坐土上，干支一气，沉稳内敛，厚积薄发',
    '己酉': '土坐金上，食神泄秀，聪明多才，技艺出众',
    '己亥': '土坐水上，财星在支，理财有道，经济头脑',
    '庚子': '金坐水上，伤官泄秀，聪明伶俐，才艺出众',
    '庚寅': '金坐木上，财星在支，求财有道，商业头脑',
    '庚辰': '金坐土上，印星生身，贵人相助，事业发展',
    '庚午': '金坐火上，官星克身，事业压力，权柄在握',
    '庚申': '金坐金上，干支一气，刚健果断，独立自主',
    '庚戌': '金坐土上，印星生身，稳重踏实，步步为营',
    '辛丑': '金坐土上，印星生身，积蓄力量，稳步上升',
    '辛卯': '金坐木上，财星在支，偏财之命，经济机遇',
    '辛巳': '金坐火上，官星克身，事业压力，管理才能',
    '辛未': '金坐土上，印星生身，贵人扶持，文才出众',
    '辛酉': '金坐金上，干支一气，清贵之命，精致细腻',
    '辛亥': '金坐水上，伤官泄秀，聪明睿智，才华横溢',
    '壬子': '水坐水上，干支一气，智慧如海，流动不息',
    '壬寅': '水坐木上，食伤泄秀，聪明才智，事业发展',
    '壬辰': '水坐土上，土克水官，事业压力，管理能力',
    '壬午': '水坐火上，财星在支，理财能力，求财欲望',
    '壬申': '水坐金上，印星生身，贵人相助，智慧通达',
    '壬戌': '水坐土上，土克水官，事业责任，稳重务实',
    '癸丑': '水坐湿土，官杀混杂，压力与机遇并存',
    '癸卯': '水坐木上，食伤泄秀，文才出众，聪明灵秀',
    '癸巳': '水坐火上，财星在支，生财有道，经济头脑',
    '癸未': '水坐土上，官星克身，事业压力，责任心强',
    '癸酉': '水坐金上，印星生身，贵人扶持，学业优秀',
    '癸亥': '水坐水上，干支一气，智慧深沉，灵活应变',
  };
  const key = stem + branch;
  return readings[key] || `日柱${stem}${branch}，${elementName(STEM_ELEMENTS[stem])}${elementName(BRANCH_ELEMENTS[branch])}之组合，自有其独特象意。`;
};

// 命局模式分析
// 重写评价标准（《太极阴阳法》）：年为格局根本，年月组合构成命局核心太极，格局基调以年月太极三态为首判；
// 十神不参与格局吉凶判定，仅以阴阳二气的存缺、损伤、平衡状态为唯一依据
export function analyzeMingJuPattern(chart: BaZiChart, monthQi: MonthQiResult, yongJi: YongJiResult): {
  mainShengKe: string[];
  patternType: string;
  description: string;
  nianYueTaiJi: NianYueTaiJiResult;
} {
  const pillars = [chart.year, chart.month, chart.day, chart.hour];
  const pillarNames = ['年', '月', '日', '时'];
  const shengKeList: string[] = [];

  // 分析主要生克关系（干与干、支与支之间）
  const shengMap: Record<string, string> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
  const keMap: Record<string, string> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

  // 天干之间的生克
  const stems = pillars.map((p) => p.stemElement);
  const stemChars = pillars.map((p) => p.stem);
  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      if (shengMap[stems[i]] === stems[j]) {
        shengKeList.push(`${pillarNames[i]}干${stemChars[i]}生${pillarNames[j]}干${stemChars[j]}`);
      } else if (keMap[stems[i]] === stems[j]) {
        shengKeList.push(`${pillarNames[i]}干${stemChars[i]}克${pillarNames[j]}干${stemChars[j]}`);
      }
    }
  }

  // 判断模式类型（新标准：年月太极为根本，五行生克为辅助）
  let patternType: string;
  let description: string;

  const usefulCount = Object.values(yongJi.stemMarks).filter((v) => v === 'useful').length
    + Object.values(yongJi.branchMarks).filter((v) => v === 'useful').length;
  const tabooCount = Object.values(yongJi.stemMarks).filter((v) => v === 'taboo').length
    + Object.values(yongJi.branchMarks).filter((v) => v === 'taboo').length;
  const fsMeta = FOUR_SYMBOL_META[monthQi.fourSymbol];

  // 年月太极定格局根本（《太极阴阳法》：所有格局分析必须追溯年太极核心，月气仅提供当月阴阳平衡规则）
  const nianYueTaiJi = analyzeNianYueTaiJi(chart, monthQi, yongJi);
  const shengKeText = shengKeList.length > 0
    ? `命局主要干支作用：${shengKeList.slice(0, 4).join('；')}。`
    : '命局干支生克关系平缓，以气机流转为主。';
  const yueLingText = `${monthQi.fourSymbol}月令真机：${fsMeta.coreMantra}。`;

  if (nianYueTaiJi.state === '两仪完整') {
    patternType = '年月太极成局（上等）';
    description = `【${patternType}】年月构成核心太极「${nianYueTaiJi.taijiName}」，两仪保全：阳仪「${nianYueTaiJi.yangYi.stem}」气机彰显、阴仪「${nianYueTaiJi.yinYi.stem}」有根无伤。${nianYueTaiJi.verdict}${shengKeText}${yueLingText}此格局以年月太极定根基，日时行维护之责则富贵可期。`;
  } else if (nianYueTaiJi.state === '两仪受损') {
    patternType = '年月太极受损（中平）';
    description = `【${patternType}】年月核心太极「${nianYueTaiJi.taijiName}」两仪受损：${nianYueTaiJi.yangYi.power < 50 ? `阳仪「${nianYueTaiJi.yangYi.stem}」气机偏弱` : `阴仪「${nianYueTaiJi.yinYi.stem}」气机受抑`}，格局根基未绝但成色减损。${nianYueTaiJi.verdict}${shengKeText}${yueLingText}格局高低取决于日时能否补救受损之一仪，岁运补缺则转机现。`;
  } else if (nianYueTaiJi.state === '两仪绝境') {
    patternType = '年月太极绝境（偏枯）';
    description = `【${patternType}】年月核心太极「${nianYueTaiJi.taijiName}」两仪绝境，阴阳隔绝、格局偏枯。${nianYueTaiJi.verdict}${shengKeText}${yueLingText}此命富贵根基薄弱，最需日时、岁运大力度救助，后天修身立德尤为关键。`;
  } else if (shengKeList.length >= 5) {
    patternType = '生克模式';
    description = `命局中生克关系复杂，五行之间相互作用频繁。主要变化方式以五行生克为主导，体现为明显的制化关系。吉凶得失通过生克作用链条来判断，动应哪个五行就引动对应的生克链条。${nianYueTaiJi.verdict}${yueLingText}`;
  } else if (Math.abs(usefulCount - tabooCount) <= 2) {
    patternType = '平衡模式';
    description = `命局用神忌神力量相对均衡，整体以阴阳平衡为主要变化方式。用神与忌神相互制约，保持命局动态平衡。运年助用则吉，助忌则凶，平衡为吉，失衡为凶。${nianYueTaiJi.verdict}${yueLingText}`;
  } else if (usefulCount > tabooCount) {
    patternType = '得用模式（偏上等）';
    description = `命局用神多于忌神，用神有力且无大破损。对应《自然易鉴》格局判定：月令得气、阴阳基本均衡——上等格局特征（富贵双全、福寿绵长）的基础。${nianYueTaiJi.verdict}${yueLingText}`;
  } else {
    patternType = '得失模式（忌神偏盛）';
    description = `命局忌神稍占上风，主要变化方式为得失模式。得用神之助或制忌神之喜，为命局主要得吉方式；反之则为得凶方式。整体格局高低，取决于《自然易鉴》三大要点：月令气机是否纯粹、阴阳水火是否平衡、全局气机是否流通。${nianYueTaiJi.verdict}`;
  }

  return {
    mainShengKe: shengKeList.slice(0, 6), // 取前6条主要关系
    patternType,
    description,
    nianYueTaiJi,
  };
}

// 富贵贫贱判断（新格局评分标准：0-100 纯数值打分，金字塔分布）
export function analyzeWealthNobility(
  chart: BaZiChart,
  monthQi: MonthQiResult,
  yongJi: YongJiResult,
  elementPower: { wood: number; fire: number; earth: number; metal: number; water: number },
  nianYueTaiJi?: NianYueTaiJiResult,
): {
  wealthScore: number;    // 财富分（0-100）
  wealthLevel: string;    // 财富档位（保留文案方便 UI）
  wealthDesc: string;
  nobilityScore: number;  // 贵寿分（0-100）
  nobilityLevel: string;  // 贵寿档位（保留文案方便 UI）
  nobilityDesc: string;
  overallScore: number;   // 格局综合分（0-100，金字塔分布）
  overallLevel: string;   // 综合档位（保留旧五档名兼容，UI 可优先用分数）
  overallDesc: string;
} {
  // 阳气状态→财富程度（木火为阳气，主富）
  const yangPower = elementPower.wood + elementPower.fire;
  // 阴气状态→贵寿程度（金水为阴气，主贵寿）
  const yinPower = elementPower.metal + elementPower.water;
  // 阴阳力量差（取绝对值）
  const powerDiff = Math.abs(yangPower - yinPower);
  // 用神（月气指定需要补足的那一边）力量
  const yongShenPower = monthQi.usageDirection === 'yin' ? yinPower : yangPower;
  // 月气当令那一边的力量
  const dangLingPower = monthQi.usageDirection === 'yin' ? yangPower : yinPower;
  // 阴阳二气「显现」阈值判断
  const yangApparent = yangPower >= 15;          // 阳有显现
  const yangStronglyApparent = yangPower >= 28;  // 阳充分显现
  const yinApparent = yinPower >= 15;            // 阴有显现
  const yinStronglyApparent = yinPower >= 28;    // 阴充分显现
  const yangAlmostInvisible = yangPower < 8;     // 阳几乎隐形
  const yinAlmostInvisible = yinPower < 8;       // 阴几乎隐形
  const yangTotallyInvisible = yangPower <= 3;   // 阳彻底消失
  const yinTotallyInvisible = yinPower <= 3;     // 阴彻底消失

  // 气息是否冲突：
  let qiConflict: '无冲突' | '微冲突' | '明显冲突' | '严重冲突';
  if (powerDiff >= 55 || yangTotallyInvisible || yinTotallyInvisible || yongShenPower < 6) {
    qiConflict = '严重冲突';
  } else if (powerDiff > 45 || yongShenPower < 12) {
    qiConflict = '明显冲突';
  } else if (powerDiff > 25 || yongShenPower < 20) {
    qiConflict = '微冲突';
  } else {
    qiConflict = '无冲突';
  }

  // ================ 财富分（0-100）：基础分 50，按阳气力量与用神情况浮动 ================
  let wealthScore: number;
  let wealthLevel: string;
  let wealthDesc: string;
  if (monthQi.usageDirection === 'yin') {
    // 阳气旺（当令），财富基础好：阳 55→96，阳 35→76，阳 0→30
    if (yangPower >= 55) {
      wealthScore = 90 + Math.min(10, Math.round((yangPower - 55) * 0.4));
      wealthLevel = '富';
    } else if (yangPower >= 35) {
      wealthScore = 70 + Math.round((yangPower - 35) / (55 - 35) * 20); // 70~90
      wealthLevel = '小康';
    } else if (yangPower >= 15) {
      wealthScore = 50 + Math.round((yangPower - 15) / (35 - 15) * 20); // 50~70
      wealthLevel = '小康偏下';
    } else {
      wealthScore = Math.max(10, 30 + Math.round((yangPower - 15) * 1.2)); // 10~50
      wealthLevel = '贫';
    }
  } else {
    // 阴气旺（当令），阳气为用神：用神得力则高分
    if (yangPower >= 35) {
      wealthScore = 75 + Math.min(15, Math.round((yangPower - 35) * 0.5)); // 75~90
      wealthLevel = '小康';
    } else if (yangPower >= 20) {
      wealthScore = 58 + Math.round((yangPower - 20) / (35 - 20) * 17); // 58~75
      wealthLevel = '小康偏下';
    } else if (yangPower >= 10) {
      wealthScore = 40 + Math.round((yangPower - 10) / (20 - 10) * 18); // 40~58
      wealthLevel = '偏贫';
    } else {
      wealthScore = Math.max(8, 40 - Math.round((10 - yangPower) * 2.5)); // 8~40
      wealthLevel = '贫';
    }
  }
  wealthScore = Math.max(0, Math.min(100, wealthScore));
  const wealthScoreText = `【${wealthScore}分】`;
  wealthDesc = `${wealthScoreText} 阳气(木火)${yangPower}% — ${
    wealthScore >= 85 ? '财气旺盛、物质基础扎实，命局自带富贵之基，求财相对易得，资源丰厚。'
    : wealthScore >= 70 ? '财运中上，小康无忧，经营得当可稳步积累，生活富足。'
    : wealthScore >= 60 ? '财运一般，稳步求进可保衣食无忧，宜积蓄节制不宜冒进。'
    : wealthScore >= 45 ? '财运偏弱，求财需付出更多努力，宜以技艺立身，忌投机冒险。'
    : '财运较薄，求财辛苦，容易因财生灾，宜守不宜攻，以稳为主、勤勉积福。'
  }`;

  // ================ 贵寿分（0-100）：基础分 50，按阴气力量与用神情况浮动 ================
  let nobilityScore: number;
  let nobilityLevel: string;
  let nobilityDesc: string;
  if (monthQi.usageDirection === 'yang') {
    // 阴气旺（当令），贵寿基础好：阴 50→95，阴 30→72，阴 0→28
    if (yinPower >= 50) {
      nobilityScore = 88 + Math.min(12, Math.round((yinPower - 50) * 0.5));
      nobilityLevel = '贵寿';
    } else if (yinPower >= 30) {
      nobilityScore = 68 + Math.round((yinPower - 30) / (50 - 30) * 20); // 68~88
      nobilityLevel = '平常';
    } else if (yinPower >= 15) {
      nobilityScore = 50 + Math.round((yinPower - 15) / (30 - 15) * 18); // 50~68
      nobilityLevel = '平常';
    } else {
      nobilityScore = Math.max(12, 32 + Math.round((yinPower - 15) * 1.3)); // 12~50
      nobilityLevel = '夭';
    }
  } else {
    // 阳气旺（当令），阴气为用神
    if (yinPower >= 30) {
      nobilityScore = 74 + Math.min(16, Math.round((yinPower - 30) * 0.5)); // 74~90
      nobilityLevel = '贵';
    } else if (yinPower >= 15) {
      nobilityScore = 56 + Math.round((yinPower - 15) / (30 - 15) * 18); // 56~74
      nobilityLevel = '平常';
    } else if (yinPower >= 8) {
      nobilityScore = 40 + Math.round((yinPower - 8) / (15 - 8) * 16); // 40~56
      nobilityLevel = '偏弱';
    } else {
      nobilityScore = Math.max(10, 40 - Math.round((8 - yinPower) * 3)); // 10~40
      nobilityLevel = '夭';
    }
  }
  nobilityScore = Math.max(0, Math.min(100, nobilityScore));
  const nobilityScoreText = `【${nobilityScore}分】`;
  nobilityDesc = `${nobilityScoreText} 阴气(金水)${yinPower}% — ${
    nobilityScore >= 85 ? '贵气深厚，寿命绵长。社会地位较高，名声好，受人尊敬，健康长寿。'
    : nobilityScore >= 70 ? '贵气不错，事业有位可得，名声良好，健康方面注意节制即可。'
    : nobilityScore >= 60 ? '贵气中等，事业平稳，职位不高但稳定，健康总体尚可，需靠个人努力。'
    : nobilityScore >= 45 ? '贵气偏弱，健康需要注意保养，事业地位一般，宜循序渐进。'
    : '寿元有损，身体底子较弱，需特别注意养生，忌过度操劳，定期检查调养。'
  }`;

  // ================ 格局综合分 overallScore（0-100，金字塔分布） ================
  // 设计目标：高分极难（S+ 仅约 0.1%），S 也稀少；大部分命盘落在 35~75 的中间带。
  // 采用「乘性压制」：多个条件必须同时满足才能逼近满分，避免"加性堆分"导致人人满分。
  // 1) 阴阳平衡分（0-55）：balanceRatio = 1 - |阳-阴|/100，幂次 3 放大"完美平衡"的稀有性
  const balanceRatio = Math.max(0, 1 - powerDiff / 100);
  const balanceScore = 55 * Math.pow(balanceRatio, 3);
  // 2) 用神力量分（0-25）：用神占比，幂次 2（用神极旺才得高分）
  const yongRatio = Math.max(0, Math.min(1, yongShenPower / 100));
  const yongScore = 25 * Math.pow(yongRatio, 2);
  // 3) 气息冲突分（0-20）
  let conflictScore: number;
  if (qiConflict === '无冲突') conflictScore = 20;
  else if (qiConflict === '微冲突') conflictScore = 12;
  else if (qiConflict === '明显冲突') conflictScore = 5;
  else conflictScore = 0;
  let overallScore = Math.round(balanceScore + yongScore + conflictScore);

  // 年月太极修正（纯数值加减 ±12）：两仪完整加分、两仪绝境扣分
  let taijiNote = '';
  if (nianYueTaiJi) {
    const t = nianYueTaiJi;
    if (t.state === '两仪完整') {
      const delta = Math.min(12, Math.round(12 - overallScore / 15)); // 越高分加越少，防溢出
      overallScore = Math.min(100, overallScore + delta);
      taijiNote = `年月太极：${t.taijiName}（两仪完整，综合分 +${delta}）。${t.verdict}`;
    } else if (t.state === '两仪绝境') {
      const delta = Math.min(18, Math.round(10 + overallScore / 20)); // 越低分扣越狠
      overallScore = Math.max(0, overallScore - delta);
      taijiNote = `年月太极：${t.taijiName}（两仪绝境，综合分 −${delta}）。${t.verdict}`;
    } else {
      taijiNote = `年月太极：${t.taijiName}（${t.state}）。${t.verdict}`;
    }
  }
  overallScore = Math.max(0, Math.min(100, overallScore));

  // 综合档位（兼容旧命名，UI 可直接用 overallScore 渲染进度条；随新分布收紧）
  let overallLevel: string;
  if (overallScore >= 90) overallLevel = '夯';
  else if (overallScore >= 72) overallLevel = '人上人';
  else if (overallScore >= 60) overallLevel = 'npc';
  else if (overallScore >= 36) overallLevel = '拉';
  else overallLevel = '拉完了';

  const apparentReport = `阳气(木火)${yangPower}%，阴气(金水)${yinPower}%，月气当令${monthQi.usageDirection === 'yin' ? '阳' : '阴'}，需补${monthQi.usageDirection === 'yin' ? '阴(金水)' : '阳(木火)'}用神力量${yongShenPower}%，气息${qiConflict}`;

  const overallScoreText = `【${overallScore}分】`;
  let overallDescHead = '';
  if (overallScore >= 90) overallDescHead = '阴阳二气俱足且充分显现，气息无冲突，水火既济之象。气机从心所欲不逾矩，能量密度极大，稳得住、顶得起、扛得下，事业家庭财富健康皆可夯实到底。';
  else if (overallScore >= 80) overallDescHead = '阴阳二气皆活、互根互用，可上可下、可进可退；做事有章法、处世有余地，在人群中天然压得住场面、拿得到资源。主出身不差、努力有回报、贵人有支撑。';
  else if (overallScore >= 70) overallDescHead = '阴阳二气都有显现，气息基本不冲突，用神可调度。事业稳步向上，生活层次中上。';
  else if (overallScore >= 60) overallDescHead = '阴阳二气一显一弱，但弱的一方没有彻底隐形；气息有拉扯，不至于崩塌。属于"饿不死也翻不了天"的平常之命，按部就班、随大流走，靠平台/家庭/时代红利度日。';
  else if (overallScore >= 45) overallDescHead = '阴阳二气略有失衡，气息有冲突。命局能量被单边拽着走，做事两头不讨好、进退两难。财富健康事业会有一项持续偏低，宜修身养性、勤勉积累。';
  else if (overallScore >= 30) overallDescHead = '阴阳二气有一边几乎隐形，气息明显冲突。人生多有"想做做不成、想放放不下"的拉扯感，宜守不宜攻，多积德行善、养气修身以待天时。';
  else overallDescHead = '阴阳二气一边彻底隐形，或气息严重冲战到隔绝，偏枯至极。气机堵塞、能量枯竭、用神无依、忌神横行。需要比常人付出数倍的修身立德、积善养气、勤勉精进，方能转圜。';

  const overallDesc = `${overallScoreText} ${overallDescHead} ${apparentReport}。${taijiNote ? taijiNote : ''}`;

  return {
    wealthScore, wealthLevel, wealthDesc,
    nobilityScore, nobilityLevel, nobilityDesc,
    overallScore, overallLevel, overallDesc,
  };
}

// 七大项分析
export function analyzeSevenCategories(
  chart: BaZiChart,
  monthQi: MonthQiResult,
  yongJi: YongJiResult,
  elementPower: { wood: number; fire: number; earth: number; metal: number; water: number },
): {
  yinYang: string;
  fiveElements: string;
  ganzhi: string;
  gongwei: string;
  shiShen: string;
  interaction: string;
} {
  // 阴阳二气（融合《自然易鉴》第三章第四节·阴阳对应人事万象：心性/事业/健康/祸福）
  // 土不再作为中性第三元：木火与燥土（戊未戌）归阳，金水与湿土（己丑辰）归阴
  const { yang: yangPower, yin: yinPower } = calculateYinYangBalance(chart);

  // 对应心性（第三章第四节·一）
  const xinXing = yangPower >= yinPower
    ? (monthQi.usageDirection === 'yin'
        ? '阳旺本当令（老阳/夏月），阳燥无制则急躁冲动、刚愎自用、张扬跋扈、容易得罪人；若得阴气（金水）平衡，则性格开朗、正直善良、积极上进、光明磊落、有担当格局。'
        : '阳旺得用为吉：性格开朗、正直善良、积极上进、光明磊落、待人热忱、有担当、有格局。')
    : (monthQi.usageDirection === 'yang'
        ? '阴旺本当令（老阴/冬月），阴寒无制则多疑多虑、消极自卑、懦弱纠结、城府过深、心胸狭隘；若得阳气（火土）平衡，则心思细腻、沉稳睿智、隐忍有度、思虑周全、低调务实、善于谋划。'
        : '阴旺得用为吉：心思细腻、沉稳睿智、隐忍有度、思虑周全、低调务实、善于谋划。');

  // 对应事业（第三章第四节·二）
  const shiYe = monthQi.usageDirection === 'yang' || yangPower < 45
    ? '阳暖格局渐成，适合公职、管理、教育、传媒、公开行业，利扬名、利仕途、利贵人帮扶（《自然易鉴》：阳为显、为明、为主动，阳吉则事业扬名、贵人相助、人前显贵）。'
    : '阴润格局渐成，适合技术、金融、策划、幕后、精密行业，利深耕、利偏财、利专业成事（《自然易鉴》：阴为隐、为暗、为被动，阴吉则根基稳固、财运内敛、私下得福）。';

  // 对应健康（第三章第四节·三 + 第九章第四节·健康寿夭断法）
  const jianKangHint = yangPower - yinPower > 20
    ? '阳燥无制倾向：易患心火、炎症、血压、视力、皮肤、肝胆燥热之疾（《自然易鉴》：阳燥无制，火炎土燥、金水受损）。'
    : yinPower - yangPower > 20
      ? '阴寒无制倾向：易患肾虚、脾胃、风湿、气血不足、妇科、寒湿淤堵之疾（《自然易鉴》：阴寒无制，水寒土冻、木火无力）。'
      : '阴阳相对平衡，健康总体平顺，注意保养即可。';

  const yinYang = `命局阳气占约 ${yangPower}%，阴气占约 ${yinPower}%（木火与燥土归阳，金水与湿土归阴）。月气${monthQi.yangState === 'strong' ? '阳气盛旺' : '阴气强盛'}，以${monthQi.usageDirection === 'yin' ? '阴气' : '阳气'}为用神平衡阴阳。《自然易鉴》：阳气主富，阴气主贵寿，二者平衡则吉，失衡则凶。—— 心性倾向：${xinXing} 事业适配：${shiYe} 健康提示：${jianKangHint}`;

  // 五行内容
  const fiveElements = `五行力量分布：木(${elementPower.wood}%)、火(${elementPower.fire}%)、土(${elementPower.earth}%)、金(${elementPower.metal}%)、水(${elementPower.water}%)。${elementPower.wood + elementPower.fire > 50 ? '木火偏旺，阳气充足。' : ''}${elementPower.metal + elementPower.water > 50 ? '金水偏旺，阴气强盛。' : ''}土主承载运化，占比 ${elementPower.earth}%。土多则塞，土少则松。`;

  // 干支内容
  const pillars = [chart.year, chart.month, chart.day, chart.hour];
  const pillarNames = ['年柱', '月柱', '日柱', '时柱'];
  let ganzhi = '';
  pillars.forEach((p, i) => {
    ganzhi += `${pillarNames[i]}${p.stem}${p.branch}：天干${elementName(p.stemElement)}${p.stemYinYang === 'yang' ? '阳' : '阴'}，地支${elementName(p.branchElement)}${p.branchYinYang === 'yang' ? '阳' : '阴'}，藏干${p.hiddenStems.join('、')}；`;
  });

  // 宫位内容
  const gongwei = `年柱为祖上父母宫，主早年运、头部；月柱为父母兄弟宫，主青年运、胸部；日柱为自己与配偶宫，主中年运、腹部；时柱为子女宫，主晚年运、脚部。各宫位的五行旺衰与用忌标记，反映了相应六亲与身体部位的吉凶状态。`;

  // 十神内容（融合《自然易鉴》第六章·十神真义：得用/为忌 + 组合真义）
  const shiShenList: Array<{
    name: string;
    desc: string;
    deYong: string;
    weiJi: string;
  }> = [
    {
      name: '比肩',
      desc: '同气五行，主自我、同辈、朋友、竞争、自我意志',
      deYong: '比肩得用：心性踏实、独立自主、有主见、有骨气、待人真诚、做事稳妥、能守基业、同辈助力多',
      weiJi: '比肩为忌：自我固执、刚愎自用、不懂变通、攀比心重、同辈拖累、朋友破财、争强好胜、凡事亲力亲为、多劳少得',
    },
    {
      name: '劫财',
      desc: '同类异气，主助力、竞争、果敢、魄力',
      deYong: '劫财得用：胆识过人、积极进取、善于开拓、执行力强、敢于拼搏、危难有救、能得意外机缘',
      weiJi: '劫财为忌：冲动鲁莽、野心过重、贪心不足、争强斗狠、破财耗福、亲友争利、是非缠身、容易意气用事、因小失大',
    },
    {
      name: '食神',
      desc: '我所生秀气，主才华、福气、安逸、技艺、心态',
      deYong: '食神得用：心性温和、乐观豁达、才华内敛、技艺傍身、知足常乐、福气深厚、衣食无忧、人缘温润',
      weiJi: '食神为忌：懒散懈怠、不思进取、贪图安逸、优柔寡断、才华埋没、得过且过、格局偏小、难成大事',
    },
    {
      name: '伤官',
      desc: '我生张扬之气，主聪慧、才华、突破、创新、魄力',
      deYong: '伤官得用：思维敏捷、才华横溢、创新出众、敢于突破、眼界开阔、利技艺、利名气、利自主创业',
      weiJi: '伤官为忌：狂妄自大、目中无人、桀骜不驯、口舌是非、恃才傲物、得罪贵人、事业起伏、才华招祸',
    },
    {
      name: '正财',
      desc: '我克正气，主稳定财运、正职收入、踏实财富、工薪基业',
      deYong: '正财得用：踏实稳重、勤俭节约、求财有道、收入稳定、聚财守福、家庭和睦、基业稳固',
      weiJi: '正财为忌：吝啬小气、格局狭隘、求财辛苦、过度务实、不懂变通、财运奔波、守财艰难、劳心劳力',
    },
    {
      name: '偏财',
      desc: '我克余气，主意外之财、偏财机缘、商业财富、人际红利',
      deYong: '偏财得用：慷慨大方、人脉广阔、灵活变通、机缘良多、横财不断、适合经商、副业得利',
      weiJi: '偏财为忌：挥霍无度、贪心过重、投机取巧、财来财去、难存积蓄、因财招非、异性耗财',
    },
    {
      name: '正官',
      desc: '克我正气，主规矩、仕途、名望、贵人、约束、事业正统',
      deYong: '正官得用：品行端正、遵纪守法、谦逊有礼、贵人常助、利公职仕途、名利双收、事业安稳',
      weiJi: '正官为忌：胆小懦弱、循规蹈矩、畏首畏尾、束缚过重、压力缠身、仕途受阻、贵人无力、事事受限',
    },
    {
      name: '七杀',
      desc: '克我煞气，主压力、挑战、魄力、权柄、竞争',
      deYong: '七杀得用：杀伐果断、智勇双全、抗压能力强、敢于担当、掌权得势、事业突破、逆境成才',
      weiJi: '七杀为忌：压力山大、焦虑内耗、小人缠身、官非口舌、意外灾厄、性情暴戾、凡事多阻、身心俱疲',
    },
    {
      name: '正印',
      desc: '生我正气，主福气、学业、贵人、长辈、庇护、心性',
      deYong: '正印得用：心地善良、慈悲宽厚、学识渊博、长辈助力、贵人庇护、福气绵长、一生安稳',
      weiJi: '正印为忌：依赖心重、惰性十足、脱离现实、思虑过重、优柔寡断、缺乏主见、成事不足',
    },
    {
      name: '偏印',
      desc: '生我异气，主智慧、玄学、灵感、技艺、孤僻',
      deYong: '偏印得用：思维独特、悟性极高、聪慧过人、擅长玄学技艺、洞察力强、独具天赋',
      weiJi: '偏印为忌：多疑孤僻、消极自闭、思虑偏执、脑洞过重、脱离实际、亲情淡薄、内心孤独',
    },
  ];

  // 十神组合真义（第六章第三节）
  const SHI_SHEN_COMBOS: Array<{ combo: string; meaning: string }> = [
    { combo: '食神制杀', meaning: '智勇双全、以德服煞、逆境掌权、大贵之格，主事业有成、执掌权柄、名利双收' },
    { combo: '伤官配印', meaning: '才华内敛、学识有成、技艺成名、贵人加持、才华不招祸、名利兼得' },
    { combo: '财官相生', meaning: '财运稳固、仕途顺遂、富贵双全、正途求财、基业长青、一生安稳' },
    { combo: '印比相助', meaning: '身有依托、贵人助力、同辈帮扶、福气深厚、根基稳固、遇难呈祥' },
    { combo: '伤杀混杂', meaning: '心性浮躁、是非不断、事业杂乱、多学少成、起伏波折、容易招灾' },
    { combo: '比劫夺财', meaning: '求财辛苦、亲友争利、破财耗福、合伙失利、守财艰难、财运起伏' },
    { combo: '官杀混杂', meaning: '压力缠身、小人众多、事业纠结、仕途受阻、是非连绵、身心疲惫' },
    { combo: '食伤泄秀', meaning: '气机流通、才华彰显、思维灵动、名利双收、适合技艺、文创、教育行业' },
  ];

  const presentShiShen = new Set<string>();
  pillars.forEach((p) => {
    if (p.shiShen) presentShiShen.add(p.shiShen);
  });
  const presentList = shiShenList.filter((s) => presentShiShen.has(s.name));

  // 检查命中的十神组合
  const hitCombos: string[] = [];
  const names = Array.from(presentShiShen);
  SHI_SHEN_COMBOS.forEach((c) => {
    const parts = c.combo.split(/制|配|相|生|助|杂|夺|混|泄/);
    if (parts.length >= 2 && names.includes(parts[0]) && names.some((n) => c.combo.includes(n) && n !== parts[0])) {
      hitCombos.push(`${c.combo}：${c.meaning}`);
    }
  });

  const shiShenIntro = presentList.length > 0
    ? presentList.map((s) => `【${s.name}】主${s.desc}。${s.deYong}；${s.weiJi}。`).slice(0, 3).join(' ')
    : '';
  const comboText = hitCombos.length > 0 ? `命中十神组合：${hitCombos.join('；')}。` : '';
  const shiShen = `命局动应十神：${names.join('、') || '（无明显透出）'}。《自然易鉴》核心：十神无固定吉凶，吉凶只在阴阳平衡、格局适配。喜用十神则吉，忌神十神则凶，不可以十神名称定祸福。${shiShenIntro}${comboText}`;

  // 干支作用（刑冲合害 - 简化版）
  const interaction = analyzeInteractions(pillars);

  return {
    yinYang,
    fiveElements,
    ganzhi,
    gongwei,
    shiShen,
    interaction,
  };
}

function analyzeInteractions(pillars: Pillar[]): string {
  const branches = pillars.map((p) => p.branch);
  const actions: string[] = [];
  const posNames = ['年', '月', '日', '时'];

  // 地支六合（第五章第五节·六合：阴阳相配、气机相合，有情之合）
  const liuHe: Record<string, string> = {
    子丑: '合土',
    寅亥: '合木',
    卯戌: '合火',
    辰酉: '合金',
    巳申: '合水',
    午未: '合火',
  };
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const key = branches[i] + branches[j];
      const reverse = branches[j] + branches[i];
      if (liuHe[key] || liuHe[reverse]) {
        const he = liuHe[key] || liuHe[reverse]!;
        const ordered = liuHe[key] ? branches[i] + branches[j] : branches[j] + branches[i];
        actions.push(`六合：${posNames[i]}${posNames[j]}${ordered}${he}（合主凝聚、帮扶、羁绊；宜合则贵人机缘汇聚，不宜合则牵绊闭塞）`);
      }
    }
  }

  // 地支六冲（第五章第五节·六冲：阴阳对立、气机相克，无情之冲）
  const liuChong: Record<string, string> = {
    子午: '冲',
    丑未: '冲',
    寅申: '冲',
    卯酉: '冲',
    辰戌: '冲',
    巳亥: '冲',
  };
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const key = branches[i] + branches[j];
      const reverse = branches[j] + branches[i];
      if (liuChong[key] || liuChong[reverse]) {
        actions.push(`六冲：${posNames[i]}${posNames[j]}${branches[i]}${branches[j]}相冲（冲主动荡、变动、破损、分离；事业调动、搬迁、感情波折，冲吉则动中得贵，冲凶则动中招灾）`);
      }
    }
  }

  // 地支六害（第五章第五节·六害：气机相侵、暗中相克，主隐性损耗、暗伤）
  const liuHai: Record<string, string> = {
    子未: '害',
    丑午: '害',
    寅巳: '害',
    卯辰: '害',
    申亥: '害',
    酉戌: '害',
  };
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const key = branches[i] + branches[j];
      const reverse = branches[j] + branches[i];
      if (liuHai[key] || liuHai[reverse]) {
        actions.push(`六害：${posNames[i]}${posNames[j]}${branches[i]}${branches[j]}相害（害主暗中损耗、隐形灾祸、人际隔阂、是非暗伤、恩情反怨、健康暗疾、财运暗耗）`);
      }
    }
  }

  // 地支三刑（第五章第五节·三刑：气机伤残、五行相伐，最凶作用关系）
  // 寅巳申无恩之刑、丑未戌恃势之刑、子卯无礼之刑、辰午酉亥自刑
  const wuEn = ['寅', '巳', '申'];
  const wuEnCount = branches.filter((b) => wuEn.includes(b)).length;
  if (wuEnCount >= 2) {
    actions.push(`三刑（无恩）：${branches.filter((b) => wuEn.includes(b)).join('')}（主忘恩负义、人际反目、贵人变小人、亲情淡薄、恩怨纠缠、事业波折）`);
  }
  const shiShi = ['丑', '未', '戌'];
  const shiShiCount = branches.filter((b) => shiShi.includes(b)).length;
  if (shiShiCount >= 2) {
    actions.push(`三刑（恃势）：${branches.filter((b) => shiShi.includes(b)).join('')}（主仗势欺人、争强好胜、纠纷不断、官非口舌、家业不宁、同辈相克）`);
  }
  // 子卯无礼之刑
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const pair = [branches[i], branches[j]].sort().join('');
      if (pair === '卯子' || pair === '子卯') {
        actions.push(`三刑（无礼）：子卯相刑（主礼仪缺失、言行无状、感情混乱、伦理不顺、子女不孝、人际失礼招祸）`);
      }
    }
  }
  // 辰午酉亥自刑
  const ziXingChars = ['辰', '午', '酉', '亥'];
  ziXingChars.forEach((c) => {
    const count = branches.filter((b) => b === c).length;
    if (count >= 2) {
      actions.push(`自刑：${c}${c}自见（主自我纠结、内耗严重、多疑多虑、自我施压、无事生非、心病缠身、自作自受）`);
    }
  });

  // 地支三合（有情汇聚，气机互助）
  const sanHe = [
    ['申', '子', '辰', '水'],
    ['亥', '卯', '未', '木'],
    ['寅', '午', '戌', '火'],
    ['巳', '酉', '丑', '金'],
  ];
  sanHe.forEach((triple) => {
    const count = branches.filter((b) => triple.includes(b)).length;
    if (count >= 3) {
      const which = branches.filter((b) => triple.includes(b)).join('');
      actions.push(`三合（全）：${which}${triple[3]}三合局（主人缘和合、团队助力、合作成事、稳中求财；喜用成局则富贵可期，忌神成局则灾祸连绵）`);
    } else if (count === 2) {
      const which = branches.filter((b) => triple.includes(b)).join('');
      actions.push(`三合（半）：${which}${triple[3]}半合局`);
    }
  });

  // 地支三会（汇聚一方之气，力量最大）
  const sanHui = [
    ['寅', '卯', '辰', '木'],
    ['巳', '午', '未', '火'],
    ['申', '酉', '戌', '金'],
    ['亥', '子', '丑', '水'],
  ];
  sanHui.forEach((quad) => {
    const count = branches.filter((b) => quad.includes(b)).length;
    if (count >= 3) {
      const which = branches.filter((b) => quad.includes(b)).join('');
      actions.push(`三会（全）：${which}${quad[3]}三会局（汇聚一方之气，气场最纯、力量最大，能彻底改变原局气机旺衰；喜成则大成，忌成则大凶）`);
    } else if (count === 2) {
      const which = branches.filter((b) => quad.includes(b)).join('');
      actions.push(`三会（半）：${which}${quad[3]}半会局`);
    }
  });

  if (actions.length === 0) {
    return '地支之间刑冲合害较少，命局相对平稳，动应不多。《自然易鉴》：原局静而有缺，岁运动而补缺则吉；原局静而有弊，岁运动而助弊则凶。需待大运流年引动方有明显变化。';
  }
  return '命局地支作用：' + actions.join('；') + '。《自然易鉴》核心：所有地支作用无外乎气机的合聚、冲散、制衡、破损，最终改变原局阴阳冷暖状态以此定吉凶。合主静聚稳，冲主动荡变，害主暗伤，刑主伤残是非。';
}

// 六亲分析（融合《自然易鉴》第九章第三节·婚姻六亲断法）
export function analyzeLiuQin(
  chart: BaZiChart,
  yongJi: YongJiResult,
  monthQi: MonthQiResult,
  pillarsInteractions?: string,
): {
  parents: string;
  spouse: string;
  children: string;
  siblings: string;
} {
  const isMale = chart.gender === 'male';

  // 判断命局整体阴阳平衡度（用于婚姻判断）
  const balanceLevel = yongJi.usefulElements.length >= 3
    ? '阴阳均衡倾向'
    : yongJi.tabooElements.length >= 3
      ? '阴阳偏枯倾向'
      : '阴阳过渡状态';

  // 父母：年柱月柱 + 印星（母）+ 财星（父）
  const yearStemShiShen = chart.year.shiShen || '';
  const monthStemShiShen = chart.month.shiShen || '';
  const parentYinMark = yongJi.stemMarks['年干'];
  const parents = `父母宫以年柱和月柱为用，年柱主祖上与父亲根基，月柱主母亲与家庭环境。《自然易鉴》：原局气机温暖、生克有情、印比得力，长辈缘深、手足和睦、贵人众多；原局气机寒凉、刑冲相克、六亲宫位破损，六亲缘薄、亲人拖累、亲情淡薄。—— 印星为母亲，年干${chart.year.stem}（${yearStemShiShen || '未透'}）、月干${chart.month.stem}（${monthStemShiShen || '未透'}）。${parentYinMark === 'useful' ? '父母宫为用神，父母有助力，家庭条件较好，长辈缘深。' : parentYinMark === 'taboo' ? '父母宫为忌神，父母助力有限，早年家庭压力较大，六亲缘分稍薄。' : '父母宫为中性，父母关系平常，助力一般。'}`;

  // 配偶：日支夫妻宫 + 财星（男命）/ 官星（女命）—— 第九章第三节·婚姻吉凶断法
  const spouseStar = isMale ? '财星' : '官星';
  const dayBranchMark = yongJi.branchMarks['日支'];
  const marriageHint = balanceLevel === '阴阳均衡倾向'
    ? '命局阴阳均衡倾向，婚姻和睦、夫妻恩爱、家庭稳固、相守长久的基础。'
    : balanceLevel === '阴阳偏枯倾向'
      ? '命局阴阳偏枯倾向，需防婚姻波折、争吵不断、离合反复、孤独寡缘，后天经营尤为重要。'
      : '命局阴阳状态中等，婚姻需双方用心经营，方得长久安稳。';
  const spouse = `配偶宫为日支${chart.day.branch}（夫妻宫）。${isMale ? '男命以财星为妻' : '女命以官星为夫'}，${spouseStar}代表配偶。日支${chart.day.branch}五行属${elementName(chart.day.branchElement)}，${dayBranchMark === 'useful' ? '夫妻宫为用神，配偶有助力，婚姻美满。' : dayBranchMark === 'taboo' ? '夫妻宫为忌神，配偶助力弱，婚姻中易有矛盾。' : '夫妻宫为中性，婚姻关系平常。'}日柱${chart.day.stem}${chart.day.branch}干支关系影响夫妻相处模式。《自然易鉴》婚姻断法：格局阴阳均衡、干支有情、合多冲少，婚姻和睦长久；格局阴阳偏枯、干支无情、冲害混杂、刑破严重，婚姻波折。${marriageHint}`;

  // 子女：时柱 + 食伤星
  const hourStemShiShen = chart.hour.shiShen || '';
  const hourMark = yongJi.stemMarks['时干'];
  const children = `子女宫为时柱${chart.hour.stem}${chart.hour.branch}。食伤星为子女星，时干${chart.hour.stem}为${hourStemShiShen || '未透'}。${hourMark === 'useful' ? '子女宫为用神，子女贤孝，晚年得子女之力。' : hourMark === 'taboo' ? '子女宫为忌神，子女操心，晚年需注意子女问题。' : '子女宫为中性，子女情况平常。'}时柱也主晚年运，与时柱相关的因素也反映晚年生活状态。`;

  // 兄弟姐妹：比劫星 + 月柱
  const siblings = `兄弟姐妹以比劫星为代表，月柱为兄弟宫。月干${chart.month.stem}为${monthStemShiShen || '未透'}。${monthStemShiShen?.includes('比肩') || monthStemShiShen?.includes('劫财') ? '月干透比劫，有兄弟姐妹之象，兄弟有助力。' : '比劫不在月干透出，兄弟姐妹缘分稍淡或数量较少。'}比劫为用神则兄弟朋友有助，为忌神则易因朋友破财或竞争。`;

  return { parents, spouse, children, siblings };
}

// 得吉凶展示：逐字（天干/地支）追溯吉凶作用来源
// 每个字的吉凶 = 用神/忌神基础分（+3 / -3）+ 合(+2) / 生我(+2) / 我生(+1) / 克我(-2) / 我克(-1) / 冲(-2) / 害(-2) / 刑(-3)
export interface JiXiongSource {
  type:
    | '用忌'
    | '天干生'
    | '天干克'
    | '五合'
    | '同气比助'
    | '地支六合'
    | '地支六冲'
    | '地支六害'
    | '地支三刑'
    | '地支三合'
    | '地支三会'
    | '干支生克';
  from: string; // 来源于哪个字（如「月干甲」）
  to: string; // 被作用的字（如「日干庚」）
  detail: string; // 一句话说明（如「甲木生丙火，日主得印比助力」）
  score: number; // 该条作用的分数
  nature: '吉' | '凶' | '平'; // 该条作用的吉凶属性
}

export interface CharJiXiong {
  position: string; // 如「年干」「月支」
  char: string; // 如「甲」「子」
  element: string; // wood/fire/...
  jiXiong: '大吉' | '吉' | '平' | '凶' | '大凶';
  totalScore: number;
  useJiBase: '用神' | '忌神' | '中性';
  sources: JiXiongSource[];
  summary: string; // 一句话总结该字的吉凶来源
}

// ---------- 共享制化常量（analyzeJiXiong / analyzeDaYunLiuNian 共用） ----------
export const SHENG_ORDER: Record<string, string> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
export const KE_ORDER: Record<string, string>    = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
export const isShengyu = (sheng: string, bei: string): boolean => SHENG_ORDER[sheng] === bei;   // sheng 生 bei
export const isKeyu   = (ke: string, bei: string): boolean    => KE_ORDER[ke] === bei;          // ke 克 bei

export const TIAN_GAN_WU_HE: Record<string, string> = {
  甲己: '合土', 乙庚: '合金', 丙辛: '合水', 丁壬: '合木', 戊癸: '合火',
};
export const WU_HE_HUA_ELEMENT: Record<string, string> = {
  甲己: 'earth', 乙庚: 'metal', 丙辛: 'water', 丁壬: 'wood', 戊癸: 'fire',
};
export const DI_ZHI_LIU_HE: Record<string, string> = {
  子丑: '合土', 寅亥: '合木', 卯戌: '合火', 辰酉: '合金', 巳申: '合水', 午未: '合火',
};
export const LIU_HE_HUA_ELEMENT: Record<string, string> = {
  子丑: 'earth', 寅亥: 'wood', 卯戌: 'fire', 辰酉: 'metal', 巳申: 'water', 午未: 'fire',
};
export const LIU_CHONG_PAIRS: Record<string, boolean> = {
  子午: true, 丑未: true, 寅申: true, 卯酉: true, 辰戌: true, 巳亥: true,
};
export const LIU_HAI_PAIRS: Record<string, boolean> = {
  子未: true, 丑午: true, 寅巳: true, 卯辰: true, 申亥: true, 酉戌: true,
};
export const SAN_XING_WUEN  = ['寅', '巳', '申'];
export const SAN_XING_SHISHI = ['丑', '未', '戌'];
export const ZI_MAO_XING     = ['子', '卯'];
export const ZI_XING_LIST    = ['辰', '午', '酉', '亥'];
export const SAN_HE_GROUPS: Array<{ members: string[]; element: string; name: string }> = [
  { members: ['申', '子', '辰'], element: 'water', name: '水' },
  { members: ['亥', '卯', '未'], element: 'wood',  name: '木' },
  { members: ['寅', '午', '戌'], element: 'fire',  name: '火' },
  { members: ['巳', '酉', '丑'], element: 'metal', name: '金' },
];
export const SAN_HUI_GROUPS: Array<{ members: string[]; element: string; name: string }> = [
  { members: ['寅', '卯', '辰'], element: 'wood',  name: '东方木' },
  { members: ['巳', '午', '未'], element: 'fire',  name: '南方火' },
  { members: ['申', '酉', '戌'], element: 'metal', name: '西方金' },
  { members: ['亥', '子', '丑'], element: 'water', name: '北方水' },
];
export const HUA_ELEMENT_TO_NAME: Record<string, string> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
};
// 旧五档类型（保留兼容，仅用于内部迁移；UI 新数据结构使用 LetterLevel）
export type WuDangLevel = '夯' | '人上人' | 'npc' | '拉' | '拉完了';

// ============ 新九档字母等级系统（S+ S A+ A B+ B- C C- D） ============
export type LetterLevel = 'S+' | 'S' | 'A+' | 'A' | 'B+' | 'B-' | 'C' | 'C-' | 'D';

const RAW_SCORE_DIVISOR = 3.6;
export function compressScore(rawScore: number): number {
  return Math.round((rawScore / RAW_SCORE_DIVISOR) * 10) / 10;
}

// 九档字母等级文案
const LETTER_BAND: Record<LetterLevel, string> = {
  'S+': 'SSS级·超吉：气机极致鼎盛，阴阳既济，可成非常之业',
  'S':  'SS级·上吉：气机充盈浑厚，助缘极深，事业大跨步跃进',
  'A+': 'A级·上佳：气机顺畅有力，贵人提携，名利双收之运',
  'A':  'A级·佳运：气机正向，做事得力，稳步向前有提升',
  'B+': 'B级·平顺：气机平和，无功无过大方向不偏，稳中求进',
  'B-': 'B级·偏弱：气机略有阻滞，小不顺较多，谨慎行事即安',
  'C':  'C级·偏差：气机偏逆，加剧原局偏枯，宜守不宜攻多事',
  'C-': 'C级·低迷：气机明显逆月令喜用，是非破财增多，韬光养晦',
  'D':  'D级·极差：用神被彻底压制，气机枯竭，最宜蛰伏切不可妄动',
};

// 字母等级 → 配色 CSS class（与 UI 颜色系统对应）
export const LETTER_LEVEL_META: Record<LetterLevel, { classBg: string; classText: string; classRing: string; sortIndex: number }> = {
  'S+': { classBg: 'bg-gradient-to-br from-rose-500 to-amber-400',  classText: 'text-white',   classRing: 'ring-rose-600',  sortIndex: 9 },
  'S':  { classBg: 'bg-gradient-to-br from-amber-400 to-yellow-300',classText: 'text-white',   classRing: 'ring-amber-500', sortIndex: 8 },
  'A+': { classBg: 'bg-emerald-500',                              classText: 'text-white',   classRing: 'ring-emerald-600', sortIndex: 7 },
  'A':  { classBg: 'bg-green-500',                                classText: 'text-white',   classRing: 'ring-green-600', sortIndex: 6 },
  'B+': { classBg: 'bg-sky-400',                                  classText: 'text-white',   classRing: 'ring-sky-500',   sortIndex: 5 },
  'B-': { classBg: 'bg-slate-400',                                classText: 'text-white',   classRing: 'ring-slate-500', sortIndex: 4 },
  'C':  { classBg: 'bg-orange-400',                               classText: 'text-white',   classRing: 'ring-orange-500', sortIndex: 3 },
  'C-': { classBg: 'bg-red-400',                                  classText: 'text-white',   classRing: 'ring-red-500',   sortIndex: 2 },
  'D':  { classBg: 'bg-gradient-to-br from-zinc-700 to-zinc-900', classText: 'text-white',   classRing: 'ring-zinc-800',   sortIndex: 1 },
};

/**
 * 大运/流年 9 档字母分级：按"压缩分 displayScore"映射到 S+ ~ D
 * 分值梯度刻意拉开，避免档位集中：
 *   S+: > +6
 *   S : +4 ~ +6 (含)
 *   A+: +2 ~ +4 (含)
 *   A : 0  ~ +2 (含)
 *   B+: -2 ~ 0  (含)
 *   B-: -4 ~ -2 (含)
 *   C : -6 ~ -4 (含)
 *   C-: -8 ~ -6 (含)
 *   D : < -8
 */
export function letterFromScore(rawScore: number): { level: LetterLevel; band: string; displayScore: number } {
  const displayScore = compressScore(rawScore);
  let level: LetterLevel;
  if      (displayScore > 6)  level = 'S+';
  else if (displayScore > 4)  level = 'S';
  else if (displayScore > 2)  level = 'A+';
  else if (displayScore > 0)  level = 'A';
  else if (displayScore >= -2) level = 'B+';
  else if (displayScore >= -4) level = 'B-';
  else if (displayScore >= -6) level = 'C';
  else if (displayScore >= -8) level = 'C-';
  else                         level = 'D';
  return { level, band: LETTER_BAND[level], displayScore };
}

/**
 * 大运/流年九档分级：按「岁运调整分」定档（= 综合分 − 命盘基准，即岁运对命盘的净增益）
 * 评级只与命盘基准自身比较，不受先天盘高低影响，保证同一盘内严格形成梯度：
 *   S+: > +3.0
 *   S : +2.0 ~ +3.0
 *   A+: +1.0 ~ +2.0
 *   A : +0.3 ~ +1.0
 *   B+: -0.3 ~ +0.3（仅气机真正持平者）
 *   B-: -1.0 ~ -0.3
 *   C : -2.0 ~ -1.0
 *   C-: -3.0 ~ -2.0
 *   D : < -3.0
 */
export function letterFromCombined(adjustDisplayScore: number): { level: LetterLevel; band: string } {
  let level: LetterLevel;
  if      (adjustDisplayScore > 3.0)  level = 'S+';
  else if (adjustDisplayScore > 2.0)  level = 'S';
  else if (adjustDisplayScore > 1.0)  level = 'A+';
  else if (adjustDisplayScore > 0.3)  level = 'A';
  else if (adjustDisplayScore >= -0.3) level = 'B+';
  else if (adjustDisplayScore >= -1.0) level = 'B-';
  else if (adjustDisplayScore >= -2.0) level = 'C';
  else if (adjustDisplayScore >= -3.0) level = 'C-';
  else                         level = 'D';
  return { level, band: LETTER_BAND[level] };
}

// ====== 兼容旧 WuDangLevel 的临时包装（UI 切换 LetterLevel 后删除）======
export function wuDangFromScore(rawScore: number): { level: WuDangLevel; band: string; displayScore: number } {
  const { level: l, band, displayScore } = letterFromScore(rawScore);
  const lvlMap: Record<LetterLevel, WuDangLevel> = {
    'S+': '夯', 'S': '夯', 'A+': '人上人', 'A': '人上人',
    'B+': 'npc', 'B-': 'npc', 'C': '拉', 'C-': '拉', 'D': '拉完了',
  };
  return { level: lvlMap[l], band, displayScore };
}
export function wuDangFromCombined(combinedDisplayScore: number): { level: WuDangLevel; band: string } {
  const { level: l, band } = letterFromCombined(combinedDisplayScore);
  const lvlMap: Record<LetterLevel, WuDangLevel> = {
    'S+': '夯', 'S': '夯', 'A+': '人上人', 'A': '人上人',
    'B+': 'npc', 'B-': 'npc', 'C': '拉', 'C-': '拉', 'D': '拉完了',
  };
  return { level: lvlMap[l], band };
}

// 命盘综合评分（新机制）：三维度——阴阳平衡度 + 用神力量 + 忌神状态
// 输出 rawScore（±26 尺度，与 scoreGanZhiImpact 同口径），用九档字母等级映射
export function scoreMingPan(
  chart: BaZiChart,
  yongJi: YongJiResult,
): {
  rawScore: number;
  displayScore: number;
  level: WuDangLevel;       // 旧五档（兼容）
  letterLevel: LetterLevel; // 新九档（UI 首选）
  band: string;
  balanceScore: number;
  usefulScore: number;
  tabooScore: number;
  detail: string[];
} {
  const pillars: Pillar[] = [chart.year, chart.month, chart.day, chart.hour];
  const pillarNames = ['年', '月', '日', '时'];

  // —— 维度1：阴阳平衡度（±11）—— 土已并入阴阳（燥土/阳土归阳，湿土/阴土归阴）
  const { yang, yin } = calculateYinYangBalance(chart);
  const yinYangDiff = Math.abs(yang - yin); // 0(均衡) ~ 100(彻底偏枯)
  const balanceScore = Math.round((11 - yinYangDiff * 0.22) * 10) / 10; // 0→+11, 100→-11

  // —— 维度2&3：用神/忌神力量占比（基于干支级标记，含土的干支级判断）——
  const weights = [
    { stem: 1.0, branch: 1.5 }, // 年
    { stem: 1.2, branch: 2.5 }, // 月
    { stem: 1.5, branch: 1.8 }, // 日
    { stem: 0.8, branch: 1.2 }, // 时
  ];
  let usefulPower = 0;
  let tabooPower = 0;
  let totalPower = 0;
  pillars.forEach((pillar, idx) => {
    const w = weights[idx];
    const stemMark = yongJi.stemMarks[`${pillarNames[idx]}干`];
    const branchMark = yongJi.branchMarks[`${pillarNames[idx]}支`];
    if (stemMark === 'useful') usefulPower += w.stem;
    else if (stemMark === 'taboo') tabooPower += w.stem;
    totalPower += w.stem;
    if (branchMark === 'useful') usefulPower += w.branch;
    else if (branchMark === 'taboo') tabooPower += w.branch;
    totalPower += w.branch;
  });

  const usefulPct = totalPower > 0 ? Math.round((usefulPower / totalPower) * 100) : 0;
  const tabooPct = totalPower > 0 ? Math.round((tabooPower / totalPower) * 100) : 0;
  const usefulScore = Math.round((usefulPct - 50) * 0.18 * 10) / 10; // 100%→+9, 0%→-9
  const tabooScore = Math.round((50 - tabooPct) * 0.12 * 10) / 10;   // 0%→+6, 100%→-6

  const rawScore = Math.round((balanceScore + usefulScore + tabooScore) * 10) / 10;
  const letterRes = letterFromScore(rawScore);
  const { level, band, displayScore } = wuDangFromScore(rawScore);

  const fmt = (n: number) => (n >= 0 ? '+' : '') + n;
  const detail = [
    `阴阳平衡度：阳气${yang}%·阴气${yin}%（偏枯差${yinYangDiff}%）→ ${fmt(balanceScore)}`,
    `用神力量：占比${usefulPct}% → ${fmt(usefulScore)}`,
    `忌神状态：占比${tabooPct}% → ${fmt(tabooScore)}`,
  ];

  return {
    rawScore, displayScore, level, letterLevel: letterRes.level, band,
    balanceScore, usefulScore, tabooScore, detail,
  };
}

/**
 * 序列评分：为「大运」「流年」有序序列逐条计算九档字母等级 + 压缩分
 * 【已按用户要求取消：前一步/上一个大运对当前步的"趋势加成"与"降档警告"分值影响】
 * 现在每一步的等级/分数完全由本条 rawScore 独立决定，不受前后步影响。
 * 返回结果中额外附带 letterLevel（新九档），供 UI 直接渲染；level/band 为旧五档兼容字段。
 */
export function applyForwardTrend<T extends { rawScore: number }>(items: T[]): Array<
  T & {
    displayScore: number;
    level: WuDangLevel;       // 旧五档（兼容）
    band: string;
    upgradeBonusApplied: boolean;  // 永远 false（已取消趋势加成）
    downgradeAlert: boolean;       // 永远 false（已取消前序影响）
    letterLevel: LetterLevel;      // 新九档 S+~D（UI 首选）
  }
> {
  return items.map((it) => {
    const cur = letterFromScore(it.rawScore);
    // 旧五档兼容映射（UI 升级后可移除）
    const lvlMap: Record<LetterLevel, WuDangLevel> = {
      'S+': '夯', 'S': '夯', 'A+': '人上人', 'A': '人上人',
      'B+': 'npc', 'B-': 'npc', 'C': '拉', 'C-': '拉', 'D': '拉完了',
    };
    return {
      ...it,
      displayScore: cur.displayScore,
      letterLevel: cur.level,
      level: lvlMap[cur.level],
      band: cur.band,
      upgradeBonusApplied: false,
      downgradeAlert: false,
    };
  });
}

/**
 * 量化打分：大运/流年干支 的「阴阳气喜用关系」（符合《自然易鉴》的判断体系）
 *
 * 评分方法论（借鉴权威评级机构记分卡原则：因子透明、不重复计分、置信降权）：
 *   A. 月令逐字喜忌 × 干支一体落实（主分量，满分 ±13 ≈ 权重50%）：
 *        喜/忌/待定直接取自月令逐字资料库（allStemMarks/allBranchMarks），干±3、支±10（大运重地支）。
 *        【干支作为整体评分，不割裂】按六十甲子单柱原理修正：
 *        截脚（支克干）→ 干分作废（干之喜忌被支否定，如庚午「凉受丁火否定」）；
 *        盖头（干克支）→ 支分减半（支之质被干所盖）；
 *        布气（干生支）→ 干分减半（干气下布外泄）。
 *   B. 原局偏枯弥合（修正分量，满分 ±8 ≈ 权重30%）：
 *        【仅对 A 段未判定（待定/缺字）的干支启用】寒暖「用阴阳」补偏——
 *        资料库已定喜忌的字，其寒暖利害已含于逐字定论，不再重复加减（避免双重计分）。
 *   C. 干支相生·气机流通（小分量，±3 ≈ 权重20%）：
 *        相生时以受生方逐字 mark 定加减（生用神→流通+3、生忌神→助忌-1）；
 *        克的关系已由 A 段落实修正承接，不重复计分；含待定字时不增减。
 *   D. 刑冲合会：【不参与评分】（用户定标：非逐字资料库判定依据）——
 *        库中以冲/合为据的字（辰月戌冲辰=用、未合木=待定）其吉凶已由 A/B 承接；
 *        刑冲合害取象仅由象法「干支作用」模块描述，不影响分数。
 *   【置信降权】月令逐字库待定字占比过半（如申月两局未定）→ B/C 修正分量整体 ×0.3，
 *        避免补偏逻辑在取用相反的两局间默认站队；A 段本读库不受影响。
 *
 * @returns score（综合分，典型范围 ±27）& summary（按分数绝对值从大到小排序的Top判词）
 */
export function scoreGanZhiImpact(
  stem: string,
  branch: string,
  chart: BaZiChart,
  yongJi: YongJiResult,
  monthQi: MonthQiResult,
  yinYangPct: { yang: number; yin: number },
): {
  score: number;            // 原始分 ±27 级（内部使用）
  summary: string[];        // 展示给用户的 Top 作用（已是 ÷3.6 的压缩分，与综合分同口径）
  plusSumRaw: number;       // 原始分：加分项合计（A/B/C 正分）
  minusSumRaw: number;      // 原始分：扣分项合计（A/B/C 负分）
  otherSumRaw: number;      // 恒为 0：刑冲合会不参与评分（保留字段兼容 UI 明细行）
} {
  // 用忌标记唯一来源：月令逐字资料库（analyzeYongJi 的 allStemMarks/allBranchMarks）
  // 含天干粒度覆盖（辰月甲=用）、土支逐字定论（辰月戌冲辰=用、夏月丑戌晦火=用）、两局/条件字=中性
  const markStem = (s: string): 'useful' | 'taboo' | 'neutral' => yongJi.allStemMarks[s] ?? 'neutral';
  const markBranch = (b: string): 'useful' | 'taboo' | 'neutral' => yongJi.allBranchMarks[b] ?? 'neutral';

  // 置信因子：月令逐字库待定字占比过半（申月两局未定）→ B/C/D 修正分量整体降权至 30%，
  // 避免寒暖补偏在取用相反的两局之间默认站队；A 段直接读库，不受影响。
  const refMonth = ZHUZI_XIJI_REF[chart.month.branch];
  const refRows = refMonth
    ? [...Object.values(refMonth.stems), ...Object.values(refMonth.branches)]
    : [];
  const daiRatio = refRows.length > 0
    ? refRows.filter((r) => r[0] === 'dai').length / refRows.length
    : 0;
  const conf = daiRatio >= 0.5 ? 0.3 : 1.0;

  // —— MVP 口径对齐：最终"综合分 displayScore" = compressScore(score) = score / 3.6
  //    因此 topReasons 里展示给用户看的每一项"±X"也要同步除以 3.6，保证用户能手动加起来等于综合分
  const compressFmt = (raw: number) => {
    const c = Math.round((raw / RAW_SCORE_DIVISOR) * 10) / 10;
    return (c >= 0 ? '+' : '') + c.toFixed(1);
  };

  let score = 0;
  let plusSumRaw  = 0; // 原始分加分合计（A/B/C 正）
  let minusSumRaw = 0; // 原始分扣分合计（A/B/C 负）
  let otherSumRaw = 0; // 刑冲合会不参与评分，恒为 0

  const summary: string[] = [];
  const pushSum = (msg: string, s: number) => {
    if (s > 0) plusSumRaw  += s;
    if (s < 0) minusSumRaw += s; // 负数累加
    summary.push(`${compressFmt(s)} ${msg}`);
  };

  // -------- A. 月令逐字喜忌（主分量A，大运重地支：地支权重 >> 天干） --------
  // 文献：天干主象、地支主实；天干生克需地支呼应（落地）方可应验，故地支为主、天干为辅。
  //       喜/忌/待定直接取自月令逐字资料库，用阴用阳大方向已含于标记内。
  const stemEl = STEM_ELEMENTS[stem];
  const branchEl = BRANCH_ELEMENTS[branch];
  const stemMark = markStem(stem);
  const branchMark = markBranch(branch);
  // 补偏用「用阴阳」（寒暖之象）：木火=阳、金水=阴；土干戊阳己阴、土支未戌燥=阳/丑辰湿=阴。
  // 注意不能用干支奇偶「体阴阳」（壬阳干而气寒、子阳支而象老阴），否则补阴气会错奖阳体寒字。
  const stemYY = stemEl === 'wood' || stemEl === 'fire' ? 'yang'
    : stemEl === 'metal' || stemEl === 'water' ? 'yin'
    : STEM_YINYANG[stem];
  const branchYY = branchEl === 'wood' || branchEl === 'fire' ? 'yang'
    : branchEl === 'metal' || branchEl === 'water' ? 'yin'
    : (['未', '戌'].includes(branch) ? 'yang' : 'yin');

  // —— A. 月令逐字喜忌 × 干支一体落实修正（主分量A：支±10、干±3） ——
  // 六十甲子单柱原理（reference/docs/六十甲子.md）：天干之功须看地支环境是否落实——
  //   截脚（支克干）：干之喜忌被支否定，干分作废（如庚午「凉受丁火否定」，庚之用不施）；
  //   盖头（干克支）：支之质被干所盖，支分减半（来源否定落实）；
  //   布气（干生支）：干气下布外泄，干分减半（功能泄于支）。
  // 月令用阴/用阳大方向已含于 marks；不再按奇偶「体阴阳」重复加减。
  const branchKeStem    = isKeyu(branchEl, stemEl);
  const stemKeBranch    = isKeyu(stemEl, branchEl);
  const stemShengBranch = isShengyu(stemEl, branchEl);
  const branchShengStem = isShengyu(branchEl, stemEl);

  if (stemMark === 'useful' || stemMark === 'taboo') {
    const base  = stemMark === 'useful' ? 3 : -3;
    const label = stemMark === 'useful' ? `天干${stem}属月令用神（${elementName(stemEl)}）` : `天干${stem}属月令忌神（${elementName(stemEl)}）`;
    if (branchKeStem) {
      pushSum(`干支一体·截脚：${label}，其气受${branch}（${elementName(branchEl)}克${elementName(stemEl)}）否定→${stemMark === 'useful' ? '用不施为' : '忌被化解'}（干分作废）`, 0);
    } else if (stemShengBranch) {
      const s = base * 0.5; score += s;
      pushSum(`${label}，其气下布于${branch}（干生支），功能减半`, s);
    } else {
      score += base; pushSum(label, base);
    }
  }
  if (branchMark === 'useful' || branchMark === 'taboo') {
    const base  = branchMark === 'useful' ? 10 : -10;
    const label = branchMark === 'useful' ? `地支${branch}属月令用神（${elementName(branchEl)}）` : `地支${branch}属月令忌神（${elementName(branchEl)}）`;
    if (stemKeBranch) {
      const s = base * 0.5; score += s;
      pushSum(`干支一体·盖头：${label}，其质被${stem}（${elementName(stemEl)}克${elementName(branchEl)}）所盖，力量减半`, s);
    } else {
      score += base; pushSum(label, base);
    }
  }

  // -------- B. 原局偏枯弥合度（修正分量B，满分 ±8，按寒暖「用阴阳」补偏） --------
  // 【不重复计分】仅对 A 段未判定（待定/缺字）的干支启用：资料库已定喜忌的字，
  // 其寒暖利害已含于逐字定论（如辰月甲木=用，不再因气暖重复加分）；待定字库无定论，方以补偏折中。
  const yangShort = yinYangPct.yang < 40; // 命局偏阴，阳气不够
  const yinShort  = yinYangPct.yin  < 40; // 命局偏阳，阴气不够
  const balanced  = !yangShort && !yinShort; // 二气均衡，弥合权重减半（避免拉向单边）
  const half = balanced ? 0.5 : 1.0;
  const stemUndecided = stemMark === 'neutral';
  const branchUndecided = branchMark === 'neutral';

  if (stemUndecided) {
    // 天干补偏（权重小：天干主象）
    if (yangShort && stemYY === 'yang') { const s = +2.5*half*conf; score += s; pushSum(`天干${stem}月令待定·气暖（木火/燥土），补原局阳气不足`, +s); }
    if (yangShort && stemYY === 'yin')  { const s = -1.5*half*conf; score += s; pushSum(`天干${stem}月令待定·气寒（金水/湿土），再增阴气→偏`, s); }
    if (yinShort  && stemYY === 'yin')  { const s = +2.5*half*conf; score += s; pushSum(`天干${stem}月令待定·气寒（金水/湿土），补原局阴气不足`, +s); }
    if (yinShort  && stemYY === 'yang') { const s = -1.5*half*conf; score += s; pushSum(`天干${stem}月令待定·气暖（木火/燥土），再增阳气→偏`, s); }
    if (balanced) {
      const yangDom = yinYangPct.yang > yinYangPct.yin;
      if (yangDom && stemYY === 'yang') { const s = -1*conf; score += s; pushSum(`原局阳气略多，待定干${stem}再气暖易失衡`, s); }
      if (!yangDom && stemYY === 'yin') { const s = -1*conf; score += s; pushSum(`原局阴气略多，待定干${stem}再气寒易失衡`, s); }
    }
  }
  if (branchUndecided) {
    // 地支补偏（权重大：地支主实，大运重地支）
    if (yangShort && branchYY === 'yang') { const s = +5.5*half*conf; score += s; pushSum(`地支${branch}月令待定·气暖（木火/燥土），补原局阳气不足`, +s); }
    if (yangShort && branchYY === 'yin')  { const s = -3*half*conf; score += s; pushSum(`地支${branch}月令待定·气寒（金水/湿土），再增阴气→偏`, s); }
    if (yinShort  && branchYY === 'yin')  { const s = +5.5*half*conf; score += s; pushSum(`地支${branch}月令待定·气寒（金水/湿土），补原局阴气不足`, +s); }
    if (yinShort  && branchYY === 'yang') { const s = -3*half*conf; score += s; pushSum(`地支${branch}月令待定·气暖（木火/燥土），再增阳气→偏`, s); }
    if (balanced) {
      const yangDom = yinYangPct.yang > yinYangPct.yin;
      if (yangDom && branchYY === 'yang') { const s = -2*conf; score += s; pushSum(`原局阳气略多，待定支${branch}再气暖易失衡`, s); }
      if (!yangDom && branchYY === 'yin') { const s = -2*conf; score += s; pushSum(`原局阴气略多，待定支${branch}再气寒易失衡`, s); }
    }
  }
  if (conf < 1) {
    pushSum(`${chart.month.branch}月两局未定（逐字待定过半）：补偏/自洽修正按30%置信降权`, 0);
  }

  // -------- C. 干支相生 · 气机流通（小分量C，±3；克的关系已由 A 段落实修正承接，不重复计分） --------
  // 待定字（dai→neutral）不作「气顺加分」的强判——其利害本身存疑，按不增减处理。
  if (stemShengBranch) {
    if (branchMark === 'useful')     { const s = +3*conf; score += s; pushSum(`干生支（${stem}生${branch}），支为月令用神→气流通`, +s); }
    else if (branchMark === 'taboo') { const s = -1*conf; score += s; pushSum(`干生支（${stem}生${branch}），支为月令忌神→助忌`, s); }
    else                             { pushSum(`干生支（${stem}生${branch}），支为月令待定→气机之益存疑（不增减）`, 0); }
  } else if (branchShengStem) {
    if (stemMark === 'useful')       { const s = +3*conf; score += s; pushSum(`支生干（${branch}生${stem}），干为月令用神→得根落实`, +s); }
    else if (stemMark === 'taboo')   { const s = -1*conf; score += s; pushSum(`支生干（${branch}生${stem}），干为月令忌神→助忌`, s); }
    else                             { pushSum(`支生干（${branch}生${stem}），干为月令待定→气机之益存疑（不增减）`, 0); }
  }

  // -------- D. 刑冲合会：不参与评分（用户定标：非天之易逐字判定依据） --------
  // 刑冲合害的取象描述仍由象法「干支作用」模块呈现，但不对岁运分数做任何加减；
  // 逐字资料库中以冲/合为依据的字（如辰月戌「冲辰开库」=用、未「合木转喜」=待定）
  // 其吉凶已由 A/B 段承接，无需重复计分。otherSumRaw 恒为 0（保留字段兼容 UI 明细行）。
  otherSumRaw = 0;

  // 按绝对分数从大到小排序，取前 5 条给 description/hint 展示
  summary.sort((a, b) => {
    const sa = parseFloat(a.split(' ')[0]);
    const sb = parseFloat(b.split(' ')[0]);
    return Math.abs(sb) - Math.abs(sa);
  });

  return {
    score: Number(score.toFixed(2)),
    summary: summary.slice(0, 5),
    plusSumRaw:  Number(plusSumRaw.toFixed(2)),
    minusSumRaw: Number(minusSumRaw.toFixed(2)),
    otherSumRaw: Number(otherSumRaw.toFixed(2)),
  };
}

export function analyzeJiXiong(
  chart: BaZiChart,
  yongJi: YongJiResult,
): {
  stems: CharJiXiong[]; // 4 天干：年干、月干、日干、时干
  branches: CharJiXiong[]; // 4 地支
  overall: string; // 整体总结
} {
  const pillars = [chart.year, chart.month, chart.day, chart.hour];
  const stemPosNames = ['年干', '月干', '日干', '时干'];
  const branchPosNames = ['年支', '月支', '日支', '时支'];
  const stems = pillars.map((p) => p.stem);
  const branches = pillars.map((p) => p.branch);
  const stemEls = stems.map((s) => STEM_ELEMENTS[s]);
  const branchEls = branches.map((b) => BRANCH_ELEMENTS[b]);

  const stemSourcesByPos: Record<string, JiXiongSource[]> = { 年干: [], 月干: [], 日干: [], 时干: [] };
  const branchSourcesByPos: Record<string, JiXiongSource[]> = { 年支: [], 月支: [], 日支: [], 时支: [] };

  // --------------------------
  // 1. 用神/忌神：每条字的基础分（最高优先级的"吉凶来源"）
  // --------------------------
  stemPosNames.forEach((pos, idx) => {
    const mark = yongJi.stemMarks[pos];
    const elName = elementName(stemEls[idx]);
    let baseScore = 0;
    let baseNature: '吉' | '凶' | '平' = '平';
    let baseLabel: '用神' | '忌神' | '中性' = '中性';
    if (mark === 'useful') {
      baseScore = 3;
      baseNature = '吉';
      baseLabel = '用神';
    } else if (mark === 'taboo') {
      baseScore = -3;
      baseNature = '凶';
      baseLabel = '忌神';
    }
    stemSourcesByPos[pos].push({
      type: '用忌',
      from: '月令平衡',
      to: `${pos}${stems[idx]}`,
      detail: `${pos}${stems[idx]}（${elName}）为命局${baseLabel}：${baseLabel === '用神' ? '旺之为吉，得生助则更利' : baseLabel === '忌神' ? '旺之为凶，得生助则增祸' : '格局中地位平常，吉凶视周边作用而定'}。《自然易鉴》：用神者命之所需，如饥之需食、寒之需衣；忌神者命之所恶，如病之需药去、毒之需解。`,
      score: baseScore,
      nature: baseNature,
    });
  });
  branchPosNames.forEach((pos, idx) => {
    const mark = yongJi.branchMarks[pos];
    const elName = elementName(branchEls[idx]);
    let baseScore = 0;
    let baseNature: '吉' | '凶' | '平' = '平';
    let baseLabel: '用神' | '忌神' | '中性' = '中性';
    if (mark === 'useful') {
      baseScore = 3;
      baseNature = '吉';
      baseLabel = '用神';
    } else if (mark === 'taboo') {
      baseScore = -3;
      baseNature = '凶';
      baseLabel = '忌神';
    }
    branchSourcesByPos[pos].push({
      type: '用忌',
      from: '月令平衡',
      to: `${pos}${branches[idx]}`,
      detail: `${pos}${branches[idx]}（${elName}）为命局${baseLabel}。地支为根、为体、为内在气机，${baseLabel === '用神' ? '得地支根重则根深叶茂、有依有靠' : baseLabel === '忌神' ? '忌神根深则祸根深种、岁运引动即发' : '中平之根，吉凶随作用而定'}。`,
      score: baseScore,
      nature: baseNature,
    });
  });

  // --------------------------
  // 2. 天干之间的作用：五合、生、克、同气比助
  // --------------------------
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (i === j) continue;
      const a = stems[i];
      const b = stems[j];
      const wuHeKey = a + b;
      const wuHeRev = b + a;
      // 五合（双向标记）
      if (TIAN_GAN_WU_HE[wuHeKey] || TIAN_GAN_WU_HE[wuHeRev]) {
        const hua = TIAN_GAN_WU_HE[wuHeKey] || TIAN_GAN_WU_HE[wuHeRev];
        const ordered = TIAN_GAN_WU_HE[wuHeKey] ? wuHeKey : wuHeRev;
        const beneficial = (yongJi.usefulElements.includes(SHENG_ORDER[a as keyof typeof SHENG_ORDER] === b ? b : SHENG_ORDER[b as keyof typeof SHENG_ORDER] === a ? a : STEM_ELEMENTS[ordered[0]]));
        // 仅 i < j 时推一次避免重复，然后两边都加
        if (i < j) {
          const score = 2;
          const nature: '吉' | '凶' | '平' = beneficial ? '吉' : '平';
          stemSourcesByPos[stemPosNames[i]].push({
            type: '五合',
            from: `${stemPosNames[j]}${b}`,
            to: `${stemPosNames[i]}${a}`,
            detail: `天干五合：${ordered}${hua}（${stemPosNames[i]}${a} 与 ${stemPosNames[j]}${b} 相合）。合主凝聚、有情、羁绊，化出五行若为用神则吉上加吉。`,
            score,
            nature,
          });
          stemSourcesByPos[stemPosNames[j]].push({
            type: '五合',
            from: `${stemPosNames[i]}${a}`,
            to: `${stemPosNames[j]}${b}`,
            detail: `天干五合：${ordered}${hua}（${stemPosNames[j]}${b} 与 ${stemPosNames[i]}${a} 相合）。合主有情、缘分、人事聚合，原局合多则人缘聚、贵气凝。`,
            score,
            nature,
          });
        }
        continue;
      }
      const aEl = stemEls[i];
      const bEl = stemEls[j];
      if (aEl === bEl) {
        // 同气比助
        if (i < j) {
          const mark = yongJi.stemMarks[stemPosNames[j]];
          const nature: '吉' | '凶' | '平' = mark === 'useful' ? '吉' : mark === 'taboo' ? '凶' : '平';
          const score = nature === '吉' ? 1 : nature === '凶' ? -1 : 0;
          stemSourcesByPos[stemPosNames[i]].push({
            type: '同气比助',
            from: `${stemPosNames[j]}${b}`,
            to: `${stemPosNames[i]}${a}`,
            detail: `${stemPosNames[i]}${a} 与 ${stemPosNames[j]}${b} 同属${elementName(aEl)}，为比肩/比劫同气之助。${nature === '吉' ? '用神得力则朋友兄弟帮扶、事业共进' : nature === '凶' ? '忌神成势则比肩夺财、朋友拖累、竞争激烈' : '比助平常，影响不大'}。`,
            score,
            nature,
          });
          stemSourcesByPos[stemPosNames[j]].push({
            type: '同气比助',
            from: `${stemPosNames[i]}${a}`,
            to: `${stemPosNames[j]}${b}`,
            detail: `${stemPosNames[j]}${b} 与 ${stemPosNames[i]}${a} 同属${elementName(aEl)}，为比劫同气。${nature === '吉' ? '同伴相助，易得朋友之利' : nature === '凶' ? '同党为忌，易因合作破财' : '同辈助力中性'}。`,
            score,
            nature,
          });
        }
        continue;
      }
      // a 生 b（i 对 j 发生生）
      if (SHENG_ORDER[aEl] === bEl) {
        // b 得到 i 来生 b
        const mark = yongJi.stemMarks[stemPosNames[j]];
        const nature: '吉' | '凶' | '平' = mark === 'useful' ? '吉' : mark === 'taboo' ? '凶' : '平';
        const score = nature === '吉' ? 2 : nature === '凶' ? -2 : 0;
        stemSourcesByPos[stemPosNames[j]].push({
          type: '天干生',
          from: `${stemPosNames[i]}${a}`,
          to: `${stemPosNames[j]}${b}`,
          detail: `${stemPosNames[i]}${a}（${elementName(aEl)}）生 ${stemPosNames[j]}${b}（${elementName(bEl)}）。生为滋养、输送、长辈贵人之助。${nature === '吉' ? '用神得生则力量倍增，如树得雨露，欣欣向荣' : nature === '凶' ? '忌神得生则如虎添翼，凶性愈盛，需制化' : '生助中性，影响平常'}。`,
          score,
          nature,
        });
      }
      // a 克 b（i 对 j 发生克）
      if (KE_ORDER[aEl] === bEl) {
        const mark = yongJi.stemMarks[stemPosNames[j]];
        // 用神被克 → 凶；忌神被克 → 吉（克去忌神反为美）；中性 → 平
        let nature: '吉' | '凶' | '平' = '平';
        if (mark === 'useful') nature = '凶';
        else if (mark === 'taboo') nature = '吉';
        const score = nature === '吉' ? 2 : nature === '凶' ? -2 : 0;
        stemSourcesByPos[stemPosNames[j]].push({
          type: '天干克',
          from: `${stemPosNames[i]}${a}`,
          to: `${stemPosNames[j]}${b}`,
          detail: `${stemPosNames[i]}${a}（${elementName(aEl)}）克 ${stemPosNames[j]}${b}（${elementName(bEl)}）。克为抑制、约束、压力、阻力、小人。${nature === '吉' ? '克去忌神为美：官杀制比劫、食神制七杀，制凶则吉' : nature === '凶' ? '用神被克为凶：如用神受小人压制、事业受制、才华难伸' : '克制中性，压力与制衡并存'}。`,
          score,
          nature,
        });
      }
    }
  }

  // --------------------------
  // 3. 干支之间（同柱的天干 vs 地支）：干生支/支生干/干克支/支克干
  // --------------------------
  for (let i = 0; i < 4; i++) {
    const sEl = stemEls[i];
    const bEl = branchEls[i];
    if (sEl === bEl) continue; // 同气不额外计算
    const stemMark = yongJi.stemMarks[stemPosNames[i]];
    const branchMark = yongJi.branchMarks[branchPosNames[i]];
    // 支生干：地支生天干
    if (SHENG_ORDER[bEl] === sEl) {
      const nature: '吉' | '凶' | '平' = stemMark === 'useful' ? '吉' : stemMark === 'taboo' ? '凶' : '平';
      const score = nature === '吉' ? 2 : nature === '凶' ? -2 : 1; // 支生干本身为"得根生"，中性也为略吉
      stemSourcesByPos[stemPosNames[i]].push({
        type: '干支生克',
        from: `${branchPosNames[i]}${branches[i]}`,
        to: `${stemPosNames[i]}${stems[i]}`,
        detail: `同柱支生干：${branchPosNames[i]}${branches[i]}（${elementName(bEl)}）生 ${stemPosNames[i]}${stems[i]}（${elementName(sEl)}）。支为根为体，干为苗为用，支生干则根生苗、根深叶茂，天干坐长生/印绶之地。`,
        score,
        nature,
      });
    }
    // 干生支
    if (SHENG_ORDER[sEl] === bEl) {
      const nature: '吉' | '凶' | '平' = branchMark === 'useful' ? '吉' : branchMark === 'taboo' ? '凶' : '平';
      const score = nature === '吉' ? 1 : nature === '凶' ? -1 : 0;
      stemSourcesByPos[stemPosNames[i]].push({
        type: '干支生克',
        from: `${stemPosNames[i]}${stems[i]}`,
        to: `${branchPosNames[i]}${branches[i]}`,
        detail: `同柱干生支：${stemPosNames[i]}${stems[i]}（${elementName(sEl)}）生 ${branchPosNames[i]}${branches[i]}（${elementName(bEl)}）。天干之力下泄于地支，主天干付出、奉献、泄气。`,
        score,
        nature,
      });
    }
    // 干克支（盖头）
    if (KE_ORDER[sEl] === bEl) {
      const nature: '吉' | '凶' | '平' = branchMark === 'taboo' ? '吉' : branchMark === 'useful' ? '凶' : '平';
      const score = nature === '吉' ? 2 : nature === '凶' ? -2 : -1; // 盖头天然有"压制"感，中性略扣分
      stemSourcesByPos[stemPosNames[i]].push({
        type: '干支生克',
        from: `${stemPosNames[i]}${stems[i]}`,
        to: `${branchPosNames[i]}${branches[i]}`,
        detail: `同柱干克支（盖头）：${stemPosNames[i]}${stems[i]}（${elementName(sEl)}）盖克 ${branchPosNames[i]}${branches[i]}（${elementName(bEl)}）。盖头则地支被压，该柱之力减半，主做事有阻力、表面压制内在，该柱所代表的人/事/物多周折。`,
        score,
        nature,
      });
    }
    // 支克干（截脚）
    if (KE_ORDER[bEl] === sEl) {
      const nature: '吉' | '凶' | '平' = stemMark === 'taboo' ? '吉' : stemMark === 'useful' ? '凶' : '平';
      const score = nature === '吉' ? 2 : nature === '凶' ? -2 : -1; // 截脚也为不吉
      stemSourcesByPos[stemPosNames[i]].push({
        type: '干支生克',
        from: `${branchPosNames[i]}${branches[i]}`,
        to: `${stemPosNames[i]}${stems[i]}`,
        detail: `同柱支克干（截脚）：${branchPosNames[i]}${branches[i]}（${elementName(bEl)}）截克 ${stemPosNames[i]}${stems[i]}（${elementName(sEl)}）。截脚则天干被伤、根基受损，主做事虚浮无力、外强中干、易被背后暗算、事业不稳、易破财。`,
        score,
        nature,
      });
    }
  }

  // --------------------------
  // 4. 地支之间的作用：六合/六冲/六害/三刑/三合/三会
  // --------------------------
  const applyToBoth = (
    i: number,
    j: number,
    type: JiXiongSource['type'],
    descTemplate: (aName: string, bName: string) => { detailA: string; detailB: string; nature: '吉' | '凶' | '平'; score: number },
  ) => {
    const res = descTemplate(branchPosNames[i] + branches[i], branchPosNames[j] + branches[j]);
    branchSourcesByPos[branchPosNames[i]].push({
      type,
      from: branchPosNames[j] + branches[j],
      to: branchPosNames[i] + branches[i],
      detail: res.detailA,
      score: res.score,
      nature: res.nature,
    });
    branchSourcesByPos[branchPosNames[j]].push({
      type,
      from: branchPosNames[i] + branches[i],
      to: branchPosNames[j] + branches[j],
      detail: res.detailB,
      score: res.score,
      nature: res.nature,
    });
  };

  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const key = branches[i] + branches[j];
      const rev = branches[j] + branches[i];
      // 六合
      if (DI_ZHI_LIU_HE[key] || DI_ZHI_LIU_HE[rev]) {
        const hua = DI_ZHI_LIU_HE[key] || DI_ZHI_LIU_HE[rev]!;
        const ordered = DI_ZHI_LIU_HE[key] ? key : rev;
        const huaElMap: Record<string, string> = {
          合木: 'wood', 合火: 'fire', 合土: 'earth', 合金: 'metal', 合水: 'water',
        };
        const huaEl = huaElMap[hua] || branchEls[i];
        const beneficial = yongJi.usefulElements.includes(huaEl);
        const nature: '吉' | '凶' | '平' = beneficial ? '吉' : '平';
        const score = beneficial ? 2 : 1;
        applyToBoth(i, j, '地支六合', (a, b) => ({
          detailA: `地支六合：${ordered}${hua}（${a} 与 ${b} 相合）。合主凝聚、有情、稳定；化出${elementName(huaEl)}${beneficial ? '为用神，合则聚贵、人缘和合、合作成事' : '虽非用神，亦主人事安稳少动'}。`,
          detailB: `地支六合：${ordered}${hua}（${b} 与 ${a} 相合）。合主静聚，少动荡、多得贵人扶持与人际缘分。`,
          nature,
          score,
        }));
      }
      // 六冲
      if (LIU_CHONG_PAIRS[key] || LIU_CHONG_PAIRS[rev]) {
        applyToBoth(i, j, '地支六冲', (a, b) => ({
          detailA: `地支六冲：${a} 冲 ${b}。冲主动荡、变动、冲突、分离、破财、远行；冲吉则旧的不去新的不来、动中得贵；冲凶则破耗连连、人事不和、疾病横生。《自然易鉴》：冲如两军对垒，不死不休，所冲之宫必有变动。`,
          detailB: `地支六冲：${b} 冲 ${a}。冲主散、动、破、坏；冲破用神则福去，冲破忌神则祸除。`,
          nature: '凶',
          score: -2,
        }));
      }
      // 六害
      if (LIU_HAI_PAIRS[key] || LIU_HAI_PAIRS[rev]) {
        applyToBoth(i, j, '地支六害', (a, b) => ({
          detailA: `地支六害：${a} 害 ${b}。害主暗中损耗、暗伤、暗疾、小人、是非，看不见的伤害与隔阂；明枪易躲暗箭难防，所害之宫多有隐形祸端。`,
          detailB: `地支六害：${b} 害 ${a}。害为暗中相克、恩情反怨，主朋友反目、家人隔阂、健康暗耗、财物暗损。`,
          nature: '凶',
          score: -2,
        }));
      }
      // 子卯无礼之刑
      const pairStr = [branches[i], branches[j]].sort().join('');
      if (pairStr === '卯子') {
        applyToBoth(i, j, '地支三刑', (a, b) => ({
          detailA: `三刑（无礼）：${a} 刑 ${b}（子卯相刑）。主礼仪缺失、言行无状、伦理不顺、子女不孝、感情混乱、失礼招祸。`,
          detailB: `三刑（无礼）：${b} 刑 ${a}（子卯相刑）。无礼之刑主上下失序、内外失和，需谨言慎行修德避祸。`,
          nature: '凶',
          score: -3,
        }));
      }
    }
  }
  // 三刑（无恩）：寅巳申
  const wuenPresent = SAN_XING_WUEN.filter((c) => branches.includes(c));
  if (wuenPresent.length >= 2) {
    wuenPresent.forEach((c) => {
      const idx = branches.indexOf(c);
      if (idx < 0) return;
      const others = wuenPresent.filter((x) => x !== c).join('');
      branchSourcesByPos[branchPosNames[idx]].push({
        type: '地支三刑',
        from: `地支${others}`,
        to: branchPosNames[idx] + c,
        detail: `三刑（无恩）：${wuenPresent.join('')}相刑。主忘恩负义、贵人变小人、人际反目、亲情淡薄、恩怨纠缠、事业波折。《自然易鉴》：刑者，伤也、残也，五行伤残、气机破损，需多行善积德方能化解。`,
        score: -3,
        nature: '凶',
      });
    });
  }
  // 三刑（恃势）：丑未戌
  const shishiPresent = SAN_XING_SHISHI.filter((c) => branches.includes(c));
  if (shishiPresent.length >= 2) {
    shishiPresent.forEach((c) => {
      const idx = branches.indexOf(c);
      if (idx < 0) return;
      const others = shishiPresent.filter((x) => x !== c).join('');
      branchSourcesByPos[branchPosNames[idx]].push({
        type: '地支三刑',
        from: `地支${others}`,
        to: branchPosNames[idx] + c,
        detail: `三刑（恃势）：${shishiPresent.join('')}相刑。主仗势欺人、争强好胜、纠纷不断、官非口舌、家业不宁、同辈相克。恃势之刑需谦逊退让，莫与人争。`,
        score: -3,
        nature: '凶',
      });
    });
  }
  // 自刑：辰午酉亥（见两个以上）
  ZI_XING_LIST.forEach((c) => {
    const found: number[] = [];
    branches.forEach((b, idx) => { if (b === c) found.push(idx); });
    if (found.length >= 2) {
      found.forEach((idx) => {
        const othersText = found.filter((f) => f !== idx).map((f) => branchPosNames[f] + c).join('与');
        branchSourcesByPos[branchPosNames[idx]].push({
          type: '地支三刑',
          from: othersText,
          to: branchPosNames[idx] + c,
          detail: `自刑：${c}${c}自见（${othersText}）。主自我纠结、内耗严重、多疑多虑、自我施压、无事生非、心病缠身、自作自受；需心量放宽，少钻牛角尖。`,
          score: -2,
          nature: '凶',
        });
      });
    }
  });

  // 三合局
  SAN_HE_GROUPS.forEach((group) => {
    const idxs = group.members.map((c) => branches.indexOf(c)).filter((i) => i >= 0);
    if (idxs.length >= 2) {
      const present = idxs.map((i) => branches[i]).join('');
      const quan = group.name;
      const el = group.element;
      const beneficial = yongJi.usefulElements.includes(el);
      const nature: '吉' | '凶' | '平' = beneficial ? '吉' : '平';
      const score = (idxs.length >= 3 ? 3 : 2) * (beneficial ? 1 : 0.5) * 1;
      idxs.forEach((idx) => {
        const others = idxs.filter((x) => x !== idx).map((x) => branchPosNames[x] + branches[x]).join('、');
        branchSourcesByPos[branchPosNames[idx]].push({
          type: '地支三合',
          from: others,
          to: branchPosNames[idx] + branches[idx],
          detail: `地支三合：${present}${quan}三合局（${idxs.length >= 3 ? '三全' : '半合'}），汇聚${elementName(el)}之气。${beneficial ? '用神成局则富贵可期，朋友合力、合作成事、贵人众多。' : '虽非用神，亦主人缘聚、事有合和之象。'}`,
          score: beneficial ? score : 1,
          nature,
        });
      });
    }
  });
  // 三会局
  SAN_HUI_GROUPS.forEach((group) => {
    const idxs = group.members.map((c) => branches.indexOf(c)).filter((i) => i >= 0);
    if (idxs.length >= 2) {
      const present = idxs.map((i) => branches[i]).join('');
      const quan = group.name;
      const el = group.element;
      const beneficial = yongJi.usefulElements.includes(el);
      const nature: '吉' | '凶' | '平' = beneficial ? '吉' : '平';
      const score = (idxs.length >= 3 ? 4 : 2) * (beneficial ? 1 : 0.5) * 1; // 三会力最大
      idxs.forEach((idx) => {
        const others = idxs.filter((x) => x !== idx).map((x) => branchPosNames[x] + branches[x]).join('、');
        branchSourcesByPos[branchPosNames[idx]].push({
          type: '地支三会',
          from: others,
          to: branchPosNames[idx] + branches[idx],
          detail: `地支三会：${present}${quan}三会局（${idxs.length >= 3 ? '三全，力量最大' : '半会'}），汇聚一方纯${elementName(el)}之气，能彻底改变原局旺衰。${beneficial ? '用神三会则大成，富贵绵长；忌神三会则大凶，灾祸连绵' : '力大势强，吉凶看引动'}。`,
          score: beneficial ? score : 1,
          nature,
        });
      });
    }
  });

  // --------------------------
  // 5. 汇总：计算每个字的总分与吉凶等级
  // --------------------------
  const calc = (
    pos: string,
    char: string,
    el: string,
    sources: JiXiongSource[],
    baseLabelKey: string,
  ): CharJiXiong => {
    const total = sources.reduce((s, x) => s + x.score, 0);
    let jiXiong: CharJiXiong['jiXiong'] = '平';
    if (total >= 5) jiXiong = '大吉';
    else if (total >= 2) jiXiong = '吉';
    else if (total <= -5) jiXiong = '大凶';
    else if (total <= -2) jiXiong = '凶';
    const baseSource = sources.find((s) => s.type === '用忌');
    const useJiBase = (baseSource?.detail.includes('用神') ? '用神' : baseSource?.detail.includes('忌神') ? '忌神' : '中性') as CharJiXiong['useJiBase'];
    // 汇总吉凶来源类型的简要描述
    const favorable = sources.filter((s) => s.nature === '吉' && s.type !== '用忌').map((s) => s.type);
    const harmful = sources.filter((s) => s.nature === '凶' && s.type !== '用忌').map((s) => s.type);
    const uniqueF = Array.from(new Set(favorable));
    const uniqueH = Array.from(new Set(harmful));
    const summaryParts: string[] = [];
    if (useJiBase !== '中性') summaryParts.push(`基本盘为${useJiBase}`);
    if (uniqueF.length > 0) summaryParts.push(`得${uniqueF.join('、')}之助`);
    if (uniqueH.length > 0) summaryParts.push(`遭${uniqueH.join('、')}之扰`);
    const summary = summaryParts.length > 0
      ? `${pos}${char}：${summaryParts.join('，')}，综合为「${jiXiong}」（综合分 ${total >= 0 ? '+' : ''}${total}）。`
      : `${pos}${char}：作用来源较少，综合「${jiXiong}」。`;
    return {
      position: pos,
      char,
      element: el,
      jiXiong,
      totalScore: total,
      useJiBase,
      sources,
      summary,
    };
  };

  const stemsResult = stemPosNames.map((pos, idx) =>
    calc(pos, stems[idx], stemEls[idx], stemSourcesByPos[pos], pos),
  );
  const branchesResult = branchPosNames.map((pos, idx) =>
    calc(pos, branches[idx], branchEls[idx], branchSourcesByPos[pos], pos),
  );

  const overall = `原局八字（4 天干 + 4 地支）共 8 字，其吉凶各自有出处。吉字多（用神得力、合多冲少、刑害少）则原局根基牢固、福禄深厚；凶字多（忌神成党、冲刑害重）则原局多舛，需待大运流年引动用神来救。逐个查阅下方「来源明细」即可知晓：每一吉从何来（谁生谁合谁助）、每一凶从何起（谁冲谁克谁刑谁害）。`;

  return { stems: stemsResult, branches: branchesResult, overall };
}

// 健康分析（融合《自然易鉴》第九章第四节·健康寿夭断法 + 第三章第四节·健康对应）
export function analyzeHealth(
  chart: BaZiChart,
  yongJi: YongJiResult,
  elementPower: { wood: number; fire: number; earth: number; metal: number; water: number },
): {
  weakElements: string[];
  healthRisks: string[];
  bodyParts: string;
  shouYuanHint: string;
} {
  const weakElements: string[] = [];
  const healthRisks: string[] = [];

  // 阴阳盛衰倾向
  const yangPower = elementPower.wood + elementPower.fire;
  const yinPower = elementPower.metal + elementPower.water;
  const yangDry = yangPower - yinPower > 20;
  const yinCold = yinPower - yangPower > 20;

  // 找出最弱的五行
  const powers = [
    { el: 'wood', power: elementPower.wood, name: '木' },
    { el: 'fire', power: elementPower.fire, name: '火' },
    { el: 'earth', power: elementPower.earth, name: '土' },
    { el: 'metal', power: elementPower.metal, name: '金' },
    { el: 'water', power: elementPower.water, name: '水' },
  ];
  powers.sort((a, b) => a.power - b.power);

  // 最弱的两个五行 + 对应疾病（第九章第四节）
  const weakest = powers.slice(0, 2);
  weakest.forEach((w) => {
    weakElements.push(w.name);
    const riskMap: Record<string, string> = {
      wood: '木弱/受损：肝胆易出问题，筋骨易伤，情绪易抑郁（对应：肝、胆、筋、目、怒）',
      fire: '火弱/受损：心脑血管易出问题，血液循环欠佳，易怕冷（对应：心、小肠、脉、舌、喜）',
      earth: '土弱/受损：脾胃消化功能较弱，易有肠胃不适（对应：脾、胃、肉、口、思）',
      metal: '金弱/受损：肺与呼吸道易出问题，皮肤敏感，大肠功能弱（对应：肺、大肠、皮毛、鼻、悲）',
      water: '水弱/受损：肾与泌尿系统易出问题，精力不足（对应：肾、膀胱、骨、耳、恐）',
    };
    healthRisks.push(riskMap[w.el] || '');
  });

  // 阳燥/阴寒倾向的健康风险（《自然易鉴》第三章第四节·三 + 第九章第四节）
  if (yangDry) {
    healthRisks.unshift('【阳燥无制倾向】易患心火、炎症、血压、视力、皮肤、肝胆燥热之疾——《自然易鉴》：阳燥无制，火炎土燥、金水受损。');
  }
  if (yinCold) {
    healthRisks.unshift('【阴寒无制倾向】易患肾虚、脾胃、风湿、气血不足、妇科、寒湿淤堵之疾——《自然易鉴》：阴寒无制，水寒土冻、木火无力。');
  }

  // 寿夭判断（第九章第四节：阴阳平衡、气机流通、五行有生、格局不破则福寿绵长）
  const yongCount = Object.values(yongJi.stemMarks).filter((v) => v === 'useful').length
    + Object.values(yongJi.branchMarks).filter((v) => v === 'useful').length;
  const tabooCount = Object.values(yongJi.stemMarks).filter((v) => v === 'taboo').length
    + Object.values(yongJi.branchMarks).filter((v) => v === 'taboo').length;
  const shouYuanHint = yongCount >= tabooCount + 2
    ? '《自然易鉴》寿夭断法：阴阳平衡、气机流通、五行有生、格局不破——生机绵长、福寿绵长。'
    : tabooCount >= yongCount + 2
      ? '《自然易鉴》寿夭断法：阴阳隔绝、气机闭塞、五行无生、格局大破倾向——生机易损，建议修身立德、定期体检、调养身心，改运转运之大道在勤勉精进、积善修福。'
      : '《自然易鉴》寿夭断法：阴阳略有偏颇、气机稍有阻滞——寿元总体平顺，后天养生、修身养性可添福延寿。';

  const bodyParts = '年柱对应头部（头、面、骨、脑），月柱对应胸背（肩、手、肺、心），日柱对应腰腹（腹、腰、肝、肾、脾、胃），时柱对应腿脚（足、下肢）。各柱干支的用忌与受克情况，对应身体相应部位的健康隐患。忌神被制为吉，反而是健康之处；用神被克为凶，对应部位易出问题。《自然易鉴》：健康核心在于水火平衡、寒热适度。';

  return { weakElements, healthRisks, bodyParts, shouYuanHint };
}

// 大运流年吉凶分析（阴阳气喜用关系为核心判断）
export function analyzeDaYunLiuNian(
  chart: BaZiChart,
  yongJi: YongJiResult,
  monthQi: MonthQiResult,
  elementPower: { wood: number; fire: number; earth: number; metal: number; water: number },
  currentYear: number,
): {
  daYunWithFortune: Array<{
    index: number;
    stem: string;
    branch: string;
    startAge: number;
    startYear: number;
    endYear: number;
    fortune: WuDangLevel;
    score: number;        // 压缩分 displayScore（用于表格展示"综合分"）
    rawScore: number;     // 原始分（供内部序列加成使用）
    plusSumRaw: number;   // 原始分加分合计（用忌+自洽正+刑冲正）
    minusSumRaw: number;  // 原始分扣分合计（用忌+自洽负+刑冲负，负数）
    otherSumRaw: number;  // 恒为 0（刑冲合会不参与评分）
    topReasons: string[];
    description: string;
    // 新：趋势相关 & 档位
    level: WuDangLevel;
    band: string;
    displayScore: number;
    upgradeBonusApplied: boolean;
    downgradeAlert: boolean;
    liuNian10: Array<{
      year: number;
      ganzhi: string;
      fortune: WuDangLevel;
      score: number;
      rawScore: number;
      plusSumRaw: number;
      minusSumRaw: number;
      otherSumRaw: number;
      displayScore: number;
      topReasons: string[];
      hint: string;
      level: WuDangLevel;
      band: string;
      upgradeBonusApplied: boolean;
      downgradeAlert: boolean;
    }>;
  }>;
  currentDaYunIndex: number;
  currentDaYunDetail: string; // 保留类型兼容，UI 上不再使用（改为画函数曲线）
  currentDaYunCurve: {
    label: string; // 如：甲子大运 31-40岁（2024-2033）
    items: Array<{ year: number; ganzhi: string; displayScore: number; level: WuDangLevel }>;
  };
  recentLiuNian: Array<{
    year: number;
    ganzhi: string;
    fortune: WuDangLevel;
    score: number;
    rawScore: number;
    plusSumRaw: number;
    minusSumRaw: number;
    otherSumRaw: number;
    displayScore: number;
    topReasons: string[];
    hint: string;
    level: WuDangLevel;
    band: string;
    upgradeBonusApplied: boolean;
    downgradeAlert: boolean;
  }>;
} {
  const yinYangPct = calculateYinYangBalance(chart);
  // 命盘基准分（新机制）：先天层次，作为大运/流年联动的基准
  const mingPan = scoreMingPan(chart, yongJi);
  const mingPanCompress = mingPan.displayScore;

  // 把「阴阳作用→某流年/某运」的映射抽象成一个小工具，避免重复
  const calcLiuNian = (year: number, stem: string, branch: string) => {
    const {
      score: rawScore,
      summary,
      plusSumRaw,
      minusSumRaw,
      otherSumRaw,
    } = scoreGanZhiImpact(stem, branch, chart, yongJi, monthQi, yinYangPct);
    const { level, band, displayScore } = wuDangFromScore(rawScore);
    const topReasons = summary.length > 0 ? summary : ['阴阳气平常，吉凶平静'];
    const hint = `${year}${stem}${branch}（分 ${displayScore >= 0 ? '+' : ''}${displayScore}，${level}）：${band}。关键阴阳作用：${topReasons.slice(0, 2).join('；')}。`;
    return {
      year, ganzhi: stem + branch, fortune: level, score: displayScore,
      rawScore, plusSumRaw, minusSumRaw, otherSumRaw,
      displayScore, topReasons, hint, level, band,
    };
  };

  // 1) 先算出各步大运的 rawScore + 下辖 10 年流年原始信息
  const daYunBase = chart.daYun.map((dy) => {
    const {
      score: rawScoreDY,
      summary,
      plusSumRaw: ps,
      minusSumRaw: ms,
      otherSumRaw: os,
    } = scoreGanZhiImpact(dy.stem, dy.branch, chart, yongJi, monthQi, yinYangPct);
    const liuNian10 = getLiuNianList(dy.startYear, 10).map((ln) => calcLiuNian(ln.year, ln.stem, ln.branch));

    // —— 大运总判新口径：rawScore = 大运本身分数 + 下辖10年流年平均分数（压缩分口径相加再还原） ——
    // 先统一为压缩分（÷3.6），把大运压缩分 + 十年平均压缩分，再乘回 3.6 还原成 rawScore，
    // 这样后续 wuDangFromScore 会走同一套 compressScore + 5级映射逻辑。
    const dyCompress = rawScoreDY / 3.6;
    const liuNianAvgCompress = liuNian10.reduce((s, ln) => s + (ln.rawScore / 3.6), 0) / liuNian10.length;
    const finalCompress = dyCompress + liuNianAvgCompress;
    const rawScore = finalCompress * 3.6;

    const base = wuDangFromScore(rawScore);
    const topReasons = summary.length > 0 ? summary : ['阴阳气平常，吉凶平静'];
    // 在"大运本身分 + 十年平均"新口径下，把十年平均分作为明细展示给用户，避免遗漏
    const finalTopReasons = [
      ...topReasons,
      `大运本身分 ${dyCompress >= 0 ? '+' : ''}${Math.round(dyCompress * 10) / 10}（${dy.stem}${dy.branch}作用）`,
      `下辖十年平均 ${liuNianAvgCompress >= 0 ? '+' : ''}${Math.round(liuNianAvgCompress * 10) / 10}（${liuNian10.length}年流年平均分）`,
    ];
    const description = `${dy.stem}${dy.branch}运（综合分 ${base.displayScore >= 0 ? '+' : ''}${base.displayScore}，${base.level}）：${base.band}。关键阴阳作用：${topReasons.slice(0, 3).join('；')}。此运天干管前五年，地支管后五年，各有侧重。`;
    return {
      ...dy,
      fortune: base.level,
      score: base.displayScore,          // 兼容旧字段（展示压缩分）
      rawScore,
      plusSumRaw: ps,
      minusSumRaw: ms,
      otherSumRaw: os,
      topReasons: finalTopReasons,
      description,
      level: base.level,
      band: base.band,
      displayScore: base.displayScore,
      upgradeBonusApplied: false,
      downgradeAlert: false,
      liuNian10,
      baseCompress: Math.round(finalCompress * 10) / 10,  // 趋势加成前的基础压缩分（大运本身+十年平均，无趋势bonus）
    };
  });

  // 2) 对"大运"整条时间序列施加 向前趋势加成 / 警告
  const daYunTrended = applyForwardTrend(daYunBase.map((dy) => ({
    // applyForwardTrend 要求 T extends { rawScore }, 且返回时会 level/displayScore/band 覆盖
    rawScore: dy.rawScore,
    plusSumRaw: dy.plusSumRaw,
    minusSumRaw: dy.minusSumRaw,
    otherSumRaw: dy.otherSumRaw,
    index: dy.index,
    stem: dy.stem,
    branch: dy.branch,
    startAge: dy.startAge,
    startYear: dy.startYear,
    endYear: dy.endYear,
    // 以下字段会被 trended 里的 level/displayScore 再次 "兼容回填"
    score: dy.score,
    topReasons: dy.topReasons,
    description: dy.description,
    liuNian10: dy.liuNian10,
    baseCompress: dy.baseCompress,  // 保留：趋势加成前的基础压缩分
  })));
  // 把 trended 上的 level/displayScore 同步回 fortune/score 字段（UI 用的是 fortune 和 score），同时保留升级信息
  const daYunWithFortune = daYunTrended.map(tr => {
    const liuNian10Trended = applyForwardTrend((tr as any).liuNian10.map((ln: any) => ({
      rawScore: ln.rawScore,
      plusSumRaw: ln.plusSumRaw,
      minusSumRaw: ln.minusSumRaw,
      otherSumRaw: ln.otherSumRaw,
      year: ln.year,
      ganzhi: ln.ganzhi,
      score: ln.score,
      topReasons: ln.topReasons,
      hint: ln.hint,
    }))).map((lnTr, i) => {
      const orig = (tr as any).liuNian10[i];
      return {
        ...orig,
        // 保留 MVP 加减分明细字段：
        plusSumRaw: (lnTr as any).plusSumRaw,
        minusSumRaw: (lnTr as any).minusSumRaw,
        otherSumRaw: (lnTr as any).otherSumRaw,
        // 新字段（覆盖/追加）：压缩分、档位、警告
        score: lnTr.displayScore,                 // UI 上目前的 'score' 展示为压缩分
        fortune: lnTr.level,                       // 兼容旧字段（liuen.fortune）
        displayScore: lnTr.displayScore,
        level: lnTr.level,
        band: lnTr.band,
        upgradeBonusApplied: lnTr.upgradeBonusApplied,
        downgradeAlert: lnTr.downgradeAlert,
        rawScore: lnTr.rawScore,
      };
    });
    return {
      ...tr,
      // 兼容旧字段：
      //  tr.fortune（不存在）→ 用 tr.level 回填到 'fortune' 列；
      //  tr.score（旧字段）  → tr.displayScore 是新的"压缩分"，覆盖之
      score: tr.displayScore,
      fortune: tr.level,
      liuNian10: liuNian10Trended,
      baseCompress: (tr as any).baseCompress,  // 保留：趋势加成前的基础压缩分
    };
  }) as any;

  const currentDaYunIndex = getCurrentDaYunIndex(chart, currentYear);
  const currentDY = daYunWithFortune[currentDaYunIndex];
  const currentDaYunDetail = ''; // 不再输出长文案（UI 改为画函数曲线）

  // —— 修复 Bug1：currentDaYunCurve.items 做数值兜底，避免 SVG 因 NaN / undefined 不渲染 ——
  const safeLiuNian10 = Array.isArray(currentDY?.liuNian10) ? currentDY.liuNian10 : [];
  const clampScore = (n: number) => {
    const v = typeof n === 'number' ? n : Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.max(-7, Math.min(7, Math.round(v * 10) / 10));
  };
  const currentDaYunCurve = {
    label: `${(currentDY && currentDY.stem) || ''}${(currentDY && currentDY.branch) || ''}大运 · ${(currentDY && currentDY.startAge) || 0}-${((currentDY && currentDY.startAge) || 0) + 9}岁（${(currentDY && currentDY.startYear) || 0}-${(currentDY && currentDY.endYear) || 0}年）`,
    items: safeLiuNian10.map((ln: any) => ({
      year: Number(ln.year) || 0,
      ganzhi: String(ln.ganzhi || ''),
      displayScore: clampScore(ln.displayScore),
      level: (ln.level || 'npc') as WuDangLevel,
    })),
  };

  // —— 修复 Bug1-2：大运 topReasons 追加「趋势加成」说明（避免综合分有加分但看不到来源的遗漏） ——
  for (const dy of daYunWithFortune) {
    if (dy.upgradeBonusApplied) {
      const baseVal = (dy as any).baseCompress ?? Math.round((wuDangFromScore((dy as any).rawScore).displayScore) * 10) / 10;
      const bonusVal = (dy as any).upgradeBonusApplied && Array.isArray(dy.topReasons) ?
        (Math.round(((dy.displayScore as number) - baseVal) * 10) / 10) : 0;
      if (bonusVal > 0) {
        dy.topReasons = [...(dy.topReasons || []), `【趋势加成】前运走低（拉），此运翻身反弹，额外加分 +${bonusVal}`];
      }
    }
  }

  // 近5年流年：year-1 ~ year+4，整条小序列单独再走一遍 applyForwardTrend（好→坏的红感叹号、拉→夯加成）
  const liuNianList = getLiuNianList(currentYear - 1, 6);
  const recentBase = liuNianList.map((ln) => {
    const c = calcLiuNian(ln.year, ln.stem, ln.branch);
    return c;
  });
  const recentTrended = applyForwardTrend(recentBase.map(c => ({
    rawScore: c.rawScore,
    plusSumRaw: c.plusSumRaw,
    minusSumRaw: c.minusSumRaw,
    otherSumRaw: c.otherSumRaw,
    year: c.year,
    ganzhi: c.ganzhi,
    fortune: c.fortune,
    score: c.score,
    displayScore: c.displayScore,
    topReasons: c.topReasons,
    hint: c.hint,
    level: c.level,
    band: c.band,
  }))).map((r) => ({
    ...r,
    // 同步 fortune/score 字段（兼容旧），新增 rawScore/displayScore + MVP 明细
    fortune: r.level,
    score: r.displayScore,
    rawScore: r.rawScore,
    plusSumRaw: r.plusSumRaw,
    minusSumRaw: r.minusSumRaw,
    otherSumRaw: r.otherSumRaw,
    displayScore: r.displayScore,
  }));
  const recentLiuNian = recentTrended as any;

  // 注：已按用户要求移除「趋势加成」和「降档警告」分值影响
  // （即不再参考"上一个大运/流年好/坏"来改变当前条目的评分或提示）
  // 每一步评分完全按本条 rawScore 独立计算。

  // —— 命盘基准联动：展示综合分 = 命盘基准分 + 岁运调整分；
  //    九档评级只按「岁运调整分」（combined − 命盘基准）定档，与先天盘高低无关，
  //    保证同一盘内好坏严格拉开梯度（letterFromCombined 阈值 ±3 尺度） ——
  for (const dy of daYunWithFortune as any[]) {
    const dyAdjust = dy.displayScore || 0; // 叠加命盘基准前的岁运调整压缩分
    const dyCombined = mingPanCompress + dyAdjust;
    const dyLetter = letterFromCombined(dyAdjust);
    const dyMap = wuDangFromCombined(dyAdjust);
    dy.displayScore = Math.round(dyCombined * 10) / 10;
    dy.score = dy.displayScore;
    dy.adjustScore = Math.round(dyAdjust * 10) / 10;  // 岁运调整分（评级依据）
    dy.letterLevel = dyLetter.level;  // 新九档字母等级
    dy.level = dyMap.level;
    dy.fortune = dyMap.level;
    dy.band = dyLetter.band;
    dy.mingPanBase = mingPanCompress;
    for (const ln of (dy.liuNian10 || [])) {
      const lnAdjust = ln.displayScore || 0;
      const lnCombined = mingPanCompress + lnAdjust;
      const lnLetter = letterFromCombined(lnAdjust);
      const lnMap = wuDangFromCombined(lnAdjust);
      ln.displayScore = Math.round(lnCombined * 10) / 10;
      ln.score = ln.displayScore;
      ln.adjustScore = Math.round(lnAdjust * 10) / 10;
      ln.letterLevel = lnLetter.level;  // 新九档字母等级
      ln.level = lnMap.level;
      ln.fortune = lnMap.level;
      ln.band = lnLetter.band;
      ln.mingPanBase = mingPanCompress;
      // hint 与最终评级同源：综合分 + 岁运调整分 + 九档字母
      ln.hint = `${ln.year}${ln.ganzhi}（综合 ${ln.displayScore >= 0 ? '+' : ''}${ln.displayScore}，岁运调整 ${ln.adjustScore >= 0 ? '+' : ''}${ln.adjustScore}，${lnLetter.level}）：${lnLetter.band}。关键阴阳作用：${(ln.topReasons || []).slice(0, 2).join('；')}。`;
    }
  }
  for (const ln of recentLiuNian as any[]) {
    const lnAdjust = ln.displayScore || 0;
    const lnCombined = mingPanCompress + lnAdjust;
    const lnLetter = letterFromCombined(lnAdjust);
    const lnMap = wuDangFromCombined(lnAdjust);
    ln.displayScore = Math.round(lnCombined * 10) / 10;
    ln.score = ln.displayScore;
    ln.adjustScore = Math.round(lnAdjust * 10) / 10;
    ln.letterLevel = lnLetter.level;  // 新九档字母等级
    ln.level = lnMap.level;
    ln.fortune = lnMap.level;
    ln.band = lnLetter.band;
    ln.mingPanBase = mingPanCompress;
    ln.hint = `${ln.year}${ln.ganzhi}（综合 ${ln.displayScore >= 0 ? '+' : ''}${ln.displayScore}，岁运调整 ${ln.adjustScore >= 0 ? '+' : ''}${ln.adjustScore}，${lnLetter.level}）：${lnLetter.band}。关键阴阳作用：${(ln.topReasons || []).slice(0, 2).join('；')}。`;
  }

  return {
    daYunWithFortune,
    currentDaYunIndex,
    currentDaYunDetail,
    currentDaYunCurve,
    recentLiuNian,
  };
}

// 十干喜忌（融合《自然易鉴》第五章第二节·十天干详解 + baziData.ts 得用/失用性情）
export interface ShiGanXiJiItem {
  stem: string;
  nature: string;
  xi: string[];
  ji: string[];
  features: string;
  deYong: string;
  shiYong: string;
}

const SHI_GAN_XI_JI_DATA: Record<string, ShiGanXiJiItem> = {
    甲: {
      stem: '甲',
      nature: '甲木为阳木，参天大树、栋梁之木，少阳阳气',
      xi: ['丁火（成阳泄木，暖局）', '庚金（平衡少阳，修剪成材）', '戊土（厚基固本）'],
      ji: ['水（损阳，泛滥漂木）', '金旺过克（折伤）'],
      features: '甲不离庚，甲用丁不用丙；得令为栋梁，失令有志难伸。甲木如雷、如青龙，主生发向上，对应胆、头、眼目。',
      deYong: '得令得地，为栋梁之才，胸怀大志、格局开阔、能担大任、利事业仕途',
      shiYong: '虚浮无根，眼高手低、心高气傲、有志难伸、多劳无成、性格固执',
    },
    乙: {
      stem: '乙',
      nature: '乙木为阴木，花草藤蔓、柔顺之木',
      xi: ['丙火（暖化寒湿，成阳）', '甲木（借力撑腰）', '土（培根）'],
      ji: ['金旺（过头克伤）', '水旺（漂荡无根）'],
      features: '乙木善借力、稳中求富；失用则依附他人、难成大器。乙木如风、如花草，主柔和蔓延，对应肝、颈。',
      deYong: '聪慧灵巧、人缘极佳、善于借力、稳中求富、一生顺遂',
      shiYong: '优柔寡断、软弱纠结、依附他人、难成大器、心胸狭隘',
    },
    丙: {
      stem: '丙',
      nature: '丙火为阳火，太阳烈火、普照之火，老阳纯阳',
      xi: ['壬水（平衡寒气，成太极）', '甲木（引丙有根，土不伤水）'],
      ji: ['戊土（泄阳太重，土多火晦）', '火旺无制（燥热招灾）'],
      features: '丙不离甲；得令名利双收，失用张扬招灾。丙火如太阳，主光明热烈，对应小肠、肩、舌。',
      deYong: '热情阳光、气场强大、光明磊落、贵人云集、名利双收、福寿双全',
      shiYong: '张扬急躁、刚愎自用、是非缠身、心性浮躁、做事虎头蛇尾',
    },
    丁: {
      stem: '丁',
      nature: '丁火为阴火，灯火烛光、温润之火',
      xi: ['甲木（引丁有根，木火通明）', '庚金（丁火炼金成器）'],
      ji: ['水旺克火（灭火无阳）'],
      features: '丁火主文、主技艺；丁火失用才华埋没。丁火如灯烛，主温暖文明，对应心、血。',
      deYong: '心思缜密、温文尔雅、才华内敛、技艺傍身、稳步致富',
      shiYong: '自卑怯懦、才华埋没、心力不足、运势低迷',
    },
    戊: {
      stem: '戊',
      nature: '戊土为阳土，高山厚土、城墙之土',
      xi: ['丙火（暖土生厚）', '甲木（疏土不堵）', '金（泄土成器）'],
      ji: ['木旺（克土过重）', '水旺（水多土荡）'],
      features: '戊土得地基业稳固；过旺封闭保守。戊土如山、如城墙，主厚重稳固，对应胃。',
      deYong: '忠厚踏实、格局厚重、聚财守福、根基稳固、一生安稳富贵',
      shiYong: '固执愚钝、封闭保守、不思变通、财运阻滞',
    },
    己: {
      stem: '己',
      nature: '己土为阴土，田园湿土、温润之土',
      xi: ['丙火（火暖田园）', '甲木（疏土成田）'],
      ji: ['水旺过湿（淤堵不通）'],
      features: '己土务实善于积累；过湿消极纠结。己土如田园，主包容滋养，对应脾。',
      deYong: '心思细腻、踏实肯干、善于积累、家庭和睦、福禄绵长',
      shiYong: '消极纠结、心胸狭隘、多思多虑、琐事缠身',
    },
    庚: {
      stem: '庚',
      nature: '庚金为阳金，刀剑矿石、刚硬之金',
      xi: ['丁火（锻造成器）', '丙火（炼金暖局）'],
      ji: ['金旺无制（杀伐过重）'],
      features: '庚金得炼成大器，无炼则硬脆惹祸。庚金如刀、如剑，主刚健肃杀，对应大肠、筋骨。',
      deYong: '杀伐有度、智勇双全、执行力强、事业有成、掌权得势',
      shiYong: '刚硬刻薄、争强好胜、冲动惹祸、刑伤不断',
    },
    辛: {
      stem: '辛',
      nature: '辛金为阴金，珠宝首饰、精致之金',
      xi: ['壬水（淘洗显金，水金清贵）', '丙丁火（适度锻炼）'],
      ji: ['金多（埋而不显）', '火旺过克（熔毁）'],
      features: '辛金得用气质高雅；失用虚荣狭隘。辛金如珠宝，主清贵精致，对应肺。',
      deYong: '气质高雅、心思缜密、才华出众、名利兼得、人缘优越',
      shiYong: '敏感多疑、虚荣狭隘、自我内耗、难得顺遂',
    },
    壬: {
      stem: '壬',
      nature: '壬水为阳水，江河湖海、浩荡之水，老阴完整单位，为寒之极',
      xi: ['戊土（止寒固堤防）', '甲木（泄水转温，水生木秀）'],
      ji: ['金旺（生水加重寒，金多水浊）'],
      features: '壬水主江河海，为寒之极；得地富贵可期，泛滥破财耗福。对应肾、膀胱。',
      deYong: '格局开阔、聪慧机敏、善于变通、机遇良多、富贵可期',
      shiYong: '漂浮不定、意志薄弱、贪多无成、破财耗福',
    },
    癸: {
      stem: '癸',
      nature: '癸水为阴水，雨露溪流、温润之水',
      xi: ['丙火（解冻暖局）', '甲木（泄水秀气）'],
      ji: ['金水过寒（消极无气）'],
      features: '癸水得用谋划周全；过寒悲观体弱。癸水如雨露泉，主滋润灵秀，对应肾、心包。',
      deYong: '心思缜密、谋划周全、低调聚财、智慧过人、一生平稳有福',
      shiYong: '消极多疑、悲观自卑、体弱多疾、运势低迷',
    },
};

// 取单个天干的喜忌（给老接口留兼容，也可取单独某个字）
export function getShiGanXiJi(dayStem: string): ShiGanXiJiItem {
  return SHI_GAN_XI_JI_DATA[dayStem] || SHI_GAN_XI_JI_DATA['甲'];
}

// 一次性取出十天干全部喜忌（按五行顺序：木→火→土→金→水，阳先阴后）
export function getAllShiGanXiJi(): ShiGanXiJiItem[] {
  return ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].map((s) => SHI_GAN_XI_JI_DATA[s]);
}

export { STEM_ELEMENTS, BRANCH_ELEMENTS, STEM_YINYANG, BRANCH_YINYANG, MONTH_QI_INFO };
