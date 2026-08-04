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

export interface CreateCustomerData {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerData {
  name?: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export const getCustomers = async (params?: {
  q?: string;
  page?: number;
  page_size?: number;
}): Promise<CustomersResponse> => {
  const response = await apiClient.get("/customers", { params });
  return response.data;
};

export const getCustomer = async (id: string): Promise<Customer> => {
  const response = await apiClient.get(`/customers/${id}`);
  return response.data;
};

export const createCustomer = async (data: CreateCustomerData): Promise<Customer> => {
  const response = await apiClient.post("/customers", data);
  return response.data;
};

export const updateCustomer = async (
  id: string,
  data: UpdateCustomerData
): Promise<Customer> => {
  const response = await apiClient.put(`/customers/${id}`, data);
  return response.data;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await apiClient.delete(`/customers/${id}`);
};
