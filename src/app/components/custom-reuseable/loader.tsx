"use client";

import { Loader2 } from "lucide-react";

const GuardLoader = () => {
  return (
    <div className="h-scree fixed inset-0  w-full flex items-center justify-center dark:bg-gray-900 dark:text-white bg-background text-gray-900 text-5xl">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
};

export default GuardLoader;
