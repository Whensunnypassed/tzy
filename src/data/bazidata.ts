// EXPORTS: IHeavenlyStem, IEarthlyBranch, IMonthQi, IShiGanXiJi,
//          IJiaZiPillar, IMonthQiExt, ICoreRule, IClassicCase, IUltimateSummary,
//          MOCK_HEAVENLY_STEMS, MOCK_EARTHLY_BRANCHES, MOCK_MONTH_QI, MOCK_SHIGAN_XIJI,
//          JIAZI_PILLARS_BY_XUN, MONTH_QI_EXPANDED, CORE_MINGLI_RULES, CLASSIC_MINGLI_CASES, ULTIMATE_SUMMARY
// 资料来源：《自然易鉴》（丁甲福） + 八字阴阳命理体系补充资料（reference/docs/03_八字阴阳命理·精炼整理.md）

export interface IHeavenlyStem {
  char: string
  element: 'wood' | 'fire' | 'earth' | 'metal' | 'water'
  yinYang: 'yin' | 'yang'
  xiang: string
  shiXiang: string
  deYong: string
  shiYong: string
}

export interface IEarthlyBranch {
  char: string
  element: 'wood' | 'fire' | 'earth' | 'metal' | 'water'
  yinYang: 'yin' | 'yang'
  hiddenStems: string[]
  xiang: string
  deYong: string
  shiYong: string
}

export interface IMonthQi {
  month: string
  solarTerm: string
  mainQi: string
  mainQiElement: 'wood' | 'fire' | 'earth' | 'metal' | 'water'
  usageDirection: 'yang' | 'yin'
  yangState: 'strong' | 'weak'
  yinState: 'strong' | 'weak'
  fourSymbol: '少阳' | '老阳' | '少阴' | '老阴'
  description: string
  detailedDesc: string
  coreXiJi: string
}

export interface IShiGanXiJi {
  stem: string
  nature: string
  xi: string[]
  ji: string[]
  features: string
  deYong: string
  shiYong: string
}

// ============ 新增：六十甲子单柱干支核心释义（按旬度分类） ============
export interface IJiaZiPillar {
  ganzhi: string          // 干支组合，如 '癸酉'
  xun: '甲戌旬' | '甲申旬' | '甲午旬' | '甲辰旬' | '甲寅旬'
  coreMeaning: string     // 核心释义原文
  xunSummary?: string     // 所属旬段总结
}

export interface IXunGroup {
  xunName: '甲戌旬' | '甲申旬' | '甲午旬' | '甲辰旬' | '甲寅旬'
  pillars: IJiaZiPillar[]
  summary: string
}

