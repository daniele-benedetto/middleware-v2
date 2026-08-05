import { validateMediaFile } from "@/lib/server/validation/media-file";

const ascii = (value: string) => new TextEncoder().encode(value);
const bytes = (...values: number[]) => new Uint8Array(values);

function isoBmff(brand: string) {
  return bytes(0, 0, 0, 20, ...ascii("ftyp"), ...ascii(brand), 0, 0, 0, 0, ...ascii(brand));
}

describe("validateMediaFile", () => {
  it.each([
    ["photo.jpg", "image/jpeg", bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg"],
    ["photo.png", "image/png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/png"],
    ["photo.webp", "image/webp", ascii("RIFF0000WEBP"), "image/webp"],
    ["photo.avif", "image/avif", isoBmff("avif"), "image/avif"],
    ["photo.gif", "image/gif", ascii("GIF89a"), "image/gif"],
    ["data.json", "application/json", ascii('{"version":1}'), "application/json"],
    ["audio.mp3", "audio/mpeg", ascii("ID3\u0004"), "audio/mpeg"],
    ["audio.wav", "audio/x-wav", ascii("RIFF0000WAVE"), "audio/wav"],
    ["audio.ogg", "audio/ogg", ascii("OggS\u0000"), "audio/ogg"],
    ["audio.m4a", "audio/x-m4a", isoBmff("M4A "), "audio/mp4"],
    ["audio.aac", "audio/aac", bytes(0xff, 0xf1, 0x50, 0x80), "audio/aac"],
    ["audio.flac", "audio/flac", ascii("fLaC"), "audio/flac"],
    ["audio.webm", "audio/webm", bytes(0x1a, 0x45, 0xdf, 0xa3), "audio/webm"],
  ])("accepts valid %s content", (pathname, declaredContentType, body, expected) => {
    expect(validateMediaFile({ pathname, declaredContentType, body })).toBe(expected);
  });

  it("accepts valid content when the client omits MIME and assigns the canonical type", () => {
    expect(
      validateMediaFile({
        pathname: "photo.jpg",
        declaredContentType: null,
        body: bytes(0xff, 0xd8, 0xff),
      }),
    ).toBe("image/jpeg");
  });

  it.each([
    ["photo.jpg", "image/jpeg", ascii("<script>alert(1)</script>")],
    ["photo.png", "image/jpeg", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)],
    ["data.json", "application/json", ascii('{"broken":')],
    ["audio.mp3", "audio/mpeg", ascii("not audio")],
    ["unknown.svg", "image/svg+xml", ascii("<svg></svg>")],
  ])("rejects spoofed or invalid %s content", (pathname, declaredContentType, body) => {
    expect(validateMediaFile({ pathname, declaredContentType, body })).toBeNull();
  });
});
