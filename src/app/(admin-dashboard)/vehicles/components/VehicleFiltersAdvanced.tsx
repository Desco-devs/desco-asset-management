'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  CalendarIcon,
  AlertTriangle,
} from 'lucide-react';
import { useVehiclesStore, 
  selectFilterStatus,
  selectFilterProject,
  selectFilterType,
  selectFilterOwner,
  selectFilterMaintenance,
  selectFilterExpiryDays,
  selectFilterDateRange,
  selectActiveFilterCount,
  Vehicle
} from '@/stores/vehiclesStore';

interface VehicleFiltersAdvancedProps {
  vehicles: Vehicle[];
  projects: Array<{ id: string; name: string }>;
}

export default function VehicleFiltersAdvanced({
  vehicles,
  projects = []
}: VehicleFiltersAdvancedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  const filterStatus = useVehiclesStore(selectFilterStatus);
  const filterProject = useVehiclesStore(selectFilterProject);
  const filterType = useVehiclesStore(selectFilterType);
  const filterOwner = useVehiclesStore(selectFilterOwner);
  const filterMaintenance = useVehiclesStore(selectFilterMaintenance);
  const filterExpiryDays = useVehiclesStore(selectFilterExpiryDays);
  const filterDateRange = useVehiclesStore(selectFilterDateRange);
  const activeFilterCount = useVehiclesStore(selectActiveFilterCount);
  
  const {
    setFilterStatus,
    setFilterProject,
    setFilterType,
    setFilterOwner,
    setFilterMaintenance,
    setFilterExpiryDays,
    setFilterDateRange,
    resetFilters,
  } = useVehiclesStore();

  // Extract unique values from vehicles data
  const uniqueTypes = React.useMemo(() => {
    const types = [...new Set(vehicles.map(v => v.type))].filter(Boolean).sort();
    return types.map(type => ({ value: type, label: type }));
  }, [vehicles]);

  const uniqueOwners = React.useMemo(() => {
    const owners = [...new Set(vehicles.map(v => v.owner))].filter(Boolean).sort();
    return owners.map(owner => ({ value: owner, label: owner }));
  }, [vehicles]);

  const handleDateRangeChange = (field: 'startDate' | 'endDate', date: Date | undefined) => {
    const dateString = date ? format(date, 'yyyy-MM-dd') : null;
    setFilterDateRange({
      ...filterDateRange,
      [field]: dateString,
    });
  };

  const clearFilter = (filterType: string) => {
    switch (filterType) {
      case 'status':
        setFilterStatus('all');
        break;
      case 'project':
        setFilterProject('all');
        break;
      case 'type':
        setFilterType('all');
        break;
      case 'owner':
        setFilterOwner('all');
        break;
      case 'maintenance':
        setFilterMaintenance('all');
        break;
      case 'expiry':
        setFilterExpiryDays(null);
        break;
      case 'dateRange':
        setFilterDateRange({
          startDate: null,
          endDate: null,
          dateType: 'created'
        });
        break;
    }
  };

  const getFilterBadges = () => {
    const badges = [];
    
    if (filterStatus !== 'all') {
      badges.push({
        key: 'status',
        label: `Status: ${filterStatus}`,
        onRemove: () => clearFilter('status'),
      });
    }
    
    if (filterProject !== 'all') {
      const project = projects.find(p => p.id === filterProject);
      badges.push({
        key: 'project',
        label: `Project: ${project?.name || filterProject}`,
        onRemove: () => clearFilter('project'),
      });
    }
    
    if (filterType !== 'all') {
      badges.push({
        key: 'type',
        label: `Type: ${filterType}`,
        onRemove: () => clearFilter('type'),
      });
    }
    
    if (filterOwner !== 'all') {
      badges.push({
        key: 'owner',
        label: `Owner: ${filterOwner}`,
        onRemove: () => clearFilter('owner'),
      });
    }
    
    if (filterMaintenance !== 'all') {
      const maintenanceLabels = {
        has_issues: 'Has Open Issues',
        no_issues: 'No Issues'
      };
      badges.push({
        key: 'maintenance',
        label: `Maintenance: ${maintenanceLabels[filterMaintenance as keyof typeof maintenanceLabels]}`,
        onRemove: () => clearFilter('maintenance'),
      });
    }
    
    if (filterExpiryDays !== null) {
      badges.push({
        key: 'expiry',
        label: `Expiring in ${filterExpiryDays} days`,
        onRemove: () => clearFilter('expiry'),
      });
    }
    
    if (filterDateRange.startDate || filterDateRange.endDate) {
      let label = `${filterDateRange.dateType} date: `;
      if (filterDateRange.startDate && filterDateRange.endDate) {
        label += `${filterDateRange.startDate} to ${filterDateRange.endDate}`;
      } else if (filterDateRange.startDate) {
        label += `from ${filterDateRange.startDate}`;
      } else if (filterDateRange.endDate) {
        label += `until ${filterDateRange.endDate}`;
      }
      badges.push({
        key: 'dateRange',
        label,
        onRemove: () => clearFilter('dateRange'),
      });
    }
    
    return badges;
  };

  const filterBadges = getFilterBadges();

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center gap-2">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          {/* Clear All Filters Button */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="gap-1 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Clear All
            </Button>
          )}
          
          <CollapsibleContent className="space-y-4">
            <div className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="OPERATIONAL">Operational</SelectItem>
                      <SelectItem value="NON_OPERATIONAL">Non-Operational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Project Filter */}
                <div className="space-y-2">
                  <Label htmlFor="project-filter">Project</Label>
                  <Select value={filterProject} onValueChange={setFilterProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vehicle Type Filter */}
                <div className="space-y-2">
                  <Label htmlFor="type-filter">Vehicle Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Maintenance Status Filter */}
                <div className="space-y-2">
                  <Label htmlFor="maintenance-filter">Maintenance Status</Label>
                  <Select value={filterMaintenance} onValueChange={setFilterMaintenance}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Maintenance Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vehicles</SelectItem>
                      <SelectItem value="has_issues">Has Open Issues</SelectItem>
                      <SelectItem value="no_issues">No Issues</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Owner Filter */}
                <div className="space-y-2">
                  <Label htmlFor="owner-filter">Owner</Label>
                  <Select value={filterOwner} onValueChange={setFilterOwner}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Owners" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Owners</SelectItem>
                      {uniqueOwners.map((owner) => (
                        <SelectItem key={owner.value} value={owner.value}>
                          {owner.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Expiry Soon Filter */}
              <div className="space-y-2">
                <Label htmlFor="expiry-filter" className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Expiring Soon (Days)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="expiry-filter"
                    type="number"
                    value={filterExpiryDays || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilterExpiryDays(value ? parseInt(value, 10) : null);
                    }}
                    placeholder="e.g., 30 for vehicles expiring in 30 days"
                    className="max-w-xs"
                    min="1"
                  />
                  {filterExpiryDays && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterExpiryDays(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label>Date Range Filter</Label>
                  <Select
                    value={filterDateRange.dateType}
                    onValueChange={(value: 'inspection' | 'expiry' | 'created') =>
                      setFilterDateRange({ ...filterDateRange, dateType: value })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created">Created Date</SelectItem>
                      <SelectItem value="inspection">Inspection Date</SelectItem>
                      <SelectItem value="expiry">Expiry Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filterDateRange.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filterDateRange.startDate ? (
                            format(new Date(filterDateRange.startDate), "PPP")
                          ) : (
                            "Pick a start date"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            filterDateRange.startDate
                              ? new Date(filterDateRange.startDate)
                              : undefined
                          }
                          onSelect={(date) => {
                            handleDateRangeChange('startDate', date);
                            setStartDateOpen(false);
                          }}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filterDateRange.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filterDateRange.endDate ? (
                            format(new Date(filterDateRange.endDate), "PPP")
                          ) : (
                            "Pick an end date"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            filterDateRange.endDate
                              ? new Date(filterDateRange.endDate)
                              : undefined
                          }
                          onSelect={(date) => {
                            handleDateRangeChange('endDate', date);
                            setEndDateOpen(false);
                          }}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Active Filter Badges */}
      {filterBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filterBadges.map((badge) => (
            <Badge
              key={badge.key}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {badge.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-destructive"
                onClick={badge.onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}