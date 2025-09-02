import { NextRequest, NextResponse } from "next/server";
import { MLForecasting } from "@/lib/ml-forecasting";
// Avoid importing Prisma enums during Vercel build; mirror enum strings locally
import { ScenarioType } from "./enums";
import { $Enums } from "@prisma/client";

import { ForecastModel } from "./enums";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const segmentId = searchParams.get("segmentId");
    const horizon = parseInt(searchParams.get("horizon") || "12");
    const modelType = (searchParams.get("model") ||
  "ENSEMBLE") as ForecastModel;
    const scenario = (searchParams.get("scenario") || "BASE") as ScenarioType;

    // Generate forecasts based on model type
    let forecasts;
    const params = {
  horizon,
  model: modelType,
  scenario,
  segmentId: segmentId || undefined,
    };

    switch (modelType) {
      case ForecastModel.PROPHET:
        forecasts = await MLForecasting.generateProphetForecast({ ...params, model: ForecastModel.PROPHET, scenario });
        break;
      case ForecastModel.ARIMA:
        forecasts = await MLForecasting.generateARIMAForecast({ ...params, model: ForecastModel.ARIMA, scenario });
        break;
      default:
        // For unsupported models, use ARIMA as fallback
  forecasts = await MLForecasting.generateARIMAForecast({ ...params, model: ForecastModel.ARIMA, scenario });
        break;
    }

    // Get stored forecasts for comparison
  const storedForecasts = await prisma.cashFlowForecast.findMany({
      where: {
        ...(segmentId && { businessSegmentId: segmentId }),
        scenario: scenario as $Enums.ScenarioType,
        forecastDate: {
          gte: new Date(),
          lte: new Date(Date.now() + horizon * 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { forecastDate: "asc" },
      take: horizon,
    });

    // Calculate forecast accuracy for historical predictions
    const accuracyMetrics = await calculateForecastAccuracy(
  segmentId || undefined,
  modelType,
  scenario,
    );

    return NextResponse.json({
      success: true,
      data: {
        forecasts: forecasts.map((f: { date: Date }) => ({
          ...f,
          date: f.date.toISOString(),
        })),
        storedForecasts: storedForecasts.map((f: any) => ({
          id: f.id,
          date: f.forecastDate.toISOString(),
          predicted: Number(f.predictedAmount),
          actual: f.actualAmount ? Number(f.actualAmount) : null,
          confidence: f.confidence,
          lowerBound: Number(f.lowerBound),
          upperBound: Number(f.upperBound),
          model: f.modelType as ForecastModel,
          // scenario field removed from model
        })),
        accuracy: accuracyMetrics,
        parameters: {
          segmentId,
          horizon,
          model: modelType,
          scenario,
        },
      },
    });
  } catch (error) {
    console.error("Error generating forecasts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate forecasts" },
      { status: 500 },
    );
  }
}

async function calculateForecastAccuracy(
  segmentId?: string,
  model?: ForecastModel,
  scenario?: ScenarioType,
  ) {
    // Get historical forecasts with actual values
  const historicalForecasts = await prisma.cashFlowForecast.findMany({
      where: {
        ...(segmentId && { businessSegmentId: segmentId }),
        ...(model && { modelType: model }),
    ...(scenario && { scenario: scenario as $Enums.ScenarioType }),
        actualAmount: { not: null },
        forecastDate: {
          lte: new Date(),
        },
      },
      take: 50, // Last 50 predictions with actuals
    });

  if (historicalForecasts.length === 0) {
    return {
      mape: null,
      accuracy: null,
      sampleSize: 0,
    };
  }

  // Calculate MAPE (Mean Absolute Percentage Error)
  const errors = historicalForecasts.map((f: { actualAmount: unknown; predictedAmount: unknown }) => {
    const actual = Number(f.actualAmount);
    const predicted = Number(f.predictedAmount);
    return actual !== 0 ? Math.abs((actual - predicted) / actual) : 0;
  });

  const mape =
    errors.reduce((sum: number, error: number) => sum + error, 0) /
    errors.length;
  const accuracy = Math.max(0, 1 - mape) * 100;

  return {
    mape: mape * 100,
    accuracy,
    sampleSize: historicalForecasts.length,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      segmentId,
      horizon = 12,
      model = "ENSEMBLE",
      scenario = "BASE",
    } = body as {
      segmentId?: string;
      horizon?: number;
  model?: ForecastModel;
      scenario?: ScenarioType;
    };

    // Generate and save forecasts
    const params = {
      horizon,
  model: model as ForecastModel,
      scenario: scenario as ScenarioType,
      segmentId,
    };
    let forecasts;

    switch (model) {
  case ForecastModel.PROPHET:
  forecasts = await MLForecasting.generateProphetForecast({ ...params, model: ForecastModel.PROPHET, scenario: scenario as ScenarioType });
  break;
  case ForecastModel.ARIMA:
  forecasts = await MLForecasting.generateARIMAForecast({ ...params, model: ForecastModel.ARIMA, scenario: scenario as ScenarioType });
  break;
  default:
  // For unsupported models, use ARIMA as fallback
  forecasts = await MLForecasting.generateARIMAForecast({ ...params, model: ForecastModel.ARIMA, scenario: scenario as ScenarioType });
  break;
    }

    // Save to database
    const savedForecasts = await Promise.all(
  (forecasts as Array<{ date: Date; predicted: number; confidence: number; lowerBound: number; upperBound: number; model: ForecastModel }> ).map((forecast) =>
    prisma.cashFlowForecast.create({
          data: {
            forecastDate: forecast.date,
            predictedAmount: forecast.predicted,
            confidence: forecast.confidence,
            lowerBound: forecast.lowerBound,
            upperBound: forecast.upperBound,
            modelType: forecast.model as ForecastModel,
      scenario: scenario as $Enums.ScenarioType,
            businessSegmentId: segmentId || null,
            // forecastData: {}, // Removed invalid property
            // scenarioType: scenario as ScenarioType, // Removed invalid property
          },
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      data: {
        message: `Generated and saved ${savedForecasts.length} forecasts`,
  forecasts: (savedForecasts as Array<any>).map((f) => ({
          id: f.id,
          date: f.forecastDate.toISOString(),
          predicted: Number(f.predictedAmount),
          confidence: f.confidence,
          model: f.modelType as ForecastModel,
          scenario: f.scenario as ScenarioType,
        })),
      },
    });
  } catch (error) {
    console.error("Error saving forecasts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save forecasts" },
      { status: 500 },
    );
  }
}
