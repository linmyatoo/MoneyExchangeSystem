"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/i18n/LanguageContext";
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
  const { t } = useLanguage();
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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!summary) {
    return <div className="p-4 text-gray-500">{t('common.error')}</div>;
  }

  const { cards, charts, recent_transactions } = summary;

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h2>
        
        <div className="flex items-center space-x-2 bg-gray-100/80 p-1 rounded-lg">
          <button
            onClick={() => setPeriod("daily")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              period === "daily" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {t('dashboard.daily')}
          </button>
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              period === "monthly" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {t('dashboard.monthly')}
          </button>
          <button
            onClick={() => setPeriod("yearly")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              period === "yearly" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {t('dashboard.yearly')}
          </button>
        </div>
      </div>

      {/* Metric Cards Row 1 */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">{t('dashboard.mmk_inventory')}</h3>
            <Wallet className="h-4 w-4 text-amber-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {new Intl.NumberFormat("en-US").format(cards.mmk_inventory)} MMK
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">{t('dashboard.thb_inventory')}</h3>
            <Wallet className="h-4 w-4 text-violet-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
              {new Intl.NumberFormat("en-US").format(cards.thb_inventory)} THB
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">{t('dashboard.transactions_profit')}</h3>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              {new Intl.NumberFormat("en-US").format(cards.period_transaction_profit)} K
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">{t('dashboard.exchange_profit')}</h3>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              {new Intl.NumberFormat("en-US").format(cards.period_exchange_profit)} K
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-card to-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">{t('dashboard.total_outstanding')}</h3>
            <CreditCard className="h-4 w-4 text-rose-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mb-1">
              {new Intl.NumberFormat("en-US").format(cards.outstanding_credit)} K
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">{t('dashboard.period_transactions')}</h3>
            <ArrowRightLeft className="h-4 w-4 text-primary" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat("en-US").format(cards.period_transactions_count)}
            </div>
          </div>
        </div>

      </div>

      {/* Metric Cards Row 2 (Rates) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <div className="rounded-xl border bg-muted/40 text-card-foreground p-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <h3 className="tracking-tight text-sm font-medium">{t('dashboard.active_buy_rate')}</h3>
          </div>
          <div className="text-xl font-bold text-foreground">
            {new Intl.NumberFormat("en-US").format(cards.active_buy_rate)} K
          </div>
        </div>
        <div className="rounded-xl border bg-muted/40 text-card-foreground p-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-2">
            <LineChart className="h-5 w-5 text-muted-foreground" />
            <h3 className="tracking-tight text-sm font-medium">{t('dashboard.active_sell_rate')}</h3>
          </div>
          <div className="text-xl font-bold text-foreground">
            {new Intl.NumberFormat("en-US").format(cards.active_sell_rate)} K
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">{t('dashboard.daily_profit_chart')}</h3>
          </div>
          <div className="p-6 pt-0">
            <DailyProfitChart data={charts.daily_profit} />
          </div>
        </div>
        
        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">{t('dashboard.wallet_usage')}</h3>
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
            <h3 className="font-semibold leading-none tracking-tight">{t('dashboard.currency_exchange_volume')}</h3>
          </div>
          <div className="p-6 pt-0">
            <CurrencyExchangeChart data={charts.currency_exchange} />
          </div>
        </div>

        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">{t('dashboard.recent_ledger')}</h3>
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
                <div className="text-center text-sm text-gray-500 py-4">{t('dashboard.no_data')}</div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
