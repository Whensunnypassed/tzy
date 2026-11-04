// ============================================================
// 城市库 · 经纬度与时区（希腊线 希腊占星 / 阴阳线共用）
// ------------------------------------------------------------
// 阴阳线只需经度（真太阳时），希腊占星线还需要纬度（ASC / 宫位）。
// 本文件是「城市 → 经纬度 + 时区」的唯一真源。
//
// 时区精度分级（每条结果自带 accuracy 标记，UI 必须展示）：
//   exact  —— 内置规则可精确判定（中国 1949 后、固定偏移国家）
//   approx —— 按简化 DST 规则近似（欧美 1967/1981 后的规则化 DST）
//   rough  —— 历史规则未完整覆盖（战前、战后过渡期、政策突变期），
//             此时返回标准时偏移并在 UI 提示用户自行核对
//
// 边界：本文件只产出「经纬度 + UTC 偏移」，不做任何命理判定。
// ============================================================

export type TimezoneAccuracy = 'exact' | 'approx' | 'rough';

export type TimezoneRule =
  | 'CN'
  | 'HK'
  | 'MO'
  | 'TW'
  | 'JP'
  | 'KR'
  | 'SG'
  | 'MY'
  | 'TH'
  | 'ID'
  | 'PH'
  | 'VN'
  | 'IN'
  | 'AE'
  | 'SA'
  | 'TR'
  | 'RU'
  | 'EU'
  | 'UK'
  | 'US'
  | 'CA'
  | 'AU'
  | 'NZ'
  | 'BR'
  | 'AR'
  | 'EG'
  | 'ZA'
  | 'MX';

export interface CityRecord {
  /** 唯一键（展示名） */
  key: string;
  /** 国家/地区 */
  country: string;
  /** 省/州（可选） */
  province?: string;
  /** 纬度（北正南负） */
  lat: number;
  /** 经度（东正西负） */
  lon: number;
  /** 时区规则族 */
  rule: TimezoneRule;
}

export interface TimezoneResolution {
  /** 当地钟表时间对应的 UTC 偏移（分钟） */
  offsetMinutes: number;
  /** 是否处于夏令时 */
  isDst: boolean;
  accuracy: TimezoneAccuracy;
  /** 给用户看的说明 */
  note: string;
}

