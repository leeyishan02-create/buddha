"use client";

import Link from "next/link";
import { X, BookOpen, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useTocState } from "./TocState";
import { useLocale } from "@/lib/locale/useLocale";
import type { CbetaFascicleInfo } from "@/lib/deerpark/types";

interface TableOfContentsProps {
  catalogId: string;
}

export function TableOfContents({ catalogId }: TableOfContentsProps) {
  const { open, close } = useTocState();
  const { convert } = useLocale();
  const [toc, setToc] = useState<CbetaFascicleInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadToc = useCallback(async () => {
    if (toc.length > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/toc?id=${encodeURIComponent(catalogId)}`);
      if (!res.ok) throw new Error("Failed to load TOC");
      const data = await res.json();
      setToc(data.fascicles ?? []);
    } catch {
      setError("加载目录失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [catalogId, toc.length, loading]);

  useEffect(() => {
    if (open) {
      loadToc();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, loadToc]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (open) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, close]);

  // Convert TOC titles
  const convertedToc = useMemo(
    () =>
      toc.map((item) => ({
        ...item,
        title: convert(item.title),
      })),
    [toc, convert],
  );

  // Convert number to Chinese numeral
  const toChineseNum = (n: number): string => {
    const digits = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
    if (n < 10) return digits[n];
    if (n === 10) return "十";
    if (n < 20) return "十" + digits[n - 10];
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return digits[tens] + "十" + (ones > 0 ? digits[ones] : "");
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="fixed z-50 bg-bg-elevated border-border transition-transform duration-300 ease-out
          bottom-0 left-0 right-0 rounded-t-2xl border-t
          lg:left-auto lg:top-0 lg:bottom-0 lg:w-80 lg:rounded-none lg:border-l lg:border-t-0"
        role="dialog"
        aria-label="目录"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="flex items-center gap-2 text-sm font-medium font-ui text-text-primary">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            目录
          </span>
          <button
            onClick={close}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
            aria-label="关闭目录"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile handle */}
        <div className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-border lg:hidden" />

        {/* Content */}
        <div className="overflow-y-auto px-3 pb-4" style={{ maxHeight: "calc(100vh - 5rem)" }}>
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
              <Loader2 className="h-6 w-6 animate-spin mb-3" />
              <p className="text-sm">正在加载目录...</p>
              <p className="text-xs mt-1">这可能需要几秒钟</p>
            </div>
          )}

          {error && (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary mb-3">{error}</p>
              <button
                onClick={loadToc}
                className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
              >
                重试
              </button>
            </div>
          )}

          {!loading && !error && toc.length === 0 && (
            <div className="py-8 text-center text-sm text-text-tertiary">
              此经典只有一卷
            </div>
          )}

          {!loading && !error && convertedToc.length > 0 && (
            <div className="space-y-1">
              {convertedToc.map((item) => (
                <Link
                  key={item.id}
                  href={`/text/${catalogId}?vol=${item.num}`}
                  onClick={close}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
                >
                  <span className="shrink-0 text-xs font-mono tabular-nums text-text-tertiary">
                    {String(item.num).padStart(2, "0")}
                  </span>
                  <span className="truncate font-reading">卷{toChineseNum(item.num)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
