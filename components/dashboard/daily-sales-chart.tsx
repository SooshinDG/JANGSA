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
 * 개선된 버전:
 * - 수평 보조선 (25 / 50 / 75 / 100 %)
 * - 데이터 점 + SVG title 툴팁
 * - gradient area fill
 * - 더 선명한 그리드 / 텍스트 위계
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

  /* ── SVG 치수 ── */
  const W = 600;
  const H = 130;
  const PAD = { top: 14, right: 16, bottom: 28, left: 14 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const xOf = (day: number) =>
    PAD.left + ((day - 1) / Math.max(totalDays - 1, 1)) * cW;
  const yOf = (sales: number) =>
    PAD.top + cH - (sales / maxSales) * cH;

  /* polyline points */
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

  /* 수평 보조선 (25 / 50 / 75%) */
  const gridRatios = [0.25, 0.5, 0.75, 1.0];

  /* x축 레이블 */
  const xLabelDays = Array.from(
    new Set([1, Math.round(totalDays / 3), Math.round((2 * totalDays) / 3), totalDays]),
  );

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
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.01" />
          </linearGradient>
          {/* 클리핑 마스크: 차트 영역 내에만 렌더링 */}
          <clipPath id="chartClip">
            <rect x={PAD.left} y={PAD.top} width={cW} height={cH + 1} />
          </clipPath>
        </defs>

        {/* ── 수평 보조선 ── */}
        {gridRatios.map((ratio) => {
          const y = yOf(maxSales * ratio);
          const isBase = ratio === 1.0;
          return (
            <g key={ratio}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth={isBase ? "1" : "0.5"}
                strokeDasharray={isBase ? undefined : "3 3"}
              />
              {/* y축 값 레이블 (100%만) */}
              {isBase && (
                <text
                  x={PAD.left}
                  y={y - 3}
                  fontSize="8.5"
                  fill="hsl(var(--muted-foreground))"
                  textAnchor="start"
                >
                  {formatKrwCompact(maxSales)}
                </text>
              )}
            </g>
          );
        })}

        {/* ── 기준선 (하단) ── */}
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
          stroke="hsl(var(--primary))"
          strokeWidth="2"
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
              <title>{`${month}-${String(p.day).padStart(2, "0")}: ${formatKrwCompact(p.sales)}`}</title>
              {/* 외곽 링 (hover 클릭 영역 확장) */}
              <circle
                cx={cx}
                cy={cy}
                r="8"
                fill="transparent"
                className="cursor-pointer"
              />
              {/* 실제 점 */}
              <circle
                cx={cx}
                cy={cy}
                r="3.5"
                fill="hsl(var(--primary))"
                stroke="hsl(var(--card))"
                strokeWidth="2"
                className="pointer-events-none"
              />
            </g>
          );
        })}

        {/* ── x축 레이블 ── */}
        {xLabelDays.map((d, i) => (
          <text
            key={d}
            x={xOf(d)}
            y={H - 5}
            fontSize="9"
            fill="hsl(var(--muted-foreground))"
            textAnchor={
              i === 0 ? "start" : i === xLabelDays.length - 1 ? "end" : "middle"
            }
          >
            {d}일
          </text>
        ))}
      </svg>
    </div>
  );
}
