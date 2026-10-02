import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCmsSession } from "@/lib/cms/auth";
import { imposeBookletPdf } from "@/lib/server/print/booklet-pdf";
import { renderIssuePagesPdf } from "@/lib/server/print/pdf";

const issueIdSchema = z.string().uuid();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireCmsSession(`/cms/issues`);

  const { id: rawId } = await params;
  const parsedId = issueIdSchema.safeParse(rawId);
  if (!parsedId.success) {
    return NextResponse.json({ message: "Invalid print request" }, { status: 400 });
  }

  try {
    const pagesPdf = await renderIssuePagesPdf({
      issueId: parsedId.data,
      requestUrl: request.url,
      cookie: request.headers.get("cookie"),
    });
    const pdf = await imposeBookletPdf(pagesPdf);

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="middleware-${parsedId.data}-libretto.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[cms-print] PDF export failed", error);
    return NextResponse.json({ message: "PDF export unavailable" }, { status: 503 });
  }
}
