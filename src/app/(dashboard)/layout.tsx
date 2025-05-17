"use client";

import React from "react";
import { SessionGuard } from "../context/sessionGuardWrapper";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "../components/custom-reuseable/sidebar/app-sidebar";
import Header from "../components/custom-reuseable/sidebar/header";
import { Card, CardContent } from "@/components/ui/card";

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
          <main className="w-full h-full">
            <CardContent>{children}</CardContent>
          </main>
        </div>
      </SidebarProvider>
    </SessionGuard>
  );
}
