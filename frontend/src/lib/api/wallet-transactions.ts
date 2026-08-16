import { apiClient } from "@/lib/axios";
import { Customer } from "./customers";
import { WalletAccount } from "./wallets";

export interface WalletTransaction {
  id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type: string;
  customer_id: string | null;
  customer: Customer | null;
  from_wallet_account_id: string | null;
  from_wallet_account: WalletAccount | null;
  to_wallet_account_id: string | null;
  to_wallet_account: WalletAccount | null;
  amount: number;
  profit: number;
  notes: string | null;
  is_credit: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransactionsResponse {
  items: WalletTransaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateWalletTransactionData {
  transaction_type?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  from_wallet_account_id?: string | null;
  to_wallet_account_id?: string | null;
  amount: number;
  profit?: number;
  profit_wallet_account_id?: string | null;
  notes?: string | null;
  is_credit?: boolean;
}

export const getWalletTransactions = async (params?: {
  q?: string;
  wallet_account_id?: string;
  customer_id?: string;
  is_credit?: boolean;
  period?: string;
  page?: number;
  page_size?: number;
}): Promise<WalletTransactionsResponse> => {
  const response = await apiClient.get("/wallet-transactions", { params });
  return response.data;
};

export const createWalletTransaction = async (
  data: CreateWalletTransactionData
): Promise<WalletTransaction> => {
  const response = await apiClient.post("/wallet-transactions", data);
  return response.data;
};

export const updateWalletTransaction = async (
  id: string,
  data: CreateWalletTransactionData
): Promise<WalletTransaction> => {
  const response = await apiClient.put(`/wallet-transactions/${id}`, data);
  return response.data;
};

export const deleteWalletTransaction = async (id: string): Promise<WalletTransaction> => {
  const response = await apiClient.delete(`/wallet-transactions/${id}`);
  return response.data;
};
