import {
  formatAudioTime,
  getActiveAudioChunk,
  getVisibleAudioChunks,
  parseAudioChunks,
} from "@/lib/audio/audio-chunks";

describe("audio chunks", () => {
  it("normalizes valid chunks and discards invalid entries", () => {
    const chunks = parseAudioChunks([
      { id: 2, text: " Second ", start: 10, end: 20, confidence: 0.9 },
      { text: "First", start: 0, end: 5 },
      { text: "", start: 5, end: 6 },
      { text: "bad", start: 7, end: 7 },
      null,
    ]);

    expect(chunks).toEqual([
      { id: "0", text: "First", start: 0, end: 5, confidence: null },
      { id: "2", text: "Second", start: 10, end: 20, confidence: 0.9 },
    ]);
  });

  it("returns the active chunk for the current time", () => {
    const chunks = parseAudioChunks([
      { id: "a", text: "A", start: 0, end: 5 },
      { id: "b", text: "B", start: 5, end: 10 },
    ]);

    expect(getActiveAudioChunk(chunks, 5)?.id).toBe("b");
    expect(getActiveAudioChunk(chunks, 10)).toBeNull();
  });

  it("returns a three chunk window around the active chunk", () => {
    const chunks = parseAudioChunks([
      { id: "a", text: "A", start: 0, end: 5 },
      { id: "b", text: "B", start: 5, end: 10 },
      { id: "c", text: "C", start: 10, end: 15 },
      { id: "d", text: "D", start: 15, end: 20 },
    ]);

    expect(getVisibleAudioChunks(chunks, "c").map((chunk) => [chunk.id, chunk.position])).toEqual([
      ["b", "previous"],
      ["c", "active"],
      ["d", "next"],
    ]);
  });

  it("does not add previous context before the first active chunk", () => {
    const chunks = parseAudioChunks([
      { id: "a", text: "A", start: 0, end: 5 },
      { id: "b", text: "B", start: 5, end: 10 },
      { id: "c", text: "C", start: 10, end: 15 },
    ]);

    expect(getVisibleAudioChunks(chunks, "a").map((chunk) => [chunk.id, chunk.position])).toEqual([
      ["a", "active"],
      ["b", "next"],
      ["c", "next"],
    ]);
  });

  it("formats audio time as minutes and seconds", () => {
    expect(formatAudioTime(75.8)).toBe("01:15");
    expect(formatAudioTime(Number.NaN)).toBe("00:00");
  });
});
