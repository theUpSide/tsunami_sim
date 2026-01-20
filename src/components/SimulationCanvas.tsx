import { useEffect, useRef } from 'react';
import type { SimulationState, Camera } from '../simulation/types';
import { Renderer } from '../rendering/Renderer';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';

interface SimulationCanvasProps {
  state: SimulationState;
  onCameraChange: (camera: Camera) => void;
}

export function SimulationCanvas({ state, onCameraChange }: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  const { isDragging, handlers } = useCanvasInteraction({
    camera: state.camera,
    onCameraChange,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      if (rendererRef.current) {
        rendererRef.current.resize(rect.width, rect.height);
      }
    };

    rendererRef.current = new Renderer(ctx, canvas.clientWidth, canvas.clientHeight);
    updateSize();

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and render
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    renderer.render(state);
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: isDragging ? 'grabbing' : 'grab',
        display: 'block',
        touchAction: 'none', // Prevent default touch behavior for panning
      }}
      {...handlers}
    />
  );
}
