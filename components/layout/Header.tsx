"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, Home, Search, Bookmark, Settings, BookOpen } from "lucide-react";
import { useState, useCallback } from "react";
import { MobileMenu } from "./MobileMenu";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/search", label: "搜索", icon: Search },
  { href: "/bookmarks", label: "书签", icon: Bookmark },
  { href: "/reading-history", label: "历史", icon: BookOpen },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuToggle = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <>
      {/* Desktop Header — hidden on mobile */}
      <header
        className="sticky top-0 z-40 hidden border-b border-border bg-bg-elevated/95 backdrop-blur-sm lg:block"
        role="banner"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-reading text-xl font-semibold text-text-primary transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-border-focus rounded-lg px-1"
            aria-label="佛典 — 返回首页"
          >
            <span className="text-2xl">佛典</span>
          </Link>

          {/* Nav Links */}
          <nav aria-label="主要导航" className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-ui font-medium transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
                    isActive
                      ? "bg-accent-light text-accent"
                      : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile Top Bar — visible only on mobile/tablet */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-bg-elevated/95 px-4 py-3 backdrop-blur-sm lg:hidden"
        role="banner"
      >
        {/* Hamburger Menu Button */}
        <button
          onClick={handleMenuToggle}
          className="inline-flex items-center justify-center rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
          aria-label="打开导航菜单"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Logo */}
        <Link
          href="/"
          className="font-reading text-xl font-semibold text-text-primary transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-border-focus rounded-lg px-1"
          aria-label="佛典 — 返回首页"
        >
          佛典
        </Link>

        {/* Spacer to balance layout */}
        <div className="w-9" aria-hidden="true" />
      </header>

      {/* Mobile Slide-in Menu */}
      <MobileMenu isOpen={menuOpen} onClose={handleMenuClose} />
    </>
  );
}
