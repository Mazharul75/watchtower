import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Next.js's file-convention favicon: same shield-and-lens mark as
// packages/ui/Logo.tsx, rendered as a static PNG since <svg> gradients
// don't survive being embedded as a favicon via this API directly.
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
          background: "#0B0F1A",
          borderRadius: 6,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "3px solid transparent",
            backgroundImage:
              "linear-gradient(#0B0F1A, #0B0F1A), linear-gradient(115deg, #6366F1, #8B5CF6, #22D3EE)",
            backgroundOrigin: "border-box",
            backgroundClip: "content-box, border-box",
          }}
        />
      </div>
    ),
    size,
  );
}
