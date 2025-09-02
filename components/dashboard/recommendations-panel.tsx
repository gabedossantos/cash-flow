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
  Target,
  DollarSign,
  Clock,
  CheckCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  filters: DashboardFilters;
  compact?: boolean;
}

interface BusinessRecommendation {
  id: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  title: string;
  description: string;
  estimatedImpact: number | null;
  implementationCost: number | null;
  timeToImplement: number | null;
  status: "PENDING" | "IN_PROGRESS" | "IMPLEMENTED" | "DISMISSED";
  confidence: number;
  createdAt: string;
  implementedAt: string | null;
  basedOnData: RecommendationEvidence;
}

// Evidence data that led to the recommendation (flexible JSON structure)
type RecommendationEvidence = {
  source?: string; // e.g. "cash_flow_analysis", "aging_report"
  metrics?: Record<string, number>;
  notes?: string;
  segmentId?: string | null;
  [key: string]: unknown; // permit future analytical dimensions
};

interface RecommendationAnalytics {
  totalRecommendations: number;
  impactByCategory: Record<string, { count: number; totalImpact: number }>;
  priorityDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
}

export function RecommendationsPanel({
  filters: _filters,
  compact = false,
}: Props) {
  const [recommendations, setRecommendations] = useState<
    BusinessRecommendation[]
  >([]);
  const [analytics, setAnalytics] = useState<RecommendationAnalytics | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecommendations = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        limit: compact ? "5" : "20",
      });
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`/api/recommendations?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.data?.recommendations || []);
        setAnalytics(data.data?.analytics || null);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [compact, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const updateRecommendationStatus = async (
    recommendationId: string,
    status: string,
  ) => {
    try {
      const response = await fetch("/api/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId,
          status,
        }),
      });

      if (response.ok) {
        await fetchRecommendations();
      }
    } catch (error) {
      console.error("Error updating recommendation:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IMPLEMENTED":
        return "bg-green-100 text-green-800 border-green-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DISMISSED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "CREDIT_LINE":
        return "🏦";
      case "COLLECTION_STRATEGY":
        return "📋";
      case "PAYMENT_TERMS":
        return "📄";
      case "WORKING_CAPITAL":
        return "🔄";
      case "COST_OPTIMIZATION":
        return "✂️";
      case "REVENUE_ACCELERATION":
        return "🚀";
      case "CASH_MANAGEMENT":
        return "💰";
      default:
        return "💡";
    }
  };

  const formatCurrency = (amount: number) => {
    if (Math.abs(amount) >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const calculateROI = (impact: number | null, cost: number | null) => {
    if (!impact || !cost || cost === 0) return null;
    return ((impact - cost) / cost) * 100;
  };

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} weeks ago`;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: compact ? 3 : 5 }, (_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded"></div>
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
            <Target className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              Action Items
            </h2>
            {analytics && (
              <Badge variant="outline" className="ml-2">
                {analytics.totalRecommendations} Total
              </Badge>
            )}
          </div>

          {!compact && (
            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="CREDIT_LINE">Credit Line</SelectItem>
                  <SelectItem value="COLLECTION_STRATEGY">
                    Collections
                  </SelectItem>
                  <SelectItem value="WORKING_CAPITAL">
                    Working Capital
                  </SelectItem>
                  <SelectItem value="COST_OPTIMIZATION">
                    Cost Optimization
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="IMPLEMENTED">Implemented</SelectItem>
                  <SelectItem value="all">All Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Summary Metrics (non-compact mode) */}
        {!compact && analytics && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-green-700">Potential Impact</div>
                  <div className="text-xl font-bold text-green-800">
                    {formatCurrency(
                      Object.values(analytics.impactByCategory).reduce(
                        (sum, cat) => sum + cat.totalImpact,
                        0,
                      ),
                    )}
                  </div>
                </div>
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </Card>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-blue-700">High Priority</div>
                  <div className="text-xl font-bold text-blue-800">
                    {(analytics.priorityDistribution.HIGH || 0) +
                      (analytics.priorityDistribution.URGENT || 0)}
                  </div>
                </div>
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </Card>

            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-yellow-700">Pending</div>
                  <div className="text-xl font-bold text-yellow-800">
                    {analytics.statusDistribution.PENDING || 0}
                  </div>
                </div>
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </Card>
          </div>
        )}

        {/* Recommendations List */}
        <div className="space-y-4">
          <AnimatePresence>
            {recommendations.length > 0 ? (
              recommendations.map((rec, index) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card
                    className={`p-4 border-l-4 ${
                      rec.priority === "URGENT"
                        ? "border-l-red-500"
                        : rec.priority === "HIGH"
                          ? "border-l-orange-500"
                          : rec.priority === "MEDIUM"
                            ? "border-l-yellow-500"
                            : "border-l-blue-500"
                    } hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg">
                            {getCategoryIcon(rec.category)}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority}
                            </Badge>
                            <Badge className={getStatusColor(rec.status)}>
                              {rec.status.replace("_", " ")}
                            </Badge>
                            <span className="text-sm text-slate-500">
                              {timeAgo(rec.createdAt)}
                            </span>
                          </div>
                        </div>

                        <h3 className="font-medium text-slate-800 mb-2">
                          {rec.title}
                        </h3>

                        <p className="text-sm text-slate-600 mb-3">
                          {rec.description}
                        </p>

                        {/* Impact Metrics */}
                        {(rec.estimatedImpact || rec.implementationCost) && (
                          <div className="flex flex-wrap gap-4 mb-3 text-sm">
                            {rec.estimatedImpact && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-green-600" />
                                <span className="text-slate-600">Impact:</span>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(rec.estimatedImpact)}
                                </span>
                              </div>
                            )}

                            {rec.implementationCost && (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-600">Cost:</span>
                                <span className="font-medium">
                                  {formatCurrency(rec.implementationCost)}
                                </span>
                              </div>
                            )}

                            {rec.timeToImplement && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-600" />
                                <span className="text-slate-600">
                                  {rec.timeToImplement} days
                                </span>
                              </div>
                            )}

                            {rec.estimatedImpact && rec.implementationCost && (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-600">ROI:</span>
                                <span className="font-medium text-blue-600">
                                  {calculateROI(
                                    rec.estimatedImpact,
                                    rec.implementationCost,
                                  )?.toFixed(0)}
                                  %
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Confidence Score */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">
                              Confidence:
                            </span>
                            <div className="w-16 h-2 bg-slate-200 rounded-full">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${rec.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600">
                              {(rec.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {!compact && rec.status === "PENDING" && (
                        <div className="ml-4 flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              updateRecommendationStatus(rec.id, "IN_PROGRESS")
                            }
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Start <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateRecommendationStatus(rec.id, "DISMISSED")
                            }
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}

                      {!compact && rec.status === "IN_PROGRESS" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateRecommendationStatus(rec.id, "IMPLEMENTED")
                          }
                          className="ml-4 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <p className="text-slate-600">No recommendations available</p>
                <p className="text-sm text-slate-500 mt-1">
                  Check back later for insights
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {compact && recommendations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <Button variant="outline" size="sm" className="w-full">
              View All Recommendations ({recommendations.length})
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
