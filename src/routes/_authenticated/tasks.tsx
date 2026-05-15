import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { completeUserTask, abandonUserTask } from "@/lib/emotion.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({ component: TasksPage });

function TasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const complete = useServerFn(completeUserTask);
  const abandon = useServerFn(abandonUserTask);

  const { data: tasks } = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_tasks").select("*, healing_tasks(*), monsters!inner(user_id, status)").eq("status", "assigned").eq("monsters.user_id", user!.id).eq("monsters.status", "active");
      return data || [];
    },
  });

  const done = useMutation({
    mutationFn: (id: string) => complete({ data: { taskId: id } }),
    onSuccess: () => { qc.invalidateQueries(); toast.success("做得好，小哞變開心了一點！"); },
  });
  const skip = useMutation({
    mutationFn: (id: string) => abandon({ data: { taskId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl text-cocoa">治癒任務</h1>
      <p className="mt-1 text-muted-foreground">一個小行動，讓小哞慢慢恢復元氣。</p>
      <div className="mt-6 space-y-3">
        {!tasks?.length && <div className="rounded-3xl bg-card p-8 text-center text-muted-foreground shadow-pillow">目前沒有任務，先去主畫面跟小哞聊聊吧。</div>}
        {tasks?.map((t: any) => (
          <div key={t.id} className="rounded-3xl bg-card p-5 shadow-pillow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-display text-lg text-cocoa">{t.healing_tasks.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.healing_tasks.description}</p>
                <span className="mt-2 inline-block rounded-full bg-cream-deep px-3 py-0.5 text-xs text-cocoa">+{t.healing_tasks.reward_value} 正面值</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => skip.mutate(t.id)} className="rounded-full bg-cream-deep p-2 text-muted-foreground hover:text-cocoa" title="放棄"><X className="h-4 w-4" /></button>
                <button onClick={() => done.mutate(t.id)} className="rounded-full bg-accent p-2 text-accent-foreground shadow-pillow" title="完成"><Check className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
