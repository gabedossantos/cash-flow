"use client";

import { useState } from "react";
import { DashboardFilters } from "./cash-flow-dashboard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  BarChart,
  Bar,
} from "recharts";
import {
  Zap,
  Play,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  filters: DashboardFilters;
}

interface SimulationParameters {
  numRuns: number;
  timeHorizon: number;
  scenario: string;
  customVariables?: {
    baseInflowMean?: number;
    baseInflowStd?: number;
    baseOutflowMean?: number;
    baseOutflowStd?: number;
    growthRateMean?: number;
    growthRateStd?: number;
  };
}

interface SimulationStatistics {
  meanFinalBalance: number;
  medianFinalBalance: number;
  percentile5: number;
  percentile95: number;
  probabilityNegative: number;
  averageRunway: number;
  worstCaseRunway: number;
  bestCaseRunway: number;
}

interface SensitivityAnalysis {
  inflowImpact: number;
  outflowImpact: number;
  growthImpact: number;
  seasonalityImpact: number;
}

interface SimulationResults {
  simulationId: string;
  statistics: SimulationStatistics;
  sensitivityAnalysis: SensitivityAnalysis;
  sampleRuns: SampleRun[];
  totalRuns: number;
}

interface SampleRun {
  finalBalance: number;
  runwayMonths: number | null;
  monthlyBalances?: number[]; // optional detailed trajectory
  [key: string]: unknown; // accommodate future analytics (e.g., shocks applied)
}

