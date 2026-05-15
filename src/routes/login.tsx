import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import moomoImg from "@/assets/moomo-default.png";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav({ to: "/home" }); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/home" } });
        if (error) throw error;
        toast.success("歡迎加入 Moomo！");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) { toast.error(err.message || "出錯了"); } finally { setBusy(false); }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/home" });
    if (r.error) toast.error("Google 登入失敗");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background bg-soft-grain px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] bg-card shadow-pillow-lg md:grid-cols-2">
        <div className="hidden bg-cream-deep p-10 md:flex md:flex-col md:items-center md:justify-center">
          <img src={moomoImg} alt="" width={260} height={260} className="animate-breathe" />
          <p className="mt-4 text-center font-display text-xl text-cocoa">「今天又怎麼了？跟我說。」</p>
        </div>
        <div className="p-8 md:p-12">
          <Link to="/" className="text-sm text-muted-foreground hover:text-cocoa">← 回首頁</Link>
          <h1 className="mt-4 font-display text-3xl text-cocoa">{mode === "login" ? "歡迎回來" : "建立你的小哞"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? "繼續餵食你的小怪獸" : "三十秒，認識你的怪獸"}</p>
          <button onClick={google} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-2.5 text-sm font-medium hover:bg-cream-deep">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            使用 Google 登入
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />或<div className="h-px flex-1 bg-border" /></div>
          <form onSubmit={submit} className="space-y-3">
            <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-full border border-border bg-background px-5 py-2.5 outline-none focus:border-accent" />
            <input type="password" required minLength={6} placeholder="密碼" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-full border border-border bg-background px-5 py-2.5 outline-none focus:border-accent" />
            <button disabled={busy} className="w-full rounded-full bg-accent py-2.5 font-medium text-accent-foreground shadow-pillow disabled:opacity-50">{busy ? "處理中…" : mode === "login" ? "登入" : "註冊"}</button>
          </form>
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-cocoa">
            {mode === "login" ? "還沒有帳號？建立一個" : "已經有帳號了？登入"}
          </button>
        </div>
      </div>
    </main>
  );
}
