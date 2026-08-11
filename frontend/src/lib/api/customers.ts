import { apiClient } from "@/lib/axios";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  outstanding_credit: number;
  total_transactions: number;
  created_at: string;
  updated_at: string;
}

export interface CustomersResponse {
  items: Customer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const getCustomers = async (params?: {
  q?: string;
  page?: number;
  page_size?: number;
}): Promise<CustomersResponse> => {
  const response = await apiClient.get("/customers", { params });
  return response.data;
};
