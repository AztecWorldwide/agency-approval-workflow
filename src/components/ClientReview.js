{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // src/components/ClientReview.js\
import React, \{ useState, useEffect \} from 'react';\
import \{ CheckCircle, XCircle, MessageCircle, Download, Eye \} from 'lucide-react';\
import \{ supabase \} from '../lib/supabase';\
\
const ClientReview = (\{ projectId, accessToken \}) => \{\
  const [project, setProject] = useState(null);\
  const [loading, setLoading] = useState(true);\
  const [error, setError] = useState('');\
  const [feedback, setFeedback] = useState(\{\});\
  const [submitting, setSubmitting] = useState(false);\
\
  useEffect(() => \{\
    loadProject();\
  \}, [projectId]);\
\
  const loadProject = async () => \{\
    try \{\
      // In a real app, you'd verify the access token\
      const \{ data, error \} = await supabase\
        .from('projects')\
        .select(`\
          *,\
          assets (\
            *,\
            comments (*)\
          )\
        `)\
        .eq('id', projectId)\
        .single();\
\
      if (error) throw error;\
      setProject(data);\
    \} catch (error) \{\
      console.error('Error loading project:', error);\
      setError('Project not found or access denied');\
    \} finally \{\
      setLoading(false);\
    \}\
  \};\
\
  const handleApproval = async (assetId, status) => \{\
    setSubmitting(true);\
    try \{\
      // Add comment with feedback\
      if (feedback[assetId]) \{\
        const \{ error: commentError \} = await supabase\
          .from('comments')\
          .insert([\{\
            asset_id: assetId,\
            author_name: 'Client',\
            author_email: 'client@example.com', // In real app, get from form\
            author_type: 'client',\
            content: feedback[assetId]\
          \}]);\
\
        if (commentError) throw commentError;\
      \}\
\
      // Update project assets locally\
      setProject(prev => (\{\
        ...prev,\
        assets: prev.assets.map(asset =>\
          asset.id === assetId\
            ? \{\
                ...asset,\
                status: status,\
                comments: feedback[assetId] ? [\
                  ...asset.comments,\
                  \{\
                    id: Date.now(),\
                    author_name: 'Client',\
                    author_type: 'client',\
                    content: feedback[assetId],\
                    created_at: new Date().toISOString()\
                  \}\
                ] : asset.comments\
              \}\
            : asset\
        )\
      \}));\
\
      // Clear feedback for this asset\
      setFeedback(prev => (\{\
        ...prev,\
        [assetId]: ''\
      \}));\
\
      alert(`Asset $\{status\}! Your feedback has been sent to the agency.`);\
    \} catch (error) \{\
      console.error('Error submitting approval:', error);\
      alert('Error submitting approval. Please try again.');\
    \} finally \{\
      setSubmitting(false);\
    \}\
  \};\
\
  const handleFeedbackChange = (assetId, value) => \{\
    setFeedback(prev => (\{\
      ...prev,\
      [assetId]: value\
    \}));\
  \};\
\
  if (loading) \{\
    return (\
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">\
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>\
      </div>\
    );\
  \}\
\
  if (error) \{\
    return (\
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">\
        <div className="text-center">\
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>\
          <p className="text-gray-600">\{error\}</p>\
        </div>\
      </div>\
    );\
  \}\
\
  return (\
    <div className="min-h-screen bg-gray-50">\
      \{/* Header */\}\
      <div className="bg-white border-b">\
        <div className="max-w-4xl mx-auto px-6 py-4">\
          <h1 className="text-2xl font-bold text-gray-900">\{project.name\}</h1>\
          <p className="text-gray-600">\{project.client_company\} - Project Review</p>\
        </div>\
      </div>\
\
      \{/* Content */\}\
      <div className="max-w-4xl mx-auto px-6 py-8">\
        \{project.assets && project.assets.length > 0 ? (\
          <div className="space-y-8">\
            \{project.assets.map(asset => (\
              <div key=\{asset.id\} className="bg-white rounded-lg border p-6">\
                <div className="mb-6">\
                  <h2 className="text-xl font-bold mb-2">\uc0\u55356 \u57256  \{asset.name\}</h2>\
                  \{asset.description && (\
                    <p className="text-gray-600 mb-4">\{asset.description\}</p>\
                  )\}\
                </div>\
\
                \{/* Asset Display */\}\
                \{asset.file_type === 'image' && asset.file_url && (\
                  <div className="mb-6">\
                    <div className="border rounded-lg p-4 bg-gray-50">\
                      <img\
                        src=\{asset.file_url\}\
                        alt=\{asset.name\}\
                        className="max-w-full h-auto mx-auto rounded"\
                        style=\{\{ maxHeight: '500px' \}\}\
                      />\
                    </div>\
                    <div className="flex gap-2 mt-2">\
                      <a\
                        href=\{asset.file_url\}\
                        target="_blank"\
                        rel="noopener noreferrer"\
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"\
                      >\
                        <Eye size=\{14\} /> View Full Size\
                      </a>\
                      <a\
                        href=\{asset.file_url\}\
                        download\
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"\
                      >\
                        <Download size=\{14\} /> Download\
                      </a>\
                    </div>\
                  </div>\
                )\}\
\
                \{/* Non-image files */\}\
                \{asset.file_type !== 'image' && asset.file_url && (\
                  <div className="mb-6 p-4 bg-gray-50 rounded border">\
                    <div className="flex items-center justify-between">\
                      <div>\
                        <p className="font-medium">\{asset.name\}</p>\
                        <p className="text-sm text-gray-500">\
                          \{asset.file_type\} \'95 \{asset.file_size ? (asset.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'\}\
                        </p>\
                      </div>\
                      <a\
                        href=\{asset.file_url\}\
                        target="_blank"\
                        rel="noopener noreferrer"\
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"\
                      >\
                        Open File\
                      </a>\
                    </div>\
                  </div>\
                )\}\
\
                \{/* Existing Comments */\}\
                \{asset.comments && asset.comments.length > 0 && (\
                  <div className="mb-6">\
                    <h3 className="font-medium mb-3">Previous Comments:</h3>\
                    <div className="space-y-2">\
                      \{asset.comments.map(comment => (\
                        <div key=\{comment.id\} className="p-3 bg-gray-50 rounded">\
                          <div className="flex justify-between items-start mb-1">\
                            <span className="font-medium text-sm">\{comment.author_name\}</span>\
                            <span className="text-xs text-gray-500">\
                              \{new Date(comment.created_at).toLocaleDateString()\}\
                            </span>\
                          </div>\
                          <p className="text-sm">\{comment.content\}</p>\
                        </div>\
                      ))\}\
                    </div>\
                  </div>\
                )\}\
\
                \{/* Feedback Section */\}\
                <div className="mb-6">\
                  <label className="block text-sm font-medium text-gray-700 mb-2">\
                    Your Feedback (Optional):\
                  </label>\
                  <textarea\
                    value=\{feedback[asset.id] || ''\}\
                    onChange=\{(e) => handleFeedbackChange(asset.id, e.target.value)\}\
                    placeholder="Add comments or specific changes needed..."\
                    className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"\
                  />\
                </div>\
\
                \{/* Action Buttons */\}\
                <div className="flex gap-3">\
                  <button\
                    onClick=\{() => handleApproval(asset.id, 'approved')\}\
                    disabled=\{submitting\}\
                    className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"\
                  >\
                    <CheckCircle size=\{16\} /> APPROVE\
                  </button>\
                  <button\
                    onClick=\{() => handleApproval(asset.id, 'commented')\}\
                    disabled=\{submitting || !feedback[asset.id]?.trim()\}\
                    className="bg-yellow-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-yellow-700 disabled:opacity-50"\
                  >\
                    <MessageCircle size=\{16\} /> REQUEST CHANGES\
                  </button>\
                  <button\
                    onClick=\{() => handleApproval(asset.id, 'rejected')\}\
                    disabled=\{submitting\}\
                    className="bg-red-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-red-700 disabled:opacity-50"\
                  >\
                    <XCircle size=\{16\} /> REJECT\
                  </button>\
                </div>\
\
                \{/* Security Note */\}\
                <div className="mt-6 p-3 bg-blue-50 rounded border-l-4 border-blue-500">\
                  <p className="text-sm text-blue-700">\
                    \uc0\u55357 \u56594  This review is secure and confidential. Only authorized stakeholders can access this content.\
                  </p>\
                </div>\
              </div>\
            ))\}\
          </div>\
        ) : (\
          <div className="bg-white rounded-lg border p-8 text-center">\
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets to review</h3>\
            <p className="text-gray-600">This project doesn't have any assets uploaded yet.</p>\
          </div>\
        )\}\
      </div>\
    </div>\
  );\
\};\
\
export default ClientReview;}