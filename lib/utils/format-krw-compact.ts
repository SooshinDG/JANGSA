/**
 * 한글 금액 축약 포맷.
 *
 * 사장님이 대시보드 KPI 숫자를 한눈에 읽을 수 있도록
 * 큰 금액을 억/만 단위로 압축한다.
 *
 * 예시:
 *   8_500          → "8500원"
 *   32_000         → "3만 2000원"
 *   1_584_409      → "158만 4409원"
 *   22_262_000     → "2226만 2000원"
 *   30_000_000     → "3000만 원"
 *   130_000_000    → "1억 3000만 원"
 *   100_530_000    → "1억 530만 원"
 *   1_000_000_000  → "10억 원"
 */
export function formatKrwCompact(value: number): string {
  if (!Number.isFinite(value)) return "0원";

  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? "-" : "";

  // 10,000 미만은 그냥 숫자 + 원
  if (abs < 10_000) {
    return `${sign}${abs}원`;
  }

  const eok = Math.floor(abs / 100_000_000);
  const rem1 = abs % 100_000_000;
  const man = Math.floor(rem1 / 10_000);
  const rem2 = rem1 % 10_000;

  const bigParts: string[] = [];
  if (eok > 0) bigParts.push(`${eok}억`);
  if (man > 0) bigParts.push(`${man}만`);

  const prefix = sign + bigParts.join(" ");

  if (rem2 > 0) {
    return `${prefix} ${rem2}원`;
  }
  // 나머지 0 → 단위 뒤에 한 칸 띄고 원
  return `${prefix} 원`;
}
