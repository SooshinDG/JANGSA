"use client";

import { useMemo } from "react";
import type { DailyEntry } from "@/types";
import { formatKrwCompact } from "@/lib/utils/format-krw-compact";

interface DailySalesChartProps {
  entries: DailyEntry[];
  month: string; // "YYYY-MM"
}

interface ChartPoint {
  day: number;
  sales: number;
}

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * 월별 일별 총매출 라인 차트 (pure SVG).
 *
 * 3차 개선:
 * - 차트 높이 증가 (H: 130 → 168) — 하단 허전함 해소
 * - X축 눈금 5일 간격으로 촘촘하게 (1·5·10·15·20·25·마지막일)
 * - 수평 보조선 50%·25% 추가 (기존 유지)
 * - 그리드·데이터 점 스타일 개선
 */
export function DailySalesChart({ entries, month }: DailySalesChartProps) {
  const { points, maxSales, totalDays } = useMemo(() => {
    const filtered = entries.filter((e) => e.month === month);

    const map = new Map<number, number>();
    for (const e of filtered) {
      const day = Number(e.date.split("-")[2]);
      const gross = Object.values(e.sales).reduce(
        (sum, v) => sum + (typeof v === "number" ? v : 0),
        0,
      );
      map.set(day, (map.get(day) ?? 0) + gross - (e.refundAmount ?? 0));
    }

    const pts: ChartPoint[] = Array.from(map.entries())
      .map(([day, sales]) => ({ day, sales: Math.max(0, sales) }))
      .sort((a, b) => a.day - b.day);

    const max = pts.length > 0 ? Math.max(...pts.map((p) => p.sales), 1) : 1;
    const total = daysInMonth(month);

    return { points: pts, maxSales: max, totalDays: total };
  }, [entries, month]);

  if (points.length === 0) return null;

  /* ── SVG 치수 — 높이를 키워 하단 허전함 해소 ── */
  const W = 620;
  const H = 152;
  const PAD = { top: 18, right: 16, bottom: 26, left: 16 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const xOf = (day: number) =>
    PAD.left + ((day - 1) / Math.max(totalDays - 1, 1)) * cW;
  const yOf = (sales: number) =>
    PAD.top + cH - (sales / maxSales) * cH;

  /* polyline */
  const linePoints = points
    .map((p) => `${xOf(p.day).toFixed(1)},${yOf(p.sales).toFixed(1)}`)
    .join(" ");

  /* area fill */
  const baseY = (PAD.top + cH).toFixed(1);
  const areaPath =
    `M ${xOf(points[0].day).toFixed(1)},${baseY} ` +
    points
      .map((p) => `L ${xOf(p.day).toFixed(1)},${yOf(p.sales).toFixed(1)}`)
      .join(" ") +
    ` L ${xOf(points[points.length - 1].day).toFixed(1)},${baseY} Z`;

  /* 수평 보조선 */
  const gridRatios = [0.25, 0.5, 0.75, 1.0];

  /* ── X축 눈금: 5일 간격으로 촘촘하게 ── */
  const xTickDays = useMemo(() => {
    const ticks = new Set<number>([1]);
    const interval = 5;
    for (let d = interval; d < totalDays; d += interval) {
      ticks.add(d);
    }
    ticks.add(totalDays);
    return Array.from(ticks).sort((a, b) => a - b);
  }, [totalDays]);

  return (
    <div className="w-full" aria-label={`${month} 일별 총매출 차트`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="일별 총매출 라인 차트"
      >
        <defs>
          <linearGradient id="areaGradFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#378ADD" stopOpacity="0.18" />
            <stop offset="85%" stopColor="#378ADD" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#378ADD" stopOpacity="0" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={PAD.left} y={PAD.top} width={cW} height={cH + 1} />
          </clipPath>
        </defs>

        {/* ── 수평 보조선 ── */}
        {gridRatios.map((ratio) => {
          const y = yOf(maxSales * ratio);
          const isTop = ratio === 1.0;
          const isBase = ratio === 0;
          return (
            <g key={ratio}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth={isTop ? "0.8" : "0.5"}
                strokeDasharray={isTop || isBase ? undefined : "3 4"}
                strokeOpacity={isTop ? "0.9" : "0.6"}
              />
              {/* 최고값 레이블 */}
              {isTop && (
                <text
                  x={PAD.left + 2}
                  y={y - 4}
                  fontSize="8"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity="0.8"
                  textAnchor="start"
                >
                  {formatKrwCompact(maxSales)}
                </text>
              )}
              {/* 50% 레이블 */}
              {ratio === 0.5 && (
                <text
                  x={PAD.left + 2}
                  y={y - 3}
                  fontSize="7.5"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity="0.55"
                  textAnchor="start"
                >
                  {formatKrwCompact(maxSales * 0.5)}
                </text>
              )}
            </g>
          );
        })}

        {/* ── 기준선 ── */}
        <line
          x1={PAD.left}
          y1={PAD.top + cH}
          x2={W - PAD.right}
          y2={PAD.top + cH}
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />

        {/* ── 영역 채우기 ── */}
        <path d={areaPath} fill="url(#areaGradFill)" clipPath="url(#chartClip)" />

        {/* ── 라인 ── */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#378ADD"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          clipPath="url(#chartClip)"
        />

        {/* ── 데이터 점 ── */}
        {points.map((p) => {
          const cx = xOf(p.day);
          const cy = yOf(p.sales);
          return (
            <g key={p.day}>
              <title>{`${p.day}일: ${formatKrwCompact(p.sales)}`}</title>
              {/* 넓은 클릭 영역 */}
              <circle cx={cx} cy={cy} r="9" fill="transparent" className="cursor-pointer" />
              {/* 외곽 링 */}
              <circle
                cx={cx}
                cy={cy}
                r="4.5"
                fill="hsl(var(--card))"
                stroke="#378ADD"
                strokeWidth="2"
                className="pointer-events-none"
              />
              {/* 내부 점 */}
              <circle
                cx={cx}
                cy={cy}
                r="2"
                fill="#378ADD"
                className="pointer-events-none"
              />
            </g>
          );
        })}

        {/* ── X축 눈금 (5일 간격) ── */}
        {xTickDays.map((d) => {
          const x = xOf(d);
          const isFirst = d === 1;
          const isLast = d === totalDays;
          return (
            <g key={d}>
              {/* 눈금 선 */}
              <line
                x1={x}
                y1={PAD.top + cH}
                x2={x}
                y2={PAD.top + cH + 3}
                stroke="hsl(var(--border))"
                strokeWidth="0.8"
              />
              {/* 레이블 */}
              <text
                x={x}
                y={H - 4}
                fontSize="8.5"
                fill="hsl(var(--muted-foreground))"
                textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
              >
                {d}일
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
