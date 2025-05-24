"use client";

import FeaturesPage from "./landing-components/Features";
import HeroPage from "./landing-components/HeroPage";

const LandingPageHolder = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <HeroPage />
      <FeaturesPage />
    </div>
  );
};

export default LandingPageHolder;
