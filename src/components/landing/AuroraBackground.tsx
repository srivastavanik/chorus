'use client';

import { useEffect, useRef } from 'react';

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      time += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create aurora effect
      // We'll use multiple sine waves to create organic movement
      // Colors: Red (#EF4444) and White (#FFFFFF) mixed with dark background
      
      // Base gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#000000');
      gradient.addColorStop(1, '#110505'); // Very dark red
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw "aurora" waves
      const drawWave = (amplitude: number, frequency: number, speed: number, color: string, yOffset: number) => {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        
        for (let x = 0; x <= canvas.width; x += 10) {
          const y = Math.sin(x * frequency + time * speed) * amplitude + 
                   Math.sin(x * frequency * 0.5 + time * speed * 0.8) * amplitude * 0.5 +
                   yOffset;
          ctx.lineTo(x, y);
        }
        
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        
        const grad = ctx.createLinearGradient(0, yOffset - amplitude, 0, canvas.height);
        grad.addColorStop(0, color.replace(')', ', 0)')); // Transparent top
        grad.addColorStop(0.2, color.replace(')', ', 0.1)'));
        grad.addColorStop(1, color.replace(')', ', 0)')); // Transparent bottom
        
        ctx.fillStyle = grad;
        ctx.fill();
      };

      // Red wave
      drawWave(150, 0.002, 2, 'rgba(239, 68, 68)', canvas.height * 0.7);
      
      // White wave
      drawWave(100, 0.003, 3, 'rgba(255, 255, 255)', canvas.height * 0.6);
      
      // Another red wave
      drawWave(200, 0.001, 1.5, 'rgba(220, 38, 38)', canvas.height * 0.8);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
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

