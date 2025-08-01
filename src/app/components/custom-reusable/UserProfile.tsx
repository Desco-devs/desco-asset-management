"use client";

import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  User,
  Loader2,
} from "lucide-react";
import { color } from "@/lib/color";

export default function UserProfile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  // Memoize initials to prevent re-computation on every render
  const initials = useMemo(() => {
    return user?.full_name
      ? user.full_name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
      : "U";
  }, [user?.full_name]);

  // Memoize profile navigation handler
  const handleProfileClick = useCallback(() => {
    router.push('/profile');
  }, [router]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      toast.loading("Logging out...", { id: "logout" });
      
      // Sign out and wait for completion
      await signOut();
      
      // Small delay to ensure auth state is cleared
      await new Promise(resolve => setTimeout(resolve, 200));
      
      toast.success("Logged out successfully!", { id: "logout" });
      
      // Navigate to login page
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to logout. Please try again.", { id: "logout" });
      setLoggingOut(false);
      
      // Force navigation even if logout had issues
      setTimeout(() => {
        router.replace("/login");
      }, 1000);
    }
  }, [signOut, router]);

  if (!user) {
    // Optionally you can render null or a placeholder if user is not loaded yet
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.user_profile || undefined} alt={user.full_name} />
            <AvatarFallback className={`${color}`}>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.full_name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.phone ?? "No phone number"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleProfileClick}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>{loggingOut ? "Logging out..." : "Log out"}</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
