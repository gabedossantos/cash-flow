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
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  AreaChart,
  Line,
} from "recharts";
import { Brain, TrendingUp, Play, Download, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  filters: DashboardFilters;
}

interface ForecastResult {
  date: string;
  predicted: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
  model: string;
  scenario: string;
}

interface ForecastAccuracy {
  mape: number | null;
  accuracy: number | null;
  sampleSize: number;
}

export function ForecastingPanel({ filters }: Props) {
  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [accuracy, setAccuracy] = useState<ForecastAccuracy | null>(null);
  const [selectedModel, setSelectedModel] = useState<
    "PROPHET" | "ARIMA" | "REGRESSION" | "ENSEMBLE"
  >("ENSEMBLE");
  const [horizon, setHorizon] = useState("12");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchForecasts = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        model: selectedModel,
        scenario: filters.scenario,
        horizon: horizon,
      });
      if (filters.segmentId) params.append("segmentId", filters.segmentId);

      const response = await fetch(`/api/forecasts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setForecasts(data.data?.forecasts || []);
        setAccuracy(data.data?.accuracy || null);
      }
    } catch (error) {
      console.error("Error fetching forecasts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel, filters.scenario, horizon, filters.segmentId]);

  useEffect(() => {
    fetchForecasts();
  }, [fetchForecasts]);

  const generateNewForecast = useCallback(async () => {
    try {
      setIsGenerating(true);
      const response = await fetch("/api/forecasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          scenario: filters.scenario,
          horizon: parseInt(horizon),
          segmentId: filters.segmentId,
        }),
      });

      if (response.ok) {
        await fetchForecasts(); // Refresh the data
      }
    } catch (error) {
      console.error("Error generating forecast:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [
    selectedModel,
    filters.scenario,
    horizon,
    filters.segmentId,
    fetchForecasts,
  ]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getModelInfo = (model: string) => {
    const modelInfo = {
      PROPHET: {
        name: "Prophet",
        color: "#8B5CF6",
        description: "Facebook's time series forecasting",
      },
      ARIMA: {
        name: "ARIMA",
        color: "#10B981",
        description: "Autoregressive integrated moving average",
      },
      REGRESSION: {
        name: "Regression",
        color: "#F59E0B",
        description: "Linear regression with seasonality",
      },
      ENSEMBLE: {
        name: "Ensemble",
        color: "#3B82F6",
        description: "Combined model predictions",
      },
    };
    return modelInfo[model as keyof typeof modelInfo] || modelInfo.ENSEMBLE;
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ForecastResult }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-800 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Predicted:</span>
              <span className="font-medium text-blue-600">
                {formatCurrency(data.predicted)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Confidence:</span>
              <span className="font-medium">
                {(data.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Range:</span>
              <span className="text-sm text-slate-500">
                {formatCurrency(data.lowerBound)} -{" "}
                {formatCurrency(data.upperBound)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const exportForecasts = () => {
    const csvContent = [
      [
        "Date",
        "Model",
        "Predicted",
        "Confidence",
        "Lower Bound",
        "Upper Bound",
      ],
      ...forecasts.map((f) => [
        f.date,
        f.model,
        f.predicted.toString(),
        (f.confidence * 100).toString(),
        f.lowerBound.toString(),
        f.upperBound.toString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forecasts-${selectedModel}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-800">
                  AI Forecasting
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Model:</span>
                <Select
                  value={selectedModel}
                  onValueChange={(
                    value: "PROPHET" | "ARIMA" | "REGRESSION" | "ENSEMBLE",
                  ) => setSelectedModel(value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENSEMBLE">Ensemble</SelectItem>
                    <SelectItem value="PROPHET">Prophet</SelectItem>
                    <SelectItem value="ARIMA">ARIMA</SelectItem>
                    <SelectItem value="REGRESSION">Regression</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Horizon:</span>
                <Select value={horizon} onValueChange={setHorizon}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="18">18 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={generateNewForecast}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Generate
              </Button>

              <Button
                variant="outline"
                onClick={exportForecasts}
                disabled={forecasts.length === 0}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Forecast Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                {horizon}-Month Cash Flow Forecast
              </h3>
              <div className="flex items-center gap-4">
                <Badge
                  variant="outline"
                  style={{
                    borderColor: getModelInfo(selectedModel).color,
                    color: getModelInfo(selectedModel).color,
                  }}
                >
                  {getModelInfo(selectedModel).name}
                </Badge>
                <Badge variant="outline">
                  {filters.scenario.replace("_", " ")}
                </Badge>
                {accuracy?.accuracy && (
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-200"
                  >
                    {accuracy.accuracy.toFixed(1)}% Accuracy
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="h-80">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-slate-600">Loading forecasts...</p>
                </div>
              </div>
            ) : forecasts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={forecasts}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id="confidenceGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={getModelInfo(selectedModel).color}
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor={getModelInfo(selectedModel).color}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        year: "2-digit",
                      })
                    }
                  />
                  <YAxis
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stackId="1"
                    stroke="none"
                    fill={getModelInfo(selectedModel).color}
                    fillOpacity={0.1}
                    name="Upper Confidence"
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stackId="1"
                    stroke="none"
                    fill="white"
                    name="Lower Confidence"
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke={getModelInfo(selectedModel).color}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="Predicted Value"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500">No forecast data available</p>
                  <Button
                    onClick={generateNewForecast}
                    variant="outline"
                    className="mt-2"
                    disabled={isGenerating}
                  >
                    Generate Forecast
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Model Performance */}
      {accuracy && accuracy.sampleSize > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Model Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {accuracy.accuracy?.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-600">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {accuracy.mape?.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-600">MAPE</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-600 mb-1">
                  {accuracy.sampleSize}
                </div>
                <div className="text-sm text-slate-600">Sample Size</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              Performance metrics based on historical forecast accuracy
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
