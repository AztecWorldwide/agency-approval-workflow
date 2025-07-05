// src/components/FileUpload.js
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Check, AlertCircle, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';

const FileUpload = ({ projectId, onAssetCreated, onClose }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [assetDetails, setAssetDetails] = useState({
    name: '',
    description: ''
  });

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setUploading(true);
    setError('');
    setSuccess(false);
    
    try {
      const finalName = assetDetails.name.trim() || file.name;
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const fileName = `${timestamp}-${randomId}.${fileExt}`;
      const filePath = `projects/${projectId}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      const { data: urlData } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);
      
      const fileUrl = urlData.publicUrl;
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      
      const assetData = {
        project_id: projectId,
        name: finalName,
        description: assetDetails.description.trim() || null,
        file_url: fileUrl,
        file_type: file.type.startsWith('image/') ? 'image' : 'document',
        file_size: file.size,
        created_by: user.id,
        stage: 'review'
      };
      
      const { data: assetResult, error: assetError } = await supabase
        .from('assets')
        .insert([assetData])
        .select()
        .single();
      
      if (assetError) {
        throw new Error(`Failed to create asset record: ${assetError.message}`);
      }
      
      const completeAsset = {
        ...assetResult,
        comments: [],
        approvals: []
      };
      
      setSuccess(true);
      onAssetCreated(completeAsset);
      
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      setError(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [projectId, assetDetails, onAssetCreated, onClose]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    acceptedFiles,
    rejectedFiles
  } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    }
  });

  const handleDetailsChange = (field, value) => {
    setAssetDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md text-center">
          <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Successful!</h2>
          <p className="text-gray-600">Your asset has been uploaded and is ready for review.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upload Asset</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
            <input
              type="text"
              value={assetDetails.name}
              onChange={(e) => handleDetailsChange('name', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Logo Design v1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={assetDetails.description}
              onChange={(e) => handleDetailsChange('description', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              placeholder="Describe this asset..."
            />
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : acceptedFiles.length > 0 ? (
            <div className="space-y-2">
              <File className="h-8 w-8 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-gray-900">{acceptedFiles[0].name}</p>
              <p className="text-xs text-gray-500">{(acceptedFiles[0].size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-sm font-medium text-gray-900">
                {isDragActive ? 'Drop file here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500">Images, PDF, TXT up to 10MB</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {acceptedFiles.length > 0 && !uploading && (
          <button
            onClick={() => onDrop(acceptedFiles)}
            className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Upload Asset
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
