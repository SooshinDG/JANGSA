import Dexie, { type Table } from "dexie";
import type { AppSettings, AppMeta, DailyEntry } from "@/types";
import {
  APP_DB_NAME,
  META_KEY,
  SETTINGS_KEY,
} from "@/lib/constants/defaults";

/**
 * Dexie 기반 IndexedDB 래퍼.
 *
 * 테이블 구조
 * - settings : 단일 행. key="app-settings", value=AppSettings
 * - entries  : 일별 매출 엔트리. id 기본 키, date/month 인덱스
 * - meta     : 앱 버전/초기화 정보 등. key="app-meta", value=AppMeta
 *
 * 브라우저 환경에서만 인스턴스를 생성한다.
 * (SSR 중에는 IndexedDB가 없으므로 `getDb()`를 호출하지 말 것)
 */

export type SettingsKey = typeof SETTINGS_KEY;
export type MetaKey = typeof META_KEY;

export interface SettingsRow {
  key: SettingsKey;
  value: AppSettings;
}

export interface MetaRow {
  key: MetaKey;
  value: AppMeta;
}

export class JangsaDB extends Dexie {
  settings!: Table<SettingsRow, string>;
  entries!: Table<DailyEntry, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super(APP_DB_NAME);
    this.version(1).stores({
      // `&` = unique primary key
      settings: "&key",
      // id 기본 키 + date, month 보조 인덱스 (월별 조회 최적화)
      entries: "&id, date, month",
      meta: "&key",
    });
  }
}

let instance: JangsaDB | null = null;

/**
 * Dexie 인스턴스를 lazy-init 방식으로 반환한다.
 * 반드시 브라우저 환경에서만 호출해야 한다.
 */
export function getDb(): JangsaDB {
  if (typeof window === "undefined") {
    throw new Error(
      "getDb()는 브라우저 환경에서만 사용할 수 있습니다. useEffect 내부에서 호출하세요.",
    );
  }
  if (!instance) {
    instance = new JangsaDB();
  }
  return instance;
}
