"use client";

import AboutUs from "./landing-components/AboutUs";
import FeaturesPage from "./landing-components/Features";
import HeroPage from "./landing-components/HeroPage";
import OurTeam from "./landing-components/OurTeam";
import SupportPage from "./landing-components/Support";

const LandingPageHolder: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <section id="homepage" className="w-full min-h-screen">
        <HeroPage />
      </section>
      <section id="features" className="w-full min-h-screen">
        <FeaturesPage />
      </section>
      <section id="about" className="w-full min-h-screen">
        <AboutUs />
      </section>
      <section id="desco-team" className="w-full h-fit">
        <OurTeam />
      </section>
      <section id="clients" className="w-full min-h-screen">
        <SupportPage />
      </section>
    </div>
  );
};

export default LandingPageHolder;
