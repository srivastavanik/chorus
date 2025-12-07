'use client';

import Canvas from '@/components/canvas/Canvas';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/components/auth/AuthProvider';

import { LandingPage } from '@/components/landing/LandingPage';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <Canvas />;
}

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-black text-white">
      <AppContent />
    </main>
  );
}
