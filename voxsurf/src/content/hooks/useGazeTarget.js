import { useState, useEffect, useRef, useCallback } from 'react';

export function useGazeTarget(gaze, settings) {
  const [gazeTarget, setGazeTarget] = useState(null);
  const [gazeTargetLabel, setGazeTargetLabel] = useState('');
  const [gazeTargetIndex, setGazeTargetIndex] = useState(null);
  const targetRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const lastElementRef = useRef(null);

  const findMeaningfulElement = useCallback((element) => {
    if (!element) return null;

    let current = element;
    let depth = 0;
    const maxDepth = 5;

    while (current && depth < maxDepth) {
      // Check if element is interactive
      const tagName = current.tagName?.toLowerCase();
      const role = current.getAttribute('role');
      const hasOnClick = current.onclick !== null;
      const hasTabIndex = current.tabIndex >= 0;
      const hasText = current.textContent?.trim().length > 0;

      if (
        tagName === 'a' ||
        tagName === 'button' ||
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        role === 'button' ||
        role === 'link' ||
        role === 'menuitem' ||
        hasOnClick ||
        (hasTabIndex && hasText)
      ) {
        return current;
      }

      current = current.parentElement;
      depth++;
    }

    // Fallback: return element with text content
    if (element.textContent?.trim().length > 0) {
      return element;
    }

    return null;
  }, []);

  const getElementLabel = useCallback((element) => {
    if (!element) return '';

    const tagName = element.tagName?.toLowerCase();
    const ariaLabel = element.getAttribute('aria-label');
    const placeholder = element.getAttribute('placeholder');
    const text = element.textContent?.trim();
    const title = element.getAttribute('title');
    const alt = element.getAttribute('alt');

    if (ariaLabel) return ariaLabel;
    if (placeholder) return placeholder;
    if (title) return title;
    if (alt) return alt;
    if (text && text.length < 50) return text;
    if (tagName) return `${tagName} element`;

    return 'element';
  }, []);

  const updateGazeTarget = useCallback(() => {
    if (!settings.eyeEnabled || !gaze.isTracking) {
      setGazeTarget(null);
      setGazeTargetLabel('');
      setGazeTargetIndex(null);
      return;
    }

    const element = document.elementFromPoint(gaze.gazeX, gaze.gazeY);
    const meaningfulElement = findMeaningfulElement(element);

    if (meaningfulElement !== lastElementRef.current) {
      // Reset debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (meaningfulElement) {
          setGazeTarget(meaningfulElement);
          setGazeTargetLabel(getElementLabel(meaningfulElement));
          
          // Check if element has an overlay index
          const index = meaningfulElement.getAttribute('data-voxsurf-index');
          setGazeTargetIndex(index ? parseInt(index) : null);
        } else {
          setGazeTarget(null);
          setGazeTargetLabel('');
          setGazeTargetIndex(null);
        }
        lastElementRef.current = meaningfulElement;
      }, 150); // 150ms debounce
    }
  }, [gaze.gazeX, gaze.gazeY, gaze.isTracking, settings.eyeEnabled, findMeaningfulElement, getElementLabel]);

  useEffect(() => {
    const interval = setInterval(updateGazeTarget, 50); // Check every 50ms
    return () => clearInterval(interval);
  }, [updateGazeTarget]);

  return {
    gazeTarget,
    gazeTargetLabel,
    gazeTargetIndex,
  };
}
