import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import touxiang from '../MemorialPage/p/touxiang.jpg';

/**
 * 毛主席生平历程页 — 横向折线图
 * 风格：庄重肃穆 · 中国传统水墨 · 红金纪念
 */
export default function MemorialMaoPage() {
  const [entered, setEntered] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [starX, setStarX] = useState(0);
  const [starY, setStarY] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(t);
  }, []);

  // 生平节点：year 年份，ganzhi 干支纪年，title 标题，desc 描述，level 高度(0-100，人生起伏)
  // poem：对应时期的毛主席诗词（有则显示，无则显示简介）
  const timeline = useMemo(() => [
    {
      year: '1893', ganzhi: '癸巳', title: '出生韶山', level: 5,
      desc: '12月26日，出生于湖南省湘潭县韶山冲一个农民家庭。字润之，幼年在私塾读书，接受传统教育。',
      poem: null,
    },
    {
      year: '1911', ganzhi: '辛亥', title: '参加辛亥革命', level: 15,
      desc: '10月，辛亥革命爆发后，毛泽东加入湖南起义新军，当了半年兵。这是他第一次接触军事生活。',
      poem: null,
    },
    {
      year: '1918', ganzhi: '戊午', title: '一师毕业 · 初到北京', level: 25,
      desc: '毕业于湖南省立第一师范学校。同年秋，应杨昌济之邀到北京，任北京大学图书馆助理员，开始接触马克思主义。',
      poem: null,
    },
    {
      year: '1921', ganzhi: '辛酉', title: '出席中共一大', level: 35,
      desc: '7月，出席中国共产党第一次全国代表大会，成为中国共产党的创始人之一。会后任中共湘区委员会书记。',
      poem: null,
    },
    {
      year: '1927', ganzhi: '丁卯', title: '秋收起义 · 井冈山', level: 45,
      desc: '9月，领导湘赣边界秋收起义，创建工农革命军第一军第一师。随后率部上井冈山，开辟第一个农村革命根据地。',
      poem: {
        title: '西江月·井冈山',
        lines: [
          '山下旌旗在望，山头鼓角相闻。',
          '敌军围困万千重，我自岿然不动。',
          '早已森严壁垒，更加众志成城。',
          '黄洋界上炮声隆，报道敌军宵遁。',
        ],
        note: '一九二八年秋',
      },
    },
    {
      year: '1931', ganzhi: '辛未', title: '中华苏维埃成立', level: 60,
      desc: '11月，中华苏维埃第一次全国代表大会在瑞金召开，当选为中华苏维埃共和国中央执行委员会主席。',
      poem: {
        title: '如梦令·元旦',
        lines: [
          '宁化、清流、归化，',
          '路隘林深苔滑。',
          '今日向何方，',
          '直指武夷山下。',
          '山下山下，',
          '风展红旗如画。',
        ],
        note: '一九三〇年一月',
      },
    },
    {
      year: '1934', ganzhi: '甲戌', title: '长征开始', level: 25,
      desc: '10月，第五次反"围剿"失败后，中央红军被迫开始长征。毛泽东随中央红军踏上漫漫征途。',
      poem: {
        title: '清平乐·会昌',
        lines: [
          '东方欲晓，莫道君行早。',
          '踏遍青山人未老，风景这边独好。',
          '会昌城外高峰，颠连直接东溟。',
          '战士指看南粤，更加郁郁葱葱。',
        ],
        note: '一九三四年夏 · 长征前夕',
      },
    },
    {
      year: '1935', ganzhi: '乙亥', title: '遵义会议', level: 40,
      desc: '1月，遵义会议召开，确立了毛泽东在党中央和红军的领导地位。在革命最危急的关头，挽救了党，挽救了红军，挽救了中国革命。',
      poem: {
        title: '忆秦娥·娄山关',
        lines: [
          '西风烈，长空雁叫霜晨月。',
          '霜晨月，马蹄声碎，喇叭声咽。',
          '雄关漫道真如铁，而今迈步从头越。',
          '从头越，苍山如海，残阳如血。',
        ],
        note: '一九三五年二月',
      },
    },
    {
      year: '1937', ganzhi: '丁丑', title: '全面抗战', level: 55,
      desc: '7月，卢沟桥事变爆发，全面抗战开始。毛泽东发表《论持久战》等著作，系统阐述抗日游击战争的战略方针。',
      poem: {
        title: '沁园春·雪',
        lines: [
          '北国风光，千里冰封，万里雪飘。',
          '望长城内外，惟余莽莽；大河上下，顿失滔滔。',
          '山舞银蛇，原驰蜡象，欲与天公试比高。',
          '须晴日，看红装素裹，分外妖娆。',
          '江山如此多娇，引无数英雄竞折腰。',
          '惜秦皇汉武，略输文采；唐宗宋祖，稍逊风骚。',
          '一代天骄，成吉思汗，只识弯弓射大雕。',
          '俱往矣，数风流人物，还看今朝。',
        ],
        note: '一九三六年二月 · 词成于东征途中',
      },
    },
    {
      year: '1945', ganzhi: '乙酉', title: '中共七大 · 抗战胜利', level: 75,
      desc: '4月，中共七大在延安召开，毛泽东思想被确立为党的指导思想。8月，日本宣布无条件投降，抗日战争取得伟大胜利。',
      poem: null,
    },
    {
      year: '1949', ganzhi: '己丑', title: '新中国成立', level: 100,
      desc: '10月1日，在北京天安门城楼上庄严宣告中华人民共和国中央人民政府成立。中国人民从此站起来了！',
      poem: {
        title: '七律·人民解放军占领南京',
        lines: [
          '钟山风雨起苍黄，百万雄师过大江。',
          '虎踞龙盘今胜昔，天翻地覆慨而慷。',
          '宜将剩勇追穷寇，不可沽名学霸王。',
          '天若有情天亦老，人间正道是沧桑。',
        ],
        note: '一九四九年四月',
      },
    },
    {
      year: '1956', ganzhi: '丙申', title: '三大改造完成', level: 90,
      desc: '基本完成对农业、手工业和资本主义工商业的社会主义改造，确立社会主义基本制度，中国进入社会主义初级阶段。',
      poem: {
        title: '水调歌头·游泳',
        lines: [
          '才饮长沙水，又食武昌鱼。',
          '万里长江横渡，极目楚天舒。',
          '不管风吹浪打，胜似闲庭信步，今日得宽馀。',
          '子在川上曰：逝者如斯夫！',
          '风樯动，龟蛇静，起宏图。',
          '一桥飞架南北，天堑变通途。',
          '更立西江石壁，截断巫山云雨，高峡出平湖。',
          '神女应无恙，当惊世界殊。',
        ],
        note: '一九五六年六月',
      },
    },
    {
      year: '1972', ganzhi: '壬子', title: '尼克松访华', level: 65,
      desc: '2月，美国总统尼克松访华，中美发表《上海公报》，两国关系开始走向正常化，打开了中国外交的新局面。',
      poem: null,
    },
    {
      year: '1976', ganzhi: '丙辰', title: '与世长辞', level: 45,
      desc: '歌未竟东方白',
      poem: null,
    },
  ], []);

  // SVG 尺寸
  const svgWidth = 1000;
  const svgHeight = 320;
  const paddingTop = 55;
  const paddingBottom = 85;
  const paddingSide = 50;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const chartWidth = svgWidth - paddingSide * 2;

  // 计算每个节点的坐标
  const points = useMemo(() => {
    return timeline.map((item, i) => ({
      x: paddingSide + (i / (timeline.length - 1)) * chartWidth,
      y: paddingTop + chartHeight - (item.level / 100) * chartHeight,
      ...item,
    }));
  }, [timeline, chartWidth, chartHeight]);

  // 生成折线路径（贝塞尔平滑曲线）
  const pathD = useMemo(() => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const dx = (curr.x - prev.x) * 0.35;
      d += ` C ${prev.x + dx} ${prev.y}, ${curr.x - dx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [points]);

  // 计算每个节点对应的路径长度比例，确保红星精准对齐
  const [nodeProgress, setNodeProgress] = useState<number[]>([]);

  useEffect(() => {
    if (!pathRef.current) return;
    const pathEl = pathRef.current;
    const totalLength = pathEl.getTotalLength();
    const progresses = points.map(p => {
      // 二分查找找到最接近点的 progress
      let low = 0;
      let high = 1;
      for (let k = 0; k < 30; k++) {
        const mid = (low + high) / 2;
        const pt = pathEl.getPointAtLength(totalLength * mid);
        if (pt.x < p.x) low = mid;
        else high = mid;
      }
      return (low + high) / 2;
    });
    setNodeProgress(progresses);

    // 初始化红星位置
    const firstPt = pathEl.getPointAtLength(totalLength * progresses[0]);
    setStarX(firstPt.x);
    setStarY(firstPt.y);
  }, [points, entered]);

  const handleNodeClick = (idx: number) => {
    if (idx === activeIdx || animating || !pathRef.current || nodeProgress.length === 0) return;
    setAnimating(true);

    const pathEl = pathRef.current;
    const totalLength = pathEl.getTotalLength();
    const startProgress = nodeProgress[activeIdx];
    const endProgress = nodeProgress[idx];
    const startTime = performance.now();
    const duration = 900;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const progress = startProgress + (endProgress - startProgress) * eased;
      const pos = pathEl.getPointAtLength(totalLength * progress);
      setStarX(pos.x);
      setStarY(pos.y);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        setActiveIdx(idx);
        setAnimating(false);
      }
    };
    requestAnimationFrame(animate);
  };

  const activeNode = timeline[activeIdx];

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'linear-gradient(180deg, #1a0a0a 0%, #2d1010 30%, #1a0a0a 100%)',
        color: '#f5e6d3',
        fontFamily: "'Noto Serif SC', 'Songti SC', 'SimSun', serif",
      }}
    >
      {/* 顶部导航 */}
      <div
        className="w-full border-b border-amber-700/30 transition-all duration-1000"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(-10px)',
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/memorial"
            className="text-sm text-amber-200/60 transition-colors hover:text-amber-200"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            ← 返回纪念
          </Link>
          <div className="flex items-center gap-3 text-amber-300/50">
            <span className="text-xs tracking-[0.3em]">◈</span>
            <span className="text-xs tracking-[0.2em]">光辉历程</span>
            <span className="text-xs tracking-[0.3em]">◈</span>
          </div>
        </div>
      </div>

      {/* 头部：肖像 + 名字 */}
      <div className="relative overflow-hidden py-10 text-center md:py-12">
        {/* 背景红光晕 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 40% 50% at 50% 20%, rgba(139, 0, 0, 0.25), transparent 65%)',
            opacity: entered ? 0.4 : 0,
            transform: entered ? 'scale(1)' : 'scale(0.3)',
            transition: 'opacity 2s ease-out, transform 2.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        <div
          className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 md:flex-row md:gap-8 md:text-left"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 1.2s ease-out, transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '300ms',
          }}
        >
          {/* 肖像 */}
          <div className="shrink-0">
            <div
              className="relative mx-auto overflow-hidden border-2"
              style={{
                width: '120px',
                height: '150px',
                borderColor: 'rgba(217, 119, 6, 0.5)',
              }}
            >
              <div className="absolute inset-1 border border-amber-700/30 z-10 pointer-events-none" />
              <img
                src={touxiang}
                alt="毛泽东"
                className="h-full w-full object-cover"
                style={{ filter: 'sepia(0.15) contrast(1.05)' }}
              />
            </div>
          </div>

          {/* 名字 + 生卒 */}
          <div className="mt-4 flex-1 md:mt-0">
            <h1
              className="text-[36px] font-black tracking-[0.3em] text-amber-200 md:text-[44px]"
              style={{ fontFamily: "'Noto Serif SC', 'Songti SC', serif" }}
            >
              毛 泽 东
            </h1>
            <p
              className="mt-2 text-sm tracking-[0.2em] text-amber-400/60"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              1893 — 1976
            </p>
            <p
              className="mt-3 text-sm leading-relaxed text-amber-200/50"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              伟大的马克思主义者，伟大的无产阶级革命家、战略家、理论家。
            </p>
          </div>
        </div>
      </div>

      {/* 生平折线图 */}
      <div
        className="mx-auto max-w-6xl px-4 pb-12"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 1s ease-out, transform 1s ease-out',
          transitionDelay: '800ms',
        }}
      >
        <div className="mb-6 text-center">
          <h2
            className="text-[24px] font-black tracking-[0.3em] text-amber-200"
            style={{ fontFamily: "'Noto Serif SC', 'Songti SC', serif" }}
          >
            生 平 历 程
          </h2>
          <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
          <p className="mt-3 text-xs tracking-[0.15em] text-amber-500/40" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            共 {timeline.length} 个重要节点
          </p>
        </div>

        {/* 折线图 SVG */}
        <div
          className="relative mx-auto"
          style={{
            maxWidth: svgWidth,
            border: '1px solid rgba(217, 119, 6, 0.2)',
            background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.08), rgba(26, 10, 10, 0.3))',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
          }}
        >
          {/* 四角装饰 */}
          <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-amber-600/40 z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-amber-600/40 z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-amber-600/40 z-10 pointer-events-none" />
          <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-amber-600/40 z-10 pointer-events-none" />

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full"
            style={{ display: 'block' }}
          >
            {/* 渐变定义 */}
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#b45309" />
                <stop offset="50%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#dc2626" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* 背景网格线 */}
            {[0, 25, 50, 75, 100].map((pct) => {
              const y = paddingTop + chartHeight - (pct / 100) * chartHeight;
              return (
                <line
                  key={pct}
                  x1={paddingSide}
                  y1={y}
                  x2={svgWidth - paddingSide}
                  y2={y}
                  stroke="rgba(217, 119, 6, 0.08)"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                />
              );
            })}

            {/* 折线下填充渐变 */}
            <path
              d={`${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`}
              fill="url(#areaGradient)"
              opacity={entered ? 1 : 0}
              style={{ transition: 'opacity 1.5s ease-out', transitionDelay: '1.2s' }}
            />

            {/* 折线 */}
            <path
              id="timeline-path"
              ref={pathRef}
              d={pathD}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: entered ? 'none' : '3000',
                strokeDashoffset: entered ? '0' : '3000',
                transition: 'stroke-dashoffset 2.5s ease-out',
                transitionDelay: '1s',
              }}
            />

            {/* 节点圆点 */}
            {points.map((p, i) => (
              <g
                key={p.year}
                onClick={() => handleNodeClick(i)}
                style={{ cursor: 'pointer' }}
              >
                {/* 高度竖线 */}
                <line
                  x1={p.x}
                  y1={p.y}
                  x2={p.x}
                  y2={svgHeight - paddingBottom + 5}
                  stroke={activeIdx === i ? 'rgba(251, 191, 36, 0.25)' : 'rgba(217, 119, 6, 0.08)'}
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  className="transition-all duration-300"
                />

                {/* 外圈光晕 */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={activeIdx === i ? 16 : 7}
                  fill={activeIdx === i ? 'url(#starGlow)' : 'rgba(217, 119, 6, 0.15)'}
                  className="transition-all duration-300"
                />
                {/* 内圈节点 */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={activeIdx === i ? 6 : 3.5}
                  fill={activeIdx === i ? '#fbbf24' : '#b45309'}
                  stroke={activeIdx === i ? '#fef3c7' : '#78350f'}
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />

                {/* 年份 + 干支标签（交替显示上下，避免重叠） */}
                <text
                  x={p.x}
                  y={i % 2 === 0 ? svgHeight - paddingBottom + 20 : paddingTop - 10}
                  textAnchor="middle"
                  fill={activeIdx === i ? '#fbbf24' : 'rgba(217, 119, 6, 0.7)'}
                  fontSize="12"
                  fontWeight="bold"
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    letterSpacing: '0.02em',
                  }}
                  className="transition-all duration-300"
                >
                  {p.year}
                </text>
                <text
                  x={p.x}
                  y={i % 2 === 0 ? svgHeight - paddingBottom + 34 : paddingTop + 4}
                  textAnchor="middle"
                  fill={activeIdx === i ? 'rgba(251, 191, 36, 0.7)' : 'rgba(217, 119, 6, 0.4)'}
                  fontSize="10"
                  style={{
                    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
                    letterSpacing: '0.1em',
                  }}
                  className="transition-all duration-300"
                >
                  {p.ganzhi}
                </text>
              </g>
            ))}

            {/* 红星指示器 */}
            {nodeProgress.length > 0 && (
              <g
                style={{
                  transform: `translate(${starX}px, ${starY}px)`,
                }}
              >
                {/* 红星光晕 */}
                <circle r="22" fill="url(#starGlow)" opacity="0.9" />
                {/* 五角星 */}
                <path
                  d="M0 -11 L3.2 -3.3 L11 -1.6 L5 4.3 L6.6 12 L0 7.7 L-6.6 12 L-5 4.3 L-11 -1.6 L-3.2 -3.3 Z"
                  fill="#dc2626"
                  stroke="#fbbf24"
                  strokeWidth="1"
                  style={{
                    filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8))',
                  }}
                />
              </g>
            )}
          </svg>
        </div>

        {/* 当前节点详情 */}
        <div
          className="mx-auto mt-6 max-w-3xl border p-6"
          style={{
            borderColor: 'rgba(217, 119, 6, 0.3)',
            background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.15), rgba(26, 10, 10, 0.6))',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
            animation: 'fadeSlideIn 0.5s ease-out',
          }}
          key={activeIdx}
        >
          <div className="flex items-center gap-4">
            <div
              className="shrink-0 text-3xl font-black text-amber-400"
              style={{ fontFamily: "'Noto Serif SC', serif", letterSpacing: '0.1em' }}
            >
              {activeNode.year}
            </div>
            <div className="h-10 w-px bg-amber-700/30" />
            <div className="flex-1">
              <div
                className="text-lg font-bold text-amber-100"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                {activeNode.title}
              </div>
            </div>
          </div>
          <div className="my-4 h-px bg-gradient-to-r from-amber-700/40 via-amber-600/20 to-transparent" />

          {activeNode.poem ? (
            /* 有诗词则显示诗词 */
            <div className="py-2 text-center">
              <div
                className="mb-5 text-xl font-black text-amber-300"
                style={{ fontFamily: "'Noto Serif SC', 'Songti SC', serif", letterSpacing: '0.15em' }}
              >
                {activeNode.poem.title}
              </div>
              <div
                className="space-y-2 text-base leading-loose text-amber-100/90"
                style={{ fontFamily: "'Noto Serif SC', 'Songti SC', serif", lineHeight: '2.2' }}
              >
                {activeNode.poem.lines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <div
                className="mt-5 text-xs tracking-[0.2em] text-amber-500/50"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                —— {activeNode.poem.note}
              </div>
            </div>
          ) : (
            /* 无诗词则显示简介 */
            <p
              className="text-sm leading-loose text-stone-300/80"
              style={{ fontFamily: "'Noto Serif SC', serif", lineHeight: '2' }}
            >
              {activeNode.desc}
            </p>
          )}
        </div>

        {/* 上一个/下一个导航 */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => handleNodeClick(Math.max(0, activeIdx - 1))}
            disabled={activeIdx === 0 || animating}
            className="px-4 py-2 text-sm font-bold text-amber-400/70 transition-all hover:text-amber-300 disabled:opacity-30"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            ← 上一段
          </button>
          <div className="flex gap-1.5">
            {timeline.map((_, i) => (
              <button
                key={i}
                onClick={() => handleNodeClick(i)}
                className="h-2 rounded-full transition-all"
                style={{
                  width: activeIdx === i ? '20px' : '6px',
                  background: activeIdx === i ? '#fbbf24' : 'rgba(217, 119, 6, 0.3)',
                }}
                aria-label={`跳到第${i + 1}个节点`}
              />
            ))}
          </div>
          <button
            onClick={() => handleNodeClick(Math.min(timeline.length - 1, activeIdx + 1))}
            disabled={activeIdx === timeline.length - 1 || animating}
            className="px-4 py-2 text-sm font-bold text-amber-400/70 transition-all hover:text-amber-300 disabled:opacity-30"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            下一段 →
          </button>
        </div>
      </div>

      {/* 底部 */}
      <div
        className="pb-12 text-center transition-all duration-1000"
        style={{
          opacity: entered ? 1 : 0,
          transitionDelay: '1500ms',
        }}
      >
        <p
          className="text-lg font-black tracking-[0.4em] text-amber-300/50"
          style={{ fontFamily: "'Noto Serif SC', 'Songti SC', serif" }}
        >
          永 垂 不 朽
        </p>
      </div>

      {/* 页脚 */}
      <div className="border-t border-amber-900/30 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-xs text-stone-500" style={{ letterSpacing: '0.1em' }}>
            沛然堂 · 特殊纪念 · 谨以此页致敬先辈
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
