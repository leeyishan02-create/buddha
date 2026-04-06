"use client";

import { useState, useCallback, useEffect, useRef, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchEmpty } from "@/components/search/SearchEmpty";
import { SearchLoading } from "@/components/search/SearchLoading";
import { SearchCanonFilter } from "@/components/search/SearchCanonFilter";
import { SearchJuanFilter } from "@/components/search/SearchJuanFilter";
import { searchTexts } from "@/lib/cbeta/api";
import type { CbetaText } from "@/lib/cbeta/types";

const KNOWN_CANONS = new Set(["T", "X", "B", "J"]);
const PAGE_SIZE = 50;

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
  const initialCanons = searchParams.getAll("canon");
  const initialJuans = searchParams.getAll("juan");

  const [query, setQuery] = useState(initialQuery);
  const [selectedCanons, setSelectedCanons] = useState<string[]>(
    initialCanons.length > 0 ? initialCanons : []
  );
  const [selectedJuans, setSelectedJuans] = useState<string[]>(initialJuans);

  // Raw API results
  const [rawResults, setRawResults] = useState<CbetaText[]>([]);
  const [rawTotal, setRawTotal] = useState(0);

  // UI state
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side filtering via useMemo
  const filteredResults = useMemo(() => {
    let results = rawResults;

    // Canon filtering
    if (selectedCanons.length > 0) {
      const hasOther = selectedCanons.includes("other");
      results = results.filter((t) => {
        const category = t.category ?? "";
        if (hasOther && !KNOWN_CANONS.has(category)) return true;
        return selectedCanons.includes(category);
      });
    }

    // Juan filtering
    if (selectedJuans.length > 0) {
      results = results.filter((t) => {
        const juanCount = parseInt(t.juan ?? "1", 10);
        return selectedJuans.some((range) => {
          if (range === "1") return juanCount === 1;
          if (range === "2-5") return juanCount >= 2 && juanCount <= 5;
          if (range === "6-20") return juanCount >= 6 && juanCount <= 20;
          if (range === "20+") return juanCount > 20;
          return false;
        });
      });
    }

    return results;
  }, [rawResults, selectedCanons, selectedJuans]);

  // Client-side pagination
  const paginatedResults = useMemo(() => {
    return filteredResults.slice(0, (page + 1) * PAGE_SIZE);
  }, [filteredResults, page]);

  const hasMorePages = paginatedResults.length < filteredResults.length;

  // Load all texts on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, [initialQuery]);

  // performSearch: handles API calls
  const performSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      setSearched(true);
      setPage(0);

      try {
        const result = await searchTexts(q);
        if (!result) {
          setError("网络连接失败，请检查网络后重试");
          setRawResults([]);
          setRawTotal(0);
          return;
        }
        setRawResults(result.texts);
        setRawTotal(result.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "搜索失败，请稍后重试");
        setRawResults([]);
        setRawTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Canon toggle
  const handleToggleCanon = useCallback((canon: string) => {
    setSelectedCanons((prev) => {
      if (prev.includes(canon)) {
        return prev.filter((c) => c !== canon);
      }
      return [...prev, canon];
    });
  }, []);

  // Juan toggle
  const handleToggleJuan = useCallback((juan: string) => {
    setSelectedJuans((prev) => {
      if (prev.includes(juan)) {
        return prev.filter((j) => j !== juan);
      }
      return [...prev, juan];
    });
  }, []);

  // Sync URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    selectedCanons.forEach((c) => params.append("canon", c));
    selectedJuans.forEach((j) => params.append("juan", j));
    router.replace(`/search?${params.toString()}`);
  }, [selectedCanons, selectedJuans, query, router]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      params.set("q", query);
      selectedCanons.forEach((c) => params.append("canon", c));
      selectedJuans.forEach((j) => params.append("juan", j));
      router.push(`/search?${params.toString()}`);
      performSearch(query);
    },
    [query, selectedCanons, selectedJuans, performSearch, router],
  );

  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const handleSuggestionClick = useCallback(
    (suggestionQuery: string) => {
      setQuery(suggestionQuery);
      const params = new URLSearchParams();
      params.set("q", suggestionQuery);
      selectedCanons.forEach((c) => params.append("canon", c));
      selectedJuans.forEach((j) => params.append("juan", j));
      router.push(`/search?${params.toString()}`);
      performSearch(suggestionQuery);
    },
    [selectedCanons, selectedJuans, performSearch, router],
  );

  // Initial search on mount
  useEffect(() => {
    performSearch(initialQuery);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="flex-1" role="main">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-6">
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

        {/* Canon Filter */}
        <div className="mb-4">
          <SearchCanonFilter
            selectedCanons={selectedCanons}
            onToggle={handleToggleCanon}
          />
        </div>

        {/* Juan Filter */}
        <div className="mb-6">
          <SearchJuanFilter
            selectedJuans={selectedJuans}
            onToggle={handleToggleJuan}
          />
        </div>

        {/* Results */}
        {loading && <SearchLoading />}
        {!loading && searched && error && (
          <div className="rounded-lg border border-border bg-bg-elevated p-8 text-center">
            <p className="text-text-secondary">{error}</p>
            <button
              onClick={() => performSearch(query)}
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-white transition-colors hover:bg-accent-hover"
            >
              重新搜索
            </button>
          </div>
        )}
        {!loading && searched && !error && paginatedResults.length === 0 && (
          <SearchEmpty
            query={query}
            suggestions={SUGGESTIONS}
            onSuggestionClick={handleSuggestionClick}
          />
        )}
        {!loading && paginatedResults.length > 0 && (
          <>
            <SearchResults texts={paginatedResults} total={filteredResults.length} />
            {hasMorePages && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-6 py-3 text-sm font-ui text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
                >
                  加载更多
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
