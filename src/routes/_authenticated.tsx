import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Home, ListChecks, BookHeart, Users, Settings as SettingsIcon, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

function Layout() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);
  if (loading || !user) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-breathe text-muted-foreground">載入中…</div></div>;

  const navs = [
    { to: "/home", icon: Home, label: "小哞" },
    { to: "/tasks", icon: ListChecks, label: "任務" },
    { to: "/diary", icon: BookHeart, label: "日記" },
    { to: "/community", icon: Users, label: "交流" },
    { to: "/settings", icon: SettingsIcon, label: "設定" },
  ];

  return (
    <div className="min-h-screen bg-background bg-soft-grain pb-24 md:pb-0 md:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/60 bg-cream/80 px-6 py-8 backdrop-blur md:flex">
        <Link to="/home" className="font-display text-2xl font-bold text-cocoa">Moomo<span className="text-accent"> 沐哞</span></Link>
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {navs.map((n) => {
            const active = loc.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm transition ${active ? "bg-accent text-accent-foreground shadow-pillow" : "text-cocoa hover:bg-cream-deep"}`}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={() => signOut()} className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm text-muted-foreground hover:text-cocoa"><LogOut className="h-4 w-4" /> 登出</button>
      </aside>
      <main className="px-4 py-6 md:px-10 md:py-10"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border/60 bg-cream/95 py-2 backdrop-blur md:hidden">
        {navs.map((n) => {
          const active = loc.pathname.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs ${active ? "text-accent" : "text-muted-foreground"}`}>
              <n.icon className="h-5 w-5" />{n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