// ------------------------------------------------------------
// 城市表（中国 100+ / 海外 45）
// 坐标取城市中心，保留两位小数；对占星 ASC 的影响约在 1 角分量级。
// ------------------------------------------------------------
export const CITY_DB: readonly CityRecord[] = [
  // ===== 中国 · 直辖市与省会 =====
  { key: '北京', country: '中国', lat: 39.90, lon: 116.41, rule: 'CN' },
  { key: '上海', country: '中国', lat: 31.23, lon: 121.47, rule: 'CN' },
  { key: '天津', country: '中国', lat: 39.13, lon: 117.20, rule: 'CN' },
  { key: '重庆', country: '中国', lat: 29.56, lon: 106.55, rule: 'CN' },
  { key: '广州', country: '中国', province: '广东', lat: 23.13, lon: 113.26, rule: 'CN' },
  { key: '深圳', country: '中国', province: '广东', lat: 22.54, lon: 114.06, rule: 'CN' },
  { key: '成都', country: '中国', province: '四川', lat: 30.57, lon: 104.07, rule: 'CN' },
  { key: '杭州', country: '中国', province: '浙江', lat: 30.27, lon: 120.16, rule: 'CN' },
  { key: '南京', country: '中国', province: '江苏', lat: 32.06, lon: 118.80, rule: 'CN' },
  { key: '武汉', country: '中国', province: '湖北', lat: 30.59, lon: 114.31, rule: 'CN' },
  { key: '西安', country: '中国', province: '陕西', lat: 34.34, lon: 108.94, rule: 'CN' },
  { key: '沈阳', country: '中国', province: '辽宁', lat: 41.81, lon: 123.43, rule: 'CN' },
  { key: '哈尔滨', country: '中国', province: '黑龙江', lat: 45.80, lon: 126.53, rule: 'CN' },
  { key: '长春', country: '中国', province: '吉林', lat: 43.88, lon: 125.32, rule: 'CN' },
  { key: '济南', country: '中国', province: '山东', lat: 36.65, lon: 117.12, rule: 'CN' },
  { key: '郑州', country: '中国', province: '河南', lat: 34.75, lon: 113.62, rule: 'CN' },
  { key: '长沙', country: '中国', province: '湖南', lat: 28.23, lon: 112.94, rule: 'CN' },
  { key: '南昌', country: '中国', province: '江西', lat: 28.68, lon: 115.86, rule: 'CN' },
  { key: '福州', country: '中国', province: '福建', lat: 26.07, lon: 119.30, rule: 'CN' },
  { key: '厦门', country: '中国', province: '福建', lat: 24.48, lon: 118.09, rule: 'CN' },
  { key: '合肥', country: '中国', province: '安徽', lat: 31.82, lon: 117.23, rule: 'CN' },
  { key: '石家庄', country: '中国', province: '河北', lat: 38.04, lon: 114.51, rule: 'CN' },
  { key: '太原', country: '中国', province: '山西', lat: 37.87, lon: 112.55, rule: 'CN' },
  { key: '呼和浩特', country: '中国', province: '内蒙古', lat: 40.84, lon: 111.75, rule: 'CN' },
  { key: '银川', country: '中国', province: '宁夏', lat: 38.49, lon: 106.23, rule: 'CN' },
  { key: '兰州', country: '中国', province: '甘肃', lat: 36.06, lon: 103.83, rule: 'CN' },
  { key: '西宁', country: '中国', province: '青海', lat: 36.62, lon: 101.78, rule: 'CN' },
  { key: '乌鲁木齐', country: '中国', province: '新疆', lat: 43.83, lon: 87.62, rule: 'CN' },
  { key: '拉萨', country: '中国', province: '西藏', lat: 29.65, lon: 91.14, rule: 'CN' },
  { key: '昆明', country: '中国', province: '云南', lat: 25.04, lon: 102.71, rule: 'CN' },
  { key: '贵阳', country: '中国', province: '贵州', lat: 26.65, lon: 106.63, rule: 'CN' },
  { key: '南宁', country: '中国', province: '广西', lat: 22.82, lon: 108.32, rule: 'CN' },
  { key: '海口', country: '中国', province: '海南', lat: 20.04, lon: 110.32, rule: 'CN' },

  // ===== 中国 · 主要地级市 =====
  { key: '青岛', country: '中国', province: '山东', lat: 36.07, lon: 120.38, rule: 'CN' },
  { key: '大连', country: '中国', province: '辽宁', lat: 38.91, lon: 121.61, rule: 'CN' },
  { key: '苏州', country: '中国', province: '江苏', lat: 31.30, lon: 120.62, rule: 'CN' },
  { key: '无锡', country: '中国', province: '江苏', lat: 31.57, lon: 120.30, rule: 'CN' },
  { key: '常州', country: '中国', province: '江苏', lat: 31.81, lon: 119.97, rule: 'CN' },
  { key: '徐州', country: '中国', province: '江苏', lat: 34.26, lon: 117.18, rule: 'CN' },
  { key: '扬州', country: '中国', province: '江苏', lat: 32.39, lon: 119.42, rule: 'CN' },
  { key: '镇江', country: '中国', province: '江苏', lat: 32.19, lon: 119.42, rule: 'CN' },
  { key: '盐城', country: '中国', province: '江苏', lat: 33.35, lon: 120.16, rule: 'CN' },
  { key: '连云港', country: '中国', province: '江苏', lat: 34.60, lon: 119.22, rule: 'CN' },
  { key: '宁波', country: '中国', province: '浙江', lat: 29.87, lon: 121.55, rule: 'CN' },
  { key: '温州', country: '中国', province: '浙江', lat: 28.00, lon: 120.67, rule: 'CN' },
  { key: '绍兴', country: '中国', province: '浙江', lat: 30.00, lon: 120.58, rule: 'CN' },
  { key: '嘉兴', country: '中国', province: '浙江', lat: 30.75, lon: 120.76, rule: 'CN' },
  { key: '金华', country: '中国', province: '浙江', lat: 29.08, lon: 119.65, rule: 'CN' },
  { key: '佛山', country: '中国', province: '广东', lat: 23.02, lon: 113.12, rule: 'CN' },
  { key: '东莞', country: '中国', province: '广东', lat: 23.02, lon: 113.75, rule: 'CN' },
  { key: '珠海', country: '中国', province: '广东', lat: 22.27, lon: 113.58, rule: 'CN' },
  { key: '中山', country: '中国', province: '广东', lat: 22.52, lon: 113.39, rule: 'CN' },
  { key: '惠州', country: '中国', province: '广东', lat: 23.11, lon: 114.42, rule: 'CN' },
  { key: '汕头', country: '中国', province: '广东', lat: 23.35, lon: 116.68, rule: 'CN' },
  { key: '湛江', country: '中国', province: '广东', lat: 21.27, lon: 110.36, rule: 'CN' },
  { key: '泉州', country: '中国', province: '福建', lat: 24.87, lon: 118.68, rule: 'CN' },
  { key: '漳州', country: '中国', province: '福建', lat: 24.51, lon: 117.65, rule: 'CN' },
  { key: '烟台', country: '中国', province: '山东', lat: 37.46, lon: 121.45, rule: 'CN' },
  { key: '潍坊', country: '中国', province: '山东', lat: 36.71, lon: 119.16, rule: 'CN' },
  { key: '淄博', country: '中国', province: '山东', lat: 36.81, lon: 118.05, rule: 'CN' },
  { key: '临沂', country: '中国', province: '山东', lat: 35.10, lon: 118.36, rule: 'CN' },
  { key: '济宁', country: '中国', province: '山东', lat: 35.42, lon: 116.59, rule: 'CN' },
  { key: '唐山', country: '中国', province: '河北', lat: 39.63, lon: 118.18, rule: 'CN' },
  { key: '保定', country: '中国', province: '河北', lat: 38.87, lon: 115.48, rule: 'CN' },
  { key: '邯郸', country: '中国', province: '河北', lat: 36.63, lon: 114.54, rule: 'CN' },
  { key: '沧州', country: '中国', province: '河北', lat: 38.30, lon: 116.84, rule: 'CN' },
  { key: '张家口', country: '中国', province: '河北', lat: 40.82, lon: 114.89, rule: 'CN' },
  { key: '承德', country: '中国', province: '河北', lat: 40.95, lon: 117.96, rule: 'CN' },
  { key: '秦皇岛', country: '中国', province: '河北', lat: 39.94, lon: 119.60, rule: 'CN' },
  { key: '洛阳', country: '中国', province: '河南', lat: 34.62, lon: 112.45, rule: 'CN' },
  { key: '开封', country: '中国', province: '河南', lat: 34.80, lon: 114.31, rule: 'CN' },
  { key: '南阳', country: '中国', province: '河南', lat: 32.99, lon: 112.53, rule: 'CN' },
  { key: '宜昌', country: '中国', province: '湖北', lat: 30.69, lon: 111.29, rule: 'CN' },
  { key: '襄阳', country: '中国', province: '湖北', lat: 32.01, lon: 112.12, rule: 'CN' },
  { key: '荆州', country: '中国', province: '湖北', lat: 30.33, lon: 112.19, rule: 'CN' },
  { key: '十堰', country: '中国', province: '湖北', lat: 32.63, lon: 110.80, rule: 'CN' },
  { key: '岳阳', country: '中国', province: '湖南', lat: 29.36, lon: 113.13, rule: 'CN' },
  { key: '株洲', country: '中国', province: '湖南', lat: 27.83, lon: 113.13, rule: 'CN' },
  { key: '衡阳', country: '中国', province: '湖南', lat: 26.89, lon: 112.57, rule: 'CN' },
  { key: '常德', country: '中国', province: '湖南', lat: 29.03, lon: 111.69, rule: 'CN' },
  { key: '赣州', country: '中国', province: '江西', lat: 25.83, lon: 114.93, rule: 'CN' },
  { key: '九江', country: '中国', province: '江西', lat: 29.71, lon: 116.00, rule: 'CN' },
  { key: '芜湖', country: '中国', province: '安徽', lat: 31.35, lon: 118.43, rule: 'CN' },
  { key: '蚌埠', country: '中国', province: '安徽', lat: 32.92, lon: 117.39, rule: 'CN' },
  { key: '安庆', country: '中国', province: '安徽', lat: 30.51, lon: 117.05, rule: 'CN' },
  { key: '桂林', country: '中国', province: '广西', lat: 25.27, lon: 110.29, rule: 'CN' },
  { key: '柳州', country: '中国', province: '广西', lat: 24.33, lon: 109.42, rule: 'CN' },
  { key: '北海', country: '中国', province: '广西', lat: 21.48, lon: 109.12, rule: 'CN' },
  { key: '三亚', country: '中国', province: '海南', lat: 18.25, lon: 109.51, rule: 'CN' },
  { key: '遵义', country: '中国', province: '贵州', lat: 27.73, lon: 106.93, rule: 'CN' },
  { key: '绵阳', country: '中国', province: '四川', lat: 31.47, lon: 104.68, rule: 'CN' },
  { key: '南充', country: '中国', province: '四川', lat: 30.80, lon: 106.08, rule: 'CN' },
  { key: '宜宾', country: '中国', province: '四川', lat: 28.77, lon: 104.62, rule: 'CN' },
  { key: '泸州', country: '中国', province: '四川', lat: 28.87, lon: 105.44, rule: 'CN' },
  { key: '曲靖', country: '中国', province: '云南', lat: 25.49, lon: 103.80, rule: 'CN' },
  { key: '大理', country: '中国', province: '云南', lat: 25.61, lon: 100.27, rule: 'CN' },
  { key: '丽江', country: '中国', province: '云南', lat: 26.87, lon: 100.23, rule: 'CN' },
  { key: '延安', country: '中国', province: '陕西', lat: 36.59, lon: 109.49, rule: 'CN' },
  { key: '宝鸡', country: '中国', province: '陕西', lat: 34.36, lon: 107.24, rule: 'CN' },
  { key: '咸阳', country: '中国', province: '陕西', lat: 34.33, lon: 108.71, rule: 'CN' },
  { key: '汉中', country: '中国', province: '陕西', lat: 33.07, lon: 107.02, rule: 'CN' },
  { key: '天水', country: '中国', province: '甘肃', lat: 34.58, lon: 105.72, rule: 'CN' },
  { key: '酒泉', country: '中国', province: '甘肃', lat: 39.73, lon: 98.49, rule: 'CN' },
  { key: '大同', country: '中国', province: '山西', lat: 40.08, lon: 113.30, rule: 'CN' },
  { key: '临汾', country: '中国', province: '山西', lat: 36.09, lon: 111.52, rule: 'CN' },
  { key: '包头', country: '中国', province: '内蒙古', lat: 40.66, lon: 109.84, rule: 'CN' },
  { key: '鄂尔多斯', country: '中国', province: '内蒙古', lat: 39.61, lon: 109.78, rule: 'CN' },
  { key: '鞍山', country: '中国', province: '辽宁', lat: 41.11, lon: 122.99, rule: 'CN' },
  { key: '抚顺', country: '中国', province: '辽宁', lat: 41.88, lon: 123.96, rule: 'CN' },
  { key: '锦州', country: '中国', province: '辽宁', lat: 41.10, lon: 121.13, rule: 'CN' },
  { key: '吉林', country: '中国', province: '吉林', lat: 43.84, lon: 126.55, rule: 'CN' },
  { key: '齐齐哈尔', country: '中国', province: '黑龙江', lat: 47.35, lon: 123.92, rule: 'CN' },
  { key: '大庆', country: '中国', province: '黑龙江', lat: 46.59, lon: 125.10, rule: 'CN' },
  { key: '牡丹江', country: '中国', province: '黑龙江', lat: 44.55, lon: 129.63, rule: 'CN' },
  { key: '佳木斯', country: '中国', province: '黑龙江', lat: 46.80, lon: 130.32, rule: 'CN' },
  { key: '哈密', country: '中国', province: '新疆', lat: 42.83, lon: 93.51, rule: 'CN' },
  { key: '喀什', country: '中国', province: '新疆', lat: 39.47, lon: 75.99, rule: 'CN' },
  { key: '和田', country: '中国', province: '新疆', lat: 37.11, lon: 79.92, rule: 'CN' },
  { key: '库尔勒', country: '中国', province: '新疆', lat: 41.73, lon: 86.15, rule: 'CN' },
  { key: '伊宁', country: '中国', province: '新疆', lat: 43.92, lon: 81.28, rule: 'CN' },
  { key: '日喀则', country: '中国', province: '西藏', lat: 29.27, lon: 88.88, rule: 'CN' },
  { key: '林芝', country: '中国', province: '西藏', lat: 29.65, lon: 94.36, rule: 'CN' },
  { key: '格尔木', country: '中国', province: '青海', lat: 36.40, lon: 94.90, rule: 'CN' },
  { key: '玉树', country: '中国', province: '青海', lat: 33.00, lon: 97.01, rule: 'CN' },

  // ===== 港澳台 =====
  { key: '香港', country: '中国香港', lat: 22.32, lon: 114.17, rule: 'HK' },
  { key: '澳门', country: '中国澳门', lat: 22.20, lon: 113.54, rule: 'MO' },
  { key: '台北', country: '中国台湾', lat: 25.03, lon: 121.56, rule: 'TW' },
  { key: '高雄', country: '中国台湾', lat: 22.63, lon: 120.30, rule: 'TW' },
  { key: '台中', country: '中国台湾', lat: 24.15, lon: 120.68, rule: 'TW' },

  // ===== 亚洲 =====
  { key: '东京', country: '日本', lat: 35.68, lon: 139.69, rule: 'JP' },
  { key: '大阪', country: '日本', lat: 34.69, lon: 135.50, rule: 'JP' },
  { key: '京都', country: '日本', lat: 35.01, lon: 135.77, rule: 'JP' },
  { key: '名古屋', country: '日本', lat: 35.18, lon: 136.91, rule: 'JP' },
  { key: '福冈', country: '日本', lat: 33.59, lon: 130.40, rule: 'JP' },
  { key: '札幌', country: '日本', lat: 43.06, lon: 141.35, rule: 'JP' },
  { key: '首尔', country: '韩国', lat: 37.57, lon: 126.98, rule: 'KR' },
  { key: '釜山', country: '韩国', lat: 35.18, lon: 129.08, rule: 'KR' },
  { key: '新加坡', country: '新加坡', lat: 1.35, lon: 103.82, rule: 'SG' },
  { key: '吉隆坡', country: '马来西亚', lat: 3.14, lon: 101.69, rule: 'MY' },
  { key: '槟城', country: '马来西亚', lat: 5.42, lon: 100.33, rule: 'MY' },
  { key: '曼谷', country: '泰国', lat: 13.76, lon: 100.50, rule: 'TH' },
  { key: '清迈', country: '泰国', lat: 18.79, lon: 98.99, rule: 'TH' },
  { key: '马尼拉', country: '菲律宾', lat: 14.60, lon: 120.98, rule: 'PH' },
  { key: '雅加达', country: '印度尼西亚', lat: -6.21, lon: 106.85, rule: 'ID' },
  { key: '胡志明市', country: '越南', lat: 10.82, lon: 106.63, rule: 'VN' },
  { key: '河内', country: '越南', lat: 21.03, lon: 105.85, rule: 'VN' },
  { key: '新德里', country: '印度', lat: 28.61, lon: 77.21, rule: 'IN' },
  { key: '孟买', country: '印度', lat: 19.08, lon: 72.88, rule: 'IN' },
  { key: '班加罗尔', country: '印度', lat: 12.97, lon: 77.59, rule: 'IN' },
  { key: '迪拜', country: '阿联酋', lat: 25.20, lon: 55.27, rule: 'AE' },
  { key: '利雅得', country: '沙特阿拉伯', lat: 24.71, lon: 46.68, rule: 'SA' },
  { key: '伊斯坦布尔', country: '土耳其', lat: 41.01, lon: 28.98, rule: 'TR' },

  // ===== 欧洲 =====
  { key: '伦敦', country: '英国', lat: 51.51, lon: -0.13, rule: 'UK' },
  { key: '巴黎', country: '法国', lat: 48.86, lon: 2.35, rule: 'EU' },
  { key: '柏林', country: '德国', lat: 52.52, lon: 13.40, rule: 'EU' },
  { key: '慕尼黑', country: '德国', lat: 48.14, lon: 11.58, rule: 'EU' },
  { key: '阿姆斯特丹', country: '荷兰', lat: 52.37, lon: 4.90, rule: 'EU' },
  { key: '布鲁塞尔', country: '比利时', lat: 50.85, lon: 4.35, rule: 'EU' },
  { key: '苏黎世', country: '瑞士', lat: 47.38, lon: 8.54, rule: 'EU' },
  { key: '维也纳', country: '奥地利', lat: 48.21, lon: 16.37, rule: 'EU' },
  { key: '罗马', country: '意大利', lat: 41.90, lon: 12.50, rule: 'EU' },
  { key: '米兰', country: '意大利', lat: 45.46, lon: 9.19, rule: 'EU' },
  { key: '马德里', country: '西班牙', lat: 40.42, lon: -3.70, rule: 'EU' },
  { key: '巴塞罗那', country: '西班牙', lat: 41.39, lon: 2.17, rule: 'EU' },
  { key: '里斯本', country: '葡萄牙', lat: 38.72, lon: -9.14, rule: 'EU' },
  { key: '斯德哥尔摩', country: '瑞典', lat: 59.33, lon: 18.07, rule: 'EU' },
  { key: '莫斯科', country: '俄罗斯', lat: 55.76, lon: 37.62, rule: 'RU' },
  { key: '圣彼得堡', country: '俄罗斯', lat: 59.93, lon: 30.34, rule: 'RU' },

  // ===== 美洲 =====
  { key: '纽约', country: '美国', lat: 40.71, lon: -74.01, rule: 'US' },
  { key: '洛杉矶', country: '美国', lat: 34.05, lon: -118.24, rule: 'US' },
  { key: '旧金山', country: '美国', lat: 37.77, lon: -122.42, rule: 'US' },
  { key: '西雅图', country: '美国', lat: 47.61, lon: -122.33, rule: 'US' },
  { key: '芝加哥', country: '美国', lat: 41.88, lon: -87.63, rule: 'US' },
  { key: '波士顿', country: '美国', lat: 42.36, lon: -71.06, rule: 'US' },
  { key: '多伦多', country: '加拿大', lat: 43.65, lon: -79.38, rule: 'CA' },
  { key: '温哥华', country: '加拿大', lat: 49.28, lon: -123.12, rule: 'CA' },
  { key: '墨西哥城', country: '墨西哥', lat: 19.43, lon: -99.13, rule: 'MX' },
  { key: '圣保罗', country: '巴西', lat: -23.55, lon: -46.63, rule: 'BR' },
  { key: '里约热内卢', country: '巴西', lat: -22.91, lon: -43.17, rule: 'BR' },
  { key: '布宜诺斯艾利斯', country: '阿根廷', lat: -34.60, lon: -58.38, rule: 'AR' },

  // ===== 大洋洲与非洲 =====
  { key: '悉尼', country: '澳大利亚', lat: -33.87, lon: 151.21, rule: 'AU' },
  { key: '墨尔本', country: '澳大利亚', lat: -37.81, lon: 144.96, rule: 'AU' },
  { key: '布里斯班', country: '澳大利亚', lat: -27.47, lon: 153.03, rule: 'AU' },
  { key: '珀斯', country: '澳大利亚', lat: -31.95, lon: 115.86, rule: 'AU' },
  { key: '奥克兰', country: '新西兰', lat: -36.85, lon: 174.76, rule: 'NZ' },
  { key: '开罗', country: '埃及', lat: 30.04, lon: 31.24, rule: 'EG' },
  { key: '约翰内斯堡', country: '南非', lat: -26.20, lon: 28.05, rule: 'ZA' },
] as const;

