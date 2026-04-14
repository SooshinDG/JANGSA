import { describe, it, expect } from "vitest";
import { formatKrwCompact } from "@/lib/utils/format-krw-compact";

describe("formatKrwCompact", () => {
  it("10,000 미만은 숫자 그대로", () => {
    expect(formatKrwCompact(0)).toBe("0원");
    expect(formatKrwCompact(500)).toBe("500원");
    expect(formatKrwCompact(8_500)).toBe("8500원");
    expect(formatKrwCompact(9_999)).toBe("9999원");
  });

  it("만 단위 + 나머지", () => {
    expect(formatKrwCompact(10_000)).toBe("1만 원");
    expect(formatKrwCompact(32_000)).toBe("3만 2000원");
    expect(formatKrwCompact(1_584_409)).toBe("158만 4409원");
    expect(formatKrwCompact(22_262_000)).toBe("2226만 2000원");
    expect(formatKrwCompact(30_000_000)).toBe("3000만 원");
  });

  it("억 단위", () => {
    expect(formatKrwCompact(100_000_000)).toBe("1억 원");
    expect(formatKrwCompact(130_000_000)).toBe("1억 3000만 원");
    expect(formatKrwCompact(100_530_000)).toBe("1억 53만 원"); // 530,000 = 53만
    expect(formatKrwCompact(1_000_000_000)).toBe("10억 원");
    expect(formatKrwCompact(1_234_567_890)).toBe("12억 3456만 7890원");
  });

  it("음수 처리", () => {
    expect(formatKrwCompact(-32_000)).toBe("-3만 2000원");
    expect(formatKrwCompact(-100_000_000)).toBe("-1억 원");
  });

  it("소수점 반올림", () => {
    expect(formatKrwCompact(32_000.7)).toBe("3만 2001원");
    expect(formatKrwCompact(9_999.4)).toBe("9999원");
  });

  it("비정상 입력", () => {
    expect(formatKrwCompact(NaN)).toBe("0원");
    expect(formatKrwCompact(Infinity)).toBe("0원");
    expect(formatKrwCompact(-Infinity)).toBe("0원");
  });
});
