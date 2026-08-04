import { apiClient } from "@/lib/axios";

export interface CashOpeningCreate {
  mmk_amount: number;
  thb_amount: number;
  notes?: string;
}

export interface CashClosingCreate {
  mmk_amount: number;
  thb_amount: number;
  notes?: string;
}

export interface UserBasic {
  id: string;
  username: string;
  full_name: string;
}

export interface CashOpeningResponse {
  id: string;
  opening_date: string;
  mmk_amount: number;
  thb_amount: number;
  status: string;
  notes?: string;
  created_at: string;
  creator: UserBasic;
}

export interface CashClosingResponse {
  id: string;
  closing_date: string;
  mmk_amount: number;
  thb_amount: number;
  expected_mmk_amount: number;
  expected_thb_amount: number;
  mmk_discrepancy: number;
  thb_discrepancy: number;
  notes?: string;
  created_at: string;
  creator: UserBasic;
}

export interface DailyStatusResponse {
  status: "NOT_OPENED" | "OPEN" | "CLOSED";
  opening?: CashOpeningResponse;
  closing?: CashClosingResponse;
  expected_mmk_now?: number;
  expected_thb_now?: number;
}

export const getDailyStatus = async (): Promise<DailyStatusResponse> => {
  const response = await apiClient.get("/cash-management/status");
  return response.data;
};

export const openRegister = async (data: CashOpeningCreate): Promise<CashOpeningResponse> => {
  const response = await apiClient.post("/cash-management/open", data);
  return response.data;
};

export const closeRegister = async (data: CashClosingCreate): Promise<CashClosingResponse> => {
  const response = await apiClient.post("/cash-management/close", data);
  return response.data;
};

export const getCashHistory = async (): Promise<CashOpeningResponse[]> => {
  const response = await apiClient.get("/cash-management/history");
  return response.data;
};

export const updateOpening = async (id: string, data: any): Promise<CashOpeningResponse> => {
  const response = await apiClient.put(`/cash-management/open/${id}`, data);
  return response.data;
};

export const updateClosing = async (id: string, data: any): Promise<CashClosingResponse> => {
  const response = await apiClient.put(`/cash-management/close/${id}`, data);
  return response.data;
};
