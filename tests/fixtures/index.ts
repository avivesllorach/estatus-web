/**
 * Combined Test Fixtures for estatus-web
 *
 * Exports a unified test instance with all fixtures applied:
 * - SSE event capture and cleanup
 * - Config file isolation (parallel-safe)
 *
 * Usage:
 * import { test, expect } from './fixtures';
 *
 * test('full stack test with all fixtures', async ({ page, sseClient, configFiles }) => {
 *   // All fixtures available here
 * });
 */

import { test as base } from '@playwright/test';
import { test as sseTest, SSEFixture } from './sse-fixture';
import { test as configTest, ConfigFilesFixture } from './config-file-fixture';

// Merge all fixtures
export const test = base.extend<SSEFixture & ConfigFilesFixture>({
  // SSE fixture
  sseClient: sseTest.use({}).sseClient,

  // Config files fixture
  configFiles: configTest.use({}).configFiles,
});

export { expect } from '@playwright/test';