// 六十甲子按五旬分类（共 50 柱，每旬 10 柱）
export const JIAZI_PILLARS_BY_XUN: IXunGroup[] = [
  // 1. 甲戌旬
  {
    xunName: '甲戌旬',
    summary: '甲戌旬核心为阴阳成气对峙，木温、火热、金凉、水寒各成其气，干支之间多为相互否定、制衡关系；多数作用需原局引动或岁运触发，无引动则气性暗藏。',
    pillars: [
      { ganzhi: '癸酉', xun: '甲戌旬', coreMeaning: '天干癸水为水寒成气，地支酉藏辛金成凉气，成气相遇；癸水偏弱、落于病地，受酉金凉性制约。' },
      { ganzhi: '甲戌', xun: '甲戌旬', coreMeaning: '甲木为木温生气，地支戌以辛金成凉为核心；甲木布温、意在生发乙木，与戌中辛金形成凉温对比；甲木克土救水，需原局水引动或岁运触发。' },
      { ganzhi: '乙亥', xun: '甲戌旬', coreMeaning: '乙木为木温成气，地支亥为寒之生气；亥中壬水否定丙火，影响乙木湿性，寒温交织。' },
      { ganzhi: '丙子', xun: '甲戌旬', coreMeaning: '丙火为火热生气，意在布出丁火；地支子藏癸水成寒，丙火布丁火的热性被癸水否定，寒热对峙。' },
      { ganzhi: '丁丑', xun: '甲戌旬', coreMeaning: '丁火为火热成气，落于丑土癸水成寒核心；丁火热性在丑土寒气中易被否定，热被寒制。' },
      { ganzhi: '戊寅', xun: '甲戌旬', coreMeaning: '戊土为土之生气，可克制壬水、保全木温；水阴过重时，戊土受甲木制约，土气受制。' },
      { ganzhi: '己卯', xun: '甲戌旬', coreMeaning: '己土为土之成气，落于卯木乙木成温气场；己土克制癸水，稳固木温之气，温气得保。' },
      { ganzhi: '庚辰', xun: '甲戌旬', coreMeaning: '庚金为金凉生气，意在布出辛金；借辛金凉气，制衡辰中乙木成温之气，凉温相克。' },
      { ganzhi: '辛巳', xun: '甲戌旬', coreMeaning: '辛金为金凉成气，落于巳火生气之地；巳中丙火强势，克制辛金、损耗金凉之气，凉性受损。' },
      { ganzhi: '壬午', xun: '甲戌旬', coreMeaning: '壬水为水寒生气，意在布出癸水；以癸水寒气制衡午中丁火热气，同时受午中己土克制，为丁壬太极干支自合。' },
      { ganzhi: '癸未', xun: '甲戌旬', coreMeaning: '癸水为水寒成气，落于未土丁火成热核心；未土己土直接否定癸水寒气，寒气相消。' },
    ],
  },
  // 2. 甲申旬
  {
    xunName: '甲申旬',
    summary: '甲申旬以反错制衡为核心，金木、水火多成对冲相克；干支气场双向影响，阳重、阴重会反转制衡关系，格局灵活多变。',
    pillars: [
      { ganzhi: '甲申', xun: '甲申旬', coreMeaning: '甲木温性生气，被申中庚金凉气直接否定，为反错干支；阳重时，甲木温气亦可反制庚金，相互影响。' },
      { ganzhi: '乙酉', xun: '甲申旬', coreMeaning: '乙木温性成气，被酉中辛金凉气直接否定，为反错干支；阳重则乙木温气反克辛金，双向制衡。' },
      { ganzhi: '丙戌', xun: '甲申旬', coreMeaning: '丙火火热生气，布丁火热气制衡戌中辛金凉气；阳重时丙火入戌墓，火气衰弱。' },
      { ganzhi: '丁亥', xun: '甲申旬', coreMeaning: '丁火火热成气，亥水暗藏寒气趋向，寒气制约丁火热气，为丁壬太极干支自合。' },
      { ganzhi: '戊子', xun: '甲申旬', coreMeaning: '戊土生气布己土，制衡子水癸水寒气，土受寒侵，形成寒土之象。' },
      { ganzhi: '己丑', xun: '甲申旬', coreMeaning: '己土成气落于丑土癸水寒地，己土克癸水、止住寒气；阳重土凉晦火，阴重克水止寒，双向变化。' },
      { ganzhi: '庚寅', xun: '甲申旬', coreMeaning: '庚金凉性生气，直接否定寅中甲木温气，反错干支；阳重时甲木温气反制庚金，相互制衡。' },
      { ganzhi: '辛卯', xun: '甲申旬', coreMeaning: '辛金凉性成气，制衡卯中乙木温气，反错干支；阳重乙木温气反耗辛金凉气。' },
      { ganzhi: '壬辰', xun: '甲申旬', coreMeaning: '壬水寒气温和辰中乙木温气，但受辰中戊土克制、入墓被制，水气难展。' },
      { ganzhi: '癸巳', xun: '甲申旬', coreMeaning: '癸水寒性成气，否定巳中丙火、丁火热气，寒制热象明显。' },
    ],
  },
  // 3. 甲午旬
  {
    xunName: '甲午旬',
    summary: '甲午旬阳热主导、寒热交替，春夏气场明显，木火成势、金水制衡；格局吉凶核心在于热气、凉气、寒气的配比平衡。',
    pillars: [
      { ganzhi: '甲午', xun: '甲午旬', coreMeaning: '甲木布温生发乙木，关联午中丁火热气，木火相生，阳气偏盛。' },
      { ganzhi: '乙未', xun: '甲午旬', coreMeaning: '乙木温气落于未土丁火热场，温气被热气肯定，形成木温转火热的转化。' },
      { ganzhi: '丙申', xun: '甲午旬', coreMeaning: '丙火热气否定申中庚金凉性转化趋势，火热制金凉，阳气主导。' },
      { ganzhi: '丁酉', xun: '甲午旬', coreMeaning: '丁火热成气，直接否定酉中辛金凉成气，热克凉、阳气盛。' },
      { ganzhi: '戊戌', xun: '甲午旬', coreMeaning: '戊土布己土关联戌中辛金，金泄土气、戌中丁火被晦；戊土可否定壬水，需地支或岁运引动。' },
      { ganzhi: '己亥', xun: '甲午旬', coreMeaning: '己土承载之气，制衡亥中壬水布气结果，土制水气、收敛寒气。' },
      { ganzhi: '庚子', xun: '甲午旬', coreMeaning: '庚金布辛金凉气，关联子水癸水寒气，金凉得水助，凉气更盛。' },
      { ganzhi: '辛丑', xun: '甲午旬', coreMeaning: '辛金凉成气落于丑土寒地，丑中己土制癸水、温养辛金，辛金泄土气，寒温调和。' },
      { ganzhi: '壬寅', xun: '甲午旬', coreMeaning: '壬水寒气否定寅中木火温气；阳重则木火得水滋养为吉，阴重则水浸木温、否定生机。' },
      { ganzhi: '癸卯', xun: '甲午旬', coreMeaning: '癸水寒气制约卯中乙木温气，寒侵木温，温气受损。' },
    ],
  },
  // 4. 甲辰旬
  {
    xunName: '甲辰旬',
    summary: '甲辰旬以本气落地、同质相生为主，干支气场契合度高，成气稳固；少数干支存在制衡克制，需外力引动显吉凶。',
    pillars: [
      { ganzhi: '甲辰', xun: '甲辰旬', coreMeaning: '甲木布温生发乙木，契合辰中乙木成温气场，整体温气纯粹；甲木克土救水需原局水引动或岁运触发。' },
      { ganzhi: '乙巳', xun: '甲辰旬', coreMeaning: '乙木温气得巳中丙火助力，温气被肯定、得以升华。' },
      { ganzhi: '丙午', xun: '甲辰旬', coreMeaning: '丙火布丁火热气，与午中丁火成热之气呼应，火气极盛。' },
      { ganzhi: '丁未', xun: '甲辰旬', coreMeaning: '丁火热气落于未土热场，热性得到肯定，热气稳固。' },
      { ganzhi: '戊申', xun: '甲辰旬', coreMeaning: '戊土生气否定申中壬水，间接克制庚金；同时被庚金泄土气，土金互制。' },
      { ganzhi: '己酉', xun: '甲辰旬', coreMeaning: '己土落于酉金凉地，己土温金、金泄土气，土金制衡。' },
      { ganzhi: '庚戌', xun: '甲辰旬', coreMeaning: '庚金布辛金凉气，契合戌中辛金成凉气场，凉气纯粹有力。' },
      { ganzhi: '辛亥', xun: '甲辰旬', coreMeaning: '辛金凉气得亥中壬水助力，凉性被肯定、根基稳固。' },
      { ganzhi: '壬子', xun: '甲辰旬', coreMeaning: '壬水布癸水寒气，在子水寒地落地成形，寒气纯粹。' },
      { ganzhi: '癸丑', xun: '甲辰旬', coreMeaning: '癸水寒气落于丑土，被丑中己土克制，寒气落地受制、难以舒展。' },
    ],
  },
  // 5. 甲寅旬
  {
    xunName: '甲寅旬',
    summary: '甲寅旬多干支一气、本气归位，气场最纯粹、无杂乱制衡，吉凶平稳，格局变化全凭外部引动。',
    pillars: [
      { ganzhi: '甲寅', xun: '甲寅旬', coreMeaning: '天干甲木与地支寅木同气相扶，得寅中丙火暖助、戊土承载，木温纯粹；格局变化需月令或岁运引动。' },
      { ganzhi: '乙卯', xun: '甲寅旬', coreMeaning: '乙木成气落于卯木本根，成气归一、温气纯粹专一，无阻隔。' },
      { ganzhi: '丙辰', xun: '甲寅旬', coreMeaning: '丙火暖辰中乙木温气，温热相生，辰中癸水寒弱，温气主导。' },
      { ganzhi: '丁巳', xun: '甲寅旬', coreMeaning: '丁火落于巳火，巳中丙火克庚金、庚金泄土热，火气暗藏制衡。' },
      { ganzhi: '戊午', xun: '甲寅旬', coreMeaning: '戊土布己土，承接午中丁火热气，土承火气、燥热成形。' },
      { ganzhi: '己未', xun: '甲寅旬', coreMeaning: '己土落于未土热场，得丁火暖助，己土晦丁火，火土相济制衡。' },
      { ganzhi: '庚申', xun: '甲寅旬', coreMeaning: '庚金属性与申金本气同源，凉气纯粹、同声相应。' },
      { ganzhi: '辛酉', xun: '甲寅旬', coreMeaning: '辛金成气落于酉金本位，凉气落地扎根、纯粹清肃。' },
      { ganzhi: '壬戌', xun: '甲寅旬', coreMeaning: '壬水寒气契合戌中金凉之气，但受戌中戊土制约，寒势敛而不狂，为玄武贵格。' },
      { ganzhi: '癸亥', xun: '甲寅旬', coreMeaning: '癸水寒气落于亥水生气之地，得亥中壬水生发，寒气有源。' },
    ],
  },
]

// ============ 新增：月令卦象、藏干、十二长生与体用扩展 ============
export interface IMonthQiExt {
  month: string
  solarTermRange: string    // 节气区间，如 '立春—惊蛰'
  guaXiang: string           // 卦象解释
  guaName: string            // 卦名 + 卦符，如 '地天泰卦䷊'
  qiJin: string              // 气进说明，如 '三阳'
  hiddenStemsAndChangSheng: string  // 藏干与十二长生
  coreQiJi: string           // 核心气机
  tiYongLunDuan: string      // 体用论断
  yueLingSummary: string     // 月令总结
}

