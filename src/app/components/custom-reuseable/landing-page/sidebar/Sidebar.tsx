"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface MenuItem {
  title: string;
  id: string;
  href: string;
}

interface SidebarLandingPageProps {
  onMenuClick: (targetId: string) => void;
}

const items = [
  { title: "Home", id: "homepage", href: "/landing-page" },
  { title: "Features", id: "features", href: "#" },
  { title: "About", id: "about", href: "#" },
  { title: "Desco Team", id: "desco-team", href: "#" },
  { title: "Clients", id: "clients", href: "#" },
  { title: "Login", id: "login", href: "/login" },
  { title: "Assets", id: "assets", href: "/assets" },
];
const items2 = [
  { title: "Home", id: "homepage", href: "/landing-page" },
  // { title: "Features", id: "features", href: "#" },
  // { title: "About", id: "about", href: "#" },
  // { title: "Desco Team", id: "desco-team", href: "#" },
  // { title: "Clients", id: "clients", href: "#" },
  { title: "Login", id: "login", href: "/login" },
  { title: "Assets", id: "assets", href: "/assets" },
];

export default function SidebarLandingPage({
  onMenuClick,
}: SidebarLandingPageProps) {
  const pathname = usePathname(); // e.g. "/assets" or "/landing-page"
  const list = pathname === "/assets" ? items2 : items;

  const handleClick = (id: string) => {
    console.log("Menu item clicked:", id);
    onMenuClick(id);
  };

  return (
    <div className="md:hidden w-full h-dvh fixed inset-0 z-[100] bg-background">
      <ul className="w-full h-full flex flex-col items-center justify-center gap-12 dark:bg-chart-3/60 bg-chart-3 z-[100]">
        {list.map((item) => (
          <a href={item.href} key={item.id}>
            <li
              className="cursor-pointer font-semibold text-md text-accent dark:text-muted-foreground hover:text-chart-1/80 dark:hover:text-accent-foreground duration-300 ease-in-out transition-all"
              onClick={() => handleClick(item.id)}
            >
              {item.title}
            </li>
          </a>
        ))}
      </ul>
    </div>
  );
}
