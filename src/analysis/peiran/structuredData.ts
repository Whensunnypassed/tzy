// ============================================================
// 沛然堂线 · 结构化数据契约（structured data contract）
// ------------------------------------------------------------
// 借鉴 vedic-astro-skills 的 single-source contract 思路：
//   计算层产出本契约 → 校验层读它 → 判读层只读它，不重算。
//
// 设计原则：
//   · 纯数据，无函数，可直接 JSON 序列化；
//   · 带版本号，字段增删走语义化版本；
//   · 每一项事实都保留精度 / 来源标记，便于追溯与验前事；
//   · 数据质量单独成块（dataQuality），判读层必须先看这块。
// ============================================================

import type { PeiranModel } from './analysis';
import { PLANETS, PLANET_NAMES_ZH, type Planet } from './tables';
import { DIGNITY_LABELS } from './dignity';
import { SIGN_ELEMENT_OF } from '@/components/astrology/ZodiacGlyphs';
import { formatArc, ZODIAC_SIGNS, ZODIAC_SIGNS_EN } from './astroChart';

export const STRUCTURED_DATA_VERSION = '1.0.0';

export interface DataQualityFlag {
  level: 'info' | 'warn' | 'risk';
  code: string;
  message: string;
}

export interface StructuredData {
  meta: {
    version: string;
    line: 'peiran';
    system: 'hellenistic';
    generatedAt: string;
  };
  input: {
    localDate: string;
    localTime: string;
    city: string;
    lat: number;
    lon: number;
    utcDate: string;
    utcTime: string;
    utcOffsetMinutes: number;
    timezoneAccuracy: 'exact' | 'approx' | 'rough';
    sect: 'diurnal' | 'nocturnal';
    gender: 'male' | 'female' | null;
  };
  chart: {
    asc: { deg: number; sign: string; signEn: string; signDeg: number };
    mc: { deg: number; sign: string; signEn: string; signDeg: number };
    houses: Array<{ house: number; sign: string; signEn: string; element: string }>;
    bodies: Array<{
      key: Planet;
      name: string;
      deg: number;
      sign: string;
      signDeg: number;
      house: number;
      retrograde: boolean;
      dignity: string[];
      triplicityRole: string | null;
      essentialScore: number;
    }>;
  };
  lilly: {
    scores: Array<{
      key: Planet;
      name: string;
      essential: number;
      accidental: number;
      total: number;
      grade: string;
      items: Array<{ label: string; value: number }>;
    }>;
    strongest: Planet;
    weakest: Planet;
    moonWaxing: boolean;
  };
  lots: Array<{ key: string; name: string; deg: number; sign: string; house: number }>;
  arabicParts: Array<{ key: string; name: string; deg: number; sign: string; house: number; genderNote: string | null }>;
  aspects: {
    degree: Array<{ a: string; b: string; type: string; actual: number; applying: boolean }>;
    sign: Array<{ a: string; b: string; type: string; distance: number }>;
    aversions: Array<{ a: string; b: string }>;
  };
  timeLords: {
    age: number;
    profection: { house: number; sign: string; lord: string };
    firdaria: { lord: string | null; startAge: number | null; endAge: number | null };
    zodiacalReleasing: { startLot: string; periods: Array<{ sign: string; lord: string; start: string; end: string; peak: boolean }> };
    solarReturn: { utc: string; asc: string; mc: string };
  };
  dataQuality: {
    flags: DataQualityFlag[];
    /** 出生时刻每差 1 分钟，上升点约移动的度数（近似值） */
    ascDegPerMinute: number;
    /** ±4 分钟窗口内的上升点范围 */
    ascWindow4min: { from: number; to: number };
    obstruction: boolean;
  };
}

