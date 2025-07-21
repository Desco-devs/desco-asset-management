import React from "react";
import DashboardClientLayout from "./DashboardClientLayout";
import ClientAuthGuard from "@/components/ClientAuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientAuthGuard redirectTo="/login">
      <DashboardClientLayout>{children}</DashboardClientLayout>
    </ClientAuthGuard>
  );
}
