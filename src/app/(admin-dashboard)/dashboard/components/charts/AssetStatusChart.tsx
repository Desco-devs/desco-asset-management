"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { 
  useEquipmentCounts, 
  useVehicleCounts, 
  useSelectedAssetType 
} from "@/stores/dashboard-store";

interface AssetStatusChartProps {
  type: 'equipment' | 'vehicles' | 'combined';
  title?: string;
  className?: string;
}

const OPERATIONAL_COLOR = "#10b981"; // emerald-500
const NON_OPERATIONAL_COLOR = "#ef4444"; // red-500

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          Count: <span className="font-medium text-foreground">{data.value}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Percentage: <span className="font-medium text-foreground">{data.payload.percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export function AssetStatusChart({ type, title, className }: AssetStatusChartProps) {
  const equipmentCounts = useEquipmentCounts();
  const vehicleCounts = useVehicleCounts();
  const selectedAssetType = useSelectedAssetType();

  // Determine which data to show based on type or selected filter
  const getChartData = () => {
    let operational = 0;
    let nonOperational = 0;
    let chartTitle = title;

    switch (type) {
      case 'equipment':
        operational = equipmentCounts.OPERATIONAL;
        nonOperational = equipmentCounts.NON_OPERATIONAL;
        chartTitle = chartTitle || 'Equipment Status';
        break;
      
      case 'vehicles':
        operational = vehicleCounts.OPERATIONAL;
        nonOperational = vehicleCounts.NON_OPERATIONAL;
        chartTitle = chartTitle || 'Vehicle Status';
        break;
      
      case 'combined':
        // Show combined data or filtered data based on selectedAssetType
        if (selectedAssetType === 'equipment') {
          operational = equipmentCounts.OPERATIONAL;
          nonOperational = equipmentCounts.NON_OPERATIONAL;
          chartTitle = 'Equipment Status';
        } else if (selectedAssetType === 'vehicles') {
          operational = vehicleCounts.OPERATIONAL;
          nonOperational = vehicleCounts.NON_OPERATIONAL;
          chartTitle = 'Vehicle Status';
        } else {
          operational = equipmentCounts.OPERATIONAL + vehicleCounts.OPERATIONAL;
          nonOperational = equipmentCounts.NON_OPERATIONAL + vehicleCounts.NON_OPERATIONAL;
          chartTitle = 'Combined Assets Status';
        }
        break;
    }

    const total = operational + nonOperational;
    
    if (total === 0) {
      return {
        data: [],
        title: chartTitle,
        isEmpty: true,
      };
    }

    const operationalPercentage = Math.round((operational / total) * 100);
    const nonOperationalPercentage = 100 - operationalPercentage;

    return {
      data: [
        {
          name: "Operational",
          value: operational,
          percentage: operationalPercentage,
        },
        {
          name: "Non-Operational",
          value: nonOperational,
          percentage: nonOperationalPercentage,
        },
      ],
      title: chartTitle,
      isEmpty: false,
    };
  };

  const { data, title: chartTitle, isEmpty } = getChartData();

  if (isEmpty) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <p className="text-sm">No data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{chartTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.name === "Operational"
                        ? OPERATIONAL_COLOR
                        : NON_OPERATIONAL_COLOR
                    }
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  fontSize: "12px",
                  paddingTop: "10px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t text-sm">
          <div className="text-center">
            <div className="font-semibold text-lg">
              {data.reduce((sum, item) => sum + item.value, 0)}
            </div>
            <div className="text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg text-emerald-600">
              {data.find(item => item.name === "Operational")?.percentage || 0}%
            </div>
            <div className="text-muted-foreground">Operational</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Convenience components for specific use cases
export function EquipmentStatusChart(props: Omit<AssetStatusChartProps, 'type'>) {
  return <AssetStatusChart {...props} type="equipment" />;
}

export function VehicleStatusChart(props: Omit<AssetStatusChartProps, 'type'>) {
  return <AssetStatusChart {...props} type="vehicles" />;
}

export function CombinedAssetStatusChart(props: Omit<AssetStatusChartProps, 'type'>) {
  return <AssetStatusChart {...props} type="combined" />;
}