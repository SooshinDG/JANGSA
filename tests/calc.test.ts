import { describe, it, expect } from "vitest";
import {
  computeDailyMetrics,
  computeMonthlyMetrics,
  computeBepSales,
  computeTargetAchievementRate,
  computeMonthOverMonthGrowthRate,
} from "@/lib/calc";
import { buildDefaultSettings } from "@/lib/utils/default-state";
import type { AppSettings, DailyEntry } from "@/types";

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const base: DailyEntry = {
    id: "2026-04-01",
    date: "2026-04-01",
    month: "2026-04",
    sales: { baemin: 0, yogiyo: 0, coupang: 0, pos: 0 },
    refundAmount: 0,
    dailyAdCost: 0,
    extraVariableCost: 0,
    memo: "",
    createdAt: 0,
    updatedAt: 0,
  };
  return { ...base, ...overrides };
}

function makeSettings(): AppSettings {
  // defaults: baemin 6.8% / yogiyo 12.5% / coupang 9.8% / pos 0%
  // costRules: 35% ingredient, 2% packaging
  // goalSettings: 30,000,000 KRW
  // fixedCosts: rent 2M / labor 2.5M / utilities 300K / marketing 200K / misc 0
  return buildDefaultSettings();
}

describe("computeDailyMetrics", () => {
  const settings = makeSettings();

  it("sums four channels into grossSales", () => {
    const entry = makeEntry({
      sales: { baemin: 100000, yogiyo: 50000, coupang: 80000, pos: 20000 },
    });
    const m = computeDailyMetrics(entry, settings);
    expect(m.grossSales).toBe(250000);
  });

  it("clamps netSales to zero when refund exceeds gross", () => {
    const entry = makeEntry({
      sales: { baemin: 10000, yogiyo: 0, coupang: 0, pos: 0 },
      refundAmount: 50000,
    });
    const m = computeDailyMetrics(entry, settings);
    expect(m.netSales).toBe(0);
    expect(m.grossSales).toBe(10000);
  });

  it("subtracts refund from netSales normally", () => {
    const entry = makeEntry({
      sales: { baemin: 100000, yogiyo: 0, coupang: 0, pos: 0 },
      refundAmount: 20000,
    });
    const m = computeDailyMetrics(entry, settings);
    expect(m.netSales).toBe(80000);
  });

  it("computes channel fees as channelSales * feeRate/100", () => {
    const entry = makeEntry({
      sales: { baemin: 100000, yogiyo: 0, coupang: 0, pos: 0 },
    });
    const m = computeDailyMetrics(entry, settings);
    expect(m.channelFees.baemin).toBeCloseTo(100000 * 0.068);
    expect(m.channelFees.yogiyo).toBe(0);
    expect(m.totalChannelFee).toBeCloseTo(6800);
  });

  it("treats NaN / negative / Infinity inputs as 0 (safe math)", () => {
    const entry = makeEntry({
      sales: {
        baemin: -5000,
        yogiyo: Number.NaN,
        coupang: Number.POSITIVE_INFINITY,
        pos: 0,
      },
      refundAmount: -100,
      dailyAdCost: Number.NaN,
      extraVariableCost: Number.NEGATIVE_INFINITY,
    });
    const m = computeDailyMetrics(entry, settings);
    expect(m.grossSales).toBe(0);
    expect(m.netSales).toBe(0);
    expect(m.totalVariableCost).toBe(0);
    expect(m.operatingProfitBeforeFixed).toBe(0);
  });

  it("includes fees, ingredient, packaging, ad, extra in totalVariableCost", () => {
    const entry = makeEntry({
      sales: { baemin: 100000, yogiyo: 0, coupang: 0, pos: 0 },
      refundAmount: 0,
      dailyAdCost: 1000,
      extraVariableCost: 2000,
    });
    const m = computeDailyMetrics(entry, settings);
    // fee: 100000 * 0.068 = 6800
    // ingredient: 100000 * 0.35 = 35000
    // packaging: 100000 * 0.02 = 2000
    // ad: 1000, extra: 2000  → total 46800
    expect(m.totalVariableCost).toBeCloseTo(46800);
    expect(m.operatingProfitBeforeFixed).toBeCloseTo(53200);
  });

  it("allows operatingProfitBeforeFixed to go negative on heavy loss days", () => {
    const entry = makeEntry({
      sales: { baemin: 10000, yogiyo: 0, coupang: 0, pos: 0 },
      extraVariableCost: 50000,
    });
    const m = computeDailyMetrics(entry, settings);
    expect(m.operatingProfitBeforeFixed).toBeLessThan(0);
  });
});

