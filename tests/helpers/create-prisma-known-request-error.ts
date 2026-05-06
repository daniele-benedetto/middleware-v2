import { Prisma } from "@/lib/generated/prisma/client";

type PrismaKnownRequestCode = "P2002" | "P2003" | "P2025" | (string & {});

export function createPrismaKnownRequestError(
  code: PrismaKnownRequestCode,
  message = `Prisma error ${code}`,
) {
  const error = new Error(message) as Error & {
    code: PrismaKnownRequestCode;
    clientVersion: string;
  };

  Object.setPrototypeOf(error, Prisma.PrismaClientKnownRequestError.prototype);
  error.code = code;
  error.clientVersion = "test";

  return error as Prisma.PrismaClientKnownRequestError;
}
