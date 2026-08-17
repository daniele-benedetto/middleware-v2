const publicCoursesServiceMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  listPublishedItems: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/lib/server/modules/courses/service/public", () => ({
  publicCoursesService: publicCoursesServiceMock,
}));

vi.mock("@/lib/server/modules/lessons/service/public", () => ({
  publicLessonsService: { getBySlug: vi.fn() },
}));

import {
  getPublicFormazioneIndexData,
  PUBLIC_COURSE_ARCHIVE_PAGE_SIZE,
} from "@/lib/public/server/course-page";

describe("getPublicFormazioneIndexData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the archive with one lightweight list query", async () => {
    const courses = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        title: "Course",
        titleStyled: null,
        slug: "course",
        description: null,
        homeVariant: "black",
        publishedAt: "2026-01-01T00:00:00.000Z",
        lessonsCount: 2,
      },
    ];
    publicCoursesServiceMock.listPublishedItems.mockResolvedValue(courses);

    await expect(getPublicFormazioneIndexData()).resolves.toEqual({ courses });

    expect(publicCoursesServiceMock.listPublishedItems).toHaveBeenCalledOnce();
    expect(publicCoursesServiceMock.listPublishedItems).toHaveBeenCalledWith({
      page: 1,
      pageSize: PUBLIC_COURSE_ARCHIVE_PAGE_SIZE,
    });
    expect(publicCoursesServiceMock.getBySlug).not.toHaveBeenCalled();
  });
});
