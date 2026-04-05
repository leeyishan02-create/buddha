"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchEmpty } from "@/components/search/SearchEmpty";
import { SearchLoading } from "@/components/search/SearchLoading";
import { searchTexts } from "@/lib/cbeta/api";
import type { CbetaText } from "@/lib/cbeta/types";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialType = searchParams.get("type") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<CbetaText[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(
    async (q: string, type: string, newOffset: number = 0, append: boolean = false) => {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      setSearched(true);

      try {
        const result = await searchTexts(q, type, newOffset);
        if (append) {
          setResults((prev) => [...prev, ...result.texts]);
        } else {
          setResults(result.texts);
        }
        setTotal(result.total);
        setHasMore(result.hasMore);
        setOffset(newOffset);
      } catch (err) {
        setError(err instanceof Error ? err.message : "搜尋失敗");
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
      if (!query.trim()) return;
      router.push(`/search?q=${encodeURIComponent(query)}&type=${initialType}`);
      performSearch(query, initialType, 0, false);
    },
    [query, initialType, performSearch, router],
  );

  const handleLoadMore = useCallback(() => {
    performSearch(initialQuery, initialType, offset + 50, true);
  }, [initialQuery, initialType, offset, performSearch]);

  useEffect(() => {
    if (initialQuery || initialType) {
      performSearch(initialQuery, initialType, 0, false);
    }
  }, [initialQuery, initialType, performSearch]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1" role="main">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Search Form */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜尋經典名稱、作者、譯者..."
                  className="w-full rounded-lg border border-border bg-bg-elevated py-3 pl-10 pr-4 text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none"
                  aria-label="搜尋經典"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-white transition-colors hover:bg-accent-hover active:bg-accent-active disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-border-focus"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                搜尋
              </button>
            </div>
          </form>

          {/* Results */}
          {loading && <SearchLoading />}
          {!loading && searched && error && (
            <div className="rounded-lg border border-border bg-bg-elevated p-8 text-center">
              <p className="text-text-secondary">{error}</p>
              <button
                onClick={() => performSearch(query, initialType, 0, false)}
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-white transition-colors hover:bg-accent-hover"
              >
                重試
              </button>
            </div>
          )}
          {!loading && searched && !error && results.length === 0 && (
            <SearchEmpty query={query} />
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
                    {loadingMore ? "載入中..." : "載入更多"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

export function SearchPageClient() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}
