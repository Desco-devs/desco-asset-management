"use client";

import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

// interface MenuItem {
//   title: string;
//   id: string;
//   href: string;
// }

interface SidebarLandingPageProps {
  onMenuClick: (targetId: string) => void;
  onClose?: () => void;
}

// Navigation items for landing page
const navigationItems = [
  { title: "Home", id: "homepage", href: "/landing-page", type: "navigation" },
  { title: "Features", id: "features", href: "#", type: "navigation" },
  { title: "About", id: "about", href: "#", type: "navigation" },
  { title: "Desco Team", id: "desco-team", href: "#", type: "navigation" },
  { title: "Contact Us", id: "clients", href: "#", type: "navigation" },
];

// Assets page items (simplified)
const assetsPageItems = [
  { title: "Home", id: "homepage", href: "/landing-page", type: "navigation" },
];

// Authentication/Actions (for footer)
const authItems = [
  { title: "Sign In", id: "login", href: "/login", type: "auth" },
  { title: "Assets", id: "assets", href: "/assets", type: "link" },
];

export default function SidebarLandingPage({
  onMenuClick,
  onClose,
}: SidebarLandingPageProps) {
  const pathname = usePathname(); // e.g. "/assets" or "/landing-page"
  const router = useRouter();
  const navigationList = pathname === "/assets" ? assetsPageItems : navigationItems;
  const [isVisible, setIsVisible] = useState(false);

  // Trigger slide-in animation on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClick = (id: string) => {
    console.log("Menu item clicked:", id);
    onMenuClick(id);
    onClose?.(); // Close sidebar after menu item click
  };

  const handleAuthClick = (href: string) => {
    // Modern Next.js navigation
    router.push(href);
  };

  const handleClose = () => {
    setIsVisible(false);
    // Delay the actual close to allow slide-out animation
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  return (
    <div className="md:hidden w-full h-dvh fixed inset-0 z-[100]">
      {/* Sliding sidebar panel */}
      <div className={`absolute inset-y-0 left-0 w-full transform transition-transform duration-300 ease-out ${
        isVisible ? 'translate-x-0' : '-translate-x-full'
      } dark:bg-chart-3/90 bg-chart-3 backdrop-blur-sm z-[110]`}>
        
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 z-[120] p-2 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background transition-colors duration-200"
          aria-label="Close menu"
        >
          <X className="h-6 w-6 text-foreground" />
        </button>

        {/* Logo */}
        <div className="absolute top-6 left-6 z-[120]">
          <Image
            className="rounded-md dark:hidden block"
            src="/images/logo/logo4.svg"
            alt="Logo"
            width={56}
            height={56}
          />
          <Image
            className="rounded-md dark:block hidden"
            src="/images/logo/logo2.svg"
            alt="Logo"
            width={56}
            height={56}
          />
        </div>

        {/* Sidebar Content */}
        <div className="flex flex-col h-full">
          {/* Navigation Section */}
          <nav className="flex-1 px-8 pt-32 pb-8">
            <div className="space-y-8">
              <div>
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4 text-left">
                  Navigation
                </h3>
                <ul className="space-y-3">
                  {navigationList.map((item) => (
                    <li key={item.id}>
                      <a
                        href={item.href}
                        className="block py-3 px-4 rounded-lg font-medium text-white hover:text-white/80 hover:bg-white/10 transition-all duration-200 text-left"
                        onClick={() => handleClick(item.id)}
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick Links Section */}
              <div>
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4 text-left">
                  Quick Access
                </h3>
                <ul className="space-y-3">
                  {authItems.filter(item => item.type === 'link').map((item) => (
                    <li key={item.id}>
                      <a
                        href={item.href}
                        className="block py-3 px-4 rounded-lg font-medium text-white hover:text-white/80 hover:bg-white/10 transition-all duration-200 text-left"
                        onClick={() => handleClick(item.id)}
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </nav>

          {/* Footer Section - Login Button */}
          <div className="p-8 border-t border-white/20">
            {authItems.filter(item => item.type === 'auth').map((item) => (
              <button
                key={item.id}
                onClick={() => handleAuthClick(item.href)}
                className="bg-chart-2 rounded-lg py-3 px-6 w-full hover:bg-chart-3 text-base dark:text-chart-1 dark:bg-accent-foreground text-white font-medium transition-colors duration-200 shadow-sm"
              >
                {item.title}
              </button>
            ))}
            <div className="mt-4 text-center">
              <p className="text-xs text-white/50">
                © 2024 DESCO. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
