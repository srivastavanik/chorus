'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader2, ArrowRight, X } from 'lucide-react';

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
          return; // Success
        }
      }

      if (res?.error) {
        setError(res.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-black overflow-hidden">
      {/* Close Button */}
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-50 text-gray-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
        >
          <X size={24} />
        </button>
      )}

      {/* Left Side: Login Form */}
      <div className="w-full md:w-1/2 h-full flex flex-col justify-center items-center px-8 md:px-20 bg-black relative z-10">
        <div className="w-full max-w-sm">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-gray-400">
              {isLogin 
                ? 'Enter your credentials to access your workspace' 
                : 'Start your journey with Chorus today'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2 group">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide group-focus-within:text-white transition-colors">Full Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="bg-transparent border-b border-gray-800 focus:border-white rounded-none px-0 h-12 text-white placeholder:text-gray-800 transition-colors focus:ring-0 ring-0 outline-none"
                  required
                />
              </div>
            )}
            
            <div className="space-y-2 group">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide group-focus-within:text-white transition-colors">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="bg-transparent border-b border-gray-800 focus:border-white rounded-none px-0 h-12 text-white placeholder:text-gray-800 transition-colors focus:ring-0 ring-0 outline-none"
                required
              />
            </div>

            <div className="space-y-2 group">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide group-focus-within:text-white transition-colors">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent border-b border-gray-800 focus:border-white rounded-none px-0 h-12 text-white placeholder:text-gray-800 transition-colors focus:ring-0 ring-0 outline-none"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-14 bg-white text-black hover:bg-gray-200 rounded-full text-sm font-medium tracking-wide uppercase transition-all mt-8 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.5)]"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>

      {/* Right Side: Info/Visual */}
      <div className="hidden md:flex w-1/2 h-full bg-[#050505] relative overflow-hidden items-center justify-center p-20 border-l border-white/5">
        {/* Decorative Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-white/5 to-transparent rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-t from-white/5 to-transparent rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
            Reasoning at scale.
          </h2>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold text-xs">1</span>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">Infinite Canvas</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Break free from linear chat. Visualize complex ideas, branch conversations, and organize your thoughts in an infinite spatial interface.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold text-xs">2</span>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">Multimodal Intelligence</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Drag and drop files, generate images, and analyze data seamlessly. Chorus understands code, vision, and context across your entire workspace.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold text-xs">3</span>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">Deep Reasoning</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Powered by advanced reasoning models, Chorus doesn't just answer—it thinks. Watch the thought process unfold in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
