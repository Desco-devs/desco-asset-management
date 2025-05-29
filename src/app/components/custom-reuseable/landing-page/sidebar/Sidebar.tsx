"use client";

const items = [
  { title: "Home", id: "homepage", href: "#" },
  { title: "Features", id: "features", href: "#" },
  { title: "About", id: "about", href: "#" },
  { title: "Desco Team", id: "desco-team", href: "#" },
  { title: "Clients", id: "clients", href: "#" },
  { title: "Login", id: "login", href: "/login" },
];

interface SidebarLandingPageProps {
  onMenuClick: (targetId: string) => void;
}

const SidebarLandingPage = ({ onMenuClick }: SidebarLandingPageProps) => {
  const handleClick = (id: string) => {
    console.log("Menu item clicked:", id); // Debug log
    onMenuClick(id);
  };

  return (
    <div className="md:hidden w-full h-dvh fixed inset-0 z-[100] bg-background">
      <ul className="w-full h-full flex flex-col items-center justify-center gap-12 dark:bg-chart-3/60 bg-chart-3 z-[100]">
        {items.map((item) => (
          <a href={item.href} key={item.id}>
            <li
              className="cursor-pointer font-semibold text-md text-accent dark:text-muted-foreground hover:text-chart-1/80 dark:hover:text-accent-foreground duration-300 ease-in-out transition-all"
              onClick={() => handleClick(item.id)}
            >
              {item.title}
            </li>
          </a>
        ))}
      </ul>
    </div>
  );
};

export default SidebarLandingPage;
