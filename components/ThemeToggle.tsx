"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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

function readStoredTheme(): Theme {
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

interface ThemeContextValue {
  theme: Theme;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used inside ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // Sync from localStorage after hydration
  useEffect(() => {
    const stored = readStoredTheme();
    applyTheme(stored);
    setTheme(stored);

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        const saved = readStoredTheme();
        applyTheme(saved);
        setTheme(saved);
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      const idx = THEMES.indexOf(prev);
      const next = THEMES[(idx + 1) % THEMES.length];
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const { theme, cycleTheme } = useThemeContext();

  const label =
    theme === "light"
      ? "切換至深色模式"
      : theme === "dark"
        ? "切换至古卷模式"
        : "切換至淺色模式";

  const Icon = THEME_ICONS[theme];

  return (
    <button
      onClick={cycleTheme}
      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-ui text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{THEME_LABELS[theme]}</span>
    </button>
  );
}
