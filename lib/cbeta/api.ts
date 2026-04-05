// ============================================
// CBETA API Client
// Communicates with our Next.js API routes
// ============================================

import type {
  CbetaText,
  SearchParams,
} from "./types";

const API_BASE = "/api";

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

// Search texts using local index via API route
export async function searchTexts(params: SearchParams): Promise<CbetaText[] | null> {
  const query = new URLSearchParams();
  query.set("q", params.query);

  const result = await cbetaFetch<{ texts: CbetaText[] }>(`/search?${query.toString()}`);
  return result?.texts ?? null;
}
