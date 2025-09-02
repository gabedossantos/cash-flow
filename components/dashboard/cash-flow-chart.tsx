"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardFilters } from "./cash-flow-dashboard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Area,
  AreaChart,
  TooltipProps,
} from "recharts";
import { TrendingUp, BarChart3, LineChart, Download } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  filters: DashboardFilters;
}

interface CashFlowData {
  month: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  date: Date;
}

interface CashFlowSummary {
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  transactionCount: number;
  period: string;
}

export function CashFlowChart({ filters }: Props) {
  const [data, setData] = useState<CashFlowData[]>([]);
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [chartType, setChartType] = useState<"area" | "bar" | "line">("area");
  const [isLoading, setIsLoading] = useState(true);

  const fetchCashFlowData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filters.segmentId) params.append("segmentId", filters.segmentId);
      params.append("startDate", filters.dateRange.startDate.toISOString());
      params.append("endDate", filters.dateRange.endDate.toISOString());

      const response = await fetch(`/api/cashflow?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        const monthlyTrend = result.data?.monthlyTrend || [];

        setData(
          monthlyTrend.map(
            (item: {
              date: string | Date;
              inflow: number;
              outflow: number;
              netFlow: number;
            }) => ({
              month: new Date(item.date).toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              }),
              inflow: item.inflow,
              outflow: item.outflow,
              netFlow: item.netFlow,
              date: new Date(item.date),
            }),
          ),
        );

        setSummary(result.data?.summary || null);
      }
    } catch (error) {
      console.error("Error fetching cash flow data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.segmentId,
    filters.dateRange.startDate,
    filters.dateRange.endDate,
  ]);

  useEffect(() => {
    fetchCashFlowData();
  }, [fetchCashFlowData]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-800 mb-2">{label}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600">{entry.name}:</span>
              <span className="font-medium" style={{ color: entry.color }}>
                {formatCurrency(Number(entry.value) || 0)}
              </span>
            </div>
          ))}
          {payload.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Net Flow:</span>
                <span
                  className={`font-medium ${
                    (payload.find((p) => p.dataKey === "netFlow")?.value ||
                      0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(
                    (payload.find((p) => p.dataKey === "netFlow")
                      ?.value as number) || 0,
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const exportData = () => {
    const csvContent = [
      ["Month", "Inflow", "Outflow", "Net Flow"],
      ...data.map((item) => [
        item.month,
        item.inflow.toString(),
        item.outflow.toString(),
        item.netFlow.toString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-flow-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1} />
              </linearGradient>
            </defs>
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
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" />
            <Area
              type="monotone"
              dataKey="inflow"
              stackId="1"
              stroke="#10B981"
              fill="url(#inflowGradient)"
              name="Inflow"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="outflow"
              stackId="2"
              stroke="#EF4444"
              fill="url(#outflowGradient)"
              name="Outflow"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="netFlow"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Net Flow"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
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
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" />
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
            <Line
              type="monotone"
              dataKey="netFlow"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Net Flow"
            />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
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
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" />
          <Line
            type="monotone"
            dataKey="inflow"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Inflow"
          />
          <Line
            type="monotone"
            dataKey="outflow"
            stroke="#EF4444"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Outflow"
          />
          <Line
            type="monotone"
            dataKey="netFlow"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={{ r: 4 }}
            name="Net Flow"
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="h-80 bg-slate-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-1">
              Cash Flow Trend
            </h2>
            {summary && (
              <p className="text-sm text-slate-600">
                Net flow:{" "}
                <span
                  className={`font-medium ${summary.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(summary.netCashFlow)}
                </span>{" "}
                over{" "}
                {summary.period
                  .split(" to ")[0]
                  .split("-")
                  .slice(0, 2)
                  .reverse()
                  .join("/")}{" "}
                -{" "}
                {summary.period
                  .split(" to ")[1]
                  .split("-")
                  .slice(0, 2)
                  .reverse()
                  .join("/")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={chartType}
              onValueChange={(value: "area" | "bar" | "line") =>
                setChartType(value)
              }
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Area Chart
                  </div>
                </SelectItem>
                <SelectItem value="bar">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Bar Chart
                  </div>
                </SelectItem>
                <SelectItem value="line">
                  <div className="flex items-center gap-2">
                    <LineChart className="w-4 h-4" />
                    Line Chart
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
              className="h-8"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="h-80">
          {data.length > 0 ? (
            renderChart()
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">No cash flow data available</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
