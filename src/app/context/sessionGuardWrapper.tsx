"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import GuardLoader from "../components/custom-reuseable/loader";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/"); // or your login route
    }
  }, [loading, user, router]);

  if (loading) {
    return <GuardLoader />; // or spinner
  }

  if (!user) {
    return null; // prevent flicker
  }

  return <>{children}</>;
}
