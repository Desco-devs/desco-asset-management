"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  fetchLocations,
  addLocation,
  updateLocation,
  deleteLocation,
} from "@/app/service/client/clients";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  RefreshCcw,
} from "lucide-react";

import { toast } from "sonner";

import AlertModal from "@/app/components/custom-reuseable/modal/alertModal";

import AddClient from "../modal/addClient";

import { useAuth } from "@/app/context/AuthContext";

interface Location {
  uid: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function LocationManager() {
  const router = useRouter();

  const { user } = useAuth();

  const canCreate = user?.permissions.includes("CREATE") ?? false;
  const canUpdate = user?.permissions.includes("UPDATE") ?? false;
  const canDelete = user?.permissions.includes("DELETE") ?? false;
  const canView = user?.permissions.includes("VIEW") ?? false;

  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Location | null;
    direction: "asc" | "desc" | null;
  }>({ key: "createdAt", direction: "desc" });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Delete confirmation modal
  const [alertOpen, setAlertOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch & sort
  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const data = await fetchLocations();
      const sorted = sortLocationsByDate(data);
      setLocations(sorted);
      setFilteredLocations(sorted);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load locations");
    } finally {
      setIsLoading(false);
    }
  };

  const sortLocationsByDate = (data: Location[]) =>
    [...data].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const applySorting = (data: Location[]) => {
    if (sortConfig.key && sortConfig.direction) {
      return [...data].sort((a, b) => {
        if (a[sortConfig.key!] < b[sortConfig.key!]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key!] > b[sortConfig.key!]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return data;
  };

  // Manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    await loadLocations();
    setIsRefreshing(false);
    toast.success("Data refreshed");
  };

  useEffect(() => {
    loadLocations();
  }, []);

  // Filtering & sorting
  useEffect(() => {
    const filtered = locations.filter(
      (loc) =>
        loc.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.uid.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLocations(applySorting(filtered));
    setCurrentPage(1);
  }, [searchTerm, locations, sortConfig]);

  const requestSort = (key: keyof Location) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig(
      direction ? { key, direction } : { key: "createdAt", direction: "desc" }
    );
  };

  const getSortIcon = (key: keyof Location) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  // CRUD handlers
  async function handleAddLocation(address: string) {
    try {
      await addLocation(address);
      toast.success("Location added");
      await loadLocations();
    } catch {
      toast.error("Failed to add location");
    }
  }

  async function handleUpdateLocation(id: string) {
    try {
      await updateLocation(id, editAddress);
      setEditingId(null);
      setEditAddress("");
      toast.success("Location updated");
      await loadLocations();
    } catch {
      toast.error("Failed to update location");
    }
  }

  function openDeleteModal(id: string) {
    setDeleteId(id);
    setAlertOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteLocation(deleteId);
      toast.success("Location deleted");
      await loadLocations();
    } catch {
      toast.error("Failed to delete location");
    } finally {
      setAlertOpen(false);
      setDeleteId(null);
    }
  }

  // Navigation handler for viewing clients
  const handleViewClients = (locationId: string) => {
    router.push(`/locations/${locationId}/clients`);
  };

  // Pagination logic
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredLocations.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              Location Management
            </CardTitle>
            <CardDescription>
              Manage all client locations
              {isRefreshing && (
                <span className="text-xs ml-2">(refreshing...)</span>
              )}
            </CardDescription>
          </div>
          {canCreate && <AddClient onAdd={handleAddLocation} />}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search locations..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex gap-1 items-center">
              <SlidersHorizontal className="h-3 w-3" />
              {filteredLocations.length} locations
            </Badge>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(v) => setItemsPerPage(parseInt(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-8 w-8"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
            >
              <RefreshCcw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {["uid", "address", "createdAt", "updatedAt"].map((col) => (
                  <TableHead key={col}>
                    <div
                      className="flex items-center cursor-pointer"
                      onClick={() => requestSort(col as keyof Location)}
                    >
                      {col.charAt(0).toUpperCase() + col.slice(1)}{" "}
                      {getSortIcon(col as keyof Location)}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted animate-pulse rounded w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : currentItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No locations found.
                  </TableCell>
                </TableRow>
              ) : (
                currentItems.map((loc) => (
                  <TableRow key={loc.uid}>
                    <TableCell className="font-mono text-xs">{loc.uid}</TableCell>
                    <TableCell>
                      {editingId === loc.uid ? (
                        <Input
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full"
                          disabled={!canUpdate}
                        />
                      ) : (
                        loc.address
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(loc.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(loc.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === loc.uid ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingId(null);
                              setEditAddress("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUpdateLocation(loc.uid)}
                            disabled={!canUpdate}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {canUpdate && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingId(loc.uid);
                                  setEditAddress(loc.address);
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                            )}

                            {canView && (
                              <DropdownMenuItem
                                onClick={() => handleViewClients(loc.uid)}
                              >
                                View Clients
                              </DropdownMenuItem>
                            )}

                            {canDelete && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => openDeleteModal(loc.uid)}
                              >
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-end items-center mt-4">
            <div className="w-fit">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(currentPage - 1);
                      }}
                      className={
                        currentPage === 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>

                  {pageNumbers.map((num) => (
                    <PaginationItem key={num}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === num}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(num);
                        }}
                      >
                        {num}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(currentPage + 1);
                      }}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </CardContent>

      <AlertModal
        isOpen={alertOpen}
        onOpenChange={setAlertOpen}
        title="Delete Location"
        description="Are you sure you want to delete this location?"
        onConfirm={confirmDelete}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </Card>
  );
}
