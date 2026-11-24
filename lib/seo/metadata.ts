import { seoConfig } from "@/lib/seo/config";
import { toMetaDescription } from "@/lib/seo/meta-description";
import {
  buildEditorialSocialImage,
  buildGeneratedSocialImage,
  toOptimizedImageUrl,
  type SocialImage,
} from "@/lib/seo/social-image";
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

type LessonMetadataInput = {
  title: string;
  description?: string | null;
  courseSlug: string;
  slug: string;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

type ListenMetadataInput = {
  title: string;
  description?: string | null;
  path: string;
  imageUrl?: string | null;
};

type HomeMetadataInput = {
  openGraphImage?: string;
  openGraphImageAlt?: string;
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

function resolveDescription(value: string | null | undefined): string {
  return toMetaDescription(value) ?? seoConfig.defaultDescription;
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
  params.set("description", resolveDescription(input.description));

  if (input.section) {
    params.set("section", input.section);
  }

  if (input.theme) {
    params.set("theme", input.theme);
  }

  return resolveAbsoluteUrl(`/api/og?${params.toString()}`);
}

function resolveSocialImage(input: {
  editorialImageUrl?: string | null;
  alt: string;
  fallback: {
    title?: string | null;
    description?: string | null;
    section?: string | null;
    theme?: SocialImageTheme | null;
  };
}): SocialImage {
  if (input.editorialImageUrl) {
    return buildEditorialSocialImage(input.editorialImageUrl, input.alt);
  }

  return buildGeneratedSocialImage(getGeneratedSocialImageUrl(input.fallback), input.alt);
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
    appleWebApp: {
      title: seoConfig.applicationName,
    },
    alternates: {
      canonical,
      types: {
        "application/rss+xml": [
          { url: resolveAbsoluteUrl("/feed.xml"), title: seoConfig.siteName },
        ],
      },
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
    description: rawDescription,
    path = "/",
    index = true,
    openGraphImage,
    openGraphImageAlt,
    twitterImage,
    socialImageSection,
    socialImageTheme,
  } = input;
  const canonical = getCanonicalUrl(path);
  const description = resolveDescription(rawDescription);
  const socialImage = resolveSocialImage({
    editorialImageUrl: openGraphImage,
    alt: openGraphImageAlt ?? title ?? seoConfig.defaultTitle,
    fallback: {
      title: title ?? seoConfig.defaultTitle,
      description,
      section: socialImageSection,
      theme: socialImageTheme,
    },
  });
  const resolvedTwitterImage = twitterImage ? toOptimizedImageUrl(twitterImage) : socialImage.url;

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
      images: [socialImage],
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

export function buildHomeMetadata(input: HomeMetadataInput = {}): Metadata {
  const metadata = buildPageMetadata({
    title: seoConfig.homeTitle,
    description: seoConfig.defaultDescription,
    path: "/",
    openGraphImage: input.openGraphImage,
    openGraphImageAlt: input.openGraphImageAlt,
    twitterImage: input.openGraphImage,
    socialImageSection: "home",
    socialImageTheme: "cream",
  });

  return { ...metadata, title: { absolute: seoConfig.homeTitle } };
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
  const description = resolveDescription(input.description);
  const socialImage = resolveSocialImage({
    editorialImageUrl: input.imageUrl,
    alt: input.title,
    fallback: {
      title: input.title,
      description,
      section: "articolo",
      theme: "cream",
    },
  });
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
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      creator: seoConfig.twitterHandle,
      images: [socialImage.url],
    },
  };
}

export function buildLessonMetadata(input: LessonMetadataInput): Metadata {
  const canonical = getCanonicalUrl(`/contro-formazione/${input.courseSlug}/${input.slug}`);
  const description = resolveDescription(input.description);
  const socialImage = resolveSocialImage({
    editorialImageUrl: input.imageUrl,
    alt: input.imageAlt || input.title,
    fallback: {
      title: input.title,
      description,
      section: "incontro",
      theme: "black",
    },
  });

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
      publishedTime: toIsoDate(input.publishedAt),
      modifiedTime: toIsoDate(input.updatedAt),
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      creator: seoConfig.twitterHandle,
      images: [socialImage.url],
    },
  };
}

export function buildListenMetadata(input: ListenMetadataInput): Metadata {
  const canonical = getCanonicalUrl(input.path);
  const description = resolveDescription(input.description);
  const socialImage = resolveSocialImage({
    editorialImageUrl: input.imageUrl,
    alt: input.title,
    fallback: {
      title: input.title,
      description,
      section: "audio",
      theme: "red",
    },
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
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      creator: seoConfig.twitterHandle,
      images: [socialImage.url],
    },
  };
}
