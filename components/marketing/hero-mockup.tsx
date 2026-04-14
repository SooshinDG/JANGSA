/**
 * HeroMockup — 히어로 섹션 우측 장식용 대시보드 패널.
 *
 * 순수 장식 컴포넌트:
 * - pointer-events-none / aria-hidden / select-none
 * - 실제 데이터 없이 정적 fake 값으로 구성
 * - 서비스가 "매출·순이익·수수료 관리 SaaS"임을 첫인상에서 전달
 */

/* ─────────────────────────────────────────────
   미니 라인 차트 SVG (19일치 가짜 데이터)
───────────────────────────────────────────── */

const CHART_W = 306;
const CHART_H = 48;

// y = (1 - normalizedSales) * CHART_H  → high sales = low y (upper part)
const CHART_POINTS =
  "0,7.2 17,14.4 34,4.8 51,19.2 68,12.0 85,21.6 102,9.6 119,16.8 136,5.8 153,13.4 170,10.6 187,15.4 204,8.6 221,11.5 238,10.1 255,13.0 272,11.0 289,12.0 306,9.6";

const AREA_PATH =
  `M 0,${CHART_H} L ` +
  CHART_POINTS.replace(/ /g, " L ") +
  ` L ${CHART_W},${CHART_H} Z`;

function MiniLineChart() {
  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      style={{ height: CHART_H }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="heroAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#378ADD" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#378ADD" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={AREA_PATH} fill="url(#heroAreaGrad)" />
      <polyline
        points={CHART_POINTS}
        fill="none"
        stroke="#378ADD"
        strokeWidth="1.8"
        strokeOpacity="0.70"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────── */

export function HeroMockup() {
  return (
    <div
      className="pointer-events-none select-none"
      aria-hidden="true"
      role="presentation"
      style={{ width: 400 }}
    >
      {/* ── BEP 달성 배지 (우상단 절대 부유) ── */}
      <div className="relative">
        <div
          className="absolute right-0 top-0 z-20 rounded-xl border border-green-100 bg-green-50/90 px-3 py-2.5 shadow-md shadow-black/5"
          style={{ width: 150, backdropFilter: "blur(4px)" }}
        >
          <div className="flex items-center gap-1.5">
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-green-500/75">
              <svg viewBox="0 0 8 8" className="h-2 w-2" fill="none" aria-hidden="true">
                <path
                  d="M1.5 4l1.5 1.5 3.5-3.5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-[9px] font-semibold text-green-700/85">손익분기점 달성</span>
          </div>
          <p className="mt-1 text-[17px] font-bold tabular-nums text-green-700/80">+1,320만원</p>
          <p className="text-[7.5px] text-green-600/55">BEP 대비 여유</p>
        </div>

        {/* ── 메인 대시보드 패널 ── */}
        <div
          className="relative z-10 mr-4 mt-9 rounded-2xl border border-border/50 bg-white/90 shadow-xl shadow-black/5"
          style={{ backdropFilter: "blur(2px)" }}
        >
          {/* 패널 헤더 */}
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/70 text-[7.5px] font-bold text-white">
                장
              </span>
              <span className="text-[10px] font-semibold text-foreground/60">
                대시보드 · 2026년 4월
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-40">
              <div className="h-[3px] w-8 rounded-full bg-border" />
              <div className="h-[3px] w-5 rounded-full bg-border" />
            </div>
          </div>

          <div className="space-y-3 px-4 py-3">
            {/* KPI 3개 */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "총매출", value: "2,226만", sub: "▲ +39.9%", subCls: "text-emerald-600/70" },
                { label: "순이익", value: "726만", sub: "흑자", subCls: "text-emerald-600/70" },
                { label: "수수료", value: "158만", sub: "7.1%", subCls: "text-muted-foreground/50" },
              ].map(({ label, value, sub, subCls }) => (
                <div key={label} className="rounded-lg bg-secondary/50 px-2.5 py-2">
                  <p className="mb-1 text-[8px] font-medium text-muted-foreground/55">{label}</p>
                  <p className="text-[13px] font-bold tabular-nums text-foreground/70">{value}</p>
                  <p className={`mt-0.5 text-[8px] font-medium ${subCls}`}>{sub}</p>
                </div>
              ))}
            </div>

            {/* 목표 달성률 프로그레스 */}
            <div className="rounded-lg bg-secondary/40 px-3 py-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[8.5px] text-muted-foreground/55">목표 달성률</span>
                <span className="text-[11px] font-bold tabular-nums text-primary/65">74.2%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-border/50">
                <div
                  className="h-full rounded-full bg-primary/55"
                  style={{ width: "74.2%" }}
                />
              </div>
              <p className="mt-1 text-[7.5px] text-muted-foreground/45">
                잔여 773만 · 목표 3,000만원
              </p>
            </div>

            {/* 미니 라인 차트 */}
            <div>
              <p className="mb-1.5 text-[8.5px] font-medium text-muted-foreground/50">
                일별 매출 추이
              </p>
              <MiniLineChart />
            </div>
          </div>
        </div>

        {/* ── 하단 부유 카드 행 ── */}
        <div className="relative z-20 -mt-2.5 flex gap-2.5 px-1">

          {/* 채널별 비중 카드 */}
          <div
            className="flex-1 rounded-xl border border-border/40 bg-white/85 px-3 py-2.5 shadow-lg shadow-black/5"
            style={{ backdropFilter: "blur(4px)" }}
          >
            <p className="mb-2 text-[9px] font-semibold text-foreground/60">채널별 비중</p>
            <div className="space-y-1.5">
              {[
                { label: "배달의민족", pct: 39, color: "#378ADD" },
                { label: "쿠팡이츠",   pct: 24, color: "#1D9E75" },
                { label: "POS/포장",   pct: 20, color: "#7F77DD" },
                { label: "요기요",     pct: 17, color: "#D85A30" },
              ].map(({ label, pct, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color, opacity: 0.75 }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[7.5px] text-muted-foreground/60">
                    {label}
                  </span>
                  <div className="h-[3px] w-10 shrink-0 overflow-hidden rounded-full bg-border/40">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.60 }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[7.5px] font-semibold tabular-nums text-foreground/50">
                    {pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 인사이트 미니 카드 */}
          <div
            className="w-36 shrink-0 rounded-xl border border-border/40 bg-white/80 px-3 py-2.5 shadow-md shadow-black/5"
            style={{ backdropFilter: "blur(4px)" }}
          >
            <p className="mb-2 text-[9px] font-semibold text-foreground/60">이달 인사이트</p>
            <ul className="space-y-1.5">
              {[
                { dot: "bg-green-400/80",           text: "전월 대비 +39.9%" },
                { dot: "bg-blue-400/60",             text: "1위 채널 배달의민족" },
                { dot: "bg-muted-foreground/25",     text: "평균 일매출 117만원" },
              ].map(({ dot, text }) => (
                <li key={text} className="flex items-center gap-1.5">
                  <span className={`h-1 w-1 shrink-0 rounded-full ${dot}`} />
                  <span className="text-[7.5px] text-muted-foreground/55">{text}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
