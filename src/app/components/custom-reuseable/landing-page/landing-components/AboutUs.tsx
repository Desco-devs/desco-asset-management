"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import AboutUsTabs from "./AboutUsTabs";

const AboutUs = () => {
  return (
    <div className="h-full flex flex-col gap-[20dvh] pb-[5dvh] items-center justify-center w-full  bg-white/10 dark:bg-chart-3/10">
      <div className="flex flex-col gap-8 mt-[25dvh] relative items-center justify-center h-fit md:w-fit w-full md:max-w-full max-w-[80%]">
        <span
          className="absolute z-10 md:-top-[5rem] -top-[3rem] md:text-8xl text-5xl font-extrabold bg-gradient-to-b from-accent-foreground/20 via-accent-foreground/10 to-accent-foreground/0 
            dark:from-muted-foreground/40 dark:via-muted-foreground/20 dark:to-muted-foreground/0 text-transparent bg-clip-text inline-block"
        >
          ABOUT US
        </span>
        <span className="md:text-6xl text-3xl capitalize font-bold max-w-screen-sm text-center z-20 font-sans drop-shadow-md">
          Know Details About Our Company
        </span>
        <p className="w-full max-w-screen-sm text-center z-20 text-muted-foreground">
          At DESCO, we prioritize lasting, value-driven relationships with
          clients, partners, and communities while safeguarding employee and
          societal well-being.
        </p>
      </div>

      {/* Custom Tabs Section */}
      <AboutUsTabs />
    </div>
  );
};

export default AboutUs;
