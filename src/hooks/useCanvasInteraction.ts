import { useCallback, useRef, useState } from 'react';
import type { Camera } from '../simulation/types';
import { clamp } from '../utils/math';

interface UseCanvasInteractionProps {
  camera: Camera;
  onCameraChange: (camera: Camera) => void;
  minZoom?: number;
  maxZoom?: number;
  worldWidth?: number;
  worldHeight?: number;
}

export function useCanvasInteraction({
  camera,
  onCameraChange,
  minZoom = 0.3,
  maxZoom = 2,
  worldWidth = 4000,
  worldHeight = 1200,
}: UseCanvasInteractionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;

      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      const newX = clamp(camera.x - dx / camera.zoom, 0, worldWidth - 800);
      const newY = clamp(camera.y - dy / camera.zoom, -200, worldHeight - 400);

      onCameraChange({
        ...camera,
        x: newX,
        y: newY,
      });
    },
    [isDragging, camera, onCameraChange, worldWidth, worldHeight]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = clamp(camera.zoom * zoomFactor, minZoom, maxZoom);

      // Zoom toward mouse position
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldMouseX = camera.x + mouseX / camera.zoom;
      const worldMouseY = camera.y + mouseY / camera.zoom;

      const newCameraX = worldMouseX - mouseX / newZoom;
      const newCameraY = worldMouseY - mouseY / newZoom;

      onCameraChange({
        x: clamp(newCameraX, 0, worldWidth - 800),
        y: clamp(newCameraY, -200, worldHeight - 400),
        zoom: newZoom,
      });
    },
    [camera, onCameraChange, minZoom, maxZoom, worldWidth, worldHeight]
  );

  return {
    isDragging,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onWheel: handleWheel,
    },
  };
}
