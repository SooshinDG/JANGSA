"use client";

import { PageHeader } from "@/components/common/page-header";
import { SettingsForm } from "@/components/settings/settings-form";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="설정"
        description="채널 수수료·원가·목표·고정비 값을 변경하면 대시보드·정산·매출 입력 화면의 계산에 즉시 반영됩니다."
      />
      <SettingsForm />
    </>
  );
}
