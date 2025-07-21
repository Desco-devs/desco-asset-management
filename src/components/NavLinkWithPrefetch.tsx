"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface NavLinkWithPrefetchProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetchOnHover?: boolean;
}

export function NavLinkWithPrefetch({ 
  href, 
  children, 
  className, 
  prefetchOnHover = true 
}: NavLinkWithPrefetchProps) {
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (prefetchOnHover && linkRef.current) {
      const link = linkRef.current;
      
      const handleMouseEnter = () => {
        router.prefetch(href);
      };

      link.addEventListener('mouseenter', handleMouseEnter, { once: true });
      
      return () => {
        link.removeEventListener('mouseenter', handleMouseEnter);
      };
    }
  }, [href, router, prefetchOnHover]);

  return (
    <Link 
      ref={linkRef}
      href={href} 
      className={className}
    >
      {children}
    </Link>
  );
}