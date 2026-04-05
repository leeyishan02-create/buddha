"use client";

import Link from "next/link";
import { ArrowLeft, Bookmark } from "lucide-react";
import { useState, useCallback } from "react";

interface ReadingHeaderProps {
  title: string;
  translator: string;
  catalogId: string;
}

export function ReadingHeader({
  title,
  translator,
  catalogId,
}: ReadingHeaderProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleBookmark = useCallback(() => {
    setIsBookmarked((prev) => !prev);
  }, []);

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
            <p className="truncate text-xs text-text-secondary font-ui">
              {translator} 譯
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-1">
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
