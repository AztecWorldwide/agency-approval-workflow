import React, { useState, useEffect, useCallback } from 'react';
import { supabase, auth, db } from './lib/supabase';
import Auth from './components/Auth';
import ClientReview from './components/ClientReview';
import FileUpload from './components/FileUpload';
import Modal from './components/Modal';
import Notification from './components/Notification';
import Comments from './components/Comments';
import { LogOut, Plus, Share2, Upload, Clock, FileText, CheckCircle, Users, ArrowLeft, Download, Eye } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentProject, setCurrentProject] = useState(null);
  
  const [isClientReview, setIsClientReview] = useState(false);
  const [clientReviewData, setClientReviewData] = useState(null);

  const [projects, setProjects] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [projectToShare, setProjectToShare] = useState(null);
  
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  const checkUser = useCallback(async () => {
    const { data: { session } } = await auth.getSession();
    setUser(session?.user ?? null);
    setLoading(false);
  }, []);

  const handleInitialLoad = useCallback(async () => {
    const path = window.location.pathname;
    const reviewMatch = path.match(/^\/review\/([^\/]+)\/([^\/]+)$/);

    if (reviewMatch) {
      const [, projectId, accessToken] = reviewMatch;
      setIsClientReview(true);
      setClientReviewData({ projectId, accessToken });
      setLoading(false);
      return;
    }
    
    await checkUser();
  }, [checkUser]);

  useEffect(() => {
    handleInitialLoad();
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      if (!isClientReview) {
        setUser(session?.user ?? null);
      }
    });
    return () => subscription.unsubscribe();
  }, [handleInitialLoad, isClientReview]);
  
  const fetchProjects = useCallback(async () => {
    if (!user) return;
    const { data, error } = await db.getProjects(user.id);
    if (error) {
      showNotification('Error loading projects', 'error');
      console.error('Error loading projects:', error);
    } else {
      setProjects(data || []);
      if (currentProject) {
        const updatedCurrentProject = data.find(p => p.id === currentProject.id);
        setCurrentProject(updatedCurrentProject || null);
      }
    }
  }, [user, currentProject?.id]);

  useEffect(() => {
    if (user) {
        fetchProjects();

        const handleUpdates = (payload) => {
          console.log('Change received!', payload);
          fetchProjects(); // Refetch all data on any change
        };

        const projectsChannel = supabase.channel('public:projects').on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, handleUpdates).subscribe();
        const assetsChannel = supabase.channel('public:assets').on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, handleUpdates).subscribe();
        const commentsChannel = supabase.channel('public:comments').on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, handleUpdates).subscribe();
        const approvalsChannel = supabase.channel('public:approvals').on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, handleUpdates).subscribe();
        
        // Fallback polling every 30 seconds
        const interval = setInterval(fetchProjects, 30000);

        return () => {
          supabase.removeChannel(projectsChannel);
          supabase.removeChannel(assetsChannel);
          supabase.removeChannel(commentsChannel);
          supabase.removeChannel(approvalsChannel);
          clearInterval(interval);
        };
    }
  }, [user, fetchProjects]);

  const createProject = async (newProjectData) => {
    if (!newProjectData.name.trim() || !newProjectData.client.trim() || !user) return;
    try {
      await db.createProject({
        name: newProjectData.name.trim(),
        client_company: newProjectData.client.trim(),
        agency_user_id: user.id,
        due_date: newProjectData.dueDate || null,
        status: 'setup'
      });
      setShowNewProjectModal(false);
      showNotification('Project created successfully!');
      // Real-time will update the list
    } catch (error) {
      showNotification('Error creating project.', 'error');
    }
  };

  const updateProjectStatus = async (projectId, newStatus) => {
    try {
      await db.updateProjectStatus(projectId, newStatus);
      showNotification('Project status updated.');
      // Real-time will update the UI
    } catch (error) {
      showNotification('Error updating project status.', 'error');
    }
  };

  const generateClientLink = async (stakeholderDetails) => {
    if (!projectToShare) return;
    try {
      const { data, error } = await db.createStakeholder(projectToShare.id, stakeholderDetails);
      if (error) throw error;
      
      const accessToken = data[0].access_token;
      const clientLink = `${window.location.origin}/review/${projectToShare.id}/${accessToken}`;
      
      await navigator.clipboard.writeText(clientLink);
      showNotification('Client review link copied to clipboard!');
      setShowShareModal(false);
      setProjectToShare(null);
    } catch (error) {
      showNotification('Error generating link.', 'error');
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    setUser(null);
    setProjects([]);
    setCurrentView('dashboard');
    setCurrentProject(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>;
  }

  if (isClientReview) {
    return <ClientReview {...clientReviewData} />;
  }

  if (!user) {
    return <Auth onAuthSuccess={checkUser} showNotification={showNotification} />;
  }

  const getStatusColor = (status) => {
    const colors = {
      'setup': 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'filming': 'bg-indigo-100 text-indigo-800',
      'editing': 'bg-purple-100 text-purple-800',
      'in-review': 'bg-yellow-100 text-yellow-800',
      'revisions': 'bg-orange-100 text-orange-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
    };
    return colors[status] || colors['setup'];
  };

  const DashboardView = () => (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agency Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.user_metadata?.full_name || user.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNewProjectModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={16} /> New Project</button>
          <button onClick={handleSignOut} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-300 transition-colors"><LogOut size={16} /> Sign Out</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border"><div className="flex items-center gap-2"><Clock className="text-yellow-500" size={20} /><span className="text-sm text-gray-600">Active Projects</span></div><div className="text-2xl font-bold text-gray-900">{projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length}</div></div>
        <div className="bg-white p-4 rounded-lg border"><div className="flex items-center gap-2"><FileText className="text-blue-500" size={20} /><span className="text-sm text-gray-600">Total Assets</span></div><div className="text-2xl font-bold text-gray-900">{projects.reduce((acc, p) => acc + (p.assets?.length || 0), 0)}</div></div>
        <div className="bg-white p-4 rounded-lg border"><div className="flex items-center gap-2"><CheckCircle className="text-green-500" size={20} /><span className="text-sm text-gray-600">Completed</span></div><div className="text-2xl font-bold text-gray-900">{projects.filter(p => p.status === 'completed').length}</div></div>
        <div className="bg-white p-4 rounded-lg border"><div className="flex items-center gap-2"><Users className="text-purple-500" size={20} /><span className="text-sm text-gray-600">Clients</span></div><div className="text-2xl font-bold text-gray-900">{new Set(projects.map(p => p.client_company)).size}</div></div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b"><h2 className="text-lg font-semibold">Your Projects</h2></div>
        {projects.length === 0 ? (
          <div className="p-8 text-center"><div className="text-gray-400 mb-4"><FileText size={48} className="mx-auto" /></div><h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3><p className="text-gray-600 mb-4">Create your first project to start managing client approvals</p><button onClick={() => setShowNewProjectModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Create Project</button></div>
        ) : (
          <div className="divide-y">
            {projects.map(project => (
              <div key={project.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start">
                  <div>
                    <h4 className="font-medium text-lg text-gray-800">{project.name}</h4>
                    <p className="text-sm text-gray-600">{project.client_company}</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>{project.status.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-gray-500">{project.assets?.length || 0} asset(s)</span>
                      {project.due_date && <span className="text-xs text-gray-500">Due: {new Date(project.due_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 sm:mt-0">
                    <button onClick={() => { setCurrentProject(project); setCurrentView('project'); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Details</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const ProjectView = () => {
    if (!currentProject) return null;
    
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setCurrentView('dashboard')} className="text-blue-600 hover:text-blue-800 flex items-center gap-1"><ArrowLeft size={16}/> Back to Dashboard</button>
        </div>
        
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentProject.name}</h1>
              <p className="text-gray-600">{currentProject.client_company}</p>
              <div className="mt-2">
                <select value={currentProject.status} onChange={(e) => updateProjectStatus(currentProject.id, e.target.value)} className={`text-xs font-medium rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 appearance-none ${getStatusColor(currentProject.status)}`}>
                  <option value="setup">Setup</option><option value="in-progress">In Progress</option><option value="filming">Filming</option><option value="editing">Editing</option><option value="in-review">In Review</option><option value="revisions">Revisions</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setProjectToShare(currentProject); setShowShareModal(true); }} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"><Share2 size={16} /> Share</button>
              <button onClick={() => setShowFileUpload(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"><Upload size={16} /> Upload Asset</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b"><h2 className="text-lg font-semibold">Assets</h2></div>
          {!currentProject.assets || currentProject.assets.length === 0 ? (
            <div className="p-8 text-center"><div className="text-gray-400 mb-4"><Upload size={48} className="mx-auto" /></div><h3 className="text-lg font-medium text-gray-900 mb-2">No assets yet</h3><p className="text-gray-600 mb-4">Upload your first asset to start the approval process</p><button onClick={() => setShowFileUpload(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Upload Asset</button></div>
          ) : (
            <div className="divide-y">
              {currentProject.assets.map(asset => (
                <div key={asset.id} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-lg">{asset.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{asset.description || 'No description.'}</p>
                    {asset.file_type === 'image' && asset.file_url ? (
                      <div className="mt-4 border rounded-lg overflow-hidden"><img src={asset.file_url} alt={asset.name} className="max-w-full h-auto" /></div>
                    ) : (
                      <div className="mt-4 p-4 bg-gray-50 rounded border text-center"><p className="font-medium">{asset.name}</p><p className="text-sm text-gray-500">{asset.file_type}</p></div>
                    )}
                    <div className="flex gap-4 mt-2">
                      <a href={asset.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"><Eye size={14} /> Preview</a>
                      <a href={asset.file_url} download target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"><Download size={14} /> Download</a>
                    </div>
                  </div>
                  <div>
                    <Comments asset={asset} user={user} showNotification={showNotification} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const NewProjectModal = () => {
    const [name, setName] = useState('');
    const [client, setClient] = useState('');
    const [dueDate, setDueDate] = useState('');
    
    const handleSubmit = (e) => {
      e.preventDefault();
      createProject({ name, client, dueDate });
      setName(''); setClient(''); setDueDate('');
    };

    return (
      <Modal show={showNewProjectModal} onClose={() => setShowNewProjectModal(false)} title="Create New Project">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700">Project Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded mt-1" required /></div>
          <div><label className="block text-sm font-medium text-gray-700">Client Company</label><input type="text" value={client} onChange={(e) => setClient(e.target.value)} className="w-full p-2 border border-gray-300 rounded mt-1" required /></div>
          <div><label className="block text-sm font-medium text-gray-700">Due Date (Optional)</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded mt-1" /></div>
          <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setShowNewProjectModal(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">Cancel</button><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Create</button></div>
        </form>
      </Modal>
    );
  };

  const ShareProjectModal = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('Reviewer');

    const handleSubmit = (e) => {
      e.preventDefault();
      generateClientLink({ name, email, role });
      setName(''); setEmail(''); setRole('Reviewer');
    };

    return (
      <Modal show={showShareModal} onClose={() => setShowShareModal(false)} title="Share Project">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">Generate a secure link for a client stakeholder to review assets.</p>
          <div><label className="block text-sm font-medium text-gray-700">Stakeholder Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded mt-1" required /></div>
          <div><label className="block text-sm font-medium text-gray-700">Stakeholder Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border border-gray-300 rounded mt-1" required /></div>
          <div><label className="block text-sm font-medium text-gray-700">Role</label><input type="text" value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border border-gray-300 rounded mt-1" required /></div>
          <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setShowShareModal(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">Cancel</button><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Generate & Copy Link</button></div>
        </form>
      </Modal>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Notification {...notification} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />
      {currentView === 'dashboard' ? <DashboardView /> : <ProjectView />}
      <NewProjectModal />
      <ShareProjectModal />
      {showFileUpload && currentProject && (
        <FileUpload
          projectId={currentProject.id}
          onAssetCreated={() => {
            showNotification('Asset uploaded successfully!');
            // Real-time will handle the update
          }}
          onClose={() => setShowFileUpload(false)}
          showNotification={showNotification}
        />
      )}
    </div>
  );
}

export default App;