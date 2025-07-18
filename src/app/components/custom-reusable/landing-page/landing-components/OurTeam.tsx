// "use client";

// const OurTeam = () => {
//   return (
//     <div>
//       <h1>OurTeam</h1>
//     </div>
//   );
// };

// export default OurTeam;

"use client";

import Image from "next/image";

interface Partner {
  name: string;
  logo: string;
  alt: string;
}

const partners: Partner[] = [
  {
    name: "OSM Thome",
    logo: "/images/partners/wabtec.png",
    alt: "OSM Thome logo",
  },
  {
    name: "WALLEM",
    logo: "/images/partners/emerson.png",
    alt: "WALLEM logo",
  },
  {
    name: "BSM",
    logo: "/images/partners/suez.png",
    alt: "BSM logo",
  },
  {
    name: "CROSSWORLD",
    logo: "/images/partners/jen.png",
    alt: "CROSSWORLD logo",
  },
  {
    name: "sonator",
    logo: "/images/partners/ctc.png",
    alt: "sonator logo",
  },
  {
    name: "sonator2",
    logo: "/images/partners/nexus.png",
    alt: "sonator logo",
  },
];

const OurTeam = () => {
  // Create enough duplicates for seamless scrolling
  const extendedPartners = [...partners, ...partners, ...partners];

  return (
    <>
      <style jsx>{`
        .scroll-container {
          width: 100%;
          overflow: hidden;
          position: relative;
        }

        .scroll-content {
          display: flex;
          animation: infiniteScroll 30s linear infinite;
          width: fit-content;
        }

        @keyframes infiniteScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-100% / 3));
          }
        }

        .scroll-content:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="w-full  py-12 bg-green-200/10 dark:bg-chart-3/10 border-b border-border">
        <div className="w-full max-w-[80%] mx-auto ">
          {/* <h2 className="text-center text-2xl font-semibold mb-8">
            Our Partners
          </h2> */}
          <div className="scroll-container">
            <div className="scroll-content">
              {extendedPartners.map((partner, index) => (
                <div key={`partner-${index}`} className="flex-shrink-0 mx-8">
                  <div className="relative h-32 w-32">
                    <Image
                      src={partner.logo || "/placeholder.svg"}
                      alt={partner.alt}
                      fill
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OurTeam;
