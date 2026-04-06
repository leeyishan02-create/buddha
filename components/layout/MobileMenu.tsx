"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Home, Search, Bookmark, Settings, BookOpen } from "lucide-react";

const menuItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/search", label: "搜索", icon: Search },
  { href: "/bookmarks", label: "书签", icon: Bookmark },
  { href: "/reading-history", label: "历史", icon: BookOpen },
  { href: "/settings", label: "设置", icon: Settings },
];

export function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 transition-opacity lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Panel */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="导航菜单"
        className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-bg-elevated shadow-xl transition-transform lg:hidden"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="font-reading text-xl font-semibold text-text-primary">
              观心
            </span>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
              aria-label="关闭菜单"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="移动设备菜单">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-ui font-medium transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
                        isActive
                          ? "bg-accent-light text-accent"
                          : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-border px-5 py-4 text-center text-xs text-text-tertiary font-ui">
            观心 v1.0
          </div>
        </div>
      </div>
    </>
  );
}
