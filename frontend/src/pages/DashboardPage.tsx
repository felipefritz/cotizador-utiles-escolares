import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import UserDashboard from '../components/UserDashboard';

export const DashboardPage: React.FC = () => {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <UserDashboard />;
};

export default DashboardPage;
