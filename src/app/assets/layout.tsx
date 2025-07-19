import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function AssetsLayout({ children }: { children: ReactNode }) {
  // Server-side auth check - defense in depth
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user || error) {
    redirect('/login');
  }

  return (
    <div className="relative h-full w-full min-h-screen">
      {/* Beautiful gradient background like the landing page */}
      <div
        className="absolute inset-0 h-full w-full bg-gradient-to-tr from-white/30 from-0% via-green-200/30 via-80% to-white/20 to-100% pointer-events-none z-0
      dark:from-chart-3/30 dark:from-30% dark:via-green-200/30 dark:via-75% dark:to-chart-3/20 dark:to-120%"
      />
      
      <main className="relative z-10 h-full w-full">{children}</main>
    </div>
  );
}