// src/app/ClientProviders.tsx (client component)

"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./context/AuthContext"; // adjust path
import TanstackProvider from "./context/TanstackProvider";
import { DashboardRealtimeProvider } from "@/context/DashboardRealtimeContext";
// CHAT APP TEMPORARILY DISABLED FOR PRODUCTION BUILD
// import { SocketProvider } from "@/context/SocketContext";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TanstackProvider>
        <AuthProvider>
          <DashboardRealtimeProvider>
            {/* CHAT APP TEMPORARILY DISABLED FOR PRODUCTION BUILD */}
            {/* <SocketProvider> */}
              {children}
            {/* </SocketProvider> */}
          </DashboardRealtimeProvider>
        </AuthProvider>
      </TanstackProvider>
    </ThemeProvider>
  );
}
