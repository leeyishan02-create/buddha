"use client";

import { useEffect, useRef } from "react";
import { addReadingHistory } from "@/lib/db/reading-history";

interface SaveReadingHistoryProps {
  id: string;
  title: string;
  translator: string;
  fascicleNum: number;
}

export function SaveReadingHistory({
  id,
  title,
  translator,
  fascicleNum,
}: SaveReadingHistoryProps) {
  const hasSaved = useRef(false);

  useEffect(() => {
    if (!hasSaved.current) {
      addReadingHistory({ id, title, translator, fascicleNum });
      hasSaved.current = true;
    }
  }, [id, title, translator, fascicleNum]);

  return null;
}
