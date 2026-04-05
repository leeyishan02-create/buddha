import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
}

export function SectionHeader({
  title,
  viewAllHref,
  viewAllLabel = "查看全部",
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <h2 className="text-xl font-semibold font-reading text-text-primary">
        {title}
      </h2>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-link transition-colors hover:text-link-hover font-ui focus-visible:outline-2 focus-visible:outline-border-focus rounded"
          aria-label={viewAllLabel}
        >
          {viewAllLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
