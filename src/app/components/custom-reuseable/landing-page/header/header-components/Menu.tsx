"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface MenuItem {
  title: string;
  id?: string;
  href?: string;
  type: "scroll" | "link";
}

interface MenuHeaderProps {
  onMenuClick: (targetId: string) => void;
}

const items: MenuItem[] = [
  { title: "Home", id: "homepage", type: "scroll" },
  { title: "Features", id: "features", type: "scroll" },
  { title: "About", id: "about", type: "scroll" },
  { title: "Desco Team", id: "desco-team", type: "scroll" },
  { title: "Contacts Us", id: "clients", type: "scroll" },
  { title: "Assets", href: "/assets", type: "link" },
];

const items2: MenuItem[] = [
  { title: "Home", href: "/landing-page", type: "link" },
  { title: "Features", href: "/landing-page", type: "link" },
  { title: "About", href: "/landing-page", type: "link" },
  { title: "Desco Team", href: "/landing-page", type: "link" },
  { title: "Contacts Us", href: "/landing-page", type: "link" },
  { title: "Assets", href: "/assets", type: "link" },
];

export const MenuHeader: React.FC<MenuHeaderProps> = ({ onMenuClick }) => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep server/client HTML consistent until after mounting
  const listToShow = mounted && pathname === "/assets" ? items2 : items;

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
