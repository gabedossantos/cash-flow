import { prisma } from "./prisma";
import { TransactionType } from "@prisma/client";
import { ForecastModel, ScenarioType } from "@/app/api/forecasts/enums";

export interface ForecastResult {
  date: Date;
  predicted: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
  model: ForecastModel;
  scenario: ScenarioType;
}

export interface ForecastParameters {
  horizon: number; // months
  model: ForecastModel;
  scenario: ScenarioType;
  segmentId?: string;
}

// Simple regression-based forecasting (placeholder for actual ML models)
export class MLForecasting {
  // Generate cash flow forecasts using simple regression
  static async generateRegressionForecast(
    params: ForecastParameters,
  ): Promise<ForecastResult[]> {
    const { horizon, segmentId, scenario } = params;

    // Get historical data for trend analysis
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
      orderBy: { transactionDate: "asc" },
    });

    // Group by month and calculate net flow
    const monthlyData = this.groupTransactionsByMonth(transactions);

    // Calculate trend using linear regression
    const trend = this.calculateLinearTrend(monthlyData);

    // Generate forecasts
    const forecasts: ForecastResult[] = [];
    const scenarioMultipliers: Record<ScenarioType, number> = {
      [ScenarioType.OPTIMISTIC]: 1.15,
      [ScenarioType.BASE]: 1.0,
      [ScenarioType.PESSIMISTIC]: 0.85,
      [ScenarioType.STRESS_TEST]: 0.7,
    };

    const multiplier = scenarioMultipliers[scenario as ScenarioType] ?? 1.0;

    for (let i = 1; i <= horizon; i++) {
      const forecastDate = new Date(
        endDate.getFullYear(),
        endDate.getMonth() + i,
        1,
      );

      // Base prediction using trend
      const basePrediction =
        trend.slope * (monthlyData.length + i) + trend.intercept;
      const predicted = basePrediction * multiplier;

      // Add seasonality (simplified)
      const seasonalFactor = this.getSeasonalFactor(forecastDate.getMonth());
      const seasonalPredicted = predicted * seasonalFactor;

      // Calculate confidence bounds
      const variance = this.calculateVariance(monthlyData);
      const confidence = Math.max(0.6, 1.0 - i * 0.05); // Decreasing confidence over time
      const bounds = Math.sqrt(variance) * 1.96 * confidence;

      forecasts.push({
        date: forecastDate,
        predicted: Math.round(seasonalPredicted),
        confidence,
        lowerBound: Math.round(seasonalPredicted - bounds),
        upperBound: Math.round(seasonalPredicted + bounds),
        model: ForecastModel.REGRESSION,
        scenario,
      });
    }

    return forecasts;
  }

  // ARIMA-style forecasting (simplified implementation)
  static async generateARIMAForecast(
    params: ForecastParameters,
  ): Promise<ForecastResult[]> {
    // This would implement actual ARIMA in production
    // For now, using regression with AR component
    const regressionResults = await this.generateRegressionForecast({
      ...params,
      model: ForecastModel.ARIMA,
    });

    // Add autoregressive component
    return regressionResults.map((result, i) => ({
      ...result,
      predicted: result.predicted * (1 + 0.1 * Math.sin(i / 3)), // Simple AR effect
      model: ForecastModel.ARIMA,
    }));
  }

  // Prophet-style forecasting (simplified implementation)
  static async generateProphetForecast(
    params: ForecastParameters,
  ): Promise<ForecastResult[]> {
    const baseForecasts = await this.generateRegressionForecast({
      ...params,
      model: ForecastModel.PROPHET,
    });

    // Add enhanced seasonality and trend components
    return baseForecasts.map((result, i) => {
      // Add weekly/monthly patterns
      const weeklyPattern = 0.05 * Math.sin((i * 2 * Math.PI) / 4);
      const monthlyPattern = this.getSeasonalFactor(result.date.getMonth()) - 1;

      const enhancedPrediction =
        result.predicted * (1 + weeklyPattern + monthlyPattern * 0.2);

      return {
        ...result,
        predicted: Math.round(enhancedPrediction),
        model: ForecastModel.PROPHET,
        confidence: Math.min(result.confidence * 1.1, 0.95), // Prophet typically more confident
      };
    });
  }

  // Ensemble forecasting combining multiple models
  static async generateEnsembleForecast(
    params: ForecastParameters,
  ): Promise<ForecastResult[]> {
    const [regression, arima, prophet] = await Promise.all([
      this.generateRegressionForecast({
        ...params,
        model: ForecastModel.REGRESSION,
      }),
      this.generateARIMAForecast({ ...params, model: ForecastModel.ARIMA }),
      this.generateProphetForecast({ ...params, model: ForecastModel.PROPHET }),
    ]);

    // Combine forecasts with weights
    const weights = { regression: 0.3, arima: 0.3, prophet: 0.4 };

    return regression.map((_, i) => {
      const combined =
        regression[i].predicted * weights.regression +
        arima[i].predicted * weights.arima +
        prophet[i].predicted * weights.prophet;

      const avgConfidence =
        (regression[i].confidence +
          arima[i].confidence +
          prophet[i].confidence) /
        3;

      // Calculate ensemble bounds
      const predictions = [
        regression[i].predicted,
        arima[i].predicted,
        prophet[i].predicted,
      ];
      const variance =
        predictions.reduce((sum, p) => sum + Math.pow(p - combined, 2), 0) / 3;
      const bounds = Math.sqrt(variance) * 1.5;

      return {
        date: regression[i].date,
        predicted: Math.round(combined),
        confidence: avgConfidence,
        lowerBound: Math.round(combined - bounds),
        upperBound: Math.round(combined + bounds),
        model: ForecastModel.ENSEMBLE,
        scenario: params.scenario,
      };
    });
  }

  // Helper methods
  private static groupTransactionsByMonth(
    transactions: Array<{
      transactionDate: Date | string;
      amount: number | string | bigint | { toString(): string };
      type: TransactionType;
    }>,
  ): number[] {
    const monthlyNetFlow = new Map<string, number>();

    transactions.forEach((t) => {
      const date = new Date(t.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyNetFlow.has(monthKey)) {
        monthlyNetFlow.set(monthKey, 0);
      }

      const amount = Number(t.amount);
      if (t.type === TransactionType.INFLOW) {
        monthlyNetFlow.set(monthKey, monthlyNetFlow.get(monthKey)! + amount);
      } else {
        monthlyNetFlow.set(monthKey, monthlyNetFlow.get(monthKey)! - amount);
      }
    });

    return Array.from(monthlyNetFlow.values());
  }

  private static calculateLinearTrend(data: number[]): {
    slope: number;
    intercept: number;
  } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: data[0] || 0 };

    const sumX = (n * (n + 1)) / 2;
    const sumY = data.reduce((sum, y) => sum + y, 0);
    const sumXY = data.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumXX = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private static calculateVariance(data: number[]): number {
    if (data.length < 2) return 0;

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      (data.length - 1);

    return variance;
  }

  private static getSeasonalFactor(month: number): number {
    // Simplified seasonal pattern (0-indexed months)
    const seasonalFactors = [
      0.9, 0.95, 1.1, 1.0, 0.95, 0.85, 0.8, 0.85, 1.0, 1.15, 1.3, 1.2,
    ];
    return seasonalFactors[month] || 1.0;
  }
}
