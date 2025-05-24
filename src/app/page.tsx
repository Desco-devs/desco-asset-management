// page.tsx - Main page component
"use client";

import { useCallback } from "react";
import HeaderHolder from "./components/custom-reuseable/landing-page/header/HeaderHolder";
import LandingPageHolder from "./components/custom-reuseable/landing-page/LandingPageHolder";

const Page = () => {
  const handleSmoothScroll = useCallback((targetId: string) => {
    console.log("Attempting to scroll to:", targetId); // Debug log

    const targetElement = document.getElementById(targetId);
    console.log("Target element found:", targetElement); // Debug log

    if (targetElement) {
      // Get header height dynamically
      const header = document.querySelector('[data-header="true"]');
      const headerHeight = header ? header.getBoundingClientRect().height : 100;

      console.log("Header height:", headerHeight); // Debug log

      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerHeight;

      console.log("Scrolling to position:", offsetPosition); // Debug log

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    } else {
      console.error("Element with ID not found:", targetId);
    }
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center h-full bg-green-200/10">
      {/* Green gradient overlay */}
      <div
        className="absolute inset-0 h-full w-full bg-gradient-to-tr from-white/30 from-0% via-green-200/30 via-80% to-white/20 to-100% pointer-events-none z-0
      dark:from-chart-3/30 dark:from-30% dark:via-green-200/30 dark:via-75% dark:to-chart-3/20 dark:to-120%"
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
        <HeaderHolder onMenuClick={handleSmoothScroll} />
        <LandingPageHolder />
      </div>
    </div>
  );
};

export default Page;
