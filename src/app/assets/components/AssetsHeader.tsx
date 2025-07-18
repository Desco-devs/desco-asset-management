"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { ModeToggle } from "@/app/components/custom-reusable/darkmode-toggle/ThemeButton";

export default function AssetsHeader() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/40 dark:bg-chart-3/10 backdrop-blur-sm">
      <div className="w-full flex flex-row items-center justify-between md:px-8 px-4 md:h-[12dvh] h-[10dvh]">
        {/* Logo */}
        <div className="flex items-center">
          <img
            className="rounded-md dark:hidden block md:w-14 md:h-14 w-12 h-12"
            src="/images/logo/logo4.svg"
            alt="Desco Logo"
          />
          <img
            className="rounded-md dark:block hidden md:w-14 md:h-14 w-12 h-12"
            src="/images/logo/logo2.svg"
            alt="Desco Logo"
          />
        </div>

        {/* Theme Toggle and Logout - Responsive */}
        <div className="flex items-center md:gap-4 gap-2">
          <ModeToggle />
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2 md:h-10 h-9 md:px-4 px-2 font-medium md:text-sm text-xs"
          >
            <LogOut className="md:h-4 md:w-4 h-4 w-4" />
            <span className="md:block hidden">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}