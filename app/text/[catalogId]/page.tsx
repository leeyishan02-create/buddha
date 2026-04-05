import { notFound } from "next/navigation";
import { ReadingHeader } from "@/components/reader/ReadingHeader";
import { ReadingControls } from "@/components/reader/ReadingControls";
import { CbetaTextContent } from "@/components/reader/CbetaTextContent";
import { FascicleNav } from "@/components/reader/FascicleNav";
import { ReadingProgress } from "@/components/reader/ReadingProgress";
import { ReadingPrefsProvider } from "@/components/reader/ReadingPrefsProvider";
import { getTextContent } from "@/lib/cbeta/server";

interface ReaderPageProps {
  params: Promise<{ catalogId: string }>;
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { catalogId } = await params;
  const content = await getTextContent(catalogId);

  if (!content) {
    notFound();
  }

  return (
    <ReadingPrefsProvider>
      <div className="relative min-h-screen">
        <ReadingHeader
          title={content.title}
          translator={content.translator ?? ""}
          catalogId={content.id}
        />
        <ReadingProgress />
        <CbetaTextContent content={content} />
        <FascicleNav catalogId={content.id} />
        <ReadingControls />
      </div>
    </ReadingPrefsProvider>
  );
}
