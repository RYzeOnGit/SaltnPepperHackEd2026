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

function isUiLikeElement(element) {
  if (!element) return false;
  if (element.closest('button,[role="button"],a,input,select,textarea,label,[onclick],[data-action]')) {
    return true;
  }
  return false;
}

const CLICKABLE_SELECTOR =
  'button,[role="button"],a,input,select,textarea,label,[onclick],[data-action],[aria-label]';
const SHORTS_UI_CONTROL_PATTERN =
  /like|dislike|comment|comments|share|subscribe|subscribed|mute|unmute|volume|more|menu|report/i;

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
  if (host.includes('youtube.com') && path.startsWith('/shorts')) return 'youtube-shorts';
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

  const scrollVelocityRef = useRef(0);

  const lastYouTubeActionTimeRef = useRef(0);
  const lastDinoJumpTimeRef = useRef(0);

  const lastReelStepTimeRef = useRef(0);
  const fistBaseYRef = useRef(null);
  const fistPrevYRef = useRef(null);

  const rawGestureRef = useRef('none');
  const rawStreakRef = useRef(0);
  const confirmedGestureRef = useRef('none');
  const thumbsUpFiredRef = useRef(false);

  const dinoDuckRef = useRef(false);
  const dinoPinchTargetRef = useRef(null);
  const dinoPinchStartRef = useRef(0);
  const dinoPinchClickedRef = useRef(false);
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

  const FEED_STEP_COOLDOWN = 520;
  const REELS_FIST_STEP_THRESHOLD = 0.04;
  const FIST_SCROLL_DY_GAIN = 1.4;

  const YT_ACTION_COOLDOWN = 320;
  const DINO_JUMP_COOLDOWN = 260;
  const DINO_UI_PINCH_HOLD_MS = 320;

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

  const isInverted = useCallback((lm, tipIdx, pipIdx) => {
    return lm[tipIdx].y > lm[pipIdx].y + EXTENSION_MARGIN;
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

  const toggleYouTubeFullscreen = useCallback(() => {
    const button = document.querySelector('.ytp-fullscreen-button');
    if (button) {
      button.click();
      return;
    }
    tapKey('f', 'KeyF', 70);
  }, [tapKey]);

  const toggleShortsPlayPause = useCallback(() => {
    const video =
      document.querySelector('ytd-reel-video-renderer video') ||
      document.querySelector('video');
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {
        tapKey('k', 'KeyK', 75);
      });
    } else {
      video.pause();
    }
  }, [tapKey]);

  const stepVerticalFeed = useCallback((direction) => {
    const step = Math.round(window.innerHeight * 0.9);
    window.scrollBy({ top: direction * step, behavior: 'smooth' });
  }, []);

  const stepYouTubeShort = useCallback(
    (direction) => {
      if (direction > 0) {
        tapKey('ArrowDown', 'ArrowDown', 40);
      } else {
        tapKey('ArrowUp', 'ArrowUp', 38);
      }
      // Fallback for layouts that still react to scroll.
      stepVerticalFeed(direction);
    },
    [tapKey, stepVerticalFeed]
  );

  const getPalmCenterY = useCallback((lm) => {
    // Average palm anchors for stable vertical motion tracking.
    return (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5;
  }, []);

  const handleClick = useCallback((x, y) => {
    const clickX = x ?? lastCursorRef.current.x;
    const clickY = y ?? lastCursorRef.current.y;
    const element = document.elementFromPoint(clickX, clickY);
    if (!element) return false;

    const clickTarget = element.closest(CLICKABLE_SELECTOR) || element;

    const evtOpts = { bubbles: true, cancelable: true, clientX: clickX, clientY: clickY, view: window };
    if (typeof PointerEvent !== 'undefined') {
      clickTarget.dispatchEvent(
        new PointerEvent('pointerdown', { ...evtOpts, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1 })
      );
    }
    clickTarget.dispatchEvent(new MouseEvent('mousedown', evtOpts));
    if (typeof PointerEvent !== 'undefined') {
      clickTarget.dispatchEvent(
        new PointerEvent('pointerup', { ...evtOpts, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 0 })
      );
    }
    clickTarget.dispatchEvent(new MouseEvent('mouseup', evtOpts));
    clickTarget.dispatchEvent(new MouseEvent('click', evtOpts));
    clickTarget.click?.();

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

    return true;
  }, []);

  const classifyGesture = useCallback(
    (lm) => {
      const thumbUp = isThumbExtended(lm);
      const indexUp = isExtended(lm, 8, 6);
      const middleUp = isExtended(lm, 12, 10);
      const ringUp = isExtended(lm, 16, 14);
      const pinkyUp = isExtended(lm, 20, 18);

      const indexDown = isInverted(lm, 8, 6);
      const middleDown = isInverted(lm, 12, 10);
      const ringDown = isInverted(lm, 16, 14);

      const extendedCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

      const pinchDist = dist2D(lm[4], lm[8]);
      const pinchNow = pinchActiveRef.current ? pinchDist < PINCH_RELEASE : pinchDist < PINCH_THRESHOLD;

      if (pinchNow) return 'pinch';
      if (contextMode === 'dino' && indexUp && middleUp && !ringUp && !pinkyUp) return 'dino-duck';
      if (contextMode === 'youtube' && indexUp && middleUp && !ringUp && !pinkyUp) return 'yt-forward';
      if (contextMode === 'youtube' && thumbUp && pinkyUp && !indexUp && !middleUp && !ringUp) return 'yt-backward';
      if (contextMode === 'youtube' && !thumbUp && indexUp && middleUp && ringUp && !pinkyUp) return 'yt-vol-up';
      if (contextMode === 'youtube' && !thumbUp && indexDown && middleDown && ringDown && !pinkyUp) return 'yt-vol-down';
      if (contextMode === 'youtube' && indexUp && pinkyUp && !middleUp && !ringUp) return 'yt-fullscreen';
      if (contextMode === 'youtube-shorts' && thumbUp && pinkyUp && !indexUp && !middleUp && !ringUp) {
        return 'shorts-prev';
      }
      if (contextMode === 'youtube-shorts' && indexUp && middleUp && !thumbUp) {
        return 'scroll-up';
      }
      if (!thumbUp && extendedCount === 0) return 'fist';
      if (thumbUp && extendedCount >= 4) return 'palm';
      if (thumbUp && extendedCount === 0) return 'thumbsup';
      if (indexUp) return 'point';
      return 'none';
    },
    [contextMode, isExtended, isInverted, isThumbExtended, dist2D]
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

  useEffect(() => {
    if (!handLandmarks || !settings.handEnabled) {
      rawGestureRef.current = 'none';
      rawStreakRef.current = 0;
      confirmedGestureRef.current = 'none';
      setActiveGesture('none');

      scrollVelocityRef.current = 0;
      fistBaseYRef.current = null;
      fistPrevYRef.current = null;

      pinchActiveRef.current = false;
      setIsPinching(false);

      setIsDwelling(false);
      setDwellProgress(0);
      dwellStartRef.current = null;

      thumbsUpFiredRef.current = false;
      setDinoDuck(false);
      dinoPinchTargetRef.current = null;
      dinoPinchStartRef.current = 0;
      dinoPinchClickedRef.current = false;
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
        dinoPinchTargetRef.current = null;
        dinoPinchStartRef.current = 0;
        dinoPinchClickedRef.current = false;
      }
      if (rawGesture !== 'fist') {
        fistBaseYRef.current = null;
        fistPrevYRef.current = null;
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

            if (contextMode === 'dino') {
              const target = document.elementFromPoint(
                lastCursorRef.current.x,
                lastCursorRef.current.y
              );
              dinoPinchTargetRef.current = target;
              dinoPinchStartRef.current = now;
              dinoPinchClickedRef.current = false;

              if (!isUiLikeElement(target) && now - lastDinoJumpTimeRef.current > DINO_JUMP_COOLDOWN) {
                tapKey(' ', 'Space', 32);
                lastDinoJumpTimeRef.current = now;
              }
            } else if (contextMode === 'youtube') {
              toggleYouTubePlayPause();
            } else if (contextMode === 'youtube-shorts') {
              const indexTip = lm[8];
              const { x: rawTargetX, y: rawTargetY } = mapToScreen(indexTip.x, indexTip.y);
              const sensitivity = settings.sensitivity || 1;
              const centerX = window.innerWidth / 2;
              const centerY = window.innerHeight / 2;
              const clickX = clamp(
                centerX + (rawTargetX - centerX) * sensitivity,
                0,
                window.innerWidth
              );
              const clickY = clamp(
                centerY + (rawTargetY - centerY) * sensitivity,
                0,
                window.innerHeight
              );

              lastCursorRef.current = { x: clickX, y: clickY };
              setCursorX(clickX);
              setCursorY(clickY);

              const element = document.elementFromPoint(clickX, clickY);
              const interactiveTarget = element?.closest(CLICKABLE_SELECTOR);

              const ariaLabel = (
                interactiveTarget?.getAttribute('aria-label') ||
                interactiveTarget?.getAttribute('title') ||
                ''
              ).trim();

              if (interactiveTarget && SHORTS_UI_CONTROL_PATTERN.test(ariaLabel)) {
                handleClick(clickX, clickY);
              } else {
                // Non-control areas should always behave as play/pause.
                toggleShortsPlayPause();
              }
            } else {
              handleClick();
            }
          }
        } else if (contextMode === 'dino') {
          const target = dinoPinchTargetRef.current;
          const current = document.elementFromPoint(
            lastCursorRef.current.x,
            lastCursorRef.current.y
          );

          if (current !== target) {
            dinoPinchTargetRef.current = current;
            dinoPinchStartRef.current = Date.now();
            dinoPinchClickedRef.current = false;
          } else if (
            current &&
            isUiLikeElement(current) &&
            !dinoPinchClickedRef.current &&
            Date.now() - dinoPinchStartRef.current >= DINO_UI_PINCH_HOLD_MS
          ) {
            handleClick();
            dinoPinchClickedRef.current = true;
          }
        }
        break;
      }

      case 'yt-forward': {
        const now = Date.now();
        if (contextMode === 'youtube' && justConfirmed && now - lastYouTubeActionTimeRef.current > YT_ACTION_COOLDOWN) {
          seekYouTube(10);
          lastYouTubeActionTimeRef.current = now;
        }
        break;
      }

      case 'yt-backward': {
        const now = Date.now();
        if (contextMode === 'youtube' && justConfirmed && now - lastYouTubeActionTimeRef.current > YT_ACTION_COOLDOWN) {
          seekYouTube(-10);
          lastYouTubeActionTimeRef.current = now;
        }
        break;
      }

      case 'yt-vol-up': {
        const now = Date.now();
        if (contextMode === 'youtube' && justConfirmed && now - lastYouTubeActionTimeRef.current > YT_ACTION_COOLDOWN) {
          adjustYouTubeVolume(0.08);
          lastYouTubeActionTimeRef.current = now;
        }
        break;
      }

      case 'yt-vol-down': {
        const now = Date.now();
        if (contextMode === 'youtube' && justConfirmed && now - lastYouTubeActionTimeRef.current > YT_ACTION_COOLDOWN) {
          adjustYouTubeVolume(-0.08);
          lastYouTubeActionTimeRef.current = now;
        }
        break;
      }

      case 'yt-fullscreen': {
        const now = Date.now();
        if (contextMode === 'youtube' && justConfirmed && now - lastYouTubeActionTimeRef.current > YT_ACTION_COOLDOWN) {
          toggleYouTubeFullscreen();
          lastYouTubeActionTimeRef.current = now;
        }
        break;
      }

      case 'scroll-up': {
        if (contextMode === 'youtube-shorts') {
          const now = Date.now();
          if (now - lastReelStepTimeRef.current > FEED_STEP_COOLDOWN) {
            // Shorts request: two-finger up means move down to next short.
            stepYouTubeShort(1);
            lastReelStepTimeRef.current = now;
          }
        }
        break;
      }

      case 'shorts-prev': {
        if (contextMode === 'youtube-shorts') {
          const now = Date.now();
          if (justConfirmed && now - lastReelStepTimeRef.current > FEED_STEP_COOLDOWN) {
            // Shorts previous short on thumb + pinky out.
            stepYouTubeShort(-1);
            lastReelStepTimeRef.current = now;
          }
        }
        break;
      }

      case 'fist': {
        const fistY = getPalmCenterY(lm);

        if (contextMode === 'browser') {
          if (fistPrevYRef.current === null) {
            fistPrevYRef.current = fistY;
          } else {
            const dy = (fistY - fistPrevYRef.current) * FIST_SCROLL_DY_GAIN;
            applyBrowserSmoothScroll(dy);
            fistPrevYRef.current = fistY;
          }
        } else if (contextMode === 'instagram') {
          if (fistBaseYRef.current === null) {
            fistBaseYRef.current = fistY;
          }

          const dyFromBase = fistY - fistBaseYRef.current;
          const now = Date.now();
          if (
            Math.abs(dyFromBase) >= REELS_FIST_STEP_THRESHOLD &&
            now - lastReelStepTimeRef.current > FEED_STEP_COOLDOWN
          ) {
            const direction = dyFromBase > 0 ? 1 : -1;
            stepVerticalFeed(direction);
            lastReelStepTimeRef.current = now;
            fistBaseYRef.current = fistY;
          }
        }
        break;
      }

      case 'dino-duck': {
        setDinoDuck(true);
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

    if (
      contextMode === 'browser' &&
      confirmedGesture !== 'fist'
    ) {
      decayBrowserScroll();
    }

    if (
      contextMode !== 'dino' || confirmedGesture !== 'dino-duck'
    ) {
      setDinoDuck(false);
    }

    if (confirmedGesture !== 'pinch' && pinchActiveRef.current) {
      pinchActiveRef.current = false;
      setIsPinching(false);
      dinoPinchTargetRef.current = null;
      dinoPinchStartRef.current = 0;
      dinoPinchClickedRef.current = false;
    }
  }, [
    handLandmarks,
    settings.handEnabled,
    settings.sensitivity,
    contextMode,
    classifyGesture,
    mapToScreen,
    applyBrowserSmoothScroll,
    decayBrowserScroll,
    stepVerticalFeed,
    stepYouTubeShort,
    getPalmCenterY,
    seekYouTube,
    adjustYouTubeVolume,
    toggleYouTubeMute,
    toggleYouTubeFullscreen,
    toggleShortsPlayPause,
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
