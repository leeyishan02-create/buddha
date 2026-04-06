import { NextRequest, NextResponse } from "next/server";
import { searchCbetaTexts } from "@/lib/cbeta/server";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const offset = parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10);

    const result = await searchCbetaTexts(query, isNaN(offset) ? 0 : offset);

    if (!result) {
      return NextResponse.json(
        { error: "搜索服务暂时不可用", texts: [], total: 0, hasMore: false },
        { status: 503 }
      );
    }

    const response = NextResponse.json(result);
    response.headers.set("Cache-Control", "public, max-age=300"); // 5 min browser cache
    return response;
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Search failed", texts: [], total: 0, hasMore: false },
      { status: 500 }
    );
  }
}
