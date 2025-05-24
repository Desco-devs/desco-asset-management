"use client";

import { features } from "@/lib/color";
import { Icon } from "@iconify/react";

const FeaturesPage = () => {
  return (
    <div className="h-full flex flex-col gap-[10dvh] items-center justify-center w-full bg-white/10 dark:bg-chart-3/10">
      <div className="flex flex-col gap-8 mt-[25dvh] relative items-center justify-center h-fit w-fit">
        <span
          className="absolute z-10 -top-[4rem] text-7xl font-extrabold bg-gradient-to-b from-accent-foreground/20 via-accent-foreground/10 to-accent-foreground/0 
        dark:from-muted-foreground/40 dark:via-muted-foreground/20 dark:to-muted-foreground/0 text-transparent bg-clip-text inline-block"
        >
          FEATURES
        </span>
        <span className="text-6xl font-bold max-w-screen-md text-center z-20 font-sans drop-shadow-md">
          Powering Progress with Precision Engineering I
        </span>
        <p className="w-full max-w-screen-sm text-center z-20 text-muted-foreground">
          DESCO, Inc. is a leading Philippine engineering company providing
          reliable, full-spectrum solutions across energy, power, and industrial
          sectors.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 h-screen">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`flex flex-col items-center justify-center gap-4 p-4 group`}
          >
            <Icon
              icon={feature.icon}
              className="w-24 h-24 p-6 dark:bg-accent-foreground/10 dark:group-hover:bg-chart-1 dark:group-hover:text-accent-foreground bg-transparent group-hover:bg-chart-1 text-chart-1 group-hover:text-accent duration-300 ease-in-out transition-all rounded-full"
            />
            <h3 className="text-xl font-bold">{feature.title}</h3>
            <p className="text-center w-full max-w-64">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturesPage;
