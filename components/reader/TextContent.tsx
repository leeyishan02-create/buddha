"use client";

import { useMemo } from "react";
import { useReaderContext } from "./ReadingPrefsProvider";
import type { MockTextContent, TextSection } from "@/lib/data/mock-content";

interface TextContentProps {
  content: MockTextContent;
}

const CONTENT_WIDTH_CLASS: Record<string, string> = {
  narrow: "max-w-2xl",
  medium: "max-w-3xl",
  wide: "max-w-5xl",
  full: "max-w-7xl",
};

export function TextContent({ content }: TextContentProps) {
  const { fontSize, fontFamily, lineHeight, contentWidth, isLoaded } = useReaderContext();

  const contentWidthClass = useMemo(
    () => CONTENT_WIDTH_CLASS[contentWidth] ?? "max-w-3xl",
    [contentWidth],
  );

  const textStyle = useMemo(
    () => ({
      lineHeight: String(lineHeight),
      fontSize: `${fontSize}px`,
    }),
    [lineHeight, fontSize],
  );

  const fontClass =
    fontFamily === "sans"
      ? "font-ui"
      : fontFamily === "kai"
        ? "font-kai"
        : fontFamily === "fangsong"
          ? "font-fangsong"
          : "font-reading";

  if (!isLoaded) {
    const skeletonWidths = ["100%", "85%", "92%", "78%", "96%", "70%", "88%", "82%"];
    return (
      <div className={`mx-auto ${contentWidthClass} px-4 py-12 sm:px-6`}>
        <div className="space-y-6">
          {skeletonWidths.map((width, i) => (
            <div
              key={i}
              className="skeleton h-5 rounded"
              style={{ width }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <article
      className={`mx-auto ${contentWidthClass} px-4 py-8 sm:px-6 sm:py-12 ${fontClass} text-text-primary tracking-[0.05em]`}
      style={textStyle}
      role="article"
      aria-label={content.title}
    >
      {content.volumes.map((volume) =>
        volume.sections.map((section: TextSection) => (
          <section
            key={section.id}
            className="mb-8 scroll-mt-20"
            id={section.id}
          >
            {section.title && (
              <h2
                className="mb-6 text-center font-reading text-2xl font-bold text-text-primary sm:text-3xl"
              >
                {section.title}
              </h2>
            )}
            <div className="space-y-6">
              {section.paragraphs.map((para, idx) => (
                <p
                  key={idx}
                  className="text-justify indent-8"
                  style={textStyle}
                >
                  {para}
                </p>
              ))}
            </div>
          </section>
        )),
      )}
    </article>
  );
}
