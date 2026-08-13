/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

import { seoConfig } from "@/lib/seo/config";

const IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

const MAX_TITLE_LENGTH = 88;
const MAX_DESCRIPTION_LENGTH = 170;
const INVALID_PUBLIC_HOSTS = new Set(["0.0.0.0", "::"]);

const themes = {
  cream: {
    background: "#f7f0e7",
    text: "#000000",
    logo: "/brand/middleware-logo-extended-black.png",
    grid: "rgba(0,0,0,0.08)",
  },
  red: {
    background: "#c13814",
    text: "#000000",
    logo: "/brand/middleware-logo-extended-black.png",
    grid: "rgba(0,0,0,0.12)",
  },
  white: {
    background: "#ffffff",
    text: "#000000",
    logo: "/brand/middleware-logo-extended-black.png",
    grid: "rgba(0,0,0,0.07)",
  },
  black: {
    background: "#000000",
    text: "#ffffff",
    logo: "/brand/middleware-logo-extended-white.png",
    grid: "rgba(247,240,231,0.11)",
  },
} as const;

type ThemeName = keyof typeof themes;

function cleanText(value: string | null, fallback: string): string {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function getTheme(value: string | null) {
  if (value && value in themes) {
    return themes[value as ThemeName];
  }

  return themes.cream;
}

function getAssetOrigin(requestUrl: string): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;

  if (configuredUrl) {
    return new URL(configuredUrl).origin;
  }

  const parsedRequestUrl = new URL(requestUrl);
  const requestOrigin = parsedRequestUrl.origin;
  const requestHost = parsedRequestUrl.hostname;

  if (INVALID_PUBLIC_HOSTS.has(requestHost)) {
    return seoConfig.siteUrl.origin;
  }

  return requestOrigin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = truncateText(
    cleanText(searchParams.get("title"), seoConfig.defaultTitle),
    MAX_TITLE_LENGTH,
  );
  const description = truncateText(
    cleanText(searchParams.get("description"), seoConfig.defaultDescription),
    MAX_DESCRIPTION_LENGTH,
  );
  const theme = getTheme(searchParams.get("theme"));
  const assetOrigin = getAssetOrigin(request.url);
  const logoUrl = new URL(theme.logo, assetOrigin).toString();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: theme.background,
        color: theme.text,
        fontFamily: "Arial, Helvetica, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${theme.grid} 1px, transparent 1px), linear-gradient(90deg, ${theme.grid} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <main
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          padding: "0 72px 62px",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            height: 92,
            borderBottom: `3px solid ${theme.text}`,
          }}
        >
          <img
            alt=""
            src={logoUrl}
            style={{
              width: 296,
              height: 44,
              objectFit: "contain",
            }}
          />
        </header>
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            marginTop: 84,
          }}
        >
          <div
            style={{
              width: 850,
              height: 3,
              background: theme.text,
              marginBottom: 30,
            }}
          />
          <h1
            style={{
              margin: 0,
              width: 920,
              fontSize: title.length > 54 ? 76 : 96,
              fontWeight: 900,
              letterSpacing: "-0.06em",
              lineHeight: 0.86,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: "38px 0 0",
              width: 780,
              color: theme.text,
              fontSize: 27,
              fontStyle: "italic",
              lineHeight: 1.36,
            }}
          >
            {description}
          </p>
        </section>
      </main>
    </div>,
    IMAGE_SIZE,
  );
}
