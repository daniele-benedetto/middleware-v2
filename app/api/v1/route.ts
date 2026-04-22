import { ok } from "@/lib/server/http/api-response";
import { withRoute } from "@/lib/server/http/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withRoute(async () => {
    return ok({
      name: "middleware-v2 API",
      version: "v1",
    });
  });
}
