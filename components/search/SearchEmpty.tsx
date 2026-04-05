"use client";

import { SearchX } from "lucide-react";

interface SearchEmptyProps {
  query: string;
}

export function SearchEmpty({ query }: SearchEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <SearchX className="mb-4 h-16 w-16 text-text-tertiary opacity-50" />
      <h3 className="mb-2 text-lg font-semibold font-reading text-text-primary">
        找不到相關經典
      </h3>
      <p className="max-w-md text-sm text-text-secondary">
        嘗試使用不同的關鍵字，或瀏覽首頁的熱門經典。
      </p>
      {query && (
        <p className="mt-2 text-xs text-text-tertiary">
          搜尋關鍵字：「{query}」
        </p>
      )}
    </div>
  );
}
