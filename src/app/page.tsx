'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { LandingPage } from '@/components/landing/LandingPage';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { NavBar } from '@/components/layout/NavBar';
import { useRouter } from 'next/navigation';

function AppContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const handleOpenCanvas = (id: string | null) => {
    if (id) {
      router.push(`/canvas/${id}`);
    } else {
      router.push('/canvas/new');
    }
  };

  const handleHomeClick = () => {
    // Already on home/dashboard
  };

  // If user is not logged in, show landing page
  if (!loading && !user) {
    return <LandingPage />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-black text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-black text-white">
      <NavBar onHomeClick={handleHomeClick} />
      
      <main className="flex-1 overflow-hidden relative">
        <Dashboard onOpenCanvas={handleOpenCanvas} />
      </main>
    </div>
  );
}

export default function Home() {
  return <AppContent />;
}
