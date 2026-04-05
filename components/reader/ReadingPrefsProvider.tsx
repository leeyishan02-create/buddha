"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  useReadingPrefs,
  type FontFamily,
  type ContentWidth,
} from "@/hooks/useReadingPrefs";

interface ReaderContextValue {
  fontSize: number;
  fontFamily: FontFamily;
  lineHeight: number;
  contentWidth: ContentWidth;
  isLoaded: boolean;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  setFontSize: (value: number) => void;
  toggleFontFamily: () => void;
  setFontFamily: (family: FontFamily) => void;
  increaseLineHeight: () => void;
  decreaseLineHeight: () => void;
  setLineHeight: (value: number) => void;
  increaseContentWidth: () => void;
  decreaseContentWidth: () => void;
}

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function useReaderContext(): ReaderContextValue {
  const ctx = useContext(ReaderContext);
  if (!ctx)
    throw new Error("useReaderContext must be used inside ReadingPrefsProvider");
  return ctx;
}

export function ReadingPrefsProvider({ children }: { children: ReactNode }) {
  const prefs = useReadingPrefs();

  const value: ReaderContextValue = {
    fontSize: prefs.prefs.fontSize,
    fontFamily: prefs.prefs.fontFamily,
    lineHeight: prefs.prefs.lineHeight,
    contentWidth: prefs.prefs.contentWidth,
    isLoaded: prefs.isLoaded,
    increaseFontSize: prefs.increaseFontSize,
    decreaseFontSize: prefs.decreaseFontSize,
    setFontSize: prefs.setFontSize,
    toggleFontFamily: prefs.toggleFontFamily,
    setFontFamily: prefs.setFontFamily,
    increaseLineHeight: prefs.increaseLineHeight,
    decreaseLineHeight: prefs.decreaseLineHeight,
    setLineHeight: prefs.setLineHeight,
    increaseContentWidth: prefs.increaseContentWidth,
    decreaseContentWidth: prefs.decreaseContentWidth,
  };

  return (
    <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>
  );
}
