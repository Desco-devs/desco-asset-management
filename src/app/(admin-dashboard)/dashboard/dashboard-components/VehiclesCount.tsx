"use client";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Pie, PieChart, Cell, Label } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useAssetCounts } from "@/hooks/useAssetCounts";
import type { AssetCountProps } from "@/types/dashboard";

const chartConfig = {
  value: {
    label: "Count",
  },
  operational: {
    label: "Operational",
    color: "hsl(var(--chart-1))",
  },
  non_operational: {
    label: "Non-Operational",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function VehiclesCount({ initialData }: AssetCountProps) {
  // Use shared asset counts hook
  const assetCounts = useAssetCounts({
    equipment: { OPERATIONAL: 0, NON_OPERATIONAL: 0 }, // Not used but required
    vehicles: initialData
  });

  const vehicleData = assetCounts.vehicles;

  const totalVehicles = vehicleData.OPERATIONAL + vehicleData.NON_OPERATIONAL;
  const vehicleOperationalPercentage =
    totalVehicles > 0
      ? (vehicleData.OPERATIONAL / totalVehicles) * 100
      : 0;

  const vehicleChartData = [
    {
      name: "operational",
      value: vehicleData.OPERATIONAL,
      fill: "oklch(0.62 0.18 145.0)",
    },
    {
      name: "non_operational",
      value: vehicleData.NON_OPERATIONAL,
      fill: "oklch(0.65 0.18 25.0)",
    },
  ];

  const isVehicleTrendingUp = vehicleOperationalPercentage > 75;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Vehicle Status</CardTitle>
        <CardDescription>Operational vs Non-Operational</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={vehicleChartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
              {vehicleChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalVehicles.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Vehicles
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          {isVehicleTrendingUp ? (
            <>
              {vehicleOperationalPercentage.toFixed(1)}% operational{" "}
              <TrendingUp className="h-4 w-4 text-green-500" />
            </>
          ) : (
            <>
              {vehicleOperationalPercentage.toFixed(1)}% operational{" "}
              <TrendingDown className="h-4 w-4 text-red-500" />
            </>
          )}
        </div>
        <div className="leading-none text-muted-foreground">
          Operational: {vehicleData.OPERATIONAL} | Non-Operational:{" "}
          {vehicleData.NON_OPERATIONAL}
        </div>
      </CardFooter>
    </Card>
  );
}