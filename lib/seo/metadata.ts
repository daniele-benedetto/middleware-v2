import { seoConfig } from "@/lib/seo/config";

import type { Metadata } from "next";

type PageMetadataInput = {
  title?: string;
  description?: string;
  path?: string;
  index?: boolean;
  openGraphImage?: string;
};

type ArticleMetadataInput = {
  title: string;
  description?: string | null;
  slug: string;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  imageUrl?: string | null;
  authorName?: string | null;
  tags?: string[];
};

function toAbsoluteUrl(path: string): string {
  return new URL(path, seoConfig.siteUrl).toString();
}

function resolveImageUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  return toAbsoluteUrl(pathOrUrl);
}

function toIsoDate(value: string | Date | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function resolveRobots(index: boolean): Metadata["robots"] {
  return {
    index,
    follow: index,
    nocache: !index,
    googleBot: {
      index,
      follow: index,
      noimageindex: !index,
    },
  };
}

export function getCanonicalUrl(path = "/"): string {
  return toAbsoluteUrl(path);
}

export function getSitemapUrl(): string {
  return toAbsoluteUrl("/sitemap.xml");
}

export function getOpenGraphImageUrl(): string {
  return toAbsoluteUrl("/opengraph-image");
}

export function getTwitterImageUrl(): string {
  return toAbsoluteUrl("/twitter-image");
}

export function buildRootMetadata(): Metadata {
  const canonical = getCanonicalUrl("/");
  const defaultOgImage = getOpenGraphImageUrl();

  return {
    metadataBase: seoConfig.siteUrl,
    applicationName: seoConfig.applicationName,
    title: {
      default: seoConfig.defaultTitle,
      template: seoConfig.titleTemplate,
    },
    description: seoConfig.defaultDescription,
    alternates: {
      canonical,
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/brand/icon0.svg", type: "image/svg+xml" },
        { url: "/brand/icon1.png", sizes: "96x96", type: "image/png" },
      ],
      apple: [{ url: "/brand/apple-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: ["/favicon.ico"],
    },
    openGraph: {
      type: "website",
      locale: seoConfig.locale,
      siteName: seoConfig.siteName,
      title: seoConfig.defaultTitle,
      description: seoConfig.defaultDescription,
      url: canonical,
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: seoConfig.defaultTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seoConfig.defaultTitle,
      description: seoConfig.defaultDescription,
      creator: seoConfig.twitterHandle,
      images: [defaultOgImage],
    },
  };
}

export function buildPageMetadata(input: PageMetadataInput = {}): Metadata {
  const {
    title,
    description = seoConfig.defaultDescription,
    path = "/",
    index = true,
    openGraphImage = getOpenGraphImageUrl(),
  } = input;
  const canonical = getCanonicalUrl(path);
  const resolvedImage = resolveImageUrl(openGraphImage);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: resolveRobots(index),
    openGraph: {
      type: "website",
      locale: seoConfig.locale,
      siteName: seoConfig.siteName,
      title: title ?? seoConfig.defaultTitle,
      description,
      url: canonical,
      images: [
        {
          url: resolvedImage,
          width: 1200,
          height: 630,
          alt: title ?? seoConfig.defaultTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: title ?? seoConfig.defaultTitle,
      description,
      creator: seoConfig.twitterHandle,
      images: [resolvedImage],
    },
  };
}

export function buildCmsMetadata(input: Omit<PageMetadataInput, "index"> = {}): Metadata {
  return buildPageMetadata({
    ...input,
    index: false,
  });
}

export function buildArticleMetadata(input: ArticleMetadataInput): Metadata {
  const path = `/articles/${input.slug}`;
  const canonical = getCanonicalUrl(path);
  const description = input.description ?? seoConfig.defaultDescription;
  const image = input.imageUrl ? resolveImageUrl(input.imageUrl) : getOpenGraphImageUrl();
  const publishedTime = toIsoDate(input.publishedAt);
  const modifiedTime = toIsoDate(input.updatedAt);

  return {
    title: input.title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "article",
      locale: seoConfig.locale,
      siteName: seoConfig.siteName,
      title: input.title,
      description,
      url: canonical,
      publishedTime,
      modifiedTime,
      authors: input.authorName ? [input.authorName] : undefined,
      tags: input.tags,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: input.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      creator: seoConfig.twitterHandle,
      images: [image],
    },
  };
}
