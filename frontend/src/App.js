import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import ApplicationForm from '@/pages/ApplicationForm';
import CandidateList from '@/pages/CandidateList';
import CandidateAnalysis from '@/pages/CandidateAnalysis';
import Settings from '@/pages/Settings';
import PublicPortal from '@/pages/PublicPortal';
import SmartParse from '@/pages/SmartParse';
import Layout from '@/components/Layout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Axios interceptor for auth
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      await axios.get(`${API}/auth/me`);
      setIsAuthenticated(true);
    } catch (error) {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-cyan-50 flex items-center justify-center">
        <div className="text-2xl text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/apply" element={<PublicPortal />} />
        <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
        <Route path="/register" element={!isAuthenticated ? <Register onLogin={handleLogin} /> : <Navigate to="/" />} />
        
        {isAuthenticated ? (
          <Route path="/" element={<Layout onLogout={handleLogout} />}>
            <Route index element={<Dashboard />} />
            <Route path="smart-parse" element={<SmartParse />} />
            <Route path="candidates" element={<CandidateList />} />
            <Route path="candidates/:id" element={<CandidateAnalysis />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;