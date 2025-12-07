'use client';

import { useEffect, useRef } from 'react';

export function EtherealBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      };
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    resize();

    // Particles/Orbs configuration - Increased count and variety
    const orbs = [
      { x: 0.5, y: 0.5, r: 0.4, color: 'rgba(255, 255, 255, 0.08)', speed: 0.1 }, // Center main
      { x: 0.2, y: 0.3, r: 0.5, color: 'rgba(200, 220, 255, 0.06)', speed: 0.15 },
      { x: 0.8, y: 0.7, r: 0.45, color: 'rgba(255, 220, 220, 0.06)', speed: 0.12 },
      { x: 0.1, y: 0.8, r: 0.3, color: 'rgba(220, 255, 255, 0.05)', speed: 0.2 },
      { x: 0.9, y: 0.2, r: 0.35, color: 'rgba(255, 255, 220, 0.05)', speed: 0.18 },
    ];

    const draw = () => {
      time += 0.002;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw ethereal glow orbs with interaction
      orbs.forEach((orb, i) => {
        // Interactive movement: Orbs move slightly towards/away from mouse
        const mouseInfluenceX = (mouseRef.current.x - 0.5) * 0.2;
        const mouseInfluenceY = (mouseRef.current.y - 0.5) * 0.2;

        const x = (orb.x + Math.sin(time * orb.speed + i) * 0.1 + mouseInfluenceX * (i % 2 === 0 ? 1 : -1)) * canvas.width;
        const y = (orb.y + Math.cos(time * orb.speed * 0.8 + i) * 0.1 + mouseInfluenceY * (i % 2 === 0 ? 1 : -1)) * canvas.height;
        
        // Dynamic radius
        const pulse = Math.sin(time * 2 + i) * 0.05 + 1;
        const radius = Math.max(canvas.width, canvas.height) * orb.r * pulse;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(0.5, orb.color.replace('0.0', '0.02')); // Subtle mid-point
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.globalCompositeOperation = 'screen'; // Blend mode for glow
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });
      
      ctx.globalCompositeOperation = 'source-over';

      // Add subtle noise/fog layer
      // (Simplified for performance: large very faint circles moving across)
      const fogTime = time * 0.5;
      const fogX = (Math.sin(fogTime) * 0.5 + 0.5) * canvas.width;
      const fogY = (Math.cos(fogTime * 0.7) * 0.5 + 0.5) * canvas.height;
      
      const fogGrad = ctx.createRadialGradient(fogX, fogY, 0, fogX, fogY, canvas.width * 0.8);
      fogGrad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
      fogGrad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
