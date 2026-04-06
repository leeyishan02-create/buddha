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

export type StorageError = { type: "quota_exceeded" } | { type: "unknown"; message: string };

function handleStorageError(error: unknown): StorageError {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return { type: "quota_exceeded" };
  }
  return { type: "unknown", message: error instanceof Error ? error.message : "Unknown error" };
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

export function setBookmarks(bookmarks: Bookmark[]): { success: boolean; error?: StorageError } {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return { success: true };
  } catch (error) {
    return { success: false, error: handleStorageError(error) };
  }
}

export function addBookmark(bookmark: Bookmark): { success: boolean; bookmarks: Bookmark[]; error?: StorageError } {
  const bookmarks = getBookmarks();
  // Prevent duplicates
  if (bookmarks.some((b) => b.id === bookmark.id)) {
    return { success: true, bookmarks };
  }
  const updated = [bookmark, ...bookmarks];
  const result = setBookmarks(updated);
  return { ...result, bookmarks: updated };
}

export function removeBookmark(bookmarkId: string): { success: boolean; bookmarks: Bookmark[]; error?: StorageError } {
  const bookmarks = getBookmarks();
  const updated = bookmarks.filter((b) => b.id !== bookmarkId);
  const result = setBookmarks(updated);
  return { ...result, bookmarks: updated };
}

export function hasBookmark(bookmarkId: string): boolean {
  return getBookmarks().some((b) => b.id === bookmarkId);
}

export function clearAllBookmarks(): { success: boolean; error?: StorageError } {
  return setBookmarks([]);
}

export function getBookmarkCount(): number {
  return getBookmarks().length;
}
