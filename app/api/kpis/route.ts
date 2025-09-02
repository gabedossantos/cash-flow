import { NextRequest, NextResponse } from "next/server";
import { CashFlowAnalytics } from "@/lib/cashflow-analytics";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const segmentId = searchParams.get("segmentId");

    // Get latest KPIs
    const kpis = await CashFlowAnalytics.getLatestKPIs(segmentId || undefined);

    if (!kpis) {
      return NextResponse.json(
        { success: false, error: "No KPI data found" },
        { status: 404 },
      );
    }

    // Get historical KPI snapshots for trending
    const historicalKPIs = await prisma.kPISnapshot.findMany({
      where: segmentId
        ? { businessSegmentId: segmentId }
        : { businessSegmentId: null },
      orderBy: { snapshotDate: "desc" },
      take: 12, // Last 12 months
    });

    // Calculate KPI trends
    const kpiTrends = historicalKPIs.reverse().map((kpi: {
      id: string;
      createdAt: Date;
      businessSegmentId: string | null;
      runwayMonths: number | null;
      snapshotDate: Date;
      netCashFlow: unknown;
      burnRate: unknown;
      workingCapitalRatio: number | null;
      totalInflow: unknown;
      totalOutflow: unknown;
      cashBalance: unknown;
      monthlyGrowthRate: number | null;
    }) => ({
      date: kpi.snapshotDate,
      netCashFlow: Number(kpi.netCashFlow),
      burnRate: Number(kpi.burnRate),
      runwayMonths: kpi.runwayMonths ?? 0,
      workingCapitalRatio: kpi.workingCapitalRatio ?? 0,
      totalInflow: Number(kpi.totalInflow),
      totalOutflow: Number(kpi.totalOutflow),
      cashBalance: Number(kpi.cashBalance),
      monthlyGrowthRate: kpi.monthlyGrowthRate ?? 0,
    }));

    // Calculate month-over-month changes
    const previousKPI = historicalKPIs[historicalKPIs.length - 2];
    const changes = previousKPI
      ? {
          netCashFlowChange:
            ((Number(historicalKPIs[historicalKPIs.length - 1]?.netCashFlow) -
              Number(previousKPI.netCashFlow)) /
              Number(previousKPI.netCashFlow)) *
            100,
          burnRateChange:
            ((Number(historicalKPIs[historicalKPIs.length - 1]?.burnRate) -
              Number(previousKPI.burnRate)) /
              Number(previousKPI.burnRate)) *
            100,
          inflowChange:
            ((Number(historicalKPIs[historicalKPIs.length - 1]?.totalInflow) -
              Number(previousKPI.totalInflow)) /
              Number(previousKPI.totalInflow)) *
            100,
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        current: kpis,
        trends: kpiTrends,
        changes,
        filters: {
          segmentId,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching KPI data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch KPI data" },
      { status: 500 },
    );
  }
}
