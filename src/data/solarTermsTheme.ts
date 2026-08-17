// 24 节气主题系统：专属诗句 + 色板 + 近似日期边界
// 用于根据命主出生公日月日，自动切换界面配色与文案气质

export type SolarTermPalette = {
  // 色板按视觉角色提取：背景、卡片、主强调、次强调、点缀、正文
  bg1: string;      // 页面底色（渐变起点）
  bg2: string;      // 页面底色（渐变终点）
  card: string;     // 卡片底色（或叠一层 tint）
  primary: string;  // 主强调色：按钮、图标、重点 badge
  secondary: string;// 次强调色：副标题、次重点
  accent: string;   // 点缀色：诗句高亮、小元素
  muted: string;    // 弱化色：辅助文字背景
  prose: string;    // 正文文字色（诗句、标题用深色）
};

export type SolarTermTheme = {
  key: string;          // 唯一标识
  name: string;         // 节气中文名
  poem: string;         // 主题诗句
  source: string;       // 出处
  approxMD: number;     // 近似起始日期（月*100+日，如 立春 = 204）
  colors: string[];     // 原始色板（保留原序列，便于直接使用）
  palette: SolarTermPalette; // 按语义角色提取后的配色
};

// 语义化色板提取规则：保证每个节气都能生成一致的界面视觉角色
function buildPalette(colors: string[]): SolarTermPalette {
  // 规则：颜色一般按「浅 → 深 / 背景 → 重点」排序
  const lightColors = colors.slice(0, Math.max(2, Math.ceil(colors.length / 2)));
  const darkColors = colors.slice(lightColors.length);
  const c = colors;
  return {
    bg1: lightColors[0] ?? '#FFF8F0',
    bg2: lightColors[1] ?? lightColors[0] ?? '#FFF1E0',
    card: c[Math.min(c.length - 1, Math.max(0, c.length - 3))] ?? '#FFFFFF',
    primary: darkColors[0] ?? c[c.length - 1] ?? '#8B5A2B',
    secondary: darkColors[1] ?? darkColors[0] ?? c[c.length - 1] ?? '#B08968',
    accent: c[Math.floor(c.length / 2)] ?? '#D4A373',
    muted: lightColors[lightColors.length - 1] ?? lightColors[0] ?? '#EFE6DB',
    prose: darkColors[darkColors.length - 1] ?? c[c.length - 1] ?? '#2B1810',
  };
}

