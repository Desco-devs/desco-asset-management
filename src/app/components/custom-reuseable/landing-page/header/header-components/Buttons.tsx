"use client";

import { Button } from "@/components/ui/button";

const Buttons = () => {
  return (
    <div className="flex flex-row items-center gap-6">
      <Button className="bg-chart-2 rounded-sm py-6 w-24 hover:bg-chart-3 text-lg dark:text-chart-1 dark:bg-accent-foreground">
        Sign In
      </Button>
      <Button className="bg-chart-3 rounded-sm py-6 w-24 hover:bg-chart-2 text-lg dark:text-chart-1 dark:bg-accent-foreground">
        More
      </Button>
    </div>
  );
};

export default Buttons;
