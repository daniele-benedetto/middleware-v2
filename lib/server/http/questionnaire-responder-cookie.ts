import "server-only";

import { createHmac, randomBytes } from "node:crypto";

import { ApiError } from "@/lib/server/http/api-error";

const cookieName = "mw_questionnaire_responder";
const tokenByteLength = 32;
const cookieMaxAgeSeconds = 60 * 60 * 24 * 400;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

function getTokenSecret() {
  const secret = process.env.QUESTIONNAIRE_TOKEN_SECRET?.trim();

  if (!secret) {
    throw new ApiError(500, "INTERNAL_ERROR", "Questionnaire token secret is not configured");
  }

  return secret;
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== name) continue;

    const value = rawValue.join("=");
    return value || null;
  }

  return null;
}

function serializeResponderCookie(token: string) {
  const attributes = [
    `${cookieName}=${token}`,
    // Site-wide: the questionnaire page reads it on the server to render the right screen.
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${cookieMaxAgeSeconds}`,
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function createToken() {
  return randomBytes(tokenByteLength).toString("base64url");
}

export function hashQuestionnaireResponderToken(token: string) {
  return createHmac("sha256", getTokenSecret()).update(token).digest("hex");
}

/**
 * `refresh` re-issues the cookie even when the request already carries a valid one: it moves
 * the cookies issued under the old `/api/trpc` path to the site-wide one, same token.
 */
export function ensureQuestionnaireResponder(
  request: Request,
  responseHeaders: Headers,
  options: { refresh?: boolean } = {},
) {
  const currentToken = readCookie(request, cookieName);
  const token = currentToken && tokenPattern.test(currentToken) ? currentToken : createToken();

  if (token !== currentToken || options.refresh) {
    responseHeaders.append("Set-Cookie", serializeResponderCookie(token));
  }

  return { tokenHash: hashQuestionnaireResponderToken(token) };
}

/** Hash of the responder token found in a raw cookie value, or null when it is not a token. */
export function hashQuestionnaireResponderCookie(value: string | undefined): string | null {
  return value && tokenPattern.test(value) ? hashQuestionnaireResponderToken(value) : null;
}

export const questionnaireResponderCookie = {
  maxAgeSeconds: cookieMaxAgeSeconds,
  name: cookieName,
};