/** 从模型生成结构化契约（纯数据，可直接 JSON.stringify） */
export function buildStructuredData(model: PeiranModel, gender?: 'male' | 'female'): StructuredData {
  const { chart } = model;
  const p2 = (n: number) => Number(n.toFixed(2));

  const bodies = PLANETS.map((p) => {
    const b = chart.bodies[p];
    const d = model.dignities[p];
    return {
      key: p,
      name: PLANET_NAMES_ZH[p],
      deg: p2(b.lon),
      sign: ZODIAC_SIGNS[Math.floor(b.lon / 30) % 12],
      signDeg: p2(b.lon % 30),
      house: b.house,
      retrograde: b.retrograde,
      dignity: d.kinds.map((k) => DIGNITY_LABELS[k]),
      triplicityRole: d.triplicityRole ?? null,
      essentialScore: d.score,
    };
  });

  const lillyScores = PLANETS.map((p) => {
    const s = model.lilly.scores[p];
    return {
      key: p,
      name: PLANET_NAMES_ZH[p],
      essential: s.essentialSum,
      accidental: s.accidentalSum,
      total: s.total,
      grade: s.grade,
      items: [...s.essential, ...s.accidental].map((i) => ({ label: i.label, value: i.value })),
    };
  });

  // 数据质量：先判「这张盘能不能用来判读」
  const flags: DataQualityFlag[] = [];
  if (chart.timezoneAccuracy === 'rough') {
    flags.push({ level: 'risk', code: 'TZ_ROUGH', message: '该城市该年份的历史时区规则未完整覆盖，出生时刻可能有偏差，判读结论需谨慎。' });
  }
  if (chart.timezoneAccuracy === 'approx') {
    flags.push({ level: 'warn', code: 'TZ_APPROX', message: '时区按简化夏令时规则推算，边界日期（夏令时切换日）可能差 1 小时。' });
  }
  if (chart.local.minute === 0 && chart.local.hour % 2 === 0) {
    flags.push({ level: 'info', code: 'ROUND_TIME', message: '出生时刻为整点，可能是估算时间；上升点与宫位对分钟级误差敏感。' });
  }
  if (!gender) {
    flags.push({ level: 'info', code: 'NO_GENDER', message: '未提供性别，婚姻点两式并列，判读婚姻时应先确认。' });
  }
  if (model.selfCheck.failed > 0) {
    flags.push({ level: 'risk', code: 'SELF_CHECK_FAIL', message: `引擎自检有 ${model.selfCheck.failed} 项未通过，数据不可用于判读。` });
  }

  // 上升点分钟敏感度：以每小时约 30° 粗估
  const ascDegPerMinute = 0.5;
  const ascWindow4min = {
    from: p2((chart.asc.lon - 4 * ascDegPerMinute + 360) % 360),
    to: p2((chart.asc.lon + 4 * ascDegPerMinute) % 360),
  };
  const obstruction = flags.some((f) => f.level === 'risk');

  return {
    meta: {
      version: STRUCTURED_DATA_VERSION,
      line: 'peiran',
      system: 'hellenistic',
      generatedAt: new Date().toISOString(),
    },
    input: {
      localDate: `${chart.local.year}-${String(chart.local.month).padStart(2, '0')}-${String(chart.local.day).padStart(2, '0')}`,
      localTime: `${String(chart.local.hour).padStart(2, '0')}:${String(chart.local.minute).padStart(2, '0')}`,
      city: chart.city.key,
      lat: chart.city.lat,
      lon: chart.city.lon,
      utcDate: `${chart.utc.year}-${String(chart.utc.month).padStart(2, '0')}-${String(chart.utc.day).padStart(2, '0')}`,
      utcTime: `${String(chart.utc.hour).padStart(2, '0')}:${String(chart.utc.minute).padStart(2, '0')}`,
      utcOffsetMinutes: chart.utcOffsetMinutes,
      timezoneAccuracy: chart.timezoneAccuracy,
      sect: chart.sect,
      gender: gender ?? null,
    },
    chart: {
      asc: {
        deg: p2(chart.asc.lon),
        sign: chart.asc.sign,
        signEn: ZODIAC_SIGNS_EN[chart.asc.signIndex],
        signDeg: p2(chart.asc.signDeg),
      },
      mc: {
        deg: p2(chart.mc.lon),
        sign: chart.mc.sign,
        signEn: ZODIAC_SIGNS_EN[Math.floor(chart.mc.lon / 30) % 12],
        signDeg: p2(chart.mc.signDeg),
      },
      houses: chart.houseSigns.map((s, i) => ({
        house: i + 1,
        sign: ZODIAC_SIGNS[s],
        signEn: ZODIAC_SIGNS_EN[s],
        element: SIGN_ELEMENT_OF[s],
      })),
      bodies,
    },
    lilly: {
      scores: lillyScores,
      strongest: model.lilly.strongest,
      weakest: model.lilly.weakest,
      moonWaxing: model.lilly.moonWaxing,
    },
    lots: Object.values(model.lots.lots).map((l) => ({
      key: l.key,
      name: l.nameZh,
      deg: p2(l.lon),
      sign: ZODIAC_SIGNS[l.signIndex],
      house: l.house,
    })),
    arabicParts: model.arabicLots.map((l) => ({
      key: l.key,
      name: l.nameZh,
      deg: p2(l.lon),
      sign: ZODIAC_SIGNS[l.signIndex],
      house: l.house,
      genderNote: l.genderUndetermined ? '仅参考（性别未匹配）' : null,
    })),
    aspects: {
      degree: model.degreeAspects.map((a) => ({
        a: a.labelA,
        b: a.labelB,
        type: a.label,
        actual: p2(a.actual),
        applying: a.applying,
      })),
      sign: chart.aspects.map((a) => ({
        a: PLANET_NAMES_ZH[a.a as Planet],
        b: PLANET_NAMES_ZH[a.b as Planet],
        type: a.aspect,
        distance: p2(a.distance),
      })),
      aversions: model.aversions.map((v) => ({ a: v.labelA, b: v.labelB })),
    },
    timeLords: {
      age: model.age,
      profection: {
        house: model.profections.house,
        sign: model.profections.signName,
        lord: model.profections.lordName,
      },
      firdaria: model.currentFirdaria
        ? {
            lord: model.currentFirdaria.lordName,
            startAge: Number(model.currentFirdaria.startAge.toFixed(1)),
            endAge: Number(model.currentFirdaria.endAge.toFixed(1)),
          }
        : { lord: null, startAge: null, endAge: null },
      zodiacalReleasing: {
        startLot: model.zodiacalReleasing.startLot,
        periods: model.zodiacalReleasing.level1.map((p) => ({
          sign: p.signName,
          lord: p.lordName,
          start: `${p.startUtc.year}-${String(p.startUtc.month).padStart(2, '0')}`,
          end: `${p.endUtc.year}-${String(p.endUtc.month).padStart(2, '0')}`,
          peak: p.isPeak,
        })),
      },
      solarReturn: {
        utc: `${model.solarReturn.utc.year}-${String(model.solarReturn.utc.month).padStart(2, '0')}-${String(model.solarReturn.utc.day).padStart(2, '0')} ${String(model.solarReturn.utc.hour).padStart(2, '0')}:${String(model.solarReturn.utc.minute).padStart(2, '0')}`,
        asc: `${model.solarReturn.chart.asc.sign} ${formatArc(model.solarReturn.chart.asc.lon)}`,
        mc: `${model.solarReturn.chart.mc.sign} ${formatArc(model.solarReturn.chart.mc.lon)}`,
      },
    },
    dataQuality: {
      flags,
      ascDegPerMinute,
      ascWindow4min,
      obstruction,
    },
  };
}

