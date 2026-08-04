export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  full_name: string;
  is_active: boolean;
  role: Role;
  last_login_at: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
