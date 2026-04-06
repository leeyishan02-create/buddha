"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { useReadingPrefs } from "@/hooks/useReadingPrefs";
import { useThemeContext } from "@/components/ThemeToggle";
import { clearAllBookmarks, getBookmarkCount } from "@/lib/db/bookmarks";
import {
  BookOpen,
  Trash2,
  RotateCcw,
  Info,
  Sun,
  Book,
  Moon,
  Settings2,
  Loader2,
} from "lucide-react";

const FONT_FAMILY_LABELS: Record<string, string> = {
  serif: "明体",
  sans: "黑体",
  kai: "楷体",
  fangsong: "仿宋",
};

const CONTENT_WIDTH_LABELS: Record<string, string> = {
  narrow: "窄",
  medium: "中",
  wide: "宽",
  full: "全宽",
};

export default function SettingsPage() {
  const { prefs, isLoaded } = useReadingPrefs();
  const { theme, cycleTheme } = useThemeContext();
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearBookmarks = useCallback(async () => {
    setIsClearing(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    clearAllBookmarks();
    setShowConfirm(null);
    setIsClearing(false);
  }, []);

  const handleClearReadingHistory = useCallback(() => {
    localStorage.removeItem("reader.recently_read");
  }, []);

  const handleResetPrefs = useCallback(() => {
    localStorage.removeItem("reader.prefs");
    window.location.reload();
  }, []);

  const handleClearAllData = useCallback(() => {
    localStorage.clear();
    window.location.reload();
  }, []);

  const bookmarkCount = getBookmarkCount();

  if (!isLoaded) {
    return (
      <main className="flex-1" role="main">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex flex-col items-center justify-center py-24 text-text-tertiary">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-sm">加载设置中...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1" role="main">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-reading text-text-primary">
            设置
          </h1>
        </div>

        <div className="space-y-6">
          {/* Reading Preferences */}
          <section className="rounded-xl border border-border bg-bg-elevated p-5">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold font-reading text-text-primary">
                阅读偏好
              </h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-text-secondary">默认字级</span>
                <span className="font-medium text-text-primary">
                  {prefs.fontSize}px
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-text-secondary">默认字体</span>
                <span className="font-medium text-text-primary">
                  {FONT_FAMILY_LABELS[prefs.fontFamily] || prefs.fontFamily}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-text-secondary">默认行距</span>
                <span className="font-medium text-text-primary">
                  {prefs.lineHeight}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-text-secondary">默认内容宽度</span>
                <span className="font-medium text-text-primary">
                  {CONTENT_WIDTH_LABELS[prefs.contentWidth] || prefs.contentWidth}
                </span>
              </div>
            </div>
            <button
              onClick={handleResetPrefs}
              className="mt-4 flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
            >
              <RotateCcw className="h-4 w-4" />
              重置为默认值
            </button>
          </section>

          {/* Theme */}
          <section className="rounded-xl border border-border bg-bg-elevated p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sun className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold font-reading text-text-primary">
                主题
              </h2>
            </div>
            <div className="flex gap-2">
              {[
                { value: "light", label: "宣纸", Icon: Sun },
                { value: "sepia", label: "古卷", Icon: Book },
                { value: "dark", label: "墨夜", Icon: Moon },
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => { if (theme !== value) cycleTheme(); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
                    theme === value
                      ? "border-accent bg-accent-light text-accent font-medium"
                      : "border-border text-text-secondary hover:bg-bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Data Management */}
          <section className="rounded-xl border border-border bg-bg-elevated p-5">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold font-reading text-text-primary">
                数据管理
              </h2>
            </div>
            <div className="space-y-3">
              {/* Bookmarks */}
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <p className="text-sm font-medium text-text-primary">书签</p>
                  <p className="text-xs text-text-tertiary">
                    共 {bookmarkCount} 个书签
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirm("bookmarks")}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-error hover:text-error focus-visible:outline-2 focus-visible:outline-border-focus"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  清除
                </button>
              </div>

              {/* Reading History */}
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    最近阅读记录
                  </p>
                  <p className="text-xs text-text-tertiary">
                    阅读历史记录
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirm("history")}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-error hover:text-error focus-visible:outline-2 focus-visible:outline-border-focus"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  清除
                </button>
              </div>

              {/* Clear All Data */}
              <div className="pt-2">
                <button
                  onClick={() => setShowConfirm("all")}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-error/30 px-4 py-2.5 text-sm text-error transition-colors hover:bg-error/5 focus-visible:outline-2 focus-visible:outline-border-focus"
                >
                  <Trash2 className="h-4 w-4" />
                  清除全部本地数据
                </button>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="rounded-xl border border-border bg-bg-elevated p-5">
            <div className="mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold font-reading text-text-primary">
                关于
              </h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-text-secondary">应用名称</span>
                <span className="font-medium text-text-primary">
                  观心 — 佛典阅读器
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-text-secondary">版本</span>
                <span className="font-medium text-text-primary">v1.0</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-text-secondary">数据来源</span>
                <span className="font-medium text-text-primary">
                  Deer Park API / CBETA
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-text-secondary">许可协议</span>
                <span className="font-medium text-text-primary">
                  CC BY-NC-SA 4.0
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Confirm Dialog */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-bg-elevated p-6 shadow-xl">
              <h3 className="text-lg font-semibold font-reading text-text-primary">
                确认清除
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                {showConfirm === "bookmarks" &&
                  `即将清除所有 ${bookmarkCount} 个书签，此操作不可撤销。`}
                {showConfirm === "history" &&
                  "即将清除最近阅读记录，此操作不可撤销。"}
                {showConfirm === "all" &&
                  "即将清除所有本地数据（书签、阅读记录、阅读偏好），此操作不可撤销。"}
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-secondary focus-visible:outline-2 focus-visible:outline-border-focus"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (showConfirm === "bookmarks") handleClearBookmarks();
                    else if (showConfirm === "history") handleClearReadingHistory();
                    else if (showConfirm === "all") handleClearAllData();
                    setShowConfirm(null);
                  }}
                  className="flex-1 rounded-lg bg-error px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-error/90 focus-visible:outline-2 focus-visible:outline-border-focus"
                  disabled={isClearing}
                >
                  {isClearing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      清除中...
                    </span>
                  ) : (
                    "确认清除"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
