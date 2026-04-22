"use client";

import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "@/lib/server/trpc/routers";

export const trpc = createTRPCReact<AppRouter>();
