import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { Monitor, HardDrive, Clapperboard, Wifi, Activity, Clock } from 'lucide-react';
import { Screen, Media } from '../types';

interface DashboardStats {
  totalScreens: number;
  onlineScreens: number;
  totalMediaItems: number;
  totalStorageUsed: number;
  recentActivity: Array<{
    id: string;
    type: 'screen_created' | 'media_uploaded' | 'screen_updated';
    message: string;
    timestamp: string;
  }>;
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalScreens: 0,
    onlineScreens: 0,
    totalMediaItems: 0,
    totalStorageUsed: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch screens data
      const { data: screens, error: screensError } = await supabase
        .from('screens')
        .select('id, name, is_online, created_at, playlist')
        .eq('user_id', user.id);

      if (screensError) throw screensError;

      // Fetch media data
      const { data: media, error: mediaError } = await supabase
        .from('media')
        .select('id, name, file_size, created_at')
        .eq('user_id', user.id);

      if (mediaError) throw mediaError;

      // Calculate stats
      const totalScreens = screens?.length || 0;
      const onlineScreens = screens?.filter(screen => screen.is_online).length || 0;
      const totalMediaItems = media?.length || 0;
      const totalStorageUsed = media?.reduce((total, item) => total + (item.file_size || 0), 0) || 0;
      const totalPlaylistItems = screens?.reduce((total, screen) => {
        const playlist = Array.isArray(screen.playlist) ? screen.playlist : [];
        return total + playlist.length;
      }, 0) || 0;

      // Generate recent activity
      const recentActivity = [
        ...(screens?.map(screen => ({
          id: `screen-${screen.id}`,
          type: 'screen_created' as const,
          message: `Screen "${screen.name}" was created`,
          timestamp: screen.created_at
        })) || []),
        ...(media?.map(item => ({
          id: `media-${item.id}`,
          type: 'media_uploaded' as const,
          message: `Media "${item.name}" was uploaded`,
          timestamp: item.created_at
        })) || [])
      ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

      setStats({
        totalScreens,
        onlineScreens,
        totalMediaItems,
        totalStorageUsed,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to screens changes
    const screensChannel = supabase
      .channel('dashboard-screens')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'screens', filter: `user_id=eq.${user.id}` },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    // Subscribe to media changes
    const mediaChannel = supabase
      .channel('dashboard-media')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media', filter: `user_id=eq.${user.id}` },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(screensChannel);
      supabase.removeChannel(mediaChannel);
    };
  }, [user, fetchDashboardData]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'screen_created': return <Monitor className="h-4 w-4 text-blue-500" />;
      case 'media_uploaded': return <Clapperboard className="h-4 w-4 text-green-500" />;
      case 'screen_updated': return <Activity className="h-4 w-4 text-orange-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const statsData = [
    { name: 'Total Screens', stat: stats.totalScreens.toString(), icon: Monitor, color: 'text-blue-600' },
    { name: 'Online Screens', stat: `${stats.onlineScreens}/${stats.totalScreens}`, icon: Wifi, color: stats.onlineScreens > 0 ? 'text-green-600' : 'text-gray-600' },
    { name: 'Total Media Items', stat: stats.totalMediaItems.toString(), icon: Clapperboard, color: 'text-purple-600' },
    { name: 'Total Storage Used', stat: formatBytes(stats.totalStorageUsed), icon: HardDrive, color: 'text-orange-600' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">An overview of your digital signage network.</p>

      <div className="mt-8">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statsData.map((item) => (
            <Card key={item.name} className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <item.icon className={`h-6 w-6 ${item.color || 'text-gray-400'}`} aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dt className="truncate text-sm font-medium text-gray-500">{item.name}</dt>
                    <dd className="flex items-baseline">
                      <p className="text-2xl font-semibold text-gray-900">{item.stat}</p>
                    </dd>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </dl>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        <Card className="mt-4">
          {stats.recentActivity.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No recent activity to show.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="p-4 flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
