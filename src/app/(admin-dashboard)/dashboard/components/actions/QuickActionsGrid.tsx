"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  useQuickActionsExpanded,
  useDashboardStore
} from "@/stores/dashboard-store";
import { Badge } from "@/components/ui/badge";
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
  ChevronUp,
  Zap
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
      className="h-auto p-3 sm:p-4 flex flex-col items-center text-center space-y-2 hover:shadow-md transition-all duration-200 touch-manipulation min-h-[80px] sm:min-h-[90px] active:scale-95"
      onClick={() => router.push(href)}
    >
      <div className={`p-2 sm:p-3 rounded-lg ${color} text-white shadow-sm`}>
        {icon}
      </div>
      <div className="space-y-1">
        <div className="font-medium text-xs sm:text-sm leading-tight">{title}</div>
        <div className="text-xs text-muted-foreground leading-tight hidden sm:block">{description}</div>
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
      <CardHeader 
        className="pb-3 cursor-pointer transition-colors hover:bg-muted/50 lg:cursor-default lg:hover:bg-transparent"
        onClick={toggleQuickActionsExpanded}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Zap className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <CardTitle className="text-base font-semibold truncate">
              Quick Actions
            </CardTitle>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {displayActions.length} actions
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleQuickActionsExpanded();
            }}
            className="h-8 w-8 p-0 touch-manipulation flex-shrink-0"
          >
            {quickActionsExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Primary Actions - Always visible on mobile */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3 justify-start">
              <div className="text-sm font-medium text-muted-foreground text-left">
                Essential
              </div>
              <Badge variant="outline" className="text-xs">
                {primaryActions.length}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {primaryActions.map((action, index) => (
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
          </div>

          {/* Secondary Actions - Collapsible */}
          {quickActionsExpanded && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3 justify-start">
                <div className="text-sm font-medium text-muted-foreground text-left">
                  Additional
                </div>
                <Badge variant="outline" className="text-xs">
                  {secondaryActions.length}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {secondaryActions.map((action, index) => (
                  <QuickActionButton
                    key={index + primaryActions.length}
                    title={action.title}
                    description={action.description}
                    icon={action.icon}
                    href={action.href}
                    color={action.color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Expand/Collapse Footer */}
          {!quickActionsExpanded && (
            <div className="text-center pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleQuickActionsExpanded}
                className="text-xs text-muted-foreground hover:text-foreground touch-manipulation min-h-[44px] px-4"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                {secondaryActions.length} more actions
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}