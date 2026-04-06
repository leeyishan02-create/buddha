"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchEmpty } from "@/components/search/SearchEmpty";
import { SearchLoading } from "@/components/search/SearchLoading";
import { searchTexts } from "@/lib/cbeta/api";
import type { CbetaText } from "@/lib/cbeta/types";

const SUGGESTIONS = [
  { label: "金刚经", query: "金刚般若波罗蜜经" },
  { label: "心经", query: "般若波罗蜜多心经" },
  { label: "阿弥陀经", query: "佛说阿弥陀经" },
  { label: "法华经", query: "妙法莲华经" },
  { label: "华严经", query: "大方广佛华严经" },
  { label: "楞严经", query: "大佛顶如来密因修证了义诸菩萨万行首楞严经" },
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<CbetaText[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all texts on mount (even without query)
  useEffect(() => {
    searchInputRef.current?.focus();
  }, [initialQuery]);

  const performSearch = useCallback(
    async (q: string, newOffset: number = 0, append: boolean = false) => {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      setSearched(true);

      try {
        const result = await searchTexts(q, newOffset);
        if (!result) {
          setError("网络连接失败，请检查网络后重试");
          if (!append) {
            setResults([]);
            setTotal(0);
            setHasMore(false);
          }
          return;
        }
        if (append) {
          setResults((prev) => [...prev, ...result.texts]);
        } else {
          setResults(result.texts);
        }
        setTotal(result.total);
        setHasMore(result.hasMore);
        setOffset(newOffset);
      } catch (err) {
        setError(err instanceof Error ? err.message : "搜索失败，请稍后重试");
        if (!append) {
          setResults([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      router.push(`/search?q=${encodeURIComponent(query)}`);
      performSearch(query, 0, false);
    },
    [query, performSearch, router],
  );

  const handleLoadMore = useCallback(() => {
    performSearch(initialQuery, offset + 50, true);
  }, [initialQuery, offset, performSearch]);

  const handleSuggestionClick = useCallback(
    (suggestionQuery: string) => {
      setQuery(suggestionQuery);
      router.push(`/search?q=${encodeURIComponent(suggestionQuery)}`);
      performSearch(suggestionQuery, 0, false);
    },
    [router, performSearch],
  );

  // Always load results on mount (all texts if no query)
  useEffect(() => {
    performSearch(initialQuery, 0, false);
  }, [initialQuery, performSearch]);

  return (
    <main className="flex-1" role="main">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索经典名称、作者、译者..."
                className="w-full rounded-lg border border-border bg-bg-elevated py-3 pl-10 pr-4 text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none"
                aria-label="搜索经典"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-white transition-colors hover:bg-accent-hover active:bg-accent-active disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-border-focus"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              搜索
            </button>
          </div>
        </form>

        {/* Results */}
        {loading && <SearchLoading />}
        {!loading && searched && error && (
          <div className="rounded-lg border border-border bg-bg-elevated p-8 text-center">
            <p className="text-text-secondary">{error}</p>
            <button
              onClick={() => performSearch(query, 0, false)}
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-white transition-colors hover:bg-accent-hover"
            >
              重新搜索
            </button>
          </div>
        )}
        {!loading && searched && !error && results.length === 0 && (
          <SearchEmpty
            query={query}
            suggestions={SUGGESTIONS}
            onSuggestionClick={handleSuggestionClick}
          />
        )}
        {!loading && results.length > 0 && (
          <>
            <SearchResults texts={results} total={total} />
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-6 py-3 text-sm font-ui text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-border-focus"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loadingMore ? "加载中..." : "加载更多"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export function SearchPageClient() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}
