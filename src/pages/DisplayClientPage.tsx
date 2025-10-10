import React, { useState, useEffect } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { PlaylistItem } from '../types';

const DisplayClientPage: React.FC = () => {
  const [pairingCode, setPairingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [screenId, setScreenId] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  // Check local storage for a paired screen on mount
  useEffect(() => {
    const storedScreenId = localStorage.getItem('signageflow_screen_id');
    if (storedScreenId) {
      setScreenId(storedScreenId);
    }
  }, []);

  // Fetch playlist and subscribe to updates when screenId is set
  useEffect(() => {
    if (!screenId) return;

    const fetchPlaylistAndSubscribe = async () => {
      // Set screen to online
      await supabase.from('screens').update({ is_online: true }).eq('id', screenId);

      const { data, error } = await supabase
        .from('screens')
        .select('playlist')
        .eq('id', screenId)
        .single();
      
      if (error || !data) {
        toast.error('Could not fetch screen data. Unpairing.');
        localStorage.removeItem('signageflow_screen_id');
        setScreenId(null);
      } else {
        setPlaylist(data.playlist as PlaylistItem[]);
      }

      const channel = supabase
        .channel(`screen-playlist-${screenId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'screens', filter: `id=eq.${screenId}` },
          (payload) => {
            toast('Playlist updated!');
            const newPlaylist = (payload.new as any).playlist as PlaylistItem[];
            setPlaylist(newPlaylist);
            setCurrentItemIndex(0); // Reset to first item
          }
        )
        .subscribe();
        
      return () => {
        supabase.from('screens').update({ is_online: false }).eq('id', screenId);
        supabase.removeChannel(channel);
      };
    };

    fetchPlaylistAndSubscribe();
  }, [screenId]);

  // Media player logic
  useEffect(() => {
    if (playlist.length === 0) {
      setMediaUrl(null);
      return;
    }

    const currentItem = playlist[currentItemIndex];
    if (!currentItem) return;

    const { data } = supabase.storage.from('media').getPublicUrl(currentItem.file_path);
    setMediaUrl(data.publicUrl);

    // For non-video content, switch after a delay
    if (!currentItem.mime_type?.startsWith('video/')) {
      const duration = (currentItem.duration || 10) * 1000; // Default 10s for images
      const timer = setTimeout(() => {
        setCurrentItemIndex((prev) => (prev + 1) % playlist.length);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [playlist, currentItemIndex]);

  const handleVideoEnded = () => {
    setCurrentItemIndex((prev) => (prev + 1) % playlist.length);
  };

  const handlePairing = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('screens')
      .select('id')
      .eq('pairing_code', pairingCode.toUpperCase())
      .single();

    if (error || !data) {
      toast.error('Invalid pairing code. Please try again.');
    } else {
      toast.success('Screen paired successfully!');
      // Invalidate the code
      await supabase.from('screens').update({ pairing_code: null }).eq('id', data.id);
      localStorage.setItem('signageflow_screen_id', data.id);
      setScreenId(data.id);
    }
    setLoading(false);
  };

  if (screenId) {
    if (playlist.length === 0) {
      return (
        <div className="w-screen h-screen bg-black text-white flex items-center justify-center text-2xl">
          <p>This screen is paired but the playlist is empty.</p>
        </div>
      );
    }

    const currentItem = playlist[currentItemIndex];
    
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
        {mediaUrl && currentItem.mime_type?.startsWith('image/') && (
          <img src={mediaUrl} alt={currentItem.name} className="max-w-full max-h-full object-contain" />
        )}
        {mediaUrl && currentItem.mime_type?.startsWith('video/') && (
          <video
            src={mediaUrl}
            autoPlay
            muted
            onEnded={handleVideoEnded}
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
        <h1 className="text-center text-2xl font-bold text-gray-900">Pair Display</h1>
        <p className="text-center mt-2 text-gray-600">Enter the 6-digit code from your screen editor.</p>
        <form className="mt-8 space-y-6" onSubmit={handlePairing}>
          <Input
            type="text"
            placeholder="ABC123"
            value={pairingCode}
            onChange={(e) => setPairingCode(e.target.value)}
            className="text-center text-3xl tracking-widest font-mono"
            required
            maxLength={6}
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            Connect
          </Button>
        </form>
      </div>
    </div>
  );
};

export default DisplayClientPage;
