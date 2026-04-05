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
  placeholder = "搜尋經典名稱、作者、譯者...",
  className = "",
  initialQuery = "",
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

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
      aria-label="搜尋佛教經典"
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
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-full border border-border bg-bg-elevated py-3.5 pl-12 pr-24 text-base font-ui text-text-primary placeholder:text-text-tertiary transition-colors focus:border-border-focus focus:outline-none"
        />
        <button
          type="submit"
          aria-label="搜尋"
          className="absolute right-1.5 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover active:bg-accent-active focus-visible:outline-2 focus-visible:outline-border-focus"
        >
          搜尋
        </button>
      </div>
    </form>
  );
}
