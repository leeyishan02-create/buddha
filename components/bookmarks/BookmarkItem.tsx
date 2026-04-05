"use client";

import Link from "next/link";
import { Bookmark as BookmarkIcon, Trash2, ExternalLink } from "lucide-react";
import type { Bookmark } from "@/lib/db/bookmarks";

interface BookmarkItemProps {
  bookmark: Bookmark;
  onDelete: (id: string) => void;
}

export function BookmarkItem({ bookmark, onDelete }: BookmarkItemProps) {
  const date = new Date(bookmark.createdAt);
  const dateStr = date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="group rounded-xl border border-border bg-bg-elevated p-4 transition-all hover:border-border-focus hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Title */}
          <Link
            href={`/text/${bookmark.catalogId}`}
            className="inline-flex items-center gap-1.5 font-reading text-base font-semibold text-text-primary transition-colors hover:text-accent"
          >
            {bookmark.title}
            <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>

          {/* Translator */}
          {bookmark.translator && (
            <p className="mt-1 text-sm text-text-secondary">
              {bookmark.translator}
            </p>
          )}

          {/* Section title */}
          {bookmark.sectionTitle && (
            <p className="mt-1 text-sm font-medium text-text-tertiary">
              {bookmark.sectionTitle}
            </p>
          )}

          {/* Paragraph preview */}
          {bookmark.paragraphText && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-secondary font-reading">
              {bookmark.paragraphText}
            </p>
          )}

          {/* Date */}
          <p className="mt-2 text-xs text-text-tertiary">
            {dateStr}
          </p>
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(bookmark.id)}
          className="shrink-0 rounded-lg p-2 text-text-tertiary opacity-0 transition-all hover:bg-bg-secondary hover:text-error group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-border-focus"
          aria-label="删除书签"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
