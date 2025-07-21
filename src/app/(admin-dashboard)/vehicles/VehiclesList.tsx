"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import VehicleModal from "./VehicleModal";
import CreateVehicleDialog from "./CreateVehicleDialog";
import { Eye } from "lucide-react";

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
  initialUsers: any[];
  initialMaintenanceReports: any[];
  totalCount: number;
  itemsPerPage: number;
}

export default function VehiclesList({ 
  initialVehicles, 
  initialProjects, 
  initialClients, 
  initialLocations,
  initialUsers,
  initialMaintenanceReports,
  totalCount,
  itemsPerPage
}: VehiclesListProps) {

  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles || []);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // 🔥 DYNAMIC TOTAL COUNT - updates with real-time changes
  const [dynamicTotalCount, setDynamicTotalCount] = useState(totalCount);
  
  // 🔥 MODAL STATE
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🔥 HANDLE VEHICLE CLICK
  const handleVehicleClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };
  
  // 🔥 RESPONSIVE ITEMS PER PAGE: 6 on mobile, 12 on desktop
  const effectiveItemsPerPage = isMobile ? 6 : itemsPerPage;
  
  // 🔥 SMART CACHING: Cache pages in memory (separate caches for mobile/desktop)
  const [pageCache, setPageCache] = useState<Map<string, Vehicle[]>>(new Map([['desktop-1', initialVehicles]]));

  // 🔥 MOBILE DETECTION
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 🔥 PAGINATION FUNCTION with Smart Caching + Responsive
  const loadPage = async (page: number) => {
    const cacheKey = `${isMobile ? 'mobile' : 'desktop'}-${page}`;
    
    // Check cache first - INSTANT if cached!
    if (pageCache.has(cacheKey)) {
      console.log(`🚀 CACHE HIT: ${isMobile ? 'Mobile' : 'Desktop'} page ${page} loaded instantly from cache!`);
      const cachedData = pageCache.get(cacheKey)!;
      setVehicles(cachedData);
      setCurrentPage(page);
      return;
    }

    console.log(`📡 LOADING: ${isMobile ? 'Mobile' : 'Desktop'} page ${page} from server...`);
    setIsLoadingPage(true);

    try {
      const response = await fetch(`/api/vehicles/paginated?page=${page}&limit=${effectiveItemsPerPage}`);
      if (response.ok) {
        const result = await response.json();
        const vehiclesData = result.data;
        
        // Cache this page with responsive key
        setPageCache(prev => new Map(prev.set(cacheKey, vehiclesData)));
        setVehicles(vehiclesData);
        setCurrentPage(page);
        
        console.log(`✅ CACHED: ${isMobile ? 'Mobile' : 'Desktop'} page ${page} loaded and cached!`);
      }
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      setIsLoadingPage(false);
    }
  };

  // Sync state with fresh server data and handle responsive changes
  useEffect(() => {
    // Always sync, even if empty array
    if (initialVehicles !== undefined) {
      // Slice data based on current mode
      const displayVehicles = isMobile ? initialVehicles.slice(0, 6) : initialVehicles;
      setVehicles(displayVehicles);
      
      // Cache page 1 for current mode
      const cacheKey = `${isMobile ? 'mobile' : 'desktop'}-1`;
      setPageCache(new Map([[cacheKey, displayVehicles]]));
      setCurrentPage(1); // Reset to page 1 on mode change
      
      // 🔥 SYNC DYNAMIC TOTAL COUNT with server data
      setDynamicTotalCount(totalCount);
      
      console.log(`🚙 VehiclesList: Loaded ${isMobile ? 'mobile' : 'desktop'} vehicles:`, displayVehicles.length, displayVehicles.length === 0 ? '(empty array)' : '');
      console.log('📦 Total vehicles:', totalCount);
      console.log('🏗️ Reference data loaded:', {
        projects: initialProjects.length,
        clients: initialClients.length,
        locations: initialLocations.length,
        users: initialUsers.length
      });
      
      // Clear old localStorage cache when we have fresh server data
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('vehicles-cache');
          localStorage.removeItem('vehicles-cache-time');
        } catch (error) {
          console.error('Error clearing cache:', error);
        }
      }
    }
  }, [initialVehicles, initialProjects, initialClients, initialLocations, initialUsers, totalCount, isMobile]);
  
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
            const vehicleId = payload.new.id;

            console.log('🔥 REALTIME INSERT:', {
              vehicleId,
              currentPage,
              currentVehiclesCount: vehicles.length,
              isMobile,
              effectiveItemsPerPage,
              payloadData: payload.new  // 🔥 Debug the actual payload data
            });

            // Find the actual project from the existing projects data (MASTERPIECE PATTERN)
            const project = initialProjects.find(p => p.id === payload.new.project_id);
            
            // Find the client with location data
            const client = project ? initialClients.find(c => c.id === project.client.id) : null;
            
            // Create vehicle object with complete realtime data - NO FALLBACKS, use actual data!
            const newVehicle: Vehicle = {
              id: vehicleId,
              brand: payload.new.brand,
              model: payload.new.model, 
              type: payload.new.type,
              plate_number: payload.new.plate_number,
              inspection_date: payload.new.inspection_date,
              before: payload.new.before,
              expiry_date: payload.new.expiry_date,
              status: payload.new.status,
              remarks: payload.new.remarks,
              owner: payload.new.owner,
              created_at: payload.new.created_at,
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

            // 🔥 ALWAYS add new vehicle if we're on page 1, even if array is empty
            if (currentPage === 1) {
              setVehicles(prev => {
                // If empty array, just add the new vehicle
                if (prev.length === 0) {
                  return [newVehicle];
                }
                // Otherwise, add to top and slice to maintain page size
                return [newVehicle, ...prev.slice(0, effectiveItemsPerPage - 1)];
              });
              
              // Update page 1 cache for current mode
              setPageCache(prev => {
                const newCache = new Map(prev);
                const cacheKey = `${isMobile ? 'mobile' : 'desktop'}-1`;
                const page1Data = newCache.get(cacheKey) || [];
                
                // If cache is empty, start fresh with new vehicle
                if (page1Data.length === 0) {
                  newCache.set(cacheKey, [newVehicle]);
                } else {
                  newCache.set(cacheKey, [newVehicle, ...page1Data.slice(0, effectiveItemsPerPage - 1)]);
                }
                return newCache;
              });
            } else {
              // Clear page 1 cache for both modes so they get fresh data when user goes back
              setPageCache(prev => {
                const newCache = new Map(prev);
                newCache.delete('mobile-1');
                newCache.delete('desktop-1');
                return newCache;
              });
            }
            // 🔥 INCREMENT TOTAL COUNT for pagination
            setDynamicTotalCount(prev => prev + 1);
            
            console.log('🔥 REALTIME: Added new vehicle with complete data:', {
              vehicleId,
              brand: payload.new.brand,
              model: payload.new.model,
              newVehiclesCount: vehicles.length + 1,
              newTotalCount: dynamicTotalCount + 1,
              wasOnPage1: currentPage === 1
            });
            
          } else if (payload.eventType === 'UPDATE') {
            setVehicles(prev => 
              prev.map(vehicle => 
                vehicle.id === payload.new.id ? { ...vehicle, ...payload.new } as Vehicle : vehicle
              )
            );
            console.log('🔥 REALTIME: Updated vehicle:', payload.new.id);
            
          } else if (payload.eventType === 'DELETE') {
            setVehicles(prev => prev.filter(vehicle => vehicle.id !== payload.old.id));
            
            // 🔥 DECREMENT TOTAL COUNT for pagination
            setDynamicTotalCount(prev => Math.max(0, prev - 1));
            
            console.log('🔥 REALTIME: Deleted vehicle:', {
              vehicleId: payload.old.id,
              newTotalCount: Math.max(0, dynamicTotalCount - 1)
            });
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
        <div className="flex items-center gap-4">
          <p className="text-gray-600">Total vehicles: {dynamicTotalCount}</p>
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
        
        {/* 🔥 ADD VEHICLE BUTTON */}
        <CreateVehicleDialog 
          projects={initialProjects.map(p => ({
            id: p.id,
            name: p.name
          }))}
        />
      </div>

      {/* 🔥 SKELETON LOADING while loading new page */}
      {isLoadingPage ? (
        <div className="space-y-4">
          {Array.from({ length: effectiveItemsPerPage }).map((_, index) => (
            <div key={`skeleton-${currentPage}-${isMobile ? 'mobile' : 'desktop'}-${index}`} className="border rounded-lg p-4 bg-white shadow-sm animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-1/3"></div>
                  <div className="h-5 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-1/3"></div>
                  <div className="h-5 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-1/3"></div>
                  <div className="h-5 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-1/3"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2 w-20"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No vehicles found
        </div>
      ) : (
        <div className="space-y-4">
          {vehicles.map((vehicle, index) => (
            <div 
              key={`${vehicle.id}-${currentPage}-${isMobile ? 'mobile' : 'desktop'}-${index}`}
              className="group border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-gray-50 hover:border-blue-200"
              onClick={() => handleVehicleClick(vehicle)}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {vehicle.brand} {vehicle.model}
                      </h3>
                      <p className="text-gray-600">Plate: {vehicle.plate_number}</p>
                      <p className="text-gray-600">Type: {vehicle.type}</p>
                      <p className="text-gray-600">Owner: {vehicle.owner}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
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
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  Added by {vehicle.user?.full_name || "System"} on {new Date(vehicle.created_at).toLocaleString()}
                </div>
                <div className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Click to view details
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔥 RESPONSIVE PAGINATION CONTROLS */}
      {!isLoadingPage && dynamicTotalCount > effectiveItemsPerPage && (
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600 text-center md:text-left">
            Showing {((currentPage - 1) * effectiveItemsPerPage) + 1} to {Math.min(currentPage * effectiveItemsPerPage, dynamicTotalCount)} of {dynamicTotalCount} vehicles
            {isMobile && <span className="block text-xs text-gray-400 mt-1">📱 Mobile: 6 per page</span>}
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => loadPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 md:px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {isMobile ? '←' : 'Previous'}
            </button>
            
            {/* Page numbers - simplified for mobile */}
            {Array.from({ length: Math.ceil(dynamicTotalCount / effectiveItemsPerPage) }, (_, i) => i + 1)
              .filter(page => {
                const totalPages = Math.ceil(dynamicTotalCount / effectiveItemsPerPage);
                if (isMobile) {
                  // Mobile: Show fewer page numbers
                  return page === 1 || 
                         page === totalPages || 
                         Math.abs(page - currentPage) <= 1;
                } else {
                  // Desktop: Show more page numbers
                  return page === 1 || 
                         page === totalPages || 
                         Math.abs(page - currentPage) <= 2;
                }
              })
              .map((page, index, filteredPages) => {
                const cacheKey = `${isMobile ? 'mobile' : 'desktop'}-${page}`;
                return (
                  <div key={`page-${page}-${isMobile ? 'mobile' : 'desktop'}`} className="flex items-center">
                    {index > 0 && filteredPages[index - 1] < page - 1 && (
                      <span key={`ellipsis-${page}-${isMobile ? 'mobile' : 'desktop'}`} className="px-1 md:px-2 text-gray-400 text-xs">...</span>
                    )}
                    <button
                      onClick={() => loadPage(page)}
                      className={`px-2 md:px-3 py-1 text-sm border rounded ${
                        currentPage === page
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'hover:bg-gray-50'
                      } ${pageCache.has(cacheKey) ? 'ring-1 ring-green-200' : ''}`}
                      title={pageCache.has(cacheKey) ? 'Cached - instant load!' : 'Will load from server'}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}
            
            <button
              onClick={() => loadPage(currentPage + 1)}
              disabled={currentPage === Math.ceil(dynamicTotalCount / effectiveItemsPerPage)}
              className="px-2 md:px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {isMobile ? '→' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* 🔥 VEHICLE DETAIL MODAL */}
      <VehicleModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        vehicle={selectedVehicle}
        projects={initialProjects.map(p => ({
          id: p.id,
          name: p.name
        }))}
        locations={initialLocations.map(l => ({
          id: l.id,
          address: l.address
        }))}
        users={initialUsers.map(u => ({
          id: u.id,
          full_name: u.full_name
        }))}
        initialMaintenanceReports={initialMaintenanceReports}
      />
    </div>
  );
}