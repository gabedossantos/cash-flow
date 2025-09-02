import { Metadata } from "next";
import { CashFlowDashboard } from "@/components/dashboard/cash-flow-dashboard";

export const metadata: Metadata = {
  title: "Predictive Cash Flow Intelligence Dashboard",
  description:
    "Cash flow forecasting and risk management for high-growth startups",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Cash Flow Intelligence
              </h1>
              <p className="text-slate-600 mt-1">Forecasting and risk management dashboard</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Live Data
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <CashFlowDashboard />
      </div>
    </div>
  );
}
