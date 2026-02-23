import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetData, setResetData] = useState({ username: '', newPassword: '', secretCode: '' });
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      localStorage.setItem('token', response.data.access_token);
      onLogin();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetMessage('');
    setResetLoading(true);

    try {
      await axios.post(`${API}/auth/reset-password`, {
        username: resetData.username,
        new_password: resetData.newPassword,
        secret_code: resetData.secretCode
      });
      setResetMessage('Password reset successfully! You can now login.');
      setResetData({ username: '', newPassword: '', secretCode: '' });
      setTimeout(() => setShowReset(false), 2000);
    } catch (err) {
      setResetMessage(err.response?.data?.detail || 'Reset failed. Check your secret code.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-white to-cyan-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block w-20 h-20 rounded-full gradient-brand flex items-center justify-center mb-4">
            <span className="text-4xl">🐵</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Hidden Monkey</h1>
          <p className="text-lg text-gray-600">Volunteer Coordinator Portal</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Welcome Back!</h2>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6" data-testid="login-error">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} data-testid="login-form">
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2" htmlFor="username">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none transition"
                required
                data-testid="login-username-input"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none transition"
                required
                data-testid="login-password-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-yellow-400 to-cyan-400 text-gray-900 font-bold rounded-lg hover:from-yellow-500 hover:to-cyan-500 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="login-submit-button"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => setShowReset(true)}
              className="text-gray-500 text-sm hover:text-cyan-600 transition"
              data-testid="forgot-password-link"
            >
              Forgot password?
            </button>
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-cyan-600 font-semibold hover:text-cyan-700" data-testid="register-link">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
            <button
              onClick={() => { setShowReset(false); setResetMessage(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Reset Password</h2>
            
            {resetMessage && (
              <div className={`p-4 mb-4 rounded-lg ${resetMessage.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {resetMessage}
              </div>
            )}

            <form onSubmit={handleReset}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Username</label>
                <input
                  type="text"
                  value={resetData.username}
                  onChange={(e) => setResetData({...resetData, username: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none"
                  required
                  data-testid="reset-username"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">New Password</label>
                <input
                  type="password"
                  value={resetData.newPassword}
                  onChange={(e) => setResetData({...resetData, newPassword: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none"
                  required
                  data-testid="reset-new-password"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Secret Code</label>
                <input
                  type="password"
                  value={resetData.secretCode}
                  onChange={(e) => setResetData({...resetData, secretCode: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none"
                  placeholder="Contact admin for code"
                  required
                  data-testid="reset-secret-code"
                />
              </div>
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-400 to-purple-600 text-white font-bold rounded-lg hover:from-purple-500 hover:to-purple-700 transition disabled:opacity-50"
                data-testid="reset-submit"
              >
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;