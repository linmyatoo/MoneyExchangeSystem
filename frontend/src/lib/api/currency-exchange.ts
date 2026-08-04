import { apiClient } from "@/lib/axios";
import { Customer } from "./customers";
import { WalletAccount } from "./wallets";

export interface CurrencyExchange {
  id: string;
  transaction_number: string;
  transaction_date: string;
  customer_id: string | null;
  customer_name: string | null;
  mmk_wallet_id: string;
  thb_wallet_id: string;
  mmk_wallet_name?: string;
  thb_wallet_name?: string;
  currency_code: string;
  foreign_amount: number;
  rate_used: number;
  local_amount: number;
  profit: number;
  notes: string | null;
  exchange_rate_id: string;
  created_by: string;
  created_at: string;
  
  customer?: Customer;
  mmk_wallet?: WalletAccount;
  thb_wallet?: WalletAccount;
  type?: "buy" | "sell"; // Injected by history endpoint
}

export interface CurrencyExchangeResponse {
  items: CurrencyExchange[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface THBWalletBalance {
  name: string;
  balance: number;
}

export interface THBInventorySummary {
  total_remaining: number;
  today_buy: number;
  today_buy_mmk: number;
  today_sell: number;
  today_sell_mmk: number;
  today_profit: number;
  wallet_balances: THBWalletBalance[];
}

export interface CreateExchangeData {
  customer_id?: string | null;
  customer_name?: string | null;
  mmk_wallet_id: string;
  thb_wallet_id: string;
  foreign_amount: number;
  rate_used: number;
  notes?: string | null;
}

export const getInventorySummary = async (): Promise<THBInventorySummary> => {
  const response = await apiClient.get("/currency-exchange/inventory");
  return response.data;
};

export const getExchangeHistory = async (params?: {
  q?: string;
  tx_type?: string;
  period?: string;
  page?: number;
  page_size?: number;
}): Promise<CurrencyExchangeResponse> => {
  const response = await apiClient.get("/currency-exchange/history", { params });
  return response.data;
};

export const buyTHB = async (data: CreateExchangeData): Promise<CurrencyExchange> => {
  const response = await apiClient.post("/currency-exchange/buy", data);
  return response.data;
};

export const sellTHB = async (data: CreateExchangeData): Promise<CurrencyExchange> => {
  const response = await apiClient.post("/currency-exchange/sell", data);
  return response.data;
};
