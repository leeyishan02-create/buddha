import { SearchBar } from "@/components/ui/SearchBar";
import { TextCard } from "@/components/ui/TextCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getFeaturedTexts } from "@/lib/cbeta/server";
import { featuredTexts as mockFeaturedTexts } from "@/lib/data/mock-texts";
import { ArrowRight } from "lucide-react";

const FEATURED_IDS = ["T0235", "T0251", "T0262", "T0366", "T0475", "T0278"];

export default async function Home() {
  const cbetaTexts = await getFeaturedTexts(FEATURED_IDS);

  // Fallback to mock data if API fails
  const featuredTexts = cbetaTexts.length > 0
    ? cbetaTexts.map((t) => ({
        id: t.id,
        title: t.title,
        translator: t.translator ?? "",
        volumes: t.juan ? parseInt(t.juan) || 1 : 1,
        canon: t.vol?.replace(/\d+/, "") || "T",
        description: "",
      }))
    : mockFeaturedTexts;

  return (
    <div className="flex flex-col gap-12 pb-24 lg:pb-12">
      {/* ===== Hero Section ===== */}
      <section className="flex flex-col items-center justify-center px-4 pt-16 text-center sm:pt-20 lg:pt-24">
        <h1 className="mb-3 text-4xl font-bold font-reading text-text-primary sm:text-5xl">
          观心
        </h1>
        <p className="mb-8 max-w-md text-lg leading-relaxed text-text-secondary font-reading sm:text-xl">
          探索佛教经典，从大藏经中寻找智慧
        </p>

        {/* Search Bar */}
        <SearchBar className="max-w-[640px]" />
      </section>

      {/* ===== Featured Texts Section ===== */}
      {featuredTexts.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <SectionHeader
            title="热门经典"
            viewAllHref="/search"
            viewAllLabel="浏览全部经典"
            className="mb-5"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTexts.map((text) => (
              <TextCard key={text.id} text={text} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
