/**
 * SSE Helper Functions for Tests
 *
 * Utility functions for working with Server-Sent Events in tests.
 */

import { Page } from '@playwright/test';
import { SSEEvent } from '../../fixtures/sse-fixture';

/**
 * Calculate the maximum gap between consecutive events
 * Useful for validating monitoring continuity (NFR-P5: gaps <5s)
 *
 * @param events - Array of SSE events with timestamps
 * @returns Maximum gap in milliseconds between consecutive events
 */
export function calculateMaxGapBetweenEvents(events: Array<{ timestamp: Date | string }>): number {
  if (events.length < 2) {
    return 0;
  }

  let maxGap = 0;
  for (let i = 1; i < events.length; i++) {
    const prev = new Date(events[i - 1].timestamp).getTime();
    const curr = new Date(events[i].timestamp).getTime();
    const gap = curr - prev;
    maxGap = Math.max(maxGap, gap);
  }

  return maxGap;
}

/**
 * Capture SSE events from page console
 * Pushes events to the provided array as they arrive
 *
 * @param page - Playwright page instance
 * @param events - Array to store captured events
 * @param filter - Optional event type filter
 */
export function captureSSEEvents(
  page: Page,
  events: SSEEvent[],
  filter?: string
): void {
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.startsWith('SSE_EVENT:')) {
      const match = text.match(/SSE_EVENT:(\w+):(.+)/);
      if (match) {
        const [, type, data] = match;
        try {
          const event = JSON.parse(data);
          if (!filter || event.type === filter) {
            events.push(event);
          }
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      }
    }
  });
}

/**
 * Wait for SSE event with custom predicate
 * More flexible than sseClient.waitForEvent() - allows custom matching logic
 *
 * @param page - Playwright page instance
 * @param predicate - Function to test each event
 * @param timeout - Maximum wait time in milliseconds
 * @returns Promise resolving to matching event
 */
export async function waitForSSEEventMatching(
  page: Page,
  predicate: (event: SSEEvent) => boolean,
  timeout = 5000
): Promise<SSEEvent> {
  const events: SSEEvent[] = [];
  captureSSEEvents(page, events);

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`No matching SSE event within ${timeout}ms`));
    }, timeout);

    const interval = setInterval(() => {
      const match = events.find(predicate);
      if (match) {
        clearTimeout(timeoutId);
        clearInterval(interval);
        resolve(match);
      }
    }, 100);
  });
}
