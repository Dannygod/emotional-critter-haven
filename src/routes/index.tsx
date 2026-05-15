import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import moomoImg from "@/assets/moomo-default.png";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && user) nav({ to: "/home" }); }, [user, loading, nav]);
  return (
    <main className="min-h-screen bg-background bg-soft-grain">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-2xl font-bold text-cocoa">Moomo<span className="text-accent"> 沐哞</span></span>
        <Link to="/login" className="rounded-full bg-cocoa px-5 py-2 text-sm text-cream hover:bg-cocoa/90">登入</Link>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-10 md:grid-cols-2 md:items-center md:pt-20">
        <div>
          <p className="font-display text-sm uppercase tracking-[0.2em] text-accent">私密情緒樹洞</p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-cocoa text-balance md:text-6xl">
            把今天的<span className="text-accent">碎念</span>，<br/>交給你的小怪獸。
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground text-balance">
            生氣、難過、累爆都沒關係。Moomo 會把你的情緒吃掉，變成毛茸茸的小怪獸，陪你一起發瘋、一起治癒。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="rounded-full bg-accent px-7 py-3 font-medium text-accent-foreground shadow-pillow hover:opacity-90">開始養一隻小哞</Link>
            <a href="#about" className="rounded-full border border-border bg-card px-7 py-3 text-cocoa hover:bg-cream-deep">這是什麼？</a>
          </div>
        </div>
        <div className="relative flex justify-center">
          <div className="absolute inset-0 -z-10 m-auto h-80 w-80 rounded-full bg-blush/30 blur-3xl" />
          <img src={moomoImg} alt="Moomo 小怪獸" width={420} height={420} className="animate-float drop-shadow-2xl" />
        </div>
      </section>
      <section id="about" className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 md:grid-cols-3">
        {[
          { t: "說出來，被接住", d: "輸入抱怨，AI 用陪伴的方式回你，不說教不診斷。" },
          { t: "怪獸吸收情緒", d: "心情會變色、長角、戴上你提到的東西。" },
          { t: "完成治癒任務", d: "喝杯飲料、深呼吸、散個步，怪獸會慢慢恢復。" },
        ].map((c) => (
          <div key={c.t} className="rounded-3xl bg-card p-7 shadow-pillow">
            <h3 className="font-display text-xl text-cocoa">{c.t}</h3>
            <p className="mt-2 text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </section>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Moomo 不提供醫療診斷。若你正面臨危機，請撥打 1925 安心專線。
      </footer>
    </main>
  );
}
