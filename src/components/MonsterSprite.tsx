import { useMemo } from "react";
import { cn } from "@/lib/utils";

// Eagerly import all sprite PNGs at build time
const allSprites = import.meta.glob("@/assets/sprites/*/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function spriteUrl(layer: string, key: string | null | undefined): string | null {
  if (!key) return null;
  const entry = Object.entries(allSprites).find(([path]) =>
    path.endsWith(`/sprites/${layer}/${key}.png`),
  );
  return entry ? entry[1] : null;
}

export interface MonsterAppearance {
  body?: string | null; // default cream
  eyes?: string | null; // overlay full-face expression; null = body default
  mouth?: string | null;
  head?: string | null;
  hand?: string | null;
  background?: string | null;
  primaryEmotion?: string | null;
  palette?: string | null;
}

interface Props {
  appearance?: MonsterAppearance | null;
  size?: number;
  className?: string;
  animate?: boolean;
}

/**
 * Layered pixel-art monster sprite. Stacks 5 transparent PNGs (background, body,
 * head, eyes, hand) and renders with `image-rendering: pixelated` for crisp scaling.
 */
export function MonsterSprite({ appearance, size = 280, className, animate = true }: Props) {
  const a = appearance ?? {};
  const layers = useMemo(
    () => ({
      background: spriteUrl("background", a.background),
      body: spriteUrl("body", a.body || "cream"),
      head: spriteUrl("head", a.head),
      eyes: spriteUrl("eyes", a.eyes),
      mouth: spriteUrl("mouth", a.mouth),
      hand: spriteUrl("hand", a.hand),
    }),
    [a.background, a.body, a.head, a.eyes, a.mouth, a.hand],
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2rem]",
        animate && "animate-breathe",
        className,
      )}
      style={{
        width: size,
        height: size,
        imageRendering: "pixelated",
      }}
    >
      {/* Background fills full canvas */}
      {layers.background ? (
        <img
          src={layers.background}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <div className="absolute inset-0 bg-cream" />
      )}

      {/* Body */}
      <img
        src={layers.body ?? undefined}
        alt="怪獸身體"
        className="absolute left-1/2 top-1/2 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 object-contain"
        style={{ imageRendering: "pixelated" }}
      />

      {/* Eyes/face expression overlay — sits over body's default face */}
      {layers.eyes && (
        <img
          src={layers.eyes}
          alt=""
          aria-hidden
          className="absolute left-1/2 top-[31%] w-[56%] -translate-x-1/2 object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      )}

      {/* Mouth */}
      {layers.mouth && (
        <img
          src={layers.mouth}
          alt=""
          aria-hidden
          className="absolute left-1/2 top-[52%] w-[34%] -translate-x-1/2 object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      )}

      {/* Head accessory */}
      {layers.head && (
        <img
          src={layers.head}
          alt=""
          aria-hidden
          className="absolute left-1/2 top-[-4%] w-[52%] -translate-x-1/2 object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      )}

      {/* Hand held object */}
      {layers.hand && (
        <img
          src={layers.hand}
          alt=""
          aria-hidden
          className="absolute bottom-[9%] right-[4%] w-[34%] object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      )}
    </div>
  );
}

export default MonsterSprite;
