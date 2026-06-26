import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  revalidatePublicArticleContent,
  revalidatePublicIssueContent,
  revalidatePublicPageContent,
} from "@/lib/public/server/revalidation";

const PUBLIC_ARTICLE_PAGE_CACHE_TAG = "public-article";
const PUBLIC_HOME_CACHE_TAG = "public-home";
const PUBLIC_ISSUE_PAGE_CACHE_TAG = "public-issue";
const PUBLIC_ISSUES_ARCHIVE_CACHE_TAG = "public-issues-archive";
const PUBLIC_PAGE_CACHE_TAG = "public-page";
const revalidateTagMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: revalidateTagMock,
}));

vi.mock("@/lib/public/server/article-page", () => ({
  PUBLIC_ARTICLE_PAGE_CACHE_TAG: "public-article",
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

describe("public cache revalidation", () => {
  beforeEach(() => {
    revalidateTagMock.mockClear();
  });

  it("expires article-dependent public cache tags", () => {
    revalidatePublicArticleContent();

    expect(revalidateTagMock).toHaveBeenCalledTimes(4);
    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, PUBLIC_ARTICLE_PAGE_CACHE_TAG, {
      expire: 0,
    });
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, PUBLIC_HOME_CACHE_TAG, { expire: 0 });
    expect(revalidateTagMock).toHaveBeenNthCalledWith(3, PUBLIC_ISSUE_PAGE_CACHE_TAG, {
      expire: 0,
    });
    expect(revalidateTagMock).toHaveBeenNthCalledWith(4, PUBLIC_ISSUES_ARCHIVE_CACHE_TAG, {
      expire: 0,
    });
  });

  it("expires issue-dependent public cache tags", () => {
    revalidatePublicIssueContent();

    expect(revalidateTagMock).toHaveBeenCalledTimes(4);
    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, PUBLIC_HOME_CACHE_TAG, { expire: 0 });
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, PUBLIC_ISSUE_PAGE_CACHE_TAG, {
      expire: 0,
    });
    expect(revalidateTagMock).toHaveBeenNthCalledWith(3, PUBLIC_ARTICLE_PAGE_CACHE_TAG, {
      expire: 0,
    });
    expect(revalidateTagMock).toHaveBeenNthCalledWith(4, PUBLIC_ISSUES_ARCHIVE_CACHE_TAG, {
      expire: 0,
    });
  });

  it("expires static page public cache tags", () => {
    revalidatePublicPageContent();

    expect(revalidateTagMock).toHaveBeenCalledTimes(1);
    expect(revalidateTagMock).toHaveBeenCalledWith(PUBLIC_PAGE_CACHE_TAG, { expire: 0 });
  });
});
