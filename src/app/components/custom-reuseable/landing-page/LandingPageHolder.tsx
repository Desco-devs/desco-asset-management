"use client";

import AboutUs from "./landing-components/AboutUs";
import FeaturesPage from "./landing-components/Features";
import HeroPage from "./landing-components/HeroPage";

const LandingPageHolder = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <HeroPage />
      <FeaturesPage />
      <AboutUs />
    </div>
  );
};

export default LandingPageHolder;
