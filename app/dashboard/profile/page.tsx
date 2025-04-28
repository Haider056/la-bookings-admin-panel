'use client';

import { useState, useEffect } from 'react';
import { useAuth, withAuth } from '../../context/AuthContext';
import { usersAdminService } from '../../services/api';
import { toast } from 'react-toastify';
import api from '../../services/api';

// User type definition
type User = {
  _id: string;
  id?: string;  // Add optional id property
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
};

function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);
  
  // Fetch all users if admin
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAdmin) return;
      
      try {
        setLoadingUsers(true);
        const response = await usersAdminService.getAllUsers();
        
        let processedUsers: User[] = [];
        
        // Check if response is an array or has a data property
        if (Array.isArray(response)) {
          processedUsers = response.map((user: any) => ({
            ...user,
            _id: user._id || user.id || String(Math.random()).slice(2)
          }));
        } else if (response && response.data) {
          processedUsers = response.data.map((user: any) => ({
            ...user,
            _id: user._id || user.id || String(Math.random()).slice(2)
          }));
        }
        
        setUsers(processedUsers);
      } catch (error) {
        toast.error('Failed to load users');
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsers();
  }, [isAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('You must be logged in to update your profile');
      return;
    }

    setLoading(true);
    try {
      const response = await api.patch('/users/profile', formData);
      if (response.data) {
        toast.success('Profile updated successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  
  // Modal handlers
  const openDeleteModal = (user: User) => {
    // Ensure the user has a valid ID
    if (!user._id && !user.id) {
      toast.error('Cannot delete user: Missing ID');
      return;
    }
    
    // Create a new user object with guaranteed _id
    const userWithId = {
      ...user,
      _id: user._id || user.id || ''
    };
    
    setUserToDelete(userWithId);
    setShowDeleteModal(true);
  };
  
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };
  
  // Delete user handler
  const handleDeleteUser = async () => {
    if (!userToDelete) {
      return;
    }
    
    
    // Get the user ID, checking both possible properties
    let userId = userToDelete._id || userToDelete.id;
    
    // Ensure it's a clean string
    if (userId) {
      userId = String(userId).trim();
    }
    

    
    // Make sure we have a valid ID
    if (!userId) {

      toast.error('Invalid user ID');
      closeDeleteModal();
      return;
    }
    
    // Prevent admins from deleting their own account
    if (userId === user?.id) {
      toast.error('You cannot delete your own admin account');
      closeDeleteModal();
      return;
    }
    
    setDeletingUser(true);
    try {
      const result = await usersAdminService.deleteUser(userId);
      
      // Update the users list
      setUsers(prevUsers => prevUsers.filter(u => (u._id || u.id) !== userId));
      
      toast.success('User access revoked successfully');
      closeDeleteModal();
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('User not found');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to delete this user');
      } else if (error.response?.status === 400) {
        toast.error('Cannot delete admin account');
      } else {
        toast.error(`Failed to revoke user access: ${error.message}`);
      }
    } finally {
      setDeletingUser(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
    
      {/* Admin Section: User Management */}
      {isAdmin && (
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-[#6b46e8]">
            <h2 className="text-xl font-bold text-white">User Management</h2>
            <p className="text-sm text-white/90 mt-1">
              Manage all registered users
            </p>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <a 
                href="/dashboard" 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors flex items-center w-fit"
              >
                <span>← Back to Dashboard</span>
              </a>
            </div>
            {loadingUsers ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5c46e8]"></div>
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No users found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((userItem, index) => (
                      <tr key={userItem._id || `user-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{userItem.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{userItem.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            userItem.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {userItem.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(userItem.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {userItem.role !== 'admin' && (
                            <button
                              onClick={() => openDeleteModal(userItem)}
                              className="text-[#ff3333] hover:text-red-700 font-semibold"
                              data-userid={userItem._id}
                            >
                              Revoke Access
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Delete User Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full">
            <div className="px-6 py-4 bg-red-600">
              <h3 className="text-lg font-medium text-white">Confirm User Deletion</h3>
            </div>
            <div className="p-6">
              <p className="mb-4 text-gray-700">
                Are you sure you want to revoke access for <span className="font-bold">{userToDelete.name}</span>?
              </p>
              <p className="mb-6 text-gray-700">
                This will permanently delete the user account and all associated data. This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 focus:outline-none"
                  disabled={deletingUser}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none flex items-center justify-center min-w-[100px]"
                  disabled={deletingUser}
                >
                  {deletingUser ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(ProfilePage); 