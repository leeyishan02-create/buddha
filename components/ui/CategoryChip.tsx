import Link from "next/link";

interface CategoryChipProps {
  label: string;
  href?: string;
  isActive?: boolean;
}

export function CategoryChip({ label, href, isActive = false }: CategoryChipProps) {
  const Chip = (
    <span
      className={`inline-flex shrink-0 cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-ui font-medium transition-all duration-200 ${
        isActive
          ? "border-accent bg-accent text-white"
          : "border-border bg-bg-elevated text-text-secondary hover:border-accent hover:text-accent hover:bg-accent-light"
      } focus-visible:outline-2 focus-visible:outline-border-focus`}
      role={href ? undefined : "button"}
      tabIndex={0}
    >
      {label}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`瀏覽分類：${label}`}
        className="shrink-0"
      >
        {Chip}
      </Link>
    );
  }

  return Chip;
}
