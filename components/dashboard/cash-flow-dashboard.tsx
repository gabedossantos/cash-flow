"use client";

import { useState, useEffect } from "react";
import { DashboardFilters as DashboardFiltersComponent } from "./dashboard-filters";
import { KPIOverview } from "./kpi-overview";
import { CashFlowChart } from "./cash-flow-chart";
import { ForecastingPanel } from "./forecasting-panel";
import { RiskAlertsPanel } from "./risk-alerts-panel";
import { RecommendationsPanel } from "./recommendations-panel";
import { MonteCarloPanel } from "./monte-carlo-panel";
import { SegmentAnalysis } from "./segment-analysis";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  AlertTriangle,
  Zap,
  BarChart3,
  Target,
  Settings,
} from "lucide-react";

// NOTE: The name DashboardFilters was used both for the UI component and the filter state type.
// To avoid ambiguity we define the state shape separately and export a backward-compatible alias.
export interface DashboardFilterState {
  segmentId: string | null;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  scenario: "BASE" | "OPTIMISTIC" | "PESSIMISTIC" | "STRESS_TEST";
}

// Backwards compatible type (other components import this)
export type DashboardFilters = DashboardFilterState;

export function CashFlowDashboard() {
  const [filters, setFilters] = useState<DashboardFilterState>({
    segmentId: null,
    dateRange: {
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      endDate: new Date(),
    },
    scenario: "BASE",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("overview");

  useEffect(() => {
    // Initial data loading (remove artificial 1s delay; keep tiny delay for UX smoothness)
    let cancelled = false;
    console.time("dashboardInitialLoad");
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (cancelled) return;
      } catch (error) {
        console.error("Error loading dashboard:", error);
        setLoadError((error as Error)?.message || "Unknown error");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          console.timeEnd("dashboardInitialLoad");
        }
      }
    };
    loadDashboard();
    // Fail‑safe: ensure we never stay stuck longer than 4s even if something unexpected happens.
    const failsafe = setTimeout(() => {
      if (isLoading) {
        console.warn(
          "Dashboard load failsafe triggered – forcing ready state.",
        );
        setIsLoading(false);
      }
    }, 4000);
    return () => {
      cancelled = true;
      clearTimeout(failsafe);
    };
  }, []);
  const handleFiltersChange = (newFilters: Partial<DashboardFilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 mt-4">Loading dashboard...</p>
          <p className="text-xs text-slate-400 mt-2">
            If this persists, open devtools console for diagnostics.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center max-w-md">
          <h2 className="text-lg font-semibold text-red-600 mb-2">
            Failed to load dashboard
          </h2>
          <p className="text-sm text-slate-600 mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <DashboardFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* KPI Overview - Always visible */}
      <KPIOverview filters={filters} />

      {/* Main Content Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Forecasting
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Monte Carlo
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger
            value="recommendations"
            className="flex items-center gap-2"
          >
            <Target className="w-4 h-4" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="segments" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Segments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CashFlowChart filters={filters} />
            </div>
            <div className="space-y-6">
              <Card className="p-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedTab("forecasting")}
                    className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <div className="font-medium text-blue-800">
                      Generate Forecast
                    </div>
                    <div className="text-sm text-blue-600">
                      Run AI models for 12-month projection
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedTab("simulation")}
                    className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    <div className="font-medium text-green-800">
                      Monte Carlo Analysis
                    </div>
                    <div className="text-sm text-green-600">
                      Run 500+ scenario simulations
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedTab("alerts")}
                    className="w-full text-left p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                  >
                    <div className="font-medium text-orange-800">
                      Risk Assessment
                    </div>
                    <div className="text-sm text-orange-600">
                      Review liquidity and runway alerts
                    </div>
                  </button>
                </div>
              </Card>
              <div className="grid grid-cols-1 gap-4">
                <RiskAlertsPanel filters={filters} compact={true} />
                <RecommendationsPanel filters={filters} compact={true} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="mt-6">
          <ForecastingPanel filters={filters} />
        </TabsContent>

        <TabsContent value="simulation" className="mt-6">
          <MonteCarloPanel filters={filters} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <RiskAlertsPanel filters={filters} compact={false} />
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6">
          <RecommendationsPanel filters={filters} compact={false} />
        </TabsContent>

        <TabsContent value="segments" className="mt-6">
          <SegmentAnalysis filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
