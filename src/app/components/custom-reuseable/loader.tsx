"use client";

import { color } from "@/lib/color";

const GuardLoader = () => {
  return (
    <div
      className={`bg-chart-1/20 text-accent dark:bg-chart-1/20 dark:text-accent-foreground h-screen fixed inset-0  w-full flex items-center justify-center  text-5xl`}
    >
      <div className="animate-spin rounded-full h-16 w-h-16 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
};

export default GuardLoader;
