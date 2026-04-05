"use client";

import { useEffect, useState, useCallback } from "react";

// Simple event bus for TOC toggle
const TOC_TOGGLE_EVENT = "buddha:toc-toggle";

export function useTocState() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    window.addEventListener(TOC_TOGGLE_EVENT, handler);
    return () => window.removeEventListener(TOC_TOGGLE_EVENT, handler);
  }, []);

  const toggle = useCallback(() => {
    window.dispatchEvent(new CustomEvent(TOC_TOGGLE_EVENT));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return { open, toggle, close };
}

export function triggerTocToggle() {
  window.dispatchEvent(new CustomEvent(TOC_TOGGLE_EVENT));
}
