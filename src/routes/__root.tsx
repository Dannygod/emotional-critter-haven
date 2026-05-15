import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-soft-grain px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-cocoa">404</h1>
        <p className="mt-3 text-muted-foreground">這裡空空的，小哞也找不到。</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-cocoa px-6 py-2 text-sm text-cream">回家</Link>
      </div>
    </div>
  );
}
function ErrorView({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-soft-grain px-4">
      <div className="max-w-md rounded-3xl bg-card p-8 text-center shadow-pillow">
        <h2 className="font-display text-xl text-cocoa">出了點小狀況</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-full bg-accent px-5 py-2 text-sm text-accent-foreground">再試一次</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Moomo 沐哞 — 把碎念交給你的小怪獸" },
      { name: "description", content: "Moomo 沐哞 是一個私密情緒樹洞。把今天的不爽餵給你的小怪獸，看著牠變化、收集配件、完成治癒任務。" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Figtree:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: Shell,
  component: Root,
  notFoundComponent: NotFound,
  errorComponent: ErrorView,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
function Root() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
