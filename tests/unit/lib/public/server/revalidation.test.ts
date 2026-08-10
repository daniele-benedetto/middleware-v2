import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  revalidatePublicArticleContent,
  revalidatePublicCourseContent,
  revalidatePublicIssueContent,
  revalidatePublicPageContent,
} from "@/lib/public/server/revalidation";

const PUBLIC_ARTICLE_PAGE_CACHE_TAG = "public-article";
const PUBLIC_ARTICLES_ARCHIVE_CACHE_TAG = "public-articles-archive";
const PUBLIC_COURSE_PAGE_CACHE_TAG = "public-course";
const PUBLIC_HOME_CACHE_TAG = "public-home";
const PUBLIC_ISSUE_PAGE_CACHE_TAG = "public-issue";
const PUBLIC_ISSUES_ARCHIVE_CACHE_TAG = "public-issues-archive";
const PUBLIC_PAGE_CACHE_TAG = "public-page";
const PUBLIC_MEDIA_CACHE_TAG = "public-media";
const PUBLIC_SITEMAP_CACHE_TAG = "public-sitemap";
const revalidateTagMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: revalidateTagMock,
}));

vi.mock("@/lib/public/server/article-page", () => ({
  PUBLIC_ARTICLE_PAGE_CACHE_TAG: "public-article",
}));

vi.mock("@/lib/public/server/articles-archive", () => ({
  PUBLIC_ARTICLES_ARCHIVE_CACHE_TAG: "public-articles-archive",
}));

vi.mock("@/lib/public/server/course-page", () => ({
  PUBLIC_COURSE_PAGE_CACHE_TAG: "public-course",
}));

vi.mock("@/lib/public/server/home", () => ({
  PUBLIC_HOME_CACHE_TAG: "public-home",
}));

vi.mock("@/lib/public/server/issue-page", () => ({
  PUBLIC_ISSUE_PAGE_CACHE_TAG: "public-issue",
}));

vi.mock("@/lib/public/server/issues-archive", () => ({
  PUBLIC_ISSUES_ARCHIVE_CACHE_TAG: "public-issues-archive",
}));

vi.mock("@/lib/public/server/page", () => ({
  PUBLIC_PAGE_CACHE_TAG: "public-page",
}));

vi.mock("@/lib/public/server/sitemap", () => ({
  PUBLIC_SITEMAP_CACHE_TAG: "public-sitemap",
}));

vi.mock("@/lib/server/modules/media/service/public", () => ({
  PUBLIC_MEDIA_CACHE_TAG: "public-media",
}));

function expectExpiredTags(tags: string[]) {
  expect(revalidateTagMock).toHaveBeenCalledTimes(tags.length);

  for (const tag of tags) {
    expect(revalidateTagMock).toHaveBeenCalledWith(tag, { expire: 0 });
  }
}

describe("public cache revalidation", () => {
  beforeEach(() => {
    revalidateTagMock.mockClear();
  });

  it("expires article-dependent public cache tags", () => {
    revalidatePublicArticleContent();

    expectExpiredTags([
      PUBLIC_ARTICLES_ARCHIVE_CACHE_TAG,
      PUBLIC_ARTICLE_PAGE_CACHE_TAG,
      PUBLIC_HOME_CACHE_TAG,
      PUBLIC_ISSUE_PAGE_CACHE_TAG,
      PUBLIC_ISSUES_ARCHIVE_CACHE_TAG,
      PUBLIC_MEDIA_CACHE_TAG,
      PUBLIC_SITEMAP_CACHE_TAG,
    ]);
  });

  it("expires issue-dependent public cache tags", () => {
    revalidatePublicIssueContent();

    expectExpiredTags([
      PUBLIC_ARTICLES_ARCHIVE_CACHE_TAG,
      PUBLIC_HOME_CACHE_TAG,
      PUBLIC_ISSUE_PAGE_CACHE_TAG,
      PUBLIC_ARTICLE_PAGE_CACHE_TAG,
      PUBLIC_ISSUES_ARCHIVE_CACHE_TAG,
      PUBLIC_MEDIA_CACHE_TAG,
      PUBLIC_SITEMAP_CACHE_TAG,
    ]);
  });

  it("expires course-dependent public cache tags", () => {
    revalidatePublicCourseContent();

    expectExpiredTags([
      PUBLIC_COURSE_PAGE_CACHE_TAG,
      PUBLIC_MEDIA_CACHE_TAG,
      PUBLIC_SITEMAP_CACHE_TAG,
    ]);
  });

  it("expires static page public cache tags", () => {
    revalidatePublicPageContent();

    expectExpiredTags([PUBLIC_PAGE_CACHE_TAG, PUBLIC_MEDIA_CACHE_TAG, PUBLIC_SITEMAP_CACHE_TAG]);
  });
});
