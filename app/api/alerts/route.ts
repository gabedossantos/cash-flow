import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Avoid importing Prisma $Enums which may not be available during build on Vercel
type AlertSeverity = "low" | "medium" | "high" | "critical";
type AlertType = string;
const isAlertSeverity = (val: unknown): val is AlertSeverity =>
  typeof val === "string" && ["low", "medium", "high", "critical"].includes(val);

// Map Prisma enum values to local AlertSeverity
const prismaSeverityToLocal = (sev: string): AlertSeverity => {
  switch (sev) {
    case "LOW": return "low";
    case "MEDIUM": return "medium";
    case "HIGH": return "high";
    case "CRITICAL": return "critical";
    default: throw new Error(`Unknown severity: ${sev}`);
  }
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const severityParam = searchParams.get("severity");
    const severity: AlertSeverity | undefined = isAlertSeverity(severityParam)
      ? severityParam
      : undefined;
    const isResolved = searchParams.get("resolved") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    const [alerts, alertCounts, alertTrends] = await Promise.all([
      prisma.riskAlert.findMany({
        where: {
          ...(severity ? { severity: { equals: severity as any } } : {}),
          isResolved,
        },
        orderBy: [{ severity: "desc" }, { triggeredAt: "desc" }],
        take: Math.min(limit, 200),
      }),
      prisma.riskAlert.groupBy({
        by: ["severity"],
        where: { isResolved: false },
        _count: { severity: true },
      }),
      (() => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return prisma.riskAlert.findMany({
          where: { triggeredAt: { gte: thirtyDaysAgo } },
          select: { triggeredAt: true, alertType: true, severity: true },
          orderBy: { triggeredAt: "asc" },
        });
      })(),
    ]);

    const countsBySeverity = alertCounts.reduce<Record<string, number>>(
      (
        acc: Record<string, number>,
        item: { severity: string; _count: { severity: number } },
      ) => {
        acc[prismaSeverityToLocal(item.severity)] = item._count.severity;
        return acc;
      },
      {},
    );

    // Group by day
    const dailyAlerts = alertTrends.reduce<
      Record<
        string,
        { date: string; count: number; critical: number; high: number }
      >
    >(
      (
        acc: Record<
          string,
          { date: string; count: number; critical: number; high: number }
        >,
        alert: {
          triggeredAt: Date;
          alertType: AlertType;
          severity: string;
        },
      ) => {
        const day = alert.triggeredAt.toISOString().split("T")[0];
        if (!acc[day]) {
          acc[day] = { date: day, count: 0, critical: 0, high: 0 };
        }
        acc[day].count++;
        if (prismaSeverityToLocal(alert.severity) === "critical") {
          acc[day].critical++;
        } else if (prismaSeverityToLocal(alert.severity) === "high") {
          acc[day].high++;
        }
        return acc;
      },
      {},
    );

    return NextResponse.json({
      success: true,
      data: {
  alerts: alerts.map((alert: (typeof alerts)[number]) => ({
          id: alert.id,
          type: alert.alertType,
          severity: alert.severity.toUpperCase(),
          title: alert.title,
          description: alert.description ?? "",
          triggeredAt: alert.triggeredAt.toISOString(),
          resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
          isResolved: alert.isResolved,
          recommendations: Array.isArray(alert.recommendations)
            ? alert.recommendations
            : alert.recommendations
            ? [alert.recommendations]
            : [],
          affectedAmount:
            typeof alert.affectedAmount === "number"
              ? alert.affectedAmount
              : alert.affectedAmount
              ? Number(alert.affectedAmount)
              : null,
          businessSegmentId: alert.businessSegmentId ?? null,
          triggeredBy: alert.triggeredBy ?? {},
        })),
        summary: {
          total: alerts.length,
          countsBySeverity,
          trends: Object.values(dailyAlerts),
        },
        filters: {
          severity,
          isResolved,
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch alerts" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, isResolved } = body;

    const updatedAlert = await prisma.riskAlert.update({
      where: { id: alertId },
      data: {
        isResolved,
        ...(isResolved ? { resolvedAt: new Date() } : { resolvedAt: null }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Alert ${isResolved ? "resolved" : "reopened"} successfully`,
        alert: {
          id: updatedAlert.id,
          isResolved: updatedAlert.isResolved,
          resolvedAt: updatedAlert.resolvedAt?.toISOString() || null,
        },
      },
    });
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update alert" },
      { status: 500 },
    );
  }
}
