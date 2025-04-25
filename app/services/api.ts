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
      const data = error.response.data as any;
      const errorMessage = data?.message || 'Server error';
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
  register: async (userData: { name: string; email: string; password: string; role?: string }) => {
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
      return response.data;
    } catch (error) {
      // Clear token if unauthorized
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        Cookies.remove('auth_token');
      }
      throw error;
    }
  },

  // Logout user
  logout: () => {
    Cookies.remove('auth_token');
    window.location.href = '/login';
  },
};

// Add retry capability to API requests
const withRetry = async (apiCall: () => Promise<any>, retries = 2, delay = 1000) => {
  try {
    return await apiCall();
  } catch (error) {
    if (retries <= 0) throw error;
    
    // Only retry on network errors or 500 status (likely DB connection issues)
    if (!axios.isAxiosError(error) || 
        (error.response && error.response.status !== 500 && error.response)) {
      throw error;
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(apiCall, retries - 1, delay * 1.5);
  }
};

// Bookings service
export const bookingsService = {
  // Get all bookings for current user
  getAllBookings: async () => {
    return withRetry(async () => {
      const response = await api.get('/bookings');
      console.log('Bookings response:', response.data); // Debugging line
      return response.data; // Return the data directly
    });
  },

  // Get all bookings (admin only)
  getAllBookingsAdmin: async () => {
    return withRetry(async () => {
      const response = await api.get('/bookings');
      console.log('Admin bookings response:', response.data); // Debugging line
      return response.data; // Return the data directly
    });
  },

  // Get booking by id
  getBookingById: async (id: string) => {
    return withRetry(async () => {
      const response = await api.get(`/bookings/${id}`);
      return response.data;
    });
  },

  // Create a new booking
  createBooking: async (bookingData: any) => {
    return withRetry(async () => {
      const response = await api.post('/bookings', bookingData);
      return response.data;
    });
  },

  // Update booking status
  updateBookingStatus: async (id: string, status: string) => {
    return withRetry(async () => {
      const response = await api.patch(`/bookings/${id}`, { status });
      return response.data;
    });
  },

  // Admin: Update booking status (uses the admin endpoint)
  adminUpdateBookingStatus: async (id: string, status: string) => {
    return withRetry(async () => {
      const response = await api.patch(`/admin/bookings/${id}/status`, { status });
      return response.data;
    });
  },

  // Delete booking (admin only)
  deleteBooking: async (id: string) => {
    return withRetry(async () => {
      const response = await api.delete(`/bookings/${id}`);
      return response.data;
    });
  },

  // Get available timeslots
  getAvailableTimeslots: async (date: string) => {
    return withRetry(async () => {
      const response = await api.get(`/bookings/timeslots?date=${date}`);
      return response.data;
    });
  }
};

// Users admin service
export const usersAdminService = {
  // Get all users (admin only)
  getAllUsers: async () => {
    return withRetry(async () => {
      const response = await api.get('/admin/users/all');
      console.log('Original API Response:', response.data);
      
      // Transform the data to ensure all users have an _id field
      let transformedData;
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // If response has a data property containing the array
        transformedData = response.data.data.map((user: any) => ({
          ...user,
          _id: user._id || user.id || `temp-${Math.random().toString(36).substr(2, 9)}`
        }));
        console.log('Transformed from response.data.data:', transformedData);
        return transformedData;
      } else if (response.data && Array.isArray(response.data)) {
        // If response data is directly the array
        transformedData = response.data.map((user: any) => ({
          ...user,
          _id: user._id || user.id || `temp-${Math.random().toString(36).substr(2, 9)}`
        }));
        console.log('Transformed from response.data array:', transformedData);
        return transformedData;
      }
      
      return response.data;
    });
  },
  
  // Delete a user (admin only)
  deleteUser: async (userId: string) => {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    console.log('Delete user API call with ID:', userId);
    
    // Use direct axios call to bypass any potential interceptor issues
    const token = Cookies.get('auth_token');
    const url = `${API_BASE_URL}/admin/users/delete/${userId}`;
    
    console.log('Making DELETE request to:', url);
    
    try {
      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Delete successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }
};

export default api; 
