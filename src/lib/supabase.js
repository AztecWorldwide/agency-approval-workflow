// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for common operations
export const auth = {
  // Sign up new user
  signUp: async (email, password, userData = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData // additional user metadata
      }
    })
    return { data, error }
  },

  // Sign in existing user
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  getCurrentUser: () => {
    return supabase.auth.getUser()
  },

  // Listen to auth changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helper functions
export const db = {
  // Projects
  getProjects: async (userId) => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        assets (
          *,
          approvals (*),
          comments (*)
        )
      `)
      .eq('agency_user_id', userId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  createProject: async (projectData) => {
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
    
    return { data, error }
  },

  // Assets
  createAsset: async (assetData) => {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const assetWithUser = {
      ...assetData,
      created_by: user.id
    };
    
    const { data, error } = await supabase
      .from('assets')
      .insert([assetWithUser])
      .select()
    
    return { data, error }
  },

  // Comments
  addComment: async (commentData) => {
    const { data, error } = await supabase
      .from('comments')
      .insert([commentData])
      .select()
    
    return { data, error }
  },

  // Approvals
  updateApproval: async (approvalId, status, feedback = null) => {
    const { data, error } = await supabase
      .from('approvals')
      .update({ 
        status, 
        feedback,
        approved_at: status === 'approved' ? new Date().toISOString() : null
      })
      .eq('id', approvalId)
      .select()
    
    return { data, error }
  }
}

// File storage helper functions
export const storage = {
  // Upload file
  uploadFile: async (bucket, filePath, file) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)
    
    return { data, error }
  },

  // Get public URL
  getPublicUrl: (bucket, filePath) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return data.publicUrl
  },

  // Delete file
  deleteFile: async (bucket, filePath) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath])
    
    return { data, error }
  }
}