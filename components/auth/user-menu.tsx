import { LogOut } from "lucide-react";

interface UserMenuProps {
  email: string | null;
  storeName: string | null;
}

/**
 * 앱 영역 상단에 노출되는 최소 사용자 메뉴.
 * - 매장명 / 이메일 표시
 * - 로그아웃 (route handler 로 POST)
 *
 * 디자인을 무겁게 만들지 않기 위해 드롭다운 없이 한 줄 인라인 구성.
 */
export function UserMenu({ email, storeName }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-1.5 text-[11px] shadow-sm">
      <div className="flex flex-col leading-tight">
        <span className="font-semibold text-foreground">
          {storeName ?? "내 매장"}
        </span>
        <span className="text-muted-foreground">{email ?? "–"}</span>
      </div>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-white px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut aria-hidden="true" className="h-3 w-3" />
          로그아웃
        </button>
      </form>
    </div>
  );
}
