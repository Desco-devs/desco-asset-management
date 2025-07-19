"use client";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
import { createClient } from "@/lib/supabase";
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
import { toast } from "sonner";

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

interface EquipmentsCountProps {
  initialData: {
    OPERATIONAL: number;
    NON_OPERATIONAL: number;
  };
}

export function EquipmentsCount({ initialData }: EquipmentsCountProps) {
  const [equipmentData, setEquipmentData] = useState(initialData);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to equipment table changes
    const equipmentChannel = supabase
      .channel("equipment-count-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment" },
        (payload) => {
          // Update counts based on the database change
          if (payload.eventType === "INSERT") {
            const newEquipment = payload.new as { status: "OPERATIONAL" | "NON_OPERATIONAL" };
            setEquipmentData((prev) => ({
              ...prev,
              [newEquipment.status]: prev[newEquipment.status] + 1,
            }));
            toast.success("New equipment added to system");
          } else if (payload.eventType === "UPDATE") {
            const oldEquipment = payload.old as { status: "OPERATIONAL" | "NON_OPERATIONAL" };
            const newEquipment = payload.new as { status: "OPERATIONAL" | "NON_OPERATIONAL" };
            
            if (oldEquipment.status !== newEquipment.status) {
              setEquipmentData((prev) => ({
                ...prev,
                [oldEquipment.status]: prev[oldEquipment.status] - 1,
                [newEquipment.status]: prev[newEquipment.status] + 1,
              }));
              toast.info(`Equipment status updated to ${newEquipment.status.toLowerCase()}`);
            }
          } else if (payload.eventType === "DELETE") {
            const deletedEquipment = payload.old as { status: "OPERATIONAL" | "NON_OPERATIONAL" };
            setEquipmentData((prev) => ({
              ...prev,
              [deletedEquipment.status]: prev[deletedEquipment.status] - 1,
            }));
            toast.error("Equipment removed from system");
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(equipmentChannel);
    };
  }, [supabase]);

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