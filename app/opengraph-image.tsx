import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const alt = `${BRAND.name}: ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link preview (Slack, WhatsApp, email): warm paper, the mark, a seat row. */
export default function OpengraphImage() {
  const seat = (taken: boolean, last = false) => (
    <div
      style={{
        width: 46,
        height: 70,
        borderRadius: 12,
        background: last ? "#d9a441" : taken ? "#2f3437" : "transparent",
        border: taken || last ? "none" : "3px solid #d6d5d1",
      }}
    />
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fbfbfa",
          padding: 80,
          color: "#111111",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#111111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingTop: 4,
            }}
          >
            <div style={{ width: 11, height: 22, borderRadius: 4, background: "#fbfbfa" }} />
            <div style={{ width: 11, height: 22, borderRadius: 4, background: "#fbfbfa" }} />
            <div style={{ width: 11, height: 22, borderRadius: 4, background: "#d9a441" }} />
          </div>
          <div style={{ fontSize: 40, letterSpacing: -1 }}>{BRAND.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -3, maxWidth: 900 }}>
            Every seat accounted for. Never overbooked.
          </div>
          <div style={{ fontSize: 30, color: "#787774" }}>{BRAND.tagline}</div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {Array.from({ length: 11 }, (_, i) => seat(i < 9, i === 9))}
        </div>
      </div>
    ),
    size,
  );
}
