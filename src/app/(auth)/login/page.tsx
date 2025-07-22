"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { SignInForm } from "@/components/auth/forms/SignInForm";
import Image from "next/image";
import type { CarouselApi } from "@/components/ui/carousel";

const carouselItems = [
  "/images/static/1.jpg",
  "/images/static/2.jpg",
  "/images/static/3.jpg",
  "/images/static/4.jpg",
  "/images/static/5.jpg",
  "/images/static/6.jpg",
];

const Auth = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [authMode, setAuthMode] = useState<"signin" | "forgot">("signin");

  const goToForgotPassword = () => {
    setAuthMode("forgot");
  };


  useEffect(() => {
    if (!api) return;

    // Set up auto-sliding
    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api]);



  return (
    <div className="w-full h-screen flex flex-col md:flex-row dark:bg-chart-2 bg-gray-200">
      {/* Left: Fullscreen Carousel */}
      <div className="hidden md:block w-full h-full bg-muted relative overflow-hidden">
        <div
          className="absolute w-full h-full z-[500] bg-gradient-to-r dark:from-chart-2/30 dark:via-chart-2/50
                 dark:to-chart-2 from-gray-200/10 via-gray-200/40 to-gray-200"
        ></div>
        <Carousel
          setApi={setApi}
          className="w-full h-full"
          opts={{
            loop: true,
            align: "center",
          }}
        >
          <CarouselContent className="h-screen w-full m-0">
            {carouselItems.map((item, index) => (
              <CarouselItem key={index} className="h-full w-full p-0">
                <div className="h-full w-full">
                  <Card className="h-full w-full rounded-none border-0 p-0">
                    <CardContent className="h-full w-full p-0 flex items-center justify-center relative">
                      {/* Full background image */}
                      <Image
                        src={item}
                        fill
                        className="object-cover"
                        alt=""
                        sizes="50vw"
                        priority={index === 0}
                      />
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Right: Auth Section (Signin or Forgot Password) */}
      <div className="w-full h-full flex items-center justify-center">
        {authMode === "signin" ? (
          <SignInForm
            onForgotPassword={goToForgotPassword}
            onToggle={() => {}}
          />
        ) : (
          <div className="flex items-center justify-center">
            <p className="text-muted-foreground">Forgot password functionality coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
