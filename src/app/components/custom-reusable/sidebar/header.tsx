"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "../darkmode-toggle/ThemeButton";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import UserProfile from "../UserProfile";

const Header = () => {
  const pathname = usePathname();
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  // Memoized date and time formatters
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
  }), []);

  const timeFormatter = useMemo(() => new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }), []);

  // Update time every second with cleanup
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(dateFormatter.format(now));
      setCurrentTime(timeFormatter.format(now));
    };

    updateDateTime(); // Initial call
    const intervalId = setInterval(updateDateTime, 1000);
    return () => clearInterval(intervalId);
  }, [dateFormatter, timeFormatter]);

  // Memoized breadcrumb calculation
  const { paths: breadcrumbPaths, currentPage } = useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];

    // If we're at root, just return empty
    if (segments.length === 0) return { paths: [], currentPage: "Dashboard" };

    // Configuration for different breadcrumb strategies
    const MAX_BREADCRUMB_SEGMENTS = 2; // Maximum segments to show before current page

    // Strategy 1: Show only first and last segments if path is too long
    let breadcrumbSegments = [];

    if (segments.length <= MAX_BREADCRUMB_SEGMENTS + 1) {
      // Short path: show all segments except the last one
      breadcrumbSegments = segments.slice(0, -1);
    } else {
      // Long path: show first segment and parent segment
      breadcrumbSegments = [
        segments[0], // First segment (e.g., "locations")
        segments[segments.length - 2], // Parent of current page
      ];
    }

    // Create breadcrumb paths
    const paths = breadcrumbSegments.map((segment, index) => {
      // For strategy with gaps, construct proper path
      let path;
      if (segments.length > MAX_BREADCRUMB_SEGMENTS + 1 && index === 1) {
        // This is the parent segment, construct full path
        path = "/" + segments.slice(0, -1).join("/");
      } else {
        // Normal path construction
        const originalIndex = segments.indexOf(segment);
        path = "/" + segments.slice(0, originalIndex + 1).join("/");
      }

      return {
        name: segment
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        path,
        isEllipsis: false,
      };
    });

    // Add ellipsis indicator if we skipped segments
    if (segments.length > MAX_BREADCRUMB_SEGMENTS + 1 && paths.length > 1) {
      paths.splice(1, 0, {
        name: "...",
        path: "#",
        isEllipsis: true,
      });
    }

    // Get current page name
    const currentPage = segments[segments.length - 1]
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return { paths, currentPage };
  }, [pathname]);

  return (
    <header className="w-full flex sticky top-0 bg-background h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b z-50">
      <div className="w-full flex items-center gap-2 px-4">
        {/* Sidebar trigger */}
        <SidebarTrigger className="-ml-1" />

        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="w-full flex items-center justify-between">
          {/* Routes */}
          <div className="flex flex-row items-center gap-12 w-fit">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">DESCO</BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbPaths.length > 0 && (
                  <BreadcrumbSeparator className="hidden md:block" />
                )}

                {/* Smart breadcrumb segments */}
                {breadcrumbPaths.map((item, index) => (
                  <React.Fragment key={`breadcrumb-${index}`}>
                    <BreadcrumbItem className="hidden md:block">
                      {item.isEllipsis ? (
                        <span className="text-muted-foreground">
                          {item.name}
                        </span>
                      ) : (
                        <BreadcrumbLink href={item.path}>
                          {item.name}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                  </React.Fragment>
                ))}

                {/* Current page */}
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentPage}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {/* Date and Time Cards */}
            <div className="hidden md:flex items-center gap-3 w-fit">
              <Card className="bg-card/50 rounded-sm backdrop-blur-sm flex items-center px-3 py-1.5 text-xs border shadow-sm">
                <span>{currentDate}</span>
              </Card>

              <Card className="rounded-sm  flex-row text-xs bg-card/50 backdrop-blur-sm flex items-center gap-1.5 px-3 py-1.5 border shadow-sm">
                <Clock className="h-3.5 w-3.5" />
                <span>{currentTime}</span>
              </Card>
            </div>
          </div>

          <div className="w-fit flex flex-row items-center gap-2">
            {/* Theme Toggle */}
            <ModeToggle />
            {/* User Profile */}
            <UserProfile />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
