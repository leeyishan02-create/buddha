// ============================================
// CBETA Server-side API Functions
// Uses local search index + CBETA HTML API
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
} from "./types";

import searchIndex from "./search-index.json";

// Search texts using local index
export async function searchCbetaTexts(query: string): Promise<CbetaText[] | null> {
  if (!query.trim()) return null;

  const lowerQuery = query.toLowerCase();
  const results = searchIndex.texts
    .filter((t) => t.searchableText.includes(lowerQuery))
    .slice(0, 50)
    .map((t) => ({
      id: t.id,
      title: t.title,
      author: t.author,
      translator: t.author,
      vol: t.id.substring(0, 3),
      juan: "",
      category: t.edition,
    }));

  return results.length > 0 ? results : null;
}

// Get text detail from local index
export async function getTextDetail(id: string): Promise<CbetaText | null> {
  const entry = searchIndex.texts.find((t) => t.id === id);
  if (!entry) return null;

  return {
    id: entry.id,
    title: entry.title,
    author: entry.author,
    translator: entry.author,
    vol: entry.id.substring(0, 3),
    juan: "",
    category: entry.edition,
  };
}

// Get text content as HTML from CBETA API
export async function getTextHtml(id: string): Promise<string | null> {
  try {
    const res = await fetch(`http://cbdata.dila.edu.tw/stable/download/html/${id}_001.html`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.error(`CBETA HTML error: ${res.status} ${res.statusText}`);
      return null;
    }

    return res.text();
  } catch (error) {
    console.error("CBETA HTML fetch error:", error);
    return null;
  }
}

// Get text content as structured data
export async function getTextContent(id: string): Promise<CbetaContent | null> {
  const html = await getTextHtml(id);
  if (!html) return null;

  return parseHtmlToContent(html, id);
}

