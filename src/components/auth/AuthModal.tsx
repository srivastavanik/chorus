'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader2, X } from 'lucide-react';

export function AuthModal({ onClose }: { onClose?: () => void }) {
  const { login, signup, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await login(email, password);
      } else {
        res = await signup(email, password, name);
        if (!res.error) {
          const loginRes = await login(email, password);
          if (loginRes.error) {
             setIsLogin(true);
             setError('Account created! Please log in.');
             setIsLoading(false);
             return;
          }
          // Check for redirect
          const searchParams = new URLSearchParams(window.location.search);
          const redirect = searchParams.get('redirect');
          if (redirect) {
            window.location.href = redirect;
          }
          return; // Success
        }
      }

      if (res?.error) {
        setError(res.error);
      } else if (isLogin) {
        // Check for redirect
        const searchParams = new URLSearchParams(window.location.search);
        const redirect = searchParams.get('redirect');
        if (redirect) {
          window.location.href = redirect;
        }
        if (onClose) onClose();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#050505] overflow-hidden font-sans selection:bg-white selection:text-black">
      {/* Close Button */}
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 z-[60] text-gray-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 backdrop-blur-sm"
        >
          <X size={20} />
        </button>
      )}

      {/* Left Side: Login Form */}
      <div className="w-full md:w-1/2 h-full flex flex-col justify-center items-center px-8 md:px-24 bg-[#050505] relative z-10 border-r border-white/5">
        <div className="w-full max-w-sm space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2">
            <h1 className="text-4xl font-medium text-white tracking-tight heading-font">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-gray-500 text-sm font-light tracking-wide">
              {isLogin 
                ? 'Enter your credentials to access your workspace' 
                : 'Start your journey with Chorus today'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {!isLogin && (
              <div className="space-y-2 group">
                <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest group-focus-within:text-white transition-colors">Full Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="bg-transparent border-b border-white/10 focus:border-white rounded-none px-6 py-3 text-white placeholder:text-gray-800 transition-all focus:ring-0 ring-0 outline-none text-lg font-light heading-font"
                  required
                />
              </div>
            )}
            
            <div className="space-y-2 group">
              <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest group-focus-within:text-white transition-colors">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="bg-transparent border-b border-white/10 focus:border-white rounded-none px-0 py-3 text-white placeholder:text-gray-800 transition-all focus:ring-0 ring-0 outline-none text-lg font-light heading-font"
                required
              />
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest group-focus-within:text-white transition-colors">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent border-b border-white/10 focus:border-white rounded-none px-6 py-3 text-white placeholder:text-gray-800 transition-all focus:ring-0 ring-0 outline-none text-lg font-light font-mono tracking-widest"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs font-mono bg-red-900/10 p-3 rounded border border-red-900/20">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-14 bg-white text-black hover:bg-gray-200 rounded-full text-[11px] font-mono font-bold tracking-[0.2em] uppercase transition-all mt-4 shadow-[0_0_30px_-10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_-5px_rgba(255,255,255,0.4)] hover:scale-[1.02] active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>

          <div className="text-center pt-4">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-xs text-gray-600 hover:text-white transition-colors font-mono tracking-wide uppercase"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>

      {/* Right Side: Info/Visual */}
      <div className="hidden md:flex w-1/2 h-full bg-[#050505] relative overflow-hidden items-center justify-center p-24 border-l border-white/5">
        {/* Effects Stack */}
        <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay filter contrast-150" />
        <div className="absolute inset-0 z-[2] opacity-10 grid-overlay" />
        
        {/* Glow Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.03] blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-5xl font-medium text-white mb-12 tracking-tight leading-tight heading-font">
            <span className="text-grain-glow block">Reasoning</span>
            <span className="text-grain-glow-dark block text-3xl mt-2 mb-2">at</span>
            <span className="text-grain-glow block">scale.</span>
          </h2>
          
          <div className="space-y-12 pl-6 border-l border-white/10">
            <div className="group">
              <h3 className="text-white text-sm font-mono uppercase mb-2 tracking-widest group-hover:text-white/90 transition-colors">Infinite Canvas</h3>
              <p className="text-gray-500 text-sm leading-relaxed font-light group-hover:text-gray-400 transition-colors">
                Break free from linear chat. Visualize complex ideas, branch conversations, and organize your thoughts in an infinite spatial interface.
              </p>
            </div>
            
            <div className="group">
              <h3 className="text-white text-sm font-mono uppercase mb-2 tracking-widest group-hover:text-white/90 transition-colors">Multimodal Intelligence</h3>
              <p className="text-gray-500 text-sm leading-relaxed font-light group-hover:text-gray-400 transition-colors">
                Drag and drop files, generate images, and analyze data seamlessly. Chorus understands vision and context across your entire workspace.
              </p>
            </div>

            <div className="group">
              <h3 className="text-white text-sm font-mono uppercase mb-2 tracking-widest group-hover:text-white/90 transition-colors">Deep Reasoning</h3>
              <p className="text-gray-500 text-sm leading-relaxed font-light group-hover:text-gray-400 transition-colors">
                Powered by advanced reasoning models, Chorus doesn't just answer—it thinks. Watch the thought process unfold in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
