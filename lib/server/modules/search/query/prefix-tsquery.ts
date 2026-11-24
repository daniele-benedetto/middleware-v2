const SEARCH_TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;
const MIN_TOKEN_LENGTH = 2;
const MAX_TOKENS = 8;

export function toPrefixTsQuery(query: string): string | null {
  const tokens = (query.toLowerCase().match(SEARCH_TOKEN_PATTERN) ?? [])
    .filter((token) => token.length >= MIN_TOKEN_LENGTH)
    .slice(0, MAX_TOKENS);

  if (tokens.length === 0) return null;

  return tokens.map((token) => `${token}:*`).join(" & ");
}
