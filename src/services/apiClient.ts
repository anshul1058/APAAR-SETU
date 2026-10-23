import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL as string) || 'http://localhost:8000/api/v1';

// Central Axios Client
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Platform': 'SIH-2026-APAAR-PORTAL'
  }
});

// Request Interceptor: Attach JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('apaar_auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401, 403, and network fallbacks
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('apaar_auth_token');
      localStorage.removeItem('apaar_auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?session_expired=true';
      }
    } else if (error.response?.status === 403) {
      console.warn('[API Client] 403 Forbidden: Insufficient role permissions for route');
    }
    return Promise.reject(error);
  }
);

// Helper for simulated latency in mock mode
export const simulateLatency = (ms = 350): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
