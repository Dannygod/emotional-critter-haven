import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import moomoImg from "@/assets/moomo-default.png";
import { MonsterSprite } from "@/components/MonsterSprite";

export const Route = createFileRoute("/_authenticated/diary")({ component: DiaryPage });

function DiaryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: diaries } = useQuery({
    queryKey: ["diaries", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("diaries").select("*, monsters(*)").eq("user_id", user!.id).order("created_at", { ascending: false })).data || [],
  });
  const { data: current } = useQuery({
    queryKey: ["monster", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("monsters").select("*").eq("user_id", user!.id).eq("status", "active").maybeSingle()).data,
  });

  const archive = useMutation({
    mutationFn: async () => {
      if (!current) return;
      const startedAt = new Date(current.started_at);
      const ageDays = (Date.now() - startedAt.getTime()) / 86400000;
      if (ageDays < 1) throw new Error("小哞還沒滿一天，再陪牠久一點吧。");
      const { data: entries } = await supabase.from("emotion_entries").select("primary_emotion").eq("monster_id", current.id);
      const counts: Record<string, number> = {};
      (entries || []).forEach((e) => { if (e.primary_emotion) counts[e.primary_emotion] = (counts[e.primary_emotion] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
      await supabase.from("diaries").insert({
        user_id: user!.id, monster_id: current.id,
        start_date: startedAt.toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10),
        emotion_summary: { counts, top }, appearance: current.appearance, final_image_url: current.image_url, monster_snapshot: current,
      });
      await supabase.from("monsters").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", current.id);
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("小哞已經睡進日記裡了。"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-cocoa">情緒日記</h1>
          <p className="mt-1 text-muted-foreground">每隻小哞都是一段你走過的路。</p>
        </div>
        {current && <button onClick={() => archive.mutate()} className="rounded-full bg-cocoa px-5 py-2 text-sm text-cream hover:bg-cocoa/90">封存目前的小哞</button>}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {!diaries?.length && <div className="col-span-full rounded-3xl bg-card p-8 text-center text-muted-foreground shadow-pillow">還沒有日記。陪小哞滿一天就能封存囉。</div>}
        {diaries?.map((d: any) => (
          <article key={d.id} className="rounded-3xl bg-card p-5 shadow-pillow">
            <div className="flex justify-center">
              {d.appearance ? (
                <MonsterSprite appearance={d.appearance as any} size={160} animate={false} className="rounded-2xl" />
              ) : (
                <img src={d.final_image_url || moomoImg} alt="" className="h-40 w-40 object-contain" />
              )}
            </div>
            <h3 className="mt-3 font-display text-lg text-cocoa">{d.monsters?.name || "小哞"}</h3>
            <p className="text-xs text-muted-foreground">{d.start_date} → {d.end_date}</p>
            <p className="mt-2 text-sm text-cocoa">最常出現：<span className="text-accent">{d.emotion_summary?.top || "neutral"}</span></p>
          </article>
        ))}
      </div>
    </div>
  );
}
