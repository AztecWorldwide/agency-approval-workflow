import React, { useState } from 'react';
import { db } from '../lib/supabase';
import { Send, CheckCircle, XCircle, MessageCircle } from 'lucide-react';

const Comments = ({ asset, user, isClientReview = false, showNotification, onApproval, submitting }) => {
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddComment = async () => {
    if (!commentInput.trim() || !user) return;
    setIsSubmitting(true);
    
    try {
      const commentData = {
        asset_id: asset.id,
        author_name: user.user_metadata?.full_name || user.name || user.email,
        author_email: user.email,
        author_type: isClientReview ? 'client' : 'agency',
        content: commentInput.trim()
      };

      const { error } = await db.addComment(commentData);
      if (error) throw error;
      
      setCommentInput('');
      // Real-time subscription will handle UI update
    } catch (error) {
      console.error('Error adding comment:', error);
      showNotification('Error adding comment. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClientAction = (status) => {
    if (onApproval) {
      onApproval(asset.id, status, commentInput);
      setCommentInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="font-medium mb-3 text-gray-800">Feedback &amp; Activity</h3>
      <div className="flex-grow bg-gray-50 rounded-lg p-3 border overflow-y-auto h-64 mb-4">
        {asset.comments && asset.comments.length > 0 ? (
          <div className="space-y-3">
            {asset.comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(comment => (
              <div key={comment.id} className={`p-3 rounded-lg ${comment.author_type === 'client' ? 'bg-blue-100' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm text-gray-800">{comment.author_name}</span>
                  <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-700">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500 pt-8">No comments yet.</div>
        )}
      </div>

      <div>
        <div className="relative">
          <textarea
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder={isClientReview ? "Add comments or request changes..." : "Add a comment..."}
            className="w-full p-3 pr-10 border border-gray-300 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting || submitting}
          />
          {!isClientReview && (
             <button onClick={handleAddComment} disabled={!commentInput.trim() || isSubmitting} className="absolute top-2 right-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <Send size={16} />
             </button>
          )}
        </div>
        {isClientReview && (
          <div className="flex flex-wrap gap-3 mt-3">
            <button onClick={() => handleClientAction('approved')} disabled={submitting} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 text-sm"><CheckCircle size={16} /> Approve</button>
            <button onClick={() => handleClientAction('commented')} disabled={submitting || !commentInput?.trim()} className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-yellow-600 disabled:opacity-50 text-sm"><MessageCircle size={16} /> Request Changes</button>
            <button onClick={() => handleClientAction('rejected')} disabled={submitting} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50 text-sm"><XCircle size={16} /> Reject</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Comments;