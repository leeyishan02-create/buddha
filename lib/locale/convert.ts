// ============================================
// Chinese Conversion Utilities
// Uses opencc-js for Traditional <-> Simplified
// ============================================

import * as OpenCC from "opencc-js";

export type Locale = "zh-Hant" | "zh-Hans";

// Create converters (lazy initialization)
let twToCn: ((text: string) => string) | null = null;
let cnToTw: ((text: string) => string) | null = null;

function getTwToCn(): (text: string) => string {
  if (!twToCn) {
    twToCn = OpenCC.Converter({ from: "tw", to: "cn" });
  }
  return twToCn!;
}

function getCnToTw(): (text: string) => string {
  if (!cnToTw) {
    cnToTw = OpenCC.Converter({ from: "cn", to: "tw" });
  }
  return cnToTw!;
}

// Convert text to Simplified Chinese
export function toSimplified(text: string): string {
  return getTwToCn()(text);
}

// Convert text to Traditional Chinese
export function toTraditional(text: string): string {
  return getCnToTw()(text);
}

// Convert text based on target locale
export function convertText(text: string, target: Locale): string {
  if (target === "zh-Hans") {
    return toSimplified(text);
  }
  return toTraditional(text);
}
