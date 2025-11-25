import { useRef, useEffect, useCallback } from 'react';

export function useFocusPreservation() {
  const focusedElementRef = useRef<HTMLElement | null>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save the currently focused element
  const saveFocus = useCallback(() => {
    focusedElementRef.current = document.activeElement as HTMLElement;
  }, []);

  // Restore focus to the previously focused element
  const restoreFocus = useCallback(() => {
    if (focusedElementRef.current && focusedElementRef.current.focus) {
      // Use a small delay to ensure DOM has updated
      focusTimeoutRef.current = setTimeout(() => {
        if (focusedElementRef.current && typeof focusedElementRef.current.focus === 'function') {
          focusedElementRef.current.focus();
        }
      }, 16); // ~1 frame at 60fps
    }
  }, []);

  // Focus an element by selector
  const focusBySelector = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element && typeof element.focus === 'function') {
      focusTimeoutRef.current = setTimeout(() => {
        element.focus();
      }, 16);
    }
  }, []);

  // Focus an element directly
  const focusElement = useCallback((element: HTMLElement | null) => {
    if (element && typeof element.focus === 'function') {
      focusTimeoutRef.current = setTimeout(() => {
        element.focus();
      }, 16);
    }
  }, []);

  // Clear any pending focus operations
  const clearPendingFocus = useCallback(() => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
  }, []);

  // Auto-save focus on blur
  useEffect(() => {
    const handleBlur = () => {
      saveFocus();
    };

    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('blur', handleBlur, true);
      clearPendingFocus();
    };
  }, [saveFocus, clearPendingFocus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPendingFocus();
    };
  }, [clearPendingFocus]);

  return {
    saveFocus,
    restoreFocus,
    focusBySelector,
    focusElement,
    clearPendingFocus,
    currentFocusedElement: focusedElementRef.current
  };
}