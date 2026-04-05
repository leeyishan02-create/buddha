import { NextRequest, NextResponse } from "next/server";
import { searchCbetaTexts } from "@/lib/cbeta/server";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const offset = parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10);

    const result = await searchCbetaTexts(query, isNaN(offset) ? 0 : offset);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Search failed", texts: [], total: 0, hasMore: false },
      { status: 500 }
    );
  }
}
