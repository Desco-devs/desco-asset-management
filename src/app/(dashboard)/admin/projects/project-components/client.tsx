"use client";

import React, { useState, useEffect } from "react";
import type { Location } from "@/app/service/client/clients";
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
  PlusCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import AlertModal from "@/app/components/custom-reuseable/modal/alertModal";
import AddClient from "../modal/addClient";

export default function LocationManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Location | null;
    direction: "asc" | "desc" | null;
  }>({
    key: null,
    direction: null,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // For alert modal
  const [alertOpen, setAlertOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function loadLocations() {
      try {
        const data = await fetchLocations();
        setLocations(data);
        setFilteredLocations(data);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load locations");
      }
    }
    loadLocations();
  }, []);

  // Filter locations based on search term
  useEffect(() => {
    const filtered = locations.filter(
      (location) =>
        location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.uid.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLocations(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, locations]);

  // Sort locations when sort config changes
  useEffect(() => {
    if (sortConfig.key && sortConfig.direction) {
      const sortedLocations = [...filteredLocations].sort((a, b) => {
        if (a[sortConfig.key!] < b[sortConfig.key!]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key!] > b[sortConfig.key!]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
      setFilteredLocations(sortedLocations);
    }
  }, [sortConfig]);

  // Request sort
  const requestSort = (key: keyof Location) => {
    let direction: "asc" | "desc" | null = "asc";

    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      }
    }

    setSortConfig({ key, direction });

    if (direction === null) {
      // Reset to original order
      const filtered = locations.filter(
        (location) =>
          location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          location.uid.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  };

  // Get sorted icon
  const getSortIcon = (key: keyof Location) => {
    if (sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  async function handleAddLocation(address: string) {
    try {
      const newLocation = await addLocation(address);
      setLocations((prev) => [...prev, newLocation]);
      toast.success("Location added successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add location");
    }
  }

  async function handleUpdateLocation(id: string) {
    try {
      const updated = await updateLocation(id, editAddress);
      setLocations((prev) =>
        prev.map((loc) => (loc.uid === id ? updated : loc))
      );
      setEditingId(null);
      setEditAddress("");
      toast.success("Location updated successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update location");
    }
  }

  // Open alert modal for delete confirmation
  function openDeleteModal(id: string) {
    setDeleteId(id);
    setAlertOpen(true);
  }

  // Confirm delete handler
  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteLocation(deleteId);
      setLocations((prev) => prev.filter((loc) => loc.uid !== deleteId));
      toast.success("Location deleted successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete location");
    } finally {
      setAlertOpen(false);
      setDeleteId(null);
    }
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLocations.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);

  // Generate page numbers
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Handle page navigation
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Location Management</CardTitle>
            <CardDescription>Manage all client locations</CardDescription>
          </div>
          <AddClient onAdd={handleAddLocation} />
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
              onValueChange={(value) => setItemsPerPage(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">
                  <div
                    className="flex items-center cursor-pointer"
                    onClick={() => requestSort("uid")}
                  >
                    UID {getSortIcon("uid")}
                  </div>
                </TableHead>
                <TableHead>
                  <div
                    className="flex items-center cursor-pointer"
                    onClick={() => requestSort("address")}
                  >
                    Address {getSortIcon("address")}
                  </div>
                </TableHead>
                <TableHead>
                  <div
                    className="flex items-center cursor-pointer"
                    onClick={() => requestSort("createdAt")}
                  >
                    Created At {getSortIcon("createdAt")}
                  </div>
                </TableHead>
                <TableHead>
                  <div
                    className="flex items-center cursor-pointer"
                    onClick={() => requestSort("updatedAt")}
                  >
                    Updated At {getSortIcon("updatedAt")}
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No locations found.
                  </TableCell>
                </TableRow>
              ) : (
                currentItems.map((loc) => (
                  <TableRow key={loc.uid}>
                    <TableCell className="font-mono text-xs">
                      {loc.uid}
                    </TableCell>

                    <TableCell>
                      {editingId === loc.uid ? (
                        <Input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full"
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
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingId(loc.uid);
                                setEditAddress(loc.address);
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => openDeleteModal(loc.uid)}
                            >
                              Delete
                            </DropdownMenuItem>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-end items-center mt-4">
            <div className="mt-4 w-fit ">
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
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>

                  {pageNumbers.map((number) => (
                    <PaginationItem key={number}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === number}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(number);
                        }}
                      >
                        {number}
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
