import { redirect } from "next/navigation";

/**
 * 무료 서비스 전환 후 결제/구독 페이지는 대시보드로 리다이렉트.
 */
export default function BillingPage() {
  redirect("/app/dashboard");
}
