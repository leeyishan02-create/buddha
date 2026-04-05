// ============================================
// CBETA API Client
// Communicates with our Next.js API routes
// ============================================

import type { CbetaText } from "./types";

const API_BASE = "/api";

export interface SearchResult {
  texts: CbetaText[];
  total: number;
  hasMore: boolean;
}

async function cbetaFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`);

    if (!res.ok) {
      console.error("API error:", res.status, res.statusText);
      return null;
    }

    return res.json() as Promise<T>;
  } catch (error) {
    console.error("API fetch error:", error);
    return null;
  }
}

// Search texts via API route, supports category filter and pagination
export async function searchTexts(
  query: string,
  category?: string,
  offset: number = 0
): Promise<SearchResult> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("type", category);
  if (offset > 0) params.set("offset", String(offset));

  const result = await cbetaFetch<SearchResult>(`/search?${params.toString()}`);
  return result ?? { texts: [], total: 0, hasMore: false };
}
