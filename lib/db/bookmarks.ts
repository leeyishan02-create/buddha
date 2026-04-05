// ============================================
// Bookmark Storage — localStorage wrapper
// ============================================

const BOOKMARKS_KEY = "buddha-bookmarks";

export interface Bookmark {
  id: string;
  catalogId: string;
  title: string;
  translator: string;
  sectionTitle?: string;
  paragraphIndex: number;
  paragraphText: string;
  createdAt: string;
}

export function getBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Bookmark[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setBookmarks(bookmarks: Bookmark[]): void {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export function addBookmark(bookmark: Bookmark): Bookmark[] {
  const bookmarks = getBookmarks();
  // Prevent duplicates
  if (bookmarks.some((b) => b.id === bookmark.id)) {
    return bookmarks;
  }
  const updated = [bookmark, ...bookmarks];
  setBookmarks(updated);
  return updated;
}

export function removeBookmark(bookmarkId: string): Bookmark[] {
  const bookmarks = getBookmarks();
  const updated = bookmarks.filter((b) => b.id !== bookmarkId);
  setBookmarks(updated);
  return updated;
}

export function hasBookmark(bookmarkId: string): boolean {
  return getBookmarks().some((b) => b.id === bookmarkId);
}

export function clearAllBookmarks(): void {
  setBookmarks([]);
}

export function getBookmarkCount(): number {
  return getBookmarks().length;
}
