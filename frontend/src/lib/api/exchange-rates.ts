import { apiClient } from "@/lib/axios";

export interface ExchangeRate {
  id: string;
  currency_code: string;
  buy_rate: number;
  sell_rate: number;
  effective_date: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    username: string;
    full_name: string;
  };
}

export interface ExchangeRatesResponse {
  items: ExchangeRate[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateExchangeRateData {
  currency_code: string;
  buy_rate: number;
  sell_rate: number;
  effective_date: string;
}

export const getCurrentRate = async (currency_code: string = "THB"): Promise<ExchangeRate> => {
  const response = await apiClient.get("/exchange-rates/current", {
    params: { currency_code },
  });
  return response.data;
};

export const getRateHistory = async (params?: {
  currency_code?: string;
  /** 'today' | 'yesterday' | 'this_month' | 'this_year' | 'YYYY-MM-DD' */
  period?: string;
  page?: number;
  page_size?: number;
}): Promise<ExchangeRatesResponse> => {
  const response = await apiClient.get("/exchange-rates", { params });
  return response.data;
};

export const createExchangeRate = async (data: CreateExchangeRateData): Promise<ExchangeRate> => {
  const response = await apiClient.post("/exchange-rates", data);
  return response.data;
};
