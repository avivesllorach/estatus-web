/**
 * Configuration file paths with test environment override support
 *
 * In production: Uses default paths relative to backend directory
 * In tests: Set SERVERS_FILE and LAYOUT_FILE env vars to use isolated temp files
 *
 * Example test usage:
 * process.env.SERVERS_FILE = '/tmp/test-servers-worker-1.json';
 * process.env.LAYOUT_FILE = '/tmp/test-layout-worker-1.json';
 */

import * as path from 'path';

export const CONFIG_PATHS = {
  /**
   * Path to servers.json configuration file
   * Override with SERVERS_FILE env var for tests
   */
  servers: process.env.SERVERS_FILE || path.join(__dirname, '../../servers.json'),

  /**
   * Path to dashboard-layout.json configuration file
   * Override with LAYOUT_FILE env var for tests
   */
  layout: process.env.LAYOUT_FILE || path.join(__dirname, '../../dashboard-layout.json'),
};

/**
 * Check if running in test mode
 */
export const isTestMode = (): boolean => {
  return !!process.env.SERVERS_FILE || !!process.env.LAYOUT_FILE || process.env.NODE_ENV === 'test';
};
