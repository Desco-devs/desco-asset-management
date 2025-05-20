// SessionGuard.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import GuardLoader from "../components/custom-reuseable/loader";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.userStatus === "INACTIVE")) {
      router.replace("/") // Redirect to login or home page
    }
  }, [loading, user, router]);

  if (loading) {
    return <GuardLoader />; // Loading spinner or placeholder
  }

  if (!user) {
    return null; // Prevent flicker before redirect
  }

  return <>{children}</>;
}
