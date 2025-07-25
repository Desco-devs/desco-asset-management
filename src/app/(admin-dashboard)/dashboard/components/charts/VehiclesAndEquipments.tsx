"use client";
import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
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
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";



interface AssetCounts {
  OPERATIONAL: number;
  NON_OPERATIONAL: number;
}

interface VehiclesAndEquipmentsProps {
  initialVehicleData: AssetCounts;
  initialEquipmentData: AssetCounts;
}

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

export function VehiclesAndEquipments({ 
  initialVehicleData, 
  initialEquipmentData 
}: VehiclesAndEquipmentsProps) {
  const [vehicleData, setVehicleData] = useState(initialVehicleData);
  const [equipmentData, setEquipmentData] = useState(initialEquipmentData);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    let equipmentChannel: ReturnType<typeof supabase.channel> | null = null;
    let vehicleChannel: ReturnType<typeof supabase.channel> | null = null;
    
    const setupRealtimeSubscriptions = async () => {
      // Ensure user is authenticated
      if (!user) {
        return;
      }

      // Get session for realtime auth
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      equipmentChannel = supabase
        .channel(`assets-equipment-${Math.random().toString(36).substring(2, 11)}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'equipment' },
          (payload) => {
          if (payload.eventType === 'INSERT') {
            const status = payload.new.status as keyof AssetCounts;
            setEquipmentData(prev => ({
              ...prev,
              [status]: prev[status] + 1
            }));
          } else if (payload.eventType === 'UPDATE') {
            const oldStatus = payload.old.status as keyof AssetCounts;
            const newStatus = payload.new.status as keyof AssetCounts;
            if (oldStatus !== newStatus) {
              setEquipmentData(prev => ({
                ...prev,
                [oldStatus]: Math.max(0, prev[oldStatus] - 1),
                [newStatus]: prev[newStatus] + 1
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            const status = payload.old.status as keyof AssetCounts;
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

      vehicleChannel = supabase
        .channel(`assets-vehicles-${Math.random().toString(36).substring(2, 11)}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'vehicles' },
          (payload) => {
          if (payload.eventType === 'INSERT') {
            const status = payload.new.status as keyof AssetCounts;
            setVehicleData(prev => ({
              ...prev,
              [status]: prev[status] + 1
            }));
          } else if (payload.eventType === 'UPDATE') {
            const oldStatus = payload.old.status as keyof AssetCounts;
            const newStatus = payload.new.status as keyof AssetCounts;
            if (oldStatus !== newStatus) {
              setVehicleData(prev => ({
                ...prev,
                [oldStatus]: Math.max(0, prev[oldStatus] - 1),
                [newStatus]: prev[newStatus] + 1
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            const status = payload.old.status as keyof AssetCounts;
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

    setupRealtimeSubscriptions();

    return () => {
      if (equipmentChannel) {
        supabase.removeChannel(equipmentChannel);
      }
      if (vehicleChannel) {
        supabase.removeChannel(vehicleChannel);
      }
    };
  }, [supabase, initialVehicleData, initialEquipmentData, user]);


  // Calculate derived data from current state
  const data = useMemo(() => {
    const totalVehicles = (vehicleData.OPERATIONAL || 0) + (vehicleData.NON_OPERATIONAL || 0);
    const totalEquipment = (equipmentData.OPERATIONAL || 0) + (equipmentData.NON_OPERATIONAL || 0);
    const totalAssets = totalVehicles + totalEquipment;
    
    const chartData = totalAssets === 0 ? [
      {
        name: "no_data",
        value: 1,
        fill: "hsl(var(--muted))",
      },
    ] : [
      {
        name: "operational",
        value: (vehicleData.OPERATIONAL || 0) + (equipmentData.OPERATIONAL || 0),
        fill: "oklch(0.62 0.18 145.0)",
      },
      {
        name: "non_operational",
        value: (vehicleData.NON_OPERATIONAL || 0) + (equipmentData.NON_OPERATIONAL || 0),
        fill: "oklch(0.65 0.18 25.0)",
      },
    ];

    return {
      chartData,
      stats: {
        totalVehicles,
        totalEquipment,
        operational: vehicleData.OPERATIONAL + equipmentData.OPERATIONAL,
        nonOperational: vehicleData.NON_OPERATIONAL + equipmentData.NON_OPERATIONAL,
      },
    };
  }, [vehicleData, equipmentData]);

  const totalAssets = useMemo(() => {
    return data.stats.operational + data.stats.nonOperational;
  }, [data]);

  const operationalPercentage = useMemo(() => {
    if (totalAssets === 0) return 0;
    return (data.stats.operational / totalAssets) * 100;
  }, [data, totalAssets]);

  const isTrendingUp = operationalPercentage > 75;

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
              {data.chartData.map((entry, index) => (
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
                          className={`text-3xl font-bold ${totalAssets === 0 ? 'fill-muted-foreground' : 'fill-foreground'}`}
                        >
                          {totalAssets === 0 ? '0' : totalAssets.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-sm"
                        >
                          {totalAssets === 0 ? 'No Assets' : 'Total Assets'}
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
        {totalAssets === 0 ? (
          <div className="text-center">
            <div className="text-muted-foreground text-sm">
              No assets registered yet
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Add vehicles and equipment to start tracking
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </CardFooter>
    </Card>
  );
}