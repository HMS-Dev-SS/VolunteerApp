import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search, Eye, Calendar, Mail, Filter, ChevronDown, Trash2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-gray-500' },
  { value: 'shortlisted', label: 'Shortlisted', color: 'bg-cyan-500' },
  { value: 'investigate', label: 'Investigate', color: 'bg-yellow-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { value: 'emailed', label: 'Emailed', color: 'bg-blue-500' },
];

const CandidateList = () => {
  const [candidates, setCandidates] = useState([]);
  const [evaluations, setEvaluations] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [candidatesRes, evaluationsRes] = await Promise.all([
        axios.get(`${API}/candidates`),
        axios.get(`${API}/evaluations`),
      ]);
      
      setCandidates(candidatesRes.data);
      
      // Map evaluations by candidate_id
      const evalMap = {};
      evaluationsRes.data.forEach(evaluation => {
        evalMap[evaluation.candidate_id] = evaluation;
      });
      setEvaluations(evalMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (candidateId, newStatus) => {
    setUpdatingStatus(candidateId);
    try {
      await axios.put(`${API}/candidates/${candidateId}`, { status: newStatus });
      setCandidates(prev => 
        prev.map(c => c.id === candidateId ? { ...c, status: newStatus } : c)
      );
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (candidateId, candidateName) => {
    if (!window.confirm(`Delete "${candidateName}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/candidates/${candidateId}`);
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
    } catch (error) {
      console.error('Error deleting candidate:', error);
    }
  };

  const getDecisionBadge = (decision) => {
    const badges = {
      SHORTLIST: 'bg-cyan-500 text-white',
      INVESTIGATE: 'bg-yellow-500 text-gray-900',
      REJECT: 'bg-red-500 text-white',
    };
    return badges[decision] || 'bg-gray-500 text-white';
  };

  const getStatusColor = (status) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option ? option.color : 'bg-gray-500';
  };

  const filteredCandidates = candidates.filter(candidate => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (candidate.name || '').toLowerCase().includes(searchLower) ||
      (candidate.email || '').toLowerCase().includes(searchLower) ||
      (candidate.role_applied || '').toLowerCase().includes(searchLower) ||
      (candidate.skills || []).join(' ').toLowerCase().includes(searchLower);
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && candidate.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading candidates...</div>
      </div>
    );
  }

  return (
    <div data-testid="candidate-list">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Candidates</h1>
        <p className="text-gray-600">Manage and review volunteer applications</p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none transition"
              data-testid="search-input"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-400 focus:outline-none transition"
              data-testid="filter-select"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Candidates List */}
      {filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No candidates found</h2>
          <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
          <Link
            to="/apply"
            className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-400 to-cyan-400 text-gray-900 font-bold rounded-lg hover:from-yellow-500 hover:to-cyan-500 transition"
          >
            Add New Application
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCandidates.map(candidate => {
            const evaluation = evaluations[candidate.id];
            const aiScore = candidate.ai_score || (evaluation ? evaluation.final_score : 0);
            const scoreCategory = aiScore > 75 ? 'green' : aiScore >= 40 ? 'yellow' : 'red';
            const borderColor = scoreCategory === 'green' ? 'border-l-green-500' : scoreCategory === 'yellow' ? 'border-l-yellow-500' : 'border-l-red-500';
            
            return (
              <div
                key={candidate.id}
                className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition card-brand border-l-4 ${borderColor}`}
                data-testid={`candidate-card-${candidate.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1 mb-4 md:mb-0">
                    <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                      <h3 className="text-xl font-bold text-gray-900">{candidate.name}</h3>
                      {/* AI Score Badge */}
                      {aiScore > 0 && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          scoreCategory === 'green' ? 'bg-green-100 text-green-800' :
                          scoreCategory === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Score: {aiScore}
                        </span>
                      )}
                      {/* Quick Status Dropdown */}
                      <div className="relative inline-block">
                        <select
                          value={candidate.status}
                          onChange={(e) => handleStatusChange(candidate.id, e.target.value)}
                          disabled={updatingStatus === candidate.id}
                          className={`${getStatusColor(candidate.status)} text-white text-xs font-semibold px-3 py-1 rounded-full appearance-none cursor-pointer pr-7 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-cyan-400 disabled:opacity-50`}
                          data-testid={`status-select-${candidate.id}`}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value} className="bg-gray-800">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                      </div>
                      {evaluation && (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDecisionBadge(evaluation.decision)}`}>
                          {evaluation.decision}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Mail size={16} />
                        <span>{candidate.email}</span>
                      </div>
                      {candidate.role_applied && (
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">Role:</span>
                          <span>{candidate.role_applied}</span>
                        </div>
                      )}
                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">Skills:</span>
                          <span>{candidate.skills.join(', ')}</span>
                        </div>
                      )}
                      {candidate.duration_days && (
                        <div className="flex items-center space-x-2">
                          <Calendar size={16} />
                          <span>{candidate.duration_days} days</span>
                        </div>
                      )}
                    </div>
                    {evaluation && (
                      <div className="mt-3">
                        <div className="text-sm font-semibold text-gray-700 mb-1">Score Breakdown:</div>
                        <div className="flex space-x-4 text-sm">
                          <span className="text-cyan-600">Vibe: {evaluation.vibe_score}/100</span>
                          <span className="text-yellow-600">Skills: {evaluation.skill_score}/100</span>
                          <span className="text-purple-600">Stability: {evaluation.stability_score}/100</span>
                          <span className="font-bold text-gray-900">Total: {evaluation.total_score}/100</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <Link
                      to={`/candidates/${candidate.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white rounded-lg hover:from-cyan-500 hover:to-cyan-600 transition flex items-center space-x-2"
                      data-testid={`view-button-${candidate.id}`}
                    >
                      <Eye size={18} />
                      <span>View Details</span>
                    </Link>
                    <button
                      onClick={() => handleDelete(candidate.id, candidate.name)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                      data-testid={`delete-button-${candidate.id}`}
                      title="Delete candidate"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CandidateList;