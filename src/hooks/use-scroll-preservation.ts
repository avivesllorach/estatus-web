import { useRef, useEffect, useCallback } from 'react';

interface ScrollPosition {
  scrollTop: number;
  scrollLeft: number;
}

export function useScrollPreservation() {
  const scrollPositions = useRef<Map<string, ScrollPosition>>(new Map());
  const scrollElements = useRef<Map<string, HTMLElement>>(new Map());

  // Register a scrollable element with an identifier
  const registerScrollElement = useCallback((id: string, element: HTMLElement) => {
    scrollElements.current.set(id, element);

    // Restore scroll position if we have one saved
    const savedPosition = scrollPositions.current.get(id);
    if (savedPosition) {
      element.scrollTop = savedPosition.scrollTop;
      element.scrollLeft = savedPosition.scrollLeft;
    }
  }, []);

  // Unregister a scrollable element
  const unregisterScrollElement = useCallback((id: string) => {
    scrollElements.current.delete(id);
    scrollPositions.current.delete(id);
  }, []);

  // Save current scroll position for an element
  const saveScrollPosition = useCallback((id: string) => {
    const element = scrollElements.current.get(id);
    if (element) {
      scrollPositions.current.set(id, {
        scrollTop: element.scrollTop,
        scrollLeft: element.scrollLeft
      });
    }
  }, []);

  // Restore scroll position for an element
  const restoreScrollPosition = useCallback((id: string) => {
    const element = scrollElements.current.get(id);
    const savedPosition = scrollPositions.current.get(id);

    if (element && savedPosition) {
      // Use requestAnimationFrame for smooth restoration
      requestAnimationFrame(() => {
        element.scrollTop = savedPosition.scrollTop;
        element.scrollLeft = savedPosition.scrollLeft;
      });
    }
  }, []);

  // Save all scroll positions
  const saveAllScrollPositions = useCallback(() => {
    scrollElements.current.forEach((element, id) => {
      scrollPositions.current.set(id, {
        scrollTop: element.scrollTop,
        scrollLeft: element.scrollLeft
      });
    });
  }, []);

  // Restore all scroll positions
  const restoreAllScrollPositions = useCallback(() => {
    scrollElements.current.forEach((element, id) => {
      const savedPosition = scrollPositions.current.get(id);
      if (savedPosition) {
        requestAnimationFrame(() => {
          element.scrollTop = savedPosition.scrollTop;
          element.scrollLeft = savedPosition.scrollLeft;
        });
      }
    });
  }, []);

  // Auto-save scroll positions on scroll
  useEffect(() => {
    const handleScroll = (event: Event) => {
      const element = event.target as HTMLElement;
      // Find the element ID from our registered elements
      scrollElements.current.forEach((registeredElement, id) => {
        if (registeredElement === element) {
          scrollPositions.current.set(id, {
            scrollTop: element.scrollTop,
            scrollLeft: element.scrollLeft
          });
        }
      });
    };

    // Add scroll listeners to all registered elements
    scrollElements.current.forEach(element => {
      element.addEventListener('scroll', handleScroll, { passive: true });
    });

    return () => {
      // Clean up scroll listeners
      scrollElements.current.forEach(element => {
        element.removeEventListener('scroll', handleScroll);
      });
    };
  }, []);

  return {
    registerScrollElement,
    unregisterScrollElement,
    saveScrollPosition,
    restoreScrollPosition,
    saveAllScrollPositions,
    restoreAllScrollPositions
  };
}