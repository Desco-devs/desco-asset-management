// HeaderHolder.tsx
"use client";

import { useState, useEffect } from "react";
import Buttons from "./header-components/Buttons";
import LogoHeader from "./header-components/Logo";
import MenuHeader from "./header-components/Menu";
import ModeAndSearch from "./header-components/ModeAndSearch";
import { AlignJustify, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "../../darkmode-button/ThemeButton";

interface HeaderHolderProps {
  onMenuClick: (targetId: string) => void;
  onToggleSidebar?: () => void; // Uncomment if you want to use the sidebar toggle
  isSidebarOpen?: boolean; // <-- add this
}

const HeaderHolder: React.FC<HeaderHolderProps> = ({
  onMenuClick,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      data-header="true" // Add this for dynamic header height detection
      className={`
        w-full  flex flex-row items-center md:justify-evenly justify-between md:px-0 px-6 font-sans
        md:sticky fixed top-0 z-[150] transition-all duration-300
        ${
          isSticky || isSidebarOpen
            ? "bg-white/40 dark:bg-chart-3/10 backdrop-blur-sm md:h-[12dvh] h-[10dvh]"
            : "bg-transparent md:h-[15dvh] h-[12dvh] pt-5"
        }
      `}
    >
      <div className="">
        <LogoHeader />
      </div>
      <div className="md:block hidden">
        <MenuHeader onMenuClick={onMenuClick} />
      </div>
      <div className="md:flex hidden flex-row items-center gap-8">
        <Buttons />
        <ModeAndSearch />
      </div>

      <div className="md:hidden flex items-center gap-4 p-0 bg-transparent hover:bg-transparent focus:bg-transparent shadow-none text-accent-foreground">
        <ModeToggle />

        <div className="md:hidden block ">
          <div className="relative w-10 h-10">
            <AlignJustify
              onClick={onToggleSidebar}
              className={`absolute inset-0 text-accent-foreground w-10 h-10 cursor-pointer transform transition duration-300 ease-in-out 
                ${
                  isSidebarOpen
                    ? "opacity-0 rotate-90 scale-75"
                    : "opacity-100 rotate-0 scale-100"
                }`}
            />
            <X
              onClick={onToggleSidebar}
              className={`absolute inset-0 w-10 h-10 text-accent dark:text-accent-foreground cursor-pointer transform transition duration-300 ease-in-out 
                ${
                  isSidebarOpen
                    ? "opacity-100 rotate-0 scale-100"
                    : "opacity-0 -rotate-90 scale-75"
                }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderHolder;
