"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Bookmark, Settings, BookOpen } from "lucide-react";

const tabItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/search", label: "搜索", icon: Search },
  { href: "/bookmarks", label: "书签", icon: Bookmark },
  { href: "/reading-history", label: "记录", icon: BookOpen },
  { href: "/settings", label: "设置", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg-elevated/95 backdrop-blur-sm lg:hidden"
      role="navigation"
      aria-label="移动设备导航"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
        {tabItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs font-ui font-medium transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
                isActive
                  ? "text-accent"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
            >
              <Icon
                className="h-5 w-5"
                aria-hidden="true"
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" aria-hidden="true" />
    </nav>
  );
}
