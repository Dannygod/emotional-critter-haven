import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Delete a single emotion entry (user must own it).
 */
export const deleteEmotionEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { entryId: string }) =>
    z.object({ entryId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("emotion_entries")
      .delete()
      .eq("id", data.entryId)
      .eq("user_id", userId);
    if (error) throw new Error(`刪除失敗: ${error.message}`);
    return { ok: true };
  });

/**
 * Clear ALL emotion entries for the current user.
 */
export const clearAllEmotionEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("emotion_entries")
      .delete()
      .eq("user_id", userId);
    if (error) throw new Error(`清除失敗: ${error.message}`);
    return { ok: true };
  });

/**
 * Delete all user data (soft-delete: clears all tables but keeps the auth account).
 * Tables with ON DELETE CASCADE will handle related rows automatically,
 * but we delete explicitly for clarity and to handle non-cascading tables.
 */
export const deleteAccountData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Order matters — delete children first to avoid FK violations
    // on tables without ON DELETE CASCADE from user-owned parents.
    await supabase.from("post_comments").delete().eq("user_id", userId);
    await supabase.from("post_likes").delete().eq("user_id", userId);
    await supabase.from("community_posts").delete().eq("user_id", userId);
    await supabase.from("user_tasks").delete().eq("user_id", userId);
    await supabase.from("emotion_entries").delete().eq("user_id", userId);
    await supabase.from("accessories").delete().eq("user_id", userId);
    await supabase.from("diaries").delete().eq("user_id", userId);
    await supabase.from("monsters").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);

    return { ok: true };
  });
