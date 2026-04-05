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
  CbetaFootnote,
  CbetaFootnoteRef,
  CbetaMetadata,
  CbetaFascicleInfo,
  DeerparkWork,
  DeerparkTOC,
} from "./types";

const DEERPARK_API = "https://deerpark.app/api/v1";
const TIMEOUT_MS = 10000;

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
  // Cache for 1 hour
  if (allWorksCache.data && Date.now() - allWorksCache.fetched < 3600000) {
    return allWorksCache.data;
  }

  const res = await fetchWithTimeout(`${DEERPARK_API}/allworks`);
  if (!res || !res.ok) return null;

  const data = await res.json();
  allWorksCache.data = data;
  allWorksCache.fetched = Date.now();
  return data;
}

// ============================================
// Search
// ============================================

export async function searchCbetaTexts(query: string): Promise<CbetaText[] | null> {
  if (!query.trim()) return null;

  // Try full-text search first
  const res = await fetchWithTimeout(
    `${DEERPARK_API}/fts/works/${encodeURIComponent(query)}`
  );

  if (res && res.ok) {
    const data = await res.json();
    if (data.found > 0 && data.works?.length > 0) {
      return data.works.slice(0, 50).map((w: any) => ({
        id: w.id,
        title: w.title,
        translator: parseByline(w.byline),
        vol: w.id.substring(0, 3),
        juan: String(w.juans.length),
        category: w.id.substring(0, 1),
      }));
    }
  }

  // Fallback: search in allworks
  const works = await getAllWorks();
  if (!works) return null;

  const lowerQuery = query.toLowerCase();
  return works
    .filter(
      (w) =>
        w.title.toLowerCase().includes(lowerQuery) ||
        w.byline.toLowerCase().includes(lowerQuery) ||
        (w.alias && w.alias.toLowerCase().includes(lowerQuery))
    )
    .slice(0, 50)
    .map((w) => ({
      id: w.id,
      title: w.title,
      translator: parseByline(w.byline),
      vol: w.id.substring(0, 3),
      juan: String(w.juans.length),
      category: w.id.substring(0, 1),
    }));
}

function parseByline(byline: string): string {
  return byline || "";
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

export async function getTextContent(
  id: string,
  fascicleNum: number = 1
): Promise<CbetaContent | null> {
  const res = await fetchWithTimeout(
    `${DEERPARK_API}/html/${id}/${fascicleNum}`
  );

  if (!res || !res.ok) return null;

  const html = await res.text();
  return parseHtmlToContent(html, id, fascicleNum);
}

// Parse Deer Park HTML to structured content
function parseHtmlToContent(
  html: string,
  id: string,
  fascicleNum: number
): CbetaContent | null {
  try {
    // Extract title from <h1 id="title">
    const titleMatch = html.match(/<h1 id="title">(.*?)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim() : id;

    // Extract byline from <p class="byline">
    const bylineMatch = html.match(/<p class="byline">(.*?)<\/p>/);
    const translator = bylineMatch
      ? bylineMatch[1].replace(/<[^>]+>/g, "").trim()
      : undefined;

    // Extract paragraphs from <article class="sutra-content">
    // Deer Park uses <p> tags with <span class="t"> for text
    const bodyMatch = html.match(/<section class="sutra-body">([\s\S]*?)<\/section>/);
    if (!bodyMatch) return null;

    const bodyHtml = bodyMatch[1];
    const paragraphs: CbetaParagraph[] = [];

    // Extract paragraphs - Deer Park uses <p> tags
    const paraRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let paraMatch;

    while ((paraMatch = paraRegex.exec(bodyHtml)) !== null) {
      const rawHtml = paraMatch[1];

      // Skip byline paragraphs
      if (rawHtml.includes('class="byline"')) continue;

      // Extract text content, removing ALL footnote anchors and HTML tags
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

    // Build sections from paragraphs
    // Deer Park doesn't have explicit section markers, so we group all paragraphs
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
        version: undefined,
        editor: undefined,
        originalData: "CBETA (CC BY-NC-SA 3.0)",
        other: undefined,
      },
      fascicleNum: fascicleNum,
      totalFascicles: 1, // Will be updated by TOC API
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
    const work = works.find((w) => w.id === id);
    if (work) {
      results.push({
        id: work.id,
        title: work.title,
        translator: parseByline(work.byline),
        vol: work.id.substring(0, 3),
        juan: String(work.juans.length),
        category: work.id.substring(0, 1),
      });
    }
  }
  return results;
}

export function getTaishoTextCount(): number {
  return allWorksCache.data?.length ?? 4303;
}
