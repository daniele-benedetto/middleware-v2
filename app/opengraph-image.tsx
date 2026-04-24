import { ImageResponse } from "next/og";

import { i18n } from "@/lib/i18n";

export const alt = i18n.cms.app.metadataTitle;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#F0E8D8",
        color: "#0A0A0A",
        padding: "56px",
        border: "6px solid #0A0A0A",
      }}
    >
      <div
        style={{
          fontSize: 28,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#C8001A",
        }}
      >
        {i18n.cms.navigation.brand}
      </div>
      <div style={{ fontSize: 88, lineHeight: 1, textTransform: "uppercase", fontWeight: 700 }}>
        {i18n.cms.app.metadataTitle}
      </div>
      <div style={{ fontSize: 36, lineHeight: 1.2 }}>{i18n.cms.app.metadataDescription}</div>
    </div>,
    size,
  );
}