export const CITY_DEFAULT_KEY = '北京';

export function findCity(key: string | undefined | null): CityRecord | undefined {
  if (!key) return undefined;
  return CITY_DB.find((c) => c.key === key);
}

export function defaultCity(): CityRecord {
  return findCity(CITY_DEFAULT_KEY) ?? CITY_DB[0];
}

/** 城市名模糊检索（前缀/包含，返回最多 limit 条） */
export function searchCity(query: string, limit = 12): CityRecord[] {
  const q = query.trim();
  if (!q) return [];
  return CITY_DB.filter(
    (c) => c.key.includes(q) || (c.province ? c.province.includes(q) : false) || c.country.includes(q),
  ).slice(0, limit);
}

// ------------------------------------------------------------
// 时区规则
// ------------------------------------------------------------

/** 某年某月第 n 个周日（n 从 1 起）的日号 */
function nthSunday(year: number, month: number, n: number): number {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=周日
  const firstSunday = first === 0 ? 1 : 8 - first;
  return firstSunday + (n - 1) * 7;
}

/** 某年某月最后一个周日的日号 */
function lastSunday(year: number, month: number): number {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = new Date(Date.UTC(year, month - 1, daysInMonth)).getUTCDay();
  return daysInMonth - last;
}

function inRange(month: number, day: number, m1: number, d1: number, m2: number, d2: number): boolean {
  const md = month * 100 + day;
  const a = m1 * 100 + d1;
  const b = m2 * 100 + d2;
  return md >= a && md <= b;
}

