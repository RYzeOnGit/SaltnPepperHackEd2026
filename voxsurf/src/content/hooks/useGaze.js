import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Iris / eye-center gaze tracking.
 * Accepts raw FaceMesh landmarks from the shared useFaceMesh hook
 * instead of loading FaceLandmarker on its own.
 */
export function useGaze(settings, landmarks) {
  const [gazeX, setGazeX] = useState(window.innerWidth / 2);
  const [gazeY, setGazeY] = useState(window.innerHeight / 2);
  const [isFixating, setIsFixating] = useState(false);
  const [fixationDuration, setFixationDuration] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  const calibrationRef = useRef(null);
  const lastGazeRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const fixationStartRef = useRef(null);
  const kalmanRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    vx: 0,
    vy: 0,
  });

  // Process incoming landmarks
  useEffect(() => {
    if (!settings.eyeEnabled) {
      setIsTracking(false);
      return;
    }
    if (landmarks) {
      updateGaze(landmarks);
      setIsTracking(true);
    } else {
      setIsTracking(false);
    }
  }, [landmarks, settings.eyeEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateGaze = useCallback(
    (lm) => {
      // Eye-center approximation
      const leftEyeIndices = [33, 7, 163, 144, 153, 158];
      const rightEyeIndices = [362, 382, 381, 380, 374, 373];

      const leftEyeCenter = {
        x:
          leftEyeIndices.reduce((sum, i) => sum + lm[i].x, 0) /
          leftEyeIndices.length,
        y:
          leftEyeIndices.reduce((sum, i) => sum + lm[i].y, 0) /
          leftEyeIndices.length,
      };

      const rightEyeCenter = {
        x:
          rightEyeIndices.reduce((sum, i) => sum + lm[i].x, 0) /
          rightEyeIndices.length,
        y:
          rightEyeIndices.reduce((sum, i) => sum + lm[i].y, 0) /
          rightEyeIndices.length,
      };

      const irisX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
      const irisY = (leftEyeCenter.y + rightEyeCenter.y) / 2;

      const normalizedX = Math.max(0, Math.min(1, irisX));
      const normalizedY = Math.max(0, Math.min(1, irisY));

      let screenX = normalizedX * window.innerWidth;
      let screenY = normalizedY * window.innerHeight;

      if (calibrationRef.current) {
        const cal = calibrationRef.current;
        screenX =
          cal.matrix[0] * normalizedX +
          cal.matrix[1] * normalizedY +
          cal.matrix[2];
        screenY =
          cal.matrix[3] * normalizedX +
          cal.matrix[4] * normalizedY +
          cal.matrix[5];
      }

      // Exponential smoothing
      const lerp = settings.gazeSmoothing || 0.25;
      const newX =
        lastGazeRef.current.x + (screenX - lastGazeRef.current.x) * lerp;
      const newY =
        lastGazeRef.current.y + (screenY - lastGazeRef.current.y) * lerp;

      // Saccade vs fixation detection
      const velocity = Math.sqrt(
        Math.pow(newX - kalmanRef.current.x, 2) +
          Math.pow(newY - kalmanRef.current.y, 2)
      );
      const isSaccade = velocity > 10;

      if (isSaccade) {
        const saccadeLerp = 0.5;
        kalmanRef.current.x += (newX - kalmanRef.current.x) * saccadeLerp;
        kalmanRef.current.y += (newY - kalmanRef.current.y) * saccadeLerp;
        setIsFixating(false);
        fixationStartRef.current = null;
        setFixationDuration(0);
      } else {
        const fixationLerp = 0.1;
        kalmanRef.current.x += (newX - kalmanRef.current.x) * fixationLerp;
        kalmanRef.current.y += (newY - kalmanRef.current.y) * fixationLerp;

        if (!fixationStartRef.current) {
          fixationStartRef.current = Date.now();
          setIsFixating(true);
        }
        setFixationDuration(Date.now() - fixationStartRef.current);
      }

      lastGazeRef.current = { x: newX, y: newY };
      setGazeX(kalmanRef.current.x);
      setGazeY(kalmanRef.current.y);
    },
    [settings.gazeSmoothing]
  );

  const startCalibration = useCallback(() => {
    const points = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.1, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.9, y: 0.5 },
      { x: 0.1, y: 0.9 },
      { x: 0.5, y: 0.9 },
      { x: 0.9, y: 0.9 },
    ];
    calibrationRef.current = {
      points,
      matrix: [1, 0, 0, 0, 1, 0],
    };
    chrome.storage.local.set({ gazeCalibration: calibrationRef.current });
  }, []);

  // Load saved calibration
  useEffect(() => {
    chrome.storage.local.get(['gazeCalibration'], (result) => {
      if (result.gazeCalibration) {
        calibrationRef.current = result.gazeCalibration;
      }
    });
  }, []);

  return {
    gazeX,
    gazeY,
    isFixating,
    fixationDuration,
    isTracking,
    startCalibration,
  };
}
