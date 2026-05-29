import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { MonsterSprite, type MonsterAppearance } from "@/components/MonsterSprite";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/gallery")({ component: GalleryPage });

type SpritePart = Database["public"]["Tables"]["sprite_parts"]["Row"];
type Layer = "body" | "eyes" | "mouth" | "head" | "hand" | "background";

const layers: { key: Layer; label: string }[] = [
  { key: "body", label: "身體" },
  { key: "eyes", label: "眼睛" },
  { key: "mouth", label: "嘴巴" },
  { key: "head", label: "頭飾" },
  { key: "hand", label: "手持物" },
  { key: "background", label: "背景" },
];

function GalleryPage() {
  const { user } = useAuth();
  const [activeLayer, setActiveLayer] = useState<Layer>("body");

  const { data: parts = [], isLoading: partsLoading } = useQuery({
    queryKey: ["sprite-parts"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sprite_parts")
        .select("*")
        .eq("active", true)
        .order("layer")
        .order("name");
      if (error) throw error;
      return data as SpritePart[];
    },
  });

  const { data: allMonsters = [] } = useQuery({
    queryKey: ["all-monsters-appearances", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monsters")
        .select("appearance")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
  });

  const unlockedKeys = useMemo(() => {
    const unlocked = new Set<string>(["body:cream", "eyes:normal", "background:cream"]);
    const collect = (appearance: unknown) => {
      const a = (appearance || {}) as MonsterAppearance;
      layers.forEach(({ key }) => {
        const value = a[key];
        if (value) unlocked.add(`${key}:${value}`);
      });
    };

    allMonsters.forEach((m) => {
      collect(m.appearance);
    });

    return unlocked;
  }, [allMonsters]);

  const unlockedParts = useMemo(
    () => parts.filter((part) => unlockedKeys.has(`${part.layer}:${part.key}`)),
    [parts, unlockedKeys],
  );
  const visibleParts = unlockedParts.filter((part) => part.layer === activeLayer);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-accent">
            <Sparkles className="h-4 w-4" /> 小哞圖鑑
          </p>
          <h1 className="mt-1 font-display text-3xl text-cocoa">已解鎖部件</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            這裡收著你的小哞曾經長出的樣子。每次封存日記後，當下的組合也會留在圖鑑記憶裡。
          </p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card px-5 py-3 text-sm text-muted-foreground shadow-pillow">
          已解鎖 <span className="font-display text-xl text-cocoa">{unlockedParts.length}</span> 件
        </div>
      </header>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {layers.map((layer) => {
          const count = unlockedParts.filter((part) => part.layer === layer.key).length;
          const active = activeLayer === layer.key;
          return (
            <button
              key={layer.key}
              onClick={() => setActiveLayer(layer.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                active
                  ? "bg-accent text-accent-foreground shadow-pillow"
                  : "bg-card text-cocoa hover:bg-cream-deep"
              }`}
            >
              {layer.label} {count}
            </button>
          );
        })}
      </div>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {partsLoading && (
          <p className="text-sm text-muted-foreground">整理圖鑑中…</p>
        )}
        {!partsLoading && visibleParts.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
            這一類還沒有解鎖部件。多陪小哞聊聊，牠會慢慢長出新的樣子。
          </div>
        )}
        {visibleParts.map((part) => (
          <article key={part.id} className="rounded-3xl border border-border/70 bg-card p-5 shadow-pillow">
            <div className="flex items-center gap-4">
              <MonsterSprite
                appearance={previewAppearance(part)}
                size={104}
                animate={false}
                className="shrink-0 rounded-2xl"
              />
              <div className="min-w-0">
                <p className="font-display text-lg text-cocoa">{part.name}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{part.rarity}</p>
                {part.emotion_tags.length > 0 && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {part.emotion_tags.join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function previewAppearance(part: SpritePart): MonsterAppearance {
  const base: MonsterAppearance = {
    body: "cream",
    eyes: "normal",
    background: "cream",
  };

  return {
    ...base,
    [part.layer]: part.key,
  };
}