/**
 * 导出 Markdown 契约（供人读 / 供下游模型消费）。
 * 结构固定，字段顺序稳定，便于 diff 与版本对比。
 */
export function structuredDataToMarkdown(data: StructuredData): string {
  const L: string[] = [];
  L.push(`# 沛然堂 · 希腊占星结构化数据 v${data.meta.version}`);
  L.push('');
  L.push(`生成时间：${data.meta.generatedAt}`);
  L.push('');
  L.push('## 输入');
  L.push(`- 当地：${data.input.localDate} ${data.input.localTime}（${data.input.city} ${data.input.lat}°N ${data.input.lon}°E）`);
  L.push(`- 世界时：${data.input.utcDate} ${data.input.utcTime}（UTC${data.input.utcOffsetMinutes >= 0 ? '+' : ''}${data.input.utcOffsetMinutes} 分）`);
  L.push(`- 时区精度：${data.input.timezoneAccuracy}`);
  L.push(`- 宗派：${data.input.sect === 'diurnal' ? '昼盘' : '夜盘'}`);
  L.push(`- 性别：${data.input.gender ?? '未提供'}`);
  L.push('');
  L.push('## 轴点与宫位');
  L.push(`- ASC：${data.chart.asc.sign} ${data.chart.asc.signDeg}°`);
  L.push(`- MC：${data.chart.mc.sign} ${data.chart.mc.signDeg}°`);
  L.push(`- 十二宫：${data.chart.houses.map((h) => `${h.house}${h.sign}`).join(' / ')}`);
  L.push('');
  L.push('## 七政');
  L.push('| 行星 | 位置 | 宫 | 尊贵 | 本质 | 偶然 | 合计 | 等级 |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const s of data.lilly.scores) {
    const b = data.chart.bodies.find((x) => x.key === s.key);
    L.push(
      `| ${s.name} | ${b ? `${b.sign} ${b.signDeg}°` : '—'} | ${b?.house ?? '—'} | ${b?.dignity.join('/') || '—'} | ${s.essential} | ${s.accidental} | ${s.total} | ${s.grade} |`,
    );
  }
  L.push('');
  L.push('## 虚点');
  L.push(data.lots.map((l) => `${l.name} ${l.sign}${l.deg}°（${l.house}宫）`).join(' · '));
  L.push('');
  L.push('## 阿拉伯点');
  L.push(data.arabicParts.map((l) => `${l.name} ${l.sign}${l.deg}°${l.genderNote ? '（仅参考）' : ''}`).join(' · '));
  L.push('');
  L.push('## 时间主星');
  L.push(`- 年龄：${data.timeLords.age}`);
  L.push(`- 推运：第 ${data.timeLords.profection.house} 宫 ${data.timeLords.profection.sign}，年主星 ${data.timeLords.profection.lord}`);
  L.push(`- 法尔达利亚：${data.timeLords.firdaria.lord ?? '—'}`);
  L.push(`- 返照：${data.timeLords.solarReturn.utc} UTC，ASC ${data.timeLords.solarReturn.asc}`);
  L.push('');
  L.push('## 数据质量');
  if (data.dataQuality.flags.length === 0) {
    L.push('- 无异常');
  } else {
    for (const f of data.dataQuality.flags) L.push(`- [${f.level}] ${f.code}：${f.message}`);
  }
  L.push(`- 上升点敏感度：约 ${data.dataQuality.ascDegPerMinute}°/分钟，±4 分钟窗口 ${data.dataQuality.ascWindow4min.from}° ~ ${data.dataQuality.ascWindow4min.to}°`);
  L.push(`- 判读阻碍：${data.dataQuality.obstruction ? '是' : '否'}`);
  return L.join('\n');
}
