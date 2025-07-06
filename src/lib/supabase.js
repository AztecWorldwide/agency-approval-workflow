// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =============================================
// RLS & RPC FUNCTION EXAMPLES (add these in your Supabase SQL Editor)
// =============================================
/*
-- 1. Enable RLS for all relevant tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stakeholders ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for authenticated agency users
CREATE POLICY "Allow full access to own projects" ON projects FOR ALL USING (auth.uid() = agency_user_id) WITH CHECK (auth.uid() = agency_user_id);
CREATE POLICY "Allow full access to own assets" ON assets FOR ALL USING ((SELECT agency_user_id FROM projects WHERE id = assets.project_id) = auth.uid());
CREATE POLICY "Allow full access to own comments" ON comments FOR ALL USING (auth.uid() IN (SELECT p.agency_user_id FROM projects p JOIN assets a ON p.id = a.project_id WHERE a.id = comments.asset_id));
CREATE POLICY "Allow full access to own approvals" ON approvals FOR ALL USING (auth.uid() IN (SELECT p.agency_user_id FROM projects p JOIN assets a ON p.id = a.project_id WHERE a.id = approvals.asset_id));
CREATE POLICY "Allow full access to own stakeholders" ON project_stakeholders FOR ALL USING (auth.uid() IN (SELECT agency_user_id FROM projects WHERE id = project_stakeholders.project_id));

-- 3. Create RPC function for secure client review data fetching
CREATE OR REPLACE FUNCTION get_project_for_review(p_project_id uuid, p_access_token text)
RETURNS json AS $$
DECLARE
    stakeholder_info record;
    project_info json;
    project_assets jsonb;
BEGIN
    -- Find the stakeholder using the provided token and project ID
    SELECT * INTO stakeholder_info
    FROM project_stakeholders
    WHERE project_id = p_project_id AND access_token = p_access_token;

    -- If no stakeholder is found, raise an exception
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid access token or project ID';
    END IF;

    -- Fetch assets and their related comments/approvals first
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'description', a.description,
            'file_url', a.file_url,
            'file_type', a.file_type,
            'file_size', a.file_size,
            'created_at', a.created_at,
            'comments', (SELECT COALESCE(jsonb_agg(c ORDER BY c.created_at), '[]'::jsonb) FROM comments c WHERE c.asset_id = a.id),
            'approvals', (SELECT COALESCE(jsonb_agg(ap), '[]'::jsonb) FROM approvals ap WHERE ap.asset_id = a.id)
        )
    ) INTO project_assets
    FROM assets a WHERE a.project_id = p_project_id;

    -- If stakeholder is found, fetch the project data and combine with assets
    SELECT json_build_object(
        'project', jsonb_set((SELECT row_to_json(p)::jsonb FROM projects p WHERE id = p_project_id), '{assets}', COALESCE(project_assets, '[]'::jsonb)),
        'stakeholder', row_to_json(stakeholder_info)
    ) INTO project_info;

    RETURN project_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Create RPC function for secure client feedback submission
CREATE OR REPLACE FUNCTION submit_client_feedback(
    p_asset_id uuid,
    p_stakeholder_id uuid,
    p_access_token text,
    p_status text,
    p_feedback text
)
RETURNS void AS $$
DECLARE
    v_project_id uuid;
    stakeholder_info record;
BEGIN
    -- Verify stakeholder token is valid for the asset's project
    SELECT project_id INTO v_project_id FROM assets WHERE id = p_asset_id;

    SELECT * INTO stakeholder_info
    FROM project_stakeholders
    WHERE id = p_stakeholder_id AND project_id = v_project_id AND access_token = p_access_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid stakeholder credentials';
    END IF;

    -- Insert comment if feedback is provided
    IF p_feedback IS NOT NULL AND p_feedback <> '' THEN
        INSERT INTO comments (asset_id, stakeholder_id, author_type, content, author_name, author_email)
        VALUES (p_asset_id, p_stakeholder_id, 'client', p_feedback, stakeholder_info.name, stakeholder_info.email);
    END IF;

    -- Upsert approval
    INSERT INTO approvals (asset_id, stakeholder_id, status, feedback)
    VALUES (p_asset_id, p_stakeholder_id, p_status, p_feedback)
    ON CONFLICT (asset_id, stakeholder_id)
    DO UPDATE SET status = p_status, feedback = p_feedback, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
// =============================================

export const auth = supabase.auth;

export const db = {
  // Projects
  getProjects: (userId) => {
    return supabase
      .from('projects')
      .select(`*, assets(*, approvals(*), comments(*))`)
      .eq('agency_user_id', userId)
      .order('created_at', { ascending: false });
  },

  createProject: (projectData) => {
    return supabase.from('projects').insert([projectData]);
  },

  updateProjectStatus: (projectId, status) => {
    return supabase.from('projects').update({ status }).eq('id', projectId);
  },

  // Assets
  createAsset: (assetData) => {
    return supabase.from('assets').insert([assetData]).select();
  },

  // Comments (for agency user)
  addComment: (commentData) => {
    return supabase.from('comments').insert([commentData]);
  },

  // Stakeholders & Client Review
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
  
  getProjectForReview: (projectId, accessToken) => {
    return supabase.rpc('get_project_for_review', {
      p_project_id: projectId,
      p_access_token: accessToken
    });
  },

  submitClientFeedback: (assetId, stakeholderId, accessToken, status, feedback) => {
    return supabase.rpc('submit_client_feedback', {
      p_asset_id: assetId,
      p_stakeholder_id: stakeholderId,
      p_access_token: accessToken,
      p_status: status,
      p_feedback: feedback
    });
  }
};