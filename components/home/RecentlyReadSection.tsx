"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { RecentlyRead } from "@/lib/data/mock-texts";
import { BookOpen } from "lucide-react";

export function RecentlyReadSection() {
  const [recentlyRead, setRecentlyRead] = useState<RecentlyRead[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("reader.recently_read");
      if (stored) {
        const parsed = JSON.parse(stored) as RecentlyRead[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sort by most recent and take last 6
          const sorted = parsed
            .sort(
              (a, b) =>
                new Date(b.lastReadAt).getTime() -
                new Date(a.lastReadAt).getTime(),
            )
            .slice(0, 6);
          setRecentlyRead(sorted);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  if (recentlyRead.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <SectionHeader
        title="最近閱讀"
        viewAllHref="/bookmarks"
        viewAllLabel="閱讀記錄"
        className="mb-5"
      />
      <div
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin"
        role="list"
        aria-label="最近閱讀的經典"
      >
        {recentlyRead.map((item) => (
          <Link
            key={item.id}
            href={`/text/${item.id}`}
            role="listitem"
            className="flex shrink-0 w-56 flex-col rounded-xl border border-border bg-bg-elevated p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 focus-visible:outline-2 focus-visible:outline-border-focus"
            aria-label={`${item.title}${item.progress ? `，進度${item.progress}%` : ""}`}
          >
            <div className="mb-2 flex items-center gap-2 text-text-tertiary">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-ui">{item.id}</span>
            </div>
            <h3 className="mb-1 font-reading text-base font-medium text-text-primary line-clamp-1">
              {item.title}
            </h3>
            {item.progress !== undefined && (
              <div className="mt-2">
                <div className="h-1 w-full rounded-full bg-bg-tertiary">
                  <div
                    className="h-1 rounded-full bg-accent transition-all"
                    style={{ width: `${item.progress}%` }}
                    aria-label={`閱讀進度 ${item.progress}%`}
                  />
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
