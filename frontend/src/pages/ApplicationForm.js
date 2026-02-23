import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Upload, Send, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VOLUNTEER_ROLES = [
  'Content Creator',
  'Kitchen/Chef',
  'Community Manager',
  'Yoga/Activity',
  'Technical Developer',
  'Creative Artist',
];

const ApplicationForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role_applied: '',
    duration_days: '',
    why_volunteer: '',
    social_media_link: '',
    social_media_notes: '',
  });
  
  const [files, setFiles] = useState({
    resume: null,
    application_screenshot: null,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFiles({ ...files, [e.target.name]: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });
      
      if (files.resume) {
        submitData.append('resume', files.resume);
      }
      if (files.application_screenshot) {
        submitData.append('application_screenshot', files.application_screenshot);
      }

      await axios.post(`${API}/candidates`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/candidates');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600">Redirecting to candidates list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto" data-testid="application-form">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">New Volunteer Application</h1>
        <p className="text-gray-600">Submit a new application for AI analysis</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 flex items-start" data-testid="form-error">
            <AlertCircle className="text-red-500 mr-3 flex-shrink-0" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Candidate Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none transition"
                placeholder="John Doe"
                data-testid="input-name"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none transition"
                placeholder="john@example.com"
                data-testid="input-email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Role Applied *</label>
              <select
                name="role_applied"
                value={formData.role_applied}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none transition"
                data-testid="input-role"
              >
                <option value="">Select a role...</option>
                {VOLUNTEER_ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Duration (days) *</label>
              <input
                type="number"
                name="duration_days"
                value={formData.duration_days}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none transition"
                placeholder="30"
                data-testid="input-duration"
              />
            </div>
          </div>

          {/* Why Volunteer */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Why do they want to volunteer? *</label>
            <textarea
              name="why_volunteer"
              value={formData.why_volunteer}
              onChange={handleChange}
              required
              rows="4"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none transition"
              placeholder="I want to volunteer because..."
              data-testid="input-why-volunteer"
            />
          </div>

          {/* Social Media */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Social Media Link (optional)</label>
            <input
              type="url"
              name="social_media_link"
              value={formData.social_media_link}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none transition"
              placeholder="https://instagram.com/username"
              data-testid="input-social-link"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Social Media Notes (optional)</label>
            <textarea
              name="social_media_notes"
              value={formData.social_media_notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none transition"
              placeholder="Notes about their social media presence, posting style, etc."
              data-testid="input-social-notes"
            />
          </div>

          {/* File Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Resume (optional)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-cyan-400 transition">
                <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                <input
                  type="file"
                  name="resume"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  className="w-full text-sm text-gray-600"
                  data-testid="input-resume"
                />
                {files.resume && <p className="text-sm text-green-600 mt-2">✓ {files.resume.name}</p>}
              </div>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Application Screenshot (optional)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-cyan-400 transition">
                <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                <input
                  type="file"
                  name="application_screenshot"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="w-full text-sm text-gray-600"
                  data-testid="input-screenshot"
                />
                {files.application_screenshot && <p className="text-sm text-green-600 mt-2">✓ {files.application_screenshot.name}</p>}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-yellow-400 to-cyan-400 text-gray-900 font-bold rounded-lg hover:from-yellow-500 hover:to-cyan-500 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            data-testid="submit-button"
          >
            <Send size={20} />
            <span>{loading ? 'Submitting...' : 'Submit Application'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;