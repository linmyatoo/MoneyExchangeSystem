import { apiClient } from '@/lib/axios';

export interface WalletType {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface WalletAccount {
  id: string;
  account_name: string;
  account_number: string | null;
  opening_balance: number;
  balance: number;
  is_active: boolean;
  wallet_type_id: string;
  wallet_type: WalletType;
  created_at: string;
  updated_at: string;
}

export interface WalletAccountsResponse {
  items: WalletAccount[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateWalletAccountData {
  account_name: string;
  account_number: string | null;
  opening_balance: number;
  is_active: boolean;
  wallet_type_id: string;
}

export interface UpdateWalletAccountData {
  account_name?: string;
  account_number?: string | null;
  balance?: number;
}

export const getWalletTypes = async (): Promise<WalletType[]> => {
  const response = await apiClient.get("/wallets/types");
  return response.data;
};

export const getWalletAccounts = async (params?: {
  q?: string;
  wallet_type_id?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}): Promise<WalletAccountsResponse> => {
  const response = await apiClient.get("/wallets/accounts", { params });
  return response.data;
};

export const createWalletAccount = async (data: CreateWalletAccountData): Promise<WalletAccount> => {
  const response = await apiClient.post("/wallets/accounts", data);
  return response.data;
};

export const updateWalletAccount = async (
  id: string,
  data: UpdateWalletAccountData
): Promise<WalletAccount> => {
  const response = await apiClient.put(`/wallets/accounts/${id}`, data);
  return response.data;
};

export const activateWalletAccount = async (id: string): Promise<WalletAccount> => {
  const response = await apiClient.post(`/wallets/accounts/${id}/activate`);
  return response.data;
};

export const deactivateWalletAccount = async (id: string): Promise<WalletAccount> => {
  const response = await apiClient.post(`/wallets/accounts/${id}/deactivate`);
  return response.data;
};
