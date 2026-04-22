"use client";

import { useMemo } from "react";

import { toVisibleNavigation } from "@/features/cms/navigation/mappers/to-visible-navigation";

import type { UserRole } from "@/lib/server/auth/roles";

export function useVisibleNavigation(role: UserRole) {
  return useMemo(() => toVisibleNavigation(role), [role]);
}
