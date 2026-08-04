import { apiClient } from "@/lib/axios";
import { Customer } from "./customers";

export interface CreditPayment {
  id: string;
  credit_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface Credit {
  id: string;
  customer_id: string;
  customer: Customer | null;
  credit_type: string; // "lend" | "borrow"
  amount: number;
  remaining_amount: number;
  description: string | null;
  status: string; // "pending" | "partial" | "paid"
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  payments: CreditPayment[];
}

export interface CreditsResponse {
  items: Credit[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateCreditData {
  customer_id: string;
  credit_type: string;
  amount: number;
  description?: string | null;
  due_date?: string | null;
}

export interface CreateCreditPaymentData {
  amount: number;
  notes?: string | null;
}

export const getCredits = async (params?: {
  q?: string;
  customer_id?: string;
  status?: string;
  is_overdue?: boolean;
  page?: number;
  page_size?: number;
}): Promise<CreditsResponse> => {
  const response = await apiClient.get("/credits", { params });
  return response.data;
};

export const createCredit = async (data: CreateCreditData): Promise<Credit> => {
  const response = await apiClient.post("/credits", data);
  return response.data;
};

export const updateCredit = async (id: string, data: { description?: string | null; due_date?: string | null; }): Promise<Credit> => {
  const response = await apiClient.put(`/credits/${id}`, data);
  return response.data;
};

export const receivePayment = async (credit_id: string, data: CreateCreditPaymentData): Promise<CreditPayment> => {
  const response = await apiClient.post(`/credits/${credit_id}/payments`, data);
  return response.data;
};

export const getCreditPayments = async (credit_id: string): Promise<CreditPayment[]> => {
  const response = await apiClient.get(`/credits/${credit_id}/payments`);
  return response.data;
};
