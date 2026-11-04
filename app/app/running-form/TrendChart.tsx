'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export type ChartPoint = { week: string; value?: number; minutes: number; runs: number };

const HEIGHT = 150;
const MARGIN = { top: 12, right: 14, bottom: 24, left: 48 };
const SERIES = '#3987e5';
const SURFACE = '#141414';
const GRID = '#262626';
const AXIS_TEXT = '#a3a3a3';

function niceTicks(min: number, max: number): number[] {
  // A flat line sits mid-chart, not on the axis.
  const pad = max === min ? Math.abs(max) * 0.02 || 1 : 0;
  const low = min - pad;
  const high = max + pad;
  const rough = (high - low) / 2;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * power >= rough) ?? 10) * power;
  const ticks: number[] = [];
  for (let tick = Math.floor(low / step) * step; ; tick += step) {
    ticks.push(Number(tick.toFixed(6)));
    if (tick >= high) break;
  }
  return ticks;
}

function weekLabel(week: string): string {
  return new Date(`${week}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function monthLabel(week: string): string {
  return new Date(`${week}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
}

export default function TrendChart({
  label,
  unit,
  decimals,
  points,
}: {
  label: string;
  unit: string;
  decimals: number;
  points: ChartPoint[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  const withValue = points.flatMap((point, index) =>
    point.value === undefined ? [] : [{ ...point, value: point.value, index }]
  );
  const values = withValue.map((point) => point.value);
  const ticks = values.length ? niceTicks(Math.min(...values), Math.max(...values)) : [0, 1];
  const low = ticks[0];
  const high = ticks[ticks.length - 1];
  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (index: number) =>
    MARGIN.left + (points.length > 1 ? (index / (points.length - 1)) * innerWidth : innerWidth / 2);
  const y = (value: number) => MARGIN.top + (1 - (value - low) / (high - low)) * innerHeight;

  // A week with no running breaks the line, so a gap never looks like a steady stretch.
  const segments: (typeof withValue)[] = [];
  for (const point of withValue) {
    const current = segments[segments.length - 1];
    const previous = current?.[current.length - 1];
    if (previous && previous.index === point.index - 1) current.push(point);
    else segments.push([point]);
  }

  const months = points.flatMap((point, index) =>
    index === 0 || monthLabel(point.week) !== monthLabel(points[index - 1].week)
      ? [{ index, text: monthLabel(point.week) }]
      : []
  );
  const monthStep = Math.max(1, Math.ceil(months.length / Math.max(1, Math.floor(innerWidth / 52))));
  const shownMonths = months.filter((_, i) => i % monthStep === 0);

  const nearest = (pointerX: number) =>
    withValue.reduce<number | null>(
      (best, point) =>
        best === null || Math.abs(x(point.index) - pointerX) < Math.abs(x(best) - pointerX)
          ? point.index
          : best,
      null
    );

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActive(nearest(event.clientX - rect.left));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const position = withValue.findIndex((point) => point.index === active);
    const next = position + (event.key === 'ArrowRight' ? 1 : -1);
    setActive(withValue[Math.min(Math.max(next, 0), withValue.length - 1)]?.index ?? null);
  };

  const shown = active === null ? null : points[active];
  const flip = active !== null && x(active) > width / 2;
  const last = withValue[withValue.length - 1];

  return (
    <div
      ref={box}
      role="img"
      tabIndex={0}
      aria-label={`${label} by week, in ${unit}. Use the left and right arrow keys to read each week. The same numbers are in the table below.`}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setActive(null)}
      onFocus={() => setActive(last?.index ?? null)}
      onBlur={() => setActive(null)}
      onKeyDown={onKeyDown}
      style={{ position: 'relative', height: HEIGHT, touchAction: 'pan-y', outlineOffset: 2 }}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} aria-hidden="true" style={{ display: 'block' }}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={GRID}
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick) + 4}
                textAnchor="end"
                fontSize={11}
                fill={AXIS_TEXT}
                style={{ fontVariantNumeric: 'lining-nums tabular-nums' }}
              >
                {tick.toFixed(decimals)}
              </text>
            </g>
          ))}
          {shownMonths.map(({ index, text }) => (
            <text
              key={index}
              x={x(index)}
              y={HEIGHT - 6}
              textAnchor={index === 0 ? 'start' : 'middle'}
              fontSize={11}
              fill={AXIS_TEXT}
            >
              {text}
            </text>
          ))}
          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={MARGIN.top}
              y2={HEIGHT - MARGIN.bottom}
              stroke="#525252"
              strokeWidth={1}
            />
          )}
          {segments.map((segment) =>
            segment.length > 1 ? (
              <polyline
                key={segment[0].index}
                points={segment.map((p) => `${x(p.index)},${y(p.value)}`).join(' ')}
                fill="none"
                stroke={SERIES}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : (
              <circle
                key={segment[0].index}
                cx={x(segment[0].index)}
                cy={y(segment[0].value)}
                r={4}
                fill={SERIES}
                stroke={SURFACE}
                strokeWidth={2}
              />
            )
          )}
          {[last, shown ? withValue.find((p) => p.index === active) : undefined].map(
            (point, i) =>
              point && (
                <circle
                  key={i}
                  cx={x(point.index)}
                  cy={y(point.value)}
                  r={i === 0 ? 4 : 5}
                  fill={SERIES}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              )
          )}
        </svg>
      )}
      {shown?.value !== undefined && active !== null && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: x(active) + (flip ? -10 : 10),
            transform: flip ? 'translateX(-100%)' : undefined,
            background: '#0a0a0a',
            border: `1px solid ${GRID}`,
            borderRadius: 6,
            padding: '0.4rem 0.6rem',
            fontSize: '0.8rem',
            lineHeight: 1.35,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: '#f5f5f5', fontWeight: 600 }}>
            {shown.value.toFixed(decimals)} {unit}
          </div>
          <div style={{ color: AXIS_TEXT }}>Week of {weekLabel(shown.week)}</div>
          <div style={{ color: AXIS_TEXT }}>
            {shown.runs} {shown.runs === 1 ? 'run' : 'runs'}, {Math.round(shown.minutes)} min
          </div>
        </div>
      )}
    </div>
  );
}
