import { apiClient } from "@/lib/axios";

export interface ProfitReportItem {
  date: string;
  exchange_profit: number;
  transaction_profit: number;
  total_profit: number;
}

export interface ProfitReportResponse {
  start_date: string;
  end_date: string;
  total_records: number;
  items: ProfitReportItem[];
  total_exchange_profit: number;
  total_transaction_profit: number;
  overall_profit: number;
}

export interface WalletBalanceReportItem {
  wallet_id: string;
  wallet_name: string;
  wallet_type: string;
  current_balance: number;
}

export interface WalletBalanceReportResponse {
  start_date: string;
  end_date: string;
  total_records: number;
  items: WalletBalanceReportItem[];
}

export interface CashFlowReportItem {
  date: string;
  inflow: number;
  outflow: number;
  net_flow: number;
}

export interface CashFlowReportResponse {
  start_date: string;
  end_date: string;
  total_records: number;
  items: CashFlowReportItem[];
  total_inflow: number;
  total_outflow: number;
  overall_net: number;
}

export const getProfitReport = async (start_date: string, end_date: string): Promise<ProfitReportResponse> => {
  const response = await apiClient.get("/reports/profit", {
    params: { start_date, end_date },
  });
  return response.data;
};

export const getWalletBalancesReport = async (): Promise<WalletBalanceReportResponse> => {
  const response = await apiClient.get("/reports/wallet-balances");
  return response.data;
};

export const getCashFlowReport = async (start_date: string, end_date: string): Promise<CashFlowReportResponse> => {
  const response = await apiClient.get("/reports/cash-flow", {
    params: { start_date, end_date },
  });
  return response.data;
};
