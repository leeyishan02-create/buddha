import { notFound, redirect } from "next/navigation";
import { ReadingHeader } from "@/components/reader/ReadingHeader";
import { ReadingControls } from "@/components/reader/ReadingControls";
import { CbetaTextContent } from "@/components/reader/CbetaTextContent";
import { FascicleNav } from "@/components/reader/FascicleNav";
import { TableOfContents } from "@/components/reader/TableOfContents";
import { ReadingProgress } from "@/components/reader/ReadingProgress";
import { ReadingPrefsProvider } from "@/components/reader/ReadingPrefsProvider";
import { getTextContent, getTableOfContents } from "@/lib/cbeta/server";

interface ReaderPageProps {
  params: Promise<{ catalogId: string }>;
  searchParams: Promise<{ vol?: string }>;
}

export default async function ReaderPage({ params, searchParams }: ReaderPageProps) {
  const { catalogId } = await params;
  const { vol } = await searchParams;
  const fascicleNum = vol ? parseInt(vol, 10) : 1;

  if (isNaN(fascicleNum) || fascicleNum < 1) {
    redirect(`/text/${catalogId}`);
  }

  const content = await getTextContent(catalogId, fascicleNum);

  if (!content) {
    if (fascicleNum > 1) {
      redirect(`/text/${catalogId}`);
    }
    notFound();
  }

  // Get total fascicle count from TOC
  const toc = await getTableOfContents(catalogId);
  const totalFascicles = toc.length > 0 ? toc.length : 1;

  return (
    <ReadingPrefsProvider>
      <div className="relative min-h-screen">
        <ReadingHeader
          title={content.title}
          translator={content.translator ?? ""}
          catalogId={content.id}
          fascicleNum={content.fascicleNum}
          totalFascicles={totalFascicles}
        />
        <ReadingProgress />
        <CbetaTextContent content={content} />
        <FascicleNav
          catalogId={content.id}
          fascicleNum={content.fascicleNum}
          totalFascicles={totalFascicles}
        />
        <TableOfContents catalogId={content.id} />
        <ReadingControls />
      </div>
    </ReadingPrefsProvider>
  );
}
