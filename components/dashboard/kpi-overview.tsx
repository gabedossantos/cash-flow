"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardFilters } from "./cash-flow-dashboard";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Clock,
  PieChart,
} from "lucide-react";
import { motion, useSpring, useTransform } from "framer-motion";

interface Props {
  filters: DashboardFilters;
}

interface KPIData {
  netCashFlow: number;
  burnRate: number;
  runwayMonths: number | null;
  workingCapitalRatio: number;
  growthRate: number;
  totalInflow: number;
  totalOutflow: number;
  cashBalance: number;
}

interface KPIChanges {
  netCashFlowChange: number;
  burnRateChange: number;
  inflowChange: number;
}

export function KPIOverview({ filters }: Props) {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [kpiChanges, setKpiChanges] = useState<KPIChanges | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKPIData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filters.segmentId) params.append("segmentId", filters.segmentId);

      const response = await fetch(`/api/kpis?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setKpiData(data.data?.current || null);
        setKpiChanges(data.data?.changes || null);
      }
    } catch (error) {
      console.error("Error fetching KPI data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters.segmentId]);

  useEffect(() => {
    fetchKPIData();
  }, [fetchKPIData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-slate-600";
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    if (change < 0) return <TrendingDown className="w-3 h-3" />;
    return null;
  };

  // Animated number component
  const AnimatedNumber = ({
    value,
    format = "currency",
  }: {
    value: number;
    format?: "currency" | "number" | "percentage";
  }) => {
    const spring = useSpring(value, { stiffness: 100, damping: 30 });
    const display = useTransform(spring, (latest) => {
      if (format === "currency") return formatCurrency(latest);
      if (format === "percentage") return `${(latest * 100).toFixed(1)}%`;
      return Math.round(latest).toLocaleString();
    });

    return <motion.span>{display}</motion.span>;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-1/3"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!kpiData) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-600">No KPI data available</p>
      </Card>
    );
  }

  const kpis = [
    {
      title: "Net Cash Flow",
      value: kpiData.netCashFlow,
      format: "currency" as const,
      icon: DollarSign,
      change: kpiChanges?.netCashFlowChange,
      color: kpiData.netCashFlow >= 0 ? "text-green-600" : "text-red-600",
      bgColor: kpiData.netCashFlow >= 0 ? "bg-green-50" : "bg-red-50",
      iconColor: kpiData.netCashFlow >= 0 ? "text-green-600" : "text-red-600",
      description: "Monthly net cash position",
    },
    {
      title: "Burn Rate",
      value: kpiData.burnRate,
      format: "currency" as const,
      icon: Zap,
      change: kpiChanges?.burnRateChange,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      description: "Monthly cash consumption",
    },
    {
      title: "Runway",
      value: kpiData.runwayMonths || 0,
      format: "number" as const,
      icon: Clock,
      change: null,
      color:
        (kpiData.runwayMonths || 0) > 12
          ? "text-green-600"
          : (kpiData.runwayMonths || 0) > 6
            ? "text-orange-600"
            : "text-red-600",
      bgColor:
        (kpiData.runwayMonths || 0) > 12
          ? "bg-green-50"
          : (kpiData.runwayMonths || 0) > 6
            ? "bg-orange-50"
            : "bg-red-50",
      iconColor:
        (kpiData.runwayMonths || 0) > 12
          ? "text-green-600"
          : (kpiData.runwayMonths || 0) > 6
            ? "text-orange-600"
            : "text-red-600",
      description: "Months of cash remaining",
    },
    {
      title: "Working Capital Ratio",
      value: kpiData.workingCapitalRatio,
      format: "percentage" as const,
      icon: PieChart,
      change: null,
      color:
        kpiData.workingCapitalRatio >= 1.5
          ? "text-green-600"
          : kpiData.workingCapitalRatio >= 1.0
            ? "text-orange-600"
            : "text-red-600",
      bgColor:
        kpiData.workingCapitalRatio >= 1.5
          ? "bg-green-50"
          : kpiData.workingCapitalRatio >= 1.0
            ? "bg-orange-50"
            : "bg-red-50",
      iconColor:
        kpiData.workingCapitalRatio >= 1.5
          ? "text-green-600"
          : kpiData.workingCapitalRatio >= 1.0
            ? "text-orange-600"
            : "text-red-600",
      description: "Liquidity health indicator",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, staggerChildren: 0.1 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <Card
            className={`p-6 ${kpi.bgColor} border-l-4 border-l-current hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                  <h3 className="text-sm font-medium text-slate-700">
                    {kpi.title}
                  </h3>
                </div>

                <div className={`text-2xl font-bold ${kpi.color} mb-1`}>
                  <AnimatedNumber value={kpi.value} format={kpi.format} />
                  {kpi.format === "number" && kpi.title === "Runway" && (
                    <span className="text-sm font-normal ml-1">months</span>
                  )}
                </div>

                <p className="text-xs text-slate-600 mb-2">{kpi.description}</p>

                {kpi.change !== null && kpi.change !== undefined && (
                  <div
                    className={`flex items-center gap-1 text-xs ${getChangeColor(kpi.change)}`}
                  >
                    {getChangeIcon(kpi.change)}
                    <span>{formatPercentage(kpi.change)} vs last month</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
