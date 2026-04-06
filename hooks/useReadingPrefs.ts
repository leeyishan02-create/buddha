"use client";

import { useCallback, useEffect, useState } from "react";

export type FontFamily = "reading" | "serif" | "sans";
export type ContentWidth = "narrow" | "medium" | "wide" | "full";

const CONTENT_WIDTHS: ContentWidth[] = ["narrow", "medium", "wide", "full"];

const CONTENT_WIDTH_LABELS: Record<ContentWidth, string> = {
  narrow: "窄",
  medium: "中",
  wide: "宽",
  full: "全宽",
};

const CONTENT_WIDTH_VALUES: Record<ContentWidth, string> = {
  narrow: "max-w-2xl",
  medium: "max-w-3xl",
  wide: "max-w-5xl",
  full: "max-w-7xl",
};

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 40;

const FONT_SIZE_MIGRATION: Record<string, number> = {
  xs: 14,
  sm: 16,
  base: 18,
  lg: 20,
  xl: 24,
  "2xl": 28,
  "3xl": 32,
  "4xl": 34,
};

const MIN_LINE_HEIGHT = 1.0;
const MAX_LINE_HEIGHT = 4.0;
const LINE_HEIGHT_STEP = 0.1;

const LINE_HEIGHT_MIGRATION: Record<string, number> = {
  tight: 1.8,
  normal: 2.0,
  relaxed: 2.2,
  loose: 2.4,
};

const STORAGE_KEY = "reader.prefs";

interface ReadingPrefs {
  fontSize: number;
  fontFamily: FontFamily;
  lineHeight: number;
  contentWidth: ContentWidth;
}

const DEFAULT_PREFS: ReadingPrefs = {
  fontSize: 18,
  fontFamily: "reading",
  lineHeight: 2.0,
  contentWidth: "medium",
};

function loadPrefs(): ReadingPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ReadingPrefs>;
      const migrated: Partial<ReadingPrefs> = { ...parsed };
      // Migrate old enum fontSize values to numbers
      if (typeof parsed.fontSize === "string") {
        migrated.fontSize = FONT_SIZE_MIGRATION[parsed.fontSize] ?? 18;
      }
      // Migrate old enum lineHeight values to numbers
      if (typeof parsed.lineHeight === "string") {
        migrated.lineHeight = LINE_HEIGHT_MIGRATION[parsed.lineHeight] ?? 2.0;
      }
      return { ...DEFAULT_PREFS, ...migrated };
    }
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
}

function savePrefs(prefs: ReadingPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function clampFontSize(value: number): number {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)));
}

function clampLineHeight(value: number): number {
  return Math.min(MAX_LINE_HEIGHT, Math.max(MIN_LINE_HEIGHT, value));
}

function roundLineHeight(value: number): number {
  return Math.round(value * 10) / 10;
}

export function useReadingPrefs() {
  const [prefs, setPrefs] = useState<ReadingPrefs>(DEFAULT_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = loadPrefs();
    setPrefs(stored);
    setIsLoaded(true);
  }, []);

  const updatePrefs = useCallback(
    (updates: Partial<ReadingPrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...updates };
        savePrefs(next);
        return next;
      });
    },
    [],
  );

  const increaseFontSize = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, fontSize: clampFontSize(prev.fontSize + 1) };
      savePrefs(next);
      return next;
    });
  }, []);

  const decreaseFontSize = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, fontSize: clampFontSize(prev.fontSize - 1) };
      savePrefs(next);
      return next;
    });
  }, []);

  const setFontSize = useCallback((value: number) => {
    const clamped = clampFontSize(value);
    setPrefs((prev) => {
      const next = { ...prev, fontSize: clamped };
      savePrefs(next);
      return next;
    });
  }, []);

  const toggleFontFamily = useCallback(() => {
    setPrefs((prev) => {
      const families: FontFamily[] = ["reading", "serif", "sans"];
      const idx = families.indexOf(prev.fontFamily);
      const nextFamily = families[(idx + 1) % families.length];
      const next = { ...prev, fontFamily: nextFamily };
      savePrefs(next);
      return next;
    });
  }, []);

  const setFontFamily = useCallback((family: FontFamily) => {
    setPrefs((prev) => {
      const next = { ...prev, fontFamily: family };
      savePrefs(next);
      return next;
    });
  }, []);

  const increaseLineHeight = useCallback(() => {
    setPrefs((prev) => {
      const next = {
        ...prev,
        lineHeight: clampLineHeight(
          roundLineHeight(prev.lineHeight + LINE_HEIGHT_STEP),
        ),
      };
      savePrefs(next);
      return next;
    });
  }, []);

  const decreaseLineHeight = useCallback(() => {
    setPrefs((prev) => {
      const next = {
        ...prev,
        lineHeight: clampLineHeight(
          roundLineHeight(prev.lineHeight - LINE_HEIGHT_STEP),
        ),
      };
      savePrefs(next);
      return next;
    });
  }, []);

  const setLineHeight = useCallback((value: number) => {
    const clamped = clampLineHeight(roundLineHeight(value));
    setPrefs((prev) => {
      const next = { ...prev, lineHeight: clamped };
      savePrefs(next);
      return next;
    });
  }, []);

  const increaseContentWidth = useCallback(() => {
    setPrefs((prev) => {
      const idx = CONTENT_WIDTHS.indexOf(prev.contentWidth);
      if (idx >= CONTENT_WIDTHS.length - 1) return prev;
      const next = { ...prev, contentWidth: CONTENT_WIDTHS[idx + 1] };
      savePrefs(next);
      return next;
    });
  }, []);

  const decreaseContentWidth = useCallback(() => {
    setPrefs((prev) => {
      const idx = CONTENT_WIDTHS.indexOf(prev.contentWidth);
      if (idx <= 0) return prev;
      const next = { ...prev, contentWidth: CONTENT_WIDTHS[idx - 1] };
      savePrefs(next);
      return next;
    });
  }, []);

  return {
    prefs,
    isLoaded,
    updatePrefs,
    increaseFontSize,
    decreaseFontSize,
    setFontSize,
    toggleFontFamily,
    setFontFamily,
    increaseLineHeight,
    decreaseLineHeight,
    setLineHeight,
    increaseContentWidth,
    decreaseContentWidth,
    contentWidths: CONTENT_WIDTHS,
    contentWidthLabels: CONTENT_WIDTH_LABELS,
    contentWidthValues: CONTENT_WIDTH_VALUES,
    lineHeightRange: { min: MIN_LINE_HEIGHT, max: MAX_LINE_HEIGHT },
    fontSizeRange: { min: MIN_FONT_SIZE, max: MAX_FONT_SIZE },
  };
}
