"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, BookOpen, X } from "lucide-react";
import { useReaderContext } from "./ReadingPrefsProvider";
import { useLocale } from "@/lib/locale/useLocale";
import type {
  CbetaContent,
  CbetaParagraph,
  CbetaFootnote,
} from "@/lib/cbeta/types";

interface CbetaTextContentProps {
  content: CbetaContent;
}

const CONTENT_WIDTH_CLASS: Record<string, string> = {
  narrow: "max-w-2xl",
  medium: "max-w-3xl",
  wide: "max-w-5xl",
  full: "max-w-7xl",
};

// Footnote popover for desktop
function FootnotePopover({
  footnote,
  onClose,
  buttonRef,
}: {
  footnote: CbetaFootnote;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, buttonRef]);

  return (
    <span
      ref={popoverRef}
      className="absolute z-50 block w-72 rounded-lg border border-border bg-bg-elevated p-4 shadow-xl shadow-black/10"
      style={{ left: 0, top: "100%", marginTop: "4px", animation: "fadeIn 150ms ease-out" }}
      role="tooltip"
    >
      <span className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-accent font-ui">
          {footnote.label}
        </span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-text-tertiary transition-colors hover:text-text-primary hover:bg-bg-secondary"
            aria-label="关闭注释"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
      <span className="block text-sm leading-relaxed text-text-secondary">
        {footnote.content}
      </span>
    </span>
  );
}

// Footnote bottom sheet for mobile
function FootnoteBottomSheet({
  footnote,
  onClose,
}: {
  footnote: CbetaFootnote;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <>
      <span
        className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
        style={{ display: "block" }}
      />
      <span
        className="fixed bottom-0 left-0 right-0 z-50 block rounded-t-2xl border-t border-border bg-bg-elevated p-5 shadow-xl lg:hidden"
        style={{ animation: "slideUp 200ms ease-out" }}
        role="dialog"
        aria-label={`注释 ${footnote.label}`}
      >
        <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-border" />
        <span className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold text-accent font-ui">
            {footnote.label}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          aria-label="关闭注释"
          >
            <X className="h-5 w-5" />
          </button>
        </span>
        <span className="block text-sm leading-relaxed text-text-secondary">
          {footnote.content}
        </span>
      </span>
    </>
  );
}

// Paragraph with inline footnote markers
function ParagraphWithFootnotes({
  paragraph,
  onFootnoteClick,
  activeFootnoteId,
  textStyle,
  footnotes,
}: {
  paragraph: CbetaParagraph;
  onFootnoteClick: (fnId: string, buttonEl: HTMLButtonElement) => void;
  activeFootnoteId: string | null;
  textStyle: React.CSSProperties;
  footnotes: CbetaFootnote[];
}) {
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const parts = paragraph.text.split("§FOOTNOTE§");
  const footnoteRefs = paragraph.footnotes;

  if (footnoteRefs.length === 0) {
    return (
      <p className="text-justify indent-8" style={textStyle}>
        {paragraph.text}
      </p>
    );
  }

  return (
    <p className="text-justify indent-8" style={textStyle}>
      {parts.map((part, i) => (
        <span key={i} className="relative inline">
          {part}
          {footnoteRefs[i] && (
            <span className="relative inline-block">
              <button
                ref={(el) => {
                  if (el) buttonRefs.current.set(footnoteRefs[i].id, el);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onFootnoteClick(footnoteRefs[i].id, e.currentTarget);
                }}
                className={`inline-block mx-0.5 text-xs font-bold align-super leading-none transition-colors cursor-pointer rounded px-0.5 focus-visible:outline-2 focus-visible:outline-border-focus ${
                  activeFootnoteId === footnoteRefs[i].id
                    ? "bg-accent text-white"
                    : "text-accent hover:text-accent-hover"
                }`}
                aria-label={`查看注释 ${footnoteRefs[i].label}`}
                aria-expanded={activeFootnoteId === footnoteRefs[i].id}
              >
                {footnoteRefs[i].label}
              </button>
              {/* Desktop popover */}
              {activeFootnoteId === footnoteRefs[i].id && (
                <span className="hidden lg:block">
                  {(() => {
                    const fn = footnotes.find(
                      (f) => f.id === footnoteRefs[i].id
                    );
                    const btn = buttonRefs.current.get(footnoteRefs[i].id);
                    if (!fn || !btn) return null;
                    return (
                      <FootnotePopover
                        footnote={fn}
                        onClose={() => onFootnoteClick("", btn)}
                        buttonRef={{ current: btn }}
                      />
                    );
                  })()}
                </span>
              )}
            </span>
          )}
        </span>
      ))}
    </p>
  );
}

