import { useEffect, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';

interface VisualizerProps {
  className?: string;
  barCount?: number;
  color?: string;
}

export default function Visualizer({ className = '', barCount = 48, color }: VisualizerProps) {
  const { getAnalyser, isPlaying } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const analyser = getAnalyser();
      let data: Uint8Array;
      if (analyser && isPlaying) {
        data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
      } else {
        // fallback animated bars when no analyser
        data = new Uint8Array(barCount);
        const t = Date.now() / 400;
        for (let i = 0; i < barCount; i++) {
          data[i] = isPlaying ? Math.max(20, 120 + Math.sin(t + i * 0.3) * 60) : 8;
        }
      }

      const barWidth = w / barCount;
      const gap = barWidth * 0.25;
      const drawW = barWidth - gap;
      const accent = color || getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#0ea5e9';

      for (let i = 0; i < barCount; i++) {
        const idx = analyser ? Math.floor((i / barCount) * data.length) : i;
        const value = data[idx] || 0;
        const barH = Math.max(2, (value / 255) * h * 0.9);
        const x = i * barWidth + gap / 2;
        const y = (h - barH) / 2;
        const radius = Math.min(drawW / 2, 3);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.roundRect(x, y, drawW, barH, radius);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getAnalyser, isPlaying, barCount, color]);

  return <canvas ref={canvasRef} className={className} />;
}
