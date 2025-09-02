import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const segments = await prisma.businessSegment.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            transactions: true,
            forecasts: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
  segments: segments.map((segment: any) => ({
          id: segment.id,
          name: segment.name,
          description: segment.description,
          isActive: segment.isActive,
          transactionCount: segment._count.transactions,
          forecastCount: segment._count.forecasts,
          createdAt: segment.createdAt.toISOString(),
          updatedAt: segment.updatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching business segments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch business segments" },
      { status: 500 },
    );
  }
}
