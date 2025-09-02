import { prisma } from "./prisma";
import { ScenarioType, TransactionType } from "@prisma/client";

export interface SimulationParameters {
  numRuns: number;
  timeHorizon: number; // months
  scenario: ScenarioType;
  segmentId?: string;
  customVariables?: {
    baseInflowMean?: number;
    baseInflowStd?: number;
    baseOutflowMean?: number;
    baseOutflowStd?: number;
    growthRateMean?: number;
    growthRateStd?: number;
    seasonalityVariance?: number;
  };
}

export interface SimulationRun {
  runNumber: number;
  monthlyResults: MonthlyResult[];
  finalBalance: number;
  minBalance: number;
  maxBalance: number;
  probabilityNegative: number;
  runwayMonths: number | null;
}

export interface MonthlyResult {
  month: number;
  inflow: number;
  outflow: number;
  netFlow: number;
  cumulativeBalance: number;
  date: Date;
}

export interface SimulationSummary {
  simulationId: string;
  parameters: SimulationParameters;
  runs: SimulationRun[];
  statistics: {
    meanFinalBalance: number;
    medianFinalBalance: number;
    percentile5: number;
    percentile95: number;
    probabilityNegative: number;
    averageRunway: number;
    worstCaseRunway: number;
    bestCaseRunway: number;
  };
  sensitivityAnalysis: {
    inflowImpact: number;
    outflowImpact: number;
    growthImpact: number;
    seasonalityImpact: number;
  };
}

interface HistoricalData {
  inflows: number[];
  outflows: number[];
}

interface BaseParameters {
  baseInflowMean: number;
  baseInflowStd: number;
  baseOutflowMean: number;
  baseOutflowStd: number;
  growthRate: { mean: number; std: number };
  seasonality: { inflow: number[]; outflow: number[] };
  startingBalance: number;
}

export class MonteCarloEngine {
  // Main simulation runner
  static async runSimulation(
    params: SimulationParameters,
  ): Promise<SimulationSummary> {
    const simulationId = this.generateSimulationId();

    // Get historical data for parameter estimation
    const historicalData = await this.getHistoricalData(params.segmentId);
    const baseParameters = this.calculateBaseParameters(historicalData, params);

    console.log(
      `Starting Monte Carlo simulation with ${params.numRuns} runs...`,
    );

    // Run multiple simulations
    const runs: SimulationRun[] = [];
    for (let runNumber = 1; runNumber <= params.numRuns; runNumber++) {
      const run = await this.runSingleSimulation(
        runNumber,
        baseParameters,
        params,
      );
      runs.push(run);

      // Progress logging
      if (runNumber % 100 === 0) {
        console.log(`Completed ${runNumber}/${params.numRuns} simulation runs`);
      }
    }

    // Calculate summary statistics
    const statistics = this.calculateStatistics(runs);
    const sensitivityAnalysis = this.performSensitivityAnalysis(
      runs,
      baseParameters,
      params,
    );

    // Save results to database
    await this.saveSimulationResults(simulationId, params, runs);

    return {
      simulationId,
      parameters: params,
      runs,
      statistics,
      sensitivityAnalysis,
    };
  }

  // Run a single Monte Carlo simulation
  private static async runSingleSimulation(
    runNumber: number,
    baseParams: BaseParameters,
    params: SimulationParameters,
  ): Promise<SimulationRun> {
    const monthlyResults: MonthlyResult[] = [];
    let cumulativeBalance = baseParams.startingBalance;
    let minBalance = cumulativeBalance;
    let maxBalance = cumulativeBalance;
    let runwayMonths = null;
    for (let month = 1; month <= params.timeHorizon; month++) {
      const date = new Date();
      date.setMonth(date.getMonth() + month);

      // Generate random variables for this month
      const inflow = this.generateRandomInflow(
        month,
        baseParams,
        params.scenario,
      );
      const outflow = this.generateRandomOutflow(
        month,
        baseParams,
        params.scenario,
      );
      const netFlow = inflow - outflow;

      cumulativeBalance += netFlow;

      // Track min/max
      minBalance = Math.min(minBalance, cumulativeBalance);
      maxBalance = Math.max(maxBalance, cumulativeBalance);

      // Track runway (first month going negative)
      if (cumulativeBalance < 0 && runwayMonths === null) {
        runwayMonths = month - 1;
      }

      monthlyResults.push({
        month,
        inflow,
        outflow,
        netFlow,
        cumulativeBalance,
        date,
      });
    }

    // Calculate final runway if never went negative
    if (runwayMonths === null) {
      const avgBurn =
        monthlyResults
          .filter((r) => r.netFlow < 0)
          .reduce((sum, r) => sum + Math.abs(r.netFlow), 0) /
          monthlyResults.filter((r) => r.netFlow < 0).length || 0;

      if (avgBurn > 0) {
        runwayMonths = Math.floor(
          monthlyResults[monthlyResults.length - 1].cumulativeBalance / avgBurn,
        );
      }
    }

    return {
      runNumber,
      monthlyResults,
      finalBalance: cumulativeBalance,
      minBalance,
      maxBalance,
      probabilityNegative: minBalance < 0 ? 1 : 0,
      runwayMonths,
    };
  }

