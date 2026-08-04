import { apiClient } from "@/lib/axios";

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
}

export interface SystemSettingUpdate {
  key: string;
  value: string;
  description?: string;
}

export const getSettings = async (): Promise<SystemSetting[]> => {
  const response = await apiClient.get("/settings");
  return response.data;
};

export const updateSettings = async (settings: SystemSettingUpdate[]): Promise<SystemSetting[]> => {
  const response = await apiClient.put("/settings", { settings });
  return response.data;
};
