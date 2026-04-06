"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { triggerTocToggle } from "./TocState";

interface FascicleNavProps {
  catalogId: string;
  fascicleNum: number;
  totalFascicles: number;
}

export function FascicleNav({
  catalogId,
  fascicleNum,
  totalFascicles,
}: FascicleNavProps) {
  const hasMultipleFascicles = totalFascicles > 1;
  const prevFascicle = hasMultipleFascicles && fascicleNum > 1 ? fascicleNum - 1 : null;
  const nextFascicle = hasMultipleFascicles && fascicleNum < totalFascicles ? fascicleNum + 1 : null;

  if (!hasMultipleFascicles) {
    return (
      <nav
        className="mx-auto max-w-3xl border-t border-border px-4 py-4 sm:px-6"
        aria-label="经典导航"
      >
        <div className="flex items-center justify-center">
          <Link
            href="/search"
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-ui text-accent transition-colors hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            全部经典
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="mx-auto max-w-3xl border-t border-border px-4 py-4 sm:px-6"
      aria-label="卷导航"
    >
      <div className="flex items-center justify-between gap-4">
        {prevFascicle ? (
          <Link
            href={`/text/${catalogId}?vol=${prevFascicle}`}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-ui text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">卷 {prevFascicle}</span>
          </Link>
        ) : (
          <div aria-hidden="true" />
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={triggerTocToggle}
            className="rounded-lg px-3 py-2 text-sm font-ui text-accent transition-colors hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            目录
          </button>
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-ui text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            首页
          </Link>
        </div>

        {nextFascicle ? (
          <Link
            href={`/text/${catalogId}?vol=${nextFascicle}`}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-ui text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            <span className="truncate">卷 {nextFascicle}</span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        ) : (
          <div aria-hidden="true" />
        )}
      </div>
    </nav>
  );
}
