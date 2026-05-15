import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { submitEmotion } from "@/lib/emotion.functions";
import moomoImg from "@/assets/moomo-default.png";

export const Route = createFileRoute("/_authenticated/home")({ component: HomePage });

function HomePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const submit = useServerFn(submitEmotion);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<string | null>(null);

  const { data: monster } = useQuery({
    queryKey: ["monster", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("monsters").select("*").eq("user_id", user!.id).eq("status", "active").maybeSingle();
      if (data) return data;
      const { data: created, error } = await supabase.from("monsters").insert({ user_id: user!.id }).select().single();
      if (error) throw error;
      return created;
    },
  });

  const mut = useMutation({
    mutationFn: async (txt: string) => submit({ data: { monsterId: monster!.id, text: txt } }),
    onSuccess: (r) => {
      setReply(r.reply);
      setText("");
      qc.invalidateQueries({ queryKey: ["monster"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (r.safetyLevel !== "none") toast.warning("如果你覺得難以承受，請聯繫信任的人或撥打 1925");
    },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => { if (monster && !reply) setReply("嗨，今天心情怎麼樣？想說什麼都可以告訴我。"); }, [monster, reply]);

  if (!monster) return <div className="text-muted-foreground">準備你的小哞中…</div>;

  const mood = monster.mood_score;
  const moodLabel = mood > 30 ? "心情不錯" : mood > -10 ? "還算平靜" : mood > -50 ? "有點低落" : "很需要被抱抱";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-[2rem] bg-card p-6 shadow-pillow md:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 -z-10 m-auto h-64 w-64 rounded-full bg-blush/30 blur-3xl" />
            <img src={monster.image_url || moomoImg} alt={monster.name} width={280} height={280} className="animate-breathe drop-shadow-xl" />
          </div>
          <h2 className="mt-4 font-display text-2xl text-cocoa">{monster.name}</h2>
          <p className="text-sm text-muted-foreground">{moodLabel}</p>

          <div className="mt-6 flex w-full max-w-md gap-3 text-xs">
            <Bar label="負面" value={monster.negative_energy} color="bg-blush" />
            <Bar label="正面" value={monster.positive_energy} color="bg-leaf" />
          </div>
        </div>
      </div>

      {reply && (
        <div className="rounded-3xl border border-accent/30 bg-cream p-5 shadow-pillow">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-sm leading-relaxed text-cocoa">{reply}</p>
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) mut.mutate(text); }} className="rounded-3xl bg-card p-4 shadow-pillow">
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} placeholder="想說些什麼……今天最讓你不爽的事是？" className="w-full resize-none bg-transparent px-3 py-2 outline-none placeholder:text-muted-foreground" />
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="text-xs text-muted-foreground">{text.length}/1000</span>
          <button disabled={!text.trim() || mut.isPending} className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground shadow-pillow disabled:opacity-50">
            {mut.isPending ? "小哞正在吃..." : (<><Send className="h-3.5 w-3.5" />餵給小哞</>)}
          </button>
        </div>
      </form>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1">
      <div className="mb-1 flex justify-between"><span className="text-muted-foreground">{label}</span><span className="text-cocoa">{value}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-cream-deep"><div className={`h-full ${color} transition-all`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}
