import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCmsSession } from "@/lib/cms/auth";
import { printFormatSchema } from "@/lib/print/format";
import { printPdfLayoutSchema } from "@/lib/print/pdf-layout";
import { imposeBookletPdf } from "@/lib/server/print/booklet-pdf";
import { renderIssuePagesPdf } from "@/lib/server/print/pdf";

const issueIdSchema = z.string().uuid();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireCmsSession(`/cms/issues`);

  const { id: rawId } = await params;
  const parsedId = issueIdSchema.safeParse(rawId);
  const searchParams = new URL(request.url).searchParams;
  const parsedLayout = printPdfLayoutSchema.safeParse(searchParams.get("layout") ?? "pages");
  const parsedFormat = printFormatSchema.safeParse(searchParams.get("format") ?? "a4");
  if (!parsedId.success || !parsedLayout.success || !parsedFormat.success) {
    return NextResponse.json({ message: "Invalid print request" }, { status: 400 });
  }

  try {
    const pagesPdf = await renderIssuePagesPdf({
      issueId: parsedId.data,
      format: parsedFormat.data,
      requestUrl: request.url,
      cookie: request.headers.get("cookie"),
    });
    const pdf =
      parsedLayout.data === "booklet"
        ? await imposeBookletPdf(pagesPdf, parsedFormat.data)
        : pagesPdf;

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="middleware-${parsedId.data}-${parsedFormat.data}-${parsedLayout.data}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[cms-print] PDF export failed", error);
    return NextResponse.json({ message: "PDF export unavailable" }, { status: 503 });
  }
}
