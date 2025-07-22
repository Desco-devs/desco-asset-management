"use client";

import Image from "next/image";

const LogoHeader = () => {
  return (
    <>
      <Image
        className="rounded-md dark:hidden block md:w-14 md:h-14 w-12 h-12"
        src="/images/logo/logo4.svg"
        alt="Logo"
        width={56}
        height={56}
      />
      <Image
        className="rounded-md dark:block hidden md:w-14 md:h-14 w-12 h-12"
        src="/images/logo/logo2.svg"
        alt="Logo"
        width={56}
        height={56}
      />
    </>
  );
};

export default LogoHeader;
