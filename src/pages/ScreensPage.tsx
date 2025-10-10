import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import Card from '../components/ui/Card';
import { Plus } from 'lucide-react';
import { Screen } from '../types';
import ScreenCard from '../components/ScreenCard';

const ScreensPage: React.FC = () => {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newScreenName, setNewScreenName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const user = useAuthStore((state) => state.user);

  const fetchScreens = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('screens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch screens.');
      console.error(error);
    } else {
      setScreens(data as Screen[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchScreens();
  }, [fetchScreens]);

  const handleCreateScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScreenName.trim() || !user) return;

    setIsCreating(true);
    const { error } = await supabase
      .from('screens')
      .insert({ name: newScreenName, user_id: user.id });

    if (error) {
      toast.error('Failed to create screen.');
      console.error(error);
    } else {
      toast.success('Screen created successfully!');
      setNewScreenName('');
      setIsModalOpen(false);
      fetchScreens(); // Refresh the list
    }
    setIsCreating(false);
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Screens</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your screens or drag & drop media onto a card to add it.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Create New Screen
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : screens.length === 0 ? (
        <Card className="mt-8">
          <div className="p-12 text-center text-gray-500">
            <p>You haven't created any screens yet.</p>
            <p className="mt-2 text-sm">Click "Create New Screen" to get started.</p>
          </div>
        </Card>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {screens.map((screen) => (
            <ScreenCard key={screen.id} screen={screen} />
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create a New Screen">
        <form onSubmit={handleCreateScreen}>
          <div className="space-y-4">
            <div>
              <label htmlFor="screen-name" className="block text-sm font-medium text-gray-700">
                Screen Name
              </label>
              <Input
                id="screen-name"
                type="text"
                value={newScreenName}
                onChange={(e) => setNewScreenName(e.target.value)}
                placeholder="e.g., Lobby TV"
                required
                className="mt-1"
              />
            </div>
            <div className="text-right">
              <Button type="submit" isLoading={isCreating}>
                Create Screen
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ScreensPage;
