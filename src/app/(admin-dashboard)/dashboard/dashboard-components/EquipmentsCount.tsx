"use client";
import { useState, useEffect } from "react";
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
import { createClient } from "@/lib/supabase";
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
  const [equipmentData, setEquipmentData] = useState(initialData);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`equipment-status-${Date.now()}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'equipment' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const status = payload.new.status as keyof typeof initialData;
            setEquipmentData(prev => ({
              ...prev,
              [status]: prev[status] + 1
            }));
          } else if (payload.eventType === 'UPDATE') {
            const oldStatus = payload.old.status as keyof typeof initialData;
            const newStatus = payload.new.status as keyof typeof initialData;
            if (oldStatus !== newStatus) {
              setEquipmentData(prev => ({
                ...prev,
                [oldStatus]: Math.max(0, prev[oldStatus] - 1),
                [newStatus]: prev[newStatus] + 1
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            const status = payload.old.status as keyof typeof initialData;
            if (status && (status === 'OPERATIONAL' || status === 'NON_OPERATIONAL')) {
              setEquipmentData(prev => ({
                ...prev,
                [status]: Math.max(0, prev[status] - 1)
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const totalEquipment = equipmentData.OPERATIONAL + equipmentData.NON_OPERATIONAL;
  const equipmentOperationalPercentage =
    totalEquipment > 0
      ? (equipmentData.OPERATIONAL / totalEquipment) * 100
      : 0;

  const equipmentChartData = totalEquipment === 0 ? [
    {
      name: "no_data",
      value: 1,
      fill: "hsl(var(--muted))",
    },
  ] : [
    {
      name: "operational",
      value: equipmentData.OPERATIONAL || 0,
      fill: "oklch(0.62 0.18 145.0)",
    },
    {
      name: "non_operational",
      value: equipmentData.NON_OPERATIONAL || 0,
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
                          className={`text-3xl font-bold ${totalEquipment === 0 ? 'fill-muted-foreground' : 'fill-foreground'}`}
                        >
                          {totalEquipment === 0 ? '0' : totalEquipment.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-sm"
                        >
                          {totalEquipment === 0 ? 'No Equipment' : 'Equipment'}
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
        {totalEquipment === 0 ? (
          <div className="text-center">
            <div className="text-muted-foreground text-sm">
              No equipment registered yet
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Add equipment to start tracking
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </CardFooter>
    </Card>
  );
}