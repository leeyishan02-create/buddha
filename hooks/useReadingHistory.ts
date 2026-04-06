// ============================================
// Reading History State Hook
// ============================================

"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReadingHistoryItem, StorageError } from "@/lib/db/reading-history";
import { getReadingHistory, removeReadingHistory, clearReadingHistory, formatStorageError } from "@/lib/db/reading-history";

export function useReadingHistory() {
  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setHistory(getReadingHistory());
      setError(null);
    } catch {
      setError("读取阅读记录失败，请刷新页面重试");
    }
    setIsLoaded(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "reader.recently_read") {
        try {
          setHistory(getReadingHistory());
          setError(null);
        } catch {
          setError("读取阅读记录失败");
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const removeItem = useCallback((id: string) => {
    const result = removeReadingHistory(id);
    if (result.success) {
      setHistory(result.history);
      setError(null);
    } else {
      setError(formatStorageError(result.error!));
    }
  }, []);

  const clearAll = useCallback(() => {
    const result = clearReadingHistory();
    if (result.success) {
      setHistory([]);
      setError(null);
    } else {
      setError(formatStorageError(result.error!));
    }
  }, []);

  return {
    history,
    isLoaded,
    error,
    removeItem,
    clearAll,
  };
}
