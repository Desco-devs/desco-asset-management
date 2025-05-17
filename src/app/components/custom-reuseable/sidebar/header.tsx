"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
import { ModeToggle } from "../darkmode-button/ThemeButton";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import UserProfile from "../user-profile";

const Header = () => {
  const pathname = usePathname();
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  // Update time every second
  useEffect(() => {
    const updateDateTime = () => {
      // Create a date object for Philippines time (UTC+8)
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Manila",
        month: "long",
        day: "numeric",
        year: "numeric",
      };

      // Format date: "January 01, 2025"
      const formattedDate = now.toLocaleDateString("en-US", options);
      setCurrentDate(formattedDate);

      // Format time: "12:34:56 PM"
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      const formattedTime = now.toLocaleTimeString("en-US", timeOptions);
      setCurrentTime(formattedTime);
    };

    // Update immediately and then every second
    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Convert path to breadcrumb segments
  const getPathSegments = () => {
    // Remove leading slash and split by remaining slashes
    const segments = pathname.split("/").filter(Boolean);

    // Format segments for display (capitalize first letter, replace hyphens with spaces)
    return segments.map((segment) =>
      segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  };

  const pathSegments = getPathSegments();
  const currentPage =
    pathSegments.length > 0
      ? pathSegments[pathSegments.length - 1]
      : "Dashboard";

  // Create paths for each breadcrumb segment
  const getBreadcrumbPaths = () => {
    const paths = [];
    const segments = pathname.split("/").filter(Boolean);

    for (let i = 0; i < segments.length - 1; i++) {
      const path = "/" + segments.slice(0, i + 1).join("/");
      paths.push({
        name: segments[i]
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        path,
      });
    }

    return paths;
  };

  const breadcrumbPaths = getBreadcrumbPaths();

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
                <BreadcrumbSeparator className="hidden md:block" />

                {/* Dynamic breadcrumb segments */}
                {breadcrumbPaths.map((item, index) => (
                  <BreadcrumbItem key={index} className="hidden md:block">
                    <BreadcrumbLink href={item.path}>
                      {item.name}
                    </BreadcrumbLink>
                    <BreadcrumbSeparator />
                  </BreadcrumbItem>
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