export const MONTH_QI_EXPANDED: IMonthQiExt[] = [
  {
    month: '寅月',
    solarTermRange: '立春—惊蛰',
    guaName: '地天泰卦䷊',
    qiJin: '气进三阳',
    guaXiang: '三阳在下、三阴在上，天地交融，阴气渐衰、阳气日增，为万物生发、阴阳转换关键期。寅丑同属艮卦，主止寒，冬尽春始。',
    hiddenStemsAndChangSheng: '藏甲、丙、戊；十干状态：甲临官、乙帝旺、丙戊长生、丁己死、庚绝、辛胎、壬病、癸沐浴。',
    coreQiJi: '木气旺、木克土，冬之余寒未退；丙火长生主布温，癸水沐浴主余寒，形成春温、余寒共存的丙癸太极。',
    tiYongLunDuan: '春月核心阴阳为丙（阳、主富）、癸（阴、主贵），丙癸无伤则富贵双全；其余干支仅为扶抑丙癸的辅助元素。吉凶核心：土克水、木生火为吉，水克火、木克土为凶。常规论法：木得火助、甲木成阳、无金水否定，则体阳用阴，反之体阴用阳。',
    yueLingSummary: '寅月命理只需抓丙癸太极，平衡二气即可断吉凶、定富贵，无需复杂阴阳细分，是春月命理核心口诀。',
  },
  {
    month: '卯月',
    solarTermRange: '惊蛰—清明',
    guaName: '雷天大壮卦䷡',
    qiJin: '气进四阳',
    guaXiang: '内乾外震，四阳激荡，坤阴初爻转阳，惊雷始发、万物旺盛，春气更深、寒意更退。卯属震卦，为万物生发之源。',
    hiddenStemsAndChangSheng: '独藏乙木；十干状态：甲帝旺、乙临官、丙戊沐浴、丁己病、庚胎、辛绝、壬死、癸长生。',
    coreQiJi: '甲木帝旺布温、丙火渐强，癸水长生余寒尚存，依旧是温寒共存太极，阴阳状态较寅月更均衡。',
    tiYongLunDuan: '卯月以成温为标准，但癸水余寒可否定木温；见水多为体阴用阳，金气落地则不成温。核心仍以丙癸二气平衡定吉凶，弱化传统阴阳体用细分。沐浴玄机：阳干沐浴在四正地，无依托、主破败奉献；阴干沐浴在四隅长生地，主艰难维持、家业破败，为古书"沐浴为败地"的核心原理。',
    yueLingSummary: '卯月延续春月丙癸太极，余寒为最大变数，水、金为破格关键，吉凶取决于温气是否被余寒否定。',
  },
  {
    month: '辰月',
    solarTermRange: '清明—立夏',
    guaName: '泽天夬卦䷪',
    qiJin: '气进五阳',
    guaXiang: '五阳一阴，阳气鼎盛、仅剩残阴；春末夏初，阴阳不明、气机模糊，辰属巽卦，主迷惑、暧昧之象。',
    hiddenStemsAndChangSheng: '藏戊、乙、癸；十干状态：甲衰、乙冠带、丙戊冠带、丁己衰、庚养、辛墓、壬墓、癸养。',
    coreQiJi: '戊土当令、晦火克水，乙木成温、癸水残寒受制；整体温而不热、润而不寒，阴阳不显、气机呆滞，故古言"辰戌无贵"。辰中戊癸自合，主暗昧、隐情、暧昧人际。',
    tiYongLunDuan: '无需常规阴阳体用判断，核心为救癸水、存阴气。①木克土救水（最优：木得水润、专克土，木旺无润则生火助土，徒劳无功）；②金泄土生水（庚金有用、辛金无力）。戊土无制则阴阳俱伤、无富无贵；癸水有气则局活、富贵可成。特殊象义：辰戌相见，主情感婚姻破败、六亲不吉，多为后天环境、格局冲突导致，非绝对凶命，不影响富贵格局成就。',
    yueLingSummary: '辰月核心为破迷救阴，唯一贵气来源为癸水，救水成功则富贵可期，土旺无制则格局呆滞无成。',
  },
  {
    month: '巳月',
    solarTermRange: '立夏—芒种',
    guaName: '乾卦䷀',
    qiJin: '六阳纯阳',
    guaXiang: '六爻纯阳，阳盛阴衰，为温热过渡之地，非极致炎热，"见阳则炎、遇阴则凉"，幻象丛生。巳属巽卦，区别于午火离明真火。',
    hiddenStemsAndChangSheng: '藏丙、戊、庚；十干状态：甲病、乙沐浴、丙戊临官、丁己帝旺、庚长生、辛死、壬绝、癸胎。',
    coreQiJi: '丙火布温、戊土助燥，水绝胎无力、滴水易涸；唯一有力阴气为长生庚金，暗藏凉机。',
    tiYongLunDuan: '摒弃"用水制火"旧法，核心取用：①首用庚金（长生有力，凉土晦火、生水存阴，富贵相依；丙丁无制熔金则艰辛）；②水木齐见（孤水孤木皆败，水木同现方可救阴）；③阴土晦火（戌丑二土，晦火存金、成就贵气）。',
    yueLingSummary: '巳月纯阳无阴，庚金为第一用神，是平衡燥热、保全贵气的唯一核心，水木、阴土为辅助取用。',
  },
  {
    month: '午月',
    solarTermRange: '芒种—小暑',
    guaName: '天风姤卦䷸',
    qiJin: '一阴初生',
    guaXiang: '五阳一阴，阳极阴生，昼长夜短；午为离卦，主光明热能，火势已成真热，非巳月虚浮之热。',
    hiddenStemsAndChangSheng: '藏丁、己；十干状态：甲死、乙长生、丙戊帝旺、丁己临官、庚沐浴、辛病、壬胎、癸绝。',
    coreQiJi: '丁己一气、火土鼎盛，癸水绝地、甲木枯死，阳气极致、阴气初萌；庚金沐浴为唯一可立足之阴。',
    tiYongLunDuan: '核心平衡阳极之热，①首用庚金（孤金成富，平衡火势、通水发贵，火多熔金则凶）；②水木辅用（水独见被土克、木独见助火旺，必须水木齐现）；③阴土调剂（戌丑晦火存金，保全贵气）。无金水平衡则火炎土燥、躁妄无德；阴阳平衡则火木成文、光明有礼。',
    yueLingSummary: '午月阳极生阴，以金调候为核心，辅以水木、阴土，平衡为吉凶富贵第一要义。',
  },
  {
    month: '未月',
    solarTermRange: '小暑—立秋',
    guaName: '天山遁卦䷠',
    qiJin: '二阴生长',
    guaXiang: '四阳二阴，三伏生寒，热极转凉，为天地阴阳转换关键节点；未属坤卦，主承载收纳，蓄热藏凉。',
    hiddenStemsAndChangSheng: '藏己、丁、乙；十干状态：甲癸墓、乙壬养、丙戊辛衰、丁己庚冠带。',
    coreQiJi: '己土当令、丁火冠带，火土成党、燥热至极；乙木生火泄土、无力制土，阴气暗藏未显。',
    tiYongLunDuan: '取用同夏月逻辑，①首用庚金（冠带有气，泄火生水、润燥调候，申酉金助力更佳，丁火无制熔金则败）；②水木齐用（孤水孤木无用，需庚金引水、木水相生）；③阴土调剂（丑戌晦火藏金，但土旺则伤水损贵，富贵不久）。',
    yueLingSummary: '未月热极藏寒，依旧庚金为核心用神，水木、阴土为辅，忌火土无制、金水无根。',
  },
  {
    month: '申月',
    solarTermRange: '立秋—白露',
    guaName: '天地否卦䷋',
    qiJin: '三阴生长',
    guaXiang: '三阳三阴，阳气退藏、阴气渐起，热未散尽、凉初成形，阴阳交错、状态不稳；申属坤卦，主传送、变动。',
    hiddenStemsAndChangSheng: '藏庚、戊、壬；十干状态：甲绝、乙胎、丙病、丁沐浴、戊病、己沐浴、庚临官、辛帝旺、壬长生、癸死。',
    coreQiJi: '金气当令、木气穷尽，丁火余热、壬水初长；戊土被金泄，可烘热亦可转凉，为格局关键。秋月核心太极：丁壬对峙（余热vs初凉）。',
    tiYongLunDuan: '需分两种格局：①余热之申（阳体阴用）：火土旺、金难舒展，忌木火克金，宜水木克土、金气泄土；②成凉之申（阴体阳用）：无火有水、金气得布，宜木火助阳、制衡金凉，土性双面（制水取贵、晦火失富）。',
    yueLingSummary: '申月为最复杂月令，丁壬太极定格局，以土是否得火烘热区分余热、成凉两大格局，取用完全相反。',
  },
  {
    month: '酉月',
    solarTermRange: '白露—寒露',
    guaName: '风地观卦䷓',
    qiJin: '四阴生长',
    guaXiang: '二阳四阴，阳退阴进、秋气肃杀，昼短夜长、寒气渐显；酉属兑卦，主肃杀、暗藏喜忧。',
    hiddenStemsAndChangSheng: '独藏辛金；十干状态：甲胎、乙绝、丙戊死、丁己长生、庚帝旺、辛冠带、壬沐浴、癸病。',
    coreQiJi: '金气专旺、成凉定型，地表余温（丁己）尚存，未至极寒；依旧遵循秋月丁壬余热、布凉太极。',
    tiYongLunDuan: '同申月分格局：①余热之酉：火土旺、金气受制，忌木火克金，宜水木、金气泄土；②成凉之酉：无火金水旺，宜木火扶阳制衡金凉，土性双面制衡。',
    yueLingSummary: '酉月金凉已成、余温未消，丁壬二气定吉凶，格局分寒热两端，取用随格局反转。',
  },
  {
    month: '戌月',
    solarTermRange: '寒露—立冬',
    guaName: '山地剥卦䷖',
    qiJin: '五阴生长',
    guaXiang: '一阳五阴，阳气将绝、阴气鼎盛，秋尽冬临、万物凋零；戌属乾卦，为墓库之地，主孤独、暗藏、权术、文娱幽暗之象。',
    hiddenStemsAndChangSheng: '藏戊、辛、丁；十干状态：甲养、乙墓、丙墓、丁养、戊墓、己养、庚衰、辛冠带、壬冠带、癸衰。',
    coreQiJi: '戊土当令、晦火藏金，丁火余温、辛金鼎盛、壬水渐旺；木火伏藏、金水初盛，为阳退阴藏、秋冬交接节点。古言"甲戌、乙亥为木之源"，木气绝处逢生。',
    tiYongLunDuan: '固定体阴用阳，核心为破阴显阳：①第一用神甲木（克土解晦、助火破阴、制凉金，主贵主富）；②次用丙丁火（扶阳救暖、提振阳气）；③忌神：独旺土、无制金、无制水；水有制则贵显（壬戌玄武贵）。格局无木火、金水无制则孤贫病祸。',
    yueLingSummary: '戌月五阴成局、阳气最弱，命理核心扶阳破阴，甲木为第一关键，无木火则格局偏枯无福。',
  },
  {
    month: '亥月',
    solarTermRange: '立冬—大雪',
    guaName: '坤卦䷁',
    qiJin: '六阴阴极',
    guaXiang: '六爻全阴，阴气极致、阳气潜藏，阴极阳生；亥属乾卦，主权威贵气，寒冬暗藏甲木少阳生机。',
    hiddenStemsAndChangSheng: '藏壬、甲；十干状态：甲长生、乙死、丙戊绝、丁己胎、庚病、辛沐浴、壬临官、癸帝旺。',
    coreQiJi: '壬水当令、寒气极盛，甲木长生、寒中藏温，形成寒温交织的冬季太极；甲木为冬月唯一少阳生机。',
    tiYongLunDuan: '核心化寒为暖：①首用阳土（辰未）克水制寒，土得火生则富贵双全；②次用甲木泄水（甲木优于乙木，耐寒有力）；③火为辅助，暖土助阳、破除阴寒。无火仅有戊土则衣食无忧、无大富贵；木水乱动则贫困缠身。',
    yueLingSummary: '亥月阴极藏阳，土制寒、木泄寒、火暖局为三大核心用法，缺一不可，阳暖为富贵根本。',
  },
  {
    month: '子月',
    solarTermRange: '大雪—冬至',
    guaName: '地雷复卦䷗',
    qiJin: '一阳来复',
    guaXiang: '五阴一阳，阴极阳生，阳气初生、微弱无力；子属坎卦，主陷、险、阴寒暗藏，为一年寒极之点。',
    hiddenStemsAndChangSheng: '藏癸；十干状态参考月令系统。',
    coreQiJi: '阴气至极、阳气萌芽，寒气场主导，万物蛰伏、生机暗藏。',
    tiYongLunDuan: '格局吉凶取决于是否得火木暖局、破除寒冰，阳生则吉，阴盛无制则凶。',
    yueLingSummary: '子月核心为阴极待生，格局吉凶取决于是否得火木暖局、破除寒冰，阳生则吉，阴盛无制则凶。',
  },
  {
    month: '丑月',
    solarTermRange: '小寒—立春',
    guaName: '地泽临卦䷒',
    qiJin: '二阳并进',
    guaXiang: '四阴二阳，寒气已极、阳气萌动，湿土承载、寒温交替；丑属坤艮之间，主收纳、酝酿、转折。',
    hiddenStemsAndChangSheng: '藏己、辛、癸；十干状态参考月令系统。',
    coreQiJi: '己土当令、辛金藏气、癸水余寒；湿土止水、暗藏生机，为冬尽春来之关键。',
    tiYongLunDuan: '核心用火土温化湿寒，丙火暖局为第一用神，己土止水为辅；金木为辅助调剂，忌金水过旺、寒湿不化。',
    yueLingSummary: '丑月为冬春衔接，湿土暗藏生机，火土暖化是核心，阳气动则吉、寒湿锢则凶。',
  },
]

