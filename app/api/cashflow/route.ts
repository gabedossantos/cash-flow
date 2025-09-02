import { NextRequest, NextResponse } from "next/server";
import { CashFlowAnalytics } from "@/lib/cashflow-analytics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const segmentId = searchParams.get("segmentId");
    const months = parseInt(searchParams.get("months") || "12");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Default date range (last 12 months)
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getTime() - months * 30 * 24 * 60 * 60 * 1000);

    // Get cash flow summary
    const summary = await CashFlowAnalytics.getCashFlowSummary(
      startDate,
      endDate,
      segmentId || undefined,
    );

    // Get monthly trend
    const monthlyTrend = await CashFlowAnalytics.getMonthlyCashFlowTrend(
      months,
      segmentId || undefined,
    );

    // Get segment performance if no specific segment requested
    let segmentPerformance: import("@/lib/cashflow-analytics").SegmentPerformance[] =
      [];
    if (!segmentId) {
      segmentPerformance = await CashFlowAnalytics.getSegmentPerformance(
        startDate,
        endDate,
      );
    }

    // Get aging analysis
    const agingAnalysis = await CashFlowAnalytics.getAgingAnalysis(
      segmentId || undefined,
    );

    return NextResponse.json({
      success: true,
      data: {
        summary,
        monthlyTrend,
        segmentPerformance,
        agingAnalysis,
        filters: {
          segmentId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          months,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching cash flow data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cash flow data" },
      { status: 500 },
    );
  }
}
