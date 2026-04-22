import type { UserRole } from "@/lib/server/auth/roles";

export type AuthUser = {
  id: string;
  role?: UserRole;
  email: string;
  name?: string | null;
};

export type AuthSession = {
  user: AuthUser;
};
