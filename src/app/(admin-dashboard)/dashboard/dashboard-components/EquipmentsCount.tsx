"use client";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
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

export function EquipmentsCount({ initialData }: AssetCountProps) {
  // Use shared asset counts hook
  const assetCounts = useAssetCounts({
    equipment: initialData,
    vehicles: { OPERATIONAL: 0, NON_OPERATIONAL: 0 } // Not used but required
  });

  const equipmentData = assetCounts.equipment;

  const totalEquipment = equipmentData.OPERATIONAL + equipmentData.NON_OPERATIONAL;
  const equipmentOperationalPercentage =
    totalEquipment > 0
      ? (equipmentData.OPERATIONAL / totalEquipment) * 100
      : 0;

  const equipmentChartData = [
    {
      name: "operational",
      value: equipmentData.OPERATIONAL,
      fill: "oklch(0.62 0.18 145.0)",
    },
    {
      name: "non_operational",
      value: equipmentData.NON_OPERATIONAL,
      fill: "oklch(0.65 0.18 25.0)",
    },
  ];

  const isEquipmentTrendingUp = equipmentOperationalPercentage > 75;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Equipment Status</CardTitle>
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
              data={equipmentChartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
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
                          {totalEquipment.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Equipment
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
          {isEquipmentTrendingUp ? (
            <>
              {equipmentOperationalPercentage.toFixed(1)}% operational{" "}
              <TrendingUp className="h-4 w-4 text-green-500" />
            </>
          ) : (
            <>
              {equipmentOperationalPercentage.toFixed(1)}% operational{" "}
              <TrendingDown className="h-4 w-4 text-red-500" />
            </>
          )}
        </div>
        <div className="leading-none text-muted-foreground">
          Operational: {equipmentData.OPERATIONAL} | Non-Operational:{" "}
          {equipmentData.NON_OPERATIONAL}
        </div>
      </CardFooter>
    </Card>
  );
}