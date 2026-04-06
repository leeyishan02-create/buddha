"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { HistoryList } from "@/components/reading-history/HistoryList";
import { HistoryEmpty } from "@/components/reading-history/HistoryEmpty";
import { useReadingHistory } from "@/hooks/useReadingHistory";
import { Loader2 } from "lucide-react";

export default function ReadingHistoryPage() {
  const { history, isLoaded, error, removeItem, clearAll } = useReadingHistory();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClearAll = useCallback(() => {
    clearAll();
    setShowConfirm(false);
  }, [clearAll]);

  if (!isLoaded) {
    return (
      <main className="flex-1" role="main">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex flex-col items-center justify-center py-24 text-text-tertiary">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-sm">加载阅读记录中...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1" role="main">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="rounded-lg border border-border bg-bg-elevated p-8 text-center">
            <p className="text-text-secondary">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1" role="main">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="rounded-lg border border-border bg-bg-elevated p-8 text-center">
            <p className="text-text-secondary">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1" role="main">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {history.length > 0 ? (
          <>
            <HistoryList
              history={history}
              onDelete={removeItem}
              onClearAll={() => setShowConfirm(true)}
            />

            {/* Confirm Dialog */}
            {showConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-sm rounded-xl border border-border bg-bg-elevated p-6 shadow-xl">
                  <h3 className="text-lg font-semibold font-reading text-text-primary">
                    确认清空
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    即将清除所有 {history.length} 条阅读记录，此操作不可撤销。
                  </p>
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => setShowConfirm(false)}
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
          <HistoryEmpty />
        )}
      </div>
    </main>
  );
}
