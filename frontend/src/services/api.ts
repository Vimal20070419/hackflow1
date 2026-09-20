import axios from 'axios';

// When running on localhost or via mobile on LAN, use window.location.hostname:5000 if not proxying
const getBaseUrl = () => {
  const host = window.location.hostname;
  return `http://${host}:5000/api`;
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hackflow_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/portal') && !window.location.pathname.startsWith('/scanner')) {
      // Clear token only if we're in desk mode
      // localStorage.removeItem('hackflow_token');
    }
    return Promise.reject(error);
  }
);
