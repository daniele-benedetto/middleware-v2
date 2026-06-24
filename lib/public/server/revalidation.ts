import "server-only";

import { revalidateTag } from "next/cache";

import { PUBLIC_ARTICLE_PAGE_CACHE_TAG } from "@/lib/public/server/article-page";
import { PUBLIC_HOME_CACHE_TAG } from "@/lib/public/server/home";
import { PUBLIC_ISSUE_PAGE_CACHE_TAG } from "@/lib/public/server/issue-page";
import { PUBLIC_ISSUES_ARCHIVE_CACHE_TAG } from "@/lib/public/server/issues-archive";
import { PUBLIC_PAGE_CACHE_TAG } from "@/lib/public/server/page";

function revalidatePublicTag(tag: string) {
  revalidateTag(tag, { expire: 0 });
}

export function revalidatePublicArticleContent() {
  revalidatePublicTag(PUBLIC_ARTICLE_PAGE_CACHE_TAG);
  revalidatePublicTag(PUBLIC_HOME_CACHE_TAG);
  revalidatePublicTag(PUBLIC_ISSUE_PAGE_CACHE_TAG);
  revalidatePublicTag(PUBLIC_ISSUES_ARCHIVE_CACHE_TAG);
}

export function revalidatePublicIssueContent() {
  revalidatePublicTag(PUBLIC_HOME_CACHE_TAG);
  revalidatePublicTag(PUBLIC_ISSUE_PAGE_CACHE_TAG);
  revalidatePublicTag(PUBLIC_ARTICLE_PAGE_CACHE_TAG);
  revalidatePublicTag(PUBLIC_ISSUES_ARCHIVE_CACHE_TAG);
}

export function revalidatePublicPageContent() {
  revalidatePublicTag(PUBLIC_PAGE_CACHE_TAG);
}
