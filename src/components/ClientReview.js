// src/components/ClientReview.js
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, db } from '../lib/supabase';
import Comments from './Comments';
import Notification from './Notification';
import { CheckCircle, XCircle, MessageCircle, Download, Eye, ArrowLeft } from 'lucide-react';

const ClientReview = ({ projectId, accessToken }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stakeholder, setStakeholder] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  const loadProjectData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: stakeholderData, error: stakeholderError } = await db.getStakeholderByToken(projectId, accessToken);
      if (stakeholderError || !stakeholderData) {
        throw new Error('Invalid access token or project not found. Please check your link.');
      }
      setStakeholder(stakeholderData);

      // IMPORTANT: In a production app, you would use an Edge Function to securely fetch project data
      // using the validated stakeholder identity, not expose it to an anonymous query.
      // The RLS policies must allow this.
      const { data, error: projectError } = await db.getProjectForReview(projectId);
      if (projectError) throw projectError;
      
      setProject(data);
    } catch (err) {
      console.error('Error loading project for review:', err);
      setError(err.message || 'Project not found or access denied');
    } finally {
      setLoading(false);
    }
  }, [projectId, accessToken]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Set up real-time subscriptions for comments and approvals
  useEffect(() => {
    if (!project || !stakeholder) return;

    const commentSubscription = supabase
      .channel(`public:comments:project=${project.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
        const newComment = payload.new;
        setProject(currentProject => ({
            ...currentProject,
            assets: currentProject.assets.map(asset => 
                asset.id === newComment.asset_id
                ? { ...asset, comments: [...(asset.comments || []), newComment] }
                : asset
            )
        }));
      })
      .subscribe();

    const approvalSubscription = supabase
      .channel(`public:approvals:project=${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, payload => {
        const changedApproval = payload.new || payload.old;
        setProject(currentProject => ({
            ...currentProject,
            assets: currentProject.assets.map(asset => {
                if (asset.id === changedApproval.asset_id) {
                    const otherApprovals = asset.approvals.filter(a => a.stakeholder_id !== changedApproval.stakeholder_id);
                    return { ...asset, approvals: [...otherApprovals, payload.new] };
                }
                return asset;
            })
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentSubscription);
      supabase.removeChannel(approvalSubscription);
    };
  }, [project, stakeholder]);

  const handleApproval = async (assetId, status, feedback) => {
    setSubmitting(true);
    try {
      // Add comment if feedback is provided
      if (feedback?.trim()) {
        const { error: commentError } = await db.addComment({
          asset_id: assetId,
          author_name: stakeholder.name,
          author_email: stakeholder.email,
          author_type: 'client',
          content: feedback.trim()
        });
        if (commentError) throw commentError;
      }

      // Add or update approval status
      const { error: approvalError } = await db.setApproval(assetId, stakeholder.id, status, feedback);
      if (approvalError) throw approvalError;

      const statusText = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'changes requested for';
      showNotification(`Asset ${statusText}. The agency has been notified.`, 'success');
    } catch (err) {
      console.error('Error submitting approval:', err);
      showNotification('Error submitting approval. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getApprovalStatus = (asset) => {
    const approval = asset.approvals?.find(a => a.stakeholder_id === stakeholder?.id);
    return approval?.status || 'pending';
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center p-4"><div className="bg-white p-8 rounded-lg shadow-md"><h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1><p className="text-gray-600">{error}</p></div></div>;
  if (!project) return null;

  return (
    <div className="min-h-screen bg-gray-50">
       <Notification {...notification} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-sm text-gray-600">{project.client_company} - Project Review</p>
            </div>
            <div className="text-sm text-right">
                <p className="font-medium">{stakeholder.name}</p>
                <p className="text-gray-500">{stakeholder.role}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {project.assets?.length > 0 ? (
          <div className="space-y-8">
            {project.assets.map(asset => {
              const currentStatus = getApprovalStatus(asset);
              return (
                <div key={asset.id} className="bg-white rounded-lg border p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Asset Details & Preview */}
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h2 className="text-xl font-bold text-gray-800">{asset.name}</h2>
                        {currentStatus !== 'pending' && (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            currentStatus === 'approved' ? 'bg-green-100 text-green-800' :
                            currentStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-4">{asset.description || 'No description provided.'}</p>
                      
                      {asset.file_type === 'image' && asset.file_url ? (
                        <div className="mb-2 border rounded-lg p-2 bg-gray-50"><img src={asset.file_url} alt={asset.name} className="max-w-full h-auto mx-auto rounded" style={{ maxHeight: '500px' }}/></div>
                      ) : (
                        <div className="mb-4 p-4 bg-gray-50 rounded border text-center"><p className="font-medium">{asset.name}</p><p className="text-sm text-gray-500">{asset.file_type}</p></div>
                      )}
                      <div className="flex gap-4"><a href={asset.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"><Eye size={14} /> View Full Size</a><a href={asset.file_url} download className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"><Download size={14} /> Download</a></div>
                    </div>

                    {/* Feedback & Actions */}
                    <div>
                      <Comments asset={asset} user={stakeholder} isClientReview={true} showNotification={showNotification} onApproval={handleApproval} submitting={submitting} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border p-8 text-center"><h3 className="text-lg font-medium text-gray-900 mb-2">No assets to review</h3><p className="text-gray-600">This project doesn't have any assets uploaded yet.</p></div>
        )}
      </div>
    </div>
  );
};

export default ClientReview;