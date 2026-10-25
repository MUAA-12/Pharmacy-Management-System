/**
 * API Service Client for PharmaReserve REST API
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Cannot connect to Backend Server. Please ensure backend is running at http://localhost:5000');
    }
    throw err;
  }
}

// Medicine Endpoints
export const medicineApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category) query.append('category', params.category);
    if (params.availability) query.append('availability', params.availability);
    return request(`/medicines?${query.toString()}`);
  },
  getCategories: () => request('/medicines/categories'),
  getById: (id) => request(`/medicines/${id}`),
  create: (data) => request('/medicines', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/medicines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/medicines/${id}`, { method: 'DELETE' })
};

// Customer Endpoints
export const customerApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    return request(`/customers?${query.toString()}`);
  },
  getById: (id) => request(`/customers/${id}`),
  create: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/customers/${id}`, { method: 'DELETE' })
};

// Reservation Endpoints
export const reservationApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return request(`/reservations?${query.toString()}`);
  },
  getById: (id) => request(`/reservations/${id}`),
  create: (data) => request('/reservations', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id) => request(`/reservations/${id}/cancel`, { method: 'PUT' }),
  complete: (id) => request(`/reservations/${id}/complete`, { method: 'PUT' })
};

// Report Endpoints
export const reportApi = {
  getDashboard: () => request('/reports/dashboard'),
  getInventory: () => request('/reports/inventory'),
  getLowStock: (threshold = 10) => request(`/reports/low-stock?threshold=${threshold}`),
  getExpiry: (days = 90) => request(`/reports/expiry?days=${days}`),
  getSalesByDate: () => request('/reports/sales-by-date'),
  getTopMedicines: () => request('/reports/top-medicines')
};

// System Health Endpoint
export const healthApi = {
  check: () => request('/health')
};
