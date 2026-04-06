"use client";

import { HistoryItem } from "./HistoryItem";
import type { ReadingHistoryItem } from "@/lib/db/reading-history";

interface HistoryListProps {
  history: ReadingHistoryItem[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryList({ history, onDelete, onClearAll }: HistoryListProps) {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-reading text-text-primary">
            阅读记录
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            共 {history.length} 条记录
          </p>
        </div>
        {history.length > 1 && (
          <button
            onClick={onClearAll}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-error hover:text-error focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            清空全部
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {history.map((item) => (
          <HistoryItem
            key={item.id}
            item={item}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
