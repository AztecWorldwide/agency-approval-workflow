// src/App.js
import React, { useState, useEffect } from 'react';
import { Upload, Eye, MessageCircle, Clock, CheckCircle, XCircle, Users, FileText, Plus, Send, Download, LogOut, Share2 } from 'lucide-react';
import { auth, db, storage, supabase } from './lib/supabase';
import Auth from './components/Auth';
import FileUpload from './components/FileUpload';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentProject, setCurrentProject] = useState(null);
  const [currentAsset, setCurrentAsset] = useState(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  
  // Real data from database
  const [projects, setProjects] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newProject, setNewProject] = useState({ name: '', client: '', dueDate: '' });
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  // Check if user is logged in on app load
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await auth.getCurrentUser();
        setUser(user);
        
        if (user) {
          await loadProjects(user.id);
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadProjects(session.user.id);
      } else {
        setProjects([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load projects from database
  const loadProjects = async (userId) => {
    try {
      const { data, error } = await db.getProjects(userId);
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  // Create new project
  const createProject = async () => {
    if (!newProject.name.trim() || !newProject.client.trim() || !user) return;
    
    try {
      const projectData = {
        name: newProject.name.trim(),
        client_company: newProject.client.trim(),
        agency_user_id: user.id,
        due_date: newProject.dueDate || null,
        status: 'setup'
      };

      const { data, error } = await db.createProject(projectData);
      if (error) throw error;

      // Add to local state
      setProjects(prev => [data[0], ...prev]);
      setNewProject({ name: '', client: '', dueDate: '' });
      setShowNewProjectModal(false);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project. Please try again.');
    }
  };

  // Add comment to asset
  const addComment = async (assetId) => {
    const commentText = newComment.trim();
    if (!commentText || !user) return;
    
    try {
      const commentData = {
        asset_id: assetId,
        author_name: user.user_metadata?.full_name || user.email,
        author_email: user.email,
        author_type: 'agency',
        content: commentText
      };

      const { data, error } = await db.addComment(commentData);
      if (error) throw error;

      // Update local state
      setProjects(prev => prev.map(project => ({
        ...project,
        assets: project.assets?.map(asset => 
          asset.id === assetId 
            ? { ...asset, comments: [...(asset.comments || []), data[0]] }
            : asset
        ) || []
      })));

      // Update current project if it matches
      if (currentProject) {
        setCurrentProject(prev => ({
          ...prev,
          assets: prev.assets?.map(asset => 
            asset.id === assetId 
              ? { ...asset, comments: [...(asset.comments || []), data[0]] }
              : asset
          ) || []
        }));
      }

      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment. Please try again.');
    }
  };

  // Handle asset creation
  const handleAssetCreated = (newAsset) => {
    // Add asset to the current project in projects state
    setProjects(prev => prev.map(project => 
      project.id === currentProject.id 
        ? { 
            ...project, 
            assets: [...(project.assets || []), newAsset]
          }
        : project
    ));
    
    // Update current project as well
    setCurrentProject(prev => ({
      ...prev,
      assets: [...(prev.assets || []), newAsset]
    }));
  };

  // Generate client approval link
  const generateClientLink = async (projectId) => {
    try {
      // Generate a secure token for client access
      const accessToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // In a real app, you'd save this token to the database
      // For now, just create a link
      const clientLink = `${window.location.origin}/client-review/${projectId}?token=${accessToken}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(clientLink);
      alert('Client review link copied to clipboard!\n\nShare this link with your client:\n' + clientLink);
    } catch (error) {
      console.error('Error generating client link:', error);
      // Fallback for browsers that don't support clipboard API
      const clientLink = `${window.location.origin}/client-review/${projectId}?token=${Math.random().toString(36).substring(2)}`;
      prompt('Copy this link to share with your client:', clientLink);
    }
  };

  // Handle user sign out
  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setProjects([]);
      setCurrentView('dashboard');
      setCurrentProject(null);
      setCurrentAsset(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show auth form if not logged in
  if (!user) {
    return <Auth onAuthSuccess={setUser} />;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'commented': return 'text-blue-600 bg-blue-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Mock function for handling approvals (will be implemented with client access)
  const handleApproval = (assetId, status, comment = '') => {
    // This will be implemented when we add client approval functionality
    console.log('Approval handled:', { assetId, status, comment });
  };

  // Dashboard View
  const DashboardView = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agency Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.user_metadata?.full_name || user.email}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowNewProjectModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={16} /> New Project
          </button>
          <button 
            onClick={handleSignOut}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Clock className="text-yellow-500" size={20} />
            <span className="text-sm text-gray-600">Active Projects</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{projects.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <FileText className="text-blue-500" size={20} />
            <span className="text-sm text-gray-600">Total Assets</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {projects.reduce((acc, p) => acc + (p.assets?.length || 0), 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-500" size={20} />
            <span className="text-sm text-gray-600">Completed</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {projects.filter(p => p.status === 'completed').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Users className="text-purple-500" size={20} />
            <span className="text-sm text-gray-600">Clients</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {new Set(projects.map(p => p.client_company)).size}
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Your Projects</h2>
        </div>
        
        {projects.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <FileText size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-4">Create your first project to start managing client approvals</p>
            <button 
              onClick={() => setShowNewProjectModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {projects.map(project => (
              <div key={project.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-lg">{project.name}</h4>
                    <p className="text-sm text-gray-600">{project.client_company}</p>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(project.created_at).toLocaleDateString()}
                      {project.due_date && ` • Due: ${new Date(project.due_date).toLocaleDateString()}`}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.status === 'completed' ? 'bg-green-100 text-green-800' :
                        project.status === 'in-review' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status.replace('-', ' ')}
                      </span>
                      {project.assets && project.assets.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {project.assets.length} asset{project.assets.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setCurrentProject(project);
                        setCurrentView('project');
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brand Identity Project"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Company</label>
                <input
                  type="text"
                  value={newProject.client}
                  onChange={(e) => setNewProject(prev => ({ ...prev, client: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="TechCorp Inc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  value={newProject.dueDate}
                  onChange={(e) => setNewProject(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={createProject}
                disabled={!newProject.name.trim() || !newProject.client.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Project
              </button>
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProject({ name: '', client: '', dueDate: '' });
                }}
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
          <span className="text-gray-600">{currentProject.client_company}</span>
        </div>

        {/* Project Info */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold mb-4">Project Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Status</span>
                  <p className="font-medium">{currentProject.status.replace('-', ' ')}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Created</span>
                  <p className="font-medium">{new Date(currentProject.created_at).toLocaleDateString()}</p>
                </div>
                {currentProject.due_date && (
                  <div>
                    <span className="text-sm text-gray-500">Due Date</span>
                    <p className="font-medium">{new Date(currentProject.due_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => generateClientLink(currentProject.id)}
              className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700"
            >
              <Share2 size={16} /> Share with Client
            </button>
          </div>
        </div>

        {/* Assets Section */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Assets</h2>
              <button 
                onClick={() => setShowFileUpload(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
              >
                <Upload size={16} /> Upload Asset
              </button>
            </div>
          </div>
          
          {!currentProject.assets || currentProject.assets.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <Upload size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assets yet</h3>
              <p className="text-gray-600 mb-4">Upload your first asset to start the approval process</p>
              <button 
                onClick={() => setShowFileUpload(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Upload Asset
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {currentProject.assets.map(asset => (
                <div key={asset.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{asset.name}</h3>
                      <p className="text-sm text-gray-600">
                        Uploaded: {new Date(asset.created_at).toLocaleDateString()}
                      </p>
                      {asset.description && (
                        <p className="text-sm text-gray-500 mt-1">{asset.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {asset.file_type}
                        </span>
                        {asset.file_size && (
                          <span className="text-xs text-gray-500">
                            {(asset.file_size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {asset.file_url && (
                        <a
                          href={asset.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                        >
                          <Download size={14} /> Download
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Asset Preview */}
                  {asset.file_type === 'image' && asset.file_url && (
                    <div className="mb-4">
                      <img 
                        src={asset.file_url} 
                        alt={asset.name} 
                        className="max-w-md max-h-64 rounded border object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Comments */}
                  {asset.comments && asset.comments.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Comments:</h4>
                      <div className="space-y-2">
                        {asset.comments.map(comment => (
                          <div key={comment.id} className="p-2 bg-blue-50 rounded">
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

                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addComment(asset.id);
                        }
                      }}
                      placeholder="Add a comment..."
                      className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                      onClick={() => addComment(asset.id)}
                      disabled={!newComment.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send size={14} /> Send
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'project' && <ProjectView />}
      
      {/* File Upload Modal */}
      {showFileUpload && currentProject && (
        <FileUpload
          projectId={currentProject.id}
          onAssetCreated={handleAssetCreated}
          onClose={() => setShowFileUpload(false)}
        />
      )}
    </div>
  );
}

export default App;