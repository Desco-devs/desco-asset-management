"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import GuradLoader from "../components/custom-reuseable/loader";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { user, supabaseUser, loading } = useAuth();
  const router = useRouter();
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    // Delay the loader for 2 seconds before checking user status
    const timer = setTimeout(() => {
      setShowLoader(false); // Hide loader after 2 seconds
    }, 2000);

    return () => clearTimeout(timer); // Cleanup the timer on component unmount
  }, []);

  useEffect(() => {
    // Redirect to login if no Supabase user or user status is inactive
    if (!loading && (!supabaseUser || !user || user.user_status === "INACTIVE")) {
      router.replace("/login"); // Redirect to login page
    }
  }, [loading, user, supabaseUser, router]);

  if (showLoader || loading) {
    return <GuradLoader />; // Show the loader for 2 seconds or while loading
  }

  if (!supabaseUser || !user) {
    return null; // Prevent flicker before redirect
  }

  return <>{children}</>;
}
