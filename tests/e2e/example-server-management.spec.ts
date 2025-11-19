/**
 * Example E2E Test - Server Management
 *
 * Demonstrates usage of test fixtures and factories.
 * This is a reference implementation showing best practices.
 *
 * To run: npx playwright test tests/e2e/example-server-management.spec.ts
 */

import { test, expect } from '../fixtures';
import { createServer, resetAllCounters } from '../support/factories';
import fs from 'fs/promises';

test.describe('Server Management (Example)', () => {
  test.beforeEach(() => {
    // Reset factory counters for consistent test data
    resetAllCounters();
  });

  test('should load servers from config file', async ({ configFiles, request }) => {
    // Arrange: Create test servers in config file
    const servers = [
      createServer({ id: 'server-001', name: 'Test Server 1', ip: '192.168.1.10' }),
      createServer({ id: 'server-002', name: 'Test Server 2', ip: '192.168.1.20' }),
    ];

    await fs.writeFile(configFiles.serversFile, JSON.stringify(servers, null, 2));

    // Act: Fetch servers via API
    const response = await request.get('http://localhost:3001/api/servers');

    // Assert
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe('Test Server 1');
  });

  test('should capture SSE events', async ({ page, sseClient, configFiles }) => {
    // Arrange: Setup initial config
    await fs.writeFile(configFiles.serversFile, JSON.stringify([], null, 2));

    // Navigate to page that opens SSE connection
    await page.goto('http://localhost:5173/');

    // Act: Add server via API (should trigger SSE event)
    const server = createServer({ id: 'server-999', name: 'New Server' });
    await page.request.post('http://localhost:3001/api/config/servers', {
      data: server,
    });

    // Assert: Wait for SSE event
    const event = await sseClient.waitForEvent('serverAdded', 2000);
    expect(event.server.name).toBe('New Server');
  });

  test('should handle parallel execution (file isolation)', async ({ configFiles }) => {
    // Each test worker gets unique temp files
    console.log(`Worker temp dir: ${configFiles.tempDir}`);

    // Write to config file (no collision with other workers)
    const servers = [createServer()];
    await fs.writeFile(configFiles.serversFile, JSON.stringify(servers, null, 2));

    // Read back and verify
    const content = await fs.readFile(configFiles.serversFile, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toHaveLength(1);
  });

  test('should demonstrate factory usage', () => {
    // Create servers with different configurations
    const basicServer = createServer();
    expect(basicServer.id).toMatch(/server-\d{3}/);
    expect(basicServer.snmp?.enabled).toBe(false);

    const customServer = createServer({
      name: 'Custom Server',
      ip: '10.0.0.1',
      consecutiveSuccesses: 5,
    });
    expect(customServer.name).toBe('Custom Server');
    expect(customServer.ip).toBe('10.0.0.1');
  });
});
