/**
 * Liberty Field App — API Client
 *
 * Axios-based HTTP client with JWT auth, automatic token refresh,
 * and request queuing during refresh cycles.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { db } from './database';

// ─── Configuration ──────────────────────────

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://api-production-707d.up.railway.app';

// ─── Token Storage (SQLite) ─────────────────

async function getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const user = await db.getFirstAsync<{
    access_token: string | null;
    refresh_token: string | null;
  }>('SELECT access_token, refresh_token FROM user_cache LIMIT 1');

  return {
    accessToken: user?.access_token ?? null,
    refreshToken: user?.refresh_token ?? null,
  };
}

async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await db.runAsync(
    `UPDATE user_cache SET access_token = ?, refresh_token = ?, token_expires_at = datetime('now', '+15 minutes')`,
    [accessToken, refreshToken],
  );
}

async function clearTokens(): Promise<void> {
  await db.runAsync('UPDATE user_cache SET access_token = NULL, refresh_token = NULL');
}

// ─── Axios Instance ─────────────────────────

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor (attach JWT) ───────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

function processQueue(error: Error | null, token: string | null): void {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else if (token) {
      p.resolve(token);
    }
  });
  failedQueue = [];
}

client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { accessToken } = await getTokens();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor (auto-refresh) ────

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(client(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken } = await getTokens();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        await saveTokens(data.accessToken, data.refreshToken);
        processQueue(null, data.accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return client(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        await clearTokens();
        // TODO: Navigate to login screen
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Export ─────────────────────────────────

export const apiClient = client;
export { API_BASE_URL };
