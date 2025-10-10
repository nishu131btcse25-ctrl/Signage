import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MediaLibraryPage from './pages/MediaLibraryPage';
import ScreensPage from './pages/ScreensPage';
import ScreenEditorPage from './pages/ScreenEditorPage';
import PairingInstructionsPage from './pages/PairingInstructionsPage';
import DisplayClientPage from './pages/DisplayClientPage';
import ProfilePage from './pages/ProfilePage';

const App: React.FC = () => {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p>Loading application...</p>
            </div>
        );
    }

    const router = createBrowserRouter([
        {
            path: '/login',
            element: session ? <Navigate to="/" /> : <LoginPage />,
        },
        {
            path: '/pair',
            element: <DisplayClientPage />,
        },
        {
            path: '/pairing-instructions',
            element: <PairingInstructionsPage />,
        },
        {
            path: '/',
            element: <ProtectedRoute />,
            children: [
                { index: true, element: <DashboardPage /> },
                { path: 'media', element: <MediaLibraryPage /> },
                { path: 'screens', element: <ScreensPage /> },
                { path: 'screens/:screenId', element: <ScreenEditorPage /> },
                { path: 'settings', element: <ProfilePage /> },
            ],
        },
    ]);

    return <RouterProvider router={router} />;
}

export default App;
