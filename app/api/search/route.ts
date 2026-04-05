import { NextRequest, NextResponse } from "next/server";
import searchIndex from "@/lib/cbeta/search-index.json";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");
    if (!query || !query.trim()) {
      return NextResponse.json({ texts: [] });
    }

    const lowerQuery = query.toLowerCase();
    const results = searchIndex.texts
      .filter((t) => t.searchableText.includes(lowerQuery))
      .slice(0, 50)
      .map((t) => ({
        id: t.id,
        title: t.title,
        author: t.author || "",
        translator: t.author || "",
        vol: t.id.substring(0, 3),
        juan: "",
        category: t.edition || "",
      }));

    return NextResponse.json({ texts: results });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Search failed", texts: [] },
      { status: 500 }
    );
  }
}
