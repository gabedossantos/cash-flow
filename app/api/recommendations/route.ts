import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// RecommendationType, RecommendationPriority, RecommendationStatus are not exported from @prisma/client
// Use string types instead

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category") as string;
  const priority = searchParams.get("priority") as string;
  const status = searchParams.get("status") as string;
    const limit = parseInt(searchParams.get("limit") || "20");

  const recommendations = await prisma.businessRecommendation.findMany({
      where: {
  ...(category && { category: category as any }),
  ...(priority && { priority: priority as any }),
  ...(status && { status: status as any }),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    // Get recommendation statistics
  const stats = await prisma.businessRecommendation.groupBy({
      by: ["category", "priority", "status"],
      _count: { category: true },
      _sum: { estimatedImpact: true },
    });

    // Calculate potential impact by category
    const impactByCategory = stats.reduce(
  (acc: any, stat: any) => {
        const impact = Number(stat._sum.estimatedImpact) || 0;
        if (!acc[stat.category]) {
          acc[stat.category] = { count: 0, totalImpact: 0 };
        }
        acc[stat.category].count += stat._count.category;
        acc[stat.category].totalImpact += impact;
        return acc;
      },
      {} as Record<string, { count: number; totalImpact: number }>,
    );

    return NextResponse.json({
      success: true,
      data: {
  recommendations: recommendations.map((rec: any) => ({
          id: rec.id,
          category: rec.category,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          estimatedImpact: rec.estimatedImpact
            ? Number(rec.estimatedImpact)
            : null,
          implementationCost: rec.implementationCost
            ? Number(rec.implementationCost)
            : null,
          timeToImplement: rec.timeToImplement,
          status: rec.status,
          confidence: rec.confidence,
          createdAt: rec.createdAt.toISOString(),
          implementedAt: rec.implementedAt?.toISOString() || null,
          basedOnData: rec.basedOnData,
        })),
        analytics: {
          totalRecommendations: recommendations.length,
          impactByCategory,
          priorityDistribution: stats.reduce(
            (acc: any, stat: any) => {
              if (!acc[stat.priority]) acc[stat.priority] = 0;
              acc[stat.priority] += stat._count.category;
              return acc;
            },
            {} as Record<string, number>,
          ),
          statusDistribution: stats.reduce(
            (acc: any, stat: any) => {
              if (!acc[stat.status]) acc[stat.status] = 0;
              acc[stat.status] += stat._count.category;
              return acc;
            },
            {} as Record<string, number>,
          ),
        },
        filters: {
          category,
          priority,
          status,
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recommendations" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { recommendationId, status } = body;

  const updatedRecommendation = await prisma.businessRecommendation.update({
      where: { id: recommendationId },
      data: {
        status,
        implementedAt:
          status === "IMPLEMENTED" ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Recommendation status updated to ${status}`,
        recommendation: {
          id: updatedRecommendation.id,
          status: updatedRecommendation.status,
          implementedAt:
            updatedRecommendation.implementedAt?.toISOString() || null,
        },
      },
    });
  } catch (error) {
    console.error("Error updating recommendation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update recommendation" },
      { status: 500 },
    );
  }
}
