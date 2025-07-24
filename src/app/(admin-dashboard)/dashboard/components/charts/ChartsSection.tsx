"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronUp, 
  PieChart,
  TrendingUp
} from "lucide-react";
import {
  EquipmentStatusChart,
  VehicleStatusChart,
  CombinedAssetStatusChart,
} from "./AssetStatusChart";
import { 
  useEquipmentCounts, 
  useVehicleCounts 
} from "@/stores/dashboard-store";

export function ChartsSection() {
  const [chartsExpanded, setChartsExpanded] = useState(false);
  const equipmentCounts = useEquipmentCounts();
  const vehicleCounts = useVehicleCounts();

  // Calculate summary stats for collapsed view
  const totalEquipment = equipmentCounts.OPERATIONAL + equipmentCounts.NON_OPERATIONAL;
  const totalVehicles = vehicleCounts.OPERATIONAL + vehicleCounts.NON_OPERATIONAL;
  const totalAssets = totalEquipment + totalVehicles;
  const totalOperational = equipmentCounts.OPERATIONAL + vehicleCounts.OPERATIONAL;
  const operationalRate = totalAssets > 0 ? Math.round((totalOperational / totalAssets) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Mobile Summary Card */}
      <div className="block lg:hidden">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Asset Status</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  {operationalRate}%
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">
                  Available
                </div>
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                {totalOperational}/{totalAssets} assets
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {totalEquipment} Field Equip.
              </Badge>
              <Badge variant="outline" className="text-xs">
                {totalVehicles} Service Vehicles
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collapsible Charts Section */}
      <Card>
        <CardHeader 
          className="pb-3 cursor-pointer transition-colors hover:bg-muted/50 lg:cursor-default lg:hover:bg-transparent"
          onClick={() => setChartsExpanded(!chartsExpanded)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <PieChart className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <CardTitle className="text-base font-semibold truncate">
                Asset Availability
              </CardTitle>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge variant="secondary" className="text-xs">
                  {totalAssets} total
                </Badge>
                <Badge 
                  variant={operationalRate >= 80 ? "default" : operationalRate >= 60 ? "secondary" : "destructive"} 
                  className="text-xs hidden sm:inline-flex"
                >
                  {operationalRate}% available
                </Badge>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden h-8 w-8 p-0 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setChartsExpanded(!chartsExpanded);
              }}
            >
              {chartsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          {/* Mobile availability badge */}
          <div className="sm:hidden mt-2">
            <Badge 
              variant={operationalRate >= 80 ? "default" : operationalRate >= 60 ? "secondary" : "destructive"} 
              className="text-xs"
            >
              {operationalRate}% available
            </Badge>
          </div>
        </CardHeader>
        
        {(chartsExpanded || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
          <CardContent className="pt-0 space-y-4">
            {/* Individual Status Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EquipmentStatusChart />
              <VehicleStatusChart />
            </div>

            {/* Combined Assets Overview */}
            <CombinedAssetStatusChart
              title="Energy Assets Overview"
              className="w-full"
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}