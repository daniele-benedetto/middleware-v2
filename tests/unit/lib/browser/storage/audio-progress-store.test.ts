import { getAudioBookmarkId } from "@/lib/browser/storage/audio-progress-store";

describe("audio progress store", () => {
  it("builds bookmark ids from generic content keys", () => {
    expect(getAudioBookmarkId("lesson:lesson-1", "chunk-1")).toBe("lesson:lesson-1:chunk-1");
  });
});
