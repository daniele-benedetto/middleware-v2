type ApiSuccessMeta = {
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export function ok<T>(data: T, meta?: ApiSuccessMeta): Response {
  return Response.json({ data, error: null, meta: meta ?? null }, { status: 200 });
}

export function created<T>(data: T, meta?: ApiSuccessMeta): Response {
  return Response.json({ data, error: null, meta: meta ?? null }, { status: 201 });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}
