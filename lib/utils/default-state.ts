import type { AppMeta, AppSettings, ChannelKey, ChannelSettings } from "@/types";
import {
  APP_CURRENCY,
  APP_VERSION,
  DEFAULT_CHANNEL_LABEL,
  DEFAULT_COST_RULES,
  DEFAULT_FEE_RATE,
  DEFAULT_FIXED_COSTS,
  DEFAULT_GOAL,
} from "@/lib/constants/defaults";

/**
 * 기본 AppSettings 생성.
 * Provider 초기화 시 settings가 비어 있으면 이 값이 DB에 주입된다.
 */
export function buildDefaultSettings(): AppSettings {
  const channelKeys: ChannelKey[] = ["baemin", "yogiyo", "coupang", "pos"];
  const channels = channelKeys.reduce<Record<ChannelKey, ChannelSettings>>(
    (acc, key) => {
      acc[key] = {
        label: DEFAULT_CHANNEL_LABEL[key],
        enabled: true,
        feeRate: DEFAULT_FEE_RATE[key],
      };
      return acc;
    },
    {} as Record<ChannelKey, ChannelSettings>,
  );

  return {
    channels,
    costRules: { ...DEFAULT_COST_RULES },
    goalSettings: { ...DEFAULT_GOAL },
    fixedCosts: { ...DEFAULT_FIXED_COSTS },
    currency: APP_CURRENCY,
  };
}

/** 기본 AppMeta 생성 */
export function buildDefaultMeta(): AppMeta {
  const now = Date.now();
  return {
    initializedAt: now,
    updatedAt: now,
    version: APP_VERSION,
  };
}

/**
 * 느슨한 AppSettings 정규화.
 * 새 필드가 추가되었거나 이전 버전 데이터에 일부 키가 빠져 있을 때
 * 기본값으로 메꿔서 런타임 에러를 방지한다.
 */
export function normalizeSettings(
  raw: Partial<AppSettings> | null | undefined,
): AppSettings {
  const defaults = buildDefaultSettings();
  if (!raw) return defaults;

  const channels = { ...defaults.channels };
  if (raw.channels) {
    for (const key of Object.keys(channels) as ChannelKey[]) {
      const incoming = raw.channels[key];
      if (incoming) {
        channels[key] = { ...channels[key], ...incoming };
      }
    }
  }

  return {
    channels,
    costRules: { ...defaults.costRules, ...(raw.costRules ?? {}) },
    goalSettings: { ...defaults.goalSettings, ...(raw.goalSettings ?? {}) },
    fixedCosts: { ...defaults.fixedCosts, ...(raw.fixedCosts ?? {}) },
    currency: raw.currency ?? defaults.currency,
  };
}
