import React, { useState, useEffect } from 'react';
import { Upload, Eye, MessageCircle, Clock, CheckCircle, XCircle, Users, FileText, Plus, Send, Download } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, project, client-review
  const [currentProject, setCurrentProject] = useState(null);
  const [currentAsset, setCurrentAsset] = useState(null);
  const [userType, setUserType] = useState('agency'); // agency or client
  
  // Mock data
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: 'TechCorp Brand Identity',
      client: 'TechCorp Inc.',
      status: 'in-review',
      dueDate: '2025-01-22',
      overdue: false,
      assets: [
        {
          id: 1,
          name: 'Logo Design v3',
          type: 'image',
          url: 'https://via.placeholder.com/400x200/3B82F6/white?text=TechCorp+Logo',
          stage: 'design-review',
          approvals: [
            { name: 'Sarah Martinez', role: 'CMO', status: 'approved', date: '2025-01-18' },
            { name: 'John Kim', role: 'Creative Director', status: 'commented', date: '2025-01-19' },
            { name: 'Lisa Wang', role: 'CEO', status: 'pending', date: null }
          ],
          comments: [
            { id: 1, author: 'John Kim', text: 'Love the direction! Maybe try a slightly darker blue?', date: '2025-01-19', type: 'client' }
          ]
        }
      ]
    },
    {
      id: 2,
      name: 'LocalBiz Website Copy',
      client: 'Local Business LLC',
      status: 'overdue',
      dueDate: '2025-01-19',
      overdue: true,
      assets: [
        {
          id: 2,
          name: 'Homepage Copy',
          type: 'document',
          content: 'Welcome to LocalBiz - Your trusted local partner for all your business needs...',
          stage: 'copy-review',
          approvals: [
            { name: 'Mike Roberts', role: 'Owner', status: 'pending', date: null }
          ],
          comments: []
        }
      ]
    }
  ]);

  const [newComment, setNewComment] = useState('');
  const [newProject, setNewProject] = useState({ name: '', client: '', dueDate: '' });
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'commented': return 'text-blue-600 bg-blue-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleApproval = (assetId, status, comment = '') => {
    setProjects(prev => prev.map(project => ({
      ...project,
      assets: project.assets.map(asset => {
        if (asset.id === assetId) {
          const updatedApprovals = asset.approvals.map(approval => 
            approval.status === 'pending' ? { ...approval, status, date: new Date().toISOString().split('T')[0] } : approval
          );
          const newComments = comment ? [...asset.comments, {
            id: Date.now(),
            author: 'Lisa Wang',
            text: comment,
            date: new Date().toISOString().split('T')[0],
            type: 'client'
          }] : asset.comments;
          
          return { ...asset, approvals: updatedApprovals, comments: newComments };
        }
        return asset;
      })
    })));
  };

  const addComment = (assetId) => {
    if (!newComment.trim()) return;
    
    setProjects(prev => prev.map(project => ({
      ...project,
      assets: project.assets.map(asset => 
        asset.id === assetId 
          ? {
              ...asset,
              comments: [...asset.comments, {
                id: Date.now(),
                author: userType === 'agency' ? 'Agency Team' : 'Client',
                text: newComment,
                date: new Date().toISOString().split('T')[0],
                type: userType
              }]
            }
          : asset
      )
    })));
    setNewComment('');
  };

  const createProject = () => {
    if (!newProject.name || !newProject.client) return;
    
    const project = {
      id: Date.now(),
      name: newProject.name,
      client: newProject.client,
      status: 'setup',
      dueDate: newProject.dueDate,
      overdue: false,
      assets: []
    };
    
    setProjects(prev => [...prev, project]);
    setNewProject({ name: '', client: '', dueDate: '' });
    setShowNewProjectModal(false);
  };

  // Dashboard View
  const DashboardView = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agency Dashboard</h1>
        <button 
          onClick={() => setShowNewProjectModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Clock className="text-yellow-500" size={20} />
            <span className="text-sm text-gray-600">Pending Approvals</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">8</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <XCircle className="text-red-500" size={20} />
            <span className="text-sm text-gray-600">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">2</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-500" size={20} />
            <span className="text-sm text-gray-600">Approved Today</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">5</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Users className="text-blue-500" size={20} />
            <span className="text-sm text-gray-600">Active Projects</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">12</div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Pending Approvals</h2>
        </div>
        
        {/* Overdue Section */}
        <div className="p-4 border-b bg-red-50">
          <h3 className="text-red-700 font-medium mb-3 flex items-center gap-2">
            <XCircle size={16} /> OVERDUE (1)
          </h3>
          {projects.filter(p => p.overdue).map(project => (
            <div key={project.id} className="bg-white p-3 rounded border-l-4 border-red-500 mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{project.name} - {project.client}</h4>
                  <p className="text-sm text-gray-600">Due: {project.dueDate} (1 day overdue)</p>
                  <p className="text-sm text-gray-500">Waiting on: Mike R.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setCurrentProject(project);
                      setCurrentView('project');
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View
                  </button>
                  <button className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-sm">
                    Send Reminder
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Due Today Section */}
        <div className="p-4 border-b bg-yellow-50">
          <h3 className="text-yellow-700 font-medium mb-3 flex items-center gap-2">
            <Clock size={16} /> DUE TODAY (1)
          </h3>
          {projects.filter(p => !p.overdue && p.status === 'in-review').map(project => (
            <div key={project.id} className="bg-white p-3 rounded border-l-4 border-yellow-500 mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{project.name} - {project.client}</h4>
                  <p className="text-sm text-gray-600">Due: {project.dueDate} (today at 5PM)</p>
                  <p className="text-sm text-gray-500">Waiting on: Lisa Wang (CEO)</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setCurrentProject(project);
                      setCurrentView('project');
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View Progress
                  </button>
                  <button className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                    Send Reminder
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Brand Identity Project"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  value={newProject.client}
                  onChange={(e) => setNewProject(prev => ({ ...prev, client: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="TechCorp Inc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newProject.dueDate}
                  onChange={(e) => setNewProject(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={createProject}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Create Project
              </button>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Project Detail View
  const ProjectView = () => {
    if (!currentProject) return null;
    
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{currentProject.name}</h1>
          <span className="text-gray-500">|</span>
          <span className="text-gray-600">{currentProject.client}</span>
        </div>

        {/* Project Status */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Approval Pipeline</h2>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={20} />
              <span className="text-sm">Concept</span>
              <span className="text-xs text-green-600">Approved</span>
            </div>
            <div className="w-8 h-0.5 bg-green-500"></div>
            <div className="flex items-center gap-2">
              <Clock className="text-yellow-500" size={20} />
              <span className="text-sm">Logo Design</span>
              <span className="text-xs text-yellow-600">In Review</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
              <span className="text-sm text-gray-400">Brand Guide</span>
              <span className="text-xs text-gray-400">Waiting</span>
            </div>
          </div>
        </div>

        {/* Current Assets */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Current Stage: Logo Design Review</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
                <Upload size={16} /> Upload New Version
              </button>
            </div>
          </div>
          
          {currentProject.assets.map(asset => (
            <div key={asset.id} className="p-4 border-b last:border-b-0">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-medium text-lg">{asset.name}</h3>
                  <p className="text-sm text-gray-600">
                    Due: {currentProject.dueDate} {currentProject.overdue ? '(OVERDUE)' : '(in 4 hours)'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setCurrentAsset(asset);
                      setUserType('client');
                      setCurrentView('client-review');
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <Eye size={14} /> Preview Client View
                  </button>
                </div>
              </div>

              {/* Asset Preview */}
              {asset.type === 'image' && (
                <div className="mb-4">
                  <img src={asset.url} alt={asset.name} className="max-w-md rounded border" />
                </div>
              )}
              
              {asset.type === 'document' && (
                <div className="mb-4 p-3 bg-gray-50 rounded border">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={16} />
                    <span className="font-medium">{asset.name}</span>
                  </div>
                  <p className="text-sm text-gray-700">{asset.content}</p>
                </div>
              )}

              {/* Approval Status */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Approval Status:</h4>
                <div className="space-y-2">
                  {asset.approvals.map((approval, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{approval.name}</span>
                        <span className="text-sm text-gray-600">({approval.role})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(approval.status)}`}>
                          {approval.status === 'approved' && <CheckCircle size={12} className="inline mr-1" />}
                          {approval.status === 'pending' && <Clock size={12} className="inline mr-1" />}
                          {approval.status === 'commented' && <MessageCircle size={12} className="inline mr-1" />}
                          {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                        </span>
                        {approval.date && <span className="text-xs text-gray-500">{approval.date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments */}
              {asset.comments.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Comments:</h4>
                  <div className="space-y-2">
                    {asset.comments.map(comment => (
                      <div key={comment.id} className="p-2 bg-blue-50 rounded">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{comment.author}</span>
                          <span className="text-xs text-gray-500">{comment.date}</span>
                        </div>
                        <p className="text-sm">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Comment */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 p-2 border border-gray-300 rounded"
                />
                <button 
                  onClick={() => addComment(asset.id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  <Send size={14} /> Send
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Client Review View
  const ClientReviewView = () => {
    if (!currentAsset) return null;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b p-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">{currentProject.name} Review</h1>
              <p className="text-gray-600">Due: {currentProject.dueDate} at 5:00 PM</p>
            </div>
            <button 
              onClick={() => {
                setCurrentView('project');
                setUserType('agency');
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Agency View
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg border p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">🎨 {currentAsset.name}</h2>
              <p className="text-gray-600">
                Final logo incorporating your feedback on colors and typography. Ready for brand guidelines.
              </p>
            </div>

            {/* Asset Display */}
            {currentAsset.type === 'image' && (
              <div className="mb-6">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <img 
                    src={currentAsset.url} 
                    alt={currentAsset.name} 
                    className="max-w-full h-auto mx-auto"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Eye size={14} /> View Full Size
                  </button>
                  <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>
            )}

            {/* Feedback Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YOUR FEEDBACK (Optional):
              </label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add comments or specific changes needed..."
                className="w-full p-3 border border-gray-300 rounded-lg h-24"
              />
            </div>

            {/* Current Approval Status */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">APPROVAL STATUS:</h3>
              <div className="space-y-2">
                {currentAsset.approvals.map((approval, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {approval.status === 'approved' && <CheckCircle className="text-green-500" size={16} />}
                    {approval.status === 'pending' && <Clock className="text-yellow-500" size={16} />}
                    {approval.status === 'commented' && <MessageCircle className="text-blue-500" size={16} />}
                    <span className="font-medium">{approval.name}</span>
                    <span className="text-gray-600">({approval.role})</span>
                    <span className="text-sm text-gray-500">
                      {approval.status === 'approved' && '- Approved'}
                      {approval.status === 'pending' && '- Pending (you)'}
                      {approval.status === 'commented' && `- Commented: "${currentAsset.comments.find(c => c.author.includes(approval.name.split(' ')[0]))?.text}"`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={() => handleApproval(currentAsset.id, 'approved', newComment)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-green-700"
              >
                <CheckCircle size={16} /> APPROVE
              </button>
              <button 
                onClick={() => handleApproval(currentAsset.id, 'commented', newComment)}
                className="bg-yellow-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-yellow-700"
              >
                <MessageCircle size={16} /> REQUEST CHANGES
              </button>
              <button 
                onClick={() => handleApproval(currentAsset.id, 'rejected', newComment)}
                className="bg-red-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-red-700"
              >
                <XCircle size={16} /> REJECT
              </button>
            </div>

            {/* Security Note */}
            <div className="mt-6 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
              <p className="text-sm text-blue-700">
                🔒 This review is secure and confidential. Only authorized stakeholders can access this content.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'project' && <ProjectView />}
      {currentView === 'client-review' && <ClientReviewView />}
    </div>
  );
}

export default App;