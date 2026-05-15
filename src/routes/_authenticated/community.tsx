import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import moomoImg from "@/assets/moomo-default.png";

export const Route = createFileRoute("/_authenticated/community")({ component: CommunityPage });

function CommunityPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [caption, setCaption] = useState("");

  const { data: posts } = useQuery({
    queryKey: ["posts"], enabled: !!user,
    queryFn: async () => (await supabase.from("community_posts").select("*").order("created_at", { ascending: false }).limit(50)).data || [],
  });
  const { data: monster } = useQuery({
    queryKey: ["monster", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("monsters").select("*").eq("user_id", user!.id).eq("status", "active").maybeSingle()).data,
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });

  const share = useMutation({
    mutationFn: async () => {
      if (!monster || !profile) throw new Error("找不到資料");
      await supabase.from("community_posts").insert({
        user_id: user!.id, monster_id: monster.id, anonymous_name: profile.anonymous_name,
        image_url: monster.image_url, caption, emotion_summary: (monster.appearance as any)?.primaryEmotion || "neutral",
      });
    },
    onSuccess: () => { setCaption(""); qc.invalidateQueries({ queryKey: ["posts"] }); toast.success("已匿名分享！"); },
    onError: (e: any) => toast.error(e.message),
  });

  const like = useMutation({
    mutationFn: async (postId: string) => {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user!.id });
      const { data: p } = await supabase.from("community_posts").select("like_count").eq("id", postId).single();
      await supabase.from("community_posts").update({ like_count: (p?.like_count || 0) + 1 }).eq("id", postId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl text-cocoa">匿名交流</h1>
      <p className="mt-1 text-muted-foreground">看看別人的小哞，也分享你的。</p>

      {monster && (
        <div className="mt-6 rounded-3xl bg-card p-5 shadow-pillow">
          <div className="flex gap-4">
            <img src={monster.image_url || moomoImg} alt="" className="h-20 w-20 rounded-2xl object-contain" />
            <div className="flex-1">
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} rows={2} placeholder="想對大家說些什麼？(選填)" className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent" />
              <button onClick={() => share.mutate()} disabled={share.isPending} className="mt-2 flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm text-accent-foreground"><Send className="h-3.5 w-3.5" />匿名分享</button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {posts?.map((p) => (
          <article key={p.id} className="rounded-3xl bg-card p-5 shadow-pillow">
            <img src={p.image_url || moomoImg} alt="" className="mx-auto h-32 w-32 object-contain" />
            <p className="mt-2 text-xs text-muted-foreground">{p.anonymous_name} · {p.emotion_summary}</p>
            {p.caption && <p className="mt-2 text-sm text-cocoa">{p.caption}</p>}
            <button onClick={() => like.mutate(p.id)} className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"><Heart className="h-3.5 w-3.5" />{p.like_count}</button>
          </article>
        ))}
      </div>
    </div>
  );
}
