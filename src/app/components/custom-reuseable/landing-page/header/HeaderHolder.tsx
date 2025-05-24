"use client";

import { useState, useEffect } from "react";
import Buttons from "./header-components/Buttons";
import LogoHeader from "./header-components/Logo";
import MenuHeader from "./header-components/Menu";
import ModeAndSearch from "./header-components/ModeAndSearch";
import { AlignJustify } from "lucide-react";

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
        w-full  flex flex-row items-center md:justify-evenly justify-between md:px-0 px-6 font-sans
        md:sticky fixed top-0 z-50 transition-all duration-300
        ${
          isSticky
            ? "bg-white/40 dark:bg-chart-3/10 backdrop-blur-md h-[12dvh]"
            : "bg-transparent h-[15dvh] pt-5"
        }
      `}
    >
      <div className="">
        <LogoHeader />
      </div>
      <div className="md:block hidden">
        <MenuHeader />
      </div>
      <div className="md:flex hidden flex-row items-center gap-8">
        <Buttons />
        <ModeAndSearch />
      </div>
      <div className="md:hidden block">
        <AlignJustify size={36} />
      </div>
    </div>
  );
};

export default HeaderHolder;
