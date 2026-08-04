"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { 
  TrendingUp, 
  ArrowRightLeft, 
  Wallet, 
  CreditCard, 
  DollarSign, 
  Activity,
  LineChart
} from "lucide-react";

import { getDashboardSummary, DashboardSummaryResponse } from "@/lib/api/dashboard";
import { DailyProfitChart } from "@/components/charts/DailyProfitChart";
import { WalletUsageChart } from "@/components/charts/WalletUsageChart";
import { CurrencyExchangeChart } from "@/components/charts/CurrencyExchangeChart";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly">("daily");

  useEffect(() => {
    if (user?.role.name === "staff") {
      router.push("/dashboard/wallet-transactions");
      return;
    }
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const data = await getDashboardSummary(period);
        setSummary(data);
      } catch (error) {
        console.error("Failed to fetch dashboard summary:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSummary();
  }, [user, router, period]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!summary) {
    return <div>Failed to load dashboard.</div>;
  }

  const { cards, charts, recent_transactions } = summary;

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        
        <div className="flex items-center space-x-2 bg-gray-100/80 p-1 rounded-lg">
          <button
            onClick={() => setPeriod("daily")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              period === "daily" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              period === "monthly" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriod("yearly")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              period === "yearly" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Metric Cards Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        <div className="rounded-xl border bg-card text-card-foreground shadow border-green-200">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">THB Exchange Profit</h3>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {new Intl.NumberFormat("en-US").format(cards.period_exchange_profit)} K
            </div>
            <p className="text-xs text-muted-foreground">From selling THB ({period})</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow border-teal-200">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Transactions Profit</h3>
            <Activity className="h-4 w-4 text-teal-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-teal-600 mb-1">
              {new Intl.NumberFormat("en-US").format(cards.period_transaction_profit)} K
            </div>
            <p className="text-xs text-muted-foreground">From wallet transactions ({period})</p>
          </div>
        </div>
        
        <div className="rounded-xl border bg-card text-card-foreground shadow border-blue-200">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Period Transactions</h3>
            <ArrowRightLeft className="h-4 w-4 text-blue-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-blue-600">
              {cards.period_transactions_count}
            </div>
            <p className="text-xs text-muted-foreground">Total system activities ({period})</p>
          </div>
        </div>
        
        <div className="rounded-xl border bg-card text-card-foreground shadow border-purple-200">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">THB Inventory</h3>
            <Wallet className="h-4 w-4 text-purple-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-purple-600">
              {new Intl.NumberFormat("en-US").format(cards.thb_inventory)} THB
            </div>
            <p className="text-xs text-muted-foreground">Total Thai Baht available</p>
          </div>
        </div>
        

      </div>

      {/* Metric Cards Row 2 (Rates) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <div className="rounded-xl border bg-gray-50 text-card-foreground">
          <div className="p-4 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-gray-500" />
              <h3 className="tracking-tight text-sm font-medium">Active Buy Rate</h3>
            </div>
            <div className="text-xl font-bold text-gray-900">{cards.active_buy_rate} K</div>
          </div>
        </div>
        <div className="rounded-xl border bg-gray-50 text-card-foreground">
          <div className="p-4 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center space-x-2">
              <LineChart className="h-5 w-5 text-gray-500" />
              <h3 className="tracking-tight text-sm font-medium">Active Sell Rate</h3>
            </div>
            <div className="text-xl font-bold text-gray-900">{cards.active_sell_rate} K</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">Daily Profit Trend</h3>
            <p className="text-sm text-muted-foreground">Profit over the last 7 days.</p>
          </div>
          <div className="p-6 pt-0">
            <DailyProfitChart data={charts.daily_profit} />
          </div>
        </div>
        
        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">Wallet Usage Distribution</h3>
            <p className="text-sm text-muted-foreground">Transaction volume by wallet type.</p>
          </div>
          <div className="p-6 pt-0">
            <WalletUsageChart data={charts.wallet_usage} />
          </div>
        </div>

      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">Currency Exchange Volume</h3>
            <p className="text-sm text-muted-foreground">THB Bought vs Sold over 7 days.</p>
          </div>
          <div className="p-6 pt-0">
            <CurrencyExchangeChart data={charts.currency_exchange} />
          </div>
        </div>

        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">Recent Unified Ledger</h3>
            <p className="text-sm text-muted-foreground">Latest 5 global transactions.</p>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-8">
              {recent_transactions.map((tx) => (
                <div key={tx.id} className="flex items-center">
                  <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100 items-center justify-center">
                    <Activity className="h-4 w-4 text-gray-500" />
                  </span>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    {new Intl.NumberFormat("en-US").format(tx.amount)}
                  </div>
                </div>
              ))}
              {recent_transactions.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">No recent activity</div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
