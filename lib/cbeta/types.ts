// ============================================
// CBETA API Type Definitions
// Based on cbdata.dila.edu.tw API
// ============================================

export interface CbetaCatalogEntry {
  id: string;
  n: string;
  label: string;
  node_type: string;
  children?: CbetaCatalogEntry[];
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

export interface CbetaSearchResult {
  results: CbetaText[];
  total?: number;
}

export interface CbetaTextDetail {
  id: string;
  title: string;
  translator?: string;
  author?: string;
  vol: string;
  juan?: string;
  category?: string;
}

export interface CbetaFascicle {
  id: string;
  label: string;
  number: number;
  title?: string;
}

export interface CbetaContent {
  id: string;
  title: string;
  translator?: string;
  canon: string;
  fascicles: CbetaFascicleContent[];
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
}

export type SearchType = "title" | "author" | "translator" | "all";

export interface SearchParams {
  query: string;
  type?: SearchType;
  canon?: string;
  page?: number;
  pageSize?: number;
}
