"use client";

import { items } from "../header/header-components/Menu";
interface SidebarLandingPageProps {
  onMenuClick: (targetId: string) => void;
}
const SidebarLandingPage = ({ onMenuClick }: SidebarLandingPageProps) => {
  const handleClick = (id: string) => {
    console.log("Menu item clicked:", id); // Debug log
    onMenuClick(id);
  };
  return (
    <div className="w-full h-dvh fixed inset-0 z-[100] bg-background">
      <ul className="w-full h-full  flex flex-col items-center justify-center gap-12 bg-chart-3/60 z-[100]">
        {items.map((item) => (
          <li
            className="cursor-pointer font-semibold text-md text-muted-foreground hover:text-chart-1/80 dark:hover:text-accent-foreground duration-300 ease-in-out transition-all"
            key={item.id}
            onClick={() => handleClick(item.id)}
          >
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SidebarLandingPage;
