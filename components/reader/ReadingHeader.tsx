"use client";

import Link from "next/link";
import { ArrowLeft, Bookmark, ListTree } from "lucide-react";
import { useState, useCallback } from "react";
import { triggerTocToggle } from "./TocState";

interface ReadingHeaderProps {
  title: string;
  translator: string;
  catalogId: string;
  fascicleNum: number;
  totalFascicles: number;
}

export function ReadingHeader({
  title,
  translator,
  catalogId,
  fascicleNum,
  totalFascicles,
}: ReadingHeaderProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleBookmark = useCallback(() => {
    setIsBookmarked((prev) => !prev);
  }, []);

  const showFascicleInfo = totalFascicles > 1;

  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-bg-elevated/95 backdrop-blur-sm"
      role="banner"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Left: Back + Title */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="shrink-0 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
            aria-label="返回首頁"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-reading text-base font-semibold text-text-primary sm:text-lg">
              {title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-text-secondary font-ui">
              <span className="truncate">{translator}</span>
              {showFascicleInfo && (
                <span className="shrink-0 rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] font-medium">
                  卷 {fascicleNum}/{totalFascicles}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {showFascicleInfo && (
            <button
              onClick={triggerTocToggle}
              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
              aria-label="開啟目錄"
              title="目錄"
            >
              <ListTree className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={handleBookmark}
            className={`rounded-lg p-2 transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
              isBookmarked
                ? "text-accent hover:bg-accent-light"
                : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            }`}
            aria-label={isBookmarked ? "移除書籤" : "加入書籤"}
            aria-pressed={isBookmarked}
          >
            <Bookmark
              className="h-5 w-5"
              fill={isBookmarked ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
