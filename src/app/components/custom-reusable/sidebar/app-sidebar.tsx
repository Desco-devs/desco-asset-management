"use client";

import * as React from "react";
import {
  Frame,
  PieChart,
  Map,
  GalleryVerticalEnd,
  AudioWaveform,
  User,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TeamSwitcher } from "./team-switcher";
import { NavMain } from "./nav-main";
import { NavProjects } from "./nav-projects";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "DESCO",
      logo: GalleryVerticalEnd,
      plan: "company",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
  ],

  navMain: [
    {
      title: "Home",
      url: "/home",
      icon: Frame,
      isActive: true,
    },

    {
      title: "Projects",
      url: "/projects",
      icon: GalleryVerticalEnd,
      isActive: true,
    },
    {
      title: "Equipments",
      url: "/equipments",
      icon: GalleryVerticalEnd,
      isActive: true,
    },
    {
      title: "Vehicles",
      url: "/vehicles",
      icon: GalleryVerticalEnd,
      isActive: true,
    },

    {
      title: "User & Permissions",
      url: "/users",
      icon: User,
      isActive: true,
    },
    {
      title: "Chat",
      url: "/chat-app",
      icon: User,
      isActive: true,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* You can remove NavProjects here if you want all projects under navMain */}
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        {/* Profile dropdown moved to header for better UX */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
