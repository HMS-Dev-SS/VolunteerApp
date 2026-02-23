import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, RefreshCw, Settings as SettingsIcon, Zap } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const [weights, setWeights] = useState({
    vibe_psychology: 40,
    skill_competency: 30,
    stability_duration: 30,
  });
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchWeights();
  }, []);

  const fetchWeights = async () => {
    try {
      const response = await axios.get(`${API}/settings/weights`);
      setWeights({
        vibe_psychology: response.data.vibe_psychology || 40,
        skill_competency: response.data.skill_competency || 30,
        stability_duration: response.data.stability_duration || 30,
      });
      setIsCustom(response.data.is_custom || false);
    } catch (error) {
      console.error('Error fetching weights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setWeights({ ...weights, [field]: parseInt(value) });
  };

  const handleSave = async () => {
    // Validate total = 100
    const total = weights.vibe_psychology + weights.skill_competency + weights.stability_duration;
    if (total !== 100) {
      setMessage({ type: 'error', text: `Weights must sum to 100. Current sum: ${total}` });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await axios.put(`${API}/settings/weights`, weights);
      setIsCustom(true);
      setMessage({ type: 'success', text: 'Custom weights saved! These will be used for all analyses.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/settings/weights/reset`);
      setWeights({
        vibe_psychology: 40,
        skill_competency: 30,
        stability_duration: 30,
      });
      setIsCustom(false);
      setMessage({ type: 'success', text: 'Reset to dynamic weights! Weights will auto-adjust based on stay duration.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset settings' });
    } finally {
      setSaving(false);
    }
  };

  const total = weights.vibe_psychology + weights.skill_competency + weights.stability_duration;
  const isValid = total === 100;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto" data-testid="settings-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center space-x-3">
          <SettingsIcon size={32} />
          <span>Settings</span>
        </h1>
        <p className="text-gray-600">Configure scoring weights for candidate analysis</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Current Mode Indicator */}
        <div className={`p-4 rounded-lg mb-6 flex items-center space-x-3 ${
          isCustom 
            ? 'bg-purple-50 border-2 border-purple-300' 
            : 'bg-blue-50 border-2 border-blue-300'
        }`}>
          <Zap size={24} className={isCustom ? 'text-purple-600' : 'text-blue-600'} />
          <div>
            <p className={`font-bold ${isCustom ? 'text-purple-700' : 'text-blue-700'}`}>
              {isCustom ? 'Custom Weights Mode' : 'Dynamic Weights Mode (Default)'}
            </p>
            <p className="text-sm text-gray-600">
              {isCustom 
                ? 'Your custom weights are being used for all analyses.' 
                : 'Weights auto-adjust based on stay duration (20+ days = Vibe-heavy, <7 days = Skill-heavy).'}
            </p>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.type === 'success'
                ? 'bg-green-50 border-l-4 border-green-500 text-green-700'
                : 'bg-red-50 border-l-4 border-red-500 text-red-700'
            }`}
            data-testid="settings-message"
          >
            {message.text}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-gradient-to-r from-yellow-50 to-cyan-50 border-2 border-yellow-300 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-2">How Scoring Works</h3>
          <p className="text-gray-700 mb-3">
            Adjust the importance of each criterion. The weights must sum to <strong>100%</strong>.
          </p>
          <ul className="space-y-2 text-gray-700">
            <li><strong>Vibe/Psychology:</strong> Measures if the candidate is a "giver" or "taker", community fit, and motivation</li>
            <li><strong>Skill Competency:</strong> Assesses if they can actually perform the role they applied for</li>
            <li><strong>Stability/Duration:</strong> Evaluates commitment level and stay duration (&lt;14 days = risky)</li>
          </ul>
        </div>

        {/* Weight Sliders */}
        <div className="space-y-8 mb-8">
          {/* Vibe/Psychology */}
          <div>
            <div className="flex justify-between mb-3">
              <label className="text-lg font-semibold text-gray-900">Vibe/Psychology</label>
              <span className="text-2xl font-bold text-cyan-600">{weights.vibe_psychology}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.vibe_psychology}
              onChange={(e) => handleChange('vibe_psychology', e.target.value)}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-cyan"
              data-testid="slider-vibe"
            />
            <p className="text-sm text-gray-600 mt-2">
              Is this person "chill" or "drama"? Are they a "giver" or a "taker"?
            </p>
          </div>

          {/* Skill Competency */}
          <div>
            <div className="flex justify-between mb-3">
              <label className="text-lg font-semibold text-gray-900">Skill Competency</label>
              <span className="text-2xl font-bold text-yellow-600">{weights.skill_competency}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.skill_competency}
              onChange={(e) => handleChange('skill_competency', e.target.value)}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-yellow"
              data-testid="slider-skill"
            />
            <p className="text-sm text-gray-600 mt-2">
              Can they actually do the job? Do they have relevant experience?
            </p>
          </div>

          {/* Stability/Duration */}
          <div>
            <div className="flex justify-between mb-3">
              <label className="text-lg font-semibold text-gray-900">Stability/Duration</label>
              <span className="text-2xl font-bold text-purple-600">{weights.stability_duration}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.stability_duration}
              onChange={(e) => handleChange('stability_duration', e.target.value)}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
              data-testid="slider-stability"
            />
            <p className="text-sm text-gray-600 mt-2">
              Are they staying long enough to be useful? Job hopping vs stability.
            </p>
          </div>
        </div>

        {/* Total Indicator */}
        <div className={`p-4 rounded-lg mb-6 text-center text-xl font-bold ${
          isValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          Total: {total}% {isValid ? '✓' : `(Must be 100%)`}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-cyan-400 text-gray-900 font-bold rounded-lg hover:from-yellow-500 hover:to-cyan-500 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            data-testid="save-button"
          >
            <Save size={20} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition flex items-center space-x-2"
            data-testid="reset-button"
          >
            <RefreshCw size={20} />
            <span>Reset to Default</span>
          </button>
        </div>

        {/* Decision Matrix Info */}
        <div className="mt-8 pt-8 border-t">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Decision Matrix</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-24 h-10 bg-red-500 rounded flex items-center justify-center text-white font-bold text-sm">
                REJECT
              </div>
              <span className="text-gray-700">0-59 points: Looking for free hotel or lack maturity</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-24 h-10 bg-yellow-500 rounded flex items-center justify-center text-gray-900 font-bold text-sm">
                INVESTIGATE
              </div>
              <span className="text-gray-700">60-79 points: Good skills but unclear vibe/duration</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-24 h-10 bg-cyan-500 rounded flex items-center justify-center text-white font-bold text-sm">
                SHORTLIST
              </div>
              <span className="text-gray-700">80-100 points: Perfect fit, understands the exchange</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider-cyan::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4DD0E1, #00BCD4);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider-yellow::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFD54F, #FDB713);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider-purple::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #BA68C8, #9C27B0);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default Settings;