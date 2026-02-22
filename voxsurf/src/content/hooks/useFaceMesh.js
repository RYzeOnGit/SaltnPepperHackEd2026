import { useState, useRef, useCallback, useEffect } from 'react';
import { FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';

// Direct import of the WASM module factory into the bundle.
// This bypasses MediaPipe's internal ia() function which dynamically creates
// <script> tags — those fail in Chrome MV3 content scripts because the script
// runs in the host page's isolated context, not the content script's context.
import createVisionModule from 'mediapipe-vision-wasm-internal';

// ── Singletons ──────────────────────────────────────────────────────────────
let faceLandmarkerInstance = null;
let faceLandmarkerPromise = null;
let handLandmarkerInstance = null;
let handLandmarkerPromise = null;

function ensureGlobals() {
  // Pre-set ModuleFactory so MediaPipe skips dynamic <script> injection.
  self.ModuleFactory = createVisionModule;
  // The WASM calls custom_dbg() which is block-scoped in strict mode (ES modules).
  if (typeof self.custom_dbg === 'undefined') {
    self.custom_dbg = function () {};
  }
  if (typeof self.dbg === 'undefined') {
    self.dbg = function () {};
  }
}

async function acquireFaceLandmarker() {
  if (faceLandmarkerInstance) return faceLandmarkerInstance;
  if (faceLandmarkerPromise) return faceLandmarkerPromise;

  faceLandmarkerPromise = (async () => {
    ensureGlobals();
    const fl = await FaceLandmarker.createFromOptions(
      { wasmLoaderPath: '', wasmBinaryPath: chrome.runtime.getURL('wasm/vision_wasm_internal.wasm') },
      {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: false,
        runningMode: 'VIDEO',
        numFaces: 1,
      }
    );
    faceLandmarkerInstance = fl;
    faceLandmarkerPromise = null;
    return fl;
  })();
  return faceLandmarkerPromise;
}

async function acquireHandLandmarker() {
  if (handLandmarkerInstance) return handLandmarkerInstance;
  if (handLandmarkerPromise) return handLandmarkerPromise;

  handLandmarkerPromise = (async () => {
    ensureGlobals();
    const hl = await HandLandmarker.createFromOptions(
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
    handLandmarkerInstance = hl;
    handLandmarkerPromise = null;
    return hl;
  })();
  return handLandmarkerPromise;
}

/**
 * Shared hook that manages FaceLandmarker + HandLandmarker with a single camera.
 * Returns face landmarks (for gaze) AND hand landmarks (for gesture cursor).
 */
export function useFaceMesh(enabled) {
  const [landmarks, setLandmarks] = useState(null);         // face
  const [handLandmarks, setHandLandmarks] = useState(null);  // hand
  const [isTracking, setIsTracking] = useState(false);
  const faceLandmarkerRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  const mountedRef = useRef(true);

  const processFrame = useCallback(() => {
    if (!mountedRef.current || !videoRef.current) return;
    const video = videoRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const now = performance.now();

      // ── Face landmarks ──
      if (faceLandmarkerRef.current) {
        try {
          const faceResults = faceLandmarkerRef.current.detectForVideo(video, now);
          if (faceResults.faceLandmarks?.length > 0) {
            setLandmarks(faceResults.faceLandmarks[0]);
          } else {
            setLandmarks(null);
          }
        } catch (e) { /* skip frame */ }
      }

      // ── Hand landmarks ──
      if (handLandmarkerRef.current) {
        try {
          const handResults = handLandmarkerRef.current.detectForVideo(video, now);
          if (handResults.landmarks?.length > 0) {
            setHandLandmarks(handResults.landmarks[0]);
          } else {
            setHandLandmarks(null);
          }
        } catch (e) { /* skip frame */ }
      }
    }

    animRef.current = requestAnimationFrame(processFrame);
  }, []);

  const start = useCallback(async () => {
    try {
      // Load both models in parallel
      const [fl, hl] = await Promise.all([
        acquireFaceLandmarker(),
        acquireHandLandmarker(),
      ]);
      if (!mountedRef.current) return;
      faceLandmarkerRef.current = fl;
      handLandmarkerRef.current = hl;

      // Acquire single camera stream shared by both
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;

      await new Promise((resolve) => {
        if (video.videoWidth > 0) {
          video.width = video.videoWidth;
          video.height = video.videoHeight;
          resolve();
        } else {
          video.onloadedmetadata = () => {
            video.width = video.videoWidth;
            video.height = video.videoHeight;
            resolve();
          };
        }
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      setIsTracking(true);
      processFrame();
    } catch (error) {
      console.error('Failed to initialize vision:', error);
    }
  }, [processFrame]);

  const stop = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    videoRef.current = null;
    faceLandmarkerRef.current = null;
    handLandmarkerRef.current = null;
    setIsTracking(false);
    setLandmarks(null);
    setHandLandmarks(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) { start(); } else { stop(); }
    return () => { mountedRef.current = false; stop(); };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { landmarks, handLandmarks, isTracking };
}
