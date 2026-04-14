"use client";

/**
 * 순수 SVG 도넛 차트.
 * stroke-dasharray / stroke-dashoffset 기법으로 외부 의존성 없이 구현.
 *
 * 원리:
 *   - circle.circumference = 2πr
 *   - 각 세그먼트의 dasharray = [segLen, C - segLen]
 *   - dashoffset  = C - accumulated * C  (이전 세그먼트 끝에서 시작)
 *   - transform="rotate(-90 cx cy)"로 12시 방향에서 시작
 */

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  /** 도넛 바깥 지름 (px) */
  size?: number;
  /** 도넛 두께 (px) */
  thickness?: number;
  /** 중앙 레이블 */
  centerLabel?: string;
  /** 중앙 부레이블 */
  centerSubLabel?: string;
}

/** 인접 세그먼트 사이 시각적 간격 (px) */
const GAP_PX = 2.5;

export function DonutChart({
  segments,
  size = 140,
  thickness = 22,
  centerLabel,
  centerSubLabel,
}: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  /* 값이 있는 세그먼트만 렌더링 */
  const visible = segments.filter((s) => s.value > 0);

  const r = size / 2 - thickness / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;

  let accumulated = 0;
  const rendered = visible.map((seg) => {
    const pct = seg.value / total;
    /* 시각적 간격을 위해 세그먼트 길이를 살짝 줄임 */
    const dashLen = Math.max(0, pct * C - (visible.length > 1 ? GAP_PX : 0));
    const dashOffset = C - accumulated * C;
    accumulated += pct;
    return { ...seg, pct, dashLen, dashOffset };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="채널별 매출 비중 도넛 차트"
      role="img"
    >
      {/* 배경 원 */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="hsl(var(--secondary))"
        strokeWidth={thickness}
      />

      {/* 세그먼트 */}
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {rendered.map((seg) => (
          <circle
            key={seg.id}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={`${seg.dashLen} ${C - seg.dashLen}`}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="butt"
          />
        ))}
      </g>

      {/* 중앙 텍스트 */}
      {centerLabel ? (
        <>
          <text
            x={cx}
            y={cy - (centerSubLabel ? 6 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="13"
            fontWeight="700"
            fill="hsl(var(--foreground))"
          >
            {centerLabel}
          </text>
          {centerSubLabel ? (
            <text
              x={cx}
              y={cy + 13}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fill="hsl(var(--muted-foreground))"
            >
              {centerSubLabel}
            </text>
          ) : null}
        </>
      ) : null}
    </svg>
  );
}
