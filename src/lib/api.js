const BASE_URL = import.meta.env.VITE_API_URL || '/api/admin';

export function getToken() {
  return localStorage.getItem('swms_admin_token') || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('swms_admin_token', token);
  } else {
    localStorage.removeItem('swms_admin_token');
  }
}

export function clearToken() {
  localStorage.removeItem('swms_admin_token');
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    clearToken();
    window.dispatchEvent(new CustomEvent('swms:auth:expired'));
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const adminApi = {
  login: (email, password) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getStats: () => apiFetch('/stats'),

  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/users${query ? `?${query}` : ''}`);
  },

  getPickups: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/pickups${query ? `?${query}` : ''}`);
  },

  getVendors: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/vendors${query ? `?${query}` : ''}`);
  },

  getMarketplace: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/marketplace${query ? `?${query}` : ''}`);
  },

  getRewardsRedemptions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/rewards/redemptions${query ? `?${query}` : ''}`);
  },

  getCollectors: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/collectors${query ? `?${query}` : ''}`);
  },

  getComplaints: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/complaints${query ? `?${query}` : ''}`);
  },

  getPayments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/payments${query ? `?${query}` : ''}`);
  },
};
