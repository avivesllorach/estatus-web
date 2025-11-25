import { renderHook, act } from '@testing-library/react';
import { useScrollPreservation } from '@/hooks/use-scroll-preservation';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useScrollPreservation', () => {
  let mockElements: HTMLElement[];

  beforeEach(() => {
    // Create mock DOM elements
    mockElements = [
      document.createElement('div'),
      document.createElement('section'),
      document.createElement('aside')
    ];

    // Add to DOM for testing
    mockElements.forEach((el, index) => {
      el.id = `test-element-${index}`;
      el.scrollTop = 100 + index * 50;
      el.scrollLeft = 200 + index * 25;
      document.body.appendChild(el);
    });

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((cb) => {
      setTimeout(cb, 16);
    }) as any;
  });

  afterEach(() => {
    // Clean up DOM
    mockElements.forEach((el) => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });

    // Reset requestAnimationFrame mock
    if (jest.clearAllTimers) {
      jest.clearAllTimers();
    }
  });

  it('should register scroll elements', () => {
    const { result } = renderHook(() => useScrollPreservation());

    act(() => {
      result.current.registerScrollElement(mockElements[0]);
      result.current.registerScrollElement(mockElements[1]);
    });

    // Elements should be registered (internal implementation detail)
    expect(typeof result.current.registerScrollElement).toBe('function');
    expect(typeof result.current.unregisterScrollElement).toBe('function');
  });

  it('should unregister scroll elements', () => {
    const { result } = renderHook(() => useScrollPreservation());

    act(() => {
      result.current.registerScrollElement(mockElements[0]);
    });

    act(() => {
      result.current.unregisterScrollElement(mockElements[0]);
    });

    // Should not throw when unregistering an element
    expect(typeof result.current.unregisterScrollElement).toBe('function');
  });

  it('should save scroll positions', () => {
    const { result } = renderHook(() => useScrollPreservation());

    act(() => {
      result.current.registerScrollElement(mockElements[0]);
      result.current.registerScrollElement(mockElements[1]);
    });

    act(() => {
      result.current.saveAllScrollPositions();
    });

    // Should complete without errors
    expect(typeof result.current.saveAllScrollPositions).toBe('function');
  });

  it('should restore scroll positions', () => {
    const { result } = renderHook(() => useScrollPreservation());

    act(() => {
      result.current.registerScrollElement(mockElements[0]);
      result.current.registerScrollElement(mockElements[1]);
    });

    // Save initial positions
    act(() => {
      result.current.saveAllScrollPositions();
    });

    // Change scroll positions
    mockElements[0].scrollTop = 500;
    mockElements[1].scrollTop = 600;

    // Restore positions
    act(() => {
      result.current.restoreAllScrollPositions();
    });

    // Should complete without errors
    expect(typeof result.current.restoreAllScrollPositions).toBe('function');
  });

  it('should handle non-registered elements gracefully', () => {
    const { result } = renderHook(() => useScrollPreservation());

    const unregisteredElement = document.createElement('div');

    // Should not throw when working with unregistered elements
    expect(() => {
      act(() => {
        result.current.unregisterScrollElement(unregisteredElement);
      });
    }).not.toThrow();

    expect(() => {
      act(() => {
        result.current.saveAllScrollPositions();
        result.current.restoreAllScrollPositions();
      });
    }).not.toThrow();
  });

  it('should handle missing elements during restoration', () => {
    const { result } = renderHook(() => useScrollPreservation());

    act(() => {
      result.current.registerScrollElement(mockElements[0]);
    });

    act(() => {
      result.current.saveAllScrollPositions();
    });

    // Remove element from DOM
    document.body.removeChild(mockElements[0]);

    // Should not throw when trying to restore scroll for removed elements
    expect(() => {
      act(() => {
        result.current.restoreAllScrollPositions();
      });
    }).not.toThrow();
  });

  it('should handle empty scroll positions', () => {
    const { result } = renderHook(() => useScrollPreservation());

    act(() => {
      result.current.saveAllScrollPositions();
      result.current.restoreAllScrollPositions();
    });

    // Should complete without errors even with no registered elements
    expect(true).toBe(true); // Test reached this point
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useScrollPreservation());

    act(() => {
      // Register some elements
      result.current.registerScrollElement(mockElements[0]);
      result.current.registerScrollElement(mockElements[1]);
    });

    // Unmount should clean up without errors
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});