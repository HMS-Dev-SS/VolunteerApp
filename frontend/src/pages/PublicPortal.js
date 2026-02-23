import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PublicPortal = () => {
  const [step, setStep] = useState('code'); // code, form, success
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    age: '',
    gender: '',
    role_applied: '',
    start_date: '',
    end_date: '',
    is_creator: false,
    instagram: '',
    portfolio_link: '',
    skills: '',
    why_volunteer: ''
  });

  const verifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API}/public/verify-code`, { code: accessCode });
      setStep('form');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid access code');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.is_creator && !formData.instagram) {
      setError('Instagram link is required for creators');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        access_code: accessCode
      };
      await axios.post(`${API}/public/apply`, submitData);
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.detail || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  if (step === 'code') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-white to-cyan-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-block w-20 h-20 rounded-full gradient-brand flex items-center justify-center mb-4">
              <span className="text-4xl">🐵</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Hidden Monkey</h1>
            <p className="text-lg text-gray-600">Volunteer Application Portal</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-center mb-6">
              <Lock className="text-cyan-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Enter Access Code</h2>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={verifyCode}>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none transition text-center text-lg font-mono"
                placeholder="Enter code"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 bg-gradient-to-r from-yellow-400 to-cyan-400 text-gray-900 font-bold rounded-lg hover:from-yellow-500 hover:to-cyan-500 transition transform hover:scale-105 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-white to-cyan-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h2>
          <p className="text-gray-700 mb-6">Thank you for applying. We'll review your application and get back to you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-cyan-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Volunteer Application</h1>
          <p className="text-gray-600">Please fill in all required fields</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Phone *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none" placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleChange} min="18" max="70" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none">
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">City</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Role Applying For *</label>
                <select name="role_applied" value={formData.role_applied} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none">
                  <option value="">Select role...</option>
                  <option value="content_creator">Content Creator / Photographer</option>
                  <option value="community_manager">Community Manager / Host</option>
                  <option value="kitchen">Kitchen / Chef</option>
                  <option value="general">General Volunteer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Start Date *</label>
                <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">End Date *</label>
                <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none" />
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" name="is_creator" checked={formData.is_creator} onChange={handleChange} className="w-5 h-5 text-cyan-600" />
                <span className="font-semibold text-gray-700">I am a Creator/Influencer</span>
              </label>
            </div>

            {formData.is_creator && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Instagram Link *</label>
                  <input type="url" name="instagram" value={formData.instagram} onChange={handleChange} required={formData.is_creator} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none" placeholder="https://instagram.com/yourhandle" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Portfolio Link</label>
                  <input type="url" name="portfolio_link" value={formData.portfolio_link} onChange={handleChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none" placeholder="YouTube, Behance, etc." />
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Skills *</label>
              <input type="text" name="skills" value={formData.skills} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none" placeholder="Yoga, Cooking, Video, Photography" />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Why do you want to volunteer? *</label>
              <textarea name="why_volunteer" value={formData.why_volunteer} onChange={handleChange} required rows="4" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none" />
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-yellow-400 to-cyan-400 text-gray-900 font-bold rounded-lg hover:from-yellow-500 hover:to-cyan-500 transition transform hover:scale-105 disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PublicPortal;