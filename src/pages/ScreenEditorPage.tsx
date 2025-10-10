import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { Plus, Shuffle, Save, Code, Image as ImageIcon, Video, File as FileIcon, Trash2, Play } from 'lucide-react';
import { Screen, Media, PlaylistItem } from '../types';
import { generatePairingCode } from '../lib/utils';

const ScreenEditorPage: React.FC = () => {
  const { screenId } = useParams<{ screenId: string }>();
  const [screen, setScreen] = useState<Screen | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  const fetchScreen = useCallback(async () => {
    if (!screenId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('screens')
      .select('*')
      .eq('id', screenId)
      .single();

    if (error) {
      toast.error('Failed to fetch screen data.');
      console.error(error);
    } else {
      const screenData = data as Screen;
      setScreen(screenData);
      setPlaylist(screenData.playlist || []);
    }
    setLoading(false);
  }, [screenId]);

  const fetchMedia = useCallback(async () => {
    setMediaLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
    setMediaLoading(false);
  }, []);

  const addToPlaylist = (media: Media) => {
    const playlistItem: PlaylistItem = {
      ...media,
      duration: media.duration || (media.mime_type?.startsWith('image/') ? 10 : 30)
    };
    setPlaylist(prev => [...prev, playlistItem]);
    toast.success('Added to playlist');
  };

  const removeFromPlaylist = (index: number) => {
    setPlaylist(prev => prev.filter((_, i) => i !== index));
    toast.success('Removed from playlist');
  };

  const shufflePlaylist = () => {
    setPlaylist(prev => [...prev].sort(() => Math.random() - 0.5));
    toast.success('Playlist shuffled');
  };

  const savePlaylist = async () => {
    if (!screenId) return;
    
    const { error } = await supabase
      .from('screens')
      .update({ playlist })
      .eq('id', screenId);

    if (error) {
      toast.error('Failed to save playlist.');
      console.error(error);
    } else {
      toast.success('Playlist saved successfully!');
    }
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileIcon className="h-6 w-6 text-gray-400" />;
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-6 w-6 text-gray-400" />;
    if (mimeType.startsWith('video/')) return <Video className="h-6 w-6 text-gray-400" />;
    return <FileIcon className="h-6 w-6 text-gray-400" />;
  };

  useEffect(() => {
    fetchScreen();
  }, [fetchScreen]);

  // Preview functionality
  useEffect(() => {
    if (playlist.length === 0) {
      setPreviewUrl(null);
      return;
    }

    const currentItem = playlist[currentPreviewIndex];
    if (!currentItem) return;

    const { data } = supabase.storage.from('media').getPublicUrl(currentItem.file_path);
    setPreviewUrl(data.publicUrl);

    // Auto-advance preview for non-video content
    if (!currentItem.mime_type?.startsWith('video/')) {
      const duration = (currentItem.duration || 10) * 1000;
      const timer = setTimeout(() => {
        setCurrentPreviewIndex((prev) => (prev + 1) % playlist.length);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [playlist, currentPreviewIndex]);

  const handleVideoEnded = () => {
    setCurrentPreviewIndex((prev) => (prev + 1) % playlist.length);
  };

  const handleShowPairingCode = async () => {
    if (!screenId) return;
    setIsGeneratingCode(true);
    const newCode = generatePairingCode();
    
    const { error } = await supabase
      .from('screens')
      .update({ pairing_code: newCode })
      .eq('id', screenId);

    if (error) {
      toast.error('Failed to generate pairing code.');
      console.error(error);
    } else {
      setPairingCode(newCode);
      setIsPairingModalOpen(true);
    }
    setIsGeneratingCode(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!screen) {
    return <p>Screen not found.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Editing: <span className="text-indigo-600">{screen.name}</span>
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Manage the playlist and settings for this screen.
      </p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Playlist */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-medium text-gray-900">Playlist</h2>
          <div className="mt-4 flex gap-2">
            <Button 
              variant="secondary" 
              onClick={() => {
                setIsMediaModalOpen(true);
                fetchMedia();
              }}
            >
              <Plus className="h-4 w-4 mr-2"/>Add Media
            </Button>
            <Button 
              variant="secondary" 
              onClick={shufflePlaylist}
              disabled={playlist.length === 0}
            >
              <Shuffle className="h-4 w-4 mr-2"/>Shuffle
            </Button>
          </div>
          <Card className="mt-4 h-96 overflow-y-auto">
            {playlist.length === 0 ? (
              <div className="p-6 text-center text-gray-500 flex items-center justify-center h-full">
                <p>Playlist is empty. Click "Add Media" to get started.</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {playlist.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(item.mime_type)}
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-32">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.duration}s</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPreviewIndex(index)}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => removeFromPlaylist(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <div className="mt-4 flex justify-between">
            <Button onClick={savePlaylist}><Save className="h-4 w-4 mr-2"/>Save Playlist</Button>
            <Button variant="secondary" onClick={handleShowPairingCode} isLoading={isGeneratingCode}>
              <Code className="h-4 w-4 mr-2"/>
              Show Pairing Code
            </Button>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-medium text-gray-900">Preview</h2>
          <div className="mt-4 aspect-video w-full">
            <Card className="h-full">
              <div className="flex items-center justify-center h-full bg-gray-800 rounded-xl overflow-hidden">
                {previewUrl && playlist[currentPreviewIndex]?.mime_type?.startsWith('image/') && (
                  <img 
                    src={previewUrl} 
                    alt={playlist[currentPreviewIndex]?.name} 
                    className="max-w-full max-h-full object-contain" 
                  />
                )}
                {previewUrl && playlist[currentPreviewIndex]?.mime_type?.startsWith('video/') && (
                  <video
                    src={previewUrl}
                    autoPlay
                    muted
                    onEnded={handleVideoEnded}
                    className="max-w-full max-h-full object-contain"
                  />
                )}
                {!previewUrl && (
                  <p className="text-white">No content to preview</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      <Modal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        title="Your Pairing Code"
      >
        <div className="text-center">
          <p className="text-gray-600">Enter this code on your display device at <code className="bg-gray-100 p-1 rounded text-sm">{window.location.origin}/pair</code></p>
          <div className="my-6 font-mono text-5xl tracking-widest font-bold text-indigo-600 bg-gray-100 p-4 rounded-lg">
            {pairingCode}
          </div>
          <p className="text-sm text-gray-500">This code is for one-time use and will be invalidated once a device connects.</p>
        </div>
      </Modal>

      <Modal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        title="Select Media"
        size="lg"
      >
        <div className="max-h-96 overflow-y-auto">
          {mediaLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No media found. Upload some files in the Media Library first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {mediaItems.map((media) => (
                <div key={media.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(media.mime_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{media.name}</p>
                      <p className="text-xs text-gray-500">
                        {media.file_size ? `${(media.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addToPlaylist(media)}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ScreenEditorPage;
