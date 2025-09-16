import { apiRequest } from "./queryClient";

export interface User {
  id: string;
  email: string;
  role: string;
  photographerId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  businessName: string;
  role?: string;
}

export async function login(credentials: LoginCredentials): Promise<User> {
  const response = await apiRequest("POST", "/api/auth/login", credentials);
  const data = await response.json();
  return data.user;
}

export async function register(data: RegisterData): Promise<void> {
  await apiRequest("POST", "/api/auth/register", data);
}

export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout");
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiRequest("GET", "/api/auth/me");
    return await response.json();
  } catch (error) {
    return null;
  }
}
