import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Auto-assign healing tasks based on the monster's negative energy level.
 * Higher negativity → more tasks (up to 5).
 */
export async function assignTasks(
  supabase: SupabaseClient,
  userId: string,
  monsterId: string,
  negativeEnergy: number,
) {
  const taskCount = negativeEnergy > 50 ? 5 : 2;

  const { data: existing } = await supabase
    .from("user_tasks")
    .select("id")
    .eq("monster_id", monsterId)
    .eq("status", "assigned");

  const need = Math.max(0, taskCount - (existing?.length || 0));
  if (need <= 0) return;

  const { data: pool } = await supabase
    .from("healing_tasks")
    .select("id")
    .eq("active", true)
    .limit(20);

  const shuffled = (pool || []).sort(() => Math.random() - 0.5).slice(0, need);
  if (shuffled.length) {
    await supabase.from("user_tasks").insert(
      shuffled.map((t) => ({ user_id: userId, monster_id: monsterId, task_id: t.id })),
    );
  }
}
