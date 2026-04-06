// ============================================
// Deer Park API Server-side Functions
// Uses deerpark.app API
// ============================================

import type {
  CbetaText,
  CbetaContent,
  CbetaFascicleContent,
  CbetaSection,
  CbetaParagraph,
  CbetaMetadata,
  CbetaFascicleInfo,
  DeerparkWork,
  DeerparkTOC,
} from "./types";
import { toSimplified } from "@/lib/locale/convert";

const DEERPARK_API = "https://deerpark.app/api/v1";
const TIMEOUT_MS = 20000;

// Cache
const allWorksCache = { data: null as DeerparkWork[] | null, fetched: 0 };
const tocCache = new Map<string, DeerparkTOC>();

async function fetchWithTimeout(url: string): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch {
    return null;
  }
}

// ============================================
// All Works (for search index)
// ============================================

async function getAllWorks(): Promise<DeerparkWork[] | null> {
  if (allWorksCache.data && Date.now() - allWorksCache.fetched < 3600000) {
    return allWorksCache.data;
  }

  const res = await fetchWithTimeout(`${DEERPARK_API}/allworks`);
  if (!res || !res.ok) return null;

  const data = await res.json();
  // Convert all titles and bylines to Simplified Chinese on cache load
  allWorksCache.data = data.map((w: DeerparkWork) => ({
    ...w,
    title: toSimplified(w.title),
    byline: toSimplified(w.byline),
    alias: w.alias ? toSimplified(w.alias) : undefined,
  }));
  allWorksCache.fetched = Date.now();
  return allWorksCache.data;
}

// ============================================
// Search — all series
// ============================================

export interface SearchResult {
  texts: CbetaText[];
  total: number;
  hasMore: boolean;
}

const PAGE_SIZE = 50;

export async function searchCbetaTexts(
  query: string,
  offset: number = 0
): Promise<SearchResult | null> {
  const works = await getAllWorks();

  if (!works) return null;

  // If no query, return all works
  if (!query.trim()) {
    const total = works.length;
    const page = works.slice(offset, offset + PAGE_SIZE);
    return {
      texts: page.map((w: DeerparkWork) => ({
        id: w.id,
        title: w.title,
        translator: w.byline || "",
        vol: w.id.substring(0, 3),
        juan: String(w.juans.length),
        category: w.id.substring(0, 1),
      })),
      total,
      hasMore: offset + PAGE_SIZE < total,
    };
  }

  // Search by query — normalize to Simplified for matching
  const normalizedQuery = toSimplified(query).toLowerCase();
  const matchedWorks = works.filter(
    (w: DeerparkWork) =>
      w.title.toLowerCase().includes(normalizedQuery) ||
      w.byline.toLowerCase().includes(normalizedQuery) ||
      (w.alias && w.alias.toLowerCase().includes(normalizedQuery))
  );

  // Sort: exact title match first, then shorter title
  matchedWorks.sort((a: DeerparkWork, b: DeerparkWork) => {
    const aExactMatch = a.title === toSimplified(query) || a.title.includes(toSimplified(query));
    const bExactMatch = b.title === toSimplified(query) || b.title.includes(toSimplified(query));
    if (aExactMatch && !bExactMatch) return -1;
    if (!aExactMatch && bExactMatch) return 1;

    return a.title.length - b.title.length;
  });

  const total = matchedWorks.length;
  const page = matchedWorks.slice(offset, offset + PAGE_SIZE);

  return {
    texts: page.map((w: DeerparkWork) => ({
      id: w.id,
      title: w.title,
      translator: w.byline || "",
      vol: w.id.substring(0, 3),
      juan: String(w.juans.length),
      category: w.id.substring(0, 1),
    })),
    total,
    hasMore: offset + PAGE_SIZE < total,
  };
}

// ============================================
// TOC
// ============================================

export async function getTableOfContents(id: string): Promise<CbetaFascicleInfo[]> {
  if (tocCache.has(id)) {
    const cached = tocCache.get(id)!;
    return cached.juans.map((j) => ({
      num: j.juan,
      title: j.title || `卷第${j.juan}`,
      id: `${id}_${String(j.juan).padStart(3, "0")}`,
    }));
  }

  const res = await fetchWithTimeout(`${DEERPARK_API}/toc/${id}`);
  if (!res || !res.ok) return [];

  const toc: DeerparkTOC = await res.json();
  tocCache.set(id, toc);

  return toc.juans.map((j) => ({
    num: j.juan,
    title: j.title || `卷第${j.juan}`,
    id: `${id}_${String(j.juan).padStart(3, "0")}`,
  }));
}

