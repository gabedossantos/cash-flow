import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    const [segmentCount, txCount, kpiCount, forecastCount] = await Promise.all([
      prisma.businessSegment.count(),
      prisma.cashTransaction.count(),
      prisma.kPISnapshot.count(),
      prisma.cashFlowForecast.count(),
    ]);

    const latencyMs = Date.now() - started;
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      latencyMs,
      data: {
        segmentCount,
        transactionCount: txCount,
        kpiCount,
        forecastCount,
      },
    });
  } catch (error) {
    const latencyMs = Date.now() - started;
    console.error("Health check failed", error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        latencyMs,
        error: "Database check failed",
      },
      { status: 500 },
    );
  }
}