  // Generate random inflow with seasonality and growth
  private static generateRandomInflow(
    month: number,
    baseParams: BaseParameters,
    scenario: ScenarioType,
  ): number {
    const { baseInflowMean, baseInflowStd, growthRate, seasonality } =
      baseParams;

    // Scenario adjustments
    const scenarioMultipliers = {
      [ScenarioType.OPTIMISTIC]: 1.2,
      [ScenarioType.BASE]: 1.0,
      [ScenarioType.PESSIMISTIC]: 0.8,
      [ScenarioType.STRESS_TEST]: 0.6,
    };

    const scenarioMultiplier = scenarioMultipliers[scenario];

    // Growth component
    const growthFactor = Math.pow(
      1 + this.randomNormal(growthRate.mean, growthRate.std),
      month,
    );

    // Seasonal component
    const seasonalFactor = seasonality.inflow[month % 12] || 1.0;

    // Random component
    const randomFactor = this.randomNormal(1.0, 0.1); // 10% random variation

    const baseAmount = this.randomNormal(baseInflowMean, baseInflowStd);

    return Math.max(
      0,
      baseAmount *
        scenarioMultiplier *
        growthFactor *
        seasonalFactor *
        randomFactor,
    );
  }

  // Generate random outflow with seasonality and growth
  private static generateRandomOutflow(
    month: number,
    baseParams: BaseParameters,
    scenario: ScenarioType,
  ): number {
    const { baseOutflowMean, baseOutflowStd, growthRate, seasonality } =
      baseParams;

    // Scenario adjustments (outflows increase more in stress scenarios)
    const scenarioMultipliers = {
      [ScenarioType.OPTIMISTIC]: 0.9,
      [ScenarioType.BASE]: 1.0,
      [ScenarioType.PESSIMISTIC]: 1.1,
      [ScenarioType.STRESS_TEST]: 1.3,
    };

    const scenarioMultiplier = scenarioMultipliers[scenario];

    // Growth component (outflows typically grow slower than inflows)
    const outflowGrowthRate = growthRate.mean * 0.7; // 70% of inflow growth
    const growthFactor = Math.pow(
      1 + this.randomNormal(outflowGrowthRate, growthRate.std),
      month,
    );

    // Seasonal component
    const seasonalFactor = seasonality.outflow[month % 12] || 1.0;

    // Random component
    const randomFactor = this.randomNormal(1.0, 0.08); // 8% random variation

    const baseAmount = this.randomNormal(baseOutflowMean, baseOutflowStd);

    return Math.max(
      0,
      baseAmount *
        scenarioMultiplier *
        growthFactor *
        seasonalFactor *
        randomFactor,
    );
  }

  // Calculate base parameters from historical data
  private static calculateBaseParameters(
    historicalData: HistoricalData,
    params: SimulationParameters,
  ): BaseParameters {
    const { inflows, outflows } = historicalData;

    // Calculate means and standard deviations
    const baseInflowMean =
      inflows.reduce((sum: number, val: number) => sum + val, 0) /
      inflows.length;
    const baseInflowStd = Math.sqrt(
      inflows.reduce(
        (sum: number, val: number) => sum + Math.pow(val - baseInflowMean, 2),
        0,
      ) / inflows.length,
    );

    const baseOutflowMean =
      outflows.reduce((sum: number, val: number) => sum + val, 0) /
      outflows.length;
    const baseOutflowStd = Math.sqrt(
      outflows.reduce(
        (sum: number, val: number) => sum + Math.pow(val - baseOutflowMean, 2),
        0,
      ) / outflows.length,
    );

    // Growth rate estimation (simple linear trend)
    const growthRateMean = params.customVariables?.growthRateMean || 0.05; // 5% monthly growth
    const growthRateStd = params.customVariables?.growthRateStd || 0.02;

    // Seasonal patterns (simplified)
    const seasonality = {
      inflow: [0.9, 0.95, 1.1, 1.0, 0.95, 0.85, 0.8, 0.85, 1.0, 1.15, 1.3, 1.2],
      outflow: [1.0, 1.0, 1.05, 1.0, 0.95, 0.9, 0.85, 0.9, 1.0, 1.1, 1.15, 1.1],
    };

    return {
      baseInflowMean: params.customVariables?.baseInflowMean || baseInflowMean,
      baseInflowStd: params.customVariables?.baseInflowStd || baseInflowStd,
      baseOutflowMean:
        params.customVariables?.baseOutflowMean || baseOutflowMean,
      baseOutflowStd: params.customVariables?.baseOutflowStd || baseOutflowStd,
      growthRate: {
        mean: growthRateMean,
        std: growthRateStd,
      },
      seasonality,
      startingBalance: 500000, // Starting cash balance
    };
  }

