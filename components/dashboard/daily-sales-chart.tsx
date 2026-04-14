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

/** 주어진 월의 일 수 계산 */
function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * 월별 일별 총매출 라인 차트 (pure SVG, 외부 의존성 없음).
 *
 * - 데이터가 없는 날은 선에서 제외하고 점만 있는 날만 표시
 * - 호버 시 SVG <title> 로 툴팁 제공
 * - 반응형: viewBox 고정 + width=100%
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

  /* ── SVG 좌표 계산 ── */
  const W = 560;
  const H = 110;
  const PAD = { top: 10, right: 12, bottom: 24, left: 12 };
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

  /* area fill path */
  const baseY = (PAD.top + cH).toFixed(1);
  const areaPath =
    `M ${xOf(points[0].day).toFixed(1)},${baseY} ` +
    points
      .map((p) => `L ${xOf(p.day).toFixed(1)},${yOf(p.sales).toFixed(1)}`)
      .join(" ") +
    ` L ${xOf(points[points.length - 1].day).toFixed(1)},${baseY} Z`;

  /* x축 레이블: 1일, 중간, 마지막 날 */
  const midDay = Math.round(totalDays / 2);
  const xLabels = [1, midDay, totalDays].map((d) => ({
    day: d,
    x: xOf(d),
    label: `${d}일`,
  }));

  /* y축: 최고값 레이블 */
  const yTopLabel = formatKrwCompact(maxSales);

  return (
    <div className="w-full" aria-label={`${month} 일별 총매출 차트`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="일별 총매출 라인 차트"
      >
        <defs>
          <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* 기준선 (0) */}
        <line
          x1={PAD.left}
          y1={PAD.top + cH}
          x2={W - PAD.right}
          y2={PAD.top + cH}
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />

        {/* 최고값 보조선 */}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={W - PAD.right}
          y2={PAD.top}
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* 최고값 레이블 */}
        <text
          x={PAD.left}
          y={PAD.top - 2}
          fontSize="9"
          fill="hsl(var(--muted-foreground))"
          textAnchor="start"
        >
          {yTopLabel}
        </text>

        {/* 영역 채우기 */}
        <path d={areaPath} fill="url(#salesAreaGrad)" />

        {/* 라인 */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* 데이터 점 */}
        {points.map((p) => (
          <g key={p.day}>
            <title>{`${month}-${String(p.day).padStart(2, "0")}: ${formatKrwCompact(p.sales)}`}</title>
            <circle
              cx={xOf(p.day)}
              cy={yOf(p.sales)}
              r="3"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--card))"
              strokeWidth="1.5"
            />
          </g>
        ))}

        {/* x축 레이블 */}
        {xLabels.map(({ day, x, label }) => (
          <text
            key={day}
            x={x}
            y={H - 4}
            fontSize="9"
            fill="hsl(var(--muted-foreground))"
            textAnchor={day === 1 ? "start" : day === totalDays ? "end" : "middle"}
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}
