"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
// Removed Permission import as we're using role-based system
import { useAuth } from "@/app/context/AuthContext";

interface MenuItem {
  title: string;
  id?: string;
  href?: string;
  type: "scroll" | "link";
  requiredRole?: 'VIEWER' | 'ADMIN' | 'SUPERADMIN'; // Optional role requirement
}

interface MenuHeaderProps {
  onMenuClick: (targetId: string) => void;
}

const baseItems: MenuItem[] = [
  { title: "Home", id: "homepage", type: "scroll" },
  { title: "Features", id: "features", type: "scroll" },
  { title: "About", id: "about", type: "scroll" },
  { title: "Desco Team", id: "desco-team", type: "scroll" },
  { title: "Contacts Us", id: "clients", type: "scroll" },
];

const baseItems2: MenuItem[] = [
  { title: "Home", href: "/landing-page", type: "link" },
  { title: "Features", href: "/landing-page", type: "link" },
  { title: "About", href: "/landing-page", type: "link" },
  { title: "Desco Team", href: "/landing-page", type: "link" },
  { title: "Contacts Us", href: "/landing-page", type: "link" },
];

// Define which permission is needed for assets (adjust as needed)
const assetsItem: MenuItem = {
  title: "Assets",
  href: "/assets",
  type: "link",
  // requiredPermission: Permission.VIEW_ASSETS // Uncomment if you want permission-based access
};

export const MenuHeader: React.FC<MenuHeaderProps> = ({ onMenuClick }) => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to check if user has required role
  const hasRole = (requiredRole?: 'VIEWER' | 'ADMIN' | 'SUPERADMIN'): boolean => {
    if (!requiredRole) return true; // No role required
    if (!user) return false; // Not authenticated
    return user.role === requiredRole || user.role === 'ADMIN' || user.role === 'SUPERADMIN';
  };

  // Build items array based on authentication and pathname
  const getItemsToShow = () => {
    // Don't show authenticated content until we're mounted and not loading
    if (!mounted || loading) {
      return pathname === "/assets" ? baseItems2 : baseItems;
    }

    const baseList = pathname === "/assets" ? baseItems2 : baseItems;

    // Add Assets item only if user is authenticated and has role
    const canViewAssets = user && hasRole(assetsItem.requiredRole);
    return canViewAssets ? [...baseList, assetsItem] : baseList;
  };

  const listToShow = getItemsToShow();

  return (
    <div>
      <ul className="w-fit flex flex-row items-center gap-12">
        {listToShow.map((item) => {
          if (item.type === "scroll" && item.id) {
            return (
              <li
                key={item.id}
                className="cursor-pointer font-semibold text-md text-muted-foreground hover:text-chart-1/80 dark:hover:text-accent-foreground duration-300 ease-in-out transition-all"
                onClick={() => item.id && onMenuClick(item.id)}
              >
                {item.title}
              </li>
            );
          } else if (item.type === "link" && item.href) {
            return (
              <li key={item.title}>
                <Link
                  href={item.href}
                  className="font-semibold text-md text-muted-foreground hover:text-chart-1/80 dark:hover:text-accent-foreground duration-300 ease-in-out transition-all"
                >
                  {item.title}
                </Link>
              </li>
            );
          } else return null;
        })}
      </ul>
    </div>
  );
};

export default MenuHeader;
