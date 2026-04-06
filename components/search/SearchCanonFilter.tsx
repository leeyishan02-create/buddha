"use client";

interface SearchCanonFilterProps {
  selectedCanons: string[];
  onToggle: (canon: string) => void;
}

const CANONS = [
  { id: "T", label: "大正藏" },
  { id: "X", label: "卍续藏" },
  { id: "B", label: "补编" },
  { id: "J", label: "日本文献" },
  { id: "other", label: "其他" },
];

export function SearchCanonFilter({ selectedCanons, onToggle }: SearchCanonFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-text-secondary">藏经来源:</span>
      {CANONS.map((canon) => {
        const isSelected = selectedCanons.includes(canon.id);
        return (
          <button
            key={canon.id}
            onClick={() => onToggle(canon.id)}
            className={`rounded-full px-3 py-1 text-xs font-ui transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
              isSelected
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
            }`}
          >
            {canon.label}
          </button>
        );
      })}
    </div>
  );
}
