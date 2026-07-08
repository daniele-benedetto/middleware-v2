const mediaStorageMock = vi.hoisted(() => ({
  mediaStorage: {
    get: vi.fn(),
  },
}));
const publicLessonsServiceMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
}));
const publicCoursesServiceMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: () => {},
  cacheTag: () => {},
}));

vi.mock("@/lib/server/storage/media-storage", () => mediaStorageMock);

vi.mock("@/lib/server/modules/lessons/service/public", () => ({
  publicLessonsService: publicLessonsServiceMock,
}));

vi.mock("@/lib/server/modules/courses/service/public", () => ({
  publicCoursesService: publicCoursesServiceMock,
}));

import { getPublicLessonListenPageData } from "@/lib/public/server/lesson-listen-page";
import { mediaStorage } from "@/lib/server/storage/media-storage";

const getMediaMock = vi.mocked(mediaStorage.get);

function createJsonStream(value: unknown) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify(value)));
      controller.close();
    },
  });
}

function createLesson(overrides: Record<string, unknown> = {}) {
  return {
    id: "lesson-1",
    courseId: "course-1",
    courseSlug: "course-slug",
    courseTitle: "Course title",
    slug: "lesson-slug",
    title: "Lesson title",
    titleStyled: null,
    excerpt: null,
    imageUrl: null,
    imageAlt: null,
    hasAudio: true,
    audioUrl: "/api/public/media/blob?pathname=audio%2Flesson.mp3",
    audioChunks: null,
    publishedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    excerptRich: null,
    contentRich: { type: "doc" },
    readingTimeMinutes: 5,
    sortOrder: 0,
    ...overrides,
  };
}

function createCourse() {
  return {
    id: "course-1",
    slug: "course-slug",
    title: "Course title",
    titleStyled: null,
    description: null,
    homeVariant: "black",
    publishedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    lessons: [
      { id: "lesson-0", slug: "previous", title: "Previous" },
      { id: "lesson-1", slug: "lesson-slug", title: "Lesson title" },
    ],
  };
}

describe("getPublicLessonListenPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for published lessons without audio", async () => {
    publicLessonsServiceMock.getBySlug.mockResolvedValue(createLesson({ audioUrl: null }));

    await expect(getPublicLessonListenPageData("course-slug", "lesson-slug")).resolves.toBeNull();
  });

  it("loads and normalizes chunks from a versioned private media json reference", async () => {
    publicLessonsServiceMock.getBySlug.mockResolvedValue(
      createLesson({ audioChunks: "/api/cms/media/blob?pathname=chunks%2Flesson.json" }),
    );
    publicCoursesServiceMock.getBySlug.mockResolvedValue(createCourse());
    getMediaMock.mockResolvedValue({
      stream: createJsonStream({
        version: 1,
        chunks: [{ id: 1, text: " Intro ", start: 0, end: 4 }],
      }),
      contentType: "application/json",
      url: "/api/public/media/blob?pathname=chunks%2Flesson.json",
      downloadUrl: "/api/cms/media/blob?pathname=chunks%2Flesson.json&download=1",
      pathname: "chunks/lesson.json",
      size: 10,
      contentRange: null,
      responseSize: 10,
      uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
      etag: "etag-1",
    });

    const result = await getPublicLessonListenPageData("course-slug", "lesson-slug");

    expect(getMediaMock).toHaveBeenCalledWith("chunks/lesson.json");
    expect(result?.lessonNumber).toBe(2);
    expect(result?.chunks).toEqual([
      { id: "1", text: "Intro", start: 0, end: 4, confidence: null },
    ]);
  });
});
