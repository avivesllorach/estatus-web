/**
 * SSE (Server-Sent Events) Fixture for Playwright Tests
 *
 * Provides automatic SSE connection management with cleanup to prevent connection leaks.
 * Captures events from EventSource and provides helpers for waiting on specific event types.
 *
 * Usage:
 * import { test, expect } from './fixtures/sse-fixture';
 *
 * test('server added event propagates', async ({ page, sseClient }) => {
 *   await page.goto('/config');
 *
 *   const eventPromise = sseClient.waitForEvent('serverAdded');
 *   await page.click('[data-testid="add-server-button"]');
 *   // ... fill form and save
 *
 *   const event = await eventPromise;
 *   expect(event.server.name).toBe('New Server');
 * });
 */

import { test as base, Page } from '@playwright/test';

export interface SSEEvent {
  type: string;
  [key: string]: any;
}

export interface SSEFixture {
  sseClient: {
    events: SSEEvent[];
    waitForEvent: (type: string, timeout?: number) => Promise<SSEEvent>;
    getEvents: (type?: string) => SSEEvent[];
    clearEvents: () => void;
  };
}

export const test = base.extend<SSEFixture>({
  sseClient: async ({ page }, use) => {
    const events: SSEEvent[] = [];
    let isConnected = false;

    // Inject EventSource interceptor into page context
    await page.addInitScript(() => {
      // Store original EventSource
      const OriginalEventSource = window.EventSource;

      // Override EventSource to capture events
      (window as any).EventSource = class extends OriginalEventSource {
        constructor(url: string, config?: EventSourceInit) {
          super(url, config);

          // Capture all message events
          this.addEventListener('message', (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              console.log(`SSE_EVENT:${data.type}:${JSON.stringify(data)}`);
            } catch (e) {
              console.log(`SSE_RAW:${event.data}`);
            }
          });

          // Capture connection opened
          this.addEventListener('open', () => {
            console.log('SSE_CONNECTED');
          });

          // Capture errors
          this.addEventListener('error', (error) => {
            console.error('SSE_ERROR:', error);
          });
        }
      };
    });

    // Capture events from console logs
    page.on('console', (msg) => {
      const text = msg.text();

      if (text === 'SSE_CONNECTED') {
        isConnected = true;
        return;
      }

      if (text.startsWith('SSE_EVENT:')) {
        const match = text.match(/SSE_EVENT:(\w+):(.+)/);
        if (match) {
          const [, type, data] = match;
          try {
            events.push(JSON.parse(data));
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    });

    /**
     * Wait for a specific SSE event type
     * @param type - Event type to wait for (e.g., 'serverAdded', 'statusChange')
     * @param timeout - Maximum time to wait in milliseconds (default: 5000)
     * @returns Promise resolving to the matching event
     */
    const waitForEvent = (type: string, timeout = 5000): Promise<SSEEvent> => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`SSE event '${type}' not received within ${timeout}ms. Received: ${events.map(e => e.type).join(', ')}`));
        }, timeout);

        // Check if event already exists
        const existingEvent = events.find((e) => e.type === type);
        if (existingEvent) {
          clearTimeout(timeoutId);
          resolve(existingEvent);
          return;
        }

        // Poll for event
        const interval = setInterval(() => {
          const event = events.find((e) => e.type === type);
          if (event) {
            clearTimeout(timeoutId);
            clearInterval(interval);
            resolve(event);
          }
        }, 100);
      });
    };

    /**
     * Get all captured events, optionally filtered by type
     * @param type - Optional event type filter
     * @returns Array of matching events
     */
    const getEvents = (type?: string): SSEEvent[] => {
      if (type) {
        return events.filter((e) => e.type === type);
      }
      return [...events];
    };

    /**
     * Clear all captured events
     */
    const clearEvents = (): void => {
      events.length = 0;
    };

    // Provide fixture API
    await use({
      events,
      waitForEvent,
      getEvents,
      clearEvents,
    });

    // Cleanup: Close SSE connection
    await page.evaluate(() => {
      // Close EventSource if exists
      const eventSource = (window as any).eventSource;
      if (eventSource && eventSource.close) {
        eventSource.close();
      }
    }).catch(() => {
      // Ignore cleanup errors (page might be closed)
    });

    console.log(`[TEST CLEANUP] SSE fixture cleaned up. Captured ${events.length} events.`);
  },
});

export { expect } from '@playwright/test';