/** 中国 1986–1991 夏令时区间（当年 5–9 月，按官方公告的起止周日） */
function chinaDst(y: number, m: number, d: number): boolean {
  switch (y) {
    case 1986: return inRange(m, d, 5, 4, 9, 14);
    case 1987: return inRange(m, d, 4, 12, 9, 13);
    case 1988: return inRange(m, d, 4, 17, 9, 11);
    case 1989: return inRange(m, d, 4, 16, 9, 17);
    case 1990: return inRange(m, d, 4, 15, 9, 16);
    case 1991: return inRange(m, d, 4, 14, 9, 15);
    default: return false;
  }
}

/**
 * 解析某城市在「当地钟表日期」对应的 UTC 偏移。
 * 结果自带精度标记；rough 表示历史规则未完整覆盖，须人工核对。
 */
export function resolveUtcOffsetMinutes(
  city: CityRecord,
  year: number,
  month: number,
  day: number,
): TimezoneResolution {
  const rule = city.rule;

  switch (rule) {
    case 'CN': {
      // 1949 前按民国五时区；1949-01-01 起统一中原标准时 +8
      if (year < 1949) {
        const base = 480;
        return {
          offsetMinutes: base,
          isDst: false,
          accuracy: 'rough',
          note: '民国时期中国分五个时区（中原 +8 / 陇蜀 +7 / 新藏 +6 / 昆仑 +5.5 / 长白 +8.5）。本系统按中原标准时 +8 近似，请自行核对。',
        };
      }
      const dst = chinaDst(year, month, day);
      return {
        offsetMinutes: 480 + (dst ? 60 : 0),
        isDst: dst,
        accuracy: 'exact',
        note: dst ? '命中中国 1986–1991 夏令时，已加 1 小时。' : '北京时间 UTC+8。',
      };
    }
    case 'HK':
    case 'MO': {
      if (year >= 1941 && year <= 1945) {
        return { offsetMinutes: 540, isDst: false, accuracy: 'rough', note: '日占时期香港/澳门用 UTC+9，请自行核对具体日期。' };
      }
      return { offsetMinutes: 480, isDst: false, accuracy: year >= 1949 ? 'exact' : 'rough', note: 'UTC+8。' };
    }
    case 'TW': {
      if (year >= 1937 && year <= 1945) {
        return { offsetMinutes: 540, isDst: false, accuracy: 'rough', note: '日据时期台湾用 UTC+9，请自行核对。' };
      }
      if (year >= 1945 && year <= 1979) {
        return { offsetMinutes: 480, isDst: false, accuracy: 'approx', note: 'UTC+8；1945–1979 部分年份有夏令时，本系统未逐年展开。' };
      }
      return { offsetMinutes: 480, isDst: false, accuracy: 'exact', note: 'UTC+8。' };
    }
    case 'JP': {
      if (year >= 1948 && year <= 1951 && inRange(month, day, 5, 1, 9, 30)) {
        return { offsetMinutes: 600, isDst: true, accuracy: 'approx', note: '日本 1948–1951 夏令时，已加 1 小时。' };
      }
      return { offsetMinutes: 540, isDst: false, accuracy: 'exact', note: 'UTC+9。' };
    }
    case 'KR':
      return { offsetMinutes: 540, isDst: false, accuracy: 'exact', note: 'UTC+9。' };
    case 'SG':
      return { offsetMinutes: 480, isDst: false, accuracy: 'exact', note: 'UTC+8。' };
    case 'MY':
      return { offsetMinutes: 480, isDst: false, accuracy: 'exact', note: 'UTC+8。' };
    case 'TH':
      return { offsetMinutes: 420, isDst: false, accuracy: 'exact', note: 'UTC+7。' };
    case 'ID':
      return { offsetMinutes: 420, isDst: false, accuracy: 'exact', note: '雅加达 UTC+7。' };
    case 'PH':
      return { offsetMinutes: 480, isDst: false, accuracy: 'exact', note: 'UTC+8。' };
    case 'VN':
      return { offsetMinutes: 420, isDst: false, accuracy: 'exact', note: 'UTC+7。' };
    case 'IN':
      return { offsetMinutes: 330, isDst: false, accuracy: 'exact', note: 'UTC+5:30。' };
    case 'AE':
      return { offsetMinutes: 240, isDst: false, accuracy: 'exact', note: 'UTC+4。' };
    case 'SA':
      return { offsetMinutes: 180, isDst: false, accuracy: 'exact', note: 'UTC+3。' };
    case 'TR': {
      if (year >= 2016) return { offsetMinutes: 180, isDst: false, accuracy: 'exact', note: 'UTC+3（2016 起常驻夏令时）。' };
      if (year >= 1985 && inRange(month, day, 3, 25, 10, 30)) {
        return { offsetMinutes: 240, isDst: true, accuracy: 'approx', note: '土耳其夏令时按 3 月末–10 月末近似。' };
      }
      return { offsetMinutes: 120, isDst: false, accuracy: 'approx', note: 'UTC+2（历史 DST 未逐年展开）。' };
    }
    case 'RU': {
      // 莫斯科：2011–2014 永久夏令时 +4，2014-10 起常驻 +3
      if (year >= 2011 && year <= 2014) return { offsetMinutes: 240, isDst: false, accuracy: 'approx', note: '俄罗斯 2011–2014 永久夏令时 UTC+4。' };
      if (year >= 2014) return { offsetMinutes: 180, isDst: false, accuracy: 'exact', note: 'UTC+3。' };
      if (year >= 1981 && inRange(month, day, 3, 25, 9, 30)) {
        return { offsetMinutes: 240, isDst: true, accuracy: 'approx', note: '苏联/俄罗斯夏令时按 3 月末–9 月末近似。' };
      }
      return { offsetMinutes: 180, isDst: false, accuracy: 'approx', note: 'UTC+3（历史 DST 未逐年展开）。' };
    }
    case 'UK': {
      if (year >= 1968 && year <= 1971) {
        return { offsetMinutes: 60, isDst: false, accuracy: 'approx', note: '英国 1968–1971 实验期全年 UTC+1。' };
      }
      if (year >= 1981 && inRange(month, day, 3, lastSunday(year, 3), 10, lastSunday(year, 10))) {
        return { offsetMinutes: 60, isDst: true, accuracy: 'approx', note: '英国夏令时 BST（3 月最后周日–10 月最后周日）。' };
      }
      return {
        offsetMinutes: 0,
        isDst: false,
        accuracy: year >= 1981 ? 'approx' : 'rough',
        note: year >= 1981 ? '英国标准时 GMT。' : '1981 前英国夏令时规则多变，请自行核对。',
      };
    }
    case 'EU': {
      const baseByLon = city.lon < -7 ? 0 : city.lon < 7.5 ? 60 : 120;
      if (year >= 1981 && inRange(month, day, 3, lastSunday(year, 3), 10, lastSunday(year, 10))) {
        return { offsetMinutes: baseByLon + 60, isDst: true, accuracy: 'approx', note: '欧洲夏令时（3 月最后周日–10 月最后周日）。' };
      }
      if (year >= 1981) return { offsetMinutes: baseByLon, isDst: false, accuracy: 'approx', note: '欧洲标准时。' };
      if (year >= 1977 && inRange(month, day, 4, 1, 9, 30)) {
        return { offsetMinutes: baseByLon + 60, isDst: true, accuracy: 'rough', note: '1977–1980 欧洲夏令时按 4–9 月近似。' };
      }
      return { offsetMinutes: baseByLon, isDst: false, accuracy: 'rough', note: '欧洲 1981 前时区规则多变，请自行核对。' };
    }
    case 'US': {
      // 标准时按 15° 时区带粗分（中心经线 −75/−90/−105/−120）
      const std = city.lon >= -82.5 ? -300 : city.lon >= -97.5 ? -360 : city.lon >= -112.5 ? -420 : -480;
      // 1967–2006：4 月第 1 个周日 – 10 月最后周日；2007 起：3 月第 2 个周日 – 11 月第 1 个周日
      if (year >= 2007) {
        if (inRange(month, day, 3, nthSunday(year, 3, 2), 11, nthSunday(year, 11, 1))) {
          return { offsetMinutes: std + 60, isDst: true, accuracy: 'approx', note: '美国夏令时（2007 起 3 月第 2 周日–11 月第 1 周日）。' };
        }
        return { offsetMinutes: std, isDst: false, accuracy: 'approx', note: '美国标准时。' };
      }
      if (year >= 1967) {
        if (inRange(month, day, 4, nthSunday(year, 4, 1), 10, lastSunday(year, 10))) {
          return { offsetMinutes: std + 60, isDst: true, accuracy: 'approx', note: '美国夏令时（1967–2006 规则）。' };
        }
        return { offsetMinutes: std, isDst: false, accuracy: 'approx', note: '美国标准时。' };
      }
      return { offsetMinutes: std, isDst: false, accuracy: 'rough', note: '1967 前美国各州夏令时各行其是，本系统未展开，请自行核对。' };
    }
    case 'CA': {
      const std = city.lon >= -82.5 ? -300 : city.lon >= -97.5 ? -360 : -480;
      if (year >= 2007 && inRange(month, day, 3, nthSunday(year, 3, 2), 11, nthSunday(year, 11, 1))) {
        return { offsetMinutes: std + 60, isDst: true, accuracy: 'approx', note: '加拿大夏令时（2007 起规则）。' };
      }
      if (year >= 1967 && inRange(month, day, 4, nthSunday(year, 4, 1), 10, lastSunday(year, 10))) {
        return { offsetMinutes: std + 60, isDst: true, accuracy: 'approx', note: '加拿大夏令时（1967+ 规则）。' };
      }
      return { offsetMinutes: std, isDst: false, accuracy: 'approx', note: '加拿大标准时。' };
    }
    case 'AU': {
      // 东部（悉尼/墨尔本/布里斯班）UTC+10，西部（珀斯）UTC+8
      const std = city.lon >= 140 ? 600 : 480;
      const dstStart = nthSunday(year, 10, 1);
      const dstEnd = nthSunday(year, 4, 1);
      // 夏令时跨年：10 月第 1 周日 → 次年 4 月第 1 周日
      const inAuDst =
        year >= 2008 &&
        ((month >= 10 && (month === 10 ? day >= dstStart : true)) ||
          (month <= 4 && (month === 4 ? day < dstEnd : true)));
      if (inAuDst) {
        return { offsetMinutes: std + 60, isDst: true, accuracy: 'approx', note: '澳洲夏令时（10 月第 1 周日–次年 4 月第 1 周日）。' };
      }
      return {
        offsetMinutes: std,
        isDst: false,
        accuracy: year >= 2008 ? 'approx' : 'rough',
        note: city.lon >= 140 ? '澳洲东部标准时 UTC+10。' : '澳洲西部标准时 UTC+8。',
      };
    }
    case 'NZ': {
      // 夏令时跨年：9 月最后周日 → 次年 4 月第 1 周日
      const nzStart = lastSunday(year, 9);
      const nzEnd = nthSunday(year, 4, 1);
      const inNzDst =
        year >= 2008 &&
        ((month >= 9 && (month === 9 ? day >= nzStart : true)) ||
          (month <= 4 && (month === 4 ? day < nzEnd : true)));
      if (inNzDst) {
        return { offsetMinutes: 780, isDst: true, accuracy: 'approx', note: '新西兰夏令时 UTC+13（9 月最后周日–4 月第 1 周日）。' };
      }
      return { offsetMinutes: 720, isDst: false, accuracy: year >= 2008 ? 'approx' : 'rough', note: '新西兰标准时 UTC+12。' };
    }
    case 'BR': {
      if (year >= 1985 && year <= 2018 && inRange(month, day, 10, 15, 2, 20)) {
        return { offsetMinutes: 120, isDst: true, accuracy: 'approx', note: '巴西夏令时 UTC−2（10 月中–2 月中）。' };
      }
      return { offsetMinutes: 180, isDst: false, accuracy: 'approx', note: '巴西标准时 UTC−3（2019 起取消夏令时）。' };
    }
    case 'AR':
      return { offsetMinutes: 180, isDst: false, accuracy: 'exact', note: 'UTC−3。' };
    case 'EG':
      return { offsetMinutes: 120, isDst: false, accuracy: 'approx', note: 'UTC+2（埃及夏令时多次反复，未展开）。' };
    case 'ZA':
      return { offsetMinutes: 120, isDst: false, accuracy: 'exact', note: 'UTC+2。' };
    case 'MX': {
      if (year >= 2001 && inRange(month, day, 4, nthSunday(year, 4, 1), 10, lastSunday(year, 10))) {
        return { offsetMinutes: -300, isDst: true, accuracy: 'approx', note: '墨西哥城夏令时 UTC−5。' };
      }
      return { offsetMinutes: -360, isDst: false, accuracy: year >= 2001 ? 'approx' : 'rough', note: '墨西哥城标准时 UTC−6。' };
    }
    default:
      return { offsetMinutes: 0, isDst: false, accuracy: 'rough', note: '未知时区规则，请自行核对。' };
  }
}

/** 由 UTC 偏移反推 UTC 时刻：返回 { y, m, d, h, min }（以 UTC 计） */
export function toUtcParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  offsetMinutes: number,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60 * 1000;
  const dt = new Date(utcMs);
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
    hour: dt.getUTCHours(),
    minute: dt.getUTCMinutes(),
  };
}