export function MonteCarloPanel({ filters }: Props) {
  const [parameters, setParameters] = useState<SimulationParameters>({
    numRuns: 500,
    timeHorizon: 12,
    scenario: filters.scenario,
  });
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);

  const runSimulation = async () => {
    try {
      setIsRunning(true);

      const response = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parameters,
          segmentId: filters.segmentId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.data);
      }
    } catch (error) {
      console.error("Error running Monte Carlo simulation:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Generate distribution chart data
  const generateDistributionData = () => {
    if (!results?.sampleRuns) return [];

    const finalBalances = results.sampleRuns.map((run) => run.finalBalance);
    const min = Math.min(...finalBalances);
    const max = Math.max(...finalBalances);
    const bucketCount = 20;
    const bucketSize = (max - min) / bucketCount;

    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      range: `${formatCurrency(min + i * bucketSize)}`,
      count: 0,
      rangeStart: min + i * bucketSize,
    }));

    finalBalances.forEach((balance) => {
      const bucketIndex = Math.min(
        Math.floor((balance - min) / bucketSize),
        bucketCount - 1,
      );
      buckets[bucketIndex].count++;
    });

    return buckets;
  };
  const getRiskLevel = (probability: number) => {
    if (probability >= 0.3)
      return { level: "HIGH", color: "text-red-600 bg-red-50" };
    if (probability >= 0.15)
      return { level: "MEDIUM", color: "text-orange-600 bg-orange-50" };
    return { level: "LOW", color: "text-green-600 bg-green-50" };
  };

  return (
    <div className="space-y-6">
      {/* Simulation Parameters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                Monte Carlo Simulation
              </h2>
            </div>
            <Button
              onClick={runSimulation}
              disabled={isRunning}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isRunning ? "Running..." : "Run Simulation"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="numRuns">Number of Runs</Label>
              <Select
                value={parameters.numRuns.toString()}
                onValueChange={(value) =>
                  setParameters({ ...parameters, numRuns: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="500">500 Runs</SelectItem>
                  <SelectItem value="1000">1,000 Runs</SelectItem>
                  <SelectItem value="1500">1,500 Runs</SelectItem>
                  <SelectItem value="2000">2,000 Runs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="timeHorizon">Time Horizon</Label>
              <Select
                value={parameters.timeHorizon.toString()}
                onValueChange={(value) =>
                  setParameters({ ...parameters, timeHorizon: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                  <SelectItem value="18">18 Months</SelectItem>
                  <SelectItem value="24">24 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="scenario">Scenario</Label>
              <Select
                value={parameters.scenario}
                onValueChange={(value) =>
                  setParameters({ ...parameters, scenario: value })
                }
              >
                <SelectTrigger>
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
          </div>

          <Button
            variant="outline"
            onClick={() => setShowAdvancedParams(!showAdvancedParams)}
            className="mb-4"
          >
            Advanced Parameters {showAdvancedParams ? "▼" : "▶"}
          </Button>

          <AnimatePresence>
            {showAdvancedParams && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 gap-4 border-t pt-4"
              >
                <div>
                  <Label>Base Inflow Mean ($)</Label>
                  <Input
                    type="number"
                    placeholder="500000"
                    value={parameters.customVariables?.baseInflowMean || ""}
                    onChange={(e) =>
                      setParameters({
                        ...parameters,
                        customVariables: {
                          ...parameters.customVariables,
                          baseInflowMean:
                            parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Base Outflow Mean ($)</Label>
                  <Input
                    type="number"
                    placeholder="400000"
                    value={parameters.customVariables?.baseOutflowMean || ""}
                    onChange={(e) =>
                      setParameters({
                        ...parameters,
                        customVariables: {
                          ...parameters.customVariables,
                          baseOutflowMean:
                            parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Growth Rate Mean (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.05"
                    value={parameters.customVariables?.growthRateMean || ""}
                    onChange={(e) =>
                      setParameters({
                        ...parameters,
                        customVariables: {
                          ...parameters.customVariables,
                          growthRateMean:
                            parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Growth Rate Std Dev</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.02"
                    value={parameters.customVariables?.growthRateStd || ""}
                    onChange={(e) =>
                      setParameters({
                        ...parameters,
                        customVariables: {
                          ...parameters.customVariables,
                          growthRateStd:
                            parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Results */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Summary Statistics */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-800">
                Simulation Results
              </h3>
              <Badge variant="outline" className="ml-2">
                {results.totalRuns.toLocaleString()} Runs
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="text-sm text-green-700">Mean Balance</div>
                <div className="text-xl font-bold text-green-800">
                  {formatCurrency(results.statistics.meanFinalBalance)}
                </div>
              </Card>

              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="text-sm text-blue-700">Median Balance</div>
                <div className="text-xl font-bold text-blue-800">
                  {formatCurrency(results.statistics.medianFinalBalance)}
                </div>
              </Card>

              <Card
                className={`p-4 border-2 ${getRiskLevel(results.statistics.probabilityNegative).color}`}
              >
                <div className="text-sm">Probability Negative</div>
                <div className="text-xl font-bold">
                  {(results.statistics.probabilityNegative * 100).toFixed(1)}%
                </div>
              </Card>

              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="text-sm text-purple-700">Avg Runway</div>
                <div className="text-xl font-bold text-purple-800">
                  {results.statistics.averageRunway?.toFixed(1) || "N/A"} mo
                </div>
              </Card>
            </div>

            {/* Confidence Intervals */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium text-slate-800 mb-2">
                90% Confidence Interval
              </h4>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-slate-600">5th Percentile:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {formatCurrency(results.statistics.percentile5)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-600">95th Percentile:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {formatCurrency(results.statistics.percentile95)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Distribution Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Final Balance Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={generateDistributionData()}>
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} scenarios`, "Count"]}
                    labelFormatter={(label) => `Balance Range: ${label}`}
                  />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Sensitivity Analysis */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-slate-800">
                Sensitivity Analysis
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Object.entries(results.sensitivityAnalysis).map(
                ([factor, impact]) => (
                  <div
                    key={factor}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-slate-700 capitalize">
                      {factor
                        .replace(/([A-Z])/g, " $1")
                        .replace("Impact", "")
                        .trim()}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-200 rounded-full">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${Math.abs(impact) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {(impact * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </Card>

          {/* Risk Assessment */}
          {results.statistics.probabilityNegative > 0.15 && (
            <Card className="p-6 bg-red-50 border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">
                  Risk Alert
                </h3>
              </div>
              <p className="text-red-700 mb-4">
                High probability of negative cash balance detected (
                {(results.statistics.probabilityNegative * 100).toFixed(1)}%).
                Consider implementing risk mitigation strategies.
              </p>
              <div className="space-y-2">
                <div className="text-sm text-red-600">
                  <strong>Worst Case Runway:</strong>{" "}
                  {results.statistics.worstCaseRunway} months
                </div>
                <div className="text-sm text-red-600">
                  <strong>Recommended Actions:</strong>
                </div>
                <ul className="text-sm text-red-600 ml-4 space-y-1">
                  <li>• Establish credit line or emergency funding</li>
                  <li>• Accelerate accounts receivable collection</li>
                  <li>• Review and optimize operational expenses</li>
                  <li>• Consider revenue acceleration strategies</li>
                </ul>
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {!results && !isRunning && (
        <Card className="p-12 text-center">
          <Zap className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Monte Carlo Simulation
          </h3>
          <p className="text-slate-600 mb-6">
            Run thousands of scenarios to understand your cash flow risk profile
            and potential outcomes
          </p>
          <Button
            onClick={runSimulation}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Simulation
          </Button>
        </Card>
      )}
    </div>
  );
}
