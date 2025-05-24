"use client";

import Image from "next/image";

const LogoHeader = () => {
  return (
    <>
      <Image
        className="rounded-md dark:hidden block "
        src="/images/logo/logo4.svg"
        alt="Logo"
        width={60}
        height={60}
      />{" "}
      <Image
        className="rounded-md dark:block hidden"
        src="/images/logo/logo2.svg"
        alt="Logo"
        width={60}
        height={60}
      />
    </>
  );
};

export default LogoHeader;
