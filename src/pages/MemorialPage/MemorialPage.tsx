import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import touxiang from './p/touxiang.jpg';

/**
 * 特殊纪念页
 * 风格：庄重肃穆 · 中国传统水墨 · 红金纪念
 * 与主站 Kawaii Webcore 风格完全切割
 */
export default function MemorialPage() {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // 进入页面时滚动到顶部
    window.scrollTo(0, 0);
    // 触发入场动画
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(t);
  }, []);

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
      {/* 顶部装饰：金线 */}
      <div
        className="w-full border-b border-amber-700/30 transition-all duration-1000"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(-10px)',
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-sm text-amber-200/60 transition-colors hover:text-amber-200"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            ← 返回沛然堂
          </Link>
          <div className="flex items-center gap-3 text-amber-300/50">
            <span className="text-xs tracking-[0.3em]">◈</span>
            <span className="text-xs tracking-[0.2em]">永垂不朽</span>
            <span className="text-xs tracking-[0.3em]">◈</span>
          </div>
        </div>
      </div>

      {/* 主纪念区 */}
      <div className="relative overflow-hidden py-24 text-center md:py-36">
        {/* 背景红光晕 — 入场时从中心扩散 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 50% 50% at 50% 45%, rgba(139, 0, 0, 0.35), transparent 65%)',
            opacity: entered ? 0.4 : 0,
            transform: entered ? 'scale(1)' : 'scale(0.3)',
            transition: 'opacity 2s ease-out, transform 2.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl px-6">
          {/* 小标 */}
          <div
            className="mb-8 flex items-center justify-center gap-4 transition-all duration-1000"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? 'translateY(0)' : 'translateY(20px)',
              transitionDelay: '300ms',
            }}
          >
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-amber-600/50" />
            <span
              className="text-sm tracking-[0.5em] text-amber-400/80"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              特 别 纪 念
            </span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-amber-600/50" />
          </div>

          {/* 主标题 */}
          <h1
            className="text-[56px] font-black leading-tight text-amber-100 md:text-[96px]"
            style={{
              fontFamily: "'Noto Serif SC', 'Songti SC', serif",
              letterSpacing: '0.2em',
              textShadow: '0 4px 30px rgba(180, 50, 50, 0.4)',
              opacity: entered ? 1 : 0,
              transform: entered ? 'translateY(0)' : 'translateY(40px)',
              transition: 'opacity 1.5s ease-out, transform 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
              transitionDelay: '500ms',
            }}
          >
            永 垂 不 朽
          </h1>

          {/* 副标题分隔 */}
          <div
            className="mx-auto mt-10 h-px bg-gradient-to-r from-transparent via-amber-600/40 to-transparent transition-all duration-1000"
            style={{
              width: entered ? '160px' : '0px',
              opacity: entered ? 1 : 0,
              transitionDelay: '1000ms',
            }}
          />
        </div>
      </div>

      {/* 纪念铭文 */}
      <div
        className="mx-auto max-w-3xl px-6 pb-20 transition-all duration-1200"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(30px)',
          transitionDelay: '1500ms',
        }}
      >
        <div
          className="relative border border-amber-800/40 bg-gradient-to-b from-stone-900/40 to-red-950/20 p-10 md:p-16"
          style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)' }}
        >
          {/* 四角装饰 */}
          <div className="absolute left-0 top-0 h-10 w-10 border-l-2 border-t-2 border-amber-600/50" />
          <div className="absolute right-0 top-0 h-10 w-10 border-r-2 border-t-2 border-amber-600/50" />
          <div className="absolute bottom-0 left-0 h-10 w-10 border-b-2 border-l-2 border-amber-600/50" />
          <div className="absolute bottom-0 right-0 h-10 w-10 border-b-2 border-r-2 border-amber-600/50" />

          <div className="py-8 text-center">
            {/* 肖像框 */}
            <Link to="/memorial/mao" className="block mx-auto mb-6 cursor-pointer transition-transform hover:scale-105">
              <div
                className="relative mx-auto overflow-hidden border-2"
                style={{
                  width: '180px',
                  height: '220px',
                  borderColor: 'rgba(217, 119, 6, 0.5)',
                }}
              >
                {/* 内边框 */}
                <div className="absolute inset-1 border border-amber-700/30 z-10 pointer-events-none" />

                {/* 真实头像 */}
                <img
                  src={touxiang}
                  alt="毛泽东"
                  className="h-full w-full object-cover"
                  style={{ filter: 'sepia(0.15) contrast(1.05)' }}
                />
              </div>
            </Link>

            {/* 名字 */}
            <Link to="/memorial/mao" className="block hover:text-amber-100 transition-colors">
              <h2
                className="text-[36px] font-black tracking-[0.3em] text-amber-200 md:text-[44px]"
                style={{ fontFamily: "'Noto Serif SC', 'Songti SC', serif" }}
              >
                毛 泽 东
              </h2>
            </Link>

            {/* 生卒年 */}
            <p
              className="mt-3 text-sm tracking-[0.2em] text-amber-400/60"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              1893 — 1976
            </p>

            {/* 查看生平提示 */}
            <p
              className="mt-4 text-xs tracking-[0.15em] text-amber-500/40"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              点击查看生平历程 →
            </p>
          </div>
        </div>
      </div>

      {/* 底部致敬 */}
      <div
        className="pb-20 text-center transition-all duration-1200"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(20px)',
          transitionDelay: '1800ms',
        }}
      >
        <p
          className="text-2xl font-black tracking-[0.5em] text-amber-300/60 md:text-3xl"
          style={{ fontFamily: "'Noto Serif SC', 'Songti SC', serif" }}
        >
          敬 仰 · 缅 怀 · 传 承
        </p>
      </div>

      {/* 页脚 */}
      <div
        className="border-t border-amber-900/30 py-8 transition-all duration-1000"
        style={{
          opacity: entered ? 1 : 0,
          transitionDelay: '2000ms',
        }}
      >
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-xs text-stone-500" style={{ letterSpacing: '0.1em' }}>
            沛然堂 · 特殊纪念 · 谨以此页致敬先辈
          </p>
        </div>
      </div>
    </div>
  );
}
