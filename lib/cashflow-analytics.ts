import { prisma } from "./prisma";
// Removed TransactionType import as it does not exist in @prisma/client

export interface CashFlowSummary {
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  transactionCount: number;
  period: string;
}

export interface KPIMetrics {
  netCashFlow: number;
  burnRate: number;
  runwayMonths: number | null;
  workingCapitalRatio: number;
  growthRate: number;
  totalInflow: number;
  totalOutflow: number;
  cashBalance: number;
}

export interface SegmentPerformance {
  segmentId: string;
  segmentName: string;
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  growthRate: number;
  transactionCount: number;
}

export class CashFlowAnalytics {
  // Get cash flow summary for a date range
  static async getCashFlowSummary(
    startDate: Date,
    endDate: Date,
    segmentId?: string,
  ): Promise<CashFlowSummary> {
    const whereClause = {
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
      ...(segmentId && { businessSegmentId: segmentId }),
    };

  const transactions = await prisma.cashTransaction.findMany({
      where: whereClause,
      select: {
        amount: true,
        type: true,
      },
    });

    const inflows = transactions
  .filter((t: any) => t.type === "INFLOW")
  .reduce((sum: any, t: any) => sum + Number(t.amount), 0);

    const outflows = transactions
  .filter((t: any) => t.type === "OUTFLOW")
  .reduce((sum: any, t: any) => sum + Number(t.amount), 0);

    return {
      totalInflow: inflows,
      totalOutflow: outflows,
      netCashFlow: inflows - outflows,
      transactionCount: transactions.length,
      period: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
    };
  }

  // Get latest KPI metrics
  static async getLatestKPIs(segmentId?: string): Promise<KPIMetrics | null> {
  const kpi = await prisma.kPISnapshot.findFirst({
      where: segmentId
        ? { businessSegmentId: segmentId }
        : { businessSegmentId: null },
      orderBy: { snapshotDate: "desc" },
    });

    if (!kpi) return null;

    return {
      netCashFlow: Number(kpi.netCashFlow),
      burnRate: Number(kpi.burnRate),
      runwayMonths: kpi.runwayMonths,
      workingCapitalRatio: kpi.workingCapitalRatio || 0,
      growthRate: kpi.monthlyGrowthRate || 0,
      totalInflow: Number(kpi.totalInflow),
      totalOutflow: Number(kpi.totalOutflow),
      cashBalance: Number(kpi.cashBalance),
    };
  }

  // Get segment performance comparison
  static async getSegmentPerformance(
    startDate: Date,
    endDate: Date,
  ): Promise<SegmentPerformance[]> {
  const segments = await prisma.businessSegment.findMany({
      where: { isActive: true },
      include: {
        transactions: {
          where: {
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

  return segments.map((segment: any) => {
      const inflows = segment.transactions
  .filter((t: any) => t.type === "INFLOW")
  .reduce((sum: any, t: any) => sum + Number(t.amount), 0);

      const outflows = segment.transactions
  .filter((t: any) => t.type === "OUTFLOW")
  .reduce((sum: any, t: any) => sum + Number(t.amount), 0);

      // Calculate growth rate from KPI snapshots
      const growthRate = 0.06; // Placeholder - would calculate from historical data

      return {
        segmentId: segment.id,
        segmentName: segment.name,
        totalInflow: inflows,
        totalOutflow: outflows,
        netCashFlow: inflows - outflows,
        growthRate,
        transactionCount: segment.transactions.length,
      };
    });
  }

  // Get monthly cash flow trend
  static async getMonthlyCashFlowTrend(
    months: number = 12,
    segmentId?: string,
  ): Promise<
    Array<{
      month: string;
      inflow: number;
      outflow: number;
      netFlow: number;
      date: Date;
    }>
  > {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);

  const transactions = await prisma.cashTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(segmentId && { businessSegmentId: segmentId }),
      },
      select: {
        amount: true,
        type: true,
        transactionDate: true,
      },
    });

    // Group by month
    const monthlyData = new Map<
      string,
      {
        inflow: number;
        outflow: number;
        date: Date;
      }
    >();

  transactions.forEach((transaction: any) => {
      const date = new Date(transaction.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          inflow: 0,
          outflow: 0,
          date: new Date(date.getFullYear(), date.getMonth(), 1),
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      const amount = Number(transaction.amount);

  if (transaction.type === "INFLOW") {
        monthData.inflow += amount;
      } else {
        monthData.outflow += amount;
      }
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        inflow: data.inflow,
        outflow: data.outflow,
        netFlow: data.inflow - data.outflow,
        date: data.date,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Get aging analysis
  static async getAgingAnalysis(segmentId?: string) {
  const receivables = await prisma.cashTransaction.findMany({
      where: {
  type: "INFLOW",
        isPaid: false,
        ...(segmentId && { businessSegmentId: segmentId }),
      },
      select: {
        amount: true,
        agingDays: true,
        dueDate: true,
        businessSegment: {
          select: { name: true },
        },
      },
    });

    // Categorize by aging buckets
    const agingBuckets = {
      current: 0, // 0-30 days
      thirtyDays: 0, // 31-60 days
      sixtyDays: 0, // 61-90 days
      ninetyDays: 0, // 90+ days
    };

  receivables.forEach((r: any) => {
      const amount = Number(r.amount);
      const aging = r.agingDays || 0;

      if (aging <= 30) {
        agingBuckets.current += amount;
      } else if (aging <= 60) {
        agingBuckets.thirtyDays += amount;
      } else if (aging <= 90) {
        agingBuckets.sixtyDays += amount;
      } else {
        agingBuckets.ninetyDays += amount;
      }
    });

    return {
      buckets: agingBuckets,
      totalOutstanding: receivables.reduce(
        (sum: any, r: any) => sum + Number(r.amount),
        0,
      ),
      averageAgingDays:
        receivables.length > 0
          ? receivables.reduce(
              (sum: number, r: { agingDays?: number | null }) => sum + (typeof r.agingDays === 'number' ? r.agingDays : 0),
              0
            ) / receivables.length
          : 0,
    };
  }
}
