// ============================================
// Global Locale (Simplified/Traditional) State
// Shared across all pages and components
// ============================================

"use client";

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react";
import type { Locale } from "./convert";
import { convertText, toSimplified, toTraditional } from "./convert";

const STORAGE_KEY = "buddha-locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "zh-Hans";
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored === "zh-Hans" || stored === "zh-Hant") return stored;
  return "zh-Hans";
}

interface LocaleContextValue {
  locale: Locale;
  toggleLocale: () => void;
  convert: (text: string) => string;
  toSimplified: (text: string) => string;
  toTraditional: (text: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  // Sync locale to localStorage and <html> lang attribute
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === "zh-Hant" ? "zh-Hans" : "zh-Hant"));
  }, []);

  const convert = useCallback(
    (text: string) => convertText(text, locale),
    [locale],
  );

  const value: LocaleContextValue = {
    locale,
    toggleLocale,
    convert,
    toSimplified,
    toTraditional,
  };

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
