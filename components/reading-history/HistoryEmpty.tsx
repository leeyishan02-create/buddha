"use client";

import { BookOpen, Search } from "lucide-react";
import Link from "next/link";

export function HistoryEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <BookOpen className="mb-4 h-20 w-20 text-text-tertiary opacity-30" />
      <h3 className="mb-2 text-lg font-semibold font-reading text-text-primary">
        暂无阅读记录
      </h3>
      <p className="mb-6 max-w-sm text-sm text-text-secondary">
        开始阅读佛经后，这里会自动记录您的阅读历史，方便日后快速找到。
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/search"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-border-focus"
        >
          <Search className="h-4 w-4" />
          浏览经典
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-elevated px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
