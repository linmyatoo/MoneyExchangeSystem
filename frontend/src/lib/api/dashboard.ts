import { apiClient } from "@/lib/axios";

export interface MetricCards {
  period_profit: number;
  period_exchange_profit: number;
  period_transaction_profit: number;
  period_transactions_count: number;
  thb_inventory: number;
  outstanding_credit: number;
  active_buy_rate: number;
  active_sell_rate: number;
}

export interface DailyProfitPoint {
  date: string;
  profit: number;
}

export interface WalletUsagePoint {
  wallet_type: string;
  amount: number;
}

export interface CurrencyExchangePoint {
  date: string;
  thb_bought: number;
  thb_sold: number;
}

export interface DashboardCharts {
  daily_profit: DailyProfitPoint[];
  wallet_usage: WalletUsagePoint[];
  currency_exchange: CurrencyExchangePoint[];
}

export interface RecentTransactionItem {
  id: string;
  type: string;
  description: string;
  amount: number;
  created_at: string;
}

export interface DashboardSummaryResponse {
  cards: MetricCards;
  charts: DashboardCharts;
  recent_transactions: RecentTransactionItem[];
}

export const getDashboardSummary = async (period?: "daily" | "monthly" | "yearly"): Promise<DashboardSummaryResponse> => {
  const response = await apiClient.get("/dashboard/summary", { params: { period } });
  return response.data;
};
