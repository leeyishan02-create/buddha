import { SearchBar } from "@/components/ui/SearchBar";
import { TextCard } from "@/components/ui/TextCard";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RecentlyReadSection } from "@/components/home/RecentlyReadSection";
import { categories } from "@/lib/data/mock-texts";
import { getFeaturedTexts } from "@/lib/cbeta/server";
import { ArrowRight } from "lucide-react";

const FEATURED_IDS = ["T0235", "T0251", "T0262", "T0279", "T0237", "T0278"];

export default async function Home() {
  const cbetaTexts = await getFeaturedTexts(FEATURED_IDS);

  const featuredTexts = cbetaTexts.map((t) => ({
    id: t.id,
    title: t.title,
    translator: t.author ?? "",
    volumes: t.juan ? parseInt(t.juan) || 1 : 1,
    canon: t.vol?.replace(/\d+/, "") || "T",
    description: "",
  }));

  return (
    <div className="flex flex-col gap-12 pb-24 lg:pb-12">
      {/* ===== Hero Section ===== */}
      <section className="flex flex-col items-center justify-center px-4 pt-16 text-center sm:pt-20 lg:pt-24">
        {/* Brand */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-white font-reading shadow-lg shadow-accent/20">
            觀
          </div>
        </div>
        <h1 className="mb-3 text-4xl font-bold font-reading text-text-primary sm:text-5xl">
          觀心
        </h1>
        <p className="mb-8 max-w-md text-lg leading-relaxed text-text-secondary font-reading sm:text-xl">
          探索佛教經典，從大藏經中尋找智慧
        </p>

        {/* Search Bar */}
        <SearchBar className="max-w-[640px]" />
      </section>

      {/* ===== Featured Texts Section ===== */}
      {featuredTexts.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <SectionHeader
            title="熱門經典"
            viewAllHref="/search"
            viewAllLabel="瀏覽全部經典"
            className="mb-5"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTexts.map((text) => (
              <TextCard key={text.id} text={text} />
            ))}
          </div>
        </section>
      )}

      {/* ===== Category Browse Section ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SectionHeader
          title="分類瀏覽"
          className="mb-5"
        />
        <div
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin"
          role="list"
          aria-label="經典分類"
        >
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={cat.label}
              href={`/search?type=${cat.id}`}
            />
          ))}
          {/* "More" chip */}
          <a
            href="/search"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-bg-elevated px-4 py-2 text-sm font-ui font-medium text-text-secondary transition-all duration-200 hover:border-accent hover:text-accent hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-border-focus"
            aria-label="瀏覽更多分類"
            role="listitem"
          >
            更多
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* ===== Recently Read Section (conditional) ===== */}
      <RecentlyReadSection />
    </div>
  );
}
