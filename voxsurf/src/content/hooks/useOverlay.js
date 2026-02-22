import { useState, useEffect, useRef, useCallback } from 'react';

export function useOverlay(settings) {
  const [elements, setElements] = useState([]);
  const mutationObserverRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const updateTimerRef = useRef(null);

  const scanDOM = useCallback(() => {
    const interactiveSelectors = [
      'a',
      'button',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[onclick]',
      '[tabindex]:not([tabindex="-1"])',
    ];

    const foundElements = [];
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    interactiveSelectors.forEach((selector) => {
      try {
        const nodes = document.querySelectorAll(selector);
        nodes.forEach((element) => {
          const rect = element.getBoundingClientRect();
          
          // Only include elements in viewport
          if (
            rect.top < viewportHeight &&
            rect.bottom > 0 &&
            rect.left < viewportWidth &&
            rect.right > 0
          ) {
            // Skip if already added
            if (foundElements.some((e) => e.element === element)) {
              return;
            }

            const text = element.textContent?.trim() || '';
            const ariaLabel = element.getAttribute('aria-label') || '';
            const placeholder = element.getAttribute('placeholder') || '';
            const type = element.tagName?.toLowerCase() || '';
            const role = element.getAttribute('role') || '';

            foundElements.push({
              id: `voxsurf-${foundElements.length}`,
              element,
              rect: {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height,
              },
              text: text.substring(0, 50),
              ariaLabel,
              placeholder,
              type,
              role,
              index: foundElements.length + 1,
            });
          }
        });
      } catch (error) {
        console.error(`Error scanning selector ${selector}:`, error);
      }
    });

    // Limit to 30 elements in viewport
    const limitedElements = foundElements.slice(0, 30);

    // Set data attributes for overlay
    limitedElements.forEach((item, idx) => {
      item.element.setAttribute('data-voxsurf-index', idx + 1);
    });

    setElements(limitedElements);
  }, []);

  const updateRects = useCallback(() => {
    setElements((prev) =>
      prev.map((item) => {
        const rect = item.element.getBoundingClientRect();
        return {
          ...item,
          rect: {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          },
        };
      })
    );
  }, []);

  const debouncedScan = useCallback(() => {
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    updateTimerRef.current = setTimeout(scanDOM, 500);
  }, [scanDOM]);

  useEffect(() => {
    if (!settings.showLabels) {
      setElements([]);
      return;
    }

    // Initial scan
    scanDOM();

    // MutationObserver for DOM changes
    mutationObserverRef.current = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          shouldUpdate = true;
        }
      });
      if (shouldUpdate) {
        debouncedScan();
      }
    });

    mutationObserverRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'placeholder', 'onclick', 'tabindex'],
    });

    // Update on scroll (debounced)
    const handleScroll = () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      scrollTimerRef.current = setTimeout(() => {
        updateRects();
        debouncedScan();
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Patch pushState/popState for SPA route changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      debouncedScan();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      debouncedScan();
    };

    window.addEventListener('popstate', debouncedScan);

    return () => {
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
      }
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('popstate', debouncedScan);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [settings.showLabels, scanDOM, updateRects, debouncedScan]);

  return {
    elements,
    refresh: scanDOM,
  };
}
