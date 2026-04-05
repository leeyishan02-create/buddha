import { Suspense } from "react";
import { SearchPageClient } from "@/components/search/SearchPageClient";
import { SearchLoading } from "@/components/search/SearchLoading";

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageClient />
    </Suspense>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          <SearchLoading />
        </div>
      </main>
    </div>
  );
}
