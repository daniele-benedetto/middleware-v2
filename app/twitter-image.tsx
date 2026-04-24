import { ImageResponse } from "next/og";

import { i18n } from "@/lib/i18n";

export const alt = i18n.cms.app.metadataTitle;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "#0A0A0A",
        color: "#F0E8D8",
        padding: "64px",
        gap: "24px",
      }}
    >
      <div
        style={{
          fontSize: 24,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#C8001A",
        }}
      >
        {i18n.cms.navigation.brand}
      </div>
      <div style={{ fontSize: 84, lineHeight: 1, textTransform: "uppercase", fontWeight: 700 }}>
        {i18n.cms.app.metadataTitle}
      </div>
      <div style={{ fontSize: 34, lineHeight: 1.2 }}>{i18n.cms.app.metadataDescription}</div>
    </div>,
    size,
  );
}
