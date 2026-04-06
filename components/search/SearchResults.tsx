"use client";

import Link from "next/link";
import type { CbetaText } from "@/lib/deerpark/types";
import { BookOpen } from "lucide-react";

interface SearchResultsProps {
  texts: CbetaText[];
  total: number;
}

const SERIES_LABELS: Record<string, string> = {
  T: "大正藏",
  X: "卍续藏",
  B: "补编",
  J: "日本",
};

function getSeriesLabel(id: string): string {
  const prefix = id.charAt(0);
  return SERIES_LABELS[prefix] || "其他";
}

export function SearchResults({ texts, total }: SearchResultsProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        找到 {total} 部经典
        {texts.length < total && `（已显示 ${texts.length} 部）`}
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
                    <span>{text.translator} </span>
                  )}
                  {text.juan && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      {text.juan} 卷
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded bg-accent-light px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  {getSeriesLabel(text.id)}
                </span>
                <span className="rounded bg-bg-secondary px-2 py-1 text-xs font-ui text-text-secondary">
                  {text.id}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
