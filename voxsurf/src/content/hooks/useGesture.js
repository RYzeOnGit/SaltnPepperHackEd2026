import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hand-gesture engine — cursor, scroll, click, and navigation.
 *
 * MediaPipe HandLandmarker indices:
 *   0  WRIST
 *   1-4   THUMB  (CMC, MCP, IP, TIP)
 *   5-8   INDEX  (MCP, PIP, DIP, TIP)
 *   9-12  MIDDLE (MCP, PIP, DIP, TIP)
 *   13-16 RING   (MCP, PIP, DIP, TIP)
 *   17-20 PINKY  (MCP, PIP, DIP, TIP)
 *
 * ╔═══════════════════════╦═══════════════════════════════════╗
 * ║  Gesture              ║  Action                           ║
 * ╠═══════════════════════╬═══════════════════════════════════╣
 * ║  1 finger (index)     ║  Move cursor                      ║
 * ║  Index hold ~5 s      ║  Dwell-click (auto-click)         ║
 * ║  Pinch (thumb+index)  ║  Click (500 ms debounce)          ║
 * ║  2 fingers (V shape)  ║  Scroll (vertical movement)       ║
 * ║  Open palm (5 fingers)║  Pause / neutral                  ║
 * ║  Thumbs up            ║  Go back in history               ║
 * ║  Fist (no fingers)    ║  Grab-scroll mode                 ║
 * ║  3-finger swipe left  ║  Go back                          ║
 * ║  3-finger swipe right ║  Go forward                       ║
 * ╚═══════════════════════╩═══════════════════════════════════╝
 *
 * STABILITY: All gesture classifications are temporally filtered — a
 * gesture must be detected for CONFIRM_FRAMES consecutive frames before
 * it becomes the active gesture. Destructive gestures (thumbs-up,
 * 3-finger swipe) require CONFIRM_DESTRUCTIVE frames. This eliminates
 * single-frame glitches from noisy landmark data.
 */