// ============ 新增：核心命理基础法则 ============
export interface ICoreRule {
  id: string
  title: string
  content: string[]
  summary: string
}

export const CORE_MINGLI_RULES: ICoreRule[] = [
  {
    id: 'tui-ming-liu-cheng',
    title: '推命核心步骤（固定流程）',
    content: [
      '①首看年月太极：定位月令核心阴阳二气（春丙癸、秋丁壬），判断年月体用、吉凶模式，定格局根本；',
      '②再看日时太极：日时阴阳围绕年月气候平衡调剂，为自我与环境的互动，平衡年月偏枯则吉，反之则凶；',
      '③定富贵贫贱：阳主富、阴主贵，阳伤无富、阴亢无贵，岁运仅重组原局元素、不改变核心模式。',
    ],
    summary: '推命核心是抓月令核心阴阳、求全局平衡，年月定基调，日时调吉凶，岁运应变化。',
  },
  {
    id: 'tian-di-gui-ze',
    title: '天干地支核心规则',
    content: [
      '①天干无旺衰：天干仅表阴阳属性、外在表象，旺衰强弱全由月令地支判定；',
      '②生克需落地：天干生克无地支呼应则为假象，天地成像方可应验吉凶；',
      '③干支体象：天干为外在、表象、脸面，地支为内在、实质、身体，天地统一则名实相符，天地相悖则外美内虚；',
      '④年为根本：年柱为恒气、祖上根基、终身底色，月柱为当权时令、格局评判标准，日时为自我作为、最终结果。',
    ],
    summary: '天干主象、地支主实，年定根基、月定格局、日时定结果，是论命底层逻辑。',
  },
  {
    id: 'mu-ku-zhen-ji',
    title: '墓库核心真机（去口诀糟粕、留核心原理）',
    content: [
      '①墓与库区分：墓为阴阳气弱之地，主吉凶衰减、气场不足；库为五行藏物之地，主收纳、积蓄、暗藏；',
      '②墓的核心作用：无论原局旺衰，入墓则十干气弱；旺气入墓为吉（制过旺之气），弱气入墓为凶（雪上加霜）；',
      '③开墓规则：刑冲合害可开墓，开墓则藏干透出、吉凶应验，弱气逢开墓多凶，旺气逢开墓多吉；',
      '④墓库象义：日时墓库主孤独、忧愁、华盖孤寡，身体主脾胃寒湿、忧思郁结；',
      '⑤口诀真相：所有墓库口诀均有前提，需结合旺衰、组合、引动判断，不可死套。',
    ],
    summary: '墓库吉凶不在字本身，在于十干旺衰与是否引动，旺墓为敛、弱墓为绝，开墓则吉凶落地应验。',
  },
  {
    id: 'nian-qi-fan-cuo',
    title: '年气与格局反错规则',
    content: [
      '①年气定义：年干原始气数+年干落月令的气数，为命局根本底色，终身不变；',
      '②一气年柱：干支同源、阴阳统一，格局平稳、吉凶持续长久；',
      '③反错年柱：干支盖头截脚、阴阳对战，格局起伏大、吉凶反复（水火反错最剧烈）；',
      '④年日反错：年月吉、日时破局，或年月凶、日时救局，主白手起家、命运自我改写；',
      '⑤年月克制：年制月可得祖上福荫，月制年则消耗根基、难承祖业。',
    ],
    summary: '年柱定先天根基，反错定命运起伏，先天不足可后天弥补，先天优良亦可后天破败。',
  },
  {
    id: 'shi-gan-gong-yong',
    title: '十干喜忌与功用核心',
    content: [
      '①十干分生成：少阳甲、老阳丙、少阴庚、老阴壬为四时生气；乙丁辛癸为成气、戊己为土气承载；',
      '②功用本质：十干作用为调节地球冷暖、平衡四时气候，是人事吉凶、富贵贫贱的根源；',
      '③喜忌核心：少喜成、老喜衡，生气需成气落地，过旺需对立之气制衡；',
      '④甲木核心：喜丙丁火成阳立功，喜庚金制衡过旺，夏木用金不用水，冬木火土为贵。',
    ],
    summary: '十干喜忌不固定，随月令气候动态变化，以平衡四时阴阳、成就格局功用为唯一标准。',
  },
]

