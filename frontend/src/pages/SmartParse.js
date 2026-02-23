import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Edit, Check, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SmartParse = () => {
  const [rawText, setRawText] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleParse = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/smart-parse`, { raw_text: rawText });
      setExtractedData(response.data.extracted_data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse text');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/smart-parse/confirm`, extractedData);
      setSuccess(true);
      setTimeout(() => {
        setRawText('');
        setExtractedData(null);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError('Failed to create candidate');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setExtractedData(null);
  };

  const updateField = (field, value) => {
    setExtractedData({ ...extractedData, [field]: value });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center space-x-2">
          <Sparkles className="text-yellow-500" />
          <span>Smart Parse</span>
        </h1>
        <p className="text-gray-600">Paste WhatsApp/DM text and let AI extract candidate data</p>
      </div>

      {!extractedData ? (
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows="12"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none mb-4 font-mono text-sm"
            placeholder="Paste WhatsApp message here...\n\nExample:\nHi! I'm Sarah, contact me at sarah@email.com or +919876543210. I want to volunteer from Jan 10 to Feb 10. I'm a yoga instructor and content creator. Check my Instagram @sarah_yoga"
          />

          <button
            onClick={handleParse}
            disabled={!rawText || loading}
            className="w-full py-3 bg-gradient-to-r from-yellow-400 to-cyan-400 text-gray-900 font-bold rounded-lg hover:from-yellow-500 hover:to-cyan-500 transition disabled:opacity-50"
          >
            {loading ? 'Parsing...' : '✨ Parse with AI'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-8">
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
              <p className="text-green-700 font-semibold">✓ Candidate created successfully!</p>
            </div>
          )}

          <div className="bg-gradient-to-r from-yellow-50 to-cyan-50 p-4 rounded-lg mb-6">
            <p className="font-semibold text-gray-900">Confidence: {extractedData.confidence}%</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input type="text" value={extractedData.name || ''} onChange={(e) => updateField('name', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input type="email" value={extractedData.email || ''} onChange={(e) => updateField('email', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <input type="tel" value={extractedData.phone || ''} onChange={(e) => updateField('phone', e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Property (Where volunteering)</label>
                <input type="text" value={extractedData.property_name || extractedData.city || ''} onChange={(e) => updateField('property_name', e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Varanasi, Darjeeling, etc." />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Age</label>
                <input type="number" value={extractedData.age || ''} onChange={(e) => updateField('age', parseInt(e.target.value) || null)} className="w-full px-3 py-2 border rounded-lg" min="18" max="70" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Gender</label>
                <select value={extractedData.gender || ''} onChange={(e) => updateField('gender', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <select value={extractedData.role_applied || ''} onChange={(e) => updateField('role_applied', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Select role...</option>
                  <option value="content_creator">Content Creator</option>
                  <option value="community_manager">Community Manager</option>
                  <option value="kitchen">Kitchen / Chef</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                <input type="date" value={extractedData.start_date || ''} onChange={(e) => updateField('start_date', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                <input type="date" value={extractedData.end_date || ''} onChange={(e) => updateField('end_date', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-3 cursor-pointer mb-2">
                <input 
                  type="checkbox" 
                  checked={extractedData.is_creator || false} 
                  onChange={(e) => updateField('is_creator', e.target.checked)} 
                  className="w-5 h-5 text-cyan-600" 
                />
                <span className="font-semibold text-gray-700">Is Creator/Influencer</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Instagram (if creator)</label>
              <input type="text" value={extractedData.instagram || ''} onChange={(e) => updateField('instagram', e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="@handle or URL" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Skills (comma-separated)</label>
              <input type="text" value={extractedData.skills?.join(', ') || ''} onChange={(e) => updateField('skills', e.target.value.split(',').map(s => s.trim()))} className="w-full px-3 py-2 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Why Volunteer</label>
              <textarea value={extractedData.why_volunteer || ''} onChange={(e) => updateField('why_volunteer', e.target.value)} rows="3" className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          <div className="flex space-x-4">
            <button onClick={handleConfirm} disabled={loading} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition flex items-center justify-center space-x-2">
              <Check size={20} />
              <span>Confirm & Create</span>
            </button>
            <button onClick={handleCancel} className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition flex items-center space-x-2">
              <X size={20} />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartParse;