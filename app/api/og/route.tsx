/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

import { seoConfig } from "@/lib/seo/config";

const IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

const MAX_TITLE_LENGTH = 88;
const MAX_DESCRIPTION_LENGTH = 170;

const themes = {
  cream: {
    background: "#f7f0e7",
    text: "#000000",
    logo: "/brand/middleware-logo-red.png",
    pictogram: "/brand/middleware-pictogram-red-og.png",
    grid: "rgba(0,0,0,0.08)",
    rule: "rgba(0,0,0,0.22)",
    labelBorder: "#000000",
    footerAccent: "#c13814",
  },
  red: {
    background: "#c13814",
    text: "#000000",
    logo: "/brand/middleware-logo-cream.png",
    pictogram: "/brand/middleware-pictogram-cream.png",
    grid: "rgba(0,0,0,0.12)",
    rule: "rgba(0,0,0,0.28)",
    labelBorder: "#000000",
    footerAccent: "#f7f0e7",
  },
  white: {
    background: "#ffffff",
    text: "#000000",
    logo: "/brand/middleware-logo-black.png",
    pictogram: "/brand/middleware-pictogram-black.png",
    grid: "rgba(0,0,0,0.07)",
    rule: "rgba(0,0,0,0.2)",
    labelBorder: "#000000",
    footerAccent: "#c13814",
  },
  black: {
    background: "#000000",
    text: "#ffffff",
    logo: "/brand/middleware-logo-white.png",
    pictogram: "/brand/middleware-pictogram-white.png",
    grid: "rgba(247,240,231,0.11)",
    rule: "rgba(247,240,231,0.28)",
    labelBorder: "#ffffff",
    footerAccent: "#c13814",
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
  const section = truncateText(cleanText(searchParams.get("section"), "middleware"), 42);
  const theme = getTheme(searchParams.get("theme"));
  const logoUrl = new URL(theme.logo, request.url).toString();
  const pictogramUrl = new URL(theme.pictogram, request.url).toString();

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
          backgroundSize: "72px 72px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 116,
          width: 4,
          background: theme.text,
        }}
      />
      <img
        alt=""
        src={pictogramUrl}
        style={{
          position: "absolute",
          right: -52,
          top: -96,
          width: 430,
          height: 430,
          opacity: 0.14,
          objectFit: "contain",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 72,
          bottom: 62,
          width: 248,
          height: 248,
          border: `3px solid ${theme.rule}`,
          borderRadius: 999,
        }}
      />
      <img
        alt=""
        src={pictogramUrl}
        style={{
          position: "absolute",
          right: 143,
          bottom: 134,
          width: 106,
          height: 106,
          objectFit: "contain",
        }}
      />
      <main
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          padding: "62px 76px 58px 156px",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 36,
          }}
        >
          <img
            alt=""
            src={logoUrl}
            style={{
              width: 276,
              height: 42,
              objectFit: "contain",
            }}
          />
          <div
            style={{
              border: `2px solid ${theme.labelBorder}`,
              padding: "10px 16px",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {section}
          </div>
        </header>
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            width: 790,
          }}
        >
          <div
            style={{
              width: "100%",
              height: 3,
              background: theme.text,
              marginBottom: 24,
            }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: title.length > 54 ? 68 : 82,
              fontWeight: 900,
              letterSpacing: "-0.055em",
              lineHeight: 0.92,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: "28px 0 0",
              width: 710,
              color: theme.text,
              opacity: 0.74,
              fontSize: 30,
              fontStyle: "italic",
              lineHeight: 1.22,
            }}
          >
            {description}
          </p>
        </section>
        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `2px solid ${theme.rule}`,
            paddingTop: 20,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>Modena</span>
          <span style={{ color: theme.footerAccent }}>inchiesta / territorio / conflitto</span>
        </footer>
      </main>
    </div>,
    IMAGE_SIZE,
  );
}
