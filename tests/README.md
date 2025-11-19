# Test Infrastructure - estatus-web

This document describes the test infrastructure setup for the estatus-web project, including fixtures, factories, and best practices.

## Overview

The test infrastructure addresses **3 critical testability concerns** identified in the test design phase:

1. **File-Based State Collision** - Isolated temp files per worker
2. **PingService State** - Reset method for test cleanup
3. **SSE Connection Leaks** - Automatic cleanup fixtures

## Directory Structure

```
tests/
├── fixtures/               # Playwright test fixtures
│   ├── index.ts           # Combined fixtures export
│   ├── sse-fixture.ts     # SSE event capture + cleanup
│   └── config-file-fixture.ts  # Config file isolation
├── support/
│   ├── factories/         # Test data factories
│   │   ├── server-factory.ts   # ServerConfig generation
│   │   ├── group-factory.ts    # GroupConfig generation
│   │   └── index.ts            # Centralized export
│   └── helpers/           # Test helper functions
│       └── sse-helpers.ts      # SSE utility functions
├── e2e/                   # End-to-end tests
│   └── example-server-management.spec.ts  # Reference implementation
└── README.md              # This file
```

## Fixtures

### SSE Fixture (`sse-fixture.ts`)

Captures Server-Sent Events and provides automatic cleanup to prevent connection leaks.

**Usage:**
```typescript
import { test, expect } from '../fixtures/sse-fixture';

test('server added event propagates', async ({ page, sseClient }) => {
  await page.goto('/config');

  const eventPromise = sseClient.waitForEvent('serverAdded');
  // ... trigger server addition
  const event = await eventPromise;

  expect(event.server.name).toBe('New Server');
});
```

**API:**
- `sseClient.waitForEvent(type, timeout?)` - Wait for specific event type
- `sseClient.getEvents(type?)` - Get all captured events (optionally filtered)
- `sseClient.clearEvents()` - Clear event buffer
- `sseClient.events` - Direct access to events array

### Config File Fixture (`config-file-fixture.ts`)

Provides isolated temporary configuration files for parallel test execution. Each worker gets unique temp files to prevent state collision.

**Usage:**
```typescript
import { test, expect } from '../fixtures/config-file-fixture';

test('add server via API', async ({ configFiles, request }) => {
  // configFiles.serversFile is unique per worker
  const response = await request.post('/api/config/servers', { ... });
  expect(response.status()).toBe(201);
});
```

**API:**
- `configFiles.serversFile` - Path to isolated servers.json
- `configFiles.layoutFile` - Path to isolated dashboard-layout.json
- `configFiles.tempDir` - Temp directory (auto-cleaned after test)

### Combined Fixtures (`fixtures/index.ts`)

Exports both fixtures in a single import for convenience.

**Usage:**
```typescript
import { test, expect } from '../fixtures';

test('full stack test', async ({ page, sseClient, configFiles }) => {
  // All fixtures available
});
```

## Factories

### Server Factory (`server-factory.ts`)

Generates `ServerConfig` objects with realistic test data.

**Usage:**
```typescript
import { createServer, createServers, resetServerCounter } from '../support/factories';

// Basic server
const server = createServer();

// Custom server
const custom = createServer({
  name: 'Production Server',
  ip: '10.0.0.1',
  consecutiveSuccesses: 5,
});

// Multiple servers
const servers = createServers(10);

// Server with SNMP monitoring
const snmpServer = createServerWithSNMP(2); // 2 disks

// Server with NetApp monitoring
const netappServer = createServerWithNetApp(3); // 3 LUNs

// Reset counter (in beforeEach)
resetServerCounter();
```

**Generated Fields:**
- `id` - `server-001`, `server-002`, etc. (auto-incremented)
- `name` - `Test Server server-001`, or custom
- `ip` - Random IPv4 (192.168.x.x), or custom
- `dnsAddress` - `serverX.local`, or custom
- `consecutiveSuccesses` - Default: 3
- `consecutiveFailures` - Default: 3
- `snmp` - Default: disabled
- `netapp` - Default: disabled

### Group Factory (`group-factory.ts`)

Generates `GroupConfig` objects for dashboard layout testing.

**Usage:**
```typescript
import { createGroup, createGroups, resetGroupCounter } from '../support/factories';

// Basic group
const group = createGroup();

// Custom group with servers
const custom = createGroup({
  name: 'Production',
  order: 1,
  serverIds: ['server-001', 'server-002'],
});

// Multiple groups
const groups = createGroups(5);

// Reset counter (in beforeEach)
resetGroupCounter();
```

## Helpers

