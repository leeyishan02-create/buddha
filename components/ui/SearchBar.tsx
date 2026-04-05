"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  initialQuery?: string;
}

export function SearchBar({
  placeholder,
  className = "",
  initialQuery = "",
}: SearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultPlaceholder = "搜索经典名称、作者、译者...";

  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [query, router],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="搜索佛教经典"
      className={`w-full ${className}`}
    >
      <div className="relative flex items-center">
        <SearchIcon
          className="absolute left-4 h-5 w-5 text-text-tertiary pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? defaultPlaceholder}
          aria-label={placeholder ?? defaultPlaceholder}
          className="w-full rounded-full border border-border bg-bg-elevated py-3.5 pl-12 pr-24 text-base font-ui text-text-primary placeholder:text-text-tertiary transition-colors focus:border-border-focus focus:outline-none"
        />
        <button
          type="submit"
          aria-label="搜索"
          className="absolute right-1.5 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover active:bg-accent-active focus-visible:outline-2 focus-visible:outline-border-focus"
        >
          搜索
        </button>
      </div>
    </form>
  );
}
