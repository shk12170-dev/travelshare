"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isActive } from "./navItems";
import { signOut } from "@/app/(auth)/actions";

export default function Header({ user, unreadNotifications = 0 }) {
  const pathname = usePathname();
  const loginHref = pathname === "/" || pathname === "/login" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Travel<span className="text-brand">Share</span>
        </Link>
        {/* 데스크톱 메뉴. 모바일은 하단 탭(BottomNav)을 사용 */}
        <nav aria-label="주요 메뉴" className="hidden flex-1 justify-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive(pathname, item.href)
                  ? "bg-brand-soft text-brand"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="검색"
            className={`flex h-8 w-8 items-center justify-center rounded-full text-base hover:bg-brand-soft ${
              pathname === "/search" ? "bg-brand-soft" : ""
            }`}
          >
            <span aria-hidden>🔍</span>
          </Link>
          {user ? (
            <div className="flex items-center gap-2 text-sm">
              <Link
                href="/notifications"
                aria-label={unreadNotifications > 0 ? `알림, 새 알림 ${unreadNotifications}개` : "알림"}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-base hover:bg-brand-soft"
              >
                <span aria-hidden>🔔</span>
                {unreadNotifications > 0 && (
                  <span aria-hidden className="absolute right-0 top-0 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-bold leading-4 text-white dark:text-slate-900">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
              <Link href="/profile" className="hidden max-w-28 truncate font-medium sm:block">
                {user.nickname}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-foreground"
                >
                  로그아웃
                </button>
              </form>
            </div>
          ) : (
            <Link
              href={loginHref}
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white dark:text-slate-900"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
