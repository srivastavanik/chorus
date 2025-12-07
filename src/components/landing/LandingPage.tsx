'use client';

import { useState } from 'react';
import { EtherealBackground } from './EtherealBackground';
import { AuthModal } from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';

export function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans selection:bg-white/20">
      <EtherealBackground />
      
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-20 px-6 py-6 md:px-12 flex justify-between items-center max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-8">
          <div className="w-6 h-6 text-white font-bold text-2xl tracking-tighter">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2-1-10-5-10 5 10 5 8-4zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-xs font-medium tracking-wide text-gray-400 uppercase">
            <a href="#" className="hover:text-white transition-colors">Chorus</a>
            <a href="#" className="hover:text-white transition-colors">API</a>
            <a href="#" className="hover:text-white transition-colors">Company</a>
            <a href="#" className="hover:text-white transition-colors">Research</a>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowAuth(true)}
          className="bg-transparent hover:bg-white/10 text-white border border-white/20 rounded-full px-6 py-2 text-xs font-medium tracking-wide uppercase transition-all backdrop-blur-sm"
        >
          Try Chorus
        </Button>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full px-4">
        
        {/* Giant Text */}
        <div className="relative mb-12 group flex flex-col items-center">
          {/* Glow effect behind text */}
          <div className="absolute -inset-20 bg-gradient-to-r from-white/5 to-white/10 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
          
          <h1 className="text-[120px] md:text-[240px] font-bold tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/50 select-none animate-in fade-in zoom-in-95 duration-1000">
            Chorus
          </h1>

          {/* Big CTA Button */}
          <Button 
            onClick={() => setShowAuth(true)}
            className="mt-8 h-14 px-10 bg-white text-black hover:bg-gray-200 rounded-full text-sm font-medium tracking-wide uppercase transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.5)]"
          >
            Start Creating
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Footer/Announcements */}
        <div className="absolute bottom-12 left-0 right-0 px-6 md:px-12 flex flex-col md:flex-row justify-between items-end md:items-center max-w-[1600px] mx-auto w-full pointer-events-none">
          <div className="hidden md:block w-6 h-6" /> {/* Spacer to balance layout */}
          
          <div className="pointer-events-auto flex flex-col md:flex-row items-end md:items-center gap-6 text-right md:text-left">
            <div className="max-w-md text-sm text-gray-400 leading-relaxed">
              <span className="text-white font-medium">Chorus goes Global:</span> A new way to think, visualize, and create with AI. Experience the infinite canvas.
            </div>
            
            <Button 
              className="bg-transparent hover:bg-white/5 text-white border border-white/10 rounded-full px-6 py-5 text-xs font-medium tracking-wide uppercase transition-all backdrop-blur-sm flex items-center gap-2 group"
            >
              Read Announcement
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>

      {/* Auth Modal Overlay */}
      {showAuth && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <AuthModal onClose={() => setShowAuth(false)} />
        </div>
      )}
    </div>
  );
}
