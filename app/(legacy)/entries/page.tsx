"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { MonthPicker } from "@/components/common/month-picker";
import { EntriesEditor } from "@/components/entries/entries-editor";

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatKoreanMonth(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return "";
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

export default function EntriesPage() {
  const [month, setMonth] = useState<string>(() => currentMonthKey());

  return (
    <>
      <PageHeader
        title="매출 입력"
        description={`${formatKoreanMonth(month)} 날짜별 매출을 입력하면 대시보드와 정산 화면에 자동 반영됩니다.`}
        actions={<MonthPicker value={month} onChange={setMonth} />}
      />
      <EntriesEditor month={month} />
    </>
  );
}
