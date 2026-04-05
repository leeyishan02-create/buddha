"use client";

import { SearchX, Home } from "lucide-react";
import Link from "next/link";

interface Suggestion {
  label: string;
  query: string;
}

interface SearchEmptyProps {
  query: string;
  suggestions?: Suggestion[];
  onSuggestionClick?: (query: string) => void;
}

export function SearchEmpty({ query, suggestions = [], onSuggestionClick }: SearchEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <SearchX className="mb-4 h-16 w-16 text-text-tertiary opacity-50" />
      <h3 className="mb-2 text-lg font-semibold font-reading text-text-primary">
        找不到相关经典
      </h3>
      <p className="max-w-md text-sm text-text-secondary">
        尝试使用不同的关键字，或浏览首页的热门经典。
      </p>
      {query && (
        <p className="mt-2 text-xs text-text-tertiary">
          搜索关键字：「{query}」
        </p>
      )}

      {/* Search suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-text-secondary">热门搜索建议：</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s.query}
                onClick={() => onSuggestionClick?.(s.query)}
                className="rounded-full border border-border bg-bg-elevated px-4 py-1.5 text-sm font-ui text-text-secondary transition-colors hover:border-accent hover:text-accent hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-border-focus"
                title={s.query}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Return to home link */}
      <Link
        href="/"
        className="mt-6 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-ui text-accent transition-colors hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-border-focus"
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        返回首页
      </Link>
    </div>
  );
}
