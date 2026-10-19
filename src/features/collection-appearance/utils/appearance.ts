import type { CSSProperties } from "react";
import type { CollectionAppearance } from "../schemas/appearance.schema";
export function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
export function readableColor(background: string, preferred?: string) {
  const b = luminance(background);
  if (preferred) {
    const f = luminance(preferred);
    if ((Math.max(b, f) + 0.05) / (Math.min(b, f) + 0.05) >= 4.5)
      return preferred;
  }
  if ((b + 0.05) / (luminance("#141414") + 0.05) >= 4.5) return "#141414";
  return 1.05 / (b + 0.05) >= 4.5 ? "#ffffff" : "#000000";
}
function contrast(first: string, second: string) {
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function imageExtreme(base: string, opacity: number, white: boolean) {
  return (
    "#" +
    [1, 3, 5]
      .map((i) =>
        Math.round(
          parseInt(base.slice(i, i + 2), 16) * (1 - opacity) +
            (white ? 255 : 0) * opacity,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function readableOverImage(text: string, base: string, opacity: number) {
  return (
    Math.min(
      contrast(text, imageExtreme(base, opacity, false)),
      contrast(text, imageExtreme(base, opacity, true)),
    ) >= 4.5
  );
}
export function safeBackgroundOpacity(appearance: CollectionAppearance) {
  const base = appearance.colors.electric,
    text = readableColor(base),
    requested = appearance.background_strength / 100;
  if (readableOverImage(text, base, requested)) return requested;
  let low = 0,
    high = requested;
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    if (readableOverImage(text, base, mid)) low = mid;
    else high = mid;
  }
  return Math.max(0, low - 0.005);
}
export function appearanceStyle(
  a: CollectionAppearance,
  backgroundUrl: string | null = null,
): CSSProperties & Record<`--${string}`, string> {
  const c = a.colors;
  const opacity = backgroundUrl ? safeBackgroundOpacity(a) : 0;
  const foreground = readableColor(c.electric);
  const accent = readableOverImage(c.acid, c.electric, opacity)
    ? c.acid
    : foreground;
  return {
    "--collection-background-image": backgroundUrl
      ? `url(${JSON.stringify(backgroundUrl)})`
      : "none",
    "--collection-background-repeat":
      a.background_mode === "pattern" ? "repeat" : "no-repeat",
    "--collection-background-size":
      a.background_mode === "pattern"
        ? `${a.background_tile_size}px auto`
        : "cover",
    "--collection-background-opacity": String(opacity),
    "--color-arma-electric": c.electric,
    "--color-arma-acid": c.acid,
    "--color-arma-coral": c.coral,
    "--color-arma-ink": c.ink,
    "--color-arma-paper": c.paper,
    "--collection-on-electric": readableColor(c.electric),
    "--collection-on-acid": readableColor(c.acid),
    "--collection-on-coral": readableColor(c.coral),
    "--collection-on-ink": readableColor(c.ink),
    "--collection-accent-on-electric": accent,
    "--collection-accent-on-ink": readableColor(c.ink, c.acid),
  };
}
export function localToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Monterrey",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
