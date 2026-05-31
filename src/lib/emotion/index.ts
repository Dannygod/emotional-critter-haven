import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeEmotion } from "./ai-analyze";
import { computeMoodUpdate } from "./mood-calculator";
import { pickAppearance } from "./appearance-picker";
import { assignTasks } from "./task-assigner";

// ── Submit emotion input ───────────────────────────────────
export const submitEmotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { monsterId: string; text: string }) =>
    z.object({ monsterId: z.string().uuid(), text: z.string().min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. AI analysis (with Zod validation)
    const analysis = await analyzeEmotion(data.text);

    // 2. Get current monster (scoped to current user — never trust monsterId alone)
    const { data: monster } = await supabase
      .from("monsters").select("*")
      .eq("id", data.monsterId).eq("user_id", userId).single();
    if (!monster) throw new Error("找不到怪獸");

    // 3. Mood calculation
    const intensity = analysis.emotionIntensity || 50;
    const isComfort = analysis.isComforting || analysis.primaryEmotion === "comfort";
    const mood = computeMoodUpdate(monster, intensity, isComfort);

    // 4. Appearance composition
    const prevAppearance = (monster.appearance as Record<string, unknown>) || {};
    const appearance = await pickAppearance(supabase, analysis, prevAppearance);

    // 5. Update monster
    const { error: updateError } = await supabase.from("monsters").update({
      mood_score: mood.moodScore,
      negative_energy: mood.negativeEnergy,
      positive_energy: mood.positiveEnergy,
      appearance: appearance as any,
      updated_at: new Date().toISOString(),
    }).eq("id", data.monsterId);

    if (updateError) {
      console.error("PostgreSQL update error on monsters table:", updateError);
      throw new Error(`更新怪獸失敗: ${updateError.message}`);
    }

    // 6. Save accessory
    if (!isComfort && analysis.suggestedAccessory?.name) {
      const slot = analysis.suggestedAccessory.slot;
      await supabase.from("accessories").update({ equipped: false }).eq("monster_id", data.monsterId).eq("slot", slot);
      await supabase.from("accessories").insert({
        user_id: userId, monster_id: data.monsterId,
        slot, name: analysis.suggestedAccessory.name, source: "emotion",
      });
    }

    // 7. Save emotion entry
    await supabase.from("emotion_entries").insert({
      user_id: userId, monster_id: data.monsterId, raw_text: data.text,
      primary_emotion: analysis.primaryEmotion, emotion_intensity: intensity,
      llm_reply: analysis.reply, analysis, is_comforting: isComfort,
    });

    // 8. Auto-assign tasks
    await assignTasks(supabase, userId, data.monsterId, mood.negativeEnergy);

    return {
      reply: analysis.reply,
      primaryEmotion: analysis.primaryEmotion,
      appearance,
      moodScore: mood.moodScore,
      negativeEnergy: mood.negativeEnergy,
      positiveEnergy: mood.positiveEnergy,
      safetyLevel: analysis.safetyLevel,
    };
  });

// ── Complete a healing task ────────────────────────────────
export const completeUserTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { taskId: string; reflection?: string }) =>
    z.object({
      taskId: z.string().uuid(),
      reflection: z.string().max(200).optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: ut } = await supabase
      .from("user_tasks").select("*, healing_tasks(*)")
      .eq("id", data.taskId).single();
    if (!ut) throw new Error("找不到任務");

    // reflection column added via migration — cast to bypass generated types
    await (supabase.from("user_tasks").update as any)({
      status: "completed",
      completed_at: new Date().toISOString(),
      ...(data.reflection ? { reflection: data.reflection } : {}),
    }).eq("id", data.taskId);

    const reward = (ut.healing_tasks as { reward_value?: number })?.reward_value || 10;
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

// ── Abandon a healing task ─────────────────────────────────
export const abandonUserTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { taskId: string }) =>
    z.object({ taskId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("user_tasks").update({ status: "abandoned" }).eq("id", data.taskId);
    return { ok: true };
  });
