"use client";

import { ModeToggle } from "@/app/components/custom-reusable/darkmode-toggle/ThemeButton";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function AssetsHeader() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      toast.loading("Logging out...", { id: "logout" });
      await signOut();
      toast.success("Logged out successfully!", { id: "logout" });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to logout. Please try again.", { id: "logout" });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/40 dark:bg-chart-3/10 backdrop-blur-sm">
      <div className="w-full flex flex-row items-center justify-between md:px-8 px-4 md:h-[12dvh] h-[10dvh]">
        {/* Logo */}
        <div className="flex items-center">
          <Image
            className="rounded-md dark:hidden block md:w-14 md:h-14 w-12 h-12"
            src="/images/logo/logo4.svg"
            alt="Desco Logo"
            width={56}
            height={56}
          />
          <Image
            className="rounded-md dark:block hidden md:w-14 md:h-14 w-12 h-12"
            src="/images/logo/logo2.svg"
            alt="Desco Logo"
            width={56}
            height={56}
          />
        </div>

        {/* Theme Toggle and Logout - Responsive */}
        <div className="flex items-center md:gap-4 gap-2">
          <ModeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 md:h-10 h-9 md:px-4 px-2 font-medium md:text-sm text-xs"
          >
            {isLoggingOut ? (
              <Loader2 className="md:h-4 md:w-4 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="md:h-4 md:w-4 h-4 w-4" />
            )}
            <span className="md:block hidden">
              {isLoggingOut ? "Logging out..." : "Logout"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
