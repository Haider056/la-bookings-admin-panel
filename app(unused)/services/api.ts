import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

// Base URL for API endpoints - update to match your backend
const API_BASE_URL = 'http://localhost:3000/api';

// Create an axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add request interceptor to include auth token in headers
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Network error handling
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    // Handle expired token (401)
    if (error.response.status === 401 && !originalRequest._retry) {
      // Clear token if unauthorized
      Cookies.remove('auth_token');

      // If on a protected route, redirect to login
      if (typeof window !== 'undefined' &&
          !window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }

    // MongoDB disconnection errors typically return 500
    if (error.response.status === 500) {
      const errorMessage = error.response.data?.message || 'Server error';
      if (errorMessage.includes('MongoDB') || errorMessage.includes('database')) {
        toast.error('Database connection issue. Please try again in a moment.');
      } else {
        toast.error('An error occurred. Please try again.');
      }
    }

    return Promise.reject(error);
  }
);

// Authentication service
export const authService = {
  // Register new user
  register: async (userData: { name: string; email: string; password: string }) => {
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data.token) {
        Cookies.set('auth_token', response.data.token, { expires: 30 });
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        // Handle validation errors specifically
        throw error;
      } else {
        // Rethrow with more info for other errors
        throw error;
      }
    }
  },

  // Login user
  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.token) {
        Cookies.set('auth_token', response.data.token, { expires: 30 });
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Handle invalid credentials specifically
        throw error;
      } else {
        // Rethrow with more info for other errors
        throw error;
      }
    }
  },

  // Get current user profile
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout user
  logout: () => {
    Cookies.remove('auth_token');
  },

  // Update user profile
  updateProfile: async (profileData: { name: string; email: string; phone?: string }) => {
    try {
      const response = await api.patch('/users/profile', profileData);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// Booking service
export const bookingService = {
  // Get all bookings for a user
  getBookings: async () => {
    try {
      const response = await api.get('/bookings');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create a new booking
  createBooking: async (bookingData: any) => {
    try {
      const response = await api.post('/bookings', bookingData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Cancel a booking
  cancelBooking: async (bookingId: string) => {
    try {
      const response = await api.patch(`/bookings/${bookingId}`, { status: 'cancelled' });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get available time slots
  getTimeSlots: async (date?: string) => {
    try {
      const response = await api.get('/bookings/timeslots', { params: { date } });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default api; 