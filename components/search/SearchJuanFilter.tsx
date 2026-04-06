"use client";

interface SearchJuanFilterProps {
  selectedJuans: string[];
  onToggle: (juan: string) => void;
}

const JUAN_RANGES = [
  { id: "1", label: "1卷" },
  { id: "2-5", label: "2-5卷" },
  { id: "6-20", label: "6-20卷" },
  { id: "20+", label: "20+卷" },
];

export function SearchJuanFilter({ selectedJuans, onToggle }: SearchJuanFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-text-secondary">卷数范围:</span>
      {JUAN_RANGES.map((range) => {
        const isSelected = selectedJuans.includes(range.id);
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
