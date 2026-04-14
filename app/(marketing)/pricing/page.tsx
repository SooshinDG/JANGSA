import { redirect } from "next/navigation";

/**
 * 무료 서비스 전환 후 요금제 페이지는 홈으로 리다이렉트.
 */
export default function PricingPage() {
  redirect("/");
}