// ============ 新增：经典命例精炼解析 ============
export interface IClassicCase {
  id: number
  ganzhi: string   // 四柱干支
  gender: '乾造' | '坤造'
  label: string     // 标签，如 '法院高官'、'厅级贵命'
  coreConclusion: string  // 核心论断
}

export const CLASSIC_MINGLI_CASES: IClassicCase[] = [
  { id: 1, gender: '坤造', ganzhi: '己酉 戊辰 壬戌 辛亥', label: '法院高官', coreConclusion: '格局气场刚强，26岁起官运顺遂，多次升职调动，专职武职、司法体系，掌权有势，中年事业鼎盛。' },
  { id: 2, gender: '乾造', ganzhi: '甲寅 戊辰 丙戌 己亥', label: '书香家庭、多灾', coreConclusion: '年柱坐印得禄，出身富家、父亲多才、母亲体弱；大运刑冲并见，多车祸、伤病，人生起伏较大。' },
  { id: 3, gender: '乾造', ganzhi: '甲辰 戊辰 戊戌 壬戌', label: '官场贵命', coreConclusion: '祖上有贵、福荫深厚，年少聪慧有才、学业优异，入职公职，官至地税局局长，一生无大灾、安稳富贵。' },
  { id: 4, gender: '坤造', ganzhi: '甲寅 戊辰 戊戌 甲寅', label: '体弱孤寡', coreConclusion: '身带辰戌魁罡，克兄弟姐妹，自幼体弱多病、药不离身，心性急躁、为人寡合，一生多疾、运势平平。' },
  { id: 5, gender: '乾造', ganzhi: '乙酉 庚辰 甲戌 戊辰', label: '厅级贵命', coreConclusion: '乙庚相合、辰酉龙凤相配，格局纯正，出身显贵，一生无波折，官至厅级，富贵双全。' },
  { id: 6, gender: '乾造', ganzhi: '乙丑 庚辰 甲戌 乙亥', label: '寒窑贫贱', coreConclusion: '克兄损亲，早年丧父、出身贫寒，早年奔波劳碌，一生贫贱、婚姻不利，克妻明显。' },
  { id: 7, gender: '乾造', ganzhi: '乙巳 庚辰 庚戌 甲申', label: '花心干部', coreConclusion: '公职在身、有职位，格局金旺无制，心性风流、喜新厌旧，桃花繁杂但不离婚。' },
  { id: 8, gender: '乾造', ganzhi: '丙辰 壬辰 丙戌 乙未', label: '多动灾刑', coreConclusion: '聪慧过人、学业有成，然辰戌相见、刑冲多见，多口角、官非、车祸、伤病，人生波折多端。' },
  { id: 9, gender: '坤造', ganzhi: '丁亥 甲辰 甲戌 丁卯', label: '暴富命格', coreConclusion: '大运得助，中年投资暴富，十年财运鼎盛，富贵逼人。' },
  { id: 10, gender: '乾造', ganzhi: '庚子 庚辰 甲戌 丙寅', label: '仕途顺畅', coreConclusion: '长子命格、兄弟难存，父母能干，学业、仕途一路顺遂，官至乡镇主官。' },
  { id: 11, gender: '乾造', ganzhi: '壬子 甲辰 丙戌 戊戌', label: '衣食无忧、带疾', coreConclusion: '父母能干、深得偏爱，一生衣食充足，然身带疾痛、甲亢缠身，得子较晚，事业有得有失。' },
  { id: 12, gender: '坤造', ganzhi: '癸巳 丙辰 甲戌 甲戌', label: '民国大法官贵命', coreConclusion: '格局清贵、气场稳重，中年大运发力，历任高官，立法、教育体系显贵，女命贵格典范。' },
  { id: 13, gender: '乾造', ganzhi: '丁酉 戊申 甲子 癸酉', label: '格局争鸣命例', coreConclusion: '甲木身弱，申酉金旺官杀林立，子水为全局关键；传统论印星化杀为用，阴阳法则论金为当令用神、水助金成阴，平衡余热格局，为学术争鸣典型命例。' },
]

// ============ 新增：全书终极总结（核心心法汇总） ============
export interface IUltimateSummary {
  id: number
  title: string
  content: string
}

export const ULTIMATE_SUMMARY: IUltimateSummary[] = [
  { id: 1, title: '太极为纲', content: '命理本质是阴阳平衡，四时各有核心太极（春丙癸、秋丁壬），抓核心二气即可定大局，其余干支皆为辅助。' },
  { id: 2, title: '月令为权', content: '月令定四时气候、定十干旺衰、定格局体用，是论命第一标准，所有吉凶、喜忌、格局均以月令为根基。' },
  { id: 3, title: '落地为真', content: '天干表象、地支实质，一切生克、吉凶、格局，必须天地成像、落地有根方可应验，虚象无应。' },
  { id: 4, title: '动态平衡', content: '无固定用神、无死记口诀，四时取用不同、格局状态不同，余热/成凉、体阴/体阳，吉凶反转全在平衡二字。' },
  { id: 5, title: '先后有别', content: '年定先天根基，月定格局基调，日时定后天作为，岁运仅重组原局能量，不改变核心格局本质。' },
  { id: 6, title: '象理合一', content: '墓库、反错、太极、体用，所有命理口诀均有底层原理，不可死套，需结合格局、旺衰、引动综合判断。' },
]

