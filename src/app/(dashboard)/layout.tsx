"use client";

import React from "react";
import { SessionGuard } from "../context/sessionGuardWrapper";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "../components/custom-reuseable/sidebar/app-sidebar";
import Header from "../components/custom-reuseable/sidebar/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionGuard>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex h-screen w-full flex-col">
          <Header />
          <div className="w-full h-full">{children}</div>
        </div>
      </SidebarProvider>
    </SessionGuard>
  );
}
