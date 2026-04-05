"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchEmpty } from "@/components/search/SearchEmpty";
import { SearchLoading } from "@/components/search/SearchLoading";
import { searchTexts } from "@/lib/cbeta/api";
import type { CbetaText, SearchType } from "@/lib/cbeta/types";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialType = (searchParams.get("type") as SearchType) ?? "all";

  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<SearchType>(initialType);
  const [results, setResults] = useState<CbetaText[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(
    async (q: string, type: SearchType) => {
      if (!q.trim()) return;

      setLoading(true);
      setError(null);
      setSearched(true);

      try {
        const result = await searchTexts({
          query: q,
          type,
        });
        setResults(result ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "搜尋失敗");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      router.push(`/search?q=${encodeURIComponent(query)}&type=${searchType}`);
      performSearch(query, searchType);
    },
    [query, searchType, performSearch, router],
  );

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, initialType);
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
                className="rounded-lg bg-accent px-6 py-3 text-white transition-colors hover:bg-accent-hover active:bg-accent-active focus-visible:outline-2 focus-visible:outline-border-focus"
              >
                搜尋
              </button>
            </div>
          </form>

          {/* Filters */}
          <SearchFilters
            searchType={searchType}
            onTypeChange={setSearchType}
          />

          {/* Results */}
          {loading && <SearchLoading />}
          {!loading && searched && error && (
            <div className="rounded-lg border border-border bg-bg-elevated p-8 text-center">
              <p className="text-text-secondary">{error}</p>
              <button
                onClick={() => performSearch(query, searchType)}
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
            <SearchResults texts={results} />
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
