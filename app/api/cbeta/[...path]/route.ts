// ============================================
// CBETA API Proxy Route
// Proxies requests to CBETA Online API
// Handles CORS, caching, and error handling
// ============================================

import { NextRequest, NextResponse } from "next/server";

const CBETA_API_BASE = "http://cbdata.dila.edu.tw/v1.2";
const CACHE_TTL: Record<string, number> = {
  search: 5 * 60,        // 5 minutes
  text: 24 * 60 * 60,    // 24 hours
  content: 60 * 60,      // 1 hour
  catalog: 24 * 60 * 60, // 24 hours
};

const cache = new Map<string, { data: unknown; expires: number }>();

function getCacheKey(path: string): string {
  return path;
}

function getCached(path: string): unknown | null {
  const key = getCacheKey(path);
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(path: string, data: unknown): void {
  const key = getCacheKey(path);
  const ttl = Object.entries(CACHE_TTL).find(([prefix]) =>
    path.startsWith(`/${prefix}`)
  )?.[1] ?? 5 * 60;

  cache.set(key, {
    data,
    expires: Date.now() + ttl * 1000,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const apiPath = `/${path.join("/")}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const fullUrl = searchParams ? `${apiPath}?${searchParams}` : apiPath;

    // Check cache
    const cached = getCached(fullUrl);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    // Fetch from CBETA API
    const cbetaUrl = `${CBETA_API_BASE}${fullUrl}`;
    const response = await fetch(cbetaUrl, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Not found", status: 404 },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "CBETA API error", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Cache the response
    setCache(fullUrl, data);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("CBETA API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from CBETA API", status: 500 },
      { status: 500 }
    );
  }
}
