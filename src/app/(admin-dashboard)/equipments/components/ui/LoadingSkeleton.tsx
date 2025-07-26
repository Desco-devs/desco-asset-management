"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Plus, FileText } from "lucide-react";

export default function LoadingSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-foreground">Equipment Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="default" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Equipment
        </Button>
        <Button variant="outline" size="default" className="w-full sm:w-auto">
          <FileText className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <Input 
          placeholder="Search equipment by name, model, or serial number..." 
          className="w-full"
        />
        <div className="flex gap-3">
          <Select>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Filter by Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
        <span className="text-sm text-muted-foreground">Loading equipment...</span>
        <div className="h-6 w-16 bg-blue-100 text-blue-800 rounded text-center text-xs flex items-center justify-center">
          ---
        </div>
      </div>

      {/* Equipment Cards Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="p-3 pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="text-sm flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-muted-foreground/30" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <Skeleton className="h-3 w-20" />

                  {/* Status and Badges Row */}
                  <div className="flex flex-row flex-wrap gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 px-3">
              {/* Equipment Image Skeleton */}
              <div className="aspect-video bg-muted/50 rounded-md flex items-center justify-center">
                <Wrench className="h-12 w-12 text-muted-foreground/20" />
              </div>

              {/* Equipment Info Footer */}
              <div className="pb-3 border-t text-xs space-y-1">
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
        <span className="text-sm text-muted-foreground">Loading pagination...</span>
        <div className="flex items-center gap-2">
          <div className="h-6 w-12 bg-muted rounded text-center text-xs flex items-center justify-center">
            ---
          </div>
          <span className="text-sm text-muted-foreground">of --- items</span>
        </div>
        <span className="text-sm text-muted-foreground">---</span>
      </div>
    </div>
  );
}