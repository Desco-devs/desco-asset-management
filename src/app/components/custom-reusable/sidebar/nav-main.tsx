"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { NavLinkWithPrefetch } from "@/components/NavLinkWithPrefetch";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: { title: string; url: string }[]
  }[]
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0;
          const isMainActive =
            pathname === item.url ||
            (hasSubItems && item.items!.some((subItem) => subItem.url === pathname));

          if (hasSubItems) {
            // Render collapsible dropdown if submenu items exist
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={isMainActive || item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={`hover:bg-foreground/15 ${
                        pathname === item.url
                          ? "bg-foreground/14 text-accent-foreground"
                          : ""
                      }`}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items!.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLinkWithPrefetch
                              href={subItem.url}
                              className={`hover:bg-foreground/15 ${
                                pathname === subItem.url
                                  ? "bg-foreground/14 text-accent-foreground"
                                  : ""
                              }`}
                            >
                              <span>{subItem.title}</span>
                            </NavLinkWithPrefetch>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          // Render a simple link button if no submenu
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                className={`hover:bg-foreground/15 ${
                  pathname === item.url ? "bg-foreground/14 text-accent-foreground" : ""
                }`}
              >
                <NavLinkWithPrefetch href={item.url} className="flex items-center gap-2 w-full">
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </NavLinkWithPrefetch>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
export default NavMain;
