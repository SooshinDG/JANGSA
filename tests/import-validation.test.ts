import { describe, it, expect } from "vitest";
import {
  BackupImportError,
  parseBackupJson,
} from "@/lib/utils/import-validation";
import { buildDefaultSettings } from "@/lib/utils/default-state";
import { buildBackupPayload } from "@/lib/utils/backup";
import type { DailyEntry } from "@/types";

function validBackupJson(): string {
  const settings = buildDefaultSettings();
  const entries: DailyEntry[] = [
    {
      id: "2026-04-01",
      date: "2026-04-01",
      month: "2026-04",
      sales: { baemin: 100000, yogiyo: 50000, coupang: 20000, pos: 10000 },
      refundAmount: 0,
      dailyAdCost: 1000,
      extraVariableCost: 500,
      memo: "test",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    },
  ];
  return JSON.stringify(buildBackupPayload(settings, entries));
}

describe("parseBackupJson", () => {
  it("parses a valid backup file", () => {
    const result = parseBackupJson(validBackupJson());
    expect(result.settings.channels.baemin.feeRate).toBe(6.8);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].id).toBe("2026-04-01");
    expect(result.entries[0].sales.baemin).toBe(100000);
    expect(result.droppedEntryCount).toBe(0);
  });

  it("throws BackupImportError on invalid JSON", () => {
    expect(() => parseBackupJson("not json at all {{{")).toThrow(
      BackupImportError,
    );
  });

  it("throws when top-level is not an object", () => {
    expect(() => parseBackupJson("[1,2,3]")).toThrow(BackupImportError);
  });

  it("throws when settings is missing", () => {
    const json = JSON.stringify({ version: 1, entries: [] });
    expect(() => parseBackupJson(json)).toThrow(BackupImportError);
  });

  it("drops invalid entries and reports droppedEntryCount", () => {
    const json = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: buildDefaultSettings(),
      entries: [
        {
          id: "good",
          date: "2026-04-01",
          sales: { baemin: 1000, yogiyo: 0, coupang: 0, pos: 0 },
        },
        { id: "bad-no-date" }, // 날짜 없음
        { date: "2026-04-02" }, // id 없음
        { id: "bad-date", date: "not-a-date" }, // 잘못된 날짜
        { id: "good2", date: "2026-04-03" },
      ],
    });
    const result = parseBackupJson(json);
    expect(result.entries).toHaveLength(2);
    expect(result.droppedEntryCount).toBe(3);
    expect(result.entries.map((e) => e.id)).toEqual(["good", "good2"]);
  });

  it("fills defaults for partial settings", () => {
    const json = JSON.stringify({
      version: 1,
      settings: {
        costRules: { ingredientCostRate: 40, packagingCostRate: 3 },
      },
      entries: [],
    });
    const result = parseBackupJson(json);
    expect(result.settings.costRules.ingredientCostRate).toBe(40);
    expect(result.settings.costRules.packagingCostRate).toBe(3);
    // channels 는 기본값으로 채워져야 함
    expect(result.settings.channels.baemin.feeRate).toBe(6.8);
  });

  it("deduplicates entries with the same id (later wins)", () => {
    const json = JSON.stringify({
      version: 1,
      settings: buildDefaultSettings(),
      entries: [
        {
          id: "2026-04-01",
          date: "2026-04-01",
          sales: { baemin: 100, yogiyo: 0, coupang: 0, pos: 0 },
        },
        {
          id: "2026-04-01",
          date: "2026-04-01",
          sales: { baemin: 999, yogiyo: 0, coupang: 0, pos: 0 },
        },
      ],
    });
    const result = parseBackupJson(json);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].sales.baemin).toBe(999);
  });

  it("accepts backup with empty entries array (settings-only restore)", () => {
    const json = JSON.stringify({
      version: 1,
      settings: buildDefaultSettings(),
      entries: [],
    });
    const result = parseBackupJson(json);
    expect(result.entries).toHaveLength(0);
    expect(result.droppedEntryCount).toBe(0);
  });
});
