'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  baseX: number;
  baseY: number;
  angle: number;
  velocity: number;
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const particleCount = Math.min(width * 0.5, 1000); 

      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * width;
        
        // Modified curve to ensure it covers the viewport nicely
        // Flow from bottom-left to top-right
        const curveY = height - (x / width) * height * 0.8 + Math.sin(x / width * Math.PI) * (height * 0.1);
        const spread = (Math.random() - 0.5) * (height * 1.2); 
        
        const y = curveY + spread;
        const size = Math.random() * 2 + 0.5;

        particles.push({
          x,
          y,
          size,
          speedX: Math.random() * 0.3 + 0.1,
          speedY: Math.random() * 0.1 - 0.05,
          opacity: Math.random() * 0.6 + 0.2, // Increased opacity for visibility
          baseX: x,
          baseY: y,
          angle: Math.random() * Math.PI * 2,
          velocity: Math.random() * 0.02 + 0.005,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.y += Math.sin(p.angle) * 0.2;
        p.angle += p.velocity;

        if (p.x > width + 50) {
            p.x = -50;
            // Reseed y to maintain the stream shape
            const curveY = height - (0) * height * 0.8; 
            p.y = curveY + (Math.random() - 0.5) * (height * 1.2);
        }
        if (p.y > height + 50) p.y = -50;
        if (p.y < -50) p.y = height + 50;

        ctx.beginPath();
        ctx.globalAlpha = p.opacity;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none"
      style={{
        zIndex: 1,
        opacity: 0.8,
        // Removed mask for testing visibility, or make it very subtle
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
      }}
    />
  );
}
