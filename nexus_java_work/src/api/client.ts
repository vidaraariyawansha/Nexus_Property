import { ApiResponse } from '../types';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('nexus_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('nexus_token', token);
    } else {
      localStorage.removeItem('nexus_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const json: ApiResponse<T> = await response.json().catch(() => ({
      success: false,
      message: `HTTP ${response.status}: Failed to parse response.`,
    }));

    if (!response.ok || !json.success) {
      const errorMsg = json.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg) as Error & { errors?: any; status?: number };
      err.errors = json.errors;
      err.status = response.status;
      throw err;
    }

    return json.data as T;
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
