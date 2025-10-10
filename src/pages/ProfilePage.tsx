import React from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuthStore } from '../store/auth';

const ProfilePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-600">Manage your account and preferences.</p>

      <div className="mt-8 max-w-2xl">
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900">Profile</h2>
            <p className="mt-1 text-sm text-gray-600">This information will be displayed publicly so be careful what you share.</p>
            <div className="mt-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium leading-6 text-gray-900">Email Address</label>
                    <Input type="email" value={user?.email || ''} disabled className="mt-2 bg-gray-100" />
                </div>
                <div>
                    <label className="block text-sm font-medium leading-6 text-gray-900">Full Name</label>
                    <Input type="text" placeholder="Your Name" className="mt-2" />
                </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 text-right">
              <Button>Save</Button>
          </div>
        </Card>

        <Card className="mt-8">
            <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900">Change Password</h2>
                <div className="mt-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium leading-6 text-gray-900">New Password</label>
                        <Input type="password" className="mt-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium leading-6 text-gray-900">Confirm New Password</label>
                        <Input type="password" className="mt-2" />
                    </div>
                </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 text-right">
                <Button>Update Password</Button>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
