import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 text-6xl font-reading font-bold text-text-tertiary opacity-40">
        404
      </div>
      <h1 className="mb-3 text-2xl font-semibold font-reading text-text-primary">
        找不到頁面
      </h1>
      <p className="mb-8 max-w-md text-base text-text-secondary">
        此頁面不存在，或經典尚未收錄。您可以搜尋其他經典，或返回首頁。
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-border-focus"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          返回首頁
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-elevated px-6 py-3 text-base font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-2 focus-visible:outline-border-focus"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          搜尋經典
        </Link>
      </div>
    </div>
  );
}
