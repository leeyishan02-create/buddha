// ============================================
// Bookmark State Hook
// ============================================

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addBookmark,
  removeBookmark as removeBookmarkFn,
  hasBookmark,
  getBookmarks,
  clearAllBookmarks as clearAllBookmarksFn,
  type Bookmark,
} from "@/lib/db/bookmarks";

export function useBookmark(bookmarkId?: string) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Check bookmark status when ID changes
  useEffect(() => {
    if (bookmarkId) {
      setIsBookmarked(hasBookmark(bookmarkId));
    }
  }, [bookmarkId]);

  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "buddha-bookmarks" && bookmarkId) {
        setIsBookmarked(hasBookmark(bookmarkId));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [bookmarkId]);

  const toggleBookmark = useCallback(
    (bookmark: Bookmark) => {
      if (isBookmarked) {
        removeBookmarkFn(bookmark.id);
        setIsBookmarked(false);
      } else {
        addBookmark(bookmark);
        setIsBookmarked(true);
      }
    },
    [isBookmarked],
  );

  return {
    isBookmarked,
    toggleBookmark,
  };
}

export function useBookmarkList() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setBookmarks(getBookmarks());
    setIsLoaded(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "buddha-bookmarks") {
        setBookmarks(getBookmarks());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const removeBookmark = useCallback((bookmarkId: string) => {
    removeBookmarkFn(bookmarkId);
    setBookmarks(getBookmarks());
  }, []);

  const clearAllBookmarks = useCallback(() => {
    clearAllBookmarksFn();
    setBookmarks(getBookmarks());
  }, []);

  return {
    bookmarks,
    isLoaded,
    removeBookmark,
    clearAllBookmarks,
  };
}
