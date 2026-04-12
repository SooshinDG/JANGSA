import Stripe from "stripe";

/**
 * Stripe 서버 전용 인스턴스.
 *
 * ⚠️ STRIPE_SECRET_KEY 는 절대 클라이언트에 노출되면 안 된다.
 *    이 모듈은 route handler / server action 에서만 import 해야 한다.
 */

let instance: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (!instance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY 환경변수가 설정되지 않았습니다. .env.local 또는 Vercel 환경변수를 확인하세요.",
      );
    }
    instance = new Stripe(key);
  }
  return instance;
}

/**
 * 월 구독 Price ID.
 * Stripe Dashboard → Products 에서 생성한 월 29,000원 Price 의 ID.
 */
export function getMonthlyPriceId(): string {
  const id = process.env.STRIPE_PRICE_ID_MONTHLY;
  if (!id) {
    throw new Error(
      "STRIPE_PRICE_ID_MONTHLY 환경변수가 설정되지 않았습니다.",
    );
  }
  return id;
}