// Metadata collapsible section
function MetadataSection({
  metadata,
}: {
  metadata: NonNullable<CbetaContent["metadata"]>;
}) {
  const [open, setOpen] = useState(false);

  const fields: { label: string; value?: string }[] = [
    { label: "經文資訊", value: metadata.source },
    { label: "版本记录", value: metadata.version },
    { label: "編輯說明", value: metadata.editor },
    { label: "原始資料", value: metadata.originalData },
    { label: "其他事項", value: metadata.other },
  ].filter((f) => f.value);

  if (fields.length === 0) return null;

  return (
    <div className="mt-8 border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-ui text-text-secondary transition-colors hover:bg-bg-secondary focus-visible:outline-2 focus-visible:outline-border-focus"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          經文資訊
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="space-y-2 px-4 pb-4 text-sm text-text-secondary">
          {fields.map((field) => (
            <div key={field.label}>
              <span className="font-medium text-text-primary">
                {field.label}：
              </span>
              {field.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Collapsible footnotes list
function FootnotesList({
  footnotes,
  activeFootnoteId,
  onFootnoteClick,
}: {
  footnotes: CbetaFootnote[];
  activeFootnoteId: string | null;
  onFootnoteClick: (fnId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8 border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-ui text-text-secondary transition-colors hover:bg-bg-secondary focus-visible:outline-2 focus-visible:outline-border-focus"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          校勘记（{footnotes.length} 则）
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="space-y-2 px-4 pb-4">
          {footnotes.map((fn) => (
            <button
              key={fn.id}
              id={`fn-${fn.id}`}
              onClick={() => onFootnoteClick(fn.id)}
              className={`flex w-full gap-3 rounded-lg p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-border-focus ${
                activeFootnoteId === fn.id
                  ? "bg-accent-light border border-accent/20"
                  : "hover:bg-bg-secondary"
              }`}
            >
              <span className="shrink-0 text-sm font-bold text-accent font-ui">
                {fn.label}
              </span>
              <p className="text-sm leading-relaxed text-text-secondary">
                {fn.content}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CbetaTextContent({ content }: CbetaTextContentProps) {
  const { fontSize, fontFamily, lineHeight, contentWidth, isLoaded } =
    useReaderContext();
  const { locale, convert } = useLocale();
  const [activeFootnote, setActiveFootnote] = useState<string | null>(null);

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

  const handleFootnoteClick = useCallback(
    (fnId: string, buttonEl?: HTMLButtonElement) => {
      if (!fnId) {
        setActiveFootnote(null);
        return;
      }
      setActiveFootnote((prev) => (prev === fnId ? null : fnId));
      // On mobile, scroll to footnote in the list
      if (window.innerWidth < 1024) {
        const el = document.getElementById(`fn-${fnId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    },
    [],
  );

  // Convert content based on locale
  const convertedContent = useMemo(() => {
    if (locale === "zh-Hant") return content;

    return {
      ...content,
      title: convert(content.title),
      translator: content.translator ? convert(content.translator) : undefined,
      fascicles: content.fascicles.map((fascicle) => ({
        ...fascicle,
        label: convert(fascicle.label),
        sections: fascicle.sections.map((section) => ({
          ...section,
          title: section.title ? convert(section.title) : undefined,
          paragraphs: section.paragraphs.map((para) => ({
            ...para,
            text: convert(para.text),
            footnotes: para.footnotes.map((fn) => ({
              ...fn,
              label: convert(fn.label),
            })),
          })),
        })),
      })),
      footnotes: content.footnotes.map((fn) => ({
        ...fn,
        label: convert(fn.label),
        content: convert(fn.content),
      })),
      metadata: content.metadata
        ? {
            source: content.metadata.source ? convert(content.metadata.source) : undefined,
            version: content.metadata.version ? convert(content.metadata.version) : undefined,
            editor: content.metadata.editor ? convert(content.metadata.editor) : undefined,
            originalData: content.metadata.originalData ? convert(content.metadata.originalData) : undefined,
            other: content.metadata.other ? convert(content.metadata.other) : undefined,
          }
        : undefined,
    };
  }, [content, locale, convert]);

  if (!isLoaded) {
    const skeletonWidths = [
      "100%",
      "85%",
      "92%",
      "78%",
      "96%",
      "70%",
      "88%",
      "82%",
    ];
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

  const activeFootnoteData =
    activeFootnote && convertedContent.footnotes
      ? convertedContent.footnotes.find((f) => f.id === activeFootnote)
      : null;

  return (
    <article
      className={`mx-auto ${contentWidthClass} px-4 py-8 sm:px-6 sm:py-12 ${fontClass} text-text-primary tracking-[0.05em]`}
      role="article"
      aria-label={convertedContent.title}
    >
      {convertedContent.fascicles.map((fascicle) =>
        fascicle.sections.map((section) => (
          <section
            key={section.id}
            className="mb-8 scroll-mt-20"
            id={section.id}
          >
            {section.title && (
              <h2 className="mb-6 text-center font-reading text-2xl font-bold text-text-primary sm:text-3xl">
                {section.title}
              </h2>
            )}
            <div className="space-y-6">
              {section.paragraphs.map((para, idx) => (
                <ParagraphWithFootnotes
                  key={idx}
                  paragraph={para}
                  onFootnoteClick={handleFootnoteClick}
                  activeFootnoteId={activeFootnote}
                  textStyle={textStyle}
                  footnotes={convertedContent.footnotes || []}
                />
              ))}
            </div>
          </section>
        )),
      )}

      {/* Collapsible Footnotes List */}
      {convertedContent.footnotes && convertedContent.footnotes.length > 0 && (
        <FootnotesList
          footnotes={convertedContent.footnotes}
          activeFootnoteId={activeFootnote}
          onFootnoteClick={(fnId) => handleFootnoteClick(fnId)}
        />
      )}

      {/* Metadata Section */}
      {convertedContent.metadata && <MetadataSection metadata={convertedContent.metadata} />}

      {/* Mobile bottom sheet for active footnote */}
      {activeFootnote && activeFootnoteData && (
        <span className="lg:hidden">
          <FootnoteBottomSheet
            footnote={activeFootnoteData}
            onClose={() => setActiveFootnote(null)}
          />
        </span>
      )}
    </article>
  );
}
