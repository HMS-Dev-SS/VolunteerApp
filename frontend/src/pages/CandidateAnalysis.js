import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Brain, Mail, AlertCircle, CheckCircle, XCircle, RefreshCw, Copy, Calculator, Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CandidateAnalysis = () => {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const [emailData, setEmailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [reEvaluating, setReEvaluating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [fetchingIG, setFetchingIG] = useState(false);
  const [igFetchResult, setIgFetchResult] = useState(null);

  const fetchCandidate = useCallback(async () => {
    try {
      const candidateRes = await axios.get(`${API}/candidates/${id}`);
      setCandidate(candidateRes.data);

      // Try to fetch existing evaluation
      try {
        const evalRes = await axios.get(`${API}/evaluations/candidate/${id}`);
        setEvaluation(evalRes.data);
      } catch (err) {
        setEvaluation(null);
      }
    } catch (error) {
      setError('Failed to load candidate');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  // Sync admin notes when candidate loads
  useEffect(() => {
    if (candidate) {
      setAdminNotes(candidate.admin_notes || '');
    }
  }, [candidate]);

  // Save admin notes
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      await axios.put(`${API}/candidates/${id}`, { admin_notes: adminNotes });
      setCandidate({...candidate, admin_notes: adminNotes});
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err) {
      setError('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  // Fetch Instagram data
  const handleFetchInstagram = async () => {
    if (!candidate?.instagram) {
      setIgFetchResult({ success: false, error: 'No Instagram URL provided' });
      return;
    }
    
    setFetchingIG(true);
    setIgFetchResult(null);
    
    try {
      const response = await axios.post(`${API}/instagram/fetch`, {
        instagram_url: candidate.instagram
      });
      
      if (response.data.success) {
        // Update candidate with fetched followers
        const followers = response.data.followers;
        await axios.put(`${API}/candidates/${id}`, { instagram_followers: followers });
        setCandidate({...candidate, instagram_followers: followers});
        setIgFetchResult({ success: true, followers });
      } else {
        setIgFetchResult({ success: false, error: response.data.error });
      }
    } catch (err) {
      setIgFetchResult({ success: false, error: 'Failed to fetch Instagram data' });
    } finally {
      setFetchingIG(false);
    }
  };

  // NEW: Calculate algorithmic score
  const handleCalculateScore = async () => {
    setScoring(true);
    setError('');

    try {
      const response = await axios.post(`${API}/candidates/${id}/score`);
      setScoreBreakdown(response.data);
      // Refresh candidate to get updated ai_score
      const candidateRes = await axios.get(`${API}/candidates/${id}`);
      setCandidate(candidateRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Score calculation failed');
    } finally {
      setScoring(false);
    }
  };

  // NEW: Generate email using V2 templates
  const handleGenerateEmail = async () => {
    setGeneratingEmail(true);
    setError('');

    try {
      const response = await axios.post(`${API}/candidates/${id}/generate-email-v2`);
      setEmailData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Email generation failed');
    } finally {
      setGeneratingEmail(false);
    }
  };

  const handleReEvaluate = async () => {
    setReEvaluating(true);
    setError('');

    try {
      const response = await axios.post(`${API}/candidates/${id}/re-evaluate`);
      setEvaluation(response.data);
      const candidateRes = await axios.get(`${API}/candidates/${id}`);
      setCandidate(candidateRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Re-evaluation failed');
    } finally {
      setReEvaluating(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');

    try {
      const response = await axios.post(`${API}/evaluations/analyze/${id}`);
      setEvaluation(response.data.evaluation);
      setCandidate(response.data.candidate);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const copyEmail = () => {
    if (emailData) {
      const emailText = `Subject: ${emailData.subject}\n\n${emailData.body}`;
      navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (evaluation) {
      const emailText = `Subject: ${evaluation.email_subject}\n\n${evaluation.email_body}`;
      navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getScoreColor = (score) => {
    if (score > 75) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score > 75) return 'bg-green-50 border-green-200';
    if (score >= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading candidate...</div>
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <p className="text-red-700">{error}</p>
          <Link to="/candidates" className="text-red-900 underline mt-4 inline-block">
            Back to Candidates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link to="/candidates" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft size={20} />
          <span>Back to Candidates</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidate Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{candidate.name}</h2>
            <div className="space-y-3 text-gray-700">
              <p><span className="font-semibold">Email:</span> {candidate.email}</p>
              <p><span className="font-semibold">Phone:</span> {candidate.phone}</p>
              {candidate.city && <p><span className="font-semibold">City:</span> {candidate.city}</p>}
              {candidate.age && <p><span className="font-semibold">Age:</span> {candidate.age}</p>}
              {candidate.gender && <p><span className="font-semibold">Gender:</span> {candidate.gender}</p>}
              {candidate.role_applied && <p><span className="font-semibold">Role:</span> {candidate.role_applied}</p>}
              <p><span className="font-semibold">Duration:</span> {candidate.duration_days || 'N/A'} days</p>
              <p><span className="font-semibold">Creator:</span> {candidate.is_creator ? 'Yes' : 'No'}</p>
              {candidate.instagram && <p><span className="font-semibold">Instagram:</span> {candidate.instagram}</p>}
              {candidate.portfolio_link && <p><span className="font-semibold">Portfolio:</span> <a href={candidate.portfolio_link} target="_blank" rel="noopener noreferrer" className="text-cyan-600 underline">View</a></p>}
              <p><span className="font-semibold">Skills:</span> {candidate.skills?.join(', ') || 'N/A'}</p>
              <p><span className="font-semibold">Status:</span> <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded">{candidate.status}</span></p>
            </div>
          </div>

          {/* Influencer Metrics - Only show if creator */}
          {candidate.is_creator && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Influencer Metrics</h3>
              <p className="text-sm text-gray-500 mb-4">Enter verified follower/engagement data to improve scoring accuracy</p>
              <div className="space-y-4">
                {/* Fetch from Instagram button */}
                {candidate.instagram && (
                  <div>
                    <button
                      onClick={handleFetchInstagram}
                      disabled={fetchingIG}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                      data-testid="fetch-instagram-btn"
                    >
                      <Download size={18} />
                      <span>{fetchingIG ? 'Fetching...' : 'Fetch from Instagram'}</span>
                    </button>
                    {igFetchResult && (
                      <div className={`mt-2 text-sm p-2 rounded ${igFetchResult.success ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {igFetchResult.success 
                          ? `✓ Found ${igFetchResult.followers?.toLocaleString()} followers` 
                          : `⚠ ${igFetchResult.error} - Enter manually below`}
                      </div>
                    )}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Instagram Followers</label>
                  <input
                    type="number"
                    value={candidate.instagram_followers || ''}
                    onChange={async (e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setCandidate({...candidate, instagram_followers: value});
                      await axios.put(`${API}/candidates/${id}`, { instagram_followers: value });
                    }}
                    placeholder="e.g., 50000"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-cyan-400 focus:outline-none"
                    data-testid="instagram-followers-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Engagement Level</label>
                  <select
                    value={candidate.instagram_engagement || ''}
                    onChange={async (e) => {
                      const value = e.target.value || null;
                      setCandidate({...candidate, instagram_engagement: value});
                      await axios.put(`${API}/candidates/${id}`, { instagram_engagement: value });
                    }}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-cyan-400 focus:outline-none"
                    data-testid="instagram-engagement-input"
                  >
                    <option value="">Select engagement level...</option>
                    <option value="great">Great (+10)</option>
                    <option value="good">Good (+5)</option>
                    <option value="average">Average (0)</option>
                    <option value="bad">Bad (-10)</option>
                  </select>
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold mb-1">Scoring:</p>
                  <ul className="space-y-1">
                    <li className="font-semibold">Followers:</li>
                    <li>• &lt;1k: -10 | 1k-2k: -5 | 2k-4k: 0</li>
                    <li>• 4k+: +1 per 2k followers</li>
                    <li className="font-semibold mt-2">Engagement:</li>
                    <li>• Great: +10 | Good: +5</li>
                    <li>• Average: 0 | Bad: -10</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Why Volunteer */}
          {candidate.why_volunteer && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Why Volunteer</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{candidate.why_volunteer}</p>
            </div>
          )}

          {/* Admin Notes */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Admin Notes</h3>
            <textarea
              value={adminNotes}
              onChange={(e) => {
                setAdminNotes(e.target.value);
                setNotesSaved(false);
              }}
              rows="4"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-cyan-400 focus:outline-none"
              placeholder="Add notes about this candidate..."
              data-testid="admin-notes-textarea"
            />
            <div className="mt-3 flex items-center space-x-3">
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes || adminNotes === (candidate?.admin_notes || '')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  notesSaved 
                    ? 'bg-green-500 text-white' 
                    : 'bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
                data-testid="save-notes-btn"
              >
                {savingNotes ? 'Saving...' : notesSaved ? '✓ Saved!' : 'Save Notes'}
              </button>
              {adminNotes !== (candidate?.admin_notes || '') && !notesSaved && (
                <span className="text-sm text-amber-600">Unsaved changes</span>
              )}
            </div>
          </div>
        </div>

        {/* Analysis Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={handleCalculateScore}
                disabled={scoring}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition disabled:opacity-50"
                data-testid="calculate-score-btn"
              >
                <Calculator size={24} />
                <span className="mt-2 font-semibold text-sm">{scoring ? 'Scoring...' : 'Calculate Score'}</span>
              </button>
              
              <button
                onClick={handleGenerateEmail}
                disabled={generatingEmail}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-cyan-400 to-cyan-500 text-white rounded-lg hover:from-cyan-500 hover:to-cyan-600 transition disabled:opacity-50"
                data-testid="generate-email-btn"
              >
                <Mail size={24} />
                <span className="mt-2 font-semibold text-sm">{generatingEmail ? 'Generating...' : 'Generate Email'}</span>
              </button>
              
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-400 to-purple-500 text-white rounded-lg hover:from-purple-500 hover:to-purple-600 transition disabled:opacity-50"
                data-testid="ai-analyze-btn"
              >
                <Brain size={24} />
                <span className="mt-2 font-semibold text-sm">{analyzing ? 'Analyzing...' : 'AI Analysis'}</span>
              </button>
              
              <button
                onClick={handleReEvaluate}
                disabled={reEvaluating || !evaluation}
                className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-green-400 to-green-500 text-white rounded-lg hover:from-green-500 hover:to-green-600 transition disabled:opacity-50"
                data-testid="re-evaluate-btn"
              >
                <RefreshCw size={24} className={reEvaluating ? 'animate-spin' : ''} />
                <span className="mt-2 font-semibold text-sm">{reEvaluating ? 'Re-evaluating...' : 'Re-evaluate'}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* NEW: Score Breakdown */}
          {scoreBreakdown && (
            <div className={`rounded-xl shadow-lg p-6 border-2 ${getScoreBg(scoreBreakdown.total_score)}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Algorithmic Score</h3>
                <span className={`text-4xl font-bold ${getScoreColor(scoreBreakdown.total_score)}`}>
                  {scoreBreakdown.total_score}/100
                </span>
              </div>
              
              <div className="mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  scoreBreakdown.score_category === 'green' ? 'bg-green-200 text-green-800' :
                  scoreBreakdown.score_category === 'yellow' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-red-200 text-red-800'
                }`}>
                  {scoreBreakdown.recommended_action}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-semibold">Stability (Duration)</span>
                  <div className="text-right">
                    <span className={`font-bold ${scoreBreakdown.breakdown.stability.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {scoreBreakdown.breakdown.stability.score > 0 ? '+' : ''}{scoreBreakdown.breakdown.stability.score}
                    </span>
                    <p className="text-xs text-gray-500">{scoreBreakdown.breakdown.stability.reason}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-semibold">Role Skills</span>
                  <div className="text-right">
                    <span className={`font-bold ${scoreBreakdown.breakdown.skill.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {scoreBreakdown.breakdown.skill.score > 0 ? '+' : ''}{scoreBreakdown.breakdown.skill.score}
                    </span>
                    <p className="text-xs text-gray-500 max-w-xs">{scoreBreakdown.breakdown.skill.reason}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-semibold">Psychometrics</span>
                  <div className="text-right">
                    <span className={`font-bold ${scoreBreakdown.breakdown.psychometric.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {scoreBreakdown.breakdown.psychometric.score > 0 ? '+' : ''}{scoreBreakdown.breakdown.psychometric.score}
                    </span>
                    <p className="text-xs text-gray-500">{scoreBreakdown.breakdown.psychometric.reason}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-semibold">Logistics</span>
                  <div className="text-right">
                    <span className={`font-bold ${scoreBreakdown.breakdown.logistics.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {scoreBreakdown.breakdown.logistics.score > 0 ? '+' : ''}{scoreBreakdown.breakdown.logistics.score}
                    </span>
                    <p className="text-xs text-gray-500">{scoreBreakdown.breakdown.logistics.reason}</p>
                  </div>
                </div>
                
                {scoreBreakdown.breakdown.penalties.score < 0 && (
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="font-semibold text-red-700">Penalties</span>
                    <div className="text-right">
                      <span className="font-bold text-red-600">{scoreBreakdown.breakdown.penalties.score}</span>
                      <p className="text-xs text-red-500">{scoreBreakdown.breakdown.penalties.reasons?.join(', ')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Commentary */}
              <div className="mt-4 p-4 bg-gray-800 text-white rounded-lg">
                <p className="text-sm font-semibold mb-1">AI Commentary:</p>
                <p className="text-gray-200 text-sm">{scoreBreakdown.ai_commentary}</p>
              </div>
            </div>
          )}

          {/* NEW: Generated Email */}
          {emailData && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                  <Mail className="text-cyan-600" />
                  <span>Generated Email (Template {emailData.template_type})</span>
                </h3>
                <button
                  onClick={copyEmail}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  <Copy size={16} />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-2">Subject: {emailData.subject}</p>
                <pre className="whitespace-pre-wrap text-gray-700 font-sans">{emailData.body}</pre>
              </div>
            </div>
          )}

          {/* Old AI Evaluation (if exists) */}
          {evaluation && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">AI Evaluation (Legacy)</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">{evaluation.vibe_score}</p>
                  <p className="text-sm text-gray-600">Vibe Score</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{evaluation.skill_score}</p>
                  <p className="text-sm text-gray-600">Skill Score</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{evaluation.stability_score}</p>
                  <p className="text-sm text-gray-600">Stability</p>
                </div>
              </div>

              <div className={`p-4 rounded-lg bg-gradient-to-r ${
                evaluation.decision === 'SHORTLIST' ? 'from-green-400 to-green-500' :
                evaluation.decision === 'INVESTIGATE' ? 'from-yellow-400 to-yellow-500' :
                'from-red-400 to-red-500'
              } text-white`}>
                <div className="flex items-center space-x-3">
                  {evaluation.decision === 'SHORTLIST' && <CheckCircle size={32} />}
                  {evaluation.decision === 'INVESTIGATE' && <AlertCircle size={32} />}
                  {evaluation.decision === 'REJECT' && <XCircle size={32} />}
                  <div>
                    <p className="text-2xl font-bold">{evaluation.decision}</p>
                    <p className="text-sm opacity-90">Final Score: {evaluation.final_score}/100</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateAnalysis;