// 十天干（《自然易鉴》第五章第二节）
export const MOCK_HEAVENLY_STEMS: IHeavenlyStem[] = [
  {
    char: '甲',
    element: 'wood',
    yinYang: 'yang',
    xiang: '参天大树、栋梁之木，少阳阳气',
    shiXiang: '正直、刚毅、上进、担当',
    deYong: '得令得地，为栋梁之才，胸怀大志、格局开阔、能担大任、利事业仕途',
    shiYong: '虚浮无根，眼高手低、心高气傲、有志难伸、多劳无成',
  },
  {
    char: '乙',
    element: 'wood',
    yinYang: 'yin',
    xiang: '花草藤蔓、柔顺之木',
    shiXiang: '温和、细腻、包容、变通',
    deYong: '聪慧灵巧、人缘极佳、善于借力、稳中求富、一生顺遂',
    shiYong: '优柔寡断、软弱纠结、依附他人、难成大器',
  },
  {
    char: '丙',
    element: 'fire',
    yinYang: 'yang',
    xiang: '太阳烈火、普照之火，老阳纯阳',
    shiXiang: '光明、热情、正直、豁达',
    deYong: '得令气场强大、光明磊落、贵人云集、名利双收、福寿双全',
    shiYong: '过旺张扬急躁、刚愎自用、是非缠身、起伏极大',
  },
  {
    char: '丁',
    element: 'fire',
    yinYang: 'yin',
    xiang: '灯火烛光、温润之火',
    shiXiang: '细腻、聪慧、隐忍、儒雅',
    deYong: '心思缜密、温文尔雅、才华内敛、技艺傍身、稳步致富',
    shiYong: '虚弱自卑怯懦、才华埋没、心力不足、运势低迷',
  },
  {
    char: '戊',
    element: 'earth',
    yinYang: 'yang',
    xiang: '高山厚土、城墙之土',
    shiXiang: '稳重、包容、诚信、担当',
    deYong: '得地忠厚踏实、格局厚重、聚财守福、根基稳固、一生安稳富贵',
    shiYong: '过旺固执愚钝、封闭保守、不思变通、财运阻滞',
  },
  {
    char: '己',
    element: 'earth',
    yinYang: 'yin',
    xiang: '田园湿土、温润之土',
    shiXiang: '细腻、谦和、隐忍、务实',
    deYong: '心思细腻、踏实肯干、善于积累、家庭和睦、福禄绵长',
    shiYong: '过湿消极纠结、心胸狭隘、多思多虑、琐事缠身',
  },
  {
    char: '庚',
    element: 'metal',
    yinYang: 'yang',
    xiang: '刀剑矿石、刚硬之金',
    shiXiang: '果断、刚毅、仗义、勇猛',
    deYong: '得炼杀伐有度、智勇双全、执行力强、事业有成、掌权得势',
    shiYong: '无制刚硬刻薄、争强好胜、冲动惹祸、刑伤不断',
  },
  {
    char: '辛',
    element: 'metal',
    yinYang: 'yin',
    xiang: '珠宝首饰、精致之金',
    shiXiang: '精致、聪慧、细腻、高洁',
    deYong: '气质高雅、心思缜密、才华出众、名利兼得、人缘优越',
    shiYong: '过弱敏感多疑、虚荣狭隘、自我内耗、难得顺遂',
  },
  {
    char: '壬',
    element: 'water',
    yinYang: 'yang',
    xiang: '江河湖海、浩荡之水',
    shiXiang: '智慧、豁达、灵活、包容',
    deYong: '得地格局开阔、聪慧机敏、善于变通、机遇良多、富贵可期',
    shiYong: '泛滥漂浮不定、意志薄弱、贪多无成、破财耗福',
  },
  {
    char: '癸',
    element: 'water',
    yinYang: 'yin',
    xiang: '雨露溪流、温润之水',
    shiXiang: '细腻、隐忍、睿智、深沉',
    deYong: '心思缜密、谋划周全、低调聚财、智慧过人、一生平稳有福',
    shiYong: '过寒消极多疑、悲观自卑、体弱多疾、运势低迷',
  },
]

// 十二地支（《自然易鉴》第五章第三节）
export const MOCK_EARTHLY_BRANCHES: IEarthlyBranch[] = [
  {
    char: '子',
    element: 'water',
    yinYang: 'yang',
    hiddenStems: ['癸'],
    xiang: '冬月极寒、老阴之气，水之旺地',
    deYong: '得用则聪慧过人、根基深厚',
    shiYong: '失用则寒凉无气、体弱多忧、暗疾缠身',
  },
  {
    char: '丑',
    element: 'earth',
    yinYang: 'yin',
    hiddenStems: ['己', '辛', '癸'],
    xiang: '湿土藏金水、冬末余寒，主包容、运化、积蓄',
    deYong: '得用则踏实聚财、暗藏福气',
    shiYong: '失用则湿淤阻滞、琐事缠身、财运不通',
  },
  {
    char: '寅',
    element: 'wood',
    yinYang: 'yang',
    hiddenStems: ['甲', '丙', '戊'],
    xiang: '初春生发、少阳初起，木火相生，主生机、进取、开拓',
    deYong: '得用则积极上进、机遇不断',
    shiYong: '失用则躁动不稳、根基浅薄',
  },
  {
    char: '卯',
    element: 'wood',
    yinYang: 'yin',
    hiddenStems: ['乙'],
    xiang: '仲春繁茂、木气纯粹，主温和、舒展、人缘',
    deYong: '得用则人缘极佳、顺遂安稳',
    shiYong: '失用则优柔寡断、情感纠结',
  },
  {
    char: '辰',
    element: 'earth',
    yinYang: 'yang',
    hiddenStems: ['戊', '乙', '癸'],
    xiang: '湿土藏水木、春末气暖，主运化、生发、包容',
    deYong: '得用则气机流通、贵人相助',
    shiYong: '失用则水土混杂、运势杂乱',
  },
  {
    char: '巳',
    element: 'fire',
    yinYang: 'yin',
    hiddenStems: ['丙', '戊', '庚'],
    xiang: '初夏燥热、阳气渐盛，火金相生，主聪慧、进取、机敏',
    deYong: '得用则才华外露、事业进取',
    shiYong: '失用则急躁虚荣、是非较多',
  },
  {
    char: '午',
    element: 'fire',
    yinYang: 'yang',
    hiddenStems: ['丁', '己'],
    xiang: '盛夏极热、老阳鼎盛，火气最纯，主光明、热情、权贵',
    deYong: '得用则名利双收、气场强盛',
    shiYong: '失用则刚燥冲动、灾祸易生',
  },
  {
    char: '未',
    element: 'earth',
    yinYang: 'yin',
    hiddenStems: ['己', '丁', '乙'],
    xiang: '燥土藏木火、夏末余燥，主积淀、收敛、守成',
    deYong: '得用则踏实守福、财运稳固',
    shiYong: '失用则燥热闭塞、心胸狭隘',
  },
  {
    char: '申',
    element: 'metal',
    yinYang: 'yang',
    hiddenStems: ['庚', '壬', '戊'],
    xiang: '初秋肃杀、少阴初起，金水生地，主果断、智谋、变通',
    deYong: '得用则智勇双全、事业突破',
    shiYong: '失用则刚硬偏激、人际不和',
  },
  {
    char: '酉',
    element: 'metal',
    yinYang: 'yin',
    hiddenStems: ['辛'],
    xiang: '仲秋纯粹、金气最旺，主精致、高洁、理智',
    deYong: '得用则才华出众、名利兼得',
    shiYong: '失用则冷漠多疑、孤高自傲',
  },
  {
    char: '戌',
    element: 'earth',
    yinYang: 'yang',
    hiddenStems: ['戊', '辛', '丁'],
    xiang: '燥土藏火金、秋末肃敛，主厚重、坚守、担当',
    deYong: '得用则稳重靠谱、基业稳固',
    shiYong: '失用则固执死板、运势阻滞',
  },
  {
    char: '亥',
    element: 'water',
    yinYang: 'yin',
    hiddenStems: ['壬', '甲'],
    xiang: '初冬寒凉、阴气初生，水木相生，主智慧、蛰伏、待机',
    deYong: '得用则深藏不露、厚积薄发',
    shiYong: '失用则寒凉消极、机遇难寻',
  },
]

