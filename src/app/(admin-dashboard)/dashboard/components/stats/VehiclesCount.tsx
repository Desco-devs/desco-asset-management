"use client";
import { useState, useEffect } from "react";
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
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
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
  const [vehicleData, setVehicleData] = useState(initialData);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    const setupRealtimeSubscription = async () => {
      // Ensure user is authenticated
      if (!user) {
        console.warn('No authenticated user for vehicle count realtime');
        return;
      }

      // Get session for realtime auth
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase
        .channel(`vehicles-count-${Math.random().toString(36).substring(2, 11)}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'vehicles' },
          (payload) => {
            console.log('🚗 Vehicle count update:', payload);
          if (payload.eventType === 'INSERT') {
            const status = payload.new.status as keyof typeof initialData;
            setVehicleData(prev => ({
              ...prev,
              [status]: prev[status] + 1
            }));
          } else if (payload.eventType === 'UPDATE') {
            const oldStatus = payload.old.status as keyof typeof initialData;
            const newStatus = payload.new.status as keyof typeof initialData;
            if (oldStatus !== newStatus) {
              setVehicleData(prev => ({
                ...prev,
                [oldStatus]: Math.max(0, prev[oldStatus] - 1),
                [newStatus]: prev[newStatus] + 1
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            const status = payload.old.status as keyof typeof initialData;
            if (status && (status === 'OPERATIONAL' || status === 'NON_OPERATIONAL')) {
              setVehicleData(prev => ({
                ...prev,
                [status]: Math.max(0, prev[status] - 1)
              }));
            }
          }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, initialData, user]);

  const totalVehicles = vehicleData.OPERATIONAL + vehicleData.NON_OPERATIONAL;
  const vehicleOperationalPercentage =
    totalVehicles > 0
      ? (vehicleData.OPERATIONAL / totalVehicles) * 100
      : 0;

  const vehicleChartData = totalVehicles === 0 ? [
    {
      name: "no_data",
      value: 1,
      fill: "hsl(var(--muted))",
    },
  ] : [
    {
      name: "operational",
      value: vehicleData.OPERATIONAL || 0,
      fill: "oklch(0.62 0.18 145.0)",
    },
    {
      name: "non_operational",
      value: vehicleData.NON_OPERATIONAL || 0,
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
                          className={`text-3xl font-bold ${totalVehicles === 0 ? 'fill-muted-foreground' : 'fill-foreground'}`}
                        >
                          {totalVehicles === 0 ? '0' : totalVehicles.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-sm"
                        >
                          {totalVehicles === 0 ? 'No Vehicles' : 'Vehicles'}
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
        {totalVehicles === 0 ? (
          <div className="text-center">
            <div className="text-muted-foreground text-sm">
              No vehicles registered yet
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Add vehicles to start tracking
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </CardFooter>
    </Card>
  );
}