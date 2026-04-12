import type { DailyEntry } from "@/types";
import { daysInMonth, type YearMonth } from "@/lib/utils/date";

/**
 * 개발용 샘플 데이터 생성 유틸.
 * 실제 계산 테스트를 위해 한 달치 중 약 2/3 날짜에
 * 그럴듯한 매출 범위의 일별 엔트리를 만든다.
 *
 * 재현 가능성을 위해 month 문자열을 시드로 쓰는 PRNG(mulberry32)를 사용.
 */

const MONTH_REGEX = /^\d{4}-\d{2}$/;

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function assertMonth(month: string): asserts month is string {
  if (!MONTH_REGEX.test(month)) {
    throw new Error(`month는 YYYY-MM 형식이어야 합니다: ${month}`);
  }
}

/**
 * 한 달치 샘플 일별 엔트리를 생성한다.
 * - 같은 month 문자열을 넘기면 항상 같은 결과가 나온다.
 * - 하루 단위 총 매출이 대략 60만 ~ 130만원대에 분포하도록 설계.
 */
export function createSampleEntries(month: string): DailyEntry[] {
  assertMonth(month);
  const total = daysInMonth(month as YearMonth);
  const rng = mulberry32(hashSeed(month));
  const now = Date.now();
  const entries: DailyEntry[] = [];

  for (let day = 1; day <= total; day++) {
    // 약 67% 확률로 해당 날짜 기록
    if (rng() < 0.33) continue;

    const dd = String(day).padStart(2, "0");
    const date = `${month}-${dd}`;

    const baemin = roundTo(250_000 + rng() * 450_000, 1_000);
    const yogiyo = roundTo(80_000 + rng() * 220_000, 1_000);
    const coupang = roundTo(120_000 + rng() * 260_000, 1_000);
    const pos = roundTo(100_000 + rng() * 300_000, 1_000);

    const refundAmount = rng() < 0.15 ? roundTo(rng() * 30_000, 500) : 0;
    const dailyAdCost = rng() < 0.5 ? roundTo(rng() * 20_000, 500) : 0;
    const extraVariableCost = rng() < 0.2 ? roundTo(rng() * 15_000, 500) : 0;

    entries.push({
      id: `sample-${date}`,
      date,
      month,
      sales: { baemin, yogiyo, coupang, pos },
      refundAmount,
      dailyAdCost,
      extraVariableCost,
      memo: rng() < 0.1 ? "샘플 데이터" : undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  return entries;
}

/**
 * 숫자 필드/날짜 필드가 정상인지 최소한으로 검증.
 * 저장 전에 한 번 통과시켜 NaN/잘못된 날짜 저장을 막는다.
 */
export function sanitizeEntry(entry: DailyEntry): DailyEntry {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    throw new Error(`date는 YYYY-MM-DD 형식이어야 합니다: ${entry.date}`);
  }
  const month = entry.date.slice(0, 7);
  if (entry.month && entry.month !== month) {
    throw new Error(
      `month(${entry.month})와 date(${entry.date})가 일치하지 않습니다.`,
    );
  }
  const safeNum = (n: number): number =>
    Number.isFinite(n) && !Number.isNaN(n) ? n : 0;

  return {
    ...entry,
    month,
    sales: {
      baemin: safeNum(entry.sales.baemin),
      yogiyo: safeNum(entry.sales.yogiyo),
      coupang: safeNum(entry.sales.coupang),
      pos: safeNum(entry.sales.pos),
    },
    refundAmount: safeNum(entry.refundAmount),
    dailyAdCost: safeNum(entry.dailyAdCost),
    extraVariableCost: safeNum(entry.extraVariableCost),
  };
}
