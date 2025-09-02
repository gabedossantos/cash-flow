"use client";

import { useState, useEffect } from "react";
import { DashboardFilters as FilterType } from "./cash-flow-dashboard";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Filter, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  filters: FilterType;
  onFiltersChange: (filters: Partial<FilterType>) => void;
}

interface BusinessSegment {
  id: string;
  name: string;
  description: string;
}

export function DashboardFilters({ filters, onFiltersChange }: Props) {
  const [segments, setSegments] = useState<BusinessSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/segments");
      if (response.ok) {
        const data = await response.json();
        setSegments(data.data?.segments || []);
      }
    } catch (error) {
      console.error("Error fetching segments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSegmentChange = (value: string) => {
    onFiltersChange({
      segmentId: value === "all" ? null : value,
    });
  };

  const handleScenarioChange = (value: string) => {
    onFiltersChange({
      scenario: value as FilterType["scenario"],
    });
  };

  const handleDateRangeChange = (range: string) => {
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case "3m":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6m":
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "12m":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "24m":
        startDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    onFiltersChange({
      dateRange: { startDate, endDate: now },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filters:</span>
          </div>

          {/* Business Segment Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Segment:</span>
            <Select
              value={filters.segmentId || "all"}
              onValueChange={handleSegmentChange}
            >
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="All Segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                {segments?.map((segment) => (
                  <SelectItem key={segment.id} value={segment.id}>
                    {segment.name.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">Period:</span>
            <Select defaultValue="12m" onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Last 3M</SelectItem>
                <SelectItem value="6m">Last 6M</SelectItem>
                <SelectItem value="12m">Last 12M</SelectItem>
                <SelectItem value="24m">Last 24M</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scenario Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Scenario:</span>
            <Select
              value={filters.scenario}
              onValueChange={handleScenarioChange}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BASE">Base Case</SelectItem>
                <SelectItem value="OPTIMISTIC">Optimistic</SelectItem>
                <SelectItem value="PESSIMISTIC">Pessimistic</SelectItem>
                <SelectItem value="STRESS_TEST">Stress Test</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="ml-auto"
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Active Filters Display */}
        {(filters.segmentId || filters.scenario !== "BASE") && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500">Active filters:</span>
              {filters.segmentId && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  {segments
                    ?.find((s) => s.id === filters.segmentId)
                    ?.name?.toUpperCase() || "Unknown"}
                  <button
                    onClick={() => handleSegmentChange("all")}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.scenario !== "BASE" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  {filters.scenario}
                  <button
                    onClick={() => handleScenarioChange("BASE")}
                    className="ml-1 text-green-500 hover:text-green-700"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
