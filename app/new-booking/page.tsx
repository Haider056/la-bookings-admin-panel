'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, withAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../services/api';
import { bookingsService } from '../services/api';

const services = [
  { id: 'service1', name: 'Standard Booking', duration: 60 },
  { id: 'service2', name: 'Premium Booking', duration: 90 },
  { id: 'service3', name: 'Consultation', duration: 30 },
];

const timeSlots = [
  '09:00', '10:00', '11:00', '12:00', '13:00', 
  '14:00', '15:00', '16:00', '17:00'
];

function NewBookingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>(timeSlots);
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_name: '',
    service_details: '',
    booking_date: '',
    booking_time: '',
    booking_notes: '',
  });

  // Populate form with user data if available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        customer_name: user.name || prev.customer_name,
        customer_email: user.email || prev.customer_email,
        customer_phone: user.phone || prev.customer_phone,
      }));
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // If date changes, fetch available time slots
    if (name === 'booking_date' && value) {
      fetchAvailableTimeSlots(value);
    }
  };

  const fetchAvailableTimeSlots = async (date: string) => {
    try {
      const response = await bookingsService.getAvailableTimeslots(date);
      if (response && response.availableSlots) {
        setAvailableSlots(response.availableSlots);
      } else {
        // If backend doesn't return slots, default to all slots
        setAvailableSlots(timeSlots);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      // In case of error, show all slots
      setAvailableSlots(timeSlots);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const response = await bookingsService.createBooking(formData);
      
      if (response) {
        toast.success('Booking created successfully!');
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-indigo-600">
          <h1 className="text-xl font-bold text-white">Create New Booking</h1>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              {/* Customer Information */}
              <div className="sm:col-span-2">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Customer Information
                </h2>
              </div>
              
              <div>
                <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="customer_name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="customer_email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="customer_phone"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              
              {/* Service Details */}
              <div className="sm:col-span-2 mt-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Service Details
                </h2>
              </div>
              
              <div>
                <label htmlFor="service_name" className="block text-sm font-medium text-gray-700">
                  Service
                </label>
                <select
                  id="service_name"
                  name="service_name"
                  value={formData.service_name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">Select a service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.name}>{service.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="service_details" className="block text-sm font-medium text-gray-700">
                  Service Details
                </label>
                <input
                  type="text"
                  id="service_details"
                  name="service_details"
                  value={formData.service_details}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              
              {/* Booking Time */}
              <div className="sm:col-span-2 mt-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Booking Date & Time
                </h2>
              </div>
              
              <div>
                <label htmlFor="booking_date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  id="booking_date"
                  name="booking_date"
                  value={formData.booking_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="booking_time" className="block text-sm font-medium text-gray-700">
                  Time
                </label>
                <select
                  id="booking_time"
                  name="booking_time"
                  value={formData.booking_time}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                  disabled={!formData.booking_date}
                >
                  <option value="">Select a time</option>
                  {availableSlots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                {!formData.booking_date && (
                  <p className="mt-1 text-sm text-gray-500">
                    Please select a date first
                  </p>
                )}
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="booking_notes" className="block text-sm font-medium text-gray-700">
                  Additional Notes
                </label>
                <textarea
                  id="booking_notes"
                  name="booking_notes"
                  rows={3}
                  value={formData.booking_notes}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="mr-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  loading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default withAuth(NewBookingPage); 