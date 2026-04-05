"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { featuredTexts } from "@/lib/data/mock-texts";

interface FascicleNavProps {
  catalogId: string;
}

export function FascicleNav({ catalogId }: FascicleNavProps) {
  const currentIndex = featuredTexts.findIndex((t) => t.id === catalogId);
  const prevText = currentIndex > 0 ? featuredTexts[currentIndex - 1] : null;
  const nextText =
    currentIndex >= 0 && currentIndex < featuredTexts.length - 1
      ? featuredTexts[currentIndex + 1]
      : null;

  return (
    <nav
      className="mx-auto max-w-3xl border-t border-border px-4 py-4 sm:px-6"
      aria-label="經典導航"
    >
      <div className="flex items-center justify-between gap-4">
        {prevText ? (
          <Link
            href={`/text/${prevText.id}`}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-ui text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{prevText.title}</span>
          </Link>
        ) : (
          <div aria-hidden="true" />
        )}

        <Link
          href="/"
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-ui text-accent transition-colors hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-border-focus"
        >
          全部經典
        </Link>

        {nextText ? (
          <Link
            href={`/text/${nextText.id}`}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-ui text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            <span className="truncate">{nextText.title}</span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        ) : (
          <div aria-hidden="true" />
        )}
      </div>
    </nav>
  );
}