export const SOLAR_TERMS_24: SolarTermTheme[] = [
  {
    key: 'lichun',
    name: '立春',
    poem: '东风解冻，蛰虫始振，鱼上冰。',
    source: '《礼记·月令》',
    approxMD: 204,
    colors: ['#FFF799', '#FFEE6F', '#B1D5C8', '#D5EBE1', '#8B7042'],
    palette: buildPalette(['#FFF799', '#FFEE6F', '#B1D5C8', '#D5EBE1', '#8B7042']),
  },
  {
    key: 'yushui',
    name: '雨水',
    poem: '随风潜入夜，润物细无声。',
    source: '杜甫《春夜喜雨》',
    approxMD: 219,
    colors: ['#F9D3E3', '#ECB0C1', '#A76283', '#BEB1AA', '#A9BE7B', '#C0D695', '#E5A84B'],
    palette: buildPalette(['#F9D3E3', '#ECB0C1', '#A76283', '#BEB1AA', '#A9BE7B', '#C0D695', '#E5A84B']),
  },
  {
    key: 'jingzhe',
    name: '惊蛰',
    poem: '微雨众卉新，一雷惊蛰始。',
    source: '韦应物《观田家》',
    approxMD: 306,
    colors: ['#FEDC5E', '#FAC03D', '#F6BEC8', '#BA5B49', '#9AA7B1', '#DC6B82'],
    palette: buildPalette(['#FEDC5E', '#FAC03D', '#F6BEC8', '#BA5B49', '#9AA7B1', '#DC6B82']),
  },
  {
    key: 'chunfen',
    name: '春分',
    poem: '春分雨脚落声微，柳岸斜风带客归。',
    source: '徐铉《春分日》',
    approxMD: 321,
    colors: ['#EBEEE8', '#EBEDDF', '#D2AF9D', '#D23918', '#C8161D', '#3271AE', '#12264F'],
    palette: buildPalette(['#EBEEE8', '#EBEDDF', '#D2AF9D', '#D23918', '#C8161D', '#3271AE', '#12264F']),
  },
  {
    key: 'qingming',
    name: '清明',
    poem: '清明时节雨纷纷，路上行人欲断魂。',
    source: '杜牧《清明》',
    approxMD: 405,
    colors: ['#BEC2B3', '#9D9D82', '#919177', '#D3CCD6', '#9B8EA9', '#7E527F'],
    palette: buildPalette(['#BEC2B3', '#9D9D82', '#919177', '#D3CCD6', '#9B8EA9', '#7E527F']),
  },
  {
    key: 'guyu',
    name: '谷雨',
    poem: '谷雨如丝复似尘，煮瓶浮蜡正尝新。',
    source: '朱槔《谷雨》',
    approxMD: 420,
    colors: ['#DCC7E1', '#A8BF8F', '#68945C', '#AED0EE', '#354E6B', '#13393E'],
    palette: buildPalette(['#DCC7E1', '#A8BF8F', '#68945C', '#AED0EE', '#354E6B', '#13393E']),
  },
  {
    key: 'lixia',
    name: '立夏',
    poem: '蝼蝈鸣，蚯蚓出，王瓜生。',
    source: '《礼记·月令》',
    approxMD: 506,
    colors: ['#C3D94E', '#B7D332', '#84A729', '#DFCEB4', '#E60012'],
    palette: buildPalette(['#C3D94E', '#B7D332', '#84A729', '#DFCEB4', '#E60012']),
  },
  {
    key: 'xiaoman',
    name: '小满',
    poem: '苦菜秀，靡草死，小暑至。',
    source: '《礼记·月令》',
    approxMD: 521,
    colors: ['#E2A2AC', '#6A8D52', '#4F794A', '#2A6E3F', '#D4C9AA', '#D08635'],
    palette: buildPalette(['#E2A2AC', '#6A8D52', '#4F794A', '#2A6E3F', '#D4C9AA', '#D08635']),
  },
  {
    key: 'mangzhong',
    name: '芒种',
    poem: '螳螂生，鵙始鸣，反舌无声。',
    source: '《礼记·月令》',
    approxMD: 606,
    colors: ['#D5D1AE', '#92905D', '#B3B59C', '#A8B092', '#DDBB99', '#535164'],
    palette: buildPalette(['#D5D1AE', '#92905D', '#B3B59C', '#A8B092', '#DDBB99', '#535164']),
  },
  {
    key: 'xiazhi',
    name: '夏至',
    poem: '昼晷已云极，宵漏自此长。',
    source: '韦应物《夏至避暑北池》',
    approxMD: 621,
    colors: ['#CB523E', '#95302E', '#822327', '#A7AAA1', '#F5F3F2', '#CC5D20'],
    palette: buildPalette(['#F5F3F2', '#A7AAA1', '#CC5D20', '#CB523E', '#95302E', '#822327']),
  },
  {
    key: 'xiaoshu',
    name: '小暑',
    poem: '温风至，蟋蟀居壁，鹰乃学习。',
    source: '《礼记·月令》',
    approxMD: 707,
    colors: ['#F5B087', '#E0DFC6', '#BFB99C', '#106898', '#12507B', '#003460'],
    palette: buildPalette(['#F5B087', '#E0DFC6', '#BFB99C', '#106898', '#12507B', '#003460']),
  },
  {
    key: 'dashu',
    name: '大暑',
    poem: '赤日几时过，清风无处寻。',
    source: '曾几《大暑》',
    approxMD: 723,
    colors: ['#B27777', '#A35F65', '#EDF1BB', '#E3EB98', '#BED2BB', '#698E6A'],
    palette: buildPalette(['#EDF1BB', '#E3EB98', '#BED2BB', '#698E6A', '#B27777', '#A35F65']),
  },
  {
    key: 'liqiu',
    name: '立秋',
    poem: '凉风至，白露降，寒蝉鸣。',
    source: '《礼记·月令》',
    approxMD: 808,
    colors: ['#88ABDA', '#2E59A7', '#98B6C2', '#7F9FAF', '#EFEFEF', '#D8D1C5'],
    palette: buildPalette(['#EFEFEF', '#D8D1C5', '#98B6C2', '#7F9FAF', '#88ABDA', '#2E59A7']),
  },
  {
    key: 'chushu',
    name: '处暑',
    poem: '离离暑云散，袅袅凉风起。',
    source: '白居易《早秋曲江感怀》',
    approxMD: 823,
    colors: ['#C9CFC1', '#A8B78C', '#A2D2E2', '#5AA4AE', '#108B96', '#D5B45C'],
    palette: buildPalette(['#C9CFC1', '#A8B78C', '#A2D2E2', '#D5B45C', '#5AA4AE', '#108B96']),
  },
  {
    key: 'bailu',
    name: '白露',
    poem: '鸿雁来，玄鸟归，群鸟养羞。',
    source: '《礼记·月令》',
    approxMD: 908,
    colors: ['#F5F2E9', '#EAE4D1', '#DFD6B8', '#D5C8A0', '#D3CBC5', '#C8B5B3'],
    palette: buildPalette(['#F5F2E9', '#EAE4D1', '#DFD6B8', '#D5C8A0', '#D3CBC5', '#C8B5B3']),
  },
  {
    key: 'qiufen',
    name: '秋分',
    poem: '漏钟仍夜浅，时节欲秋分。',
    source: '贾岛《夜喜贺兰三见访》',
    approxMD: 923,
    colors: ['#D5E3D4', '#C0AD5E', '#AA9649', '#8F3D2C', '#683632', '#EAEEF1'],
    palette: buildPalette(['#EAEEF1', '#D5E3D4', '#C0AD5E', '#AA9649', '#8F3D2C', '#683632']),
  },
  {
    key: 'hanlu',
    name: '寒露',
    poem: '萧疏桐叶上，月白露初团。',
    source: '白居易《池上》',
    approxMD: 1008,
    colors: ['#A6BAB1', '#778A77', '#5F766A', '#DDB078', '#DA9233', '#BC6E37'],
    palette: buildPalette(['#A6BAB1', '#778A77', '#5F766A', '#DDB078', '#DA9233', '#BC6E37']),
  },
  {
    key: 'shuangjiang',
    name: '霜降',
    poem: '豺乃祭兽，草木黄落，蛰虫咸俯。',
    source: '《礼记·月令》',
    approxMD: 1023,
    colors: ['#BDB2B2', '#91828F', '#6A5B6D', '#5C4F55', '#F8C6B5', '#DFD7C2'],
    palette: buildPalette(['#F8C6B5', '#DFD7C2', '#BDB2B2', '#91828F', '#6A5B6D', '#5C4F55']),
  },
  {
    key: 'lidong',
    name: '立冬',
    poem: '水始冰，地始冻，雉入大水为蜃。',
    source: '《礼记·月令》',
    approxMD: 1107,
    colors: ['#FFFBC7', '#F7EEAD', '#88BFB8', '#5DA39D', '#3D8E86', '#206864'],
    palette: buildPalette(['#FFFBC7', '#F7EEAD', '#88BFB8', '#5DA39D', '#3D8E86', '#206864']),
  },
  {
    key: 'xiaoxue',
    name: '小雪',
    poem: '虹藏不见，天气上腾，地气下降。',
    source: '《礼记·月令》',
    approxMD: 1122,
    colors: ['#D4E5EF', '#BCD4E7', '#A3BBDB', '#8AABCC', '#DE82A7', '#CC73A0'],
    palette: buildPalette(['#D4E5EF', '#BCD4E7', '#A3BBDB', '#8AABCC', '#DE82A7', '#CC73A0']),
  },
  {
    key: 'daxue',
    name: '大雪',
    poem: '大雪满初晨，开门万象新。',
    source: '祖咏《终南望余雪》（意取）',
    approxMD: 1207,
    colors: ['#EFC4CE', '#CE8892', '#EEEAD9', '#BFC1A9', '#A4ABD6', '#4A4B9D'],
    palette: buildPalette(['#EEEAD9', '#EFC4CE', '#BFC1A9', '#CE8892', '#A4ABD6', '#4A4B9D']),
  },
  {
    key: 'dongzhi',
    name: '冬至',
    poem: '蚯蚓结，麋角解，水泉动。',
    source: '《礼记·月令》',
    approxMD: 1222,
    colors: ['#BB7A8C', '#9E4E56', '#EBE1A9', '#E1D279', '#E7CAD3', '#31322C'],
    palette: buildPalette(['#EBE1A9', '#E1D279', '#E7CAD3', '#BB7A8C', '#9E4E56', '#31322C']),
  },
  {
    key: 'xiaohan',
    name: '小寒',
    poem: '雁北乡，鹊始巢，雉始雊。',
    source: '《礼记·月令》',
    approxMD: 106,
    colors: ['#F6F9E4', '#ECEBC2', '#7D929F', '#A4C9CC', '#509296', '#226B68'],
    palette: buildPalette(['#F6F9E4', '#ECEBC2', '#7D929F', '#A4C9CC', '#509296', '#226B68']),
  },
  {
    key: 'dahan',
    name: '大寒',
    poem: '鸡使乳，鸷鸟厉疾，水泽腹坚。',
    source: '《礼记·月令》',
    approxMD: 120,
    colors: ['#995D7F', '#814662', '#602641', '#420B2F', '#EBE3C7', '#C8B6BB'],
    palette: buildPalette(['#EBE3C7', '#C8B6BB', '#995D7F', '#814662', '#602641', '#420B2F']),
  },
];

