"use client";

import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "../components/custom-reusable/sidebar/app-sidebar";
import Header from "../components/custom-reusable/sidebar/header";
import { CardContent } from "@/components/ui/card";

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
          <CardContent className="p-0">{children}</CardContent>
        </main>
      </div>
    </SidebarProvider>
  );
}