export function useGesture(settings, handLandmarks) {
  const [cursorX, setCursorX] = useState(window.innerWidth / 2);
  const [cursorY, setCursorY] = useState(window.innerHeight / 2);
  const [isDwelling, setIsDwelling] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [isPinching, setIsPinching] = useState(false);
  const [activeGesture, setActiveGesture] = useState('none'); // for HUD display

  const lastCursorRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const pinchActiveRef = useRef(false);
  const lastPinchTimeRef = useRef(0);       // debounce
  const scrollBaseRef = useRef(null);
  const grabBaseRef = useRef(null);          // fist-grab scroll
  const dwellStartRef = useRef(null);
  const swipeStartRef = useRef(null);        // 3-finger swipe
  const calibrationRef = useRef(null);

  // ── Temporal smoothing state ───────────────────────────────────────
  // Track the raw classified gesture for the last N frames. Only change
  // activeGesture when the same raw classification is consistent.
  const rawGestureRef = useRef('none');       // current raw classification this frame
  const rawStreakRef = useRef(0);             // how many consecutive frames it's been the same
  const confirmedGestureRef = useRef('none'); // the gesture that has been confirmed
  const thumbsUpFiredRef = useRef(false);     // prevent re-firing thumbsup every frame

  // ── Constants ─────────────────────────────────────────────────────────
  const PINCH_THRESHOLD = 0.055;     // tighter threshold to avoid false positives
  const PINCH_RELEASE = 0.09;        // hysteresis — must open wider to release
  const PINCH_COOLDOWN = 600;        // ms between pinch clicks
  const DWELL_TIME = 5000;           // ms to trigger dwell-click
  const DWELL_MOVE_THRESH = 20;      // px — if cursor moves more, reset dwell
  const SCROLL_SPEED = 12;           // multiplier for scroll velocity
  const SWIPE_THRESHOLD = 0.15;      // normalised horizontal distance for swipe
  const EXTENSION_MARGIN = 0.015;    // min tip-pip Y gap to count as "extended"
  const CONFIRM_FRAMES = 4;          // frames to confirm normal gestures (~130ms @ 30fps)
  const CONFIRM_DESTRUCTIVE = 10;    // frames to confirm destructive gestures (~330ms)

  // ── Mapping: camera region → full screen ──────────────────────────────
  const MAP_X_MIN = 0.15;
  const MAP_X_MAX = 0.85;
  const MAP_Y_MIN = 0.10;
  const MAP_Y_MAX = 0.85;

  const mapToScreen = useCallback((rawX, rawY) => {
    // Mirror X (webcam is mirrored)
    const mirroredX = 1.0 - rawX;
    const normX = Math.max(0, Math.min(1, (mirroredX - MAP_X_MIN) / (MAP_X_MAX - MAP_X_MIN)));
    const normY = Math.max(0, Math.min(1, (rawY - MAP_Y_MIN) / (MAP_Y_MAX - MAP_Y_MIN)));
    return {
      x: normX * window.innerWidth,
      y: normY * window.innerHeight,
    };
  }, []);

  // ── Finger detection helpers ────────────────────────────────────────
  // Uses a margin to avoid noise: finger is "up" only if tip is
  // clearly above PIP (lower Y in camera space = higher on screen).

  const isExtended = useCallback((lm, tipIdx, pipIdx) => {
    return lm[tipIdx].y < lm[pipIdx].y - EXTENSION_MARGIN;
  }, []);

  const isThumbExtended = useCallback((lm) => {
    // Thumb uses lateral distance — works regardless of hand orientation.
    // Thumb tip (4) should be further from index MCP (5) than thumb IP (3).
    const indexMcp = lm[5];
    const thumbTip = lm[4];
    const thumbIP = lm[3];
    const tipDist = Math.abs(thumbTip.x - indexMcp.x) + Math.abs(thumbTip.y - indexMcp.y);
    const ipDist = Math.abs(thumbIP.x - indexMcp.x) + Math.abs(thumbIP.y - indexMcp.y);
    return tipDist > ipDist * 1.15; // 15% margin to prevent flicker
  }, []);

  const dist2D = useCallback((a, b) => {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }, []);

  // ── Click helper ──────────────────────────────────────────────────────

  const handleClick = useCallback(() => {
    const x = lastCursorRef.current.x;
    const y = lastCursorRef.current.y;
    const element = document.elementFromPoint(x, y);
    if (element) {
      element.click();
      chrome.storage.local.get(['voxsurfStats'], (result) => {
        if (result.voxsurfStats) {
          chrome.storage.local.set({
            voxsurfStats: {
              ...result.voxsurfStats,
              clicksByGaze: (result.voxsurfStats.clicksByGaze || 0) + 1,
            },
          });
        }
      });
    }
  }, []);

  // ── Classify raw gesture from landmarks ────────────────────────────

  const classifyGesture = useCallback((lm) => {
    const thumbUp = isThumbExtended(lm);
    const indexUp = isExtended(lm, 8, 6);
    const middleUp = isExtended(lm, 12, 10);
    const ringUp = isExtended(lm, 16, 14);
    const pinkyUp = isExtended(lm, 20, 18);
    const extendedCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

    const pinchDist = dist2D(lm[4], lm[8]);

    // Pinch uses hysteresis: must go below PINCH_THRESHOLD to engage,
    // must rise above PINCH_RELEASE to disengage.
    let pinchNow;
    if (pinchActiveRef.current) {
      pinchNow = pinchDist < PINCH_RELEASE; // stay pinched until clearly released
    } else {
      pinchNow = pinchDist < PINCH_THRESHOLD;
    }

    return {
      thumbUp,
      indexUp,
      middleUp,
      ringUp,
      pinkyUp,
      extendedCount,
      pinchDist,
      pinchNow,
      gesture: determineGesture(thumbUp, indexUp, middleUp, ringUp, pinkyUp, extendedCount, pinchNow),
    };
  }, [isExtended, isThumbExtended, dist2D]);

  const determineGesture = useCallback((thumbUp, indexUp, middleUp, ringUp, pinkyUp, extendedCount, pinchNow) => {
    // Priority order matters! Higher-priority gestures first.

    // 1. PINCH — thumb + index tips close together
    if (pinchNow) return 'pinch';

    // 2. OPEN PALM — all 5 fingers extended
    if (thumbUp && extendedCount >= 4) return 'palm';

    // 3. THUMBS UP — only thumb extended, all others curled
    if (thumbUp && extendedCount === 0) return 'thumbsup';

    // 4. THREE FINGERS — index + middle + ring (not pinky)
    if (indexUp && middleUp && ringUp && !pinkyUp) return 'three-finger';

    // 5. TWO FINGERS (V) — index + middle only
    if (indexUp && middleUp && !ringUp && !pinkyUp) return 'scroll';

    // 6. FIST — no fingers extended, no thumb
    if (!thumbUp && extendedCount === 0) return 'fist';

    // 7. POINT — index finger up (catch-all for any index-up state)
    if (indexUp) return 'point';

    // 8. Nothing recognised
    return 'none';
  }, []);

  // ── Main frame processing ─────────────────────────────────────────────

  useEffect(() => {
    if (!handLandmarks || !settings.eyeEnabled) {
      // No hand visible — reset everything
      if (confirmedGestureRef.current !== 'none') {
        confirmedGestureRef.current = 'none';
        setActiveGesture('none');
      }
      rawGestureRef.current = 'none';
      rawStreakRef.current = 0;
      scrollBaseRef.current = null;
      grabBaseRef.current = null;
      swipeStartRef.current = null;
      thumbsUpFiredRef.current = false;
      pinchActiveRef.current = false;
      setIsPinching(false);
      setIsDwelling(false);
      setDwellProgress(0);
      return;
    }

    const lm = handLandmarks;
    const { gesture: rawGesture, pinchDist, pinchNow, indexUp } = classifyGesture(lm);

    // ── Temporal smoothing ─────────────────────────────────────────────
    // Track consecutive frames of the same raw classification.
    if (rawGesture === rawGestureRef.current) {
      rawStreakRef.current++;
    } else {
      rawGestureRef.current = rawGesture;
      rawStreakRef.current = 1;
    }

    // Determine the required confirmation frames for this gesture
    const isDestructive = rawGesture === 'thumbsup' || rawGesture === 'three-finger';
    const requiredFrames = isDestructive ? CONFIRM_DESTRUCTIVE : CONFIRM_FRAMES;

    // Only change confirmed gesture when streak meets threshold
    let confirmedGesture = confirmedGestureRef.current;
    if (rawStreakRef.current >= requiredFrames && rawGesture !== confirmedGesture) {
      confirmedGesture = rawGesture;
      confirmedGestureRef.current = rawGesture;
      setActiveGesture(rawGesture);

      // Reset state when switching gestures
      if (rawGesture !== 'scroll') scrollBaseRef.current = null;
      if (rawGesture !== 'fist') grabBaseRef.current = null;
      if (rawGesture !== 'three-finger') swipeStartRef.current = null;
      if (rawGesture !== 'thumbsup') thumbsUpFiredRef.current = false;
      if (rawGesture !== 'pinch') { pinchActiveRef.current = false; setIsPinching(false); }
      if (rawGesture !== 'point') { setIsDwelling(false); setDwellProgress(0); dwellStartRef.current = null; }
    }

    // ── Execute action based on CONFIRMED gesture ─────────────────────
    // (Not raw — so single-frame glitches don't trigger actions)

    switch (confirmedGesture) {
      // ── PINCH → click ────────────────────────────────────────────────
      case 'pinch': {
        if (!pinchActiveRef.current) {
          const now = Date.now();
          if (now - lastPinchTimeRef.current > PINCH_COOLDOWN) {
            pinchActiveRef.current = true;
            lastPinchTimeRef.current = now;
            setIsPinching(true);
            handleClick();
          }
        }
        // Don't move cursor during pinch
        break;
      }

      // ── OPEN PALM → neutral / pause ──────────────────────────────────
      case 'palm':
        // Intentionally do nothing — hand visible but paused
        break;

      // ── THUMBS UP → go back (once per gesture) ──────────────────────
      case 'thumbsup': {
        if (!thumbsUpFiredRef.current) {
          thumbsUpFiredRef.current = true;
          window.history.back();
        }
        break;
      }

      // ── THREE FINGERS → swipe navigation ─────────────────────────────
      case 'three-finger': {
        const avgX = (lm[8].x + lm[12].x + lm[16].x) / 3;
        if (swipeStartRef.current === null) {
          swipeStartRef.current = avgX;
        } else {
          const dx = avgX - swipeStartRef.current;
          if (Math.abs(dx) > SWIPE_THRESHOLD) {
            if (dx > 0) {
              window.history.back();   // mirrored
            } else {
              window.history.forward();
            }
            swipeStartRef.current = avgX;
          }
        }
        break;
      }

      // ── FIST → grab-scroll ───────────────────────────────────────────
      case 'fist': {
        const wristY = lm[0].y;
        if (grabBaseRef.current === null) {
          grabBaseRef.current = wristY;
        } else {
          const dy = wristY - grabBaseRef.current;
          if (Math.abs(dy) > 0.01) {
            window.scrollBy({ top: dy * 600, behavior: 'auto' });
            grabBaseRef.current = wristY;
          }
        }
        break;
      }

      // ── TWO FINGERS → scroll ─────────────────────────────────────────
      case 'scroll': {
        const avgX = (lm[8].x + lm[12].x) / 2;
        const avgY = (lm[8].y + lm[12].y) / 2;
        if (scrollBaseRef.current === null) {
          scrollBaseRef.current = { x: avgX, y: avgY };
        } else {
          const dx = avgX - scrollBaseRef.current.x;
          const dy = avgY - scrollBaseRef.current.y;
          if (Math.abs(dy) > 0.008) {
            window.scrollBy({ top: dy * SCROLL_SPEED * 80, behavior: 'auto' });
            scrollBaseRef.current.y = avgY;
          }
          if (Math.abs(dx) > 0.012) {
            window.scrollBy({ left: -dx * SCROLL_SPEED * 80, behavior: 'auto' });
            scrollBaseRef.current.x = avgX;
          }
        }
        break;
      }

      // ── POINT → cursor + dwell ───────────────────────────────────────
      case 'point': {
        const indexTip = lm[8];
        const { x: targetX, y: targetY } = mapToScreen(indexTip.x, indexTip.y);

        // Smooth with lerp
        const lerp = 0.3;
        const newX = lastCursorRef.current.x + (targetX - lastCursorRef.current.x) * lerp;
        const newY = lastCursorRef.current.y + (targetY - lastCursorRef.current.y) * lerp;
        const clampedX = Math.max(0, Math.min(window.innerWidth, newX));
        const clampedY = Math.max(0, Math.min(window.innerHeight, newY));

        // Dwell detection
        const moved = Math.sqrt(
          (clampedX - lastCursorRef.current.x) ** 2 +
          (clampedY - lastCursorRef.current.y) ** 2
        );

        if (moved < DWELL_MOVE_THRESH) {
          if (!dwellStartRef.current) {
            dwellStartRef.current = Date.now();
          }
          const elapsed = Date.now() - dwellStartRef.current;
          const progress = Math.min(1, elapsed / DWELL_TIME);
          setDwellProgress(progress);
          setIsDwelling(progress > 0.1);
          if (elapsed >= DWELL_TIME) {
            handleClick();
            dwellStartRef.current = null;
            setDwellProgress(0);
            setIsDwelling(false);
          }
        } else {
          dwellStartRef.current = Date.now();
          setDwellProgress(0);
          setIsDwelling(false);
        }

        lastCursorRef.current = { x: clampedX, y: clampedY };
        setCursorX(clampedX);
        setCursorY(clampedY);
        break;
      }

      default:
        break;
    }

    // ── Release pinch state when confirmed gesture is no longer pinch ──
    if (confirmedGesture !== 'pinch' && pinchActiveRef.current) {
      pinchActiveRef.current = false;
      setIsPinching(false);
    }
  }, [handLandmarks, settings.eyeEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Voice "click" listener ────────────────────────────────────────────

  useEffect(() => {
    const onVoiceClick = () => handleClick();
    document.addEventListener('voxsurf:click-at-cursor', onVoiceClick);
    return () => document.removeEventListener('voxsurf:click-at-cursor', onVoiceClick);
  }, [handleClick]);

  // ── Calibration ───────────────────────────────────────────────────────

  const startCalibration = useCallback(() => {
    calibrationRef.current = {
      points: [
        { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.1 },
        { x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 },
        { x: 0.1, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.9 },
      ],
      matrix: [1, 0, 0, 0, 1, 0],
    };
    chrome.storage.local.set({ handCalibration: calibrationRef.current });
  }, []);

  useEffect(() => {
    chrome.storage.local.get(['handCalibration'], (result) => {
      if (result.handCalibration) calibrationRef.current = result.handCalibration;
    });
  }, []);

  return {
    cursorX,
    cursorY,
    isDwelling,
    dwellProgress,
    isPinching,
    activeGesture,
    startCalibration,
  };
}
