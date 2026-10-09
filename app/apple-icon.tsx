import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS. Same mark as the favicon, at full bleed (iOS rounds it). */
export default function AppleIcon() {
  const seat = (fill: string) => (
    <div style={{ width: 28, height: 56, borderRadius: 9, background: fill }} />
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#111111",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 11,
          paddingTop: 10,
        }}
      >
        {seat("#fbfbfa")}
        {seat("#fbfbfa")}
        {seat("#d9a441")}
      </div>
    ),
    size,
  );
}
