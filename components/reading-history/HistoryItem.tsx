"use client";

import Link from "next/link";
import { BookOpen, Trash2, ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { useLocale } from "@/lib/locale/useLocale";
import type { ReadingHistoryItem } from "@/lib/db/reading-history";

interface HistoryItemProps {
  item: ReadingHistoryItem;
  onDelete: (id: string) => void;
}

// Convert number to Chinese numeral
function toChineseNum(n: number): string {
  const digits = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (n < 10) return digits[n];
  if (n === 10) return "十";
  if (n < 20) return "十" + digits[n - 10];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return digits[tens] + "十" + (ones > 0 ? digits[ones] : "");
}

export function HistoryItem({ item, onDelete }: HistoryItemProps) {
  const { convert } = useLocale();

  const date = new Date(item.lastReadAt);
  const dateStr = date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const displayTitle = useMemo(() => convert(item.title), [item.title, convert]);
  const displayTranslator = useMemo(() => convert(item.translator), [item.translator, convert]);

  return (
    <div className="group rounded-xl border border-border bg-bg-elevated p-4 transition-all hover:border-border-focus hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Title */}
          <Link
            href={`/text/${item.id}?vol=${item.fascicleNum}`}
            className="inline-flex items-center gap-1.5 font-reading text-base font-semibold text-text-primary transition-colors hover:text-accent"
          >
            {displayTitle}
            <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>

          {/* Translator */}
          <p className="mt-1 text-sm text-text-secondary">
            {displayTranslator}
          </p>

          {/* Meta info */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              卷{toChineseNum(item.fascicleNum)}
            </span>
            <span>阅读 {item.readCount} 次</span>
            <span>{dateStr}</span>
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(item.id)}
          className="shrink-0 rounded-lg p-2 text-text-tertiary opacity-0 transition-all hover:bg-bg-secondary hover:text-error group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-border-focus"
          aria-label="删除记录"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
