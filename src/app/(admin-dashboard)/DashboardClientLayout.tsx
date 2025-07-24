"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "../components/custom-reusable/sidebar/app-sidebar";
import Header from "../components/custom-reusable/sidebar/header";
import { CardContent } from "@/components/ui/card";

function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const { setOpenMobile, isMobile } = useSidebar();
  const pathname = usePathname();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, setOpenMobile, isMobile]);

  return <>{children}</>;
}

export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex h-screen w-full flex-col">
        <Header />
        <main className="w-full h-full">
          <CardContent className="p-0">
            <SidebarWrapper>{children}</SidebarWrapper>
          </CardContent>
        </main>
      </div>
    </SidebarProvider>
  );
}