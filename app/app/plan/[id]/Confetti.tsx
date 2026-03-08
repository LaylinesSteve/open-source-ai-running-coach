'use client';

import { useMemo } from 'react';

const COLORS = ['#d13447', '#ffbf00', '#263672', '#22c55e', '#e85d04'];

export default function Confetti() {
  const pieces = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => {
      const w = 4 + Math.random() * 6;
      return {
        id: i,
        left: Math.random() * 100,
        width: w,
        height: w * 0.4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 0.5 + Math.random() * 0.5,
        rotate: Math.random() * 360,
        duration: 4 + Math.random() * 2,
        delay: Math.random() * 2,
      };
    });
  }, []);

  return (
    <>
      <style>{`
        @keyframes confetti-drop {
          100% {
            top: 120vh;
            transform: rotate(720deg);
          }
        }
        .confetti-piece {
          position: fixed;
          top: -5%;
          z-index: 9998;
          pointer-events: none;
          animation: confetti-drop var(--dur) var(--delay) ease-in forwards;
        }
      `}</style>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998 }}>
        {pieces.map((p) => (
          <div
            key={p.id}
            className="confetti-piece"
            style={{
              left: `${p.left}%`,
              width: p.width,
              height: p.height,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: `rotate(${p.rotate}deg)`,
              ['--dur' as string]: `${p.duration}s`,
              ['--delay' as string]: `${p.delay}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
