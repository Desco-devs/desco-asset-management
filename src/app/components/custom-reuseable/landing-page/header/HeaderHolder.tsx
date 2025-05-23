"use client";

import { useState, useEffect } from "react";
import Buttons from "./header-components/Buttons";
import LogoHeader from "./header-components/Logo";
import MenuHeader from "./header-components/Menu";
import ModeAndSearch from "./header-components/ModeAndSearch";

const HeaderHolder = () => {
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
      className={`
        w-full border border-black flex flex-row items-center justify-evenly font-sans
        sticky top-0 z-50 transition-all duration-300
        ${
          isSticky
            ? "bg-white/80 dark:bg-black/80 backdrop-blur-md h-[12dvh]"
            : "bg-transparent h-[15dvh] pt-5"
        }
      `}
    >
      <LogoHeader />
      <MenuHeader />
      <div className="flex flex-row items-center gap-8">
        <Buttons />
        <ModeAndSearch />
      </div>
    </div>
  );
};

export default HeaderHolder;
