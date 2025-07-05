// src/components/Auth.js
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Building } from 'lucide-react';

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
    userType: 'agency'
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    console.log('=== AUTH DEBUG ===');
    console.log('Form data:', formData);
    console.log('Is login:', isLogin);

    try {
      if (isLogin) {
        // Sign in existing user
        console.log('Attempting sign in...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        
        console.log('Sign in result:', { data, error });
        
        if (error) throw error;
        onAuthSuccess(data.user);
      } else {
        // Sign up new user
        console.log('Attempting sign up...');
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              company_name: formData.companyName,
              user_type: formData.userType
            }
          }
        });
        
        console.log('Sign up result:', { data, error });
        
        if (error) throw error;
        
        if (data.user && !data.user.email_confirmed_at) {
          alert('Check your email for the confirmation link!');
        } else {
          onAuthSuccess(data.user);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="ml-1 font-medium text-blue-600 hover:text-blue-500"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="mt-1 relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      name="fullName"
                      type="text"
                      required={!isLogin}
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="John Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <div className="mt-1 relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      name="companyName"
                      type="text"
                      required={!isLogin}
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Design Agency LLC"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : (isLogin ? 'Sign in' : 'Sign up')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;