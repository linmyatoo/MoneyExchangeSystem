import { apiClient } from "@/lib/axios";

export interface UserBasic {
  id: string;
  username: string;
  full_name: string;
}

export interface AuditLogResponse {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  created_at: string;
  user?: UserBasic;
}

export interface AuditLogListResponse {
  items: AuditLogResponse[];
  total: number;
  page: number;
  page_size: number;
}

export const getAuditLogs = async (params?: {
  skip?: number;
  limit?: number;
  search?: string;
}): Promise<AuditLogListResponse> => {
  const response = await apiClient.get("/audit-logs", { params });
  return response.data;
};
