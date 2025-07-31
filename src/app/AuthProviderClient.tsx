// src/app/ClientProviders.tsx (client component)

"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./context/AuthContext"; // adjust path
import TanstackProvider from "./context/TanstackProvider";
export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TanstackProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </TanstackProvider>
    </ThemeProvider>
  );
}
