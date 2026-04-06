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
  type StorageError,
} from "@/lib/db/bookmarks";

export function useBookmark(bookmarkId?: string) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [error, setError] = useState<StorageError | null>(null);

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
      setError(null);
      if (isBookmarked) {
        removeBookmarkFn(bookmark.id);
        setIsBookmarked(false);
      } else {
        const result = addBookmark(bookmark);
        if (result.success) {
          setIsBookmarked(true);
        } else {
          setError(result.error ?? null);
        }
      }
    },
    [isBookmarked],
  );

  return {
    isBookmarked,
    error,
    toggleBookmark,
  };
}

export function useBookmarkList() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<StorageError | null>(null);

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
    setError(null);
    const result = removeBookmarkFn(bookmarkId);
    if (result.success) {
      setBookmarks(result.bookmarks);
    } else {
      setError(result.error ?? null);
    }
  }, []);

  const clearAllBookmarks = useCallback(() => {
    setError(null);
    const result = clearAllBookmarksFn();
    if (result.success) {
      setBookmarks([]);
    } else {
      setError(result.error ?? null);
    }
  }, []);

  return {
    bookmarks,
    isLoaded,
    error,
    removeBookmark,
    clearAllBookmarks,
  };
}
