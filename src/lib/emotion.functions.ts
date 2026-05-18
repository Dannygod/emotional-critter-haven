import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMOTION_BODY: Record<string, string> = {
  anger: "clay", sadness: "sky", anxiety: "lavender",
  fatigue: "cream", frustration: "peach", loneliness: "lavender",
  embarrassment: "blush", neutral: "cream", comfort: "butter",
};

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    primaryEmotion: { type: "string", enum: ["anger","sadness","anxiety","fatigue","frustration","loneliness","embarrassment","neutral","comfort"] },
    emotionIntensity: { type: "number" },
    isComforting: { type: "boolean" },
    concreteKeywords: { type: "array", items: { type: "object", properties: { text: {type:"string"}, visualElement: {type:"string"} }, required:["text","visualElement"] } },
    suggestedAccessory: { type: "object", properties: { slot: {type:"string", enum:["head","face","body"]}, name: {type:"string"} }, required:["slot","name"] },
    reply: { type: "string" },
    safetyLevel: { type: "string", enum: ["none","self_harm","harm_others","crisis"] },
  },
  required: ["primaryEmotion","emotionIntensity","isComforting","concreteKeywords","suggestedAccessory","reply","safetyLevel"],
  additionalProperties: false,
} as const;

const SYSTEM = `你是「Moomo 沐哞」的情緒分析師。使用者會輸入一段碎碎念或抱怨。請用繁體中文，溫柔接住情緒，不說教不診斷。
分析主要情緒、強度(0-100)、抽取具象元素(學校、老師、雨等)並建議一個怪獸配件(head/face/body)。
回覆要短(2-3句)、像在拍拍對方的肩膀。若偵測自傷/傷人/危急，把 safetyLevel 設為對應值並在 reply 提供求助建議。`;

