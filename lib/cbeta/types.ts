// ============================================
// Deer Park API Type Definitions
// Based on deerpark.app API
// ============================================

export interface DeerparkWork {
  id: string;
  title: string;
  byline: string;
  juans: number[];
  chars: number;
  alias?: string;
  alt?: string;
}

export interface DeerparkJuan {
  file: string;
  lb: string;
  juan: number;
  title: string;
}

export interface DeerparkMulu {
  indent: number;
  title: string;
  juan: number;
  lb: string;
}

export interface DeerparkTOC {
  juans: DeerparkJuan[];
  mulu: DeerparkMulu[];
}

export interface DeerparkSearchResult {
  found: number;
  works: {
    search_results: number;
    id: string;
    title: string;
    byline: string;
    juans: number[];
    chars: number;
  }[];
}

export interface DeerparkInTextSearchResult {
  found: number;
  results: {
    juan: number;
    lb: string;
    paragraph: string;
  }[];
}

export interface CbetaFascicleInfo {
  num: number;
  title: string;
  id: string;
}

export interface CbetaText {
  id: string;
  title: string;
  author?: string;
  translator?: string;
  juan?: string;
  vol: string;
  category?: string;
}

export interface CbetaFascicleContent {
  id: string;
  label: string;
  sections: CbetaSection[];
}

export interface CbetaSection {
  id: string;
  title?: string;
  paragraphs: CbetaParagraph[];
}

export interface CbetaParagraph {
  text: string;
  footnotes: CbetaFootnoteRef[];
}

export interface CbetaFootnoteRef {
  id: string;
  label: string;
  anchorId: string;
}

export interface CbetaFootnote {
  id: string;
  anchorId: string;
  label: string;
  content: string;
}

export interface CbetaMetadata {
  source?: string;
  version?: string;
  editor?: string;
  originalData?: string;
  other?: string;
}

export interface CbetaContent {
  id: string;
  title: string;
  translator?: string;
  canon: string;
  fascicles: CbetaFascicleContent[];
  footnotes: CbetaFootnote[];
  metadata?: CbetaMetadata;
  fascicleNum: number;
  totalFascicles: number;
}

export type SearchType = "title" | "author" | "translator" | "all";

export interface SearchParams {
  query: string;
  type?: SearchType;
  canon?: string;
  page?: number;
  pageSize?: number;
}
