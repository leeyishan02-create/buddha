import { NextRequest, NextResponse } from "next/server";
import { getTableOfContents } from "@/lib/deerpark/server";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const toc = await getTableOfContents(id);
    return NextResponse.json({ fascicles: toc });
  } catch (error) {
    console.error("TOC API error:", error);
    return NextResponse.json({ error: "Failed to load TOC" }, { status: 500 });
  }
}
