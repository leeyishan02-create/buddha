// ============================================
// Reading History Storage — localStorage wrapper
// ============================================

const HISTORY_KEY = "reader.recently_read";

export interface ReadingHistoryItem {
  id: string;
  title: string;
  translator: string;
  fascicleNum: number;
  lastReadAt: string;
  readCount: number;
}

export type StorageError = { type: "quota_exceeded" } | { type: "unknown"; message: string };

function handleStorageError(error: unknown): StorageError {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return { type: "quota_exceeded" };
  }
  return { type: "unknown", message: error instanceof Error ? error.message : "Unknown error" };
}

function getHistory(): ReadingHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as ReadingHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setHistory(history: ReadingHistoryItem[]): { success: boolean; error?: StorageError } {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return { success: true };
  } catch (error) {
    return { success: false, error: handleStorageError(error) };
  }
}

// Add or update a reading history entry
export function addReadingHistory(item: {
  id: string;
  title: string;
  translator: string;
  fascicleNum: number;
}): { success: boolean; history: ReadingHistoryItem[]; error?: StorageError } {
  const history = getHistory();
  const existingIndex = history.findIndex((h) => h.id === item.id);

  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    // Update existing entry
    history[existingIndex] = {
      ...history[existingIndex],
      fascicleNum: item.fascicleNum,
      lastReadAt: now,
      readCount: history[existingIndex].readCount + 1,
    };
  } else {
    // Add new entry
    history.unshift({
      id: item.id,
      title: item.title,
      translator: item.translator,
      fascicleNum: item.fascicleNum,
      lastReadAt: now,
      readCount: 1,
    });
  }

  // Keep only the most recent 50 entries
  const trimmed = history.slice(0, 50);
  const result = setHistory(trimmed);
  return { ...result, history: trimmed };
}

// Remove a single history entry
export function removeReadingHistory(id: string): { success: boolean; history: ReadingHistoryItem[]; error?: StorageError } {
  const history = getHistory();
  const updated = history.filter((h) => h.id !== id);
  const result = setHistory(updated);
  return { ...result, history: updated };
}

// Clear all history
export function clearReadingHistory(): { success: boolean; error?: StorageError } {
  return setHistory([]);
}

// Get all history (sorted by most recent)
export function getReadingHistory(): ReadingHistoryItem[] {
  return getHistory().sort(
    (a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime()
  );
}

// Format storage error for display
export function formatStorageError(error: StorageError): string {
  if (error.type === "quota_exceeded") {
    return "存储空间已满，请清除部分数据后重试";
  }
  return "操作失败，请稍后重试";
}
