import { apiClient } from '@/lib/axios';
import { User } from '@/types/auth';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UserCreatePayload {
  username: string;
  email?: string;
  password: string;
  full_name: string;
  role_id: string;
}

export interface UserUpdatePayload {
  email?: string;
  full_name?: string;
  password?: string;
  is_active?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export const userApi = {
  list: (params: {
    q?: string;
    role_id?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }) => apiClient.get<PaginatedResponse<User>>('/users', { params }),

  create: (data: UserCreatePayload) => apiClient.post<User>('/users', data),

  update: (id: string, data: UserUpdatePayload) =>
    apiClient.put<User>(`/users/${id}`, data),

  delete: (id: string) => apiClient.delete<User>(`/users/${id}`),

  resetPassword: (id: string, new_password: string) =>
    apiClient.post<User>(`/users/${id}/reset-password`, { new_password }),

  activate: (id: string) => apiClient.post<User>(`/users/${id}/activate`),

  deactivate: (id: string) => apiClient.post<User>(`/users/${id}/deactivate`),
};

export const roleApi = {
  list: () => apiClient.get<Role[]>('/roles'),
};
