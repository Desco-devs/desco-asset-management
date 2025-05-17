"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  RefreshCcw,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type TableColumn<T> = {
  key: keyof T;
  header: React.ReactNode;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
};

export type SortConfig<T> = {
  key: keyof T | null;
  direction: "asc" | "desc" | null;
};

export type TableProps<T> = {
  data: T[];
  columns: TableColumn<T>[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  isRefreshing?: boolean;
  hasNewData?: boolean;
  sortConfig?: SortConfig<T>;
  onSort?: (key: keyof T) => void;
  searchPlaceholder?: string;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  renderActions?: () => React.ReactNode;
  renderCustomHeader?: () => React.ReactNode;
  renderRowActions?: (item: T) => React.ReactNode;
  lastUpdated?: Date;
  onRefresh?: () => void;
  onNewDataClick?: () => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSizeOptions?: number[];
  loadingRowCount?: number;
  emptyMessage?: string;
};

export default function DataTable<T>({
  data,
  columns,
  title = "Data Table",
  description = "Manage your data",
  isLoading = false,
  isRefreshing = false,
  hasNewData = false,
  sortConfig = { key: null, direction: null },
  onSort,
  searchPlaceholder = "Search...",
  searchTerm = "",
  onSearchChange,
  renderActions,
  renderCustomHeader,
  renderRowActions,
  lastUpdated,
  onRefresh,
  onNewDataClick,
  pageSize = 5,
  onPageSizeChange,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSizeOptions = [5, 10, 20, 50],
  loadingRowCount = 3,
  emptyMessage = "No data found.",
}: TableProps<T>) {
  // Format the last update time
  const formatLastUpdate = () => {
    return lastUpdated ? lastUpdated.toLocaleTimeString() : "";
  };

  // Get sorted icon
  const getSortIcon = (key: keyof T) => {
    if (sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  // Handle column header click for sorting
  const handleHeaderClick = (key: keyof T, sortable?: boolean) => {
    if (sortable && onSort) {
      onSort(key);
    }
  };

  // Generate page numbers
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              {(onRefresh || onNewDataClick) && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`p-0 h-8 w-8 relative ${
                      hasNewData ? "text-primary" : ""
                    }`}
                    onClick={
                      hasNewData && onNewDataClick ? onNewDataClick : onRefresh
                    }
                    disabled={isRefreshing}
                  >
                    {hasNewData ? (
                      <>
                        <Bell className="h-4 w-4" />
                        <span className="absolute top-0 right-0 h-2 w-2 bg-primary rounded-full"></span>
                      </>
                    ) : (
                      <RefreshCcw
                        className={`h-4 w-4 ${
                          isRefreshing ? "animate-spin" : ""
                        }`}
                      />
                    )}
                    <span className="sr-only">
                      {hasNewData ? "New data available" : "Refresh"}
                    </span>
                  </Button>
                </div>
              )}
            </CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>{description}</span>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  {isRefreshing ? (
                    "Refreshing..."
                  ) : hasNewData && onNewDataClick ? (
                    <span
                      className="text-primary font-medium cursor-pointer"
                      onClick={onNewDataClick}
                    >
                      New data available! Click to update
                    </span>
                  ) : (
                    `Last updated: ${formatLastUpdate()}`
                  )}
                </span>
              )}
            </CardDescription>
          </div>
          {renderActions && renderActions()}
        </div>
        {renderCustomHeader && renderCustomHeader()}
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          {onSearchChange && (
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder={searchPlaceholder}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
          {onPageSizeChange && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex gap-1 items-center">
                <SlidersHorizontal className="h-3 w-3" />
                {data.length} items
              </Badge>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => onPageSizeChange(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size} per page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead
                    key={index}
                    className={column.width ? column.width : undefined}
                  >
                    <div
                      className={`flex items-center ${
                        column.sortable ? "cursor-pointer" : ""
                      }`}
                      onClick={() =>
                        handleHeaderClick(column.key, column.sortable)
                      }
                    >
                      {column.header}
                      {column.sortable && getSortIcon(column.key)}
                    </div>
                  </TableHead>
                ))}
                {renderRowActions && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading state
                Array.from({ length: loadingRowCount }).map((_, index) => (
                  <TableRow key={`loading-${index}`}>
                    {columns.map((_, colIndex) => (
                      <TableCell key={colIndex}>
                        <div className="h-4 bg-muted animate-pulse rounded w-full"></div>
                      </TableCell>
                    ))}
                    {renderRowActions && (
                      <TableCell>
                        <div className="h-4 bg-muted animate-pulse rounded w-16 ml-auto"></div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      renderRowActions ? columns.length + 1 : columns.length
                    }
                    className="text-center h-24"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column, colIndex) => (
                      <TableCell key={colIndex}>
                        {column.cell
                          ? column.cell(item)
                          : String(item[column.key] || "")}
                      </TableCell>
                    ))}
                    {renderRowActions && (
                      <TableCell className="text-right">
                        {renderRowActions(item)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {onPageChange && totalPages > 1 && (
          <div className="flex justify-end items-center mt-4">
            <div className="mt-4 w-fit">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onPageChange(currentPage - 1);
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
                          onPageChange(number);
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
                        onPageChange(currentPage + 1);
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
    </Card>
  );
}
