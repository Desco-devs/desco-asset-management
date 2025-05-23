const items = [
  { title: "Home", id: "homepage" },
  { title: "Features", id: "features" },
  { title: "About", id: "about" },
  { title: "Desco Team", id: "desco-team" },
  { title: "Clients", id: "clients" },
];

const MenuHeader = () => {
  return (
    <div>
      <ul className="w-fit flex flex-row items-center gap-12">
        {items.map((item) => (
          <li
            className="cursor-pointer font-semibold text-md text-muted-foreground hover:text-chart-1/80 dark:hover:text-accent-foreground duration-300 ease-in-out transition-all"
            key={item.id}
          >
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MenuHeader;
