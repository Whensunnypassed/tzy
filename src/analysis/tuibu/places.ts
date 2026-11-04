/**
 * 推步线 · 古地名经度表（T10 第一步）
 *
 * 古籍只记地名不记坐标，真太阳时校正需要经度。
 * 本表给常用古都/州府的现代近似经度，精度标 exact/approx/rough——
 * 古地名郡治迁移、同名异地常见，**不追求精确到分钟**，只求不产生整时辰级误差。
 */

export type Precision = 'exact' | 'approx' | 'rough';

export interface AncientPlace {
  name: string;
  aliases?: string[];
  longitude: number;
  precision: Precision;
  note?: string;
}

export const ANCIENT_PLACES: AncientPlace[] = [
  { name: '长安', aliases: ['西安', '京兆', '雍州'], longitude: 108.94, precision: 'exact', note: '唐长安城中心，今西安' },
  { name: '洛阳', aliases: ['东都', '河南府', '洛邑'], longitude: 112.45, precision: 'exact' },
  { name: '开封', aliases: ['汴京', '东京', '汴梁'], longitude: 114.31, precision: 'exact' },
  { name: '北京', aliases: ['大都', '燕京', '顺天府', '幽州'], longitude: 116.39, precision: 'exact' },
  { name: '南京', aliases: ['金陵', '建康', '应天府', '江宁'], longitude: 118.78, precision: 'exact' },
  { name: '杭州', aliases: ['临安', '钱塘', '余杭'], longitude: 120.16, precision: 'exact' },
  { name: '苏州', aliases: ['姑苏', '平江', '吴县'], longitude: 120.62, precision: 'exact' },
  { name: '扬州', aliases: ['广陵', '江都'], longitude: 119.42, precision: 'exact' },
  { name: '成都', aliases: ['锦官城', '益州', '蜀郡'], longitude: 104.07, precision: 'exact' },
  { name: '重庆', aliases: ['渝州', '恭州'], longitude: 106.55, precision: 'approx' },
  { name: '广州', aliases: ['番禺', '羊城', '南海郡'], longitude: 113.26, precision: 'exact' },
  { name: '泉州', aliases: ['刺桐', '温陵'], longitude: 118.68, precision: 'approx' },
  { name: '福州', aliases: ['三山', '闽县'], longitude: 119.30, precision: 'approx' },
  { name: '南昌', aliases: ['洪州', '豫章', '隆兴'], longitude: 115.89, precision: 'approx' },
  { name: '长沙', aliases: ['潭州', '湘州'], longitude: 112.94, precision: 'approx' },
  { name: '武汉', aliases: ['江夏', '武昌', '汉阳'], longitude: 114.31, precision: 'approx' },
  { name: '襄阳', aliases: ['襄州', '襄樊'], longitude: 112.14, precision: 'approx' },
  { name: '太原', aliases: ['晋阳', '并州', '龙城'], longitude: 112.55, precision: 'approx' },
  { name: '济南', aliases: ['历城', '齐州'], longitude: 117.00, precision: 'approx' },
  { name: '绍兴', aliases: ['会稽', '越州', '山阴'], longitude: 120.58, precision: 'approx' },
  { name: '合肥', aliases: ['庐州'], longitude: 117.28, precision: 'approx' },
  { name: '南宁', aliases: ['邕州'], longitude: 108.37, precision: 'rough' },
  { name: '桂林', aliases: ['静江', '始安'], longitude: 110.29, precision: 'rough' },
  { name: '昆明', aliases: ['云南府', '拓东'], longitude: 102.83, precision: 'rough' },
  { name: '兰州', aliases: ['金城'], longitude: 103.83, precision: 'rough' },
  { name: '敦煌', aliases: ['沙州', '瓜州'], longitude: 94.66, precision: 'rough' },
  { name: '拉萨', aliases: ['逻些', '惹萨'], longitude: 91.14, precision: 'rough' },
];

const normalize = (value: string) => value.replace(/[·\s]/g, '').trim();

/** 按名称或别称查古地名经度（精确名优先，其次包含匹配）。 */
export function lookupAncientPlace(name: string): AncientPlace | null {
  const target = normalize(name);
  if (!target) return null;
  const exact = ANCIENT_PLACES.find((place) => normalize(place.name) === target || place.aliases?.some((alias) => normalize(alias) === target));
  if (exact) return exact;
  return ANCIENT_PLACES.find((place) => normalize(place.name).includes(target) || place.aliases?.some((alias) => normalize(alias).includes(target))) ?? null;
}

/** 经度差折算的真太阳时偏移（每 1° 4 分钟，东经基准 120°）。 */
export function longitudeOffsetMinutes(longitude: number, standardMeridian = 120): number {
  return (longitude - standardMeridian) * 4;
}
