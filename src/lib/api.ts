const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface ApiOptions extends RequestInit {
  token?: string;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, error.message ?? 'Unknown error');
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string | string[],
  ) {
    super(Array.isArray(message) ? message.join(', ') : message);
    this.name = 'ApiError';
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  user: { id: string; email: string; role: string };
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  profile: (token: string) =>
    request<{ id: string; email: string; role: string }>('/auth/profile', { token }),

  refresh: (token: string) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/refresh', { method: 'POST', token }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (data: { token: string; newPassword: string }) =>
    request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  verifyEmail: (token: string) =>
    request<{ message: string }>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
};

// ── Products ──────────────────────────────────────────────────────────────────

export interface ProductResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  category: string;
  imageUrl: string;
  isActive: boolean;
}

export const productsApi = {
  list: (params?: { page?: number; limit?: number; category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<{ data: ProductResponse[]; total: number }>(`/products${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) =>
    request<ProductResponse>(`/products/${id}`),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersApi = {
  getProfile: (token: string) =>
    request<{ id: string; email: string; firstName: string; lastName: string }>('/users/me', { token }),
  updateProfile: (token: string, data: { firstName?: string; lastName?: string }) =>
    request<{ id: string; email: string; firstName: string; lastName: string }>('/users/me', { method: 'PATCH', token, body: JSON.stringify(data) }),
  changePassword: (token: string, data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/auth/change-password', { method: 'POST', token, body: JSON.stringify(data) }),
};

// ── Orders ────────────────────────────────────────────────────────────────────

export interface OrderResponse {
  id: string;
  items: Array<{ productId: string; name: string; price: number; quantity: number }>;
  total: number;
  status: string;
  createdAt: string;
}

export const ordersApi = {
  create: (token: string, data: { items: Array<{ productId: string; name: string; price: number; quantity: number }>; shippingAddress?: string }) =>
    request<OrderResponse>('/orders', { method: 'POST', token, body: JSON.stringify(data) }),

  list: (token: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ data: OrderResponse[]; total: number }>(`/orders${qs ? `?${qs}` : ''}`, { token });
  },

  get: (token: string, id: string) =>
    request<OrderResponse>(`/orders/${id}`, { token }),
};
