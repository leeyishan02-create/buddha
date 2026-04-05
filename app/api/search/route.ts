import { NextRequest, NextResponse } from "next/server";
import { searchCbetaTexts } from "@/lib/cbeta/server";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");
    if (!query || !query.trim()) {
      return NextResponse.json({ texts: [] });
    }

    const results = await searchCbetaTexts(query);
    return NextResponse.json({ texts: results ?? [] });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Search failed", texts: [] },
      { status: 500 }
    );
  }
}
