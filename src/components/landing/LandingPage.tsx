'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { LongExposureBackground } from './LongExposureBackground';

export function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  // Initialize GSAP and Lenis
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smoothWheel: true,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Text Reveal Animation
    const shutterTexts = document.querySelectorAll('.shutter-text');
    // Simulate "loaded" class on body
    setTimeout(() => {
      document.body.classList.add('loaded');
    }, 200);

    // Grid Drawing
    const gridCells = document.querySelectorAll('.grid-cell');
    gridCells.forEach(cell => {
      ScrollTrigger.create({
        trigger: cell,
        start: "top 80%",
        onEnter: () => cell.classList.add('active')
      });
    });

    // Marquee Scroll
    gsap.to(".marquee-content", {
      xPercent: -20,
      ease: "none",
      scrollTrigger: {
        trigger: ".marquee-container",
        scrub: 1
      }
    });

    // Text Highlight Manifesto
    const manifesto = document.getElementById('manifesto');
    if (manifesto) {
        const text = manifesto.innerText;
        const words = text.split(" ");
        manifesto.innerHTML = "";
        words.forEach(word => {
            const span = document.createElement("span");
            span.innerText = word + " ";
            span.style.opacity = "0.2";
            span.style.transition = "opacity 0.2s";
            manifesto.appendChild(span);
        });

        const spans = manifesto.querySelectorAll("span");
        gsap.to(spans, {
            opacity: 1,
            color: "#000000",
            stagger: 0.1,
            scrollTrigger: {
                trigger: "#manifesto",
                start: "top 75%",
                end: "bottom 45%",
                scrub: 1
            }
        });
    }

    // Horizontal Scroll Process
    const processSection = document.querySelector(".process-wrapper");
    const processContainer = document.querySelector(".process-container");
    
    if (processSection && processContainer) {
        gsap.to(processContainer, {
            x: () => -(processContainer.scrollWidth - window.innerWidth),
            ease: "none",
            scrollTrigger: {
                trigger: processSection,
                pin: true,
                scrub: 1,
                end: () => "+=" + processContainer.scrollWidth,
                invalidateOnRefresh: true,
            }
        });
    }

    return () => {
      lenis.destroy();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  // Cursor Logic
  useEffect(() => {
    const cursor = cursorRef.current;
    
    const moveCursor = (e: MouseEvent) => {
      if (cursor) {
        // Simple direct transform to reduce lag/glitching
        cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
    };

    window.addEventListener('mousemove', moveCursor);

    // Hover effects
    const hoverTriggers = document.querySelectorAll('.hover-trigger');
    const handleEnter = () => document.body.classList.add('hovering');
    const handleLeave = () => document.body.classList.remove('hovering');

    hoverTriggers.forEach(el => {
      el.addEventListener('mouseenter', handleEnter);
      el.addEventListener('mouseleave', handleLeave);
    });

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      hoverTriggers.forEach(el => {
        el.removeEventListener('mouseenter', handleEnter);
        el.removeEventListener('mouseleave', handleLeave);
      });
      document.body.classList.remove('hovering');
    };
  }, []);

  // Load Unicorn Studio script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
    script.onload = () => {
      // @ts-ignore
      if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
        // @ts-ignore
        window.UnicornStudio.init();
        // @ts-ignore
        window.UnicornStudio.isInitialized = true;
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div ref={containerRef} className="bg-[#050505] text-[#e4e4e7] min-h-screen selection:bg-white selection:text-black relative">
      
      {/* Background with Particle Effect - Removed global background, moved to Hero section */}
      {/* <LongExposureBackground /> */}

      {/* Custom Cursor - Hidden for now to fix glitching issues if needed, or use CSS based custom cursor */}
      {/* <div ref={cursorRef} className="cursor-dot fixed pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 mix-blend-difference"></div> */}

      
      {/* Nav */}
      <nav className="fixed top-0 left-0 w-full z-40">
        <div className="max-w-6xl mx-auto px-6 pt-6">
          <div className="rounded-2xl border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.75)] px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
               {/* Updated Logo Image */}
               <div className="relative w-24 h-6">
                  <Image src="/xai.png" alt="CHORUS" fill className="object-contain" />
               </div>
            </div>
            <div className="hidden md:flex gap-10 text-sm font-mono uppercase tracking-wider">
              <a href="#modules" className="hover:opacity-80 hover-trigger">Canvas</a>
              <a href="#output" className="hover:opacity-80 hover-trigger">Models</a>
              <a href="#system" className="hover:opacity-80 hover-trigger">System</a>
            </div>
            <div className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              {/* Updated Status Text */}
              <span>CHORUS</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col md:px-12 border-neutral-900 border-b pt-20 pr-6 pl-6 relative justify-center z-10">
        <LongExposureBackground />
        
        <div className="max-w-7xl mx-auto w-full z-10">
          <div className="mb-12 overflow-hidden">
            <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest shutter-wrapper">
              <span className="shutter-text">The Infinite Canvas for AI</span>
            </p>
          </div>

          <h1 className="text-6xl md:text-8xl lg:text-9xl font-semibold tracking-tighter leading-[0.9] text-white uppercase mb-16 heading-font">
            <span className="shutter-wrapper block">
              <span className="shutter-text text-grain-glow">Knowledge</span>
            </span>
            <span className="shutter-wrapper block">
              <span className="shutter-text text-grain-glow-dark">At</span>
            </span>
            <span className="shutter-wrapper block">
              <span className="shutter-text text-grain-glow">Scale</span>
            </span>
          </h1>

          <div className="flex flex-col md:flex-row justify-between items-end border-t border-neutral-800 pt-8 w-full">
            <div className="max-w-md text-sm text-neutral-400 leading-relaxed mb-8 md:mb-0 shutter-wrapper delay-500">
              <span className="shutter-text">
                Chorus replaces linear chat with spatial reasoning.
                We convert simple prompts into complex, multi-step workflows
                powered by next-gen models from xAI.
              </span>
            </div>

            <button onClick={() => setShowAuth(true)} className="group flex items-center gap-4 hover-trigger cursor-pointer">
              <div className="w-12 h-12 border border-neutral-700 rounded-full flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-300">
                <svg className="w-5 h-5 text-white group-hover:text-black transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 17L17 7"></path>
                  <path d="M7 7h10v10"></path>
                </svg>
              </div>
              <span className="text-xs font-mono uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                Start Creating
              </span>
            </button>
          </div>
        </div>

        {/* Background Gradient Mesh - Removed since we have particle background, or keep as overlay */}
        <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_80%_20%,_rgba(120,119,198,0.3),rgba(255,255,255,0))] pointer-events-none"></div>
      </section>

      {/* Marquee */}
      <div className="py-12 bg-neutral-900 overflow-hidden whitespace-nowrap border-b border-neutral-800 marquee-container relative z-10">
        <div className="inline-flex items-center gap-12 marquee-content">
          <span className="text-8xl font-semibold text-neutral-800 tracking-tighter heading-font uppercase">Knowledge</span>
          <span className="text-8xl font-semibold text-neutral-200 tracking-tighter heading-font uppercase">Generation</span>
          <span className="text-8xl font-semibold text-neutral-800 tracking-tighter heading-font uppercase">Analysis</span>
          <span className="text-8xl font-semibold text-neutral-200 tracking-tighter heading-font uppercase">Synthesis</span>
          <span className="text-8xl font-semibold text-neutral-800 tracking-tighter heading-font uppercase">Knowledge</span>
          <span className="text-8xl font-semibold text-neutral-200 tracking-tighter heading-font uppercase">Generation</span>
        </div>
      </div>

      {/* Services Grid */}
      <section id="modules" className="py-32 px-6 md:px-12 bg-[#050505] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between mb-20 items-end">
            <h2 className="text-4xl md:text-5xl font-medium heading-font tracking-tight">System Core</h2>
            <p className="text-sm font-mono text-neutral-500 uppercase mt-4 md:mt-0">[ 01 - 06 ]</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-l border-neutral-800">
            {/* Service 1 */}
            <div className="grid-cell p-10 border-r border-b border-neutral-800 hover:bg-neutral-900/30 transition-colors group hover-trigger">
              <div className="mb-24 flex justify-between">
                <svg className="w-8 h-8 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                  <path d="M12 4v16"></path>
                  <path d="M4 12h16"></path>
                </svg>
                <span className="text-xs font-mono text-neutral-600">01</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-4">Infinite Canvas</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">Spatial interface for organizing complex thoughts. Drag, drop, and connect ideas without boundaries.</p>
            </div>
            {/* Service 2 */}
            <div className="grid-cell p-10 border-r border-b border-neutral-800 hover:bg-neutral-900/30 transition-colors group hover-trigger">
              <div className="mb-24 flex justify-between">
                <svg className="w-8 h-8 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="m18 16 4-4-4-4"></path>
                  <path d="m6 8-4 4 4 4"></path>
                  <path d="m14.5 4-5 16"></path>
                </svg>
                <span className="text-xs font-mono text-neutral-600">02</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-4">Multi-Modal AI</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">Seamlessly integrate text and image models. Grok Imagine, 4.1, and more all in one workspace.</p>
            </div>
            {/* Service 3 */}
            <div className="grid-cell p-10 border-r border-b border-neutral-800 hover:bg-neutral-900/30 transition-colors group hover-trigger">
              <div className="mb-24 flex justify-between">
                <svg className="w-8 h-8 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="m16 12-4-4-4 4"></path>
                  <path d="M12 16V8"></path>
                </svg>
                <span className="text-xs font-mono text-neutral-600">03</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-4">Structured Logic</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">Chain thoughts together to solve complex problems. Define flows that agents execute autonomously.</p>
            </div>
            {/* Service 4 */}
            <div className="grid-cell p-10 border-r border-b border-neutral-800 hover:bg-neutral-900/30 transition-colors group hover-trigger">
              <div className="mb-24 flex justify-between">
                <svg className="w-8 h-8 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
                <span className="text-xs font-mono text-neutral-600">04</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-4">Visual Context</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">Upload documents, images, and data directly onto the canvas. AI sees what you see.</p>
            </div>
            {/* Service 5 */}
            <div className="grid-cell p-10 border-r border-b border-neutral-800 hover:bg-neutral-900/30 transition-colors group hover-trigger">
              <div className="mb-24 flex justify-between">
                <svg className="w-8 h-8 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span className="text-xs font-mono text-neutral-600">05</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-4">Knowledge Retrieval</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">Chat directly with your uploaded PDFs, images, and data sources. Extract insights instantly.</p>
            </div>
            {/* Service 6 */}
            <div className="grid-cell p-10 border-r border-b border-neutral-800 hover:bg-neutral-900/30 transition-colors group hover-trigger">
              <div className="mb-24 flex justify-between">
                <svg className="w-8 h-8 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span className="text-xs font-mono text-neutral-600">06</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-4">Real-time Sync</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">Collaborate with your team or autonomous agents instantly with sub-millisecond latency.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Text Highlight Section */}
      <section className="py-40 px-6 bg-white text-black flex items-center justify-center relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <p id="manifesto" className="text-4xl md:text-6xl font-medium leading-[1.1] tracking-tight heading-font text-neutral-300">
            We believe that the chatbox is dead. In an age of AGI, linear interfaces constrain thought. We break the text barrier to reveal the true potential of spatial reasoning.
          </p>
        </div>
      </section>

      {/* Horizontal Scroll Process */}
      <section id="process" className="process-wrapper overflow-hidden bg-[#050505] h-screen relative border-t border-neutral-900 z-10">
        <div className="process-container flex h-full w-[400vw]">
          {/* Panel 1 */}
          <div className="w-screen h-full grid grid-cols-1 lg:grid-cols-2 border-r border-neutral-800 relative bg-[#050505]">
            <div className="flex flex-col justify-center px-12 md:px-24 relative z-10 pointer-events-none">
              <div className="absolute top-12 left-12 text-xs font-mono text-neutral-500">PHASE_01</div>
              <h3 className="text-6xl md:text-8xl font-semibold text-neutral-800 mb-6 heading-font">Input</h3>
              <p className="text-2xl text-white max-w-xl font-light">Ingest data, documents, and context into a unified spatial environment.</p>
            </div>
            <div className="hidden lg:flex items-center justify-center relative border-l border-neutral-800/50 overflow-hidden">
              <div className="relative p-12 border border-neutral-800/50 rounded-xl bg-neutral-900/20">
                <div className="grid grid-cols-4 gap-6 opacity-30">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="w-2 h-2 bg-neutral-400 rounded-full"></div>
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/10 to-transparent animate-scan border-b border-green-500/30"></div>
              </div>
            </div>
          </div>

          {/* Panel 2 */}
          <div className="w-screen h-full grid grid-cols-1 lg:grid-cols-2 border-r border-neutral-800 relative bg-[#050505]">
            <div className="flex flex-col justify-center px-12 md:px-24 relative z-10 pointer-events-none">
              <div className="absolute top-12 left-12 text-xs font-mono text-neutral-500">PHASE_02</div>
              <h3 className="text-6xl md:text-8xl font-semibold text-neutral-800 mb-6 heading-font">Reason</h3>
              <p className="text-2xl text-white max-w-xl font-light">Orchestrate multiple AI models to analyze, plan, and solve complex tasks.</p>
            </div>
            <div className="hidden lg:flex items-center justify-center relative border-l border-neutral-800/50 overflow-hidden">
              <div className="relative w-80 h-80 flex items-center justify-center">
                <div className="absolute inset-0 border border-neutral-800 rounded-lg animate-[spin_12s_linear_infinite]"></div>
                <div className="absolute inset-10 border border-neutral-700 rounded-lg animate-[spin_8s_linear_infinite_reverse]"></div>
                <div className="absolute inset-20 border border-neutral-600 rounded-lg animate-[spin_15s_linear_infinite]"></div>
                <div className="w-20 h-20 bg-neutral-800 border border-neutral-500 rounded flex items-center justify-center z-10">
                  <div className="w-3 h-3 bg-white rounded-sm animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 3 */}
          <div className="w-screen h-full grid grid-cols-1 lg:grid-cols-2 border-r border-neutral-800 relative bg-[#050505]">
            <div className="flex flex-col justify-center px-12 md:px-24 relative z-10 pointer-events-none">
              <div className="absolute top-12 left-12 text-xs font-mono text-neutral-500">PHASE_03</div>
              <h3 className="text-6xl md:text-8xl font-semibold text-neutral-800 mb-6 heading-font">Generate</h3>
              <p className="text-2xl text-white max-w-xl font-light">Produce high-fidelity artifacts and insights ready for deployment.</p>
            </div>
            <div className="hidden lg:flex items-center justify-center relative border-l border-neutral-800/50 overflow-hidden">
               <div className="relative flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full"></div>
                  </div>
                  <div className="w-24 h-px bg-neutral-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent w-1/2 animate-data-flow"></div>
                  </div>
                  <div className="w-20 h-20 rounded-full border border-white/20 bg-neutral-900 flex items-center justify-center relative shadow-[0_0_30px_-5px_rgba(255,255,255,0.1)]">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                      <path d="m2 12 20 0"></path>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  </div>
                  <div className="w-24 h-px bg-neutral-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent w-1/2 animate-data-flow" style={{ animationDelay: '.5s' }}></div>
                  </div>
                  <div className="w-12 h-12 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full"></div>
                  </div>
                </div>
            </div>
          </div>

          {/* Panel 4 */}
          <div className="w-screen h-full flex items-center justify-center relative bg-white text-black">
            <div className="text-center">
              <h3 className="text-8xl md:text-9xl font-semibold tracking-tighter mb-8 heading-font">Ready?</h3>
              <button onClick={() => setShowAuth(true)} className="px-8 py-4 bg-black text-white rounded-full text-sm font-mono uppercase tracking-widest hover:scale-105 transition-transform hover-trigger cursor-pointer">
                Enter Chorus
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Team List - Simplified */}
      <section className="py-32 px-6 md:px-12 bg-[#050505] border-t border-neutral-900 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col">
             <p className="text-sm font-mono uppercase text-neutral-500 mb-8">Built by</p>
             <div className="flex flex-col gap-6">
               <a 
                 href="https://www.linkedin.com/in/srivastavan/" 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="flex items-center gap-4 group w-fit hover-trigger"
               >
                 <h3 className="text-3xl md:text-5xl font-medium text-white heading-font group-hover:text-neutral-400 transition-colors">
                   Nikhil (Nick) Srivastava
                 </h3>
                 <svg 
                   className="w-6 h-6 md:w-8 md:h-8 text-neutral-500 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300" 
                   viewBox="0 0 24 24" 
                   fill="none" 
                   stroke="currentColor" 
                   strokeWidth="2"
                 >
                   <path d="M7 17L17 7M17 7H7M17 7V17" />
                 </svg>
               </a>

               <a 
                 href="https://www.linkedin.com/in/akshatdotcom/" 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="flex items-center gap-4 group w-fit hover-trigger"
               >
                 <h3 className="text-3xl md:text-5xl font-medium text-white heading-font group-hover:text-neutral-400 transition-colors">
                   Akshat Shah
                 </h3>
                 <svg 
                   className="w-6 h-6 md:w-8 md:h-8 text-neutral-500 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300" 
                   viewBox="0 0 24 24" 
                   fill="none" 
                   stroke="currentColor" 
                   strokeWidth="2"
                 >
                   <path d="M7 17L17 7M17 7H7M17 7V17" />
                 </svg>
               </a>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 text-center relative z-20 bg-[#050505]">
        <h2 onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-[12vw] font-bold leading-none text-[#1a1a1a] hover:text-white transition-colors duration-500 cursor-pointer hover-trigger heading-font">
          XAI CHORUS
        </h2>
        <div className="flex justify-between max-w-7xl mx-auto mt-12 text-xs font-mono text-neutral-500">
          <div>© 2025</div>
          <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="cursor-pointer hover:text-white transition-colors">SCROLL TO TOP</div>
        </div>
      </footer>

      {/* Auth Modal Overlay */}
      {showAuth && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <AuthModal onClose={() => setShowAuth(false)} />
        </div>
      )}
    </div>
  );
}
