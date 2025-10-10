import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { Upload, Image as ImageIcon, Video, File as FileIcon, MoreVertical, Trash2 } from 'lucide-react';
import { Media } from '../types';

const MediaLibraryPage: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const user = useAuthStore((state) => state.user);

  const fetchMedia = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch media.');
      console.error(error);
    } else {
      setMediaItems(data as Media[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user) {
        toast.error('You must be logged in to upload files.');
        return;
      }
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      toast.loading(`Uploading ${acceptedFiles.length} file(s)...`, { id: 'upload' });

      const uploadPromises = acceptedFiles.map(async (file) => {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        const { error: insertError } = await supabase.from('media').insert({
          user_id: user.id,
          name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        });

        if (insertError) {
          throw new Error(`Failed to save ${file.name} metadata: ${insertError.message}`);
        }
      });

      try {
        await Promise.all(uploadPromises);
        toast.success(`${acceptedFiles.length} file(s) uploaded successfully!`, { id: 'upload' });
        fetchMedia();
      } catch (error: any) {
        toast.error(error.message, { id: 'upload' });
        console.error(error);
      } finally {
        setIsUploading(false);
      }
    },
    [user, fetchMedia]
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileIcon className="h-12 w-12 text-gray-400" />;
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-12 w-12 text-gray-400" />;
    if (mimeType.startsWith('video/')) return <Video className="h-12 w-12 text-gray-400" />;
    return <FileIcon className="h-12 w-12 text-gray-400" />;
  }

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Media Library</h1>
          <p className="mt-1 text-sm text-gray-600">View, upload, and manage all your media content.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={open} isLoading={isUploading}>
            <Upload className="-ml-1 mr-2 h-5 w-5" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : mediaItems.length === 0 ? (
        <Card className="mt-8 border-2 border-dashed border-gray-300">
          <div className="p-12 text-center text-gray-500">
            <p>Your media library is empty.</p>
            <p className="mt-2 text-sm">Click "Upload" or drag and drop files here to get started.</p>
          </div>
        </Card>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:grid-cols-6 xl:gap-x-8">
          {mediaItems.map((item) => (
            <div key={item.id} className="relative">
              <Card className="group aspect-w-10 aspect-h-7 block w-full overflow-hidden rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100">
                <div className="flex items-center justify-center h-full">
                  {getFileIcon(item.mime_type)}
                </div>
              </Card>
              <p className="pointer-events-none mt-2 block truncate text-sm font-medium text-gray-900">{item.name}</p>
              <p className="pointer-events-none block text-sm font-medium text-gray-500">
                {item.file_size ? `${(item.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaLibraryPage;
