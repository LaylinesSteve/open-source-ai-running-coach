'use client';

import type { SkinId } from '@/lib/weekly-skins';

/** Per-skin decorative overlays from the Figma Make weekly recap. */
export default function WeeklySkinDeco({ skinId }: { skinId: SkinId }) {
  if (skinId === 'confetti') {
    const colors = ['#ff2f92', '#a06bff', '#45d3ff', '#7dffcf', '#ffd23f', '#ff8ccf'];
    const pieces = Array.from({ length: 30 }, (_, i) => {
      const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5) % 1 + 1) % 1;
      return {
        left: `${r(1) * 100}%`,
        top: `${r(2) * 46}%`,
        size: 5 + r(3) * 8,
        color: colors[i % colors.length],
        kind: r(4) > 0.5 ? 'star' : r(4) > 0.22 ? 'dot' : 'square',
        delay: `${r(5) * 4}s`,
        dur: `${3.5 + r(6) * 4}s`,
      };
    });
    const spark = 'M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z';
    return (
      <div aria-hidden style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {pieces.map((p, i) =>
          p.kind === 'star' ? (
            <svg
              key={i}
              viewBox="0 0 24 24"
              style={{
                position: 'absolute',
                left: p.left,
                top: p.top,
                width: p.size * 1.6,
                height: p.size * 1.6,
                filter: `drop-shadow(0 0 4px ${p.color})`,
                animation: `weeklyTwinkle ${p.dur} ease-in-out ${p.delay} infinite`,
              }}
            >
              <path d={spark} fill={p.color} />
            </svg>
          ) : (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                background: p.color,
                borderRadius: p.kind === 'dot' ? '50%' : 2,
                opacity: 0.9,
                animation: `weeklyFloatPiece ${p.dur} ease-in-out ${p.delay} infinite`,
              }}
            />
          )
        )}
      </div>
    );
  }

  if (skinId === 'mtv') {
    const paths: Record<string, string> = {
      bolt: 'M13 1 L3 14 L11 14 L8 23 L20 8 L12 8 Z',
      star: 'M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z',
      tri: 'M12 2 L23 21 L1 21 Z',
    };
    const shapes = [
      { t: 'bolt', left: '93%', top: '20%', s: 30, c: '#f6ff3d', rot: 12 },
      { t: 'star', left: '1.5%', top: '40%', s: 20, c: '#34e5ff', rot: 0 },
      { t: 'bolt', left: '94%', top: '58%', s: 18, c: '#ff2ea6', rot: 16 },
      { t: 'tri', left: '1.5%', top: '70%', s: 18, c: '#a24dff', rot: -14 },
    ];
    return (
      <div aria-hidden style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1697465379722-98040bb9c509?w=1400&q=80&auto=format&fit=crop"
          alt=""
          crossOrigin="anonymous"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'contrast(1.15) saturate(1.2)',
            opacity: 0.38,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(130deg, rgba(255,46,166,0.55), rgba(52,229,255,0.4) 55%, rgba(162,77,255,0.5))',
            mixBlendMode: 'color',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(10,4,20,0.45) 0%, rgba(10,4,20,0.72) 45%, rgba(10,4,20,0.88) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0 1px, transparent 1px 3px)',
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: -24,
            top: -24,
            width: 160,
            height: 160,
            backgroundImage: 'radial-gradient(#ff2ea6 1.6px, transparent 1.9px)',
            backgroundSize: '11px 11px',
            opacity: 0.28,
            WebkitMaskImage: 'radial-gradient(circle at 100% 0, #000, transparent 70%)',
            maskImage: 'radial-gradient(circle at 100% 0, #000, transparent 70%)',
          }}
        />
        {shapes.map((sh, i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            style={{
              position: 'absolute',
              left: sh.left,
              top: sh.top,
              width: sh.s,
              height: sh.s,
              opacity: 0.5,
              transform: `rotate(${sh.rot}deg)`,
            }}
          >
            <path d={paths[sh.t]} fill={sh.c} />
          </svg>
        ))}
      </div>
    );
  }

  if (skinId === 'psychedelic') {
    const spectrum =
      '#e4322b 0deg 10deg,#f7941d 10deg 20deg,#ffd23f 20deg 30deg,#2bb673 30deg 40deg,#2e6fdb 40deg 50deg,#7b3fa0 50deg 60deg';
    return (
      <div
        aria-hidden
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          mixBlendMode: 'screen',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '45%',
            width: '180%',
            height: '180%',
            transform: 'translate(-50%, -50%)',
            background: `repeating-conic-gradient(from 0deg at 50% 50%, ${spectrum})`,
            opacity: 0.1,
            filter: 'blur(1.5px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '45%',
            width: '180%',
            height: '180%',
            transform: 'translate(-50%, -50%)',
            background:
              'repeating-radial-gradient(circle at 50% 50%, transparent 0 14px, rgba(255,255,255,0.06) 14px 17px)',
            opacity: 0.6,
          }}
        />
      </div>
    );
  }

  if (skinId === 'chromepop') {
    return (
      <div aria-hidden style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            left: 0,
            height: '200%',
            width: '33%',
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)',
            animation: 'weeklySheen 6s ease-in-out 1.5s infinite',
          }}
        />
      </div>
    );
  }

  if (skinId === 'americana') {
    const stars = Array.from({ length: 9 }, (_, i) => {
      const r = (n: number) => ((Math.sin(i * 51.7 + n * 27.3) * 6112.4) % 1 + 1) % 1;
      return { left: `${8 + r(1) * 84}%`, top: `${6 + r(2) * 30}%`, size: 8 + r(3) * 7, navy: r(4) > 0.5 };
    });
    const starPath =
      'M12 2 L14.6 8.6 L21.5 9 L16 13.4 L18 20 L12 16 L6 20 L8 13.4 L2.5 9 L9.4 8.6 Z';
    return (
      <div aria-hidden style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1780846065832-82c924a90bb1?w=1400&q=80&auto=format&fit=crop"
          alt=""
          crossOrigin="anonymous"
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width: '135%',
            maxWidth: 'none',
            transform: 'translateX(-50%)',
            filter: 'grayscale(1) sepia(0.35) contrast(1.05) brightness(1.02)',
            opacity: 0.12,
            mixBlendMode: 'multiply',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(70% 60% at 50% 30%, transparent, rgba(58,44,30,0.14) 100%)',
          }}
        />
        {stars.map((s, i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            style={{
              position: 'absolute',
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              opacity: 0.16,
            }}
          >
            <path d={starPath} fill={s.navy ? '#2f4a63' : '#9e3b33'} />
          </svg>
        ))}
      </div>
    );
  }

  if (skinId === 'nps') {
    const sprucePath =
      'M12 1 L17 10 L14.5 10 L19 18 L15.5 18 L20 26 L14 26 L14 30 L10 30 L10 26 L4 26 L8.5 18 L5 18 L9.5 10 L7 10 Z';
    const ridgePath =
      'M0 80 L0 58 L22 42 L40 52 L70 22 L90 36 L118 8 L140 24 L165 14 L185 30 L210 18 L230 28 L255 5 L278 20 L300 12 L322 26 L348 15 L370 28 L390 20 L400 26 L400 80 Z';
    const arrowPath = 'M50 112 L4 76 L4 12 Q4 4 12 4 L88 4 Q96 4 96 12 L96 76 Z';
    const trees = [
      { left: '2%', bottom: 0, h: 72, w: 28, op: 0.7 },
      { left: '10%', bottom: 0, h: 54, w: 22, op: 0.55 },
      { left: '18%', bottom: 0, h: 82, w: 30, op: 0.8 },
      { left: '72%', bottom: 0, h: 78, w: 30, op: 0.75 },
      { left: '82%', bottom: 0, h: 60, w: 24, op: 0.6 },
      { left: '90%', bottom: 0, h: 88, w: 32, op: 0.85 },
    ];
    return (
      <div aria-hidden style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1775155638287-274322d26451?w=1400&q=80&auto=format&fit=crop"
          alt=""
          crossOrigin="anonymous"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '55%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'grayscale(1) sepia(0.5) contrast(1.1) brightness(0.7)',
            opacity: 0.28,
            mixBlendMode: 'luminosity',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '55%',
            background:
              'linear-gradient(180deg, rgba(20,40,18,0.6) 0%, rgba(43,83,41,0.35) 60%, transparent 100%)',
          }}
        />
        <svg
          viewBox="0 0 100 115"
          style={{
            position: 'absolute',
            left: '50%',
            top: '6%',
            width: 90,
            height: 104,
            transform: 'translateX(-50%)',
            opacity: 0.07,
          }}
        >
          <path d={arrowPath} fill="#c9a84c" />
          <path d="M50 85 L20 55 L35 55 L50 40 L65 55 L80 55 Z" fill="#c9a84c" opacity="0.6" />
          <path d="M50 90 L28 65 L72 65 Z" fill="#2b5329" opacity="0.5" />
        </svg>
        <svg
          viewBox="0 0 400 80"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            bottom: '14%',
            left: 0,
            width: '100%',
            height: 64,
            opacity: 0.45,
          }}
        >
          <path d={ridgePath} fill="#1a2e18" />
        </svg>
        {trees.map((t, i) => (
          <svg
            key={i}
            viewBox="0 0 24 36"
            style={{
              position: 'absolute',
              left: t.left,
              bottom: t.bottom,
              width: t.w,
              height: t.h,
              opacity: t.op,
            }}
          >
            <path d={sprucePath} fill="#1a2e18" />
          </svg>
        ))}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: 18,
            background: '#1a2e18',
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 10,
            border: '1.5px solid rgba(201,168,76,0.18)',
            borderRadius: 2,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(80% 70% at 50% 45%, transparent 40%, rgba(10,6,2,0.45) 100%)',
          }}
        />
      </div>
    );
  }

  if (skinId === 'luxury') {
    const stars = Array.from({ length: 18 }, (_, i) => {
      const r = (n: number) => ((Math.sin(i * 34.21 + n * 11.7) * 9134.7) % 1 + 1) % 1;
      return { left: `${r(1) * 100}%`, top: `${r(2) * 100}%`, size: 2 + r(3) * 4, delay: `${r(4) * 3}s` };
    });
    return (
      <div aria-hidden style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: 8,
            border: '1px solid rgba(212,175,55,0.35)',
          }}
        />
        {stars.map((s, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              background: 'radial-gradient(circle,#fff3cf 0%,#f0d67a 35%,transparent 70%)',
              borderRadius: '50%',
              boxShadow: '0 0 6px 1px rgba(240,214,122,0.9)',
              animation: `weeklyTwinkle ${2 + (i % 3)}s ease-in-out ${s.delay} infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  return null;
}
