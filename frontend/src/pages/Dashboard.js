import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Users, CheckCircle, AlertCircle, XCircle, Clock, Key, RefreshCw, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessCodes, setAccessCodes] = useState([]);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchAccessCodes();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessCodes = async () => {
    try {
      const response = await axios.get(`${API}/access-codes`);
      setAccessCodes(response.data);
    } catch (error) {
      console.error('Error fetching access codes:', error);
    }
  };

  const generateNewCode = async () => {
    setGeneratingCode(true);
    try {
      await axios.post(`${API}/access-codes/generate`);
      await fetchAccessCodes();
    } catch (error) {
      console.error('Error generating code:', error);
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const activeCode = accessCodes.find(c => c.is_active);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Candidates',
      value: stats?.total_candidates || 0,
      icon: Users,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Shortlisted',
      value: stats?.shortlisted || 0,
      icon: CheckCircle,
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Need Investigation',
      value: stats?.investigate || 0,
      icon: AlertCircle,
      color: 'from-yellow-400 to-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Rejected',
      value: stats?.rejected || 0,
      icon: XCircle,
      color: 'from-red-400 to-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Pending Analysis',
      value: stats?.pending_analysis || 0,
      icon: Clock,
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Average Score',
      value: `${stats?.average_score || 0}/100`,
      icon: TrendingUp,
      color: 'from-cyan-400 to-cyan-600',
      bgColor: 'bg-cyan-50',
    },
  ];

  return (
    <div data-testid="dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of volunteer applications and analysis</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`${stat.bgColor} rounded-xl shadow-lg p-6 transform hover:scale-105 transition card-brand`}
              data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-semibold mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/apply"
            className="p-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-lg font-semibold text-center hover:from-yellow-500 hover:to-yellow-600 transition transform hover:scale-105"
            data-testid="quick-action-new-application"
          >
            Add New Application
          </Link>
          <Link
            to="/candidates"
            className="p-4 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white rounded-lg font-semibold text-center hover:from-cyan-500 hover:to-cyan-600 transition transform hover:scale-105"
            data-testid="quick-action-view-candidates"
          >
            View All Candidates
          </Link>
          <Link
            to="/settings"
            className="p-4 bg-gradient-to-r from-purple-400 to-purple-500 text-white rounded-lg font-semibold text-center hover:from-purple-500 hover:to-purple-600 transition transform hover:scale-105"
            data-testid="quick-action-settings"
          >
            Configure Settings
          </Link>
        </div>
      </div>

      {/* Access Code Manager Widget */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Key className="text-cyan-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Access Code Manager</h2>
          </div>
          <button
            onClick={generateNewCode}
            disabled={generatingCode}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:from-yellow-500 hover:to-cyan-500 transition disabled:opacity-50"
            data-testid="generate-code-btn"
          >
            <RefreshCw size={18} className={generatingCode ? 'animate-spin' : ''} />
            <span>Generate New Code</span>
          </button>
        </div>
        
        {activeCode ? (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Current Active Code</p>
                <p className="text-2xl font-mono font-bold text-gray-900">{activeCode.code}</p>
              </div>
              <button
                onClick={() => copyCode(activeCode.code)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                <Copy size={18} />
                <span>{codeCopied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Share this code with applicants at: <span className="font-semibold text-cyan-600">{BACKEND_URL}/apply</span>
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-yellow-700">No active access code. Generate one to allow applications.</p>
          </div>
        )}
      </div>

      {/* Welcome Message */}
      {stats?.total_candidates === 0 && (
        <div className="mt-8 bg-gradient-to-r from-yellow-100 to-cyan-100 rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">👋</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Hidden Monkey!</h2>
          <p className="text-gray-700 mb-4">
            Start by adding your first volunteer application. Our AI will analyze candidates based on psychological fit, skills, and commitment.
          </p>
          <Link
            to="/apply"
            className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-400 to-cyan-400 text-gray-900 font-bold rounded-lg hover:from-yellow-500 hover:to-cyan-500 transition transform hover:scale-105"
          >
            Add First Application
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;