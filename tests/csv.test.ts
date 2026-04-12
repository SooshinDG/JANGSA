import { describe, it, expect } from "vitest";
import {
  buildMonthlySettlementCsv,
  escapeCsvCell,
} from "@/lib/utils/csv";
import { buildDefaultSettings } from "@/lib/utils/default-state";
import type { DailyEntry } from "@/types";

describe("escapeCsvCell", () => {
  it("returns empty string for null / undefined", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("returns number/string as-is for simple values", () => {
    expect(escapeCsvCell(42)).toBe("42");
    expect(escapeCsvCell("hello")).toBe("hello");
  });

  it("wraps in double quotes when value contains comma", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
  });

  it("escapes internal double quotes by doubling them", () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps in double quotes when value contains newline", () => {
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("buildMonthlySettlementCsv", () => {
  const settings = buildDefaultSettings();

  function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
    const base: DailyEntry = {
      id: "2026-04-01",
      date: "2026-04-01",
      month: "2026-04",
      sales: { baemin: 100000, yogiyo: 50000, coupang: 0, pos: 0 },
      refundAmount: 1000,
      dailyAdCost: 500,
      extraVariableCost: 200,
      memo: "",
      createdAt: 0,
      updatedAt: 0,
    };
    return { ...base, ...overrides };
  }

  it("returns empty string when no entries for month", () => {
    expect(buildMonthlySettlementCsv([], settings, "2026-04")).toBe("");
  });

  it("ignores entries from other months", () => {
    const entries = [
      makeEntry({
        id: "2026-05-01",
        date: "2026-05-01",
        month: "2026-05",
      }),
    ];
    expect(buildMonthlySettlementCsv(entries, settings, "2026-04")).toBe("");
  });

  it("builds header + row with exactly 15 columns", () => {
    const entries = [makeEntry({ memo: "test" })];
    const csv = buildMonthlySettlementCsv(entries, settings, "2026-04");
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0].split(",")).toHaveLength(15);
    expect(lines[0]).toContain("날짜");
    expect(lines[0]).toContain("일 순이익");
    expect(lines[0]).toContain("메모");
    expect(lines[1].startsWith("2026-04-01,")).toBe(true);
    expect(lines[1].endsWith(",test")).toBe(true);
  });

  it("sorts rows by date ascending", () => {
    const entries = [
      makeEntry({ id: "2026-04-10", date: "2026-04-10" }),
      makeEntry({ id: "2026-04-01", date: "2026-04-01" }),
      makeEntry({ id: "2026-04-05", date: "2026-04-05" }),
    ];
    const csv = buildMonthlySettlementCsv(entries, settings, "2026-04");
    const lines = csv.split("\r\n");
    expect(lines[1].startsWith("2026-04-01")).toBe(true);
    expect(lines[2].startsWith("2026-04-05")).toBe(true);
    expect(lines[3].startsWith("2026-04-10")).toBe(true);
  });

  it("escapes memo containing commas and quotes", () => {
    const entries = [
      makeEntry({
        memo: 'a,b with "quotes"',
      }),
    ];
    const csv = buildMonthlySettlementCsv(entries, settings, "2026-04");
    const lines = csv.split("\r\n");
    // 메모는 마지막 컬럼이며 escape 되어야 한다
    expect(lines[1]).toContain('"a,b with ""quotes"""');
  });

  it("emits raw numbers (no currency formatting)", () => {
    const entries = [
      makeEntry({
        sales: { baemin: 123456, yogiyo: 0, coupang: 0, pos: 0 },
        refundAmount: 0,
        dailyAdCost: 0,
        extraVariableCost: 0,
        memo: "",
      }),
    ];
    const csv = buildMonthlySettlementCsv(entries, settings, "2026-04");
    expect(csv).toContain("123456");
    // 통화 포맷 금지
    expect(csv).not.toContain("₩");
    expect(csv).not.toContain("123,456");
  });
});