// 十二月气（《自然易鉴》第七章第二节·四时月令气机真机，12 条全齐）
export const MOCK_MONTH_QI: IMonthQi[] = [
  {
    month: '寅月',
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
  {
    month: '卯月',
    solarTerm: '惊蛰',
    mainQi: '乙木',
    mainQiElement: 'wood',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '少阳',
    description: '木气纯粹、气机舒展，冷暖相间，喜火助生发、喜金修整成材，忌水木过旺、气机淤滞',
    detailedDesc: '卯月为二月，惊蛰之后，温气已成。乙木当令，少阳气成。虽然气温回升，但仍有余寒，阳气尚未壮大。总体仍以用阳气（火土）为主，丁火泄木成阳为美。卯月为阴阳转变月之一，需看具体命局火的力量。',
    coreXiJi: '用神：丁火（泄木成阳）、丙火（暖局）。忌神：水木过旺。辅神：金修整成材',
  },
  {
    month: '辰月',
    solarTerm: '清明',
    mainQi: '戊土',
    mainQiElement: 'earth',
    usageDirection: 'yin',
    yangState: 'strong',
    yinState: 'weak',
    fourSymbol: '少阳',
    description: '暮春湿气偏重、火气渐升，土运交接，喜火暖土、喜金疏湿，忌水土混杂、格局浑浊',
    detailedDesc: '辰月为三月，清明之后，戊土当令。木温之气已强，向火热发展。土克水止寒，寒气基本消退，阳气渐盛。辰月为春夏转换的关键节点，开始由用阳转向用阴，金水之气开始发挥作用，以防止阳气过旺。',
    coreXiJi: '用神：金（疏湿生水）、水（降温润燥）。忌神：水土混杂。辅神：火暖土',
  },
  {
    month: '巳月',
    solarTerm: '立夏',
    mainQi: '丙火',
    mainQiElement: 'fire',
    usageDirection: 'yin',
    yangState: 'strong',
    yinState: 'weak',
    fourSymbol: '老阳',
    description: '初夏燥热初起，太阳光照最强烈，火金相生，喜水润局调候燥热，忌火土过旺、燥气加重',
    detailedDesc: '巳月为四月，立夏之后，丙火当权。太阳光照最为强烈，但地球吸热有滞后，此时不一定最热。火势旺盛，阳气大显，急需金水（阴气）来平衡。庚金生水、壬水克火，为巳月核心用神。',
    coreXiJi: '用神：壬水（调候降温）、庚金（生水）。忌神：火土过旺、燥气加重。辅神：水润',
  },
  {
    month: '午月',
    solarTerm: '芒种',
    mainQi: '丁火',
    mainQiElement: 'fire',
    usageDirection: 'yin',
    yangState: 'strong',
    yinState: 'weak',
    fourSymbol: '老阳',
    description: '盛夏阳气最旺、天气炎热，阳极无润，最喜壬癸真水降温润燥平衡阳极，忌火土焦枯无阴制衡',
    detailedDesc: '午月为五月，芒种之后，丁火当权。此时为一年中阳气最盛之时，天气炎热至极。火炎土燥，万物焦灼。阴气（金水）弱极，必须以金水为用神，降温润燥。壬水调候为第一要务，庚金生水次之。《自然易鉴》：燥火喜润，以水为贵，润则阴阳平衡、富贵安稳，燥则格局枯败、灾厄缠身。',
    coreXiJi: '用神：壬水（第一调候）、癸水（润局）、庚金（水源）。忌神：火土焦枯。辅神：金助水',
  },
  {
    month: '未月',
    solarTerm: '小暑',
    mainQi: '己土',
    mainQiElement: 'earth',
    usageDirection: 'yin',
    yangState: 'strong',
    yinState: 'weak',
    fourSymbol: '老阳',
    description: '暮夏地表最热、二阴进气，余热未消燥土当令，喜水润土、喜金助水，忌火土燥热格局枯燥无润',
    detailedDesc: '未月为六月，小暑之后，己土当令。地球储存热量最大，是一年中地表最热的时期。但阳极生阴，凉气开始萌生，二阴进气。虽阳气仍旺，但已呈下降趋势。继续用金水（阴气）平衡，但需注意阴气渐长之机。',
    coreXiJi: '用神：水（润土降温）、金（助水）。忌神：火土燥热。辅神：木疏土',
  },
  {
    month: '申月',
    solarTerm: '立秋',
    mainQi: '庚金',
    mainQiElement: 'metal',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '少阴',
    description: '初秋天始布寒、地球有余热，凉燥初生，金为少阴初始，喜木疏金、喜火暖局，忌金水过旺肃杀无制',
    detailedDesc: '申月为七月，立秋之后，庚金当权。天气开始转凉，寒气渐布，但地球仍有余热。金为少阴初始，主凉主降。申月为阴阳转变月之一，由用阴转用阳的过渡。以火（阳气）为用神，既可调候温暖，又可锻炼庚金成器。《自然易鉴》：肃金喜炼、喜疏，火暖木疏则金成器皿、格局显贵，金寒无制则杀伐过重、波折贫贱。',
    coreXiJi: '用神：丙火（炼金暖局）、丁火（炼金）。忌神：金水过旺、肃杀无制。辅神：木疏金',
  },
  {
    month: '酉月',
    solarTerm: '白露',
    mainQi: '辛金',
    mainQiElement: 'metal',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '少阴',
    description: '仲秋凉气形成、金气清肃，气温明显下降阳气渐弱，需火温暖调候，丁火炼金、丙火温暖皆为所喜',
    detailedDesc: '酉月为八月，白露之后，辛金当权。凉气已经形成，秋意正浓。少阴气成，金气清肃。气温明显下降，阳气渐弱。需以火（阳气）为用，温暖调候。丁火炼金、丙火温暖，皆为酉月所喜。',
    coreXiJi: '用神：丁火（炼金成器）、丙火（温暖）。忌神：金多无制、寒凉肃杀。辅神：木成材',
  },
  {
    month: '戌月',
    solarTerm: '寒露',
    mainQi: '戊土',
    mainQiElement: 'earth',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '少阴',
    description: '暮秋秋凉转寒、肃敛有余温润不足，戊土晦火气受克，喜水木润局调和燥气，忌土金过旺格局寒凉闭塞',
    detailedDesc: '戌月为九月，寒露之后，戊土当令。秋凉转寒，金气渐退，水寒将至。戊土晦火，火气受克更弱。天气渐冷，阴气加重。必须以火土（阳气）为用，戊土止寒、丙丁火温暖。戌月为秋冬转换关键期。',
    coreXiJi: '用神：丙火（温暖）、丁火（炼金）。忌神：土金过旺、寒凉闭塞。辅神：水润木疏',
  },
  {
    month: '亥月',
    solarTerm: '立冬',
    mainQi: '壬水',
    mainQiElement: 'water',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '老阴',
    description: '初冬寒气明显、水旺灭火，亥中藏甲木俗称小阳春，总体阴气强盛阳气衰弱，必须以火土为用，丙火温暖戊土止寒',
    detailedDesc: '亥月为十月，立冬之后，壬水当权。寒气明显增强，水旺灭火。但亥中藏甲木，有水生木之象，俗称"小阳春"，仍有一丝生气。总体阴气强盛，阳气衰弱。必须以火土（阳气）为用，丙火温暖、戊土止寒为要。',
    coreXiJi: '用神：丙火（暖局）、戊土（止水）。忌神：金水接续、寒气加重。辅神：甲木泄水生火',
  },
  {
    month: '子月',
    solarTerm: '大雪',
    mainQi: '癸水',
    mainQiElement: 'water',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '老阴',
    description: '深冬一年寒气最盛、寒冰最甚，火被水克阳气被彻底否定，最喜丙火太阳暖局、戊土止水固本，忌金水泛滥孤寒无阳',
    detailedDesc: '子月为十一月，大雪之后，癸水当权。为一年中寒气最盛之时，天寒地冻，万物蛰伏。火被水克，阳气被彻底否定。此为阴气最旺、阳气最弱的极点。必须以火土（阳气）为用，丙火解冻、戊土止寒为重中之重。《自然易鉴》：寒水喜温，以火为救命用神，有阳则生机不息、福禄自来，无阳则冰封格局、一生贫寒。',
    coreXiJi: '用神：丙火（解冻救命）、戊土（止水固本）。忌神：金水泛滥、孤寒无阳。辅神：木泄水气',
  },
  {
    month: '丑月',
    solarTerm: '小寒',
    mainQi: '己土',
    mainQiElement: 'earth',
    usageDirection: 'yang',
    yangState: 'weak',
    yinState: 'strong',
    fourSymbol: '老阴',
    description: '暮冬天寒地冻大寒时节，丑为湿土己土当令可止寒，阴极生阳地下阳气已萌，喜火温化湿寒暖启气机，忌寒湿盘踞格局冰封',
    detailedDesc: '丑月为十二月，小寒之后，己土当权。天寒地冻，大寒时节。但丑为湿土，己土当令，有止寒之功。且阴极生阳，地下阳气已开始萌动。寒气虽盛，但已近转折。以火土（阳气）为用，火助土暖、土止水寒。',
    coreXiJi: '用神：丙火（温化湿寒）、丁火（启阳）。忌神：寒湿盘踞、格局冰封。辅神：己土止水',
  },
]

// 十干喜忌（《自然易鉴》第五章第二节，10 条全齐）
export const MOCK_SHIGAN_XIJI: IShiGanXiJi[] = [
  {
    stem: '甲',
    nature: '甲木为阳木，参天大树、栋梁之木，少阳阳气',
    xi: ['丁火（成阳，暖局）', '庚金（平衡少阳，修剪成材）', '戊土（厚基固本）'],
    ji: ['水（损阳，泛滥漂木）', '金旺过克（折伤）'],
    features: '甲不离庚，甲用丁不用丙；得令为栋梁，失令有志难伸',
    deYong: '甲木得用：正直刚毅、胸怀大志、格局开阔、能担大任、利事业仕途',
    shiYong: '甲木失用：眼高手低、心高气傲、虚浮无根、多劳无成、性格固执',
  },
  {
    stem: '乙',
    nature: '乙木为阴木，花草藤蔓、柔顺之木',
    xi: ['丙火（暖化寒湿）', '甲木（借力撑腰）', '土（培根）'],
    ji: ['金旺（过头克伤）', '水旺（漂荡无根）'],
    features: '乙木善借力、稳中求富；乙木失用则依附他人、难成大器',
    deYong: '乙木得用：聪慧灵巧、人缘极佳、善于借力、稳中求富、一生顺遂',
    shiYong: '乙木失用：优柔寡断、软弱纠结、依附他人、难成大器、心胸狭隘',
  },
  {
    stem: '丙',
    nature: '丙火为阳火，太阳烈火、普照之火，老阳纯阳',
    xi: ['壬水（平衡寒气，成太极）', '甲木（生火有根，土不伤水）'],
    ji: ['戊土（泄阳太重）', '火旺无制（燥热招灾）'],
    features: '丙不离甲；得令名利双收，失用张扬招灾',
    deYong: '丙火得用：热情阳光、气场强大、光明磊落、贵人云集、名利双收、福寿双全',
    shiYong: '丙火失用：张扬急躁、刚愎自用、是非缠身、心性浮躁、做事虎头蛇尾',
  },
  {
    stem: '丁',
    nature: '丁火为阴火，灯火烛光、温润之火',
    xi: ['甲木（引丁有根）', '庚金（丁火炼金成器）'],
    ji: ['水旺克火（灭火无阳）'],
    features: '丁火主文、主技艺；丁火失用才华埋没',
    deYong: '丁火得用：心思缜密、温文尔雅、才华内敛、技艺傍身、稳步致富',
    shiYong: '丁火失用：自卑怯懦、才华埋没、心力不足、运势低迷',
  },
  {
    stem: '戊',
    nature: '戊土为阳土，高山厚土、城墙之土',
    xi: ['丙火（暖土生厚）', '甲木（疏土不堵）', '金（泄土成器）'],
    ji: ['水旺（被木克过重）'],
    features: '戊土得地基业稳固；戊土过旺封闭保守',
    deYong: '戊土得用：忠厚踏实、格局厚重、聚财守福、根基稳固、一生安稳富贵',
    shiYong: '戊土失用：固执愚钝、封闭保守、不思变通、财运阻滞',
  },
  {
    stem: '己',
    nature: '己土为阴土，田园湿土、温润之土',
    xi: ['丙火（火暖田园）', '甲木（疏土成田）'],
    ji: ['水旺过湿（淤堵不通）'],
    features: '己土务实善于积累；己土过湿消极纠结',
    deYong: '己土得用：心思细腻、踏实肯干、善于积累、家庭和睦、福禄绵长',
    shiYong: '己土失用：消极纠结、心胸狭隘、多思多虑、琐事缠身',
  },
  {
    stem: '庚',
    nature: '庚金为阳金，刀剑矿石、刚硬之金',
    xi: ['丁火（锻造成器）', '丙火（炼金）'],
    ji: ['金旺无制（杀伐过重）'],
    features: '庚金得炼成大器，无炼则硬脆惹祸',
    deYong: '庚金得用：杀伐有度、智勇双全、执行力强、事业有成、掌权得势',
    shiYong: '庚金失用：刚硬刻薄、争强好胜、冲动惹祸、刑伤不断',
  },
  {
    stem: '辛',
    nature: '辛金为阴金，珠宝首饰、精致之金',
    xi: ['壬水（淘洗显金）', '丙丁火（适度锻炼）'],
    ji: ['金多（埋而不显）', '火旺过克（熔毁）'],
    features: '辛金得用气质高雅；辛金失用虚荣狭隘',
    deYong: '辛金得用：气质高雅、心思缜密、才华出众、名利兼得、人缘优越',
    shiYong: '辛金失用：敏感多疑、虚荣狭隘、自我内耗、难得顺遂',
  },
  {
    stem: '壬',
    nature: '壬水为阳水，江河湖海、浩荡之水，老阴完整单位，为寒之极',
    xi: ['戊土（止寒固堤防）', '甲木（泄水转温）'],
    ji: ['金旺（生水加重寒）'],
    features: '壬水主江河海，为寒之极；得地富贵可期，泛滥破财耗福',
    deYong: '壬水得用：格局开阔、聪慧机敏、善于变通、机遇良多、富贵可期',
    shiYong: '壬水失用：漂浮不定、意志薄弱、贪多无成、破财耗福',
  },
  {
    stem: '癸',
    nature: '癸水为阴水，雨露溪流、温润之水',
    xi: ['丙火（解冻暖局）', '甲木（泄水秀气）'],
    ji: ['金水过寒（消极无气）'],
    features: '癸水得用谋划周全；过寒悲观体弱',
    deYong: '癸水得用：心思缜密、谋划周全、低调聚财、智慧过人、一生平稳有福',
    shiYong: '癸水失用：消极多疑、悲观自卑、体弱多疾、运势低迷',
  },
]
