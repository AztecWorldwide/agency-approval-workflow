import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =============================================
// RLS POLICIES EXAMPLES (add these in your Supabase dashboard)
// =============================================
//
// -- Enable RLS for all tables
// ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
// ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
// ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
// ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
// ALTER TABLE project_stakeholders ENABLE ROW LEVEL SECURITY;
//
// -- PROJECTS TABLE
// -- Allow users to see and manage their own projects
// CREATE POLICY "Users can manage their own projects"
// ON projects FOR ALL
// USING (auth.uid() = agency_user_id);
//
// -- ASSETS TABLE
// -- Allow users to manage assets for projects they own
// CREATE POLICY "Users can manage assets in their projects"
// ON assets FOR ALL
// USING (
//   (SELECT agency_user_id FROM projects WHERE id = assets.project_id) = auth.uid()
// );
//
// -- COMMENTS TABLE
// -- Allow users to manage comments in projects they own
// CREATE POLICY "Users can manage comments in their projects"
// ON comments FOR ALL
// USING (
//   (SELECT agency_user_id FROM projects WHERE id = (SELECT project_id FROM assets WHERE id = comments.asset_id)) = auth.uid()
// );
//
// -- PROJECT_STAKEHOLDERS TABLE
// -- Allow users to manage stakeholders for their own projects
// CREATE POLICY "Users can manage stakeholders for their projects"
// ON project_stakeholders FOR ALL
// USING (
//   (SELECT agency_user_id FROM projects WHERE id = project_stakeholders.project_id) = auth.uid()
// );
//
// -- POLICIES FOR CLIENT REVIEW ACCESS (MORE COMPLEX)
// -- This requires a custom function to verify the token.
//
// -- 1. Create a function to verify a stakeholder token
// CREATE OR REPLACE FUNCTION is_stakeholder(p_project_id uuid, p_access_token text)
// RETURNS boolean AS $$
// BEGIN
//   RETURN EXISTS (
//     SELECT 1 FROM project_stakeholders
//     WHERE project_id = p_project_id AND access_token = p_access_token
//   );
// END;
// $$ LANGUAGE plpgsql SECURITY DEFINER;
//
// -- 2. Create policies that use this function for read access
// -- For projects table
// CREATE POLICY "Stakeholders can view their assigned projects"
// ON projects FOR SELECT
// USING (is_stakeholder(id, (SELECT current_setting('request.headers', true)::json->>'x-access-token')));
//
// -- For assets table
// CREATE POLICY "Stakeholders can view assets in their assigned projects"
// ON assets FOR SELECT
// USING (is_stakeholder(project_id, (SELECT current_setting('request.headers', true)::json->>'x-access-token')));
//
// -- For comments table
// CREATE POLICY "Stakeholders can view comments in their assigned projects"
// ON comments FOR SELECT
// USING (is_stakeholder((SELECT project_id FROM assets WHERE id = comments.asset_id), (SELECT current_setting('request.headers', true)::json->>'x-access-token')));
//
// -- For approvals table
// CREATE POLICY "Stakeholders can view approvals in their assigned projects"
// ON approvals FOR SELECT
// USING (is_stakeholder((SELECT project_id FROM assets WHERE id = approvals.asset_id), (SELECT current_setting('request.headers', true)::json->>'x-access-token')));
//
// -- For writing comments/approvals (requires a more complex setup, often with Edge Functions or RPC calls)
// -- A simplified RLS policy for inserts:
// CREATE POLICY "Stakeholders can insert comments and approvals"
// ON comments FOR INSERT
// WITH CHECK (is_stakeholder((SELECT project_id FROM assets WHERE id = comments.asset_id), (SELECT current_setting('request.headers', true)::json->>'x-access-token')));
//
// CREATE POLICY "Stakeholders can manage their own approvals"
// ON approvals FOR ALL
// USING (
//   (SELECT id FROM project_stakeholders WHERE project_id = (SELECT project_id FROM assets WHERE id = approvals.asset_id) AND access_token = (SELECT current_setting('request.headers', true)::json->>'x-access-token')) = stakeholder_id
// );
//
// =============================================

export const auth = supabase.auth;

export const db = {
  // Projects
  getProjects: async (userId) => {
    return supabase
      .from('projects')
      .select(`*, assets(*, approvals(*), comments(*))`)
      .eq('agency_user_id', userId)
      .order('created_at', { ascending: false });
  },

  getProjectForReview: async (projectId) => {
    // This query assumes RLS policies are in place to grant access
    // based on a stakeholder token passed in headers or via an Edge Function.
    return supabase
      .from('projects')
      .select(`*, assets(*, approvals(*), comments(*))`)
      .eq('id', projectId)
      .single();
  },

  createProject: (projectData) => {
    return supabase.from('projects').insert([projectData]).select();
  },

  updateProjectStatus: (projectId, status) => {
    return supabase.from('projects').update({ status }).eq('id', projectId);
  },

  // Assets
  createAsset: (assetData) => {
    return supabase.from('assets').insert([assetData]).select();
  },

  // Comments
  addComment: (commentData) => {
    return supabase.from('comments').insert([commentData]);
  },

  // Stakeholders & Approvals
  createStakeholder: (projectId, { name, email, role }) => {
    const accessToken = crypto.randomUUID();
    return supabase.from('project_stakeholders').insert([{
      project_id: projectId,
      email,
      name,
      role,
      access_token: accessToken,
      can_approve: true
    }]).select();
  },
  
  getStakeholderByToken: (projectId, accessToken) => {
    return supabase
      .from('project_stakeholders')
      .select('*')
      .eq('project_id', projectId)
      .eq('access_token', accessToken)
      .single();
  },

  setApproval: (assetId, stakeholderId, status, feedback) => {
    return supabase
      .from('approvals')
      .upsert({
        asset_id: assetId,
        stakeholder_id: stakeholderId,
        status: status,
        feedback: feedback?.trim() || null,
      }, {
        onConflict: 'asset_id, stakeholder_id'
      });
  }
};