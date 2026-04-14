import { NextResponse } from "next/server";

/**
 * POST /api/billing/portal — 무료 서비스 전환 후 비활성화 (410 Gone).
 */
export async function POST() {
  return NextResponse.json(
    { error: "결제 관리 기능이 비활성화되었습니다." },
    { status: 410 },
  );
}
