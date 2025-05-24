"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const Buttons = () => {
  const router = useRouter();
  return (
    <div className="flex flex-row items-center gap-6">
      <Button
        onClick={() => router.push("/login")}
        className="bg-chart-2 rounded-sm py-6 w-28 hover:bg-chart-3 text-lg dark:text-chart-1 dark:bg-accent-foreground"
      >
        Sign In
      </Button>
      <Button
        onClick={() => window.open("https://desco.ph", "_blank")}
        className="bg-chart-3 rounded-sm py-6 w-28 hover:bg-chart-2 text-lg dark:text-chart-1 dark:bg-accent-foreground"
      >
        More Info
      </Button>
    </div>
  );
};

export default Buttons;
