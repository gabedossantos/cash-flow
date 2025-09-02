import { NextRequest, NextResponse } from "next/server";
import { MonteCarloEngine, SimulationParameters } from "@/lib/monte-carlo";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const params: SimulationParameters = {
      numRuns: body.numRuns || 500,
      timeHorizon: body.timeHorizon || 12,
  scenario: body.scenario || "BASE",
      segmentId: body.segmentId,
      customVariables: body.customVariables || {},
    };

    // Validate parameters
    if (params.numRuns < 100 || params.numRuns > 2000) {
      return NextResponse.json(
        {
          success: false,
          error: "Number of runs must be between 100 and 2000",
        },
        { status: 400 },
      );
    }

    if (params.timeHorizon < 1 || params.timeHorizon > 36) {
      return NextResponse.json(
        {
          success: false,
          error: "Time horizon must be between 1 and 36 months",
        },
        { status: 400 },
      );
    }

    console.log("Starting Monte Carlo simulation with parameters:", params);

    // Run the simulation
    const simulationResults = await MonteCarloEngine.runSimulation(params);

    // Return summarized results (full results are saved to database)
    return NextResponse.json({
      success: true,
      data: {
        simulationId: simulationResults.simulationId,
        parameters: simulationResults.parameters,
        statistics: simulationResults.statistics,
        sensitivityAnalysis: simulationResults.sensitivityAnalysis,
        sampleRuns: simulationResults.runs.slice(0, 10), // First 10 runs for visualization
        totalRuns: simulationResults.runs.length,
      },
    });
  } catch (error) {
    console.error("Error running Monte Carlo simulation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run Monte Carlo simulation" },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const simulationId = searchParams.get("simulationId");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (simulationId) {
      // Get specific simulation results
      const results = await prisma.simulationResult.findMany({
        where: { simulationId },
        take: limit,
        orderBy: { runNumber: "asc" },
      });

      return NextResponse.json({
        success: true,
        data: {
          simulationId,
          runs: results.map((r: any) => ({
            runNumber: r.runNumber,
            scenario: r.scenario,
            timeHorizon: r.timeHorizon,
            monthlyResults: r.monthlyResults,
            finalBalance: Number(r.finalBalance),
            minBalance: Number(r.minBalance),
            maxBalance: Number(r.maxBalance),
            probabilityNegative: r.probabilityNegative,
            runwayMonths: r.runwayMonths,
            createdAt: r.createdAt.toISOString(),
          })),
        },
      });
    } else {
      const recentSimulations = await prisma.simulationResult.findMany({
        select: {
          simulationId: true,
          scenario: true,
          timeHorizon: true,
          numRuns: true,
          createdAt: true,
          finalBalance: true,
          minBalance: true,
          probabilityNegative: true,
        },
        distinct: ["simulationId"],
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      // Group by simulation ID and calculate statistics
      interface RunSummary {
        finalBalance: number;
        minBalance: number;
        probabilityNegative: number;
      }
      interface SimulationAggregate {
  simulationId: string;
  scenario: string;
  timeHorizon: number;
  numRuns: number;
  createdAt: string;
  runs: RunSummary[];
      }
      const simulationAggregates = recentSimulations.reduce<
        Record<string, SimulationAggregate>
  >((acc: Record<string, SimulationAggregate>, sim: any) => {
        if (!acc[sim.simulationId]) {
          acc[sim.simulationId] = {
            simulationId: sim.simulationId,
            scenario: sim.scenario,
            timeHorizon: sim.timeHorizon,
            numRuns: sim.numRuns,
            createdAt: sim.createdAt.toISOString(),
            runs: [],
          };
        }
        acc[sim.simulationId].runs.push({
          finalBalance: Number(sim.finalBalance),
          minBalance: Number(sim.minBalance),
          probabilityNegative: sim.probabilityNegative,
        });
        return acc;
      }, {});
      const simulationSummaries = Object.values(simulationAggregates).map(
  (sim: any) => ({
          ...sim,
          avgFinalBalance:
            (sim.runs as any[]).reduce((sum: number, run: any) => sum + run.finalBalance, 0) /
            (sim.runs as any[]).length,
          avgProbabilityNegative:
            (sim.runs as any[]).reduce((sum: number, run: any) => sum + run.probabilityNegative, 0) /
            (sim.runs as any[]).length,
        }),
      );

      return NextResponse.json({
        success: true,
        data: {
          recentSimulations: simulationSummaries,
          totalSimulations: recentSimulations.length,
        },
      });
    }
  } catch (error) {
    console.error("Error fetching simulation results:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch simulation results" },
      { status: 500 },
    );
  }
}