// 按一年时间线排序的 24 节气（从小寒开始、大寒结束，便于跨年判断）
// approxMD 顺序：小寒 106 → 大寒 120 → 立春 204 → 雨水 219 → ... 冬至 1222
export const SORTED_SOLAR_TERMS: SolarTermTheme[] = [
  SOLAR_TERMS_24.find((t) => t.key === 'xiaohan')!,
  SOLAR_TERMS_24.find((t) => t.key === 'dahan')!,
  SOLAR_TERMS_24.find((t) => t.key === 'lichun')!,
  SOLAR_TERMS_24.find((t) => t.key === 'yushui')!,
  SOLAR_TERMS_24.find((t) => t.key === 'jingzhe')!,
  SOLAR_TERMS_24.find((t) => t.key === 'chunfen')!,
  SOLAR_TERMS_24.find((t) => t.key === 'qingming')!,
  SOLAR_TERMS_24.find((t) => t.key === 'guyu')!,
  SOLAR_TERMS_24.find((t) => t.key === 'lixia')!,
  SOLAR_TERMS_24.find((t) => t.key === 'xiaoman')!,
  SOLAR_TERMS_24.find((t) => t.key === 'mangzhong')!,
  SOLAR_TERMS_24.find((t) => t.key === 'xiazhi')!,
  SOLAR_TERMS_24.find((t) => t.key === 'xiaoshu')!,
  SOLAR_TERMS_24.find((t) => t.key === 'dashu')!,
  SOLAR_TERMS_24.find((t) => t.key === 'liqiu')!,
  SOLAR_TERMS_24.find((t) => t.key === 'chushu')!,
  SOLAR_TERMS_24.find((t) => t.key === 'bailu')!,
  SOLAR_TERMS_24.find((t) => t.key === 'qiufen')!,
  SOLAR_TERMS_24.find((t) => t.key === 'hanlu')!,
  SOLAR_TERMS_24.find((t) => t.key === 'shuangjiang')!,
  SOLAR_TERMS_24.find((t) => t.key === 'lidong')!,
  SOLAR_TERMS_24.find((t) => t.key === 'xiaoxue')!,
  SOLAR_TERMS_24.find((t) => t.key === 'daxue')!,
  SOLAR_TERMS_24.find((t) => t.key === 'dongzhi')!,
];