### SSE Helpers (`sse-helpers.ts`)

Utility functions for working with SSE events.

**Usage:**
```typescript
import { calculateMaxGapBetweenEvents, captureSSEEvents } from '../support/helpers/sse-helpers';

// Calculate max gap between events (for NFR-P5 validation)
const events = [{ timestamp: '2025-01-01T00:00:00Z' }, { timestamp: '2025-01-01T00:00:03Z' }];
const maxGap = calculateMaxGapBetweenEvents(events);
expect(maxGap).toBeLessThan(5000); // <5s gap

// Capture events from page console
const events: SSEEvent[] = [];
captureSSEEvents(page, events, 'statusChange');
```

## Running Tests

### Prerequisites

Install dependencies:
```bash
# Install Playwright
npm install -D @playwright/test

# Install Playwright browsers
npx playwright install
```

### Run Commands

```bash
# All tests
npx playwright test

# Specific test file
npx playwright test tests/e2e/example-server-management.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Run with 1 worker (sequential, easier debugging)
npx playwright test --workers=1

# Run in headed mode (see browser)
npx playwright test --headed

# Generate HTML report
npx playwright show-report
```

### CI Integration

The `playwright.config.ts` is configured for CI/CD pipelines:
- Runs 4 workers in parallel
- Retries failed tests once
- Generates JUnit XML for CI integration
- Captures traces/screenshots on failure

**GitHub Actions Example:**
```yaml
- name: Run Playwright tests
  run: npx playwright test --workers=4

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Best Practices

### 1. Always Use Fixtures

❌ **BAD:**
```typescript
test('server test', async ({ page }) => {
  // Direct file writes (collision in parallel)
  await fs.writeFile('/home/arnau/estatus-web/backend/servers.json', ...);
});
```

✅ **GOOD:**
```typescript
test('server test', async ({ configFiles }) => {
  // Isolated temp files per worker
  await fs.writeFile(configFiles.serversFile, ...);
});
```

### 2. Reset Counters in beforeEach

❌ **BAD:**
```typescript
test('test 1', () => {
  const server = createServer(); // id: server-001
});

test('test 2', () => {
  const server = createServer(); // id: server-002 (non-deterministic!)
});
```

✅ **GOOD:**
```typescript
test.beforeEach(() => {
  resetAllCounters();
});

test('test 1', () => {
  const server = createServer(); // id: server-001
});

test('test 2', () => {
  const server = createServer(); // id: server-001 (deterministic!)
});
```

### 3. Use SSE Fixture for Event Testing

❌ **BAD:**
```typescript
test('SSE test', async ({ page }) => {
  // Manual event capture (prone to leaks)
  const eventSource = new EventSource('/api/events');
  // ... (no cleanup)
});
```

✅ **GOOD:**
```typescript
test('SSE test', async ({ sseClient }) => {
  // Automatic cleanup, no leaks
  const event = await sseClient.waitForEvent('serverAdded');
  expect(event.server.name).toBe('New Server');
});
```

### 4. Cleanup PingService in Tests

❌ **BAD:**
```typescript
test('ping service test', () => {
  const pingService = new PingService(servers);
  pingService.start();
  // ... (no cleanup, state leaks)
});
```

✅ **GOOD:**
```typescript
test('ping service test', () => {
  const pingService = new PingService(servers);
  pingService.start();

  // Test logic...

  pingService.reset(); // Cleanup
});
```

## Troubleshooting

### Tests Hanging in CI

**Cause:** SSE connections not closed, Node.js hits max connections.

**Solution:** Always use `sseClient` fixture, which auto-closes connections.

### Test Failures in Parallel Execution

**Cause:** Multiple workers writing to same `servers.json` file.

**Solution:** Always use `configFiles` fixture for isolated temp files.

### Flaky SSE Event Tests

**Cause:** Hard waits (`waitForTimeout(3000)`) or race conditions.

**Solution:** Use `sseClient.waitForEvent()` for deterministic waits.

### Factory IDs Colliding

**Cause:** Factory counters not reset between tests.

**Solution:** Add `resetAllCounters()` in `beforeEach`.

## Next Steps

1. **Install Faker.js** (optional, for more realistic data):
   ```bash
   npm install -D @faker-js/faker
   ```

2. **Add Integration Tests** (backend API tests without UI)

3. **Add Unit Tests** (validation logic, utilities)

4. **Set up CI Pipeline** (GitHub Actions workflow)

## References

- [Test Design Document](../docs/test-design-system.md)
- [Playwright Documentation](https://playwright.dev)
- [Architecture Document](../docs/architecture.md)
