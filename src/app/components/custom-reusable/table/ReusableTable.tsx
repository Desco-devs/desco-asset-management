"use client";

import React, { useState, useMemo } from "react";
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
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

export interface Column<T = unknown> {
  key: string;
  title: string;
  sortable?: boolean;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  className?: string;
  width?: string;
}

export interface DataTableProps<T = unknown> {
  data: T[];
  columns: Column<T>[];

  loading?: boolean;
  refreshing?: boolean;

  searchable?: boolean;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  searchPlaceholder?: string;

  sortable?: boolean;

  pagination?: boolean;
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (size: number) => void;
  itemsPerPageOptions?: number[];

  onRefresh?: () => void;
  actions?: React.ReactNode;
  badgeText?: string;

  renderRowActions?: (record: T, index: number) => React.ReactNode;

  rowKey?: string | ((record: T) => string);

  emptyText?: string;
  className?: string;
}

export default function DataTable<T>({
  data,
  columns,
  loading = false,
  refreshing = false,
  searchable = true,
  searchTerm: externalSearchTerm,
  onSearchTermChange,
  searchPlaceholder = "Search...",
  sortable = true,
  pagination = true,
  currentPage: externalCurrentPage,
  itemsPerPage = 5,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20, 50],
  onRefresh,
  actions,
  badgeText,
  renderRowActions,
  rowKey = "id",
  emptyText = "No data found",
  className = "",
}: DataTableProps<T>) {
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [internalPage, setInternalPage] = useState(1);

  const searchValue = externalSearchTerm ?? internalSearchTerm;
  const setSearchValue = onSearchTermChange ?? setInternalSearchTerm;

  const page = externalCurrentPage ?? internalPage;
  const setPage = onPageChange ?? setInternalPage;

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc" | null;
  }>({
    key: columns[0]?.key ?? "",
    direction: "desc",
  });

  const filteredData = useMemo(() => {
    let filtered = [...data];
    if (searchable && searchValue.trim()) {
      filtered = filtered.filter((record) =>
        columns.some((col) => {
          const val = (record as Record<string, unknown>)[col.key];
          return val
            ?.toString()
            .toLowerCase()
            .includes(searchValue.toLowerCase());
        })
      );
    }
    if (sortable && sortConfig.key && sortConfig.direction) {
      filtered.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortConfig.key];
        const bVal = (b as Record<string, unknown>)[sortConfig.key];
        if (aVal === bVal) return 0;
        const comp = (aVal as any) < (bVal as any) ? -1 : 1;
        return sortConfig.direction === "asc" ? comp : -comp;
      });
    }
    return filtered;
  }, [data, searchValue, columns, sortable, sortConfig, searchable]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;
    const start = (page - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, page, itemsPerPage, pagination]);

  function requestSort(key: string) {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: "", direction: null };
    });
    setPage(1);
  }

  function getSortIcon(key: string) {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  }

  function getRowKey(record: T, idx: number) {
    if (typeof rowKey === "function") return rowKey(record);
    return (record as Record<string, unknown>)[rowKey] ?? idx.toString();
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  }

  function handleItemsPerPageChange(value: string) {
    const size = Number(value);
    if (!isNaN(size)) {
      onItemsPerPageChange?.(size);
    }
  }

  const LoadingSkeleton = () => (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={`loading-row-${i}`}>
          {Array.from({
            length: columns.length + (renderRowActions ? 1 : 0),
          }).map((_, j) => (
            <TableCell key={`loading-col-${j}`}>
              <div className="h-4 bg-muted animate-pulse rounded w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col justify-between items-center gap-4">
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="">
                <span className="capitalize">{badgeText ?? "Data Table"}</span>
              </CardTitle>
              {badgeText && (
                <CardDescription>
                  Manage all {badgeText}{" "}
                  {refreshing && (
                    <span className="text-xs ml-2">(refreshing...)</span>
                  )}
                </CardDescription>
              )}
            </div>

            {actions}
          </div>

          <div className="flex items-center justify-baseline w-full">
            {searchable && (
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder={searchPlaceholder}
                  className="pl-8"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {badgeText && (
                <Badge variant="outline" className="flex gap-1 items-center">
                  <SlidersHorizontal className="h-3 w-3" />
                  {filteredData.length} {badgeText.toLowerCase()}
                </Badge>
              )}

              <Select
                value={itemsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {itemsPerPageOptions.map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} per page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-8 w-8"
                  onClick={onRefresh}
                  disabled={refreshing}
                  aria-label="Refresh"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={col.className}
                    style={{
                      cursor:
                        col.sortable !== false && sortable
                          ? "pointer"
                          : "default",
                    }}
                    onClick={() =>
                      col.sortable !== false && sortable && requestSort(col.key)
                    }
                  >
                    <div className="flex items-center">
                      {col.title}{" "}
                      {col.sortable !== false &&
                        sortable &&
                        getSortIcon(col.key)}
                    </div>
                  </TableHead>
                ))}
                {renderRowActions && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <LoadingSkeleton />
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (renderRowActions ? 1 : 0)}
                    className="text-center h-24"
                  >
                    {emptyText}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((record, index) => (
                  <TableRow
                    key={getRowKey(record, index) as string}
                    className="hover:bg-muted/50 cursor-pointer"
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render
                          ? col.render((record as Record<string, unknown>)[col.key], record, index)
                          : String((record as Record<string, unknown>)[col.key] ?? '')}
                      </TableCell>
                    ))}
                    {renderRowActions && (
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {renderRowActions(record, index)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination && totalPages > 1 && (
          <div className="flex justify-end items-center">
            <div className="flex w-fit mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page - 1);
                      }}
                      className={
                        page === 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (num) => (
                      <PaginationItem key={num}>
                        <PaginationLink
                          href="#"
                          isActive={page === num}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(num);
                          }}
                        >
                          {num}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page + 1);
                      }}
                      className={
                        page === totalPages
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
