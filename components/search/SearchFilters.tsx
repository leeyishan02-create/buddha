"use client";

import type { SearchType } from "@/lib/cbeta/types";

interface SearchFiltersProps {
  searchType: SearchType;
  onTypeChange: (type: SearchType) => void;
}

const SEARCH_TYPES: { value: SearchType; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "title", label: "經名" },
  { value: "translator", label: "譯者" },
  { value: "author", label: "作者" },
];

export function SearchFilters({ searchType, onTypeChange }: SearchFiltersProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {SEARCH_TYPES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onTypeChange(value)}
          className={`rounded-full px-4 py-1.5 text-sm font-ui transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
            searchType === value
              ? "bg-accent text-white"
              : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