export const submitEmotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { monsterId: string; text: string }) =>
    z.object({ monsterId: z.string().uuid(), text: z.string().min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // call Lovable AI
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: data.text }],
        tools: [{ type: "function", function: { name: "analyze_emotion", description: "Return structured emotion analysis", parameters: ANALYSIS_SCHEMA } }],
        tool_choice: { type: "function", function: { name: "analyze_emotion" } },
      }),
    });
    if (!aiRes.ok) {
      if (aiRes.status === 429) throw new Error("AI 請求太頻繁了，等一下再試試");
      if (aiRes.status === 402) throw new Error("Lovable AI 額度用完了，請到設定加值");
      throw new Error("AI 分析失敗");
    }
    const aiJson = await aiRes.json();
    const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const analysis = tc ? JSON.parse(tc.function.arguments) : null;
    if (!analysis) throw new Error("AI 回應格式錯誤");

    // Get current monster (scoped to current user — never trust monsterId alone)
    const { data: monster } = await supabase
      .from("monsters").select("*")
      .eq("id", data.monsterId).eq("user_id", userId).single();
    if (!monster) throw new Error("找不到怪獸");

    // Update state
    const intensity = analysis.emotionIntensity || 50;
    const isComfort = analysis.isComforting || analysis.primaryEmotion === "comfort";
    const newNeg = isComfort ? Math.max(0, monster.negative_energy - 10) : Math.min(100, monster.negative_energy + intensity * 0.15);
    const newPos = isComfort ? Math.min(100, monster.positive_energy + 12) : monster.positive_energy;
    const newMood = Math.max(-100, Math.min(100, isComfort ? monster.mood_score + 10 : monster.mood_score - intensity * 0.1));

    // === Layer composition: query sprite_parts by emotion tags, random pick per layer ===
    const tags = [analysis.primaryEmotion, ...(analysis.concreteKeywords || []).map((k: any) => k.text)].filter(Boolean);
    const { data: candidates } = await supabase
      .from("sprite_parts")
      .select("layer,key,emotion_tags,rarity")
      .in("layer", ["eyes", "mouth", "head", "hand", "background"])
      .overlaps("emotion_tags", [analysis.primaryEmotion]);

    const pick = (layer: string) => {
      const pool = (candidates || []).filter((c) => c.layer === layer);
      if (!pool.length) return null;
      // weight: common 3, rare 1, epic for comfort only already filtered by tag
      const weighted = pool.flatMap((p) => Array(p.rarity === "common" ? 3 : p.rarity === "rare" ? 1 : 1).fill(p.key));
      return weighted[Math.floor(Math.random() * weighted.length)] as string;
    };

    const prevAppearance = (monster.appearance as any) || {};
    const bodyKey = prevAppearance.body || EMOTION_BODY[analysis.primaryEmotion] || "cream";
    const appearance = {
      ...prevAppearance,
      body: bodyKey,
      eyes: pick("eyes") ?? prevAppearance.eyes ?? "normal",
      mouth: pick("mouth") ?? prevAppearance.mouth ?? null,
      head: pick("head") ?? prevAppearance.head ?? null,
      hand: pick("hand") ?? prevAppearance.hand ?? null,
      background: pick("background") ?? prevAppearance.background ?? "cream",
      primaryEmotion: analysis.primaryEmotion,
      tags,
    };

    await supabase.from("monsters").update({
      mood_score: Math.round(newMood), negative_energy: Math.round(newNeg), positive_energy: Math.round(newPos),
      appearance, updated_at: new Date().toISOString(),
    }).eq("id", data.monsterId);

    // Save accessory
    if (!isComfort && analysis.suggestedAccessory?.name) {
      const slot = analysis.suggestedAccessory.slot;
      await supabase.from("accessories").update({ equipped: false }).eq("monster_id", data.monsterId).eq("slot", slot);
      await supabase.from("accessories").insert({ user_id: userId, monster_id: data.monsterId, slot, name: analysis.suggestedAccessory.name, source: "emotion" });
    }

    // Save entry
    await supabase.from("emotion_entries").insert({
      user_id: userId, monster_id: data.monsterId, raw_text: data.text,
      primary_emotion: analysis.primaryEmotion, emotion_intensity: intensity,
      llm_reply: analysis.reply, analysis, is_comforting: isComfort,
    });

    // Auto-assign tasks based on negative energy
    const taskCount = newNeg > 50 ? 5 : 2;
    const { data: existing } = await supabase.from("user_tasks").select("id").eq("monster_id", data.monsterId).eq("status", "assigned");
    const need = Math.max(0, taskCount - (existing?.length || 0));
    if (need > 0) {
      const { data: pool } = await supabase.from("healing_tasks").select("id").eq("active", true).limit(20);
      const shuffled = (pool || []).sort(() => Math.random() - 0.5).slice(0, need);
      if (shuffled.length) {
        await supabase.from("user_tasks").insert(shuffled.map((t) => ({ user_id: userId, monster_id: data.monsterId, task_id: t.id })));
      }
    }

    return { reply: analysis.reply, primaryEmotion: analysis.primaryEmotion, appearance, moodScore: Math.round(newMood), negativeEnergy: Math.round(newNeg), positiveEnergy: Math.round(newPos), safetyLevel: analysis.safetyLevel };
  });

export const completeUserTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { taskId: string }) => z.object({ taskId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: ut } = await supabase.from("user_tasks").select("*, healing_tasks(*)").eq("id", data.taskId).single();
    if (!ut) throw new Error("找不到任務");
    await supabase.from("user_tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", data.taskId);
    const reward = (ut.healing_tasks as any)?.reward_value || 10;
    const { data: m } = await supabase.from("monsters").select("*").eq("id", ut.monster_id).single();
    if (m) {
      await supabase.from("monsters").update({
        positive_energy: Math.min(100, m.positive_energy + reward),
        negative_energy: Math.max(0, m.negative_energy - Math.round(reward * 0.6)),
        mood_score: Math.max(-100, Math.min(100, m.mood_score + Math.round(reward * 0.5))),
      }).eq("id", m.id);
    }
    return { ok: true };
  });

export const abandonUserTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { taskId: string }) => z.object({ taskId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("user_tasks").update({ status: "abandoned" }).eq("id", data.taskId);
    return { ok: true };
  });
