import { Flower2, Skull, Snowflake, TreePine } from "lucide-react";
import type { CollectionAppearance } from "../schemas/appearance.schema";
export function SeasonalDecoration({
  appearance,
  artworkUrl,
}: {
  appearance: CollectionAppearance;
  artworkUrl: string | null;
}) {
  if (appearance.decoration === "none" && !artworkUrl) return null;
  if (artworkUrl)
    return (
      <div
        aria-hidden="true"
        data-collection-decoration
        data-mode={appearance.artwork_mode}
        className="pointer-events-none overflow-hidden bg-arma-ink"
        style={{ height: appearance.artwork_height }}
      >
        {appearance.artwork_mode === "repeat" ? (
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url(${JSON.stringify(artworkUrl)})`,
              backgroundRepeat: "repeat-x",
              backgroundPosition: "center",
              backgroundSize: `auto ${appearance.artwork_height}px`,
            }}
          />
        ) : (
          <img
            src={artworkUrl}
            alt=""
            className="mx-auto h-full w-full max-w-[1440px] object-contain"
          />
        )}
      </div>
    );
  const dead = appearance.decoration === "muertos";
  const icons = dead
    ? [Flower2, Skull, Flower2, Flower2, Skull, Flower2]
    : [Snowflake, TreePine, Snowflake, Snowflake, TreePine, Snowflake];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative z-10 overflow-hidden border-b border-current/15 bg-arma-ink text-[color:var(--collection-accent-on-ink)]"
    >
      <div
        className={`mx-auto flex max-w-[1440px] items-center justify-around gap-4 px-5 ${appearance.intensity === "festive" ? "py-5 sm:py-7" : "py-3"}`}
      >
        {icons.map((Icon, i) => (
          <span
            key={i}
            className={`${appearance.intensity === "festive" ? "size-10 sm:size-14" : "size-7 sm:size-9"} ${i % 2 ? "rotate-6" : "-rotate-6"}`}
          >
            <Icon className="size-full" strokeWidth={1.25} />
          </span>
        ))}
      </div>
    </div>
  );
}
