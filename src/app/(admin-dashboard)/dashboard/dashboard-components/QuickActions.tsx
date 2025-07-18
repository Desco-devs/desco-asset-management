"use client";
import * as React from "react";
import { Plus, Users, Building2, FolderOpen, Truck, Wrench, FileText, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary";
  color?: string;
}

export function QuickActions() {
  const quickActions: QuickAction[] = [
    {
      id: "add-location",
      title: "Add Location",
      description: "Create a new location for clients",
      icon: <Building2 className="h-5 w-5" />,
      href: "/locations",
      variant: "outline",
      color: "text-blue-600"
    },
    {
      id: "add-client",
      title: "Add Client",
      description: "Register a new client",
      icon: <Users className="h-5 w-5" />,
      href: "/projects", // Assuming this is where client management is
      variant: "outline",
      color: "text-green-600"
    },
    {
      id: "add-project",
      title: "New Project",
      description: "Start a new project",
      icon: <FolderOpen className="h-5 w-5" />,
      href: "/projects",
      variant: "outline",
      color: "text-purple-600"
    },
    {
      id: "add-equipment",
      title: "Add Equipment",
      description: "Register new equipment",
      icon: <Wrench className="h-5 w-5" />,
      href: "/equipments",
      variant: "outline",
      color: "text-orange-600"
    },
    {
      id: "add-vehicle",
      title: "Add Vehicle",
      description: "Register a new vehicle",
      icon: <Truck className="h-5 w-5" />,
      href: "/vehicles",
      variant: "outline",
      color: "text-red-600"
    },
    {
      id: "maintenance-report",
      title: "Maintenance Report",
      description: "Create maintenance report",
      icon: <FileText className="h-5 w-5" />,
      href: "/equipments", // Assuming maintenance reports are managed here
      variant: "outline",
      color: "text-yellow-600"
    },
    {
      id: "manage-users",
      title: "Manage Users",
      description: "Add or manage user accounts",
      icon: <Settings className="h-5 w-5" />,
      href: "/users",
      variant: "outline",
      color: "text-gray-600"
    },
    {
      id: "view-assets",
      title: "View Assets",
      description: "Browse all assets",
      icon: <Plus className="h-5 w-5" />,
      href: "/assets",
      variant: "secondary",
      color: "text-indigo-600"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <div key={action.id} className="group">
              {action.href ? (
                <Link href={action.href}>
                  <Button
                    variant={action.variant || "outline"}
                    className="w-full h-auto flex-col p-4 space-y-2 hover:scale-105 transition-transform"
                  >
                    <div className={`${action.color} group-hover:scale-110 transition-transform`}>
                      {action.icon}
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-medium text-sm">{action.title}</p>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {action.description}
                      </p>
                    </div>
                  </Button>
                </Link>
              ) : (
                <Button
                  variant={action.variant || "outline"}
                  className="w-full h-auto flex-col p-4 space-y-2 hover:scale-105 transition-transform"
                  onClick={action.onClick}
                >
                  <div className={`${action.color} group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {action.description}
                    </p>
                  </div>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}