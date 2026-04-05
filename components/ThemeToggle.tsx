"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun, BookOpen } from "lucide-react";

export type Theme = "light" | "dark" | "sepia";

const THEMES: Theme[] = ["light", "dark", "sepia"];

const THEME_LABELS: Record<Theme, string> = {
  light: "宣紙",
  dark: "墨夜",
  sepia: "古卷",
};

const THEME_ICONS: Record<Theme, React.ElementType> = {
  light: Sun,
  dark: Moon,
  sepia: BookOpen,
};

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("buddha-theme") as Theme | null;
  if (stored && THEMES.includes(stored)) return stored;
  return "light";
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === "light") {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", theme);
  }
  localStorage.setItem("buddha-theme", theme);
}

// Client-only wrapper to avoid hydration mismatch
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const theme = getInitialTheme();
    applyTheme(theme);
  }, []);

  return <>{children}</>;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const idx = THEMES.indexOf(prev);
      const next = THEMES[(idx + 1) % THEMES.length];
      applyTheme(next);
      return next;
    });
  }, []);

  const label =
    theme === "light"
      ? "切換至深色模式"
      : theme === "dark"
        ? "切換至古卷模式"
        : "切換至淺色模式";

  const Icon = THEME_ICONS[theme];

  return (
    <ClientOnly>
      <button
        onClick={toggle}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-ui text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
        aria-label={label}
        title={label}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{THEME_LABELS[theme]}</span>
      </button>
    </ClientOnly>
  );
}
