"use client";
import * as React from "react";
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

export function EquipmentsCount() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [equipmentData, setEquipmentData] = React.useState<{
    OPERATIONAL: number;
    NON_OPERATIONAL: number;
  } | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const equipmentResponse = await fetch("/api/equipments/count");

        if (!equipmentResponse.ok) {
          throw new Error("Failed to fetch equipment counts");
        }

        const equipmentResult = await equipmentResponse.json();

        setEquipmentData({
          OPERATIONAL: equipmentResult.OPERATIONAL || 0,
          NON_OPERATIONAL: equipmentResult.NON_OPERATIONAL || 0,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        console.error("Error fetching equipment counts:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalEquipment = equipmentData
    ? equipmentData.OPERATIONAL + equipmentData.NON_OPERATIONAL
    : 0;
  const equipmentOperationalPercentage =
    totalEquipment > 0
      ? ((equipmentData?.OPERATIONAL || 0) / totalEquipment) * 100
      : 0;

  const equipmentChartData = equipmentData
    ? [
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
      ]
    : [];

  const isEquipmentTrendingUp = equipmentOperationalPercentage > 75;

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Equipment Status</CardTitle>
          <CardDescription>Loading data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center flex-1 pb-0 pt-8">
          <div className="animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !equipmentData) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Equipment Status</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center flex-1 pb-0 text-destructive">
          {error || "Failed to load equipment data"}
        </CardContent>
      </Card>
    );
  }

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