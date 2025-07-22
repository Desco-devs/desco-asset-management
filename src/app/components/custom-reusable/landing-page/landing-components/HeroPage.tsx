"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Triangle } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";

const HeroPage = () => {
  const words = useMemo(() => [
    "Trusted Company",
    "Business Solutions",
    "Digital Growth",
    "Success Partner",
  ], []);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const currentWord = words[currentWordIndex];

    const timeout = setTimeout(
      () => {
        if (isPaused) {
          setIsPaused(false);
          setIsDeleting(true);
          return;
        }

        if (isDeleting) {
          setCurrentText(currentWord.substring(0, currentText.length - 1));

          if (currentText === "") {
            setIsDeleting(false);
            setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length);
          }
        } else {
          setCurrentText(currentWord.substring(0, currentText.length + 1));

          if (currentText === currentWord) {
            setIsPaused(true);
          }
        }
      },
      isDeleting ? 100 : isPaused ? 2000 : 150
    );

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, isPaused, currentWordIndex, words]);

  return (
    <div className="md:h-dvh h-full w-full flex md:flex-row flex-col md:gap-0 md:py-0 py-[5dvh] md:mt-0 mt-[15dvh] gap-12">
      {/* left */}
      <div className="md:w-[110%] w-full">
        <div className="flex flex-col gap-8 w-full max-w-[80%] mx-auto h-full justify-center items-start ">
          <div className="w-fit bg-chart-1/8 text-chart-1 dark:bg-muted-foreground/40 dark:text-accent-foreground px-6 py-2 rounded-full md:text-lg text-base font-semibold flex items-center flex-row gap-2.5">
            <span className="w-2 h-2 rounded-full bg-chart-1 dark:bg-green-400 z-40"></span>
            Desco Company Trusted partner
          </div>
          <div className=" md:h-fit h-20">
            <p className="text-accent-foreground md:text-5xl text-3xl font-sans font-bold">
              Desco Company
              <br />
              <span>for Your </span>
              <span className="text-chart-1 dark:text-green-400">
                {currentText}
                <span className="animate-pulse text-current">|</span>
              </span>
            </p>
          </div>
          <div>
            <p className="w-full md:max-w-[90%] text-muted-foreground text-md font-sans font-normal">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit. Nesciunt
              adipisci rem aut quos tempora optio voluptate ipsum, cupiditate
              reprehenderit totam modi sed quidem doloribus, quo reiciendis
              vitae quae praesentium a!
            </p>
          </div>
          <div className="w-full flex md:flex-row flex-col gap-4 ">
            <Button className="rounded-sm flex items-center text-lg gap-2 py-6.5 w-full md:max-w-48 bg-chart-1 hover:bg-chart-1/80 dark:text-accent-foreground">
              Get Started <ArrowRight stroke="currentColor" size={32} />
            </Button>
            <Button className="rounded-sm bg-transparent bg-none flex items-center text-lg gap-3 py-6.5 w-full md:max-w-48 border md:border-none border-accent-foreground text-accent-foreground shadow-none hover:bg-transparent hover:text-chart-1">
              <Triangle
                fill="currentColor"
                className="hover:text-chart-1 rotate-90"
              />
              How it Work
            </Button>
          </div>
        </div>
      </div>
      {/* right */}
      <div className="w-[80%] md:mx-0 mx-auto flex flex-col items-start justify-center h-full">
        <Image
          className="shadow-2xl rounded-lg"
          width={450}
          height={450}
          src="/images/static/cap.jpg"
          alt="hero"
        />
      </div>
    </div>
  );
};

export default HeroPage;
