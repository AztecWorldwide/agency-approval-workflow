// src/components/ClientReview.js
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, db } from '../lib/supabase';
import Comments from './Comments';
import Notification from './Notification';
import { CheckCircle, XCircle, MessageCircle, Download, Eye } from 'lucide-react';

const ClientReview = ({ projectId, accessToken }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stakeholder, setStakeholder] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  const loadProjectData = useCallback(async () => {
    // Don't set loading to true on refetch, only on initial load
    // setLoading(true); 
    try {
      const { data, error: rpcError } = await db.getProjectForReview(projectId, accessToken);

      if (rpcError || !data) {
        throw new Error(rpcError?.message || 'Invalid access token or project not found. Please check your link.');
      }
      
      setStakeholder(data.stakeholder);
      setProject(data.project);

    } catch (err) {
      console.error('Error loading project for review:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, accessToken]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  useEffect(() => {
    if (!project) return;
    
    const handleDatabaseChange = (payload) => {
        console.log('Realtime change received:', payload);
        loadProjectData(); // Refetch all data to ensure consistency
    };

    const commentsChannel = supabase.channel(`public:comments:project=${project.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, handleDatabaseChange).subscribe();
    const approvalsChannel = supabase.channel(`public:approvals:project=${project.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, handleDatabaseChange).subscribe();

    return () => {
        supabase.removeChannel(commentsChannel);
        supabase.removeChannel(approvalsChannel);
    };
  }, [project, loadProjectData]);

  const handleApproval = async (assetId, status, feedback) => {
    setSubmitting(true);
    try {
      const { error: rpcError } = await db.submitClientFeedback(
        assetId,
        stakeholder.id,
        accessToken,
        status,
        feedback
      );

      if (rpcError) throw rpcError;

      const statusText = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'changes requested for';
      showNotification(`Asset ${statusText}. The agency has been notified.`, 'success');
    } catch (err) {
      console.error('Error submitting approval:', err);
      showNotification(err.message || 'Error submitting approval. Please try again.', 'error');
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
                      <div className="flex gap-4"><a href={asset.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"><Eye size={14} /> Preview</a><a href={asset.file_url} download target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"><Download size={14} /> Download</a></div>
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