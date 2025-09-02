"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardFilters } from "./cash-flow-dashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  Settings,
  TrendingUp,
  DollarSign,
  Activity,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  filters: DashboardFilters;
}

interface BusinessSegment {
  id: string;
  name: string;
  description: string;
  transactionCount: number;
  forecastCount: number;
}

interface SegmentPerformance {
  segmentId: string;
  segmentName: string;
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  growthRate: number;
  transactionCount: number;
}

interface SegmentTrend {
  segment: string;
  data: Array<{
    month: string;
    value: number;
    date: Date;
  }>;
}

interface MonthlyTrendPoint {
  date: string;
  inflow?: number;
  outflow?: number;
  netFlow: number;
}

import type { TooltipProps } from "recharts";

export function SegmentAnalysis({ filters }: Props) {
  const [segments, setSegments] = useState<BusinessSegment[]>([]);
  const [performance, setPerformance] = useState<SegmentPerformance[]>([]);
  const [trends, setTrends] = useState<SegmentTrend[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSegmentData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch segments
      const segmentsResponse = await fetch("/api/segments");
      let segmentsData: BusinessSegment[] = [];
      if (segmentsResponse.ok) {
        const data = await segmentsResponse.json();
        segmentsData = data.data?.segments || [];
        setSegments(segmentsData);
      }

      // Fetch cash flow data for segment analysis
      const params = new URLSearchParams();
      params.append("startDate", filters.dateRange.startDate.toISOString());
      params.append("endDate", filters.dateRange.endDate.toISOString());

      const cashFlowResponse = await fetch(
        `/api/cashflow?${params.toString()}`,
      );
      if (cashFlowResponse.ok) {
        const data = await cashFlowResponse.json();
        setPerformance(data.data?.segmentPerformance || []);

        // Generate trends for each segment
        const trendsData: SegmentTrend[] = [];
        for (const segment of segmentsData) {
          const segmentParams = new URLSearchParams(params);
          segmentParams.append("segmentId", segment.id);

          const segmentResponse = await fetch(
            `/api/cashflow?${segmentParams.toString()}`,
          );
          if (segmentResponse.ok) {
            const segmentData = await segmentResponse.json();
            trendsData.push({
              segment: segment.name,
              data:
                segmentData.data?.monthlyTrend?.map(
                  (item: MonthlyTrendPoint) => ({
                    month: new Date(item.date).toLocaleDateString("en-US", {
                      month: "short",
                      year: "2-digit",
                    }),
                    value: item.netFlow,
                    date: new Date(item.date),
                  }),
                ) || [],
            });
          }
        }
        setTrends(trendsData);
      }
    } catch (error) {
      console.error("Error fetching segment data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters.dateRange.startDate, filters.dateRange.endDate]);

  useEffect(() => {
    fetchSegmentData();
  }, [fetchSegmentData]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getSegmentColor = (segmentName: string) => {
    const colors = {
      saas: "#3B82F6", // Blue
      hardware: "#10B981", // Green
      services: "#F59E0B", // Yellow
    };
    return colors[segmentName as keyof typeof colors] || "#6B7280";
  };

  const getPerformanceIcon = (netFlow: number) => {
    if (netFlow > 0) return <ArrowUpRight className="w-4 h-4 text-green-600" />;
    return <ArrowDownRight className="w-4 h-4 text-red-600" />;
  };

  // Prepare pie chart data
  const pieChartData = performance.map((seg) => ({
    name: seg.segmentName.toUpperCase(),
    value: Math.max(0, seg.netCashFlow),
    color: getSegmentColor(seg.segmentName),
  }));

  // Prepare comparison chart data
  const comparisonData = performance.map((seg) => ({
    segment: seg.segmentName.toUpperCase(),
    inflow: seg.totalInflow,
    outflow: seg.totalOutflow,
    net: seg.netCashFlow,
  }));

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-800 mb-1">{label}</p>
          {payload.map((entry, index) => {
            if (!entry) return null;
            const value = typeof entry.value === "number" ? entry.value : 0;
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: entry.color || "#64748b" }}
                />
                <span className="text-slate-600">{entry.name}:</span>
                <span
                  className="font-medium"
                  style={{ color: entry.color || "#64748b" }}
                >
                  {formatCurrency(value)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({
    active,
    payload,
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload as
        | { name?: string; value?: number }
        | undefined;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-800">{data?.name}</p>
          <p className="text-sm text-slate-600">
            Net Cash Flow:{" "}
            <span className="font-medium">
              {formatCurrency(data?.value || 0)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
              <div className="h-32 bg-slate-200 rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                Segment Analysis
              </h2>
              <Badge variant="outline" className="ml-2">
                {segments.length} Segments
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedSegment(null)}
              className={selectedSegment ? "" : "opacity-50"}
            >
              Show All
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Performance Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Segment Performance
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {performance.map((seg, index) => (
              <motion.div
                key={seg.segmentId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => setSelectedSegment(seg.segmentId)}
                className="cursor-pointer"
              >
                <Card
                  className={`p-4 hover:shadow-md transition-shadow border-l-4 ${
                    selectedSegment === seg.segmentId
                      ? "ring-2 ring-blue-200"
                      : ""
                  }`}
                  style={{ borderLeftColor: getSegmentColor(seg.segmentName) }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-800">
                      {seg.segmentName.toUpperCase()}
                    </h4>
                    {getPerformanceIcon(seg.netCashFlow)}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Net Flow:</span>
                      <span
                        className={`font-medium ${seg.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(seg.netCashFlow)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Inflow:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(seg.totalInflow)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Outflow:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(seg.totalOutflow)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Growth Rate:</span>
                      <span className="font-medium text-blue-600">
                        {(seg.growthRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">
                        {seg.transactionCount} transactions
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Active
                      </Badge>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Flow Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Net Flow Distribution
            </h3>
            <div className="h-64">
              {pieChartData.length > 0 &&
              pieChartData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-500">
                    No positive cash flow data to display
                  </p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Segment Comparison */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Inflow vs Outflow
            </h3>
            <div className="h-64">
              {comparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis
                      dataKey="segment"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      verticalAlign="top"
                    />
                    <Bar
                      dataKey="inflow"
                      fill="#10B981"
                      name="Inflow"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="outflow"
                      fill="#EF4444"
                      name="Outflow"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-500">No segment data available</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Trends Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Net Flow Trends
          </h3>
          <div className="h-80">
            {trends.length > 0 && trends.some((t) => t.data.length > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" />
                  {trends.map((trend) => {
                    const color = getSegmentColor(trend.segment);
                    return (
                      <Line
                        key={trend.segment}
                        data={trend.data}
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name={trend.segment.toUpperCase()}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500">No trend data available</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Segment Details */}
      {selectedSegment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                {segments
                  .find((s) => s.id === selectedSegment)
                  ?.name.toUpperCase()}{" "}
                Details
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSegment(null)}
              >
                Close
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-blue-700">
                      Total Transactions
                    </div>
                    <div className="text-xl font-bold text-blue-800">
                      {segments.find((s) => s.id === selectedSegment)
                        ?.transactionCount || 0}
                    </div>
                  </div>
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </Card>

              <Card className="p-4 bg-green-50 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-green-700">
                      Forecasts Generated
                    </div>
                    <div className="text-xl font-bold text-green-800">
                      {segments.find((s) => s.id === selectedSegment)
                        ?.forecastCount || 0}
                    </div>
                  </div>
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </Card>

              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-purple-700">Health Score</div>
                    <div className="text-xl font-bold text-purple-800">
                      {(() => {
                        const net = performance.find(
                          (p) => p.segmentId === selectedSegment,
                        )?.netCashFlow;
                        return typeof net === "number" && net > 0
                          ? "Good"
                          : "Needs Attention";
                      })()}
                    </div>
                  </div>
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </Card>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
