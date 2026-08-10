import { describe, expect, it } from "vitest";

import { buildRssFeed } from "@/lib/seo/rss";

import type { RssItem } from "@/lib/seo/rss";

const items: RssItem[] = [
  {
    title: "Sicurezza & contesa <urgente>",
    path: "/articoli/sicurezza-contesa",
    description: 'Un\'inchiesta sul "decoro"',
    publishedAt: "2026-07-31T15:18:10.015Z",
    author: "Redazione",
    category: "Territorio",
    imageUrl: "/api/public/media/blob?pathname=hero.jpeg",
  },
];

describe("rss feed", () => {
  const feed = buildRssFeed(items);

  it("declares the self link and channel language", () => {
    expect(feed).toContain(
      '<atom:link href="http://localhost:3000/feed.xml" rel="self" type="application/rss+xml" />',
    );
    expect(feed).toContain("<language>it-it</language>");
  });

  it("escapes XML-unsafe characters in titles and descriptions", () => {
    expect(feed).toContain("<title>Sicurezza &amp; contesa &lt;urgente&gt;</title>");
    expect(feed).toContain("Un&apos;inchiesta sul &quot;decoro&quot;");
    expect(feed).not.toContain("<urgente>");
  });

  it("uses absolute permalinks as guid and RFC 822 dates", () => {
    expect(feed).toContain(
      '<guid isPermaLink="true">http://localhost:3000/articoli/sicurezza-contesa</guid>',
    );
    expect(feed).toContain("<pubDate>Fri, 31 Jul 2026 15:18:10 GMT</pubDate>");
    expect(feed).toContain("<lastBuildDate>Fri, 31 Jul 2026 15:18:10 GMT</lastBuildDate>");
  });

  it("serves optimized enclosure images instead of raw blobs", () => {
    expect(feed).toContain(
      "_next/image?url=%2Fapi%2Fpublic%2Fmedia%2Fblob%3Fpathname%3Dhero.jpeg&amp;w=1200&amp;q=75",
    );
  });

  it("emits a valid empty channel when there are no items", () => {
    const emptyFeed = buildRssFeed([]);

    expect(emptyFeed).toContain("<channel>");
    expect(emptyFeed).not.toContain("<item>");
    expect(emptyFeed).not.toContain("<lastBuildDate>");
  });
});
