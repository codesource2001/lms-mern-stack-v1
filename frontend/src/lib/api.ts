import axios, { type AxiosRequestConfig } from 'axios';

import { env } from '@/lib/env';

export interface NormalizedApiError {
  message: string;
  code?: string;
  status?: number;
  fieldErrors?: Array<{ field: string; message: string }>;
}

export const api = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken !== null) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

interface RetryableRequest extends AxiosRequestConfig {
  _retry?: boolean;
}

function normalize(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; code?: string; errors?: Array<{ field: string; message: string }> }
      | undefined;
    const result: NormalizedApiError = {
      message: data?.message ?? error.message,
    };
    if (data?.code !== undefined) {
      result.code = data.code;
    }
    if (error.response?.status !== undefined) {
      result.status = error.response.status;
    }
    if (data?.errors !== undefined) {
      result.fieldErrors = data.errors;
    }
    return result;
  }

  return { message: error instanceof Error ? error.message : 'Unexpected error' };
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const originalRequest = (axios.isAxiosError(error) ? error.config : undefined) as
      RetryableRequest | undefined;

    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      originalRequest !== undefined &&
      originalRequest._retry !== true &&
      !String(originalRequest.url ?? '').includes('/auth/refresh') &&
      !String(originalRequest.url ?? '').includes('/auth/login')
    ) {
      originalRequest._retry = true;

      try {
        if (refreshPromise === null) {
          refreshPromise = api
            .post('/auth/refresh')
            .then((response) => {
              const data = response.data as { data?: { accessToken?: string } };
              const token = data.data?.accessToken;
              if (token !== undefined) {
                setAccessToken(token);
              }
              return token ?? '';
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const token = await refreshPromise;
        if (token !== '') {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch {
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('atrium:unauthenticated'));
        }
        return Promise.reject(new Error('Authentication required'));
      }
    }

    return Promise.reject(new Error(normalize(error).message));
  },
);

export default api;
