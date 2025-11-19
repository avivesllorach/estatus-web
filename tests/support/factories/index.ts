/**
 * Factory Functions - Centralized Export
 *
 * Import all factory functions from a single location:
 * import { createServer, createGroup, resetCounters } from './support/factories';
 */

export * from './server-factory';
export * from './group-factory';

import { resetServerCounter } from './server-factory';
import { resetGroupCounter } from './group-factory';

/**
 * Reset all factory counters
 * Useful in global beforeEach hooks
 */
export function resetAllCounters(): void {
  resetServerCounter();
  resetGroupCounter();
}
