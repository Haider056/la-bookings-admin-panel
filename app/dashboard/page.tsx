'use client';

import { useState, useEffect } from 'react';
import { bookingsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { withAuth } from '../context/AuthContext';
import Link from 'next/link';
import { toast } from 'react-toastify';

type Booking = {
  _id: string;
  customer_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  created_at: string;
};

function Dashboard() {
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        
        // Use different endpoint for admins to get all bookings
        const response = isAdmin 
          ? await bookingsService.getAllBookingsAdmin()
          : await bookingsService.getAllBookings();
        
        // Check if response is an array (direct data) or has a .data property
        let bookingsData: Booking[] = [];
        if (Array.isArray(response)) {
          bookingsData = response;
        } else if (response && response.data) {
          bookingsData = response.data;
        }
        
        // Set the loaded bookings
        setBookings(bookingsData);
        setFilteredBookings(bookingsData);
      } catch (error: any) {
        if (error?.response?.status === 503) {
          setError('Database connection is currently unavailable. Please try again later.');
        } else if (!error.response) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Failed to load bookings. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [isAdmin]);

  // Filter bookings whenever status filter changes
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter(booking => booking.status === statusFilter));
    }
  }, [statusFilter, bookings]);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    // If attempting to cancel and not showing confirmation yet
    if (newStatus === 'cancelled' && showCancelConfirm !== bookingId) {
      setShowCancelConfirm(bookingId);
      return;
    }
    
    // Reset confirmation state
    setShowCancelConfirm(null);
    setUpdatingStatus(true);
    
    try {
      // Use the admin update status endpoint
      await bookingsService.adminUpdateBookingStatus(bookingId, newStatus);
      
      // Update local state
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking._id === bookingId 
            ? { ...booking, status: newStatus } 
            : booking
        )
      );
      
      toast.success(`Booking status updated to ${newStatus}`);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('You do not have permission to update this booking');
      } else if (error.response?.status === 404) {
        toast.error('Booking not found');
      } else {
        toast.error('Failed to update booking status');
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) {
      return;
    }
    
    try {
      await bookingsService.deleteBooking(bookingId);
      setBookings(prevBookings => prevBookings.filter(booking => booking._id !== bookingId));
      toast.success('Booking deleted successfully');
    } catch (error) {
      toast.error('Failed to delete booking');
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {isAdmin ? 'Admin Dashboard' : 'My Bookings'}
            </h1>
            <div className="flex items-center">
              <span className="text-gray-700 mr-4">
                Welcome, {user?.name}!
              </span>
              {isAdmin && (
                <Link href="/dashboard/profile" className="mr-4 text-indigo-600 hover:text-indigo-800">
                  User Management
                </Link>
              )}
              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-4 bg-white">
              {isAdmin && (
                <div className="mb-6 px-4 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Filter Bookings by Status</h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                        statusFilter === 'all'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter('pending')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                        statusFilter === 'pending'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setStatusFilter('confirmed')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                        statusFilter === 'confirmed'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      Confirmed
                    </button>
                    <button
                      onClick={() => setStatusFilter('cancelled')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                        statusFilter === 'cancelled'
                          ? 'bg-red-600 text-white'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      Cancelled
                    </button>
                  </div>
                </div>
              )}
              
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                </div>
              ) : error ? (
                <div className="text-center py-20">
                  <div className="text-red-500 mb-4">{error}</div>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-20">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No bookings found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {statusFilter !== 'all' 
                      ? `No ${statusFilter} bookings found.` 
                      : isAdmin 
                        ? 'There are no bookings in the system yet.' 
                        : 'You haven\'t made any bookings yet.'}
                  </p>
                  {!isAdmin && (
                    <div className="mt-6">
                      <Link
                        href="/new-booking"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                      >
                        Make a new booking
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                      <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Service
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Time
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              {isAdmin && (
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  ID
                                </th>
                              )}
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredBookings.map((booking) => (
                              <tr key={booking._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {booking.service_name}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        Booked by {booking.customer_name}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {formatDate(booking.booking_date)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {booking.booking_time}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span
                                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        booking.status === 'confirmed'
                                          ? 'bg-green-100 text-green-800'
                                          : booking.status === 'pending'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : booking.status === 'cancelled'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {booking.status || 'Pending'}
                                    </span>
                                    
                                    {isAdmin && (
                                      <div className="mt-2 flex space-x-1">
                                        {booking.status === 'pending' && (
                                          <button
                                            onClick={() => handleStatusChange(booking._id, 'confirmed')}
                                            disabled={updatingStatus}
                                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50"
                                          >
                                            {updatingStatus && showCancelConfirm === null ? (
                                              <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                            ) : (
                                              'Confirm'
                                            )}
                                          </button>
                                        )}
                                        
                                        {booking.status !== 'cancelled' && (
                                          <button
                                            onClick={() => handleStatusChange(booking._id, 'cancelled')}
                                            disabled={updatingStatus}
                                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-50"
                                          >
                                            {updatingStatus && showCancelConfirm === null ? (
                                              <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                            ) : (
                                              'Cancel'
                                            )}
                                          </button>
                                        )}
                                        
                                        {/* Confirmation dialog for cancellation */}
                                        {showCancelConfirm === booking._id && (
                                          <div className="absolute z-10 mt-8 ml-2 w-72 bg-white rounded-md shadow-lg border border-gray-200 p-3">
                                            <p className="text-sm text-red-600 mb-2">
                                              Are you sure you want to cancel this booking?
                                            </p>
                                            <div className="flex justify-end space-x-2">
                                              <button
                                                onClick={() => setShowCancelConfirm(null)}
                                                className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded"
                                              >
                                                No
                                              </button>
                                              <button
                                                onClick={() => handleStatusChange(booking._id, 'cancelled')}
                                                className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                                              >
                                                Yes, Cancel
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                {isAdmin && (
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {booking._id.substring(booking._id.length - 6)}
                                  </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <Link
                                    href={`/dashboard/bookings/${booking._id}`}
                                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                                  >
                                    View
                                  </Link>
                                  {isAdmin && (
                                    <button
                                      onClick={() => handleDeleteBooking(booking._id)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(Dashboard); 

