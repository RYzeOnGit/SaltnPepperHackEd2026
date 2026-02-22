import React, { useRef, useEffect, useState } from 'react';

export default function CameraPreview({ settings }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!settings.handEnabled) {
      setIsActive(false);
      return;
    }

    let stream = null;
    let animationFrame = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsActive(true);
          drawPreview();
        }
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    };

    const drawPreview = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        ctx.strokeStyle = '#007AFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
        ctx.stroke();
      }

      animationFrame = requestAnimationFrame(drawPreview);
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [settings.handEnabled]);

  if (!settings.handEnabled) {
    return (
      <div className="glass-panel p-5">
        <p className="text-sm text-white/30 text-center">Enable hand mode to see camera preview</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4">
      <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3 px-1">Camera</h2>
      <div className="relative overflow-hidden rounded-apple">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto"
          style={{ display: 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="w-full h-auto rounded-apple"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        />
        {isActive && (
          <div
            className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-capsule text-[11px] font-medium text-white"
            style={{
              background: 'rgba(52, 199, 89, 0.25)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(52, 199, 89, 0.3)',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-apple-green animate-status-pulse" />
            Active
          </div>
        )}
      </div>
      <p className="text-[11px] text-white/25 mt-2.5 px-1 leading-relaxed">
        Hand tracking preview while gesture mode is enabled.
      </p>
    </div>
  );
}
