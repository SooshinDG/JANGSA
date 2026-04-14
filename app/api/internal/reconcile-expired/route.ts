import { NextResponse } from "next/server";

/**
 * GET /api/internal/reconcile-expired — 무료 서비스 전환 후 비활성화 (410 Gone).
 * 구독 만료 처리는 더 이상 필요하지 않음.
 */
export async function GET() {
  return NextResponse.json(
    { error: "이 엔드포인트는 비활성화되었습니다." },
    { status: 410 },
  );
}
