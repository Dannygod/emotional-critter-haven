import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user, signOut } = useAuth();
  const [anon, setAnon] = useState("");
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("anonymous_name").eq("id", user.id).single().then(({ data }) => setAnon(data?.anonymous_name || ""));
  }, [user]);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({ anonymous_name: anon }).eq("id", user!.id);
    if (error) toast.error(error.message); else toast.success("已更新匿名暱稱");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-cocoa">設定</h1>
      <div className="mt-6 space-y-4">
        <div className="rounded-3xl bg-card p-6 shadow-pillow">
          <label className="text-sm text-muted-foreground">交流區匿名暱稱</label>
          <input value={anon} onChange={(e) => setAnon(e.target.value)} maxLength={32} className="mt-2 w-full rounded-full border border-border bg-background px-4 py-2 outline-none focus:border-accent" />
          <button onClick={save} className="mt-3 rounded-full bg-accent px-5 py-2 text-sm text-accent-foreground">儲存</button>
        </div>
        <div className="rounded-3xl bg-card p-6 shadow-pillow">
          <p className="text-sm text-muted-foreground">登入身份：{user?.email}</p>
          <button onClick={() => signOut()} className="mt-3 rounded-full border border-border bg-background px-5 py-2 text-sm text-cocoa hover:bg-cream-deep">登出</button>
        </div>
      </div>
    </div>
  );
}
