"use client";

import { useState, useMemo, useCallback } from "react";
import { BookmarkList } from "@/components/bookmarks/BookmarkList";
import { BookmarkEmpty } from "@/components/bookmarks/BookmarkEmpty";
import { useBookmarkList } from "@/hooks/useBookmark";
import { Search, Loader2 } from "lucide-react";

export default function BookmarksPage() {
  const { bookmarks, isLoaded, removeBookmark, clearAllBookmarks } = useBookmarkList();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "title">("date-desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Filter and sort bookmarks
  const filteredBookmarks = useMemo(() => {
    let result = bookmarks;

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.translator.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "title":
          return a.title.localeCompare(b.title, "zh-CN");
        default:
          return 0;
      }
    });

    return result;
  }, [bookmarks, searchQuery, sortBy]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      // Small delay for animation
      await new Promise((resolve) => setTimeout(resolve, 200));
      removeBookmark(id);
      setDeletingId(null);
    },
    [removeBookmark],
  );

  const handleClearAll = useCallback(async () => {
    clearAllBookmarks();
    setShowConfirmClear(false);
  }, [clearAllBookmarks]);

  if (!isLoaded) {
    return (
      <main className="flex-1" role="main">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex flex-col items-center justify-center py-24 text-text-tertiary">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-sm">加载书签中...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1" role="main">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {bookmarks.length > 0 ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold font-reading text-text-primary">
                我的书签
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                共 {bookmarks.length} 个书签
              </p>
            </div>

            {/* Search and Sort */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索经典名称、译者..."
                  className="w-full rounded-lg border border-border bg-bg-elevated py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none"
                />
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-lg border border-border bg-bg-elevated px-3 py-2.5 text-sm text-text-secondary focus:border-border-focus focus:outline-none"
              >
                <option value="date-desc">最新添加</option>
                <option value="date-asc">最早添加</option>
                <option value="title">按经典名排序</option>
              </select>

              {/* Clear All */}
              <button
                onClick={() => setShowConfirmClear(true)}
                className="rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm text-text-secondary transition-colors hover:border-error hover:text-error focus-visible:outline-2 focus-visible:outline-border-focus"
              >
                清空全部
              </button>
            </div>

            {/* Bookmark List */}
            {filteredBookmarks.length > 0 ? (
              <BookmarkList
                bookmarks={filteredBookmarks}
                deletingId={deletingId}
                onDelete={handleDelete}
              />
            ) : (
              <div className="py-12 text-center text-sm text-text-tertiary">
                {searchQuery
                  ? `没有找到与"${searchQuery}"相关的书签`
                  : "没有书签"}
              </div>
            )}

            {/* Confirm Clear Dialog */}
            {showConfirmClear && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-sm rounded-xl border border-border bg-bg-elevated p-6 shadow-xl">
                  <h3 className="text-lg font-semibold font-reading text-text-primary">
                    确认清空
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    即将删除全部 {bookmarks.length} 个书签，此操作不可撤销。
                  </p>
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => setShowConfirmClear(false)}
                      className="flex-1 rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-secondary focus-visible:outline-2 focus-visible:outline-border-focus"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="flex-1 rounded-lg bg-error px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-error/90 focus-visible:outline-2 focus-visible:outline-border-focus"
                    >
                      确认清空
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <BookmarkEmpty />
        )}
      </div>
    </main>
  );
}
