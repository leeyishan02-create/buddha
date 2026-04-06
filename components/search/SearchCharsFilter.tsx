"use client";

interface SearchCharsFilterProps {
  selectedChars: string[];
  onToggle: (chars: string) => void;
}

const CHARS_RANGES = [
  { id: "<1K", label: "<1千" },
  { id: "1K-5K", label: "1千-5千" },
  { id: "5K-10K", label: "5千-1万" },
  { id: "10K-50K", label: "1万-5万" },
  { id: "50K-100K", label: "5万-10万" },
  { id: "100K+", label: "10万+" },
];

export function SearchCharsFilter({ selectedChars, onToggle }: SearchCharsFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-text-secondary">字数范围:</span>
      {CHARS_RANGES.map((range) => {
        const isSelected = selectedChars.includes(range.id);
        return (
          <button
            key={range.id}
            onClick={() => onToggle(range.id)}
            className={`rounded-full px-3 py-1 text-xs font-ui transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
              isSelected
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
            }`}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
