import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/api';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
// Define user type 'js-cookie';
import Cookies from 'js-cookie';

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
};

// Define auth context type
type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUserProfile: (data: {name: string, email: string, phone?: string}) => void;
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
type AuthProviderProps = {
  children: ReactNode;
};

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Fetch current user on mount
  useEffect(() => {
    const token = Cookies.get('auth_token');

    if (!token) {
      setLoading(false);
      return;
    }

    const loadUser = async () => {
      try {
        const response = await authService.getCurrentUser();
        if (response.data?.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      setUser(response.data.user);
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error: any) {
      // Handle specific error types
      if (error?.response?.status === 503) {
        toast.error('Database connection is currently unavailable. Please try again later.');
      } else if (!error.response) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error(error.response?.data?.message || 'Login failed');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.register({ name, email, password });
      setUser(response.data.user);
      toast.success('Registration successful!');
      router.push('/dashboard');
    } catch (error: any) {
      // Handle specific error types
      if (error?.response?.status === 503) {
        toast.error('Database connection is currently unavailable. Please try again later.');
      } else if (!error.response) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error(error.response?.data?.message || 'Registration failed');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    setUser(null);
    toast.info('You have been logged out');
  };

  // Update user profile function
  const updateUserProfile = (data: {name: string, email: string, phone?: string}) => {
    if (user) {
      setUser({
        ...user,
        name: data.name,
        email: data.email,
        phone: data.phone
      });
    }
  };

  // Provide auth context value
  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
    updateUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected route component
export function withAuth(Component: React.ComponentType) {
  return function ProtectedRoute(props: any) {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !isAuthenticated) {
        router.replace('/login');
      }
    }, [isAuthenticated, loading, router]);

    if (loading) {
      return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    return isAuthenticated ? <Component {...props} /> : null;
  };
} 