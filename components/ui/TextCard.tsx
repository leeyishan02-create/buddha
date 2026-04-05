import Link from "next/link";
import type { BuddhistText } from "@/lib/data/mock-texts";
import { BookOpen } from "lucide-react";

interface TextCardProps {
  text: BuddhistText;
}

// Check if translator already ends with "译" or "譯"
function formatTranslator(translator: string): string {
  if (translator.endsWith("譯") || translator.endsWith("译")) {
    return translator;
  }
  return `${translator} 译`;
}

export function TextCard({ text }: TextCardProps) {
  const displayTranslator = formatTranslator(text.translator);

  return (
    <Link
      href={`/text/${text.id}`}
      className="group flex flex-col rounded-xl border border-border bg-bg-elevated p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 focus-visible:outline-2 focus-visible:outline-border-focus"
      aria-label={`${text.title}，${displayTranslator}，共${text.volumes}卷`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-reading text-lg font-semibold text-text-primary transition-colors group-hover:text-accent line-clamp-2">
          {text.title}
        </h3>
        <span className="shrink-0 rounded bg-accent-light px-2 py-0.5 text-xs font-medium text-accent font-ui">
          {text.canon}{text.id.replace("T", "")}
        </span>
      </div>

      {/* Translator & Volumes */}
      <div className="mb-3 flex items-center gap-3 text-sm text-text-secondary font-ui">
        <span>{displayTranslator}</span>
        <span className="text-text-tertiary">·</span>
        <span className="flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          {text.volumes} 卷
        </span>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-text-secondary font-reading line-clamp-2">
        {text.description}
      </p>
    </Link>
  );
}
