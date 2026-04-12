/**
 * 매출 채널 정의.
 * 이후 단계에서 채널별 수수료율/정산 로직에 사용된다.
 */

export type ChannelKey = "baemin" | "yogiyo" | "coupang" | "pos";

export interface ChannelMeta {
  id: ChannelKey;
  label: string;
  shortLabel: string;
  accentClass: string;
  description: string;
}

export const CHANNELS: readonly ChannelMeta[] = [
  {
    id: "baemin",
    label: "배달의민족",
    shortLabel: "배민",
    accentClass: "text-[#2ac1bc]",
    description: "배민 앱 매출",
  },
  {
    id: "yogiyo",
    label: "요기요",
    shortLabel: "요기요",
    accentClass: "text-[#fa0050]",
    description: "요기요 앱 매출",
  },
  {
    id: "coupang",
    label: "쿠팡이츠",
    shortLabel: "쿠팡",
    accentClass: "text-[#1f8ce6]",
    description: "쿠팡이츠 앱 매출",
  },
  {
    id: "pos",
    label: "POS (홀/포장)",
    shortLabel: "POS",
    accentClass: "text-slate-700",
    description: "매장 POS 매출",
  },
] as const;

export const CHANNEL_KEYS: readonly ChannelKey[] = CHANNELS.map((c) => c.id);
