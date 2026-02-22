import { useState, useRef, useCallback, useEffect } from 'react';
import { HandLandmarker } from '@mediapipe/tasks-vision';

import createVisionModule from 'mediapipe-vision-wasm-internal';

let handLandmarkerInstance = null;
let handLandmarkerPromise = null;

function ensureGlobals() {
  self.ModuleFactory = createVisionModule;
  if (typeof self.custom_dbg === 'undefined') {
    self.custom_dbg = function () {};
  }
  if (typeof self.dbg === 'undefined') {
    self.dbg = function () {};
  }
}

async function acquireHandLandmarker() {
  if (handLandmarkerInstance) return handLandmarkerInstance;
  if (handLandmarkerPromise) return handLandmarkerPromise;

  handLandmarkerPromise = (async () => {
    ensureGlobals();
    const landmarker = await HandLandmarker.createFromOptions(
      { wasmLoaderPath: '', wasmBinaryPath: chrome.runtime.getURL('wasm/vision_wasm_internal.wasm') },
      {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      }
    );
    handLandmarkerInstance = landmarker;
    handLandmarkerPromise = null;
    return landmarker;
  })();

  return handLandmarkerPromise;
}

export function useFaceMesh(enabled) {
  const [landmarks] = useState(null);
  const [handLandmarks, setHandLandmarks] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const handLandmarkerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  const mountedRef = useRef(true);

  const processFrame = useCallback(() => {
    if (!mountedRef.current || !videoRef.current || !handLandmarkerRef.current) return;

    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      try {
        const results = handLandmarkerRef.current.detectForVideo(video, performance.now());
        if (results.landmarks?.length > 0) {
          setHandLandmarks(results.landmarks[0]);
        } else {
          setHandLandmarks(null);
        }
      } catch (error) {
        // Skip bad frame.
      }
    }

    animRef.current = requestAnimationFrame(processFrame);
  }, []);

  const start = useCallback(async () => {
    try {
      const handLandmarker = await acquireHandLandmarker();
      if (!mountedRef.current) return;
      handLandmarkerRef.current = handLandmarker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;

      setIsTracking(true);
      processFrame();
    } catch (error) {
      console.error('Failed to initialize hand tracking:', error);
    }
  }, [processFrame]);

  const stop = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    videoRef.current = null;
    handLandmarkerRef.current = null;
    setIsTracking(false);
    setHandLandmarks(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      start();
    } else {
      stop();
    }

    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [enabled, start, stop]);

  return { landmarks, handLandmarks, isTracking };
}
