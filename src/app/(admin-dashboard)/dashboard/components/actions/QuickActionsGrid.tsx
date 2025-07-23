"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  useQuickActionsExpanded,
  useDashboardStore
} from "@/stores/dashboard-store";
import { 
  Wrench, 
  Truck, 
  ClipboardList, 
  Users, 
  Building2,
  FolderOpen,
  FileText,
  Settings,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color?: string;
}

function QuickActionButton({ title, description, icon, href, color = "bg-primary" }: QuickActionProps) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      className="h-auto p-4 flex flex-col items-center text-center space-y-2 hover:shadow-md transition-shadow"
      onClick={() => router.push(href)}
    >
      <div className={`p-2 rounded-lg ${color} text-white`}>
        {icon}
      </div>
      <div>
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </Button>
  );
}

const primaryActions = [
  {
    title: "Add Vehicle",
    description: "Register new vehicle",
    icon: <Truck className="h-4 w-4" />,
    href: "/vehicles?action=add",
    color: "bg-green-500",
  },
  {
    title: "Add Equipment",
    description: "Register new equipment",
    icon: <Wrench className="h-4 w-4" />,
    href: "/equipments?action=add",
    color: "bg-blue-500",
  },
  {
    title: "Create Report",
    description: "Maintenance report",
    icon: <ClipboardList className="h-4 w-4" />,
    href: "/maintenance-reports?action=add",
    color: "bg-orange-500",
  },
  {
    title: "Add Project",
    description: "Create new project",
    icon: <FolderOpen className="h-4 w-4" />,
    href: "/projects?action=add",
    color: "bg-purple-500",
  },
];

const secondaryActions = [
  {
    title: "Add Client",
    description: "Register new client",
    icon: <Users className="h-4 w-4" />,
    href: "/projects?tab=clients&action=add",
    color: "bg-indigo-500",
  },
  {
    title: "Add Location",
    description: "Create new location",
    icon: <Building2 className="h-4 w-4" />,
    href: "/projects?tab=locations&action=add",
    color: "bg-teal-500",
  },
  {
    title: "Export Data",
    description: "Generate reports",
    icon: <FileText className="h-4 w-4" />,
    href: "/reports",
    color: "bg-gray-500",
  },
  {
    title: "User Management",
    description: "Manage users",
    icon: <Settings className="h-4 w-4" />,
    href: "/users",
    color: "bg-red-500",
  },
];

export function QuickActionsGrid() {
  const quickActionsExpanded = useQuickActionsExpanded();
  const toggleQuickActionsExpanded = useDashboardStore(state => state.toggleQuickActionsExpanded);

  const displayActions = quickActionsExpanded 
    ? [...primaryActions, ...secondaryActions]
    : primaryActions;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleQuickActionsExpanded}
            className="h-8 px-2"
          >
            {quickActionsExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayActions.map((action, index) => (
            <QuickActionButton
              key={index}
              title={action.title}
              description={action.description}
              icon={action.icon}
              href={action.href}
              color={action.color}
            />
          ))}
        </div>
        
        {!quickActionsExpanded && (
          <div className="text-center mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleQuickActionsExpanded}
              className="text-xs text-muted-foreground"
            >
              +{secondaryActions.length} more actions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}