export function isLongPublicTitle(title: string) {
  const visible = title.replaceAll("[[", "").replaceAll("]]", "").trim();
  const wordCount = visible.split(/\s+/).filter(Boolean).length;
  const longestGroup = Math.max(0, ...visible.split(/[ \t\r\n]+/).map((word) => word.length));

  return wordCount >= 14 || visible.length >= 54 || longestGroup >= 24;
}