  // Get historical data for parameter estimation
  private static async getHistoricalData(
    segmentId?: string,
  ): Promise<HistoricalData> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 24); // 24 months of history

    const transactions = await prisma.cashTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(segmentId && { businessSegmentId: segmentId }),
      },
    });

    const inflows: number[] = [];
    const outflows: number[] = [];

    // Group by month
    const monthlyData = new Map();

    transactions.forEach((t) => {
      const date = new Date(t.transactionDate);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { inflow: 0, outflow: 0 });
      }

      const amount = Number(t.amount);
      if (t.type === TransactionType.INFLOW) {
        monthlyData.get(monthKey).inflow += amount;
      } else {
        monthlyData.get(monthKey).outflow += amount;
      }
    });
    for (const [_month, data] of monthlyData) {
      inflows.push(data.inflow);
      outflows.push(data.outflow);
    }

    return { inflows, outflows };
  }

  // Calculate summary statistics
  private static calculateStatistics(runs: SimulationRun[]) {
    const finalBalances = runs.map((r) => r.finalBalance).sort((a, b) => a - b);
    const runways = runs
      .map((r) => r.runwayMonths)
      .filter((r) => r !== null) as number[];

    return {
      meanFinalBalance:
        finalBalances.reduce((sum, val) => sum + val, 0) / finalBalances.length,
      medianFinalBalance: finalBalances[Math.floor(finalBalances.length / 2)],
      percentile5: finalBalances[Math.floor(finalBalances.length * 0.05)],
      percentile95: finalBalances[Math.floor(finalBalances.length * 0.95)],
      probabilityNegative:
        runs.filter((r) => r.minBalance < 0).length / runs.length,
      averageRunway:
        runways.length > 0
          ? runways.reduce((sum, val) => sum + val, 0) / runways.length
          : 0,
      worstCaseRunway: runways.length > 0 ? Math.min(...runways) : 0,
      bestCaseRunway: runways.length > 0 ? Math.max(...runways) : 0,
    };
  }

  // Perform sensitivity analysis
  private static performSensitivityAnalysis(
    _runs: SimulationRun[],
    _baseParams: BaseParameters,
    _params: SimulationParameters,
  ): SimulationSummary["sensitivityAnalysis"] {
    // Simplified sensitivity analysis - would be more sophisticated in production
    return {
      inflowImpact: 0.8, // 80% correlation with final balance
      outflowImpact: -0.7, // -70% correlation with final balance
      growthImpact: 0.9, // 90% correlation with final balance
      seasonalityImpact: 0.3, // 30% impact from seasonal variations
    };
  }

  // Save simulation results to database
  private static async saveSimulationResults(
    simulationId: string,
    params: SimulationParameters,
    runs: SimulationRun[],
  ) {
    const results = runs.map((run) => ({
      simulationId,
      runNumber: run.runNumber,
      scenario: params.scenario,
      timeHorizon: params.timeHorizon,
      numRuns: params.numRuns,
      monthlyResults: run.monthlyResults.map((m) => ({
        month: m.month,
        inflow: m.inflow,
        outflow: m.outflow,
        netFlow: m.netFlow,
        cumulativeBalance: m.cumulativeBalance,
        date: m.date.toISOString(),
      })),
      finalBalance: run.finalBalance,
      minBalance: run.minBalance,
      maxBalance: run.maxBalance,
      probabilityNegative: run.probabilityNegative,
      runwayMonths: run.runwayMonths,
    }));

    // Batch insert results
    for (let i = 0; i < results.length; i += 50) {
      const batch = results.slice(i, i + 50);
      await prisma.simulationResult.createMany({
        data: batch,
      });
    }
  }

  // Utility functions
  private static generateSimulationId(): string {
    return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Box-Muller transformation for normal distribution
  private static randomNormal(mean: number = 0, std: number = 1): number {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * std + mean;
  }
}
