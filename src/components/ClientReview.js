// src/components/ClientReview.js
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, MessageCircle, Download, Eye, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ClientReview = ({ projectId, accessToken, onBack }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [stakeholder, setStakeholder] = useState(null);

  useEffect(() => {
    loadProject();
  }, [projectId, accessToken]);

  const loadProject = async () => {
    try {
      const { data: stakeholderData, error: stakeholderError } = await supabase
        .from('project_stakeholders')
        .select('*')
        .eq('project_id', projectId)
        .eq('access_token', accessToken)
        .single();

      if (stakeholderError) {
        throw new Error('Invalid access token or project not found');
      }

      setStakeholder(stakeholderData);

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          assets (
            *,
            comments (*),
            approvals (*)
          )
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
      setError(error.message || 'Project not found or access denied');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (assetId, status) => {
    setSubmitting(true);
    try {
      if (feedback[assetId]?.trim()) {
        const { error: commentError } = await supabase
          .from('comments')
          .insert([{
            asset_id: assetId,
            author_name: stakeholder.name,
            author_email: stakeholder.email,
            author_type: 'client',
            content: feedback[assetId].trim()
          }]);

        if (commentError) throw commentError;
      }

      const { error: approvalError } = await supabase
        .from('approvals')
        .upsert([{
          asset_id: assetId,
          stakeholder_id: stakeholder.id,
          status: status,
          feedback: feedback[assetId]?.trim() || null,
          approved_at: status === 'approved' ? new Date().toISOString() : null
        }]);

      if (approvalError) throw approvalError;

      setProject(prev => ({
        ...prev,
        assets: prev.assets.map(asset =>
          asset.id === assetId
            ? {
                ...asset,
                approvals: [
                  ...asset.approvals.filter(a => a.stakeholder_id !== stakeholder.id),
                  {
                    id: Date.now(),
                    asset_id: assetId,
                    stakeholder_id: stakeholder.id,
                    status: status,
                    feedback: feedback[assetId]?.trim() || null,
                    approved_at: status === 'approved' ? new Date().toISOString() : null
                  }
                ],
                comments: feedback[assetId]?.trim() ? [
                  ...asset.comments,
                  {
                    id: Date.now(),
                    author_name: stakeholder.name,
                    author_type: 'client',
                    content: feedback[assetId].trim(),
                    created_at: new Date().toISOString()
                  }
                ] : asset.comments
              }
            : asset
        )
      }));

      setFeedback(prev => ({
        ...prev,
        [assetId]: ''
      }));

      const statusText = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'commented on';
      alert(`Asset ${statusText}! Your feedback has been sent to the agency.`);
    } catch (error) {
      console.error('Error submitting approval:', error);
      alert('Error submitting approval. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackChange = (assetId, value) => {
    setFeedback(prev => ({
      ...prev,
      [assetId]: value
    }));
  };

  const getApprovalStatus = (asset) => {
    const approval = asset.approvals?.find(a => a.stakeholder_id === stakeholder?.id);
    return approval?.status || 'pending';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          {onBack && (
            <button 
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Return to App
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600">{project.client_company} - Project Review</p>
              <p className="text-sm text-gray-500">Reviewing as: {stakeholder.name} ({stakeholder.role})</p>
            </div>
            {onBack && (
              <button 
                onClick={onBack}
                className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                <ArrowLeft size={16} /> Back
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {project.assets && project.assets.length > 0 ? (
          <div className="space-y-8">
            {project.assets.map(asset => {
              const currentStatus = getApprovalStatus(asset);
              return (
                <div key={asset.id} className="bg-white rounded-lg border p-6">
                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-xl font-bold">🎨 {asset.name}</h2>
                      {currentStatus !== 'pending' && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          currentStatus === 'approved' ? 'bg-green-100 text-green-800' :
                          currentStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {currentStatus === 'approved' ? '✓ Approved' :
                           currentStatus === 'rejected' ? '✗ Rejected' :
                           '💬 Commented'}
                        </span>
                      )}
                    </div>
                    {asset.description && (
                      <p className="text-gray-600 mb-4">{asset.description}</p>
                    )}
                  </div>

                  {asset.file_type === 'image' && asset.file_url && (
                    <div className="mb-6">
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <img
                          src={asset.file_url}
                          alt={asset.name}
                          className="max-w-full h-auto mx-auto rounded"
                          style={{ maxHeight: '500px' }}
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <a
                          href={asset.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                        >
                          <Eye size={14} /> View Full Size
                        </a>
                        <a
                          href={asset.file_url}
                          download
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                        >
                          <Download size={14} /> Download
                        </a>
                      </div>
                    </div>
                  )}

                  {asset.file_type !== 'image' && asset.file_url && (
                    <div className="mb-6 p-4 bg-gray-50 rounded border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-sm text-gray-500">
                            {asset.file_type} • {asset.file_size ? (asset.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'}
                          </p>
                        </div>
                        <a
                          href={asset.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          Open File
                        </a>
                      </div>
                    </div>
                  )}

                  {asset.comments && asset.comments.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-medium mb-3">Comments:</h3>
                      <div className="space-y-2">
                        {asset.comments.map(comment => (
                          <div key={comment.id} className={`p-3 rounded ${
                            comment.author_type === 'client' ? 'bg-blue-50' : 'bg-gray-50'
                          }`}>
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-sm">{comment.author_name}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Feedback (Optional):
                    </label>
                    <textarea
                      value={feedback[asset.id] || ''}
                      onChange={(e) => handleFeedbackChange(asset.id, e.target.value)}
                      placeholder="Add comments or specific changes needed..."
                      className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproval(asset.id, 'approved')}
                      disabled={submitting}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle size={16} /> APPROVE
                    </button>
                    <button
                      onClick={() => handleApproval(asset.id, 'commented')}
                      disabled={submitting || !feedback[asset.id]?.trim()}
                      className="bg-yellow-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-yellow-700 disabled:opacity-50"
                    >
                      <MessageCircle size={16} /> REQUEST CHANGES
                    </button>
                    <button
                      onClick={() => handleApproval(asset.id, 'rejected')}
                      disabled={submitting}
                      className="bg-red-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle size={16} /> REJECT
                    </button>
                  </div>

                  <div className="mt-6 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                    <p className="text-sm text-blue-700">
                      🔒 This review is secure and confidential. Only authorized stakeholders can access this content.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets to review</h3>
            <p className="text-gray-600">This project doesn't have any assets uploaded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientReview;
