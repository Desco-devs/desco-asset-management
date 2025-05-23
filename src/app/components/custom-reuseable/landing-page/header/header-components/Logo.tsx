"use client";

import Image from "next/image";

const LogoHeader = () => {
  return (
    <>
      <Image
        className="rounded-md dark:hidden block "
        src="/images/logo/logo3.svg"
        alt="Logo"
        width={50}
        height={50}
      />{" "}
      <Image
        className="rounded-md dark:block hidden"
        src="/images/logo/logo2.svg"
        alt="Logo"
        width={50}
        height={50}
      />
    </>
  );
};

export default LogoHeader;
