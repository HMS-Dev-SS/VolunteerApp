import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, LogOut } from 'lucide-react';

const Layout = ({ onLogout }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/smart-parse', icon: FileText, label: 'Smart Parse' },
    { path: '/candidates', icon: Users, label: 'Candidates' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-4 border-gradient-brand">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center">
                <span className="text-2xl font-bold text-white">🐵</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Hidden Monkey</h1>
                <p className="text-sm text-gray-600">Volunteer Coordinator</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              data-testid="logout-button"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <nav className="mb-8">
          <div className="flex space-x-2 bg-white rounded-lg shadow-md p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    isActive
                      ? 'bg-gradient-to-r from-yellow-400 to-cyan-400 text-gray-900 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;