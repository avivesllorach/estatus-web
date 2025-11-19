/**
 * Config File Isolation Fixture for Playwright Tests
 *
 * Provides isolated temporary configuration files for parallel test execution.
 * Each test worker gets unique temp files to prevent state collision.
 *
 * Usage:
 * import { test, expect } from './fixtures/config-file-fixture';
 *
 * test('add server via API', async ({ configFiles, request }) => {
 *   // configFiles.serversFile and configFiles.layoutFile are unique per worker
 *   const response = await request.post('/api/config/servers', { ... });
 *   expect(response.status()).toBe(201);
 * });
 */

import { test as base } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface ConfigFilesFixture {
  configFiles: {
    serversFile: string;
    layoutFile: string;
    tempDir: string;
  };
}

export const test = base.extend<ConfigFilesFixture>({
  configFiles: async ({ }, use, testInfo) => {
    // Create unique temp directory for this test worker
    const workerIndex = testInfo.workerIndex;
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `estatus-test-worker-${workerIndex}-`)
    );

    const serversFile = path.join(tempDir, 'servers.json');
    const layoutFile = path.join(tempDir, 'dashboard-layout.json');

    // Initialize with empty configs
    await fs.writeFile(serversFile, JSON.stringify([], null, 2));
    await fs.writeFile(layoutFile, JSON.stringify({ groups: [] }, null, 2));

    // Override backend to use test files
    process.env.SERVERS_FILE = serversFile;
    process.env.LAYOUT_FILE = layoutFile;
    process.env.NODE_ENV = 'test';

    console.log(`[TEST SETUP Worker ${workerIndex}] Created temp config files:`);
    console.log(`  - Servers: ${serversFile}`);
    console.log(`  - Layout: ${layoutFile}`);

    // Provide fixture data
    await use({ serversFile, layoutFile, tempDir });

    // Cleanup: Delete temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`[TEST CLEANUP Worker ${workerIndex}] Deleted temp directory: ${tempDir}`);
    } catch (error) {
      console.error(`[TEST CLEANUP Worker ${workerIndex}] Failed to delete temp directory:`, error);
    }

    // Clear env vars
    delete process.env.SERVERS_FILE;
    delete process.env.LAYOUT_FILE;
    delete process.env.NODE_ENV;
  },
});

export { expect } from '@playwright/test';
