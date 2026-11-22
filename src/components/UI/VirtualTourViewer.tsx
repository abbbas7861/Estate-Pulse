import React, { useEffect, useRef } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';

interface VirtualTourViewerProps {
  url: string;
}

export const VirtualTourViewer: React.FC<VirtualTourViewerProps> = ({ url }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMatterport = url.toLowerCase().includes('matterport');

  useEffect(() => {
    if (isMatterport || !containerRef.current || !url) return;

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: url,
    });

    return () => {
      viewer.destroy();
    };
  }, [url, isMatterport]);

  if (isMatterport) {
    return (
      <iframe
        src={url}
        title="Matterport Virtual Tour"
        className="w-full h-full border-0"
        allow="fullscreen; xr-spatial-tracking"
        allowFullScreen
      />
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
};

export default VirtualTourViewer;
