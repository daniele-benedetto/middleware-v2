import { seoConfig } from "@/lib/seo/config";
import { resolveAbsoluteUrl, toIsoDate } from "@/lib/seo/url";

import type { Metadata } from "next";

type SocialImageTheme = "cream" | "red" | "white" | "black";

type PageMetadataInput = {
  title?: string;
  description?: string;
  path?: string;
  index?: boolean;
  openGraphImage?: string;
  openGraphImageAlt?: string;
  twitterImage?: string;
  socialImageSection?: string;
  socialImageTheme?: SocialImageTheme;
};

type ArticleMetadataInput = {
  title: string;
  description?: string | null;
  slug: string;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  imageUrl?: string | null;
  authorName?: string | null;
};

type ArticleListenMetadataInput = {
  title: string;
  description?: string | null;
  slug: string;
  canonicalPath?: string;
  imageUrl?: string | null;
};

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

function getDefaultKeywords(): string[] {
  return [...seoConfig.keywords];
}

export function getCanonicalUrl(path = "/"): string {
  return resolveAbsoluteUrl(path);
}

export function getSitemapUrl(): string {
  return resolveAbsoluteUrl("/sitemap.xml");
}

export function getOpenGraphImageUrl(): string {
  return getGeneratedSocialImageUrl({
    title: seoConfig.defaultTitle,
    description: seoConfig.defaultDescription,
  });
}

export function getTwitterImageUrl(): string {
  return getOpenGraphImageUrl();
}

export function getGeneratedSocialImageUrl(
  input: {
    title?: string | null;
    description?: string | null;
    section?: string | null;
    theme?: SocialImageTheme | null;
  } = {},
): string {
  const params = new URLSearchParams();
  params.set("title", input.title || seoConfig.defaultTitle);
  params.set("description", input.description || seoConfig.defaultDescription);

  if (input.section) {
    params.set("section", input.section);
  }

  if (input.theme) {
    params.set("theme", input.theme);
  }

  return resolveAbsoluteUrl(`/api/og?${params.toString()}`);
}

export function buildRootMetadata(): Metadata {
  const canonical = getCanonicalUrl("/");
  const defaultOgImage = getOpenGraphImageUrl();
  const defaultTwitterImage = getTwitterImageUrl();

  return {
    metadataBase: seoConfig.siteUrl,
    applicationName: seoConfig.applicationName,
    title: {
      default: seoConfig.defaultTitle,
      template: seoConfig.titleTemplate,
    },
    description: seoConfig.defaultDescription,
    keywords: getDefaultKeywords(),
    manifest: "/manifest.json",
    appleWebApp: {
      title: seoConfig.applicationName,
    },
    alternates: {
      canonical,
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon0.svg", type: "image/svg+xml" },
        { url: "/icon1.png", sizes: "96x96", type: "image/png" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
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
      images: [defaultTwitterImage],
    },
  };
}

export function buildPageMetadata(input: PageMetadataInput = {}): Metadata {
  const {
    title,
    description = seoConfig.defaultDescription,
    path = "/",
    index = true,
    openGraphImage,
    openGraphImageAlt,
    twitterImage,
    socialImageSection,
    socialImageTheme,
  } = input;
  const canonical = getCanonicalUrl(path);
  const fallbackImage = getGeneratedSocialImageUrl({
    title: title ?? seoConfig.defaultTitle,
    description,
    section: socialImageSection,
    theme: socialImageTheme,
  });
  const resolvedImage = resolveAbsoluteUrl(openGraphImage || fallbackImage);
  const resolvedTwitterImage = resolveAbsoluteUrl(twitterImage || openGraphImage || fallbackImage);

  return {
    title,
    description,
    keywords: getDefaultKeywords(),
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
          alt: openGraphImageAlt ?? title ?? seoConfig.defaultTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: title ?? seoConfig.defaultTitle,
      description,
      creator: seoConfig.twitterHandle,
      images: [resolvedTwitterImage],
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
  const path = `/articoli/${input.slug}`;
  const canonical = getCanonicalUrl(path);
  const description = input.description ?? seoConfig.defaultDescription;
  const image = input.imageUrl
    ? resolveAbsoluteUrl(input.imageUrl)
    : getGeneratedSocialImageUrl({
        title: input.title,
        description,
        section: "articolo",
        theme: "cream",
      });
  const publishedTime = toIsoDate(input.publishedAt);
  const modifiedTime = toIsoDate(input.updatedAt);

  return {
    title: input.title,
    description,
    keywords: getDefaultKeywords(),
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

export function buildArticleListenMetadata(input: ArticleListenMetadataInput): Metadata {
  const canonical = getCanonicalUrl(input.canonicalPath ?? `/articoli/${input.slug}`);
  const description = input.description ?? seoConfig.defaultDescription;
  const image = input.imageUrl
    ? resolveAbsoluteUrl(input.imageUrl)
    : getGeneratedSocialImageUrl({
        title: input.title,
        description,
        section: "audio",
        theme: "red",
      });

  return {
    title: input.title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },
    openGraph: {
      type: "article",
      locale: seoConfig.locale,
      siteName: seoConfig.siteName,
      title: input.title,
      description,
      url: canonical,
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
