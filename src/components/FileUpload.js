import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File } from 'lucide-react';
import { supabase, db } from '../lib/supabase';
import Modal from './Modal';

const FileUpload = ({ projectId, onAssetCreated, onClose, showNotification }) => {
  const [uploading, setUploading] = useState(false);
  const [assetDetails, setAssetDetails] = useState({
    name: '',
    description: ''
  });
  const [fileToUpload, setFileToUpload] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFileToUpload(acceptedFiles[0]);
      if (!assetDetails.name) {
        setAssetDetails(prev => ({ ...prev, name: acceptedFiles[0].name }));
      }
    }
  }, [assetDetails.name]);
  
  const handleUpload = async () => {
    if (!fileToUpload) {
      showNotification('Please select a file to upload.', 'error');
      return;
    }
    setUploading(true);

    try {
      const finalName = assetDetails.name.trim() || fileToUpload.name;
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `projects/${projectId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, fileToUpload);
      
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      
      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(filePath);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const assetData = {
        project_id: projectId,
        name: finalName,
        description: assetDetails.description.trim() || null,
        file_url: publicUrl,
        file_type: fileToUpload.type.startsWith('image/') ? 'image' : (fileToUpload.type.startsWith('video/') ? 'video' : 'document'),
        file_size: fileToUpload.size,
        created_by: user.id,
        stage: 'review'
      };
      
      const { data: assetResult, error: assetError } = await db.createAsset(assetData);
      
      if (assetError) throw new Error(`Failed to create asset record: ${assetError.message}`);
      
      if (onAssetCreated) onAssetCreated(assetResult[0]);
      onClose();
      
    } catch (error) {
      showNotification(error.message || 'Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB limit
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'video/*': ['.mp4', '.mov', '.avi']
    }
  });

  return (
    <Modal show={true} onClose={onClose} title="Upload New Asset">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
          <input type="text" value={assetDetails.name} onChange={(e) => handleDetailsChange('name', e.target.value)} className="w-full p-2 border border-gray-300 rounded" placeholder="e.g., Logo Design v1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
          <textarea value={assetDetails.description} onChange={(e) => handleDetailsChange('description', e.target.value)} className="w-full p-2 border border-gray-300 rounded h-20" placeholder="Describe this asset..." />
        </div>
        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
          <input {...getInputProps()} />
          <div className="space-y-2">
            <Upload className="h-8 w-8 text-gray-400 mx-auto" />
            {fileToUpload ? (
              <div>
                <p className="text-sm font-medium text-gray-900">{fileToUpload.name}</p>
                <p className="text-xs text-gray-500">{(fileToUpload.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-900">{isDragActive ? 'Drop file here' : 'Click or drag to upload'}</p>
                <p className="text-xs text-gray-500">Max 50MB</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">Cancel</button>
        <button onClick={handleUpload} disabled={!fileToUpload || uploading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {uploading ? 'Uploading...' : 'Upload Asset'}
        </button>
      </div>
    </Modal>
  );
};

export default FileUpload;