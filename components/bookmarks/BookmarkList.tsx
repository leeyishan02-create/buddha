"use client";

import Link from "next/link";
import { Bookmark as BookmarkIcon, Trash2, ExternalLink } from "lucide-react";
import { useMemo } from "react";
import type { Bookmark } from "@/lib/db/bookmarks";

interface BookmarkListProps {
  bookmarks: Bookmark[];
  deletingId: string | null;
  onDelete: (id: string) => void;
}

// Group bookmarks by catalogId
function groupByCatalog(bookmarks: Bookmark[]) {
  const groups = new Map<string, Bookmark[]>();
  for (const b of bookmarks) {
    if (!groups.has(b.catalogId)) {
      groups.set(b.catalogId, []);
    }
    groups.get(b.catalogId)!.push(b);
  }
  return groups;
}

export function BookmarkList({ bookmarks, deletingId, onDelete }: BookmarkListProps) {
  const groups = useMemo(() => groupByCatalog(bookmarks), [bookmarks]);

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([catalogId, items]) => {
        const firstItem = items[0];
        return (
          <div key={catalogId}>
            {/* Group Header */}
            <div className="mb-3 flex items-center gap-2">
              <BookmarkIcon className="h-4 w-4 text-accent" />
              <Link
                href={`/text/${catalogId}`}
                className="font-reading text-base font-semibold text-text-primary transition-colors hover:text-accent"
              >
                {firstItem.title}
              </Link>
              <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-xs font-ui text-text-tertiary">
                {items.length}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {items.map((bookmark) => {
                const isDeleting = deletingId === bookmark.id;
                const date = new Date(bookmark.createdAt);
                const dateStr = date.toLocaleDateString("zh-CN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                // Extract volume number from bookmark ID
                const volMatch = bookmark.id.match(/_vol_(\d+)/);
                const vol = volMatch ? volMatch[1] : "1";
                const href = `/text/${bookmark.catalogId}?vol=${vol}`;

                return (
                  <div
                    key={bookmark.id}
                    className={`group rounded-lg border border-border bg-bg-elevated p-3 transition-all duration-200 hover:border-border-focus hover:shadow-sm ${
                      isDeleting ? "opacity-0 scale-95" : "opacity-100 scale-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={href}
                            className="inline-flex items-center gap-1 font-reading text-sm font-medium text-text-primary transition-colors hover:text-accent"
                          >
                            卷 {vol}
                            <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                          </Link>
                          <span className="text-xs text-text-tertiary">{dateStr}</span>
                        </div>

                        {/* Paragraph preview */}
                        {bookmark.paragraphText && (
                          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-secondary font-reading">
                            {bookmark.paragraphText}
                          </p>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => onDelete(bookmark.id)}
                        className="shrink-0 rounded-lg p-1.5 text-text-tertiary opacity-0 transition-all hover:bg-bg-secondary hover:text-error group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-border-focus"
                        aria-label="删除书签"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
