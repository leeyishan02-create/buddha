"use client";

import {
  Minus,
  Plus,
  Type,
  AlignJustify,
  Sun,
  BookOpen,
  Moon,
  Languages,
  X,
  Settings2,
} from "lucide-react";
import { useReaderContext } from "./ReadingPrefsProvider";
import { useThemeContext } from "@/components/ThemeToggle";
import { useLocale } from "@/lib/locale/useLocale";
import type { Theme } from "@/components/ThemeToggle";
import { useCallback, useState, useRef, useEffect } from "react";

const THEMES: { value: Theme; label: string; Icon: React.ElementType }[] = [
  { value: "light", label: "宣纸", Icon: Sun },
  { value: "sepia", label: "古卷", Icon: BookOpen },
  { value: "dark", label: "墨夜", Icon: Moon },
];

export function ReadingControls() {
  const {
    fontSize,
    fontFamily,
    lineHeight,
    contentWidth,
    isLoaded,
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
  } = useReaderContext();

  const { theme, cycleTheme } = useThemeContext();
  const { locale, toggleLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [fontSizeInput, setFontSizeInput] = useState(
    typeof fontSize === "number" ? String(fontSize) : "18",
  );
  const [lineHeightInput, setLineHeightInput] = useState(
    typeof lineHeight === "number" ? lineHeight.toFixed(1) : "2.0",
  );
  const [fontSizeFocused, setFontSizeFocused] = useState(false);
  const [lineHeightFocused, setLineHeightFocused] = useState(false);
  const fontSizeInputRef = useRef<HTMLInputElement>(null);
  const lineHeightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof fontSize === "number") {
      setFontSizeInput(String(fontSize));
    }
  }, [fontSize]);

  useEffect(() => {
    if (typeof lineHeight === "number") {
      setLineHeightInput(lineHeight.toFixed(1));
    }
  }, [lineHeight]);

  const handleFontSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFontSizeInput(e.target.value);
    },
    [],
  );

  const handleFontSizeBlur = useCallback(() => {
    const parsed = parseInt(fontSizeInput, 10);
    if (!isNaN(parsed)) {
      setFontSize(parsed);
    } else {
      setFontSizeInput(String(fontSize));
    }
  }, [fontSizeInput, fontSize, setFontSize]);

  const handleFontSizeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const parsed = parseInt(fontSizeInput, 10);
        if (!isNaN(parsed)) {
          setFontSize(parsed);
          fontSizeInputRef.current?.blur();
        }
      }
    },
    [fontSizeInput, setFontSize],
  );

  const handleLineHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLineHeightInput(e.target.value);
    },
    [],
  );

  const handleLineHeightBlur = useCallback(() => {
    const parsed = parseFloat(lineHeightInput);
    if (!isNaN(parsed)) {
      setLineHeight(parsed);
    } else {
      setLineHeightInput(lineHeight.toFixed(1));
    }
  }, [lineHeightInput, lineHeight, setLineHeight]);

  const handleLineHeightKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const parsed = parseFloat(lineHeightInput);
        if (!isNaN(parsed)) {
          setLineHeight(parsed);
          lineHeightInputRef.current?.blur();
        }
      }
    },
    [lineHeightInput, setLineHeight],
  );

  if (!isLoaded) return null;

  return (
    <>
      {/* Floating Toggle Button — visible on all breakpoints */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-accent p-3 text-white shadow-lg transition-colors hover:bg-accent-hover active:bg-accent-active focus-visible:outline-2 focus-visible:outline-border-focus"
        aria-label="开启阅读设置"
      >
        <Settings2 className="h-5 w-5" />
      </button>

      {/* Overlay — visible when panel is open */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Panel — bottom sheet on mobile, right drawer on desktop */}
      <aside
        className={`fixed z-50 bg-bg-elevated transition-transform duration-300 ease-out
          /* Mobile: bottom sheet */
          bottom-0 left-0 right-0 rounded-t-2xl border-t border-border
          ${open ? "translate-y-0" : "translate-y-full"}
          /* Desktop: right drawer */
          lg:left-auto lg:top-0 lg:bottom-0 lg:w-80 lg:rounded-none lg:border-l lg:border-t-0 lg:border-border
          ${open ? "lg:translate-x-0" : "lg:translate-x-full"}
        `}
        role="dialog"
        aria-label="阅读设置"
      >
        {/* Close button — visible on all breakpoints */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-sm font-medium font-ui text-text-primary">
            阅读设置
          </span>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Handle bar — mobile only */}
        <div className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-border lg:hidden" />

        {/* Controls content */}
        <div className="space-y-5 overflow-y-auto p-5 pb-8" style={{ maxHeight: "calc(100vh - 5rem)" }}>
          {/* Font Size */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium font-ui text-text-secondary">
              <Type className="h-4 w-4" aria-hidden="true" />
              字级
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={decreaseFontSize}
                className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
                aria-label="缩小字级"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className={`flex items-center rounded-lg border overflow-hidden transition-colors ${
                fontSizeFocused ? "border-border-focus ring-1 ring-border-focus" : "border-border"
              }`}>
                <input
                  ref={fontSizeInputRef}
                  type="text"
                  inputMode="numeric"
                  value={fontSizeInput}
                  onChange={handleFontSizeChange}
                  onBlur={() => {
                    handleFontSizeBlur();
                    setFontSizeFocused(false);
                  }}
                  onFocus={() => setFontSizeFocused(true)}
                  onKeyDown={handleFontSizeKeyDown}
                  className="w-10 rounded-l-lg border-0 bg-transparent py-2 text-center text-sm font-ui text-text-primary tabular-nums focus:outline-none"
                  aria-label="字级数值"
                />
                <span className="flex items-center px-1.5 text-xs font-ui text-text-tertiary select-none">px</span>
              </div>
              <button
                onClick={increaseFontSize}
                className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
                aria-label="放大字级"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium font-ui text-text-secondary">
              字体
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => setFontFamily("serif")}
                className={`rounded-lg border py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
                  fontFamily === "serif"
                    ? "border-border-focus bg-accent-light text-accent font-medium"
                    : "border-border text-text-secondary hover:bg-bg-secondary"
                } font-reading`}
              >
                明体
              </button>
              <button
                onClick={() => setFontFamily("sans")}
                className={`rounded-lg border py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
                  fontFamily === "sans"
                    ? "border-border-focus bg-accent-light text-accent font-medium"
                    : "border-border text-text-secondary hover:bg-bg-secondary"
                } font-ui`}
              >
                黑体
              </button>
              <button
                onClick={() => setFontFamily("kai")}
                className={`rounded-lg border py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
                  fontFamily === "kai"
                    ? "border-border-focus bg-accent-light text-accent font-medium"
                    : "border-border text-text-secondary hover:bg-bg-secondary"
                }`}
                style={{ fontFamily: "var(--font-kai)" }}
              >
                楷体
              </button>
              <button
                onClick={() => setFontFamily("fangsong")}
                className={`rounded-lg border py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
                  fontFamily === "fangsong"
                    ? "border-border-focus bg-accent-light text-accent font-medium"
                    : "border-border text-text-secondary hover:bg-bg-secondary"
                }`}
                style={{ fontFamily: "var(--font-fangsong)" }}
              >
                仿宋
              </button>
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium font-ui text-text-secondary">
              <AlignJustify className="h-4 w-4" aria-hidden="true" />
              行距
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={decreaseLineHeight}
                className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
                aria-label="缩小行距"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                ref={lineHeightInputRef}
                type="text"
                inputMode="decimal"
                value={lineHeightInput}
                onChange={handleLineHeightChange}
                onBlur={handleLineHeightBlur}
                onKeyDown={handleLineHeightKeyDown}
                className="w-16 rounded-lg border border-border bg-bg-elevated py-2 text-center text-sm font-ui text-text-primary tabular-nums focus:outline-none"
                aria-label="行距数值"
              />
              <button
                onClick={increaseLineHeight}
                className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
                aria-label="放大行距"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content Width */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium font-ui text-text-secondary">
              内容宽度
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={decreaseContentWidth}
                className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
                aria-label="缩小内容宽度"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="flex-1 text-center text-sm font-ui text-text-primary">
                {contentWidth === "narrow" ? "窄" : contentWidth === "medium" ? "中" : contentWidth === "wide" ? "宽" : "全宽"}
              </span>
              <button
                onClick={increaseContentWidth}
                className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
                aria-label="放大内容宽度"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="mb-2 block text-sm font-medium font-ui text-text-secondary">
              主题
            </label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {THEMES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    if (theme !== value) {
                      cycleTheme();
                    }
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-ui transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
                    theme === value
                      ? "bg-accent-light text-accent font-medium"
                      : "text-text-secondary hover:bg-bg-secondary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* SC/TC Toggle */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium font-ui text-text-secondary">
              <Languages className="h-4 w-4" aria-hidden="true" />
              简繁
            </label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => { if (locale !== "zh-Hant") toggleLocale(); }}
                className={`flex-1 py-2 text-sm font-ui transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
                  locale === "zh-Hant"
                    ? "bg-accent-light text-accent font-medium"
                    : "text-text-secondary hover:bg-bg-secondary"
                }`}
              >
                繁体
              </button>
              <button
                onClick={() => { if (locale !== "zh-Hans") toggleLocale(); }}
                className={`flex-1 py-2 text-sm font-ui transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
                  locale === "zh-Hans"
                    ? "bg-accent-light text-accent font-medium"
                    : "text-text-secondary hover:bg-bg-secondary"
                }`}
              >
                简体
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