/**
 * 根据出生公历年月日推算所属节气主题
 * 算法：按日期顺序二分查找"最近一个已过的节气"
 * @param year  公历年
 * @param month 公历月（1-12）
 * @param day   公历日（1-31）
 */
export function getSolarTermThemeByBirthDate(
  year: number,
  month: number,
  day: number,
): SolarTermTheme {
  const birthMD = month * 100 + day;

  // 大寒之前（1/6 小寒之前都算上一年的冬至）
  if (birthMD < SORTED_SOLAR_TERMS[0].approxMD) {
    return SORTED_SOLAR_TERMS[SORTED_SOLAR_TERMS.length - 1]; // 冬至
  }

  // 从最后向前扫，找到 birthMD >= approxMD 的第一个节气
  for (let i = SORTED_SOLAR_TERMS.length - 1; i >= 0; i--) {
    if (birthMD >= SORTED_SOLAR_TERMS[i].approxMD) {
      // 处理跨年情况：小寒 approxMD=106，大寒 approxMD=120，冬至 1222
      // 正常顺序，直接返回
      return SORTED_SOLAR_TERMS[i];
    }
  }

  // fallback：立春
  return SOLAR_TERMS_24[0];
}

// 语义化后的高对比度五行正色（符合 WCAG AA 4.5:1）
export const ELEMENT_PALETTE_FORMAL: Record<string, string> = {
  wood: '#2F6B49',   // 正色青
  fire: '#B5410E',   // 正色朱
  earth: '#8A6D1A',  // 正色黄
  metal: '#5E6D82',  // 正色白（银灰系）
  water: '#1D3F6B',  // 正色玄
};
