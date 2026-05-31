import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, X, MessageCircle, Send, SkipForward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { completeUserTask, abandonUserTask } from "@/lib/emotion";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({ component: TasksPage });

function TasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const complete = useServerFn(completeUserTask);
  const abandon = useServerFn(abandonUserTask);
  const [reflectingId, setReflectingId] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");

  const { data: tasks } = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_tasks").select("*, healing_tasks(*), monsters!inner(user_id, status)").eq("status", "assigned").eq("monsters.user_id", user!.id).eq("monsters.status", "active");
      return data || [];
    },
  });

  const done = useMutation({
    mutationFn: ({ id, ref }: { id: string; ref?: string }) =>
      complete({ data: { taskId: id, reflection: ref || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("做得好，小哞變開心了一點！");
      setReflectingId(null);
      setReflection("");
    },
  });

  const skip = useMutation({
    mutationFn: (id: string) => abandon({ data: { taskId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const handleComplete = (taskId: string) => {
    setReflectingId(taskId);
    setReflection("");
  };

  const submitReflection = (taskId: string) => {
    done.mutate({ id: taskId, ref: reflection.trim() });
  };

  const skipReflection = (taskId: string) => {
    done.mutate({ id: taskId });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl text-cocoa">治癒任務</h1>
      <p className="mt-1 text-muted-foreground">一個小行動，讓小哞慢慢恢復元氣。</p>
      <div className="mt-6 space-y-3">
        {!tasks?.length && <div className="rounded-3xl bg-card p-8 text-center text-muted-foreground shadow-pillow">目前沒有任務，先去主畫面跟小哞聊聊吧。</div>}
        {tasks?.map((t: any) => {
          const isReflecting = reflectingId === t.id;

          return (
            <div key={t.id} className="rounded-3xl bg-card p-5 shadow-pillow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-display text-lg text-cocoa">{t.healing_tasks.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.healing_tasks.description}</p>
                  <span className="mt-2 inline-block rounded-full bg-cream-deep px-3 py-0.5 text-xs text-cocoa">+{t.healing_tasks.reward_value} 正面值</span>
                </div>
                {!isReflecting && (
                  <div className="flex gap-2">
                    <button onClick={() => skip.mutate(t.id)} className="rounded-full bg-cream-deep p-2 text-muted-foreground hover:text-cocoa" title="放棄"><X className="h-4 w-4" /></button>
                    <button onClick={() => handleComplete(t.id)} className="rounded-full bg-accent p-2 text-accent-foreground shadow-pillow" title="完成"><Check className="h-4 w-4" /></button>
                  </div>
                )}
              </div>

              {/* 反思輸入區 */}
              {isReflecting && (
                <div className="mt-4 rounded-2xl border border-accent/30 bg-cream/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-accent">
                    <MessageCircle className="h-4 w-4" />
                    <span className="font-medium">完成後你現在感覺……</span>
                  </div>
                  <textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    maxLength={200}
                    rows={2}
                    placeholder="寫下你完成任務後的感受（選填）"
                    className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-accent"
                    autoFocus
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{reflection.length}/200</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => skipReflection(t.id)}
                        disabled={done.isPending}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-cocoa hover:bg-cream-deep disabled:opacity-50"
                      >
                        <SkipForward className="h-3.5 w-3.5" /> 跳過
                      </button>
                      <button
                        onClick={() => submitReflection(t.id)}
                        disabled={done.isPending || !reflection.trim()}
                        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs text-accent-foreground shadow-pillow disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" /> {done.isPending ? "送出中…" : "送出"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
