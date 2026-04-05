"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/lib/locale/useLocale";

export function LocaleToggle() {
  const { locale, toggleLocale } = useLocale();
  const isSimplified = locale === "zh-Hans";

  return (
    <button
      onClick={toggleLocale}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-sm font-ui text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
      aria-label={isSimplified ? "切换至繁体中文" : "切换至简体中文"}
      title={isSimplified ? "切换至繁体" : "切换至简体"}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{isSimplified ? "简体" : "繁体"}</span>
    </button>
  );
}
