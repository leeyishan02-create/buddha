"use client";

import Link from "next/link";
import type { CbetaText } from "@/lib/cbeta/types";
import { BookOpen } from "lucide-react";

interface SearchResultsProps {
  texts: CbetaText[];
}

export function SearchResults({ texts }: SearchResultsProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        找到 {texts.length} 部經典
      </p>
      <div className="space-y-3">
        {texts.map((text) => (
          <Link
            key={text.id}
            href={`/text/${text.id}`}
            className="block rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:border-border-focus hover:bg-bg-secondary focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-reading text-lg font-semibold text-text-primary">
                  {text.title}
                </h3>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                  {text.translator && (
                    <span>{text.translator} 譯</span>
                  )}
                  {text.author && (
                    <span>{text.author} 著</span>
                  )}
                  {text.juan && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      {text.juan} 卷
                    </span>
                  )}
                </div>
              </div>
              <span className="shrink-0 rounded bg-bg-secondary px-2 py-1 text-xs font-ui text-text-secondary">
                {text.vol}{text.id.replace(/^\D+/, "")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
