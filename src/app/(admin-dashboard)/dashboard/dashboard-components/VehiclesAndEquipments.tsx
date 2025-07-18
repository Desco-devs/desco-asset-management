"use client";
import * as React from "react";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Label, Pie, PieChart, Cell } from "recharts";
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

export function VehiclesAndEquipments() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/vehicles/count");

        if (!response.ok) {
          throw new Error("Failed to fetch status counts");
        }

        const result = await response.json();

        const chartData = [
          {
            name: "operational",
            value:
              (result.vehicles.OPERATIONAL || 0) +
              (result.equipments.OPERATIONAL || 0),
            fill: "oklch(0.62 0.18 145.0)",
          },
          {
            name: "non_operational",
            value:
              (result.vehicles.NON_OPERATIONAL || 0) +
              (result.equipments.NON_OPERATIONAL || 0),
            fill: "oklch(0.65 0.18 25.0)",
          },
        ];

        const totalVehicles =
          (result.vehicles.OPERATIONAL || 0) +
          (result.vehicles.NON_OPERATIONAL || 0);
        const totalEquipment =
          (result.equipments.OPERATIONAL || 0) +
          (result.equipments.NON_OPERATIONAL || 0);

        setData({
          chartData,
          stats: {
            totalVehicles,
            totalEquipment,
            operational:
              (result.vehicles.OPERATIONAL || 0) +
              (result.equipments.OPERATIONAL || 0),
            nonOperational:
              (result.vehicles.NON_OPERATIONAL || 0) +
              (result.equipments.NON_OPERATIONAL || 0),
            vehiclesOperational: result.vehicles.OPERATIONAL || 0,
            vehiclesNonOperational: result.vehicles.NON_OPERATIONAL || 0,
            equipmentOperational: result.equipments.OPERATIONAL || 0,
            equipmentNonOperational: result.equipments.NON_OPERATIONAL || 0,
          },
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        console.error("Error fetching status counts:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalAssets = React.useMemo(() => {
    if (!data) return 0;
    return data.stats.operational + data.stats.nonOperational;
  }, [data]);

  const operationalPercentage = React.useMemo(() => {
    if (!data || totalAssets === 0) return 0;
    return (data.stats.operational / totalAssets) * 100;
  }, [data, totalAssets]);

  const isTrendingUp = operationalPercentage > 75;

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Asset Status</CardTitle>
          <CardDescription>Loading data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center flex-1 pb-0 pt-8">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Asset Status</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center flex-1 pb-0 text-destructive">
          {error || "Failed to load asset data"}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Asset Status Overview</CardTitle>
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
              data={data.chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
              {data.chartData.map((entry: any, index: number) => (
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
                          {totalAssets.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Total Assets
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
          {isTrendingUp ? (
            <>
              {operationalPercentage.toFixed(1)}% operational assets{" "}
              <TrendingUp className="h-4 w-4 text-green-500" />
            </>
          ) : (
            <>
              {operationalPercentage.toFixed(1)}% operational assets{" "}
              <TrendingDown className="h-4 w-4 text-red-500" />
            </>
          )}
        </div>
        <div className="leading-none text-muted-foreground">
          Vehicles: {data.stats.totalVehicles} | Equipment:{" "}
          {data.stats.totalEquipment}
        </div>
      </CardFooter>
    </Card>
  );
}