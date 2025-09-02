"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardFilters } from "./cash-flow-dashboard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  filters: DashboardFilters;
  compact?: boolean;
}

interface RiskAlert {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  triggeredAt: string;
  resolvedAt: string | null;
  isResolved: boolean;
  recommendations: string[];
  affectedAmount: number | null;
  businessSegmentId: string | null;
  triggeredBy: TriggeredBy;
}

// Trigger metadata varies by alert type; capture known fields & allow extension
type TriggeredBy = {
  runway_months?: number;
  burn_rate?: number;
  avg_aging_days?: number;
  threshold?: number;
  actual_vs_seasonal?: number;
  segment?: string;
  [key: string]: unknown; // forward-compatible for new alert drivers
};

interface AlertSummary {
  total: number;
  countsBySeverity: Record<string, number>;
  trends: Array<{
    date: string;
    count: number;
    critical: number;
    high: number;
  }>;
}

export function RiskAlertsPanel({ filters: _filters, compact = false }: Props) {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showResolved, setShowResolved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        resolved: showResolved.toString(),
        limit: compact ? "5" : "20",
      });
      if (severityFilter !== "all") params.append("severity", severityFilter);

      const response = await fetch(`/api/alerts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.data?.alerts || []);
        setSummary(data.data?.summary || null);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [showResolved, severityFilter, compact]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId,
          isResolved: true,
        }),
      });

      if (response.ok) {
        await fetchAlerts(); // Refresh the data
      }
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "LOW":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "HIGH":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "MEDIUM":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case "LOW":
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-600" />;
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case "LIQUIDITY_RISK":
        return "💧";
      case "OUTFLOW_SPIKE":
        return "📈";
      case "RECEIVABLE_AGING":
        return "⏰";
      case "RUNWAY_WARNING":
        return "🛬";
      case "SEASONAL_ANOMALY":
        return "📊";
      default:
        return "⚠️";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: compact ? 3 : 5 }, (_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              Risk Alerts
            </h2>
            {summary?.countsBySeverity && (
              <Badge variant="outline" className="ml-2">
                {Object.values(summary.countsBySeverity).reduce(
                  (a, b) => a + b,
                  0,
                )}{" "}
                Active
              </Badge>
            )}
          </div>

          {!compact && (
            <div className="flex items-center gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResolved(!showResolved)}
                className={`h-8 ${showResolved ? "bg-slate-100" : ""}`}
              >
                {showResolved ? "Hide" : "Show"} Resolved
              </Button>
            </div>
          )}
        </div>

        {/* Summary Cards (only in non-compact mode) */}
        {!compact && summary?.countsBySeverity && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(summary.countsBySeverity).map(
              ([severity, count]) => (
                <Card
                  key={severity}
                  className={`p-3 ${getSeverityColor(severity)} border`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{severity}</div>
                      <div className="text-xl font-bold">{count}</div>
                    </div>
                    {getSeverityIcon(severity)}
                  </div>
                </Card>
              ),
            )}
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-3">
          <AnimatePresence>
            {alerts.length > 0 ? (
              alerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card
                    className={`p-4 border-l-4 ${
                      alert.severity === "CRITICAL"
                        ? "border-l-red-500"
                        : alert.severity === "HIGH"
                          ? "border-l-orange-500"
                          : alert.severity === "MEDIUM"
                            ? "border-l-yellow-500"
                            : "border-l-blue-500"
                    } ${alert.isResolved ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg">
                            {getAlertTypeIcon(alert.type)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <span className="text-sm text-slate-500">
                              {timeAgo(alert.triggeredAt)}
                            </span>
                            {alert.isResolved && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </div>

                        <h3 className="font-medium text-slate-800 mb-1">
                          {alert.title}
                        </h3>

                        <p className="text-sm text-slate-600 mb-3">
                          {alert.description}
                        </p>

                        {alert.affectedAmount && (
                          <div className="text-sm text-slate-600 mb-2">
                            <strong>Affected amount:</strong>{" "}
                            {formatCurrency(alert.affectedAmount)}
                          </div>
                        )}

                        {!compact && alert.recommendations.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-medium text-slate-700 mb-1">
                              Recommendations:
                            </div>
                            <ul className="text-xs text-slate-600 space-y-1">
                              {alert.recommendations
                                .slice(0, 2)
                                .map((rec, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2"
                                  >
                                    <span className="text-blue-500 mt-0.5">
                                      •
                                    </span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {!alert.isResolved && !compact && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveAlert(alert.id)}
                          className="ml-4"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-slate-600">
                  {showResolved
                    ? "No resolved alerts found"
                    : "No active alerts"}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Your cash flow is looking healthy!
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {compact && alerts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <Button variant="outline" size="sm" className="w-full">
              View All Alerts ({alerts.length})
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