// ============================================
// Get text content
// ============================================

export type TextContentError = 'network' | 'parse' | 'not_found';

export interface TextContentResult {
  content: CbetaContent | null;
  error?: TextContentError;
}

// Get a single work from allWorks cache
async function getWorkById(id: string): Promise<DeerparkWork | null> {
  const works = await getAllWorks();
  if (!works) return null;
  return works.find((w: DeerparkWork) => w.id === id) ?? null;
}

export async function getTextContent(
  id: string,
  fascicleNum: number = 1
): Promise<TextContentResult> {
  const res = await fetchWithTimeout(
    `${DEERPARK_API}/html/${id}/${fascicleNum}`
  );

  if (!res) {
    return { content: null, error: 'network' };
  }

  if (res.status === 404) {
    return { content: null, error: 'not_found' };
  }

  if (!res.ok) {
    return { content: null, error: 'network' };
  }

  const html = await res.text();

  // Get translator from allWorks API for consistency with search results
  const work = await getWorkById(id);
  const translator = work?.byline || undefined;

  const content = parseHtmlToContent(html, id, fascicleNum, translator);
  if (!content) {
    return { content: null, error: 'parse' };
  }

  return { content };
}

// Parse Deer Park HTML to structured content
function parseHtmlToContent(
  html: string,
  id: string,
  fascicleNum: number,
  translator?: string
): CbetaContent | null {
  try {
    const titleMatch = html.match(/<h1 id="title">(.*?)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim() : id;

    const bodyMatch = html.match(/<section class="sutra-body">([\s\S]*?)<\/section>/);
    if (!bodyMatch) return null;

    const bodyHtml = bodyMatch[1];
    const paragraphs: CbetaParagraph[] = [];

    const paraRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let paraMatch;

    while ((paraMatch = paraRegex.exec(bodyHtml)) !== null) {
      const rawHtml = paraMatch[1];

      if (rawHtml.includes('class="byline"')) continue;

      const text = rawHtml
        .replace(/<a[^>]*class="noteAnchor"[^>]*>[\s\S]*?<\/a>/g, "")
        .replace(/<span class="lb"[^>]*>[\s\S]*?<\/span>/g, "")
        .replace(/<span[^>]*>/g, "")
        .replace(/<\/span>/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();

      if (text) {
        paragraphs.push({ text, footnotes: [] });
      }
    }

    const sections: CbetaSection[] = [];
    if (paragraphs.length > 0) {
      sections.push({
        id: "sec-1",
        title: undefined,
        paragraphs,
      });
    }

    const paddedNum = String(fascicleNum).padStart(3, "0");

    const fascicle: CbetaFascicleContent = {
      id: `${id}_${paddedNum}`,
      label: `卷${fascicleNum}`,
      sections,
    };

    return {
      id,
      title,
      translator,
      canon: "T",
      fascicles: [fascicle],
      footnotes: [],
      metadata: {
        source: `Deer Park API (${id})`,
        originalData: "CBETA (CC BY-NC-SA 3.0)",
      },
      fascicleNum,
      totalFascicles: 1,
    };
  } catch (error) {
    console.error("HTML parse error:", error);
    return null;
  }
}

// ============================================
// Featured texts
// ============================================

export async function getFeaturedTexts(ids: string[]): Promise<CbetaText[]> {
  const works = await getAllWorks();
  if (!works) return [];

  const results: CbetaText[] = [];
  for (const id of ids) {
    const work = works.find((w: DeerparkWork) => w.id === id);
    if (work) {
      results.push({
        id: work.id,
        title: work.title,
        translator: work.byline || "",
        vol: work.id.substring(0, 3),
        juan: String(work.juans.length),
        category: work.id.substring(0, 1),
      });
    }
  }
  return results;
}

export function getTotalTextCount(): number {
  return allWorksCache.data?.length ?? 4600;
}
