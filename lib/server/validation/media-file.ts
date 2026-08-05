import "server-only";

import { parseMediaPathname } from "@/lib/media/blob";

type MediaFormat = {
  contentType: string;
  acceptedContentTypes: readonly string[];
  hasValidContent: (body: Uint8Array) => boolean;
};

const startsWith = (body: Uint8Array, signature: readonly number[]) =>
  signature.every((byte, index) => body[index] === byte);

const hasAsciiAt = (body: Uint8Array, offset: number, value: string) =>
  [...value].every((character, index) => body[offset + index] === character.charCodeAt(0));

const hasRiffType = (body: Uint8Array, type: string) =>
  hasAsciiAt(body, 0, "RIFF") && hasAsciiAt(body, 8, type);

function readIsoBmffBrands(body: Uint8Array): string[] {
  if (body.length < 12 || !hasAsciiAt(body, 4, "ftyp")) {
    return [];
  }

  const declaredSize = new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(0);
  const boxEnd = Math.min(declaredSize, body.length);

  if (declaredSize < 12) {
    return [];
  }

  const brands: string[] = [];

  for (let offset = 8; offset + 4 <= boxEnd; offset += offset === 8 ? 8 : 4) {
    brands.push(String.fromCharCode(...body.subarray(offset, offset + 4)));
  }

  return brands;
}

const hasIsoBmffBrand = (body: Uint8Array, acceptedBrands: readonly string[]) =>
  readIsoBmffBrands(body).some((brand) => acceptedBrands.includes(brand));

function hasValidJson(body: Uint8Array): boolean {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body).replace(/^\uFEFF/, "");
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

const formatsByExtension: Record<string, MediaFormat> = {
  ".jpg": {
    contentType: "image/jpeg",
    acceptedContentTypes: ["image/jpeg", "image/jpg"],
    hasValidContent: (body) => startsWith(body, [0xff, 0xd8, 0xff]),
  },
  ".jpeg": {
    contentType: "image/jpeg",
    acceptedContentTypes: ["image/jpeg", "image/jpg"],
    hasValidContent: (body) => startsWith(body, [0xff, 0xd8, 0xff]),
  },
  ".png": {
    contentType: "image/png",
    acceptedContentTypes: ["image/png"],
    hasValidContent: (body) => startsWith(body, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  ".webp": {
    contentType: "image/webp",
    acceptedContentTypes: ["image/webp"],
    hasValidContent: (body) => hasRiffType(body, "WEBP"),
  },
  ".avif": {
    contentType: "image/avif",
    acceptedContentTypes: ["image/avif"],
    hasValidContent: (body) => hasIsoBmffBrand(body, ["avif", "avis"]),
  },
  ".gif": {
    contentType: "image/gif",
    acceptedContentTypes: ["image/gif"],
    hasValidContent: (body) => hasAsciiAt(body, 0, "GIF87a") || hasAsciiAt(body, 0, "GIF89a"),
  },
  ".json": {
    contentType: "application/json",
    acceptedContentTypes: ["application/json"],
    hasValidContent: hasValidJson,
  },
  ".mp3": {
    contentType: "audio/mpeg",
    acceptedContentTypes: ["audio/mpeg", "audio/mp3"],
    hasValidContent: (body) =>
      hasAsciiAt(body, 0, "ID3") ||
      (body[0] === 0xff && (body[1]! & 0xe0) === 0xe0 && (body[1]! & 0x06) !== 0),
  },
  ".wav": {
    contentType: "audio/wav",
    acceptedContentTypes: ["audio/wav", "audio/x-wav"],
    hasValidContent: (body) => hasRiffType(body, "WAVE"),
  },
  ".ogg": {
    contentType: "audio/ogg",
    acceptedContentTypes: ["audio/ogg", "application/ogg"],
    hasValidContent: (body) => hasAsciiAt(body, 0, "OggS"),
  },
  ".m4a": {
    contentType: "audio/mp4",
    acceptedContentTypes: ["audio/mp4", "audio/x-m4a"],
    hasValidContent: (body) =>
      hasIsoBmffBrand(body, ["M4A ", "M4B ", "isom", "iso2", "mp41", "mp42"]),
  },
  ".aac": {
    contentType: "audio/aac",
    acceptedContentTypes: ["audio/aac", "audio/x-aac"],
    hasValidContent: (body) => body[0] === 0xff && (body[1]! & 0xf6) === 0xf0,
  },
  ".flac": {
    contentType: "audio/flac",
    acceptedContentTypes: ["audio/flac", "audio/x-flac"],
    hasValidContent: (body) => hasAsciiAt(body, 0, "fLaC"),
  },
  ".webm": {
    contentType: "audio/webm",
    acceptedContentTypes: ["audio/webm"],
    hasValidContent: (body) => startsWith(body, [0x1a, 0x45, 0xdf, 0xa3]),
  },
};

export function validateMediaFile({
  pathname,
  declaredContentType,
  body,
}: {
  pathname: string;
  declaredContentType: string | null;
  body: Uint8Array;
}): string | null {
  const format = formatsByExtension[parseMediaPathname(pathname).extension];

  if (
    !format ||
    (declaredContentType !== null && !format.acceptedContentTypes.includes(declaredContentType)) ||
    !format.hasValidContent(body)
  ) {
    return null;
  }

  return format.contentType;
}