describe("computeMonthlyMetrics", () => {
  const settings = makeSettings();

  it("returns empty baseline for month without data (but keeps fixed/target)", () => {
    const m = computeMonthlyMetrics([], settings, "2026-04");
    expect(m.totalDaysWithData).toBe(0);
    expect(m.grossSales).toBe(0);
    expect(m.targetSales).toBe(settings.goalSettings.salesTarget);
    expect(m.totalFixedCost).toBeGreaterThan(0);
    expect(m.bestSalesDate).toBeNull();
    expect(m.bepSales).toBeNull();
    expect(m.targetAchievementRate).toBe(0);
  });

  it("filters entries by month and sums gross/net across days", () => {
    const entries = [
      makeEntry({
        id: "2026-04-01",
        date: "2026-04-01",
        month: "2026-04",
        sales: { baemin: 100000, yogiyo: 0, coupang: 0, pos: 0 },
      }),
      makeEntry({
        id: "2026-04-02",
        date: "2026-04-02",
        month: "2026-04",
        sales: { baemin: 50000, yogiyo: 30000, coupang: 0, pos: 0 },
      }),
      // Should be excluded (different month)
      makeEntry({
        id: "2026-05-01",
        date: "2026-05-01",
        month: "2026-05",
        sales: { baemin: 999999, yogiyo: 0, coupang: 0, pos: 0 },
      }),
    ];
    const m = computeMonthlyMetrics(entries, settings, "2026-04");
    expect(m.totalDaysWithData).toBe(2);
    expect(m.grossSales).toBe(180000);
    expect(m.netSales).toBe(180000);
  });

  it("picks best sales day by daily grossSales", () => {
    const entries = [
      makeEntry({
        id: "2026-04-01",
        date: "2026-04-01",
        month: "2026-04",
        sales: { baemin: 100000, yogiyo: 0, coupang: 0, pos: 0 },
      }),
      makeEntry({
        id: "2026-04-02",
        date: "2026-04-02",
        month: "2026-04",
        sales: { baemin: 500000, yogiyo: 0, coupang: 0, pos: 0 },
      }),
      makeEntry({
        id: "2026-04-03",
        date: "2026-04-03",
        month: "2026-04",
        sales: { baemin: 300000, yogiyo: 0, coupang: 0, pos: 0 },
      }),
    ];
    const m = computeMonthlyMetrics(entries, settings, "2026-04");
    expect(m.bestSalesDate).toBe("2026-04-02");
    expect(m.bestSalesAmount).toBe(500000);
  });

  it("computes MoM growth rate against previous month entries", () => {
    const entries = [
      // previous month 1,000,000
      makeEntry({
        id: "2026-03-15",
        date: "2026-03-15",
        month: "2026-03",
        sales: { baemin: 1000000, yogiyo: 0, coupang: 0, pos: 0 },
      }),
      // current month 1,500,000
      makeEntry({
        id: "2026-04-05",
        date: "2026-04-05",
        month: "2026-04",
        sales: { baemin: 1500000, yogiyo: 0, coupang: 0, pos: 0 },
      }),
    ];
    const m = computeMonthlyMetrics(entries, settings, "2026-04");
    // ((1_500_000 - 1_000_000) / 1_000_000) * 100 = 50
    expect(m.monthOverMonthGrowthRate).toBeCloseTo(50);
  });

  it("returns 0 MoM when previous month has no data", () => {
    const entries = [
      makeEntry({
        id: "2026-04-05",
        date: "2026-04-05",
        month: "2026-04",
        sales: { baemin: 500000, yogiyo: 0, coupang: 0, pos: 0 },
      }),
    ];
    const m = computeMonthlyMetrics(entries, settings, "2026-04");
    expect(m.monthOverMonthGrowthRate).toBe(0);
  });

  it("computes target achievement rate as percent", () => {
    const entries = [
      makeEntry({
        id: "2026-04-01",
        date: "2026-04-01",
        month: "2026-04",
        sales: { baemin: 15_000_000, yogiyo: 0, coupang: 0, pos: 0 },
      }),
    ];
    const m = computeMonthlyMetrics(entries, settings, "2026-04");
    // target = 30,000,000, gross = 15,000,000 → 50%
    expect(m.targetAchievementRate).toBe(50);
  });

  it("computes channelSalesShare as ratios that sum to ~1", () => {
    const entries = [
      makeEntry({
        id: "2026-04-01",
        date: "2026-04-01",
        month: "2026-04",
        sales: { baemin: 200000, yogiyo: 100000, coupang: 100000, pos: 100000 },
      }),
    ];
    const m = computeMonthlyMetrics(entries, settings, "2026-04");
    expect(m.channelSalesShare.baemin).toBeCloseTo(0.4);
    expect(
      m.channelSalesShare.baemin +
        m.channelSalesShare.yogiyo +
        m.channelSalesShare.coupang +
        m.channelSalesShare.pos,
    ).toBeCloseTo(1);
  });
});

describe("computeBepSales", () => {
  it("returns null when net sales is 0 or less", () => {
    expect(computeBepSales(0, 0, 1_000_000)).toBeNull();
    expect(computeBepSales(-100, 0, 1_000_000)).toBeNull();
  });

  it("returns null when contribution margin rate is 0 or negative", () => {
    // variable cost >= net sales → CM <= 0
    expect(computeBepSales(100_000, 100_000, 50_000)).toBeNull();
    expect(computeBepSales(100_000, 120_000, 50_000)).toBeNull();
  });

  it("returns fixedCost / CM rate when CM is positive", () => {
    // netSales=100, varCost=60 → CM=40, CMR=0.4
    // fixedCost=200 → BEP = 200 / 0.4 = 500
    expect(computeBepSales(100, 60, 200)).toBe(500);
  });
});

describe("computeTargetAchievementRate", () => {
  it("returns 0 when target is 0 or negative", () => {
    expect(computeTargetAchievementRate(1000, 0)).toBe(0);
    expect(computeTargetAchievementRate(1000, -100)).toBe(0);
  });

  it("returns gross / target * 100", () => {
    expect(computeTargetAchievementRate(1500, 3000)).toBe(50);
    expect(computeTargetAchievementRate(3000, 3000)).toBe(100);
    expect(computeTargetAchievementRate(4500, 3000)).toBe(150);
  });
});

describe("computeMonthOverMonthGrowthRate", () => {
  it("returns 0 when previous is 0 or negative", () => {
    expect(computeMonthOverMonthGrowthRate(1000, 0)).toBe(0);
    expect(computeMonthOverMonthGrowthRate(1000, -100)).toBe(0);
  });

  it("computes positive growth", () => {
    expect(computeMonthOverMonthGrowthRate(150, 100)).toBe(50);
  });

  it("computes negative growth", () => {
    expect(computeMonthOverMonthGrowthRate(50, 100)).toBe(-50);
  });
});
