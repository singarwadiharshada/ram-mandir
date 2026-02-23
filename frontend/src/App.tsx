import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DonationForm from './pages/public/DonationForm';
import DonationSuccess from './pages/public/DonationSuccess';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/Layout/DashboardLayout';
import DonationsPage from './pages/DonationsPage';
import PrasadItemsPage from './pages/PrasadItemsPage';
import ServicesPage from './pages/ServicesPage';
import AdminPage from './pages/AdminPage';
import './App.css';

const queryClient = new QueryClient();

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public Routes - No Login Required */}
          <Route path="/" element={<DonationForm />} />
          <Route path="/donation-success" element={<DonationSuccess />} />
          
          {/* Admin Login */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Admin Routes - Login Required */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/donations" />} />
            <Route path="donations" element={<DonationsPage />} />
            <Route path="items" element={<PrasadItemsPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="admins" element={<AdminPage />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;