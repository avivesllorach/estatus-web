import { apiService } from '../api';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock EventSource
global.EventSource = vi.fn().mockImplementation(() => ({
  onopen: null,
  onmessage: null,
  onerror: null,
  close: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('ApiService Memory Leak Prevention', () => {
  let mockEventSource: any;
  let originalSetTimeout: typeof setTimeout;
  let originalClearTimeout: typeof clearTimeout;
  let timeoutCallbacks: Array<() => void> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    timeoutCallbacks = [];

    // Mock setTimeout to capture callback functions
    originalSetTimeout = global.setTimeout;
    originalClearTimeout = global.clearTimeout;

    global.setTimeout = vi.fn((callback, delay) => {
      const id = timeoutCallbacks.length;
      timeoutCallbacks.push(callback);
      return id as any;
    }) as any;

    global.clearTimeout = vi.fn((id) => {
      // Remove callback if it exists
      if (typeof id === 'number' && timeoutCallbacks[id]) {
        timeoutCallbacks[id] = null;
      }
    });

    mockEventSource = {
      onopen: null,
      onmessage: null,
      onerror: null,
      close: jest.fn(),
    };
    (global.EventSource as vi.Mock).mockReturnValue(mockEventSource);
  });

  afterEach(() => {
    // Restore original functions
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;

    // Clean up any existing connections
    apiService.disconnect();
  });

  it('should clear reconnection timeout when disconnect is called', () => {
    const mockCallback = vi.fn();

    // Connect to SSE
    apiService.connectToStatusUpdates(mockCallback);

    // Simulate connection error
    mockEventSource.onerror({});

    // Should have scheduled a reconnection timeout
    expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

    // Get the timeout ID
    const timeoutId = (global.setTimeout as vi.Mock).mock.results[0].value;

    // Disconnect should clear the timeout
    apiService.disconnect();

    expect(global.clearTimeout).toHaveBeenCalledWith(timeoutId);
  });

  it('should clear previous reconnection timeout when connecting again', () => {
    const mockCallback = vi.fn();

    // Connect to SSE
    apiService.connectToStatusUpdates(mockCallback);

    // Simulate connection error to schedule reconnection
    mockEventSource.onerror({});

    // Get the first timeout ID
    const firstTimeoutId = (global.setTimeout as vi.Mock).mock.results[0].value;

    // Connect again (should clear previous timeout)
    apiService.connectToStatusUpdates(mockCallback);

    expect(global.clearTimeout).toHaveBeenCalledWith(firstTimeoutId);

    // Should create new connection
    expect(global.EventSource).toHaveBeenCalledTimes(2);
    expect(mockEventSource.close).toHaveBeenCalledTimes(1);
  });

  it('should not reconnect after disconnect if callbacks are cleared', () => {
    const mockCallback = vi.fn();

    // Connect to SSE
    apiService.connectToStatusUpdates(mockCallback);

    // Simulate connection error
    mockEventSource.onerror({});

    // Get the reconnection callback
    const reconnectionCallback = (global.setTimeout as vi.Mock).mock.calls[0][0];

    // Disconnect to clear callbacks
    apiService.disconnect();

    // Call reconnection callback - should not reconnect since callbacks are cleared
    reconnectionCallback();

    // Should not create new EventSource
    expect(global.EventSource).toHaveBeenCalledTimes(1);
  });

  it('should not reconnect if no status update callback exists', () => {
    // Connect with minimal callbacks
    apiService.connectToStatusUpdates(
      vi.fn(), // onUpdate
      vi.fn(), // onGroupsUpdate
      vi.fn(), // onServerRemoved
      vi.fn(), // onServerUpdated
      vi.fn()  // onError
    );

    // Clear the main callback manually to simulate component cleanup
    (apiService as any).onStatusUpdateCallback = null;

    // Simulate connection error
    mockEventSource.onerror({});

    // Should not schedule reconnection when no main callback exists
    expect(global.setTimeout).not.toHaveBeenCalled();
  });

  it('should handle rapid connect/disconnect cycles without memory leaks', () => {
    const mockCallback = vi.fn();

    // Rapid connect/disconnect cycles
    for (let i = 0; i < 5; i++) {
      apiService.connectToStatusUpdates(mockCallback);

      // Simulate error to trigger reconnection
      mockEventSource.onerror({});

      // Disconnect immediately
      apiService.disconnect();
    }

    // All reconnection timeouts should be cleared
    expect(global.clearTimeout).toHaveBeenCalledTimes(5);

    // All EventSources should be closed
    expect(mockEventSource.close).toHaveBeenCalledTimes(5);
  });

  it('should prevent multiple reconnection attempts from accumulating', () => {
    const mockCallback = vi.fn();

    // Connect to SSE
    apiService.connectToStatusUpdates(mockCallback);

    // Simulate multiple errors in quick succession
    for (let i = 0; i < 3; i++) {
      mockEventSource.onerror({});
    }

    // Should have attempted to clear previous timeouts
    expect(global.clearTimeout).toHaveBeenCalledTimes(2); // Clears 2 previous timeouts
    expect(global.setTimeout).toHaveBeenCalledTimes(3); // Creates 3 new timeouts
  });
});