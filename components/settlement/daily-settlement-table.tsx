import type { DailyComputedMetrics } from "@/types";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"] as const;

function formatShortDate(dateStr: string): string {
  // "YYYY-MM-DD" → "M/D(요일)"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = WEEKDAY_KR[new Date(y, m - 1, d).getDay()];
  return `${m}/${d}(${dow})`;
}

export interface DailySettlementTableProps {
  rows: DailyComputedMetrics[];
}

/**
 * 월별 정산 화면에서 사용하는 일별 정산표.
 * 원본 entries 가 아니라 `computeDailyMetricsList(...)` 결과를 그대로 받는다.
 */
export function DailySettlementTable({ rows }: DailySettlementTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-secondary/30 px-4 py-8 text-center text-xs text-muted-foreground">
        선택한 월에 입력된 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="bg-secondary/60 text-left text-xs font-medium text-muted-foreground">
            <Th className="sticky left-0 z-10 rounded-l-md bg-secondary/60">
              날짜
            </Th>
            <Th align="right">총매출</Th>
            <Th align="right">순매출</Th>
            <Th align="right">총수수료</Th>
            <Th align="right">원가</Th>
            <Th align="right">포장비</Th>
            <Th align="right">광고비</Th>
            <Th align="right">기타변동비</Th>
            <Th align="right" className="rounded-r-md">
              일 순이익
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const profit = row.operatingProfitBeforeFixed;
            return (
              <tr
                key={row.date}
                className="border-b border-border last:border-0"
              >
                <Td className="sticky left-0 z-10 bg-card font-medium text-foreground">
                  {formatShortDate(row.date)}
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatKRW(row.grossSales)}
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatKRW(row.netSales)}
                </Td>
                <Td align="right" className="tabular-nums text-muted-foreground">
                  {formatKRW(row.totalChannelFee)}
                </Td>
                <Td align="right" className="tabular-nums text-muted-foreground">
                  {formatKRW(row.ingredientCost)}
                </Td>
                <Td align="right" className="tabular-nums text-muted-foreground">
                  {formatKRW(row.packagingCost)}
                </Td>
                <Td align="right" className="tabular-nums text-muted-foreground">
                  {formatKRW(row.dailyAdCost)}
                </Td>
                <Td align="right" className="tabular-nums text-muted-foreground">
                  {formatKRW(row.extraVariableCost)}
                </Td>
                <Td
                  align="right"
                  className={cn(
                    "font-semibold tabular-nums",
                    profit >= 0 ? "text-emerald-600" : "text-destructive",
                  )}
                >
                  {formatKRW(profit)}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap border-t border-border px-3 py-2 text-foreground",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}
