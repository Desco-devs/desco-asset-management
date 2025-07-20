"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  type: string;
  plate_number: string;
  owner: string;
  status: 'OPERATIONAL' | 'NON_OPERATIONAL';
  inspection_date: string;
  expiry_date: string;
  before: number;
  remarks?: string;
  created_at: string;
  project: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
      location: {
        id: string;
        address: string;
      };
    };
  };
  user: {
    id: string;
    username: string;
    full_name: string;
  } | null;
}

interface VehiclesListProps {
  initialVehicles: Vehicle[];
  initialProjects: any[];
  initialClients: any[];
  initialLocations: any[];
}

export default function VehiclesList({ 
  initialVehicles, 
  initialProjects, 
  initialClients, 
  initialLocations 
}: VehiclesListProps) {

  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles || []);

  // Sync state with fresh server data whenever initialVehicles changes
  useEffect(() => {
    if (initialVehicles && initialVehicles.length > 0) {
      setVehicles(initialVehicles);
      
      console.log('🚙 VehiclesList: Loaded vehicles:', initialVehicles.length);
      console.log('🏗️ Reference data loaded:', {
        projects: initialProjects.length,
        clients: initialClients.length,
        locations: initialLocations.length
      });
      
      // Clear old cache when we have fresh server data
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('vehicles-cache');
          localStorage.removeItem('vehicles-cache-time');
        } catch (error) {
          console.error('Error clearing cache:', error);
        }
      }
    }
  }, [initialVehicles, initialProjects, initialClients, initialLocations]);
  
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Cache vehicles data when it changes (only after initial sync)
  useEffect(() => {
    if (typeof window !== 'undefined' && vehicles.length > 0) {
      // Add a small delay to avoid caching during initial sync
      const timer = setTimeout(() => {
        try {
          localStorage.setItem('vehicles-cache', JSON.stringify(vehicles));
          localStorage.setItem('vehicles-cache-time', Date.now().toString());
          console.log("🚙 VehiclesList: Cached vehicles data:", vehicles.length);
        } catch (error) {
          console.error('Error caching vehicles data:', error);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [vehicles]);

  useEffect(() => {
    // Set up Supabase real-time subscription
    const supabase = createClient();
    
    const channel = supabase
      .channel('vehicles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        async (payload) => {
          console.log('🔥 REALTIME: Vehicle change detected:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const brand = payload.new.brand || "Unknown Brand";
            const model = payload.new.model || "Unknown Model";
            const vehicleId = payload.new.id;

            // Find the actual project from the existing projects data (MASTERPIECE PATTERN)
            const project = initialProjects.find(p => p.id === payload.new.project_id);
            
            // Find the client with location data
            const client = project ? initialClients.find(c => c.id === project.client.id) : null;
            
            // Create vehicle object with complete realtime data - NO API CALLS NEEDED!
            const newVehicle: Vehicle = {
              id: vehicleId,
              brand: brand,
              model: model,
              type: payload.new.type || "Unknown Type",
              plate_number: payload.new.plate_number || "",
              inspection_date: payload.new.inspection_date || new Date().toISOString(),
              before: payload.new.before || 0,
              expiry_date: payload.new.expiry_date || new Date().toISOString(),
              status: payload.new.status || "OPERATIONAL",
              remarks: payload.new.remarks || undefined,
              owner: payload.new.owner || "Unknown Owner",
              created_at: payload.new.created_at || new Date().toISOString(),
              project: project && client ? {
                id: project.id,
                name: project.name,
                client: {
                  id: client.id,
                  name: client.name,
                  location: {
                    id: client.location.id,
                    address: client.location.address,
                  },
                },
              } : {
                id: "unknown-project-id",
                name: "Unknown Project",
                client: {
                  id: "unknown-client-id",
                  name: "Unknown Client",
                  location: {
                    id: "unknown-location-id",
                    address: "Unknown Location",
                  },
                },
              },
              user: null
            };

            setVehicles(prev => [newVehicle, ...prev]);
            console.log('🔥 REALTIME: Added new vehicle with complete data:', vehicleId);
            
          } else if (payload.eventType === 'UPDATE') {
            setVehicles(prev => 
              prev.map(vehicle => 
                vehicle.id === payload.new.id ? { ...vehicle, ...payload.new } as Vehicle : vehicle
              )
            );
            console.log('🔥 REALTIME: Updated vehicle:', payload.new.id);
            
          } else if (payload.eventType === 'DELETE') {
            setVehicles(prev => prev.filter(vehicle => vehicle.id !== payload.old.id));
            console.log('🔥 REALTIME: Deleted vehicle:', payload.old.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('Supabase subscription status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    // Cleanup subscription
    return () => {
      channel.unsubscribe();
    };
  }, [initialProjects, initialClients, initialLocations]);


  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-gray-600">Total vehicles: {vehicles.length}</p>
        <div className="flex items-center gap-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-500">
            {isRealtimeConnected ? 'Real-time connected' : 'Real-time disconnected'}
          </span>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No vehicles found
        </div>
      ) : (
        <div className="space-y-4">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {vehicle.brand} {vehicle.model}
                  </h3>
                  <p className="text-gray-600">Plate: {vehicle.plate_number}</p>
                  <p className="text-gray-600">Type: {vehicle.type}</p>
                  <p className="text-gray-600">Owner: {vehicle.owner}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Project:</p>
                  <p className="font-medium">{vehicle.project?.name || 'Loading...'}</p>
                  <p className="text-sm text-gray-500">Client:</p>
                  <p className="font-medium">{vehicle.project?.client?.name || 'Loading...'}</p>
                  <p className="text-sm text-gray-500">Location:</p>
                  <p className="font-medium">{vehicle.project?.client?.location?.address || 'Loading...'}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Status:</p>
                  <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                    vehicle.status === 'OPERATIONAL' ? 'bg-green-100 text-green-800' :
                    vehicle.status === 'NON_OPERATIONAL' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {vehicle.status}
                  </span>
                  <p className="text-sm text-gray-500 mt-2">Inspection:</p>
                  <p className="text-sm">{new Date(vehicle.inspection_date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">Expiry:</p>
                  <p className="text-sm">{new Date(vehicle.expiry_date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">Before: {vehicle.before} days</p>
                </div>
              </div>
              
              {vehicle.remarks && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-500">Remarks:</p>
                  <p className="text-sm">{vehicle.remarks}</p>
                </div>
              )}
              
              <div className="mt-4 text-xs text-gray-400">
                Added by {vehicle.user?.full_name || "System"} on {new Date(vehicle.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}