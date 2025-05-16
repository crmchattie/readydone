'use client';

import { useEffect, useRef } from 'react';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';

interface RecordingPlayerProps {
  events: any[];
  width?: number;
  height?: number;
  isInline?: boolean;
}

export function RecordingPlayer({ events, width = 1024, height = 576, isInline = true }: RecordingPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!events || !Array.isArray(events) || !container) {
      console.error('Invalid events data:', events);
      return;
    }

    try {
      // Initialize the rrweb player
      const player = new rrwebPlayer({
        target: container,
        props: {
          events: events,
          width,
          height,
          skipInactive: true,
          showController: true,
          autoPlay: false,
        },
      });

      // Store player instance
      playerRef.current = player;

      // Add event listeners for debugging
      player.addEventListener('play', () => console.log('Started'));
      player.addEventListener('pause', () => console.log('Paused'));
      player.addEventListener('finish', () => console.log('Finished'));

      // Cleanup
      return () => {
        try {
          // Clear the container which will remove the player instance
          container.innerHTML = '';
          // Clear the reference
          playerRef.current = null;
        } catch (error) {
          console.error('Failed to cleanup rrweb player:', error);
        }
      };
    } catch (error) {
      console.error('Failed to initialize rrweb player:', error);
    }
  }, [events, width, height]);

  if (!events || !Array.isArray(events)) {
    return (
      <div className={`w-full ${isInline ? 'aspect-video' : 'h-full'} flex items-center justify-center bg-muted text-muted-foreground`}>
        No recording data available
      </div>
    );
  }

  return (
    <div className={`w-full ${isInline ? 'aspect-video' : 'h-full'}`}>
      <div ref={containerRef} className="recording-player" />
    </div>
  );
} 