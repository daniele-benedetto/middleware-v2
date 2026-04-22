import { toErrorResponse } from "@/lib/server/http/api-error";

type RouteHandler = () => Promise<Response>;

export async function withRoute(handler: RouteHandler): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return toErrorResponse(error);
  }
}
