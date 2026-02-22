import { useState, useEffect, useRef, useCallback } from 'react';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  return (
    target.isContentEditable ||
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select'
  );
}

function detectContextMode() {
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  const title = document.title.toLowerCase();

  const hasDinoCanvas = Boolean(
    document.querySelector('canvas.runner-canvas, canvas#runner-canvas, canvas[class*="runner"], canvas[id*="runner"]')
  );
  const looksLikeDino =
    host.includes('chromedino') ||
    host.includes('elgoog') ||
    path.includes('dino') ||
    title.includes('dino');

  if (hasDinoCanvas || looksLikeDino) return 'dino';
  if (host.includes('youtube.com') || host === 'youtu.be') return 'youtube';
  if (host.includes('instagram.com') && (path.startsWith('/reels') || path.startsWith('/reel/'))) {
    return 'instagram';
  }
  return 'browser';
}

export function useGesture(settings, handLandmarks) {
  const [cursorX, setCursorX] = useState(window.innerWidth / 2);
  const [cursorY, setCursorY] = useState(window.innerHeight / 2);
  const [isDwelling, setIsDwelling] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [isPinching, setIsPinching] = useState(false);
  const [activeGesture, setActiveGesture] = useState('none');
  const [contextMode, setContextMode] = useState(() => detectContextMode());

  const lastCursorRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const pinchActiveRef = useRef(false);
  const lastPinchTimeRef = useRef(0);

  const dwellStartRef = useRef(null);

  const scrollBaseRef = useRef(null);
  const scrollVelocityRef = useRef(0);

  const youtubeBaseRef = useRef(null);
  const lastYouTubeActionTimeRef = useRef(0);

  const reelsAccumRef = useRef(0);
  const lastReelStepTimeRef = useRef(0);

  const rawGestureRef = useRef('none');
  const rawStreakRef = useRef(0);
  const confirmedGestureRef = useRef('none');
  const thumbsUpFiredRef = useRef(false);

  const dinoDuckRef = useRef(false);
  const calibrationRef = useRef(null);

  const PINCH_THRESHOLD = 0.055;
  const PINCH_RELEASE = 0.09;
  const PINCH_COOLDOWN = 280;

  const DWELL_TIME = 900;
  const DWELL_MOVE_THRESH = 15;

  const CONFIRM_FRAMES = 3;
  const CONFIRM_DESTRUCTIVE = 6;

  const EXTENSION_MARGIN = 0.015;

  const SCROLL_DEADZONE = 0.003;
  const SCROLL_GAIN = 2300;
  const SCROLL_FILTER = 0.72;
  const SCROLL_DECAY = 0.84;
  const SCROLL_MAX_STEP = 85;

  const REELS_TRIGGER = 0.055;
  const REELS_COOLDOWN = 500;

  const YT_SWIPE_THRESHOLD = 0.05;
  const YT_ACTION_COOLDOWN = 300;

  const MAP_X_MIN = 0.12;
  const MAP_X_MAX = 0.88;
  const MAP_Y_MIN = 0.08;
  const MAP_Y_MAX = 0.9;

  useEffect(() => {
    const updateMode = () => setContextMode(detectContextMode());
    updateMode();

    const timer = setInterval(updateMode, 800);
    const onPopState = () => updateMode();
    window.addEventListener('popstate', onPopState);

    return () => {
      clearInterval(timer);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (isEditableTarget(event.target)) return;
      if (!event.altKey || !event.shiftKey) return;

      const key = event.key.toLowerCase();
      if (event.key === 'ArrowRight' || key === 'l') {
        event.preventDefault();
        chrome.runtime.sendMessage({ type: 'NEXT_TAB' });
      } else if (event.key === 'ArrowLeft' || key === 'h') {
        event.preventDefault();
        chrome.runtime.sendMessage({ type: 'PREV_TAB' });
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const mapToScreen = useCallback((rawX, rawY) => {
    const mirroredX = 1 - rawX;
    const normX = clamp((mirroredX - MAP_X_MIN) / (MAP_X_MAX - MAP_X_MIN), 0, 1);
    const normY = clamp((rawY - MAP_Y_MIN) / (MAP_Y_MAX - MAP_Y_MIN), 0, 1);
    return {
      x: normX * window.innerWidth,
      y: normY * window.innerHeight,
    };
  }, []);

  const isExtended = useCallback((lm, tipIdx, pipIdx) => {
    return lm[tipIdx].y < lm[pipIdx].y - EXTENSION_MARGIN;
  }, []);

  const isThumbExtended = useCallback((lm) => {
    const indexMcp = lm[5];
    const thumbTip = lm[4];
    const thumbIP = lm[3];
    const tipDist = Math.abs(thumbTip.x - indexMcp.x) + Math.abs(thumbTip.y - indexMcp.y);
    const ipDist = Math.abs(thumbIP.x - indexMcp.x) + Math.abs(thumbIP.y - indexMcp.y);
    return tipDist > ipDist * 1.15;
  }, []);

  const dist2D = useCallback((a, b) => {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }, []);

  const dispatchKey = useCallback((type, key, code, keyCode) => {
    const targets = [document.activeElement, document.body, document, window].filter(Boolean);
    targets.forEach((target) => {
      try {
        const evt = new KeyboardEvent(type, {
          key,
          code,
          keyCode,
          which: keyCode,
          bubbles: true,
          cancelable: true,
        });
        target.dispatchEvent(evt);
      } catch (error) {
        // Ignore unsupported targets.
      }
    });
  }, []);

  const tapKey = useCallback(
    (key, code, keyCode) => {
      dispatchKey('keydown', key, code, keyCode);
      setTimeout(() => dispatchKey('keyup', key, code, keyCode), 24);
    },
    [dispatchKey]
  );

  const setDinoDuck = useCallback(
    (enabled) => {
      if (enabled && !dinoDuckRef.current) {
        dinoDuckRef.current = true;
        dispatchKey('keydown', 'ArrowDown', 'ArrowDown', 40);
      } else if (!enabled && dinoDuckRef.current) {
        dinoDuckRef.current = false;
        dispatchKey('keyup', 'ArrowDown', 'ArrowDown', 40);
      }
    },
    [dispatchKey]
  );

  useEffect(() => {
    return () => setDinoDuck(false);
  }, [setDinoDuck]);

  const getCenterVideo = useCallback(() => {
    const videos = Array.from(document.querySelectorAll('video'));
    if (videos.length === 0) return null;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    let best = null;
    let bestScore = -Infinity;

    videos.forEach((video) => {
      const rect = video.getBoundingClientRect();
      const visibleW = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
      const visibleH = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      const visibleArea = visibleW * visibleH;
      if (visibleArea <= 0) return;

      const vx = rect.left + rect.width / 2;
      const vy = rect.top + rect.height / 2;
      const dist = Math.hypot(vx - cx, vy - cy);
      const score = visibleArea - dist * 300;

      if (score > bestScore) {
        bestScore = score;
        best = video;
      }
    });

    return best;
  }, []);

  const toggleYouTubePlayPause = useCallback(() => {
    const video = document.querySelector('video');
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {
        document.querySelector('.ytp-play-button')?.click();
      });
    } else {
      video.pause();
    }
  }, []);

  const adjustYouTubeVolume = useCallback((delta) => {
    const video = document.querySelector('video');
    if (!video) return;
    const next = clamp((video.volume || 0) + delta, 0, 1);
    video.volume = next;
    video.muted = next <= 0.001;
  }, []);

  const seekYouTube = useCallback((deltaSeconds) => {
    const video = document.querySelector('video');
    if (!video) return;

    const duration = Number.isFinite(video.duration) ? video.duration : video.currentTime + Math.abs(deltaSeconds);
    video.currentTime = clamp(video.currentTime + deltaSeconds, 0, duration);
  }, []);

  const toggleYouTubeMute = useCallback(() => {
    const video = document.querySelector('video');
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const toggleReelPlayPause = useCallback(() => {
    const video = getCenterVideo();
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [getCenterVideo]);

  const stepReels = useCallback((direction) => {
    const step = Math.round(window.innerHeight * 0.9);
    window.scrollBy({ top: direction * step, behavior: 'smooth' });
  }, []);

  const handleClick = useCallback(() => {
    const x = lastCursorRef.current.x;
    const y = lastCursorRef.current.y;
    const element = document.elementFromPoint(x, y);
    if (!element) return;

    element.click();

    chrome.storage.local.get(['voxsurfStats'], (result) => {
      if (result.voxsurfStats) {
        chrome.storage.local.set({
          voxsurfStats: {
            ...result.voxsurfStats,
            clicksByHand: (result.voxsurfStats.clicksByHand || 0) + 1,
          },
        });
      }
    });
  }, []);

  const classifyGesture = useCallback(
    (lm) => {
      const thumbUp = isThumbExtended(lm);
      const indexUp = isExtended(lm, 8, 6);
      const middleUp = isExtended(lm, 12, 10);
      const ringUp = isExtended(lm, 16, 14);
      const pinkyUp = isExtended(lm, 20, 18);
      const extendedCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

      const pinchDist = dist2D(lm[4], lm[8]);
      const pinchNow = pinchActiveRef.current ? pinchDist < PINCH_RELEASE : pinchDist < PINCH_THRESHOLD;

      if (pinchNow) return 'pinch';
      if (!thumbUp && extendedCount === 0) return 'fist';
      if (indexUp && middleUp && !ringUp && !pinkyUp) return 'scroll';
      if (thumbUp && extendedCount >= 4) return 'palm';
      if (thumbUp && extendedCount === 0) return 'thumbsup';
      if (indexUp) return 'point';
      return 'none';
    },
    [isExtended, isThumbExtended, dist2D]
  );

  const applyBrowserSmoothScroll = useCallback((dy) => {
    const target = Math.abs(dy) > SCROLL_DEADZONE ? dy * SCROLL_GAIN : 0;
    scrollVelocityRef.current =
      scrollVelocityRef.current * SCROLL_FILTER + target * (1 - SCROLL_FILTER);

    const step = clamp(scrollVelocityRef.current, -SCROLL_MAX_STEP, SCROLL_MAX_STEP);
    if (Math.abs(step) > 0.2) {
      window.scrollBy({ top: step, behavior: 'auto' });
    }
  }, []);

  const decayBrowserScroll = useCallback(() => {
    scrollVelocityRef.current *= SCROLL_DECAY;
    const step = clamp(scrollVelocityRef.current, -SCROLL_MAX_STEP, SCROLL_MAX_STEP);
    if (Math.abs(step) > 0.2) {
      window.scrollBy({ top: step, behavior: 'auto' });
    }
  }, []);

  const performPrimaryAction = useCallback(() => {
    if (contextMode === 'dino') {
      tapKey(' ', 'Space', 32);
    } else if (contextMode === 'youtube') {
      toggleYouTubePlayPause();
    } else if (contextMode === 'instagram') {
      toggleReelPlayPause();
    } else {
      handleClick();
    }
  }, [contextMode, tapKey, toggleYouTubePlayPause, toggleReelPlayPause, handleClick]);

  useEffect(() => {
    if (!handLandmarks || !settings.handEnabled) {
      rawGestureRef.current = 'none';
      rawStreakRef.current = 0;
      confirmedGestureRef.current = 'none';
      setActiveGesture('none');

      scrollBaseRef.current = null;
      youtubeBaseRef.current = null;
      reelsAccumRef.current = 0;
      scrollVelocityRef.current = 0;

      pinchActiveRef.current = false;
      setIsPinching(false);

      setIsDwelling(false);
      setDwellProgress(0);
      dwellStartRef.current = null;

      thumbsUpFiredRef.current = false;
      setDinoDuck(false);
      return;
    }

    const lm = handLandmarks;
    const rawGesture = classifyGesture(lm);

    if (rawGesture === rawGestureRef.current) {
      rawStreakRef.current += 1;
    } else {
      rawGestureRef.current = rawGesture;
      rawStreakRef.current = 1;
    }

    const requiredFrames = rawGesture === 'thumbsup' ? CONFIRM_DESTRUCTIVE : CONFIRM_FRAMES;

    let confirmedGesture = confirmedGestureRef.current;
    let justConfirmed = false;

    if (rawStreakRef.current >= requiredFrames && rawGesture !== confirmedGesture) {
      confirmedGesture = rawGesture;
      confirmedGestureRef.current = rawGesture;
      setActiveGesture(rawGesture);
      justConfirmed = true;

      if (rawGesture !== 'scroll') {
        scrollBaseRef.current = null;
        youtubeBaseRef.current = null;
      }
      if (rawGesture !== 'point') {
        setIsDwelling(false);
        setDwellProgress(0);
        dwellStartRef.current = null;
      }
      if (rawGesture !== 'thumbsup') {
        thumbsUpFiredRef.current = false;
      }
      if (rawGesture !== 'pinch') {
        pinchActiveRef.current = false;
        setIsPinching(false);
      }
    }

    switch (confirmedGesture) {
      case 'pinch': {
        if (!pinchActiveRef.current) {
          const now = Date.now();
          if (now - lastPinchTimeRef.current > PINCH_COOLDOWN) {
            pinchActiveRef.current = true;
            lastPinchTimeRef.current = now;
            setIsPinching(true);
            performPrimaryAction();
          }
        }
        break;
      }

      case 'scroll': {
        if (contextMode === 'browser') {
          const avgY = (lm[8].y + lm[12].y) / 2;
          if (scrollBaseRef.current === null) {
            scrollBaseRef.current = avgY;
          } else {
            const dy = avgY - scrollBaseRef.current;
            scrollBaseRef.current = avgY;
            applyBrowserSmoothScroll(dy);
          }
        } else if (contextMode === 'instagram') {
          const avgY = (lm[8].y + lm[12].y) / 2;
          if (scrollBaseRef.current === null) {
            scrollBaseRef.current = avgY;
          } else {
            const dy = avgY - scrollBaseRef.current;
            scrollBaseRef.current = avgY;
            reelsAccumRef.current += dy;

            const now = Date.now();
            if (
              Math.abs(reelsAccumRef.current) > REELS_TRIGGER &&
              now - lastReelStepTimeRef.current > REELS_COOLDOWN
            ) {
              stepReels(Math.sign(reelsAccumRef.current));
              lastReelStepTimeRef.current = now;
              reelsAccumRef.current = 0;
            }
          }
        } else if (contextMode === 'youtube') {
          const avgX = (lm[8].x + lm[12].x) / 2;
          const avgY = (lm[8].y + lm[12].y) / 2;
          if (youtubeBaseRef.current === null) {
            youtubeBaseRef.current = { x: avgX, y: avgY };
          } else {
            const dx = avgX - youtubeBaseRef.current.x;
            const dy = avgY - youtubeBaseRef.current.y;
            const now = Date.now();

            if (now - lastYouTubeActionTimeRef.current > YT_ACTION_COOLDOWN) {
              if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > YT_SWIPE_THRESHOLD) {
                seekYouTube(dx > 0 ? -10 : 10);
                lastYouTubeActionTimeRef.current = now;
              } else if (Math.abs(dy) > YT_SWIPE_THRESHOLD) {
                adjustYouTubeVolume(dy > 0 ? -0.08 : 0.08);
                lastYouTubeActionTimeRef.current = now;
              }
            }

            youtubeBaseRef.current = { x: avgX, y: avgY };
          }
        }
        break;
      }

      case 'point': {
        const indexTip = lm[8];
        const { x: rawTargetX, y: rawTargetY } = mapToScreen(indexTip.x, indexTip.y);

        const sensitivity = settings.sensitivity || 1;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const targetX = centerX + (rawTargetX - centerX) * sensitivity;
        const targetY = centerY + (rawTargetY - centerY) * sensitivity;

        const lerp = 0.4;
        const newX = lastCursorRef.current.x + (targetX - lastCursorRef.current.x) * lerp;
        const newY = lastCursorRef.current.y + (targetY - lastCursorRef.current.y) * lerp;

        const clampedX = clamp(newX, 0, window.innerWidth);
        const clampedY = clamp(newY, 0, window.innerHeight);

        if (contextMode === 'browser') {
          const moved = Math.hypot(
            clampedX - lastCursorRef.current.x,
            clampedY - lastCursorRef.current.y
          );

          if (moved < DWELL_MOVE_THRESH) {
            if (!dwellStartRef.current) {
              dwellStartRef.current = Date.now();
            }
            const elapsed = Date.now() - dwellStartRef.current;
            const progress = clamp(elapsed / DWELL_TIME, 0, 1);
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
        }

        lastCursorRef.current = { x: clampedX, y: clampedY };
        setCursorX(clampedX);
        setCursorY(clampedY);
        break;
      }

      case 'palm': {
        if (contextMode === 'youtube' && justConfirmed) {
          toggleYouTubeMute();
        }
        break;
      }

      case 'fist': {
        if (contextMode === 'dino') {
          setDinoDuck(true);
        }
        break;
      }

      case 'thumbsup': {
        if (contextMode === 'dino' && !thumbsUpFiredRef.current) {
          thumbsUpFiredRef.current = true;
          tapKey('Enter', 'Enter', 13);
        }
        break;
      }

      default:
        break;
    }

    if (contextMode === 'browser' && confirmedGesture !== 'scroll') {
      decayBrowserScroll();
    }

    if (contextMode !== 'dino' || confirmedGesture !== 'fist') {
      setDinoDuck(false);
    }

    if (confirmedGesture !== 'pinch' && pinchActiveRef.current) {
      pinchActiveRef.current = false;
      setIsPinching(false);
    }
  }, [
    handLandmarks,
    settings.handEnabled,
    settings.sensitivity,
    contextMode,
    classifyGesture,
    mapToScreen,
    performPrimaryAction,
    applyBrowserSmoothScroll,
    decayBrowserScroll,
    stepReels,
    seekYouTube,
    adjustYouTubeVolume,
    toggleYouTubeMute,
    handleClick,
    tapKey,
    setDinoDuck,
  ]);

  const startCalibration = useCallback(() => {
    calibrationRef.current = {
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.5, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.1, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 0.9, y: 0.5 },
        { x: 0.1, y: 0.9 },
        { x: 0.5, y: 0.9 },
        { x: 0.9, y: 0.9 },
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
    contextMode,
    startCalibration,
  };
}
