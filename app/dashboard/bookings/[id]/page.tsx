'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, withAuth } from '../../../context/AuthContext';
import { bookingsService } from '../../../services/api';
import { toast } from 'react-toastify';
import Link from 'next/link';

type Booking = {
  _id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_name: string;
  service_details: string;
  booking_date: string;
  booking_time: string;
  booking_notes: string;
  status: string;
  created_at: string;
  user_id: string;
};

function BookingDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        let bookingData = null;
        
        // Find the booking in all bookings first
        const allBookings = await bookingsService.getAllBookingsAdmin();
        
        // Check if allBookings is an array (direct data) or has a .data property
        const bookingsArray = Array.isArray(allBookings) 
          ? allBookings 
          : (allBookings?.data || []);
          
        const foundBooking = bookingsArray.find((b: any) => b._id === id);
        if (foundBooking) {
          bookingData = foundBooking; // Store the found booking as a fallback
        }
        
        try {
          // Try to get single booking
          const response = await bookingsService.getBookingById(id as string);
          
          if (response && response.data) {
            bookingData = response.data; // Override with direct API response if available
          }
        } catch (error) {
          // We'll continue with the bookingData from the list if it exists
        }
        
        if (bookingData) {
          setBooking(bookingData);
          
          // Only check if the booking belongs to the user for modification purposes
          // but still allow viewing for all users
        } else {
          setError('Booking not found');
        }
      } catch (error: any) {
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBooking();
  }, [id, isAdmin, router, user?.id]);
  
  const handleStatusChange = async (newStatus: string) => {
    try {
      if (!booking?._id) return;
      
      // Show confirmation dialog for cancellation
      if (newStatus === 'cancelled' && !showCancelConfirm) {
        setShowCancelConfirm(true);
        return;
      }
      
      // Reset confirmation state
      setShowCancelConfirm(false);
      setUpdatingStatus(true);
      
      // Use the admin endpoint for status updates
      await bookingsService.adminUpdateBookingStatus(booking._id, newStatus);
      setBooking(prev => prev ? { ...prev, status: newStatus } : null);
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
  
  const handleDeleteBooking = async () => {
    if (!booking?._id) return;
    
    if (!window.confirm('Are you sure you want to delete this booking?')) {
      return;
    }
    
    try {
      await bookingsService.deleteBooking(booking._id);
      toast.success('Booking deleted successfully');
      router.push('/dashboard');
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
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-red-600">
            <h1 className="text-xl font-bold text-white">Error</h1>
          </div>
          <div className="p-6">
            <p className="text-red-500">{error || 'Booking not found'}</p>
            <div className="mt-6">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-indigo-600">
          <h1 className="text-xl font-bold text-white">Booking Details</h1>
          {isAdmin && (
            <span className="inline-flex ml-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Admin View
            </span>
          )}
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              ← Back to Dashboard
            </Link>
          </div>
          
          <div className="border-b border-gray-200 pb-5 mb-5">
            <h2 className="text-lg font-medium text-gray-900">Service Information</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Service</p>
                <p className="text-md text-gray-900">{booking.service_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Service Details</p>
                <p className="text-md text-gray-900">{booking.service_details || 'No details provided'}</p>
              </div>
            </div>
          </div>
          
          <div className="border-b border-gray-200 pb-5 mb-5">
            <h2 className="text-lg font-medium text-gray-900">Customer Information</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-md text-gray-900">{booking.customer_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-md text-gray-900">{booking.customer_email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="text-md text-gray-900">{booking.customer_phone || 'Not provided'}</p>
              </div>
              {isAdmin && (
                <div>
                  <p className="text-sm font-medium text-gray-500">User ID</p>
                  <p className="text-md text-gray-900">{booking.user_id}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="border-b border-gray-200 pb-5 mb-5">
            <h2 className="text-lg font-medium text-gray-900">Booking Details</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Date</p>
                <p className="text-md text-gray-900">{formatDate(booking.booking_date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Time</p>
                <p className="text-md text-gray-900">{booking.booking_time}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <div className="mt-2 flex items-center">
                  <span
                    className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
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
                    <div className="ml-4 flex space-x-2">
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange('confirmed')}
                          disabled={updatingStatus}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50"
                        >
                          {updatingStatus ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            <>
                              <svg className="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Confirm
                            </>
                          )}
                        </button>
                      )}
                      
                      {booking.status !== 'cancelled' && (
                        <button
                          onClick={() => handleStatusChange('cancelled')}
                          disabled={updatingStatus}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-50"
                        >
                          {updatingStatus ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            <>
                              <svg className="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel
                            </>
                          )}
                        </button>
                      )}
                      
                      {booking.status === 'cancelled' && (
                        <button
                          onClick={() => handleStatusChange('pending')}
                          disabled={updatingStatus}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                        >
                          {updatingStatus ? 'Processing...' : 'Restore to Pending'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {showCancelConfirm && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700 mb-3">Are you sure you want to cancel this booking?</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStatusChange('cancelled')}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Yes, Cancel Booking
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                      >
                        No, Keep Booking
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {isAdmin && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Booking ID</p>
                  <p className="text-md text-gray-900">{booking._id}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="border-b border-gray-200 pb-5 mb-5">
            <h2 className="text-lg font-medium text-gray-900">Booking Notes</h2>
            <div className="mt-4">
              <p className="text-md text-gray-900">
                {booking.booking_notes || 'No notes provided'}
              </p>
            </div>
          </div>
          
          {isAdmin && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                Back to List
              </button>
              <button
                onClick={handleDeleteBooking}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none"
              >
                Delete Booking
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuth(BookingDetailsPage);