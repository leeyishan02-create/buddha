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

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/leeyishan02-create/buddha"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
              aria-label="在 GitHub 上查看项目"
              title="在 GitHub 上查看"
            >
              <svg className="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            <ThemeToggle />
          </div>
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

        {/* GitHub link */}
        <a
          href="https://github.com/leeyishan02-create/buddha"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
          aria-label="在 GitHub 上查看项目"
        >
          <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
      </header>

      {/* Mobile Slide-in Menu */}
      <MobileMenu isOpen={menuOpen} onClose={handleMenuClose} />
    </>
  );
}
