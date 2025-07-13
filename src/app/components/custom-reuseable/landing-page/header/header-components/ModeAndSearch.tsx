"use client";

import { Search } from "lucide-react";
import { ModeToggle } from "../../../darkmode-button/ThemeButton";
import { Button } from "@/components/ui/button";

const ModeAndSearch = () => {
  return (
    <div className="flex flex-row items-center gap-4 w-fit">
      <Button className="border border-accent-foreground/30 rounded-md bg-background dark:bg-chart-3/10 w-9.5 hover:bg-muted/50">
        <Search
          className="text-sm text-accent-foreground"
          width={16}
          height={16}
        />
      </Button>
      <span className="border border-accent-foreground/30 rounded-md">
        <ModeToggle />
      </span>
    </div>
  );
};

export default ModeAndSearch;