// Parse CBETA HTML to structured content with footnotes and metadata
function parseHtmlToContent(html: string, id: string): CbetaContent | null {
  try {
    // Extract title
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch
      ? titleMatch[1].replace(/\s*-\s*CBETA.*$/, "").trim()
      : id;

    // Extract translator
    const translatorMatch = html.match(
      /(?:譯|譯者)[：:]?\s*([^\n<]+)/
    );
    const translator = translatorMatch ? translatorMatch[1].trim() : undefined;

    // Extract footnotes: <span class='footnote' id='n...'>...</span>
    const footnotes: CbetaFootnote[] = [];
    const footnoteRegex = /<span\s+class=['"]footnote['"]\s+id=['"](n[^"']+)['"][^>]*>([\s\S]*?)<\/span>/g;
    let fnMatch;
    while ((fnMatch = footnoteRegex.exec(html)) !== null) {
      const fnId = fnMatch[1];
      const rawContent = fnMatch[2]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim();

      // Extract label like [0749001] or [A1]
      const labelMatch = rawContent.match(/^(\[[^\]]+\])\s*/);
      const label = labelMatch ? labelMatch[1] : fnId;
      const content = labelMatch ? rawContent.slice(labelMatch[0].length).trim() : rawContent;

      // Find corresponding anchor
      const anchorMatch = html.match(new RegExp(`id=['"](${fnId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('n', 'note_anchor_')}|cb_note_anchor\\d+)['"]`));
      const anchorId = anchorMatch ? anchorMatch[1] : fnId;

      footnotes.push({
        id: fnId,
        anchorId,
        label,
        content,
      });
    }

    // Extract metadata from cbeta-copyright div
    const copyrightMatch = html.match(/<div\s+id=['"]cbeta-copyright['"][^>]*>([\s\S]*?)<\/div>/);
    let metadata: CbetaMetadata | undefined;
    if (copyrightMatch) {
      const copyrightHtml = copyrightMatch[1];
      const textContent = copyrightHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      metadata = {};
      const sourceMatch = textContent.match(/【經文資訊】(.+?)(?=【|$)/);
      if (sourceMatch) metadata.source = sourceMatch[1].trim();
      const versionMatch = textContent.match(/【版本記錄】(.+?)(?=【|$)/);
      if (versionMatch) metadata.version = versionMatch[1].trim();
      const editorMatch = textContent.match(/【編輯說明】(.+?)(?=【|$)/);
      if (editorMatch) metadata.editor = editorMatch[1].trim();
      const origMatch = textContent.match(/【原始資料】(.+?)(?=【|$)/);
      if (origMatch) metadata.originalData = origMatch[1].trim();
      const otherMatch = textContent.match(/【其他事項】(.+?)(?=【|$)/);
      if (otherMatch) metadata.other = otherMatch[1].trim();
    }

    // Create a clean version of HTML for paragraph extraction
    // Remove footnote spans and copyright div
    let cleanHtml = html
      .replace(/<span\s+class=['"]footnote['"][^>]*>[\s\S]*?<\/span>/g, "")
      .replace(/<div\s+id=['"]cbeta-copyright['"][^>]*>[\s\S]*?<\/div>/g, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
      .replace(/<head[^>]*>[\s\S]*?<\/head>/g, "")
      .replace(/<html[^>]*>|<\/html>|<body[^>]*>|<\/body>|<div\s+id=['"]body['"]>|<\/div>/g, "");

    // Parse sections and paragraphs
    const sections: CbetaSection[] = [];

    // Try to extract by 分/品/卷 markers in headings
    const sectionRegex = /<h[1-6][^>]*>([^<]*?(?:分|品|卷)[^<]*?)<\/h[1-6]>/g;
    let sectionMatch;
    const sectionRanges: { title: string; start: number; end: number }[] = [];

    while ((sectionMatch = sectionRegex.exec(cleanHtml)) !== null) {
      sectionRanges.push({
        title: sectionMatch[1].trim(),
        start: sectionMatch.index,
        end: sectionRegex.lastIndex,
      });
    }

    // If no sections found, treat entire content as one section
    if (sectionRanges.length === 0) {
      const paragraphs = extractParagraphs(cleanHtml, footnotes);
      if (paragraphs.length > 0) {
        sections.push({
          id: "sec-1",
          title: undefined,
          paragraphs,
        });
      }
    } else {
      // Extract paragraphs for each section
      for (let i = 0; i < sectionRanges.length; i++) {
        const current = sectionRanges[i];
        const next = sectionRanges[i + 1];
        const sectionHtml = next
          ? cleanHtml.substring(current.end, next.start)
          : cleanHtml.substring(current.end);

        const paragraphs = extractParagraphs(sectionHtml, footnotes);

        if (paragraphs.length > 0) {
          sections.push({
            id: `sec-${sections.length + 1}`,
            title: current.title,
            paragraphs,
          });
        }
      }
    }

    const fascicle: CbetaFascicleContent = {
      id: `${id}-vol01`,
      label: "全一卷",
      sections,
    };

    return {
      id,
      title,
      translator,
      canon: "T",
      fascicles: [fascicle],
      footnotes,
      metadata,
    };
  } catch (error) {
    console.error("HTML parse error:", error);
    return null;
  }
}

// Extract paragraphs from HTML, preserving footnote references
function extractParagraphs(html: string, footnotes: CbetaFootnote[]): CbetaParagraph[] {
  const paragraphs: CbetaParagraph[] = [];
  const paraRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let paraMatch;

  while ((paraMatch = paraRegex.exec(html)) !== null) {
    const rawHtml = paraMatch[1];

    // Extract footnote references: <a id="note_anchor_..." class="noteAnchor" href="#n...">[27]</a>
    const footnoteRefs: CbetaFootnoteRef[] = [];
    const anchorRegex = /<a\s+[^>]*id=['"](note_anchor_[^"']+)['"][^>]*href=['"]#([^"']+)['"][^>]*>(\[[^\]]+\])<\/a>/g;
    let anchorMatch;
    while ((anchorMatch = anchorRegex.exec(rawHtml)) !== null) {
      footnoteRefs.push({
        id: anchorMatch[2], // e.g., n0748027
        label: anchorMatch[3], // e.g., [27]
        anchorId: anchorMatch[1], // e.g., note_anchor_0748027
      });
    }

    // Clean text: remove all HTML tags, line info spans, but keep footnote markers
    const text = rawHtml
      .replace(/<a\s+[^>]*class=['"]noteAnchor['"][^>]*>[\s\S]*?<\/a>/g, "§FOOTNOTE§")
      .replace(/<span\s+class=['"]lineInfo['"][^>]*>[\s\S]*?<\/span>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      paragraphs.push({
        text,
        footnotes: footnoteRefs,
      });
    }
  }

  return paragraphs;
}

// Get featured texts from local index
export async function getFeaturedTexts(ids: string[]): Promise<CbetaText[]> {
  const results: CbetaText[] = [];
  for (const id of ids) {
    const entry = searchIndex.texts.find((t) => t.id === id);
    if (entry) {
      results.push({
        id: entry.id,
        title: entry.title,
        author: entry.author || undefined,
        translator: entry.author || undefined,
        vol: entry.id.substring(0, 3),
        juan: "",
        category: entry.edition || undefined,
      });
    }
  }
  return results;
}

// Get all Taisho texts count
export function getTaishoTextCount(): number {
  return searchIndex.totalTexts;
}
