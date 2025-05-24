"use client";

import AboutUs from "./landing-components/AboutUs";
import FeaturesPage from "./landing-components/Features";
import HeroPage from "./landing-components/HeroPage";
import OurTeam from "./landing-components/OurTeam";
import SupportPage from "./landing-components/Support";

const LandingPageHolder = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <HeroPage />
      <FeaturesPage />
      <AboutUs />
      <OurTeam />
      <SupportPage />
    </div>
  );
};

export default LandingPageHolder;
