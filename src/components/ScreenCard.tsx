import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

import Button from './ui/Button';
import Card from './ui/Card';
import Spinner from './ui/Spinner';
import { Monitor, UploadCloud } from 'lucide-react';
import { Screen, Media } from '../types';

interface ScreenCardProps {
  screen: Screen;
}

const ScreenCard: React.FC<ScreenCardProps> = ({ screen }) => {
  const [isUploading, setIsUploading] = useState(false);
  const user = useAuthStore((state) => state.user);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user) return;
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      const file = acceptedFiles[0];
      const toastId = toast.loading(`Uploading ${file.name} to ${screen.name}...`);

      try {
        // 1. Upload file to storage
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
        if (uploadError) throw new Error(uploadError.message);

        // 2. Create media record in database
        const { data: newMedia, error: insertError } = await supabase
          .from('media')
          .insert({
            user_id: user.id,
            name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
          })
          .select()
          .single();
        if (insertError) throw new Error(insertError.message);

        // 3. Add media to screen's playlist
        const currentPlaylist = Array.isArray(screen.playlist) ? screen.playlist : [];
        const newPlaylistItem = {
            id: (newMedia as Media).id,
            name: (newMedia as Media).name,
            file_path: (newMedia as Media).file_path,
            mime_type: (newMedia as Media).mime_type,
        }
        const updatedPlaylist = [...currentPlaylist, newPlaylistItem];

        const { error: updateScreenError } = await supabase
          .from('screens')
          .update({ playlist: updatedPlaylist })
          .eq('id', screen.id);
        if (updateScreenError) throw new Error(updateScreenError.message);

        toast.success(`${file.name} added to ${screen.name}!`, { id: toastId });
      } catch (error: any) {
        toast.error(`Failed: ${error.message}`, { id: toastId });
        console.error(error);
      } finally {
        setIsUploading(false);
      }
    },
    [user, screen]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple: false,
  });

  return (
    <div {...getRootProps()} className="relative">
      <input {...getInputProps()} />
      <Card className="flex flex-col h-full transition-all duration-200" style={{ outline: 'none' }}>
        <div className="p-5 flex-grow">
          <div className="flex items-center">
            <Monitor className="h-6 w-6 text-gray-400" />
            <h3 className="ml-3 text-lg font-medium text-gray-900 truncate">{screen.name}</h3>
          </div>
          <div className="mt-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                screen.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {screen.is_online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="border-t border-gray-200 bg-gray-50 px-5 py-3">
          <Link to={`/screens/${screen.id}`} onClick={(e) => isDragActive && e.preventDefault()}>
            <Button variant="secondary" className="w-full">
              Manage
            </Button>
          </Link>
        </div>
      </Card>
      
      {(isDragActive || isUploading) && (
        <div className="absolute inset-0 bg-indigo-500 bg-opacity-80 rounded-xl flex flex-col items-center justify-center text-white p-4">
          {isUploading ? (
            <>
              <Spinner className="h-8 w-8 text-white" />
              <p className="mt-2 font-semibold">Uploading...</p>
            </>
          ) : (
            <>
              <UploadCloud className="h-10 w-10" />
              <p className="mt-2 font-semibold text-center">Drop media to add to this screen</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ScreenCard;
