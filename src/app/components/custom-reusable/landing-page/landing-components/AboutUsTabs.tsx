"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";

const AboutUsTabs = () => {
  return (
    <div className="w-full ">
      <Tabs defaultValue="about" className="w-full">
        <TabsList className="grid w-full md:max-w-[80%] mx-auto md:px-0 px-6 grid-cols-3 bg-transparent border-b border-border/20 rounded-none h-auto p-0">
          <TabsTrigger
            value="about"
            className="text-lg font-semibold py-4 px-6 bg-transparent border-0 border-b-2 border-transparent rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-chart-1 data-[state=active]:text-chart-1 data-[state=active]:shadow-none hover:text-chart-1 dark:hover:text-chart-1 hover:border-b-chart-1 transition-all duration-300 ease-in-out"
          >
            Our People
          </TabsTrigger>
          <TabsTrigger
            value="mission"
            className="text-lg font-semibold py-4 px-6 bg-transparent border-0 border-b-2 border-transparent rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-chart-1 data-[state=active]:text-chart-1 data-[state=active]:shadow-none hover:text-chart-1 dark:hover:text-chart-1 hover:border-b-chart-1 transition-all duration-300 ease-in-out"
          >
            Our Mission
          </TabsTrigger>
          <TabsTrigger
            value="vision"
            className="text-lg font-semibold py-4 px-6 bg-transparent border-0 border-b-2 border-transparent rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-chart-1 data-[state=active]:text-chart-1 data-[state=active]:shadow-none hover:text-chart-1 dark:hover:text-chart-1 hover:border-b-chart-1 transition-all duration-300 ease-in-out"
          >
            Our Vision
          </TabsTrigger>
        </TabsList>

        <div className="mt-8 w-full max-w-[80%] mx-auto">
          <TabsContent value="about" className="space-y-4 w-full">
            <div className="w-full md:flex md:flex-row-reverse md:gap-12">
              <div className="w-full">
                <Image
                  width={700}
                  height={700}
                  src="/images/static/empty-image.png"
                  alt="About Us"
                  className="rounded-lg shadow-lg w-full h-full object-cover md:block hidden"
                />
              </div>
              <div className="w-full flex flex-col gap-2 text-sm">
                <h3 className="text-3xl font-bold">
                  People Behind Precision: Skilled. Reliable. Proven.
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  At DESCO, our people are dedicated and hardworking to satisfy
                  our clients.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  They are also known for their expertise and experience.
                </p>

                <p className="text-muted-foreground leading-relaxed">
                  We have shortened our response time to meet clients&apos;
                  requirements through our partnerships with reputable suppliers
                  of raw materials abroad.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  This has allowed us to shorten acquisition time of crucial raw
                  materials when local suppliers are not available.
                </p>

                <p className="text-muted-foreground leading-relaxed">
                  We have an in-house engineering group tasked with technical
                  analysis, design and drawing manned by highly trained
                  engineers using Auto-CAD and Solidworks Simulation
                  Professional.
                </p>

                <p className="text-muted-foreground leading-relaxed">
                  We have highly skilled machinists and fabricators capable of
                  translating drawings and work instructions into quality
                  finished goods.
                </p>

                <p className="text-muted-foreground leading-relaxed">
                  DESCO’s project management team is qualified and experienced
                  in mechanical, electrical, civil, instrumentation and control
                  works.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mission" className="space-y-4 w-full">
            <div className="w-full flex md:flex-row md:gap-12">
              <div className="w-full md:block hidden">
                <Image
                  width={700}
                  height={700}
                  src="/images/static/empty-image.png"
                  alt="About Us"
                  className="rounded-lg shadow-lg w-full h-full object-cover md:block hidden"
                />
              </div>
              <div className="w-full flex flex-col gap-4 ">
                <h3 className="text-3xl font-bold">
                  Empowering People, Planet, and Progress Through Engineering
                  Excellence
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We are a company that looks at the long-term thus we
                  continually <strong>Develop</strong> mutually beneficial
                  strategic relationships toward sustainable growth.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We recognize our people as our most important asset therefore
                  we <strong>Enhance</strong> the competence of our workforce to
                  be among the best in their class and to elevate their quality
                  of life.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We safeguard all our stakeholders’ welfare as well as that of
                  mother earth. We <strong>Serve</strong> our clients&apos;
                  requirements with utmost consideration for health, safety and
                  the environment.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  As a good corporate citizen, we <strong>Conduct</strong> our
                  business lawfully and ethically.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  To thrive in an increasingly competitive global environment,
                  we <strong>Optimize</strong> operational efficiency by
                  continuously improving our systems and processes.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="vision" className="space-y-4 w-full">
            <div className="w-full flex md:flex-row-reverse md:gap-12">
              <div className="w-full md:block hidden">
                <Image
                  width={700}
                  height={700}
                  src="/images/static/empty-image.png"
                  alt="About Us"
                  className="rounded-lg shadow-lg w-full h-full object-cover md:block hidden"
                />
              </div>
              <div className="w-full flex flex-col gap-4">
                <h3 className="text-3xl font-bold">
                  Integrated Energy Solutions with Purpose and Impact
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  To be the leading provider of integrated solutions, and
                  value-added products and services in the Energy Sector.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  This vision underscores DESCO&apos;s commitment to delivering
                  comprehensive and innovative solutions within the energy
                  industry. By focusing on integration and value addition, DESCO
                  aims to meet the evolving needs of its clients, ensuring
                  efficiency, sustainability, and excellence in all its
                  offerings.
                </p>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AboutUsTabs;
