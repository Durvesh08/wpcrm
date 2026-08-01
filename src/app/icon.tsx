import { ImageResponse } from "next/og";

// Replaces the default Next.js favicon with a ZOVAIX mark.
// Next.js renders this at build time and auto-injects <link rel="icon">
// into <head>.
//
// This route takes precedence over src/app/favicon.ico, which is the
// Next.js default and can stay on disk harmlessly (or be removed).

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05070a",
          borderRadius: 6,
          border: "1px solid #9ca3af",
          color: "#e5e7eb",
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: -1,
        }}
      >
        Z
      </div>
    ),
    { ...size },
  );
}
