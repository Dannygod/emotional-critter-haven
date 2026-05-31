import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisResult } from "./ai-schema";

// ── Body color mapping ─────────────────────────────────────
const EMOTION_BODY: Record<string, string> = {
  anger: "clay", sadness: "sky", anxiety: "lavender",
  fatigue: "cream", frustration: "peach", loneliness: "lavender",
  embarrassment: "blush", neutral: "cream", comfort: "butter",
};

// ── Chinese tag normalization ──────────────────────────────
const SUPPORTED_CHINESE_TAGS = [
  "雨", "哭", "生氣", "緊張", "開心", "害羞", "平靜", "煩", "吵架", "累", "睡眠",
  "害怕", "難過", "放鬆", "被愛", "慶祝", "受傷", "孤單", "抱抱", "休息", "壓力", "夜晚", "睡不著",
];

// ── Static fallback parts (used when DB is not seeded) ─────
const FALLBACK_PARTS: Record<string, Record<string, string[]>> = {
  eyes: {
    normal: ["neutral", "comfort"],
    angry: ["anger", "frustration", "生氣", "吵架"],
    sleepy: ["fatigue", "neutral", "累", "睡眠"],
    nervous: ["anxiety", "embarrassment", "緊張", "害怕"],
    teary: ["sadness", "loneliness", "哭", "難過"],
    sparkle: ["comfort", "neutral", "開心"],
  },
  mouth: {
    smile: ["comfort", "neutral", "開心", "平靜"],
    frown: ["sadness", "anxiety", "fatigue", "frustration", "loneliness", "embarrassment", "anger"],
  },
  head: {
    raincloud: ["sadness", "loneliness", "雨", "哭", "難過"],
    flame: ["anger", "frustration", "生氣", "火大"],
    halo: ["comfort", "neutral", "放鬆"],
    flowercrown: ["comfort", "loneliness", "開心", "被愛"],
    partyhat: ["comfort", "neutral", "開心", "慶祝"],
    bandage: ["sadness", "fatigue", "frustration", "受傷", "累"],
  },
  hand: {
    plush: ["sadness", "loneliness", "comfort", "孤單", "抱抱"],
    tissue: ["sadness", "哭", "難過"],
    teacup: ["fatigue", "comfort", "累", "休息"],
    hammer: ["anger", "frustration", "生氣", "壓力"],
    balloon: ["comfort", "embarrassment", "開心", "害羞"],
  },
  background: {
    cream: ["neutral", "fatigue"],
    rain: ["sadness", "loneliness", "雨", "難過"],
    stars: ["anxiety", "loneliness", "夜晚", "睡不著"],
    hearts: ["comfort", "embarrassment", "被愛", "害羞"],
    sparks: ["anger", "frustration", "生氣", "煩"],
  },
};

/** Normalize raw keywords from AI to supported Chinese tags. */
function normalizeKeywords(rawKeywords: string[]): string[] {
  return rawKeywords.map((kw) => {
    const trimmed = kw.trim();
    if (SUPPORTED_CHINESE_TAGS.includes(trimmed)) return trimmed;
    for (const tag of SUPPORTED_CHINESE_TAGS) {
      if (trimmed.includes(tag) || tag.includes(trimmed)) return tag;
    }
    return trimmed;
  });
}

/**
 * Query sprite_parts from DB and build the full appearance object.
 */
export async function pickAppearance(
  supabase: SupabaseClient,
  analysis: AnalysisResult,
  prevAppearance: Record<string, unknown>,
) {
  const rawKeywords = (analysis.concreteKeywords || []).map((k) => k.text).filter(Boolean);
  const normalizedKeywords = normalizeKeywords(rawKeywords);

  const tags = [analysis.primaryEmotion, ...normalizedKeywords].filter(Boolean);
  const uniqueTags = [...new Set(tags)];

  const { data: candidates } = await supabase
    .from("sprite_parts")
    .select("layer,key,emotion_tags,rarity")
    .in("layer", ["eyes", "mouth", "head", "hand", "background"])
    .overlaps("emotion_tags", uniqueTags);

  const pick = (layer: string): string | null => {
    const pool = (candidates || []).filter((c) => c.layer === layer);
    if (pool.length > 0) {
      const weighted = pool.flatMap((p) =>
        Array(p.rarity === "common" ? 3 : p.rarity === "rare" ? 1 : 1).fill(p.key),
      );
      return weighted[Math.floor(Math.random() * weighted.length)] as string;
    }

    // Static fallback in case DB is not seeded
    const layerFallback = FALLBACK_PARTS[layer];
    if (!layerFallback) return null;
    const matchedKeys: string[] = [];
    for (const [key, tagsList] of Object.entries(layerFallback)) {
      if (tagsList.some((t) => uniqueTags.includes(t))) matchedKeys.push(key);
    }
    return matchedKeys.length > 0
      ? matchedKeys[Math.floor(Math.random() * matchedKeys.length)]
      : null;
  };

  const bodyKey = EMOTION_BODY[analysis.primaryEmotion] || (prevAppearance.body as string) || "cream";

  return {
    ...prevAppearance,
    body: bodyKey,
    eyes: pick("eyes") ?? prevAppearance.eyes ?? "normal",
    mouth: pick("mouth") ?? prevAppearance.mouth ?? null,
    head: pick("head") ?? prevAppearance.head ?? null,
    hand: pick("hand") ?? prevAppearance.hand ?? null,
    background: pick("background") ?? prevAppearance.background ?? "cream",
    primaryEmotion: analysis.primaryEmotion,
    tags: uniqueTags,
  };
}
