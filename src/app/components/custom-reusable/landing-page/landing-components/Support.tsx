"use client";

import { Separator } from "@/components/ui/separator";
import { contactUs } from "@/lib/color";
import { Icon } from "@iconify/react/dist/iconify.js";

const SupportPage = () => {
  return (
    <div className="h-fit md:mt-[30dvh] mt-[20dvh] flex flex-col gap-[5dvh] items-center justify-center w-full bg-transparent">
      <div className="flex md:flex-row flex-col md:gap-0 gap-6 items-center justify-center w-full max-w-[80%] mx-auto">
        <div className="flex flex-col gap-8 relative items-start justify-center h-fit w-full">
          <span
            className="absolute z-10 md:-top-[5rem] -top-[3rem] md:text-8xl text-5xl font-extrabold bg-gradient-to-b from-accent-foreground/20 via-accent-foreground/10 to-accent-foreground/0 
            dark:from-muted-foreground/40 dark:via-muted-foreground/20 dark:to-muted-foreground/0 text-transparent bg-clip-text inline-block"
          >
            Support
          </span>
          <span className="md:text-6xl text-3xl capitalize font-bold max-w-screen-sm text-left z-20 font-sans drop-shadow-md">
            Need Any Help?
            <br />
            Contact Us
          </span>
          <p className="w-full max-w-screen-sm text-left z-20 text-muted-foreground">
            We’d love to hear from you. Whether you have questions about our
            services, need support, or want to explore partnership
            opportunities, our team is ready to assist you. Reach out and let’s
            connect.
          </p>
        </div>
        <div className="w-full">
          <div className="flex flex-row gap-6 items-center md:justify-center justify-start">
            <Separator
              orientation="vertical"
              className="border-2 border-accent-foreground md:px-12 px-4"
            />
            <span className="md:text-4xl text-2xl">Example@gmail.com</span>
          </div>
        </div>
      </div>
      <Separator className="w-full max-w-[80%] mx-auto bg-amber-700/30" />
      <div className="grid grid-cols1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-[80%] mx-auto pb-[20dvh]">
        {contactUs.map((contact, index) => (
          <div
            key={index}
            className="flex flex-col items-start justify-center  group w-full"
          >
            <span className="text-xl font-bold">{contact.title}</span>
            <span className="text-lg text-muted-foreground font-semibold">
              {contact.value}
            </span>
          </div>
        ))}
        <div className="flex flex-col items-start justify-start  group w-full">
          <div className="text-xl font-bold flex flex-row gap-2 md:ml-4 -ml-2 items-center">
            <Icon icon="gg:facebook" className="w-8 h-8 cursor-pointer" />
            <Icon icon="uil:linkedin" className="w-8 h-8 cursor-pointer" />
            <Icon icon="ri:twitter-fill" className="w-8 h-8 cursor-pointer" />
            <Icon icon="ri:youtube-fill" className="w-8 h-8 cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
