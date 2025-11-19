# System-Level Test Design - estatus-web

**Project:** estatus-web - Server Monitoring Dashboard with Self-Service Configuration
**Version:** 1.0
**Date:** 2025-11-17
**Author:** Murat (Test Architect)
**Phase:** Phase 3 - Solutioning (Testability Review)

---

## Executive Summary

This document provides a **system-level testability review** for the estatus-web configuration UI enhancement project. The review evaluates the architecture's testability before the implementation readiness gate, identifying risks, test strategy, and infrastructure requirements for Sprint 0.

**Project Context:**
- **Type:** Brownfield enhancement to existing React 18 + Express monitoring dashboard
- **Scope:** 4 epics, 34 stories, 73 functional requirements (100% coverage)
- **Complexity:** Low (single-user, local deployment, no authentication)
- **Key Innovation:** Hot-reload backend configuration without dropping SSE connections

**Testability Verdict:** ✅ **PASS with CONCERNS**

The architecture is generally well-designed for testing, with API-first design, event-driven hot-reload, and clear separation of concerns. However, **3 critical concerns** must be addressed before Sprint 0 to enable parallel test execution and prevent flaky tests.

---

## Table of Contents

1. [Testability Assessment](#testability-assessment)
2. [Architecturally Significant Requirements (ASRs)](#architecturally-significant-requirements-asrs)
3. [Test Levels Strategy](#test-levels-strategy)
4. [NFR Testing Approach](#nfr-testing-approach)
5. [Test Environment Requirements](#test-environment-requirements)
6. [Testability Concerns](#testability-concerns)
7. [Recommendations for Sprint 0](#recommendations-for-sprint-0)

---

## Testability Assessment

### Controllability: PASS with CONCERNS

**Definition:** Ability to control system state for testing (API seeding, factories, database reset)

#### ✅ Strengths

**API-First Design:**
- New REST endpoints (`POST /api/config/servers`, `PUT /api/config/groups/:id`) enable fast test data setup
- Existing `/api/servers` endpoint allows read verification
- Backend operations isolated from UI (testable independently)

**File-Based Persistence:**
- `servers.json` and `dashboard-layout.json` can be seeded programmatically
- JSON format is easy to manipulate in tests (no complex database setup)

**Event-Driven Architecture:**
- ConfigManager uses EventEmitter pattern (testable with mocks)
- Clear event boundaries: file write → `emit('servers-changed')` → PingService update → SSE broadcast

**Delta-Based Updates:**
- PingService only updates changed servers (testable in isolation)
- Add/remove/update operations have distinct code paths (easy to assert)

#### ⚠️ Concerns

**Hot-Reload Timing:**
- Multi-step async chain: ConfigManager reload → PingService delta update → SSE broadcast
- Tests need deterministic waits for each phase (risk of flaky tests with hard waits)
- **Mitigation:** Add `waitForConfigReload()` test helper that listens for SSE events

**Atomic File Writes:**
- Temp file + rename pattern is good, but error scenarios need validation
- Tests must verify temp file cleanup on failure (could leak temp files)
- **Mitigation:** Integration tests with mocked `fs.rename` failures

**Multi-Client Sync:**
- Tests need orchestration to simulate Computer A editing while Computer B observes
- Race conditions possible if SSE events arrive out of order
- **Mitigation:** Create test fixture with 2 browser contexts in parallel

**Example Test Helper:**
```typescript
// tests/support/helpers/sse-helpers.ts
export async function waitForSSEEvent(
  page: Page,
  eventType: string,
  timeout = 5000
): Promise<SSEEvent> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`SSE event '${eventType}' not received within ${timeout}ms`));
    }, timeout);

    page.on('console', (msg) => {
      if (msg.text().includes(`SSE:${eventType}`)) {
        clearTimeout(timeoutId);
        const event = JSON.parse(msg.text().replace(`SSE:${eventType}:`, ''));
        resolve(event);
      }
    });
  });
}
```

---

### Observability: PASS

**Definition:** Ability to inspect system state (logging, metrics, traces)

#### ✅ Strengths

**SSE Events Provide Real-Time Observability:**
- `serverAdded`, `serverRemoved`, `serverUpdated`, `groupsChanged` events expose all config changes
- Tests can listen to SSE stream and validate event payload matches expected state
- Deterministic success criteria: SSE event received → UI updated → backend state verified

**Clear API Contracts:**
- `GET /api/servers` returns full server list (easy assertions)
- `GET /api/config/groups` exposes group state
- Response format consistent (`ApiResponse<T>` with success/error fields)

**UI Renderability:**
- Dashboard renders server cards (visual assertions possible)
- Config sidebar shows server/group lists (visibility checks)
- Toast notifications provide user feedback (success/error messages testable)

**Logging Requirements:**
- Architecture doc specifies logging for config changes, file operations, validation failures
- Structured logging enables debugging failed tests
- Correlation IDs (recommended) would improve traceability

#### No Concerns

Observability is well-designed for testing. All critical state changes are observable via SSE events, API endpoints, or UI rendering.

---

### Reliability: CONCERNS

**Definition:** Tests are isolated, parallel-safe, and reproducible (no race conditions, clear success/failure)

#### ⚠️ Critical Concerns

**File-Based Persistence Collision:**
- All tests writing to same `servers.json` and `dashboard-layout.json` will collide in parallel runs
- Hardcoded file paths in backend prevent test isolation
- **Impact:** Cannot run tests with `--workers=4` (required for fast CI)
- **Blocker:** YES - must fix before Sprint 0

**PingService Global State:**
- If PingService is a singleton, tests cannot isolate monitoring state
- Test A starts monitoring server-001, Test B deletes it → Test A fails
- **Impact:** Test interference, false negatives
- **Blocker:** YES - must fix before Epic 4 (Live Updates)

**SSE Connection Leaks:**
- Tests opening EventSource connections but not closing them
- Node.js hits max connections, tests hang
- **Impact:** CI pipeline hangs, wasted time
- **Blocker:** YES - must fix before Epic 4 E2E tests

#### Mitigation Required

**1. Test Configuration Override Mechanism:**

```typescript
// backend/src/config/file-paths.ts
export const CONFIG_PATHS = {
  servers: process.env.SERVERS_FILE || './backend/servers.json',
  layout: process.env.LAYOUT_FILE || './backend/dashboard-layout.json',
};

// backend/src/services/ConfigManager.ts
import { CONFIG_PATHS } from '../config/file-paths';

export class ConfigManager extends EventEmitter {
  private serversFile = CONFIG_PATHS.servers;
  private layoutFile = CONFIG_PATHS.layout;

  async loadServers(): Promise<ServerConfig[]> {
    const content = await fs.readFile(this.serversFile, 'utf-8');
    return JSON.parse(content);
  }
}
```

**Test Fixture:**
```typescript
// tests/fixtures/config-file-fixture.ts
import { test as base } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

type ConfigFilesFixture = {
  configFiles: {
    serversFile: string;
    layoutFile: string;
  };
};

export const test = base.extend<ConfigFilesFixture>({
  configFiles: async ({}, use) => {
    // Create unique temp directory for this test
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'estatus-test-'));
    const serversFile = path.join(tempDir, 'servers.json');
    const layoutFile = path.join(tempDir, 'dashboard-layout.json');

    // Initialize with empty configs
    await fs.writeFile(serversFile, JSON.stringify([]));
    await fs.writeFile(layoutFile, JSON.stringify({ groups: [] }));

    // Override backend to use test files
    process.env.SERVERS_FILE = serversFile;
    process.env.LAYOUT_FILE = layoutFile;

    await use({ serversFile, layoutFile });

    // Cleanup: Delete temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.SERVERS_FILE;
    delete process.env.LAYOUT_FILE;
  },
});
```

**2. PingService Instantiation:**

```typescript
// backend/src/services/PingService.ts
export class PingService extends EventEmitter {
  private servers: Map<string, ServerState> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  // Make constructor accept config (not singleton)
  constructor(private configManager: ConfigManager) {
    super();
    this.configManager.on('servers-changed', this.onConfigChange.bind(this));
  }

  // Add reset method for test cleanup
  public reset(): void {
    // Stop all monitoring intervals
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
    this.servers.clear();
  }
}

// Tests can create isolated instances
const testConfigManager = new ConfigManager(testConfigFiles);
const testPingService = new PingService(testConfigManager);
```

**3. SSE Cleanup Fixture:**

```typescript
// tests/fixtures/sse-fixture.ts
import { test as base, Page } from '@playwright/test';

type SSEFixture = {
  sseClient: {
    events: SSEEvent[];
    waitForEvent: (type: string, timeout?: number) => Promise<SSEEvent>;
  };
};

export const test = base.extend<SSEFixture>({
  sseClient: async ({ page }, use) => {
    const events: SSEEvent[] = [];
    let eventSource: EventSource | null = null;

    // Inject EventSource listener into page context
    await page.addInitScript(() => {
      const originalEventSource = window.EventSource;
      window.EventSource = class extends originalEventSource {
        constructor(url: string, config?: EventSourceInit) {
          super(url, config);

          this.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            console.log(`SSE:${data.type}:${JSON.stringify(data)}`);
          });
        }
      };
    });

    // Capture events from console logs
    page.on('console', (msg) => {
      if (msg.text().startsWith('SSE:')) {
        const [, type, data] = msg.text().match(/SSE:(\w+):(.+)/) || [];
        if (type && data) {
          events.push(JSON.parse(data));
        }
      }
    });

    const waitForEvent = (type: string, timeout = 5000): Promise<SSEEvent> => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`SSE event '${type}' not received within ${timeout}ms`));
        }, timeout);

        const checkExisting = events.find((e) => e.type === type);
        if (checkExisting) {
          clearTimeout(timeoutId);
          resolve(checkExisting);
          return;
        }

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

    await use({ events, waitForEvent });

    // Cleanup: Close SSE connection
    await page.evaluate(() => {
      // Find and close EventSource if still open
      if (window.eventSource) {
        window.eventSource.close();
      }
    });
  },
});
```

---

## Architecturally Significant Requirements (ASRs)

ASRs are quality requirements that drive architecture decisions and require special test infrastructure. Scored using **Probability × Impact** (1-9 scale).

### ASR-1: Zero-Downtime Hot-Reload

**NFRs:** NFR-P2 (reload <2s), NFR-P5 (monitoring gaps <5s)

**Architecture Impact:**
- Event-driven ConfigManager (in-process reload, no restart)
- Delta-based PingService updates (only changed servers affected)
- SSE connection stability (no disconnect during reload)

**Testability Challenge:**
- Validate monitoring continues uninterrupted (<5s gap for unchanged servers)
- Measure reload timing (ConfigManager → PingService → SSE broadcast)
- Simulate config changes during active monitoring

**Risk Scoring:**
- **Probability:** 2 (Possible) - Complex async coordination, timing-sensitive
- **Impact:** 3 (Critical) - Monitoring gaps breach SLA, user trust lost
- **Risk Score:** 2 × 3 = **6 (HIGH)**

**Test Approach:**
```typescript
test('monitoring gap is under 5 seconds for unaffected servers', async ({ page, request, configFiles }) => {
  // Setup: 3 servers actively monitoring
  const servers = [
    createServer({ id: 'server-001', name: 'Server 1' }),
    createServer({ id: 'server-002', name: 'Server 2' }),
    createServer({ id: 'server-003', name: 'Server 3' }),
  ];
  await seedServers(configFiles.serversFile, servers);

  // Navigate to dashboard and capture SSE events
  await page.goto('/');
  const events: SSEEvent[] = [];
  captureSSEEvents(page, events);

  // Wait for initial monitoring to establish
  await waitForSSEEvent(page, 'initial');

  // Filter statusChange events for server-001 (will remain unchanged)
  const server001Events = events.filter(e =>
    e.type === 'statusChange' && e.serverId === 'server-001'
  );
  const initialCount = server001Events.length;

  // Action: Delete server-002 (NOT server-001)
  await request.delete('/api/config/servers/server-002');

  // Wait for hot-reload to complete
  await waitForSSEEvent(page, 'serverRemoved');

  // Observe for 10 seconds to validate server-001 continuity
  await page.waitForTimeout(10000);

  // Calculate max gap between statusChange events for server-001
  const updatedEvents = events.filter(e =>
    e.type === 'statusChange' && e.serverId === 'server-001'
  );

  expect(updatedEvents.length).toBeGreaterThan(initialCount); // Still receiving events

  const gaps = calculateMaxGapBetweenEvents(updatedEvents);
  expect(gaps).toBeLessThan(5000); // No gap >5s (NFR-P5)
});
```

**Mitigation Plan:**
- Owner: Backend team (Epic 4)
- Deadline: Before Sprint 1
- Strategy: Integration test for PingService delta logic, E2E test for end-to-end timing

---

### ASR-2: Multi-Client Synchronization

**NFRs:** FR66-67 (changes on Computer A appear on Computer B), NFR-P6 (SSE propagation <1s)

**Architecture Impact:**
- SSE event broadcasting to all connected clients
- Optimistic updates on editing client
- Conflict detection (editing deleted server)

**Testability Challenge:**
- Simulate 2+ clients in parallel (multiple browser contexts)
- Validate changes propagate without race conditions
- Test conflict scenarios (Computer A deletes while Computer B edits)

**Risk Scoring:**
- **Probability:** 2 (Possible) - Race conditions in SSE broadcasting, timing-sensitive
- **Impact:** 2 (Degraded) - Users see stale data, confusing UX
- **Risk Score:** 2 × 2 = **4 (MEDIUM)**

**Test Approach:**
```typescript
test('config changes propagate to all connected clients', async ({ browser }) => {
  // Create 2 browser contexts (Computer A and Computer B)
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // Both navigate to config page
  await Promise.all([
    pageA.goto('/config'),
    pageB.goto('/config'),
  ]);

  // Computer A adds server
  await pageA.click('[data-testid="add-server-button"]');
  await pageA.fill('[data-testid="server-name"]', 'New Server');
  await pageA.fill('[data-testid="server-ip"]', '192.168.1.99');
  await pageA.fill('[data-testid="server-dns"]', 'new.local');

  const startTime = Date.now();
  await pageA.click('[data-testid="save-server"]');

  // Computer B should see server in sidebar (via SSE)
  await expect(pageB.getByText('New Server')).toBeVisible({ timeout: 2000 });

  const elapsed = Date.now() - startTime;
  expect(elapsed).toBeLessThan(1000); // <1s propagation (NFR-P6)

  // Cleanup
  await contextA.close();
  await contextB.close();
});

test('editing deleted server shows conflict warning', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // Setup: Create server via API
  const server = await createServerViaAPI({ id: 'server-001', name: 'Test Server' });

  // Both navigate to config page
  await Promise.all([
    pageA.goto('/config'),
    pageB.goto('/config'),
  ]);

  // Computer B starts editing server-001
  await pageB.click('[data-testid="server-server-001"]');
  await expect(pageB.getByText('Edit Server: Test Server')).toBeVisible();

  // Computer A deletes server-001
  await pageA.click('[data-testid="server-server-001"]');
  await pageA.click('[data-testid="delete-button"]');
  await pageA.click('[data-testid="confirm-delete"]');

  // Computer B should receive SSE serverRemoved event and show warning
  await expect(pageB.getByText('Server deleted by another user')).toBeVisible({ timeout: 2000 });
  await expect(pageB.getByRole('button', { name: 'Save Server' })).toBeDisabled();

  await contextA.close();
  await contextB.close();
});
```

**Mitigation Plan:**
- Owner: Frontend team (Epic 4)
- Deadline: Before Sprint 2
- Strategy: Multi-context E2E tests, SSE event ordering validation

---

### ASR-3: Atomic Configuration Writes

**NFRs:** NFR-R1 (atomic writes prevent corruption)

**Architecture Impact:**
- Temp file + rename pattern (POSIX atomic)
- Error handling with rollback
- Cleanup on failure

**Testability Challenge:**
- Simulate crashes during write (mocked `fs.rename` failures)
- Verify file integrity (original unchanged, temp cleaned up)
- Test concurrent writes (last-write-wins acceptable for single user)

**Risk Scoring:**
- **Probability:** 1 (Unlikely) - Well-known pattern, proven reliable
- **Impact:** 3 (Critical) - Data loss requires manual reconstruction
- **Risk Score:** 1 × 3 = **3 (MEDIUM)**

**Test Approach:**
```typescript
describe('Atomic file writes', () => {
  it('prevents corruption on write failure', async () => {
    const originalServers = [createServer({ id: 'server-001' })];
    await fs.writeFile('servers.json', JSON.stringify(originalServers));
    const originalContent = await fs.readFile('servers.json', 'utf-8');

    // Mock fs.rename to fail
    jest.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('Disk full'));

    const newServers = [...originalServers, createServer({ id: 'server-002' })];
    await expect(configManager.saveServers(newServers)).rejects.toThrow('Disk full');

    // Verify original file unchanged
    const currentContent = await fs.readFile('servers.json', 'utf-8');
    expect(currentContent).toBe(originalContent);

    // Verify temp file cleaned up
    expect(await fs.exists('servers.json.tmp')).toBe(false);
  });

  it('writes successfully on normal operation', async () => {
    const servers = [createServer({ id: 'server-001' })];
    await configManager.saveServers(servers);

    const content = await fs.readFile('servers.json', 'utf-8');
    const saved = JSON.parse(content);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe('server-001');

    // Verify no temp file left behind
    expect(await fs.exists('servers.json.tmp')).toBe(false);
  });
});
```

**Mitigation Plan:**
- Owner: Backend team (Epic 2/4)
- Deadline: Before Sprint 1
- Strategy: Integration tests with mocked failures, E2E test for normal operation

---

### ASR-4: Input Sanitization

**NFRs:** NFR-S3 (prevent SQL injection, XSS)

**Architecture Impact:**
- Frontend + backend validation (defense in depth)
- Input sanitization on server-side
- React auto-escapes XSS in JSX

**Testability Challenge:**
- Validate SQL injection attempts blocked
- Validate XSS attempts escaped
- Test both frontend and backend layers

**Risk Scoring:**
- **Probability:** 2 (Possible) - No authentication, but single-user deployment
- **Impact:** 3 (Critical) - XSS could execute malicious scripts, data corruption
- **Risk Score:** 2 × 3 = **6 (HIGH)**

**Test Approach:**
```typescript
test('SQL injection in server name is blocked', async ({ page }) => {
  await page.goto('/config');
  await page.click('[data-testid="add-server-button"]');

  // Attempt SQL injection
  await page.fill('[data-testid="server-name"]', "'; DROP TABLE servers; --");
  await page.fill('[data-testid="server-ip"]', '192.168.1.1');
  await page.fill('[data-testid="server-dns"]', 'test.local');
  await page.click('[data-testid="save-server"]');

  // Should show validation error (not crash or execute)
  await expect(page.getByText(/Invalid characters|Invalid server name/)).toBeVisible();

  // Verify app still works (table not dropped)
  await page.goto('/dashboard');
  await expect(page.getByText('Dashboard')).toBeVisible();
});

test('XSS in group name is escaped', async ({ page }) => {
  await page.goto('/config');
  await page.click('[data-testid="add-group-button"]');

  // Attempt XSS injection
  const xssPayload = '<script>alert("XSS")</script>';
  await page.fill('[data-testid="group-name"]', xssPayload);
  await page.click('[data-testid="save-group"]');

  await expect(page.getByText('Group created successfully')).toBeVisible();

  // Reload and verify XSS is escaped (not executed)
  await page.reload();
  const groupName = await page.locator('[data-testid="group-list"]').first().textContent();

  // Text should be escaped, script should NOT execute
  expect(groupName).toContain('&lt;script&gt;');
  expect(groupName).not.toContain('<script>');
});

// Backend integration test
describe('POST /api/config/servers', () => {
  it('sanitizes server name input', async () => {
    const response = await request(app)
      .post('/api/config/servers')
      .send({
        name: '<script>alert("XSS")</script>',
        ip: '192.168.1.1',
        dns: 'test.local',
      });

    expect(response.status).toBe(400);
    expect(response.body.validationErrors.name).toContain('Invalid characters');
  });
});
```

**Mitigation Plan:**
- Owner: Backend + Frontend teams (Epic 2/3)
- Deadline: Before Sprint 1
- Strategy: E2E security tests, backend validation unit tests

---

## Test Levels Strategy

Based on the architecture analysis and **test-levels-framework.md**, here's the optimal test distribution for this **UI-heavy brownfield project** with complex real-time sync:

### Recommended Split: 40% Unit / 30% Integration / 30% E2E

**Rationale:**
- **Unit tests (40%):** Validation logic, data transformations, utilities are pure functions (fast, reliable)
- **Integration tests (30%):** API endpoints, ConfigManager, PingService, file I/O need service-level validation
- **E2E tests (30%):** Real-time sync, hot-reload, multi-client scenarios require full-stack validation

**Total Estimated Tests:** ~85-100 tests
- Unit: 35-40 tests
- Integration: 25-30 tests
- E2E: 25-30 tests

---

### Unit Tests (40% - ~35-40 tests)

**Target:** Pure functions, validation logic, utility functions

**What to Test:**

#### Validation Logic (~15 tests)
```typescript
// backend/src/utils/validation.test.ts
describe('validateServerConfig', () => {
  it('accepts valid IPv4 addresses', () => {
    const result = validateServerConfig(createServer({ ip: '192.168.1.10' }));
    expect(result.valid).toBe(true);
  });

  it('rejects invalid IPv4 addresses', () => {
    const cases = ['256.1.1.1', '192.168.1', '192.168.1.1.1', 'not-an-ip'];
    cases.forEach(ip => {
      const result = validateServerConfig(createServer({ ip }));
      expect(result.valid).toBe(false);
      expect(result.errors.ip).toContain('Invalid IPv4 format');
    });
  });

  it('detects duplicate server IDs', () => {
    const existing = [createServer({ id: 'server-001' })];
    const duplicate = createServer({ id: 'server-001' });
    const result = validateServerConfig(duplicate, existing);
    expect(result.errors.id).toBe('Server ID already exists');
  });

  it('validates required fields', () => {
    const incomplete = { name: 'Test', ip: '192.168.1.1' }; // Missing dns
    const result = validateServerConfig(incomplete as any);
    expect(result.errors.dns).toContain('required');
  });

  it('validates SNMP storage indexes format', () => {
    const server = createServer({
      snmpConfig: { enabled: true, community: 'public', storageIndexes: [-1, 0], diskNames: [] }
    });
    const result = validateServerConfig(server);
    expect(result.errors['snmpConfig.storageIndexes']).toContain('positive integers');
  });
});

describe('validateGroupConfig', () => {
  it('rejects duplicate group names (case-insensitive)', () => {
    const existing = [createGroup({ name: 'ARAGÓ' })];
    const duplicate = createGroup({ name: 'aragó' }); // Different case
    const result = validateGroupConfig(duplicate, existing);
    expect(result.errors.name).toContain('already exists');
  });

  it('validates server IDs exist', () => {
    const servers = [createServer({ id: 'server-001' })];
    const group = createGroup({ serverIds: ['server-001', 'server-999'] }); // 999 doesn't exist
    const result = validateGroupConfig(group, [], servers);
    expect(result.errors.serverIds).toContain('server-999 not found');
  });
});
```

#### Data Transformation (~10 tests)
```typescript
// backend/src/utils/id-generator.test.ts
describe('generateServerId', () => {
  it('generates zero-padded IDs', () => {
    expect(generateServerId(1)).toBe('server-001');
    expect(generateServerId(25)).toBe('server-025');
    expect(generateServerId(100)).toBe('server-100');
  });

  it('generates next available ID', () => {
    const existing = [
      createServer({ id: 'server-001' }),
      createServer({ id: 'server-002' }),
    ];
    expect(getNextServerId(existing)).toBe('server-003');
  });
});

describe('calculateDelta', () => {
  it('identifies added servers', () => {
    const oldServers = [createServer({ id: 'server-001' })];
    const newServers = [
      createServer({ id: 'server-001' }),
      createServer({ id: 'server-002' }),
    ];
    const delta = calculateDelta(oldServers, newServers);
    expect(delta.added).toHaveLength(1);
    expect(delta.added[0].id).toBe('server-002');
  });

  it('identifies removed servers', () => {
    const oldServers = [
      createServer({ id: 'server-001' }),
      createServer({ id: 'server-002' }),
    ];
    const newServers = [createServer({ id: 'server-001' })];
    const delta = calculateDelta(oldServers, newServers);
    expect(delta.removed).toHaveLength(1);
    expect(delta.removed[0]).toBe('server-002');
  });

  it('identifies updated servers', () => {
    const oldServers = [createServer({ id: 'server-001', ip: '192.168.1.1' })];
    const newServers = [createServer({ id: 'server-001', ip: '192.168.1.10' })];
    const delta = calculateDelta(oldServers, newServers);
    expect(delta.updated).toHaveLength(1);
    expect(delta.updated[0].ip).toBe('192.168.1.10');
  });
});
```

#### Error Handling (~10 tests)
```typescript
// backend/src/utils/error-handlers.test.ts
describe('handleFileWriteError', () => {
  it('returns generic error for EACCES', () => {
    const error = new Error('EACCES: permission denied');
    error.code = 'EACCES';
    const result = handleFileWriteError(error);
    expect(result.userMessage).toBe('Permission denied. Check file permissions.');
  });

  it('returns specific error for ENOSPC', () => {
    const error = new Error('ENOSPC: no space left on device');
    error.code = 'ENOSPC';
    const result = handleFileWriteError(error);
    expect(result.userMessage).toBe('Disk full. Free up space and try again.');
  });
});

describe('cleanupOrphanedServerIds', () => {
  it('removes server IDs not in servers list', () => {
    const servers = [createServer({ id: 'server-001' })];
    const groups = [
      createGroup({ serverIds: ['server-001', 'server-999'] }) // 999 orphaned
    ];
    const cleaned = cleanupOrphanedServerIds(groups, servers);
    expect(cleaned[0].serverIds).toEqual(['server-001']);
  });

  it('logs warning for orphaned IDs', () => {
    const logSpy = jest.spyOn(console, 'warn');
    const servers = [createServer({ id: 'server-001' })];
    const groups = [createGroup({ serverIds: ['server-999'] })];
    cleanupOrphanedServerIds(groups, servers);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Orphaned server ID: server-999'));
  });
});
```

**Coverage Target:** 80%+ for validation and utility code

**Execution Time:** <5 seconds total (fast feedback)

---

### Integration Tests (30% - ~25-30 tests)

**Target:** API endpoints, ConfigManager, PingService, file I/O

**What to Test:**

#### API Endpoint Contracts (~12 tests)
```typescript
// backend/src/routes/config.test.ts
describe('POST /api/config/servers', () => {
  it('creates server and returns 201', async () => {
    const response = await request(app)
      .post('/api/config/servers')
      .send(createServer({ id: undefined })); // Auto-generate ID

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toMatch(/server-\d{3}/);
  });

  it('returns 400 for invalid IP', async () => {
    const response = await request(app)
      .post('/api/config/servers')
      .send(createServer({ ip: '256.1.1.1' }));

    expect(response.status).toBe(400);
    expect(response.body.validationErrors.ip).toContain('Invalid IPv4');
  });

  it('emits config-changed event', async () => {
    const emitSpy = jest.spyOn(configManager, 'emit');
    await request(app)
      .post('/api/config/servers')
      .send(createServer());

    expect(emitSpy).toHaveBeenCalledWith('servers-changed', expect.any(Array));
  });
});

describe('DELETE /api/config/servers/:id', () => {
  it('removes server from groups', async () => {
    // Setup: Server in group
    const server = await createServerViaAPI({ id: 'server-001' });
    const group = await createGroupViaAPI({ serverIds: ['server-001'] });

    // Delete server
    const response = await request(app).delete('/api/config/servers/server-001');
    expect(response.status).toBe(200);

    // Verify removed from group
    const groupResponse = await request(app).get('/api/config/groups');
    const groups = groupResponse.body.data;
    expect(groups.find(g => g.id === group.id).serverIds).not.toContain('server-001');
  });
});
```

#### ConfigManager Hot-Reload (~5 tests)
```typescript
// backend/src/services/ConfigManager.test.ts
describe('ConfigManager', () => {
  it('reloads servers from file', async () => {
    const servers = [createServer({ id: 'server-001' })];
    await fs.writeFile('test-servers.json', JSON.stringify(servers));

    const manager = new ConfigManager({ serversFile: 'test-servers.json' });
    await manager.loadServers();

    expect(manager.getServers()).toHaveLength(1);
    expect(manager.getServers()[0].id).toBe('server-001');
  });

  it('emits servers-changed event on reload', async () => {
    const manager = new ConfigManager();
    const emitSpy = jest.spyOn(manager, 'emit');

    await manager.reloadServers();

    expect(emitSpy).toHaveBeenCalledWith('servers-changed', expect.any(Array));
  });

  it('handles missing file gracefully', async () => {
    const manager = new ConfigManager({ serversFile: 'nonexistent.json' });
    await expect(manager.loadServers()).rejects.toThrow('ENOENT');
  });
});
```

#### Atomic File Writes (~5 tests)
```typescript
// backend/src/utils/file-utils.test.ts
describe('writeConfigAtomic', () => {
  it('writes to temp file then renames', async () => {
    const filePath = 'test-config.json';
    const data = { test: 'data' };

    await writeConfigAtomic(filePath, data);

    const content = await fs.readFile(filePath, 'utf-8');
    expect(JSON.parse(content)).toEqual(data);
    expect(await fs.exists(`${filePath}.tmp`)).toBe(false);
  });

  it('rolls back on rename failure', async () => {
    const originalContent = '{"original":"data"}';
    await fs.writeFile('test-config.json', originalContent);

    jest.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('Disk full'));

    await expect(writeConfigAtomic('test-config.json', { new: 'data' })).rejects.toThrow();

    // Original file unchanged
    const content = await fs.readFile('test-config.json', 'utf-8');
    expect(content).toBe(originalContent);
  });

  it('cleans up temp file on write failure', async () => {
    jest.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('Disk full'));

    await expect(writeConfigAtomic('test-config.json', { data: 'test' })).rejects.toThrow();

    expect(await fs.exists('test-config.json.tmp')).toBe(false);
  });
});
```

#### PingService Delta Updates (~5 tests)
```typescript
// backend/src/services/PingService.test.ts
describe('PingService.onConfigChange', () => {
  it('starts monitoring newly added servers', async () => {
    const pingService = new PingService(configManager);
    const startSpy = jest.spyOn(pingService, 'startMonitoring');

    const newServers = [createServer({ id: 'server-001' })];
    configManager.emit('servers-changed', newServers);

    await waitFor(() => expect(startSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'server-001' })));
  });

  it('stops monitoring removed servers', async () => {
    const pingService = new PingService(configManager);
    await pingService.startMonitoring(createServer({ id: 'server-001' }));

    const stopSpy = jest.spyOn(pingService, 'stopMonitoring');

    configManager.emit('servers-changed', []); // Empty list

    expect(stopSpy).toHaveBeenCalledWith('server-001');
  });

  it('does not restart monitoring for unchanged servers', async () => {
    const server001 = createServer({ id: 'server-001', name: 'Unchanged' });
    const pingService = new PingService(configManager);
    await pingService.startMonitoring(server001);

    const startSpy = jest.spyOn(pingService, 'startMonitoring');
    const stopSpy = jest.spyOn(pingService, 'stopMonitoring');

    const newServer002 = createServer({ id: 'server-002' });
    configManager.emit('servers-changed', [server001, newServer002]);

    // Only server-002 starts, server-001 continues
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'server-002' }));
    expect(stopSpy).not.toHaveBeenCalledWith('server-001');
  });
});
```

**Coverage Target:** 90%+ for services and routes

**Execution Time:** <30 seconds total

---

### E2E Tests (30% - ~25-30 tests)

**Target:** Critical user journeys, real-time sync, visual feedback

**What to Test:**

#### Server CRUD Workflows (~8 tests)
```typescript
// tests/e2e/server-management.spec.ts
test('add server workflow completes in under 30 seconds', async ({ page, request, configFiles }) => {
  await page.goto('/config');

  const startTime = Date.now();

  await page.click('[data-testid="add-server-button"]');
  await expect(page.getByText('Add New Server')).toBeVisible();

  await page.fill('[data-testid="server-id"]', 'server-999');
  await page.fill('[data-testid="server-name"]', 'Quick Server');
  await page.fill('[data-testid="server-ip"]', '192.168.1.99');
  await page.fill('[data-testid="server-dns"]', 'quick.local');

  await page.click('[data-testid="save-server"]');

  await expect(page.getByText('Server added successfully')).toBeVisible();
  await expect(page.getByText('Quick Server')).toBeVisible();

  const elapsed = Date.now() - startTime;
  expect(elapsed).toBeLessThan(30000); // NFR-U1
});

test('edit server updates dashboard in real-time', async ({ page, request, sseClient }) => {
  // Setup: Create server via API
  const server = await createServerViaAPI({ id: 'server-001', name: 'Original Name', ip: '192.168.1.1' });

  // Open dashboard in one tab
  await page.goto('/');
  await expect(page.getByText('Original Name')).toBeVisible();

  // Edit server via config API
  const ssePromise = sseClient.waitForEvent('serverUpdated');
  await request.put('/api/config/servers/server-001', {
    data: { ...server, name: 'Updated Name' }
  });

  // Verify SSE event received
  const event = await ssePromise;
  expect(event.server.name).toBe('Updated Name');

  // Verify dashboard updated
  await expect(page.getByText('Updated Name')).toBeVisible({ timeout: 2000 });
  await expect(page.getByText('Original Name')).not.toBeVisible();
});

test('delete server removes from dashboard and groups', async ({ page, request }) => {
  // Setup
  const server = await createServerViaAPI({ id: 'server-001', name: 'To Delete' });
  const group = await createGroupViaAPI({ name: 'Test Group', serverIds: ['server-001'] });

  await page.goto('/config');
  await page.click('[data-testid="server-server-001"]');
  await page.click('[data-testid="delete-button"]');

  // Confirmation dialog
  await expect(page.getByText('Remove To Delete from monitoring?')).toBeVisible();
  await page.click('[data-testid="confirm-delete"]');

  await expect(page.getByText('Server deleted successfully')).toBeVisible();
  await expect(page.getByText('To Delete')).not.toBeVisible();

  // Verify removed from group
  const groupResponse = await request.get('/api/config/groups');
  const groups = await groupResponse.json();
  expect(groups.find(g => g.id === group.id).serverIds).not.toContain('server-001');
});
```

#### Validation & Error Handling (~5 tests)
```typescript
// tests/e2e/validation.spec.ts
test('inline validation on blur', async ({ page }) => {
  await page.goto('/config');
  await page.click('[data-testid="add-server-button"]');

  // Invalid IP on blur
  await page.fill('[data-testid="server-ip"]', '256.1.1.1');
  await page.focus('[data-testid="server-dns"]'); // Blur IP field

  await expect(page.getByText('Invalid IPv4 format')).toBeVisible({ timeout: 500 });
  await expect(page.getByRole('button', { name: 'Save Server' })).toBeDisabled();
});

test('shows error toast on save failure', async ({ page, context }) => {
  await context.route('**/api/config/servers', (route) => {
    route.fulfill({ status: 500, body: JSON.stringify({ error: 'Disk full' }) });
  });

  await page.goto('/config');
  await page.click('[data-testid="add-server-button"]');
  await page.fill('[data-testid="server-name"]', 'Test');
  await page.fill('[data-testid="server-ip"]', '192.168.1.1');
  await page.fill('[data-testid="server-dns"]', 'test.local');
  await page.click('[data-testid="save-server"]');

  await expect(page.getByText('Failed to save server configuration')).toBeVisible();

  // App still navigable
  await page.click('[data-testid="back-to-dashboard"]');
  await expect(page).toHaveURL('/');
});
```

#### Group Management (~5 tests)
```typescript
// tests/e2e/group-management.spec.ts
test('create group and assign servers', async ({ page, request }) => {
  // Setup: Create servers
  await createServerViaAPI({ id: 'server-001', name: 'Server 1' });
  await createServerViaAPI({ id: 'server-002', name: 'Server 2' });

  await page.goto('/config');
  await page.click('[data-testid="add-group-button"]');

  await page.fill('[data-testid="group-name"]', 'Production');
  await page.fill('[data-testid="display-order"]', '1');

  // Assign servers
  await page.check('[data-testid="assign-server-001"]');
  await page.check('[data-testid="assign-server-002"]');

  await page.click('[data-testid="save-group"]');

  await expect(page.getByText('Group created successfully')).toBeVisible();
  await expect(page.getByText('Production (2 servers)')).toBeVisible();
});

test('dashboard reflects group layout', async ({ page, request }) => {
  // Setup
  await createServerViaAPI({ id: 'server-001', name: 'Prod Server' });
  await createServerViaAPI({ id: 'server-002', name: 'Dev Server' });
  await createGroupViaAPI({ name: 'Production', order: 1, serverIds: ['server-001'] });
  await createGroupViaAPI({ name: 'Development', order: 2, serverIds: ['server-002'] });

  await page.goto('/');

  // Verify groups appear in order
  const groups = await page.locator('[data-testid^="group-"]').all();
  expect(await groups[0].textContent()).toContain('Production');
  expect(await groups[1].textContent()).toContain('Development');

  // Verify servers in correct groups
  const prodGroup = page.locator('[data-testid="group-production"]');
  await expect(prodGroup.getByText('Prod Server')).toBeVisible();
  await expect(prodGroup.getByText('Dev Server')).not.toBeVisible();
});
```

#### Multi-Client Sync (~4 tests)
```typescript
// tests/e2e/multi-client-sync.spec.ts
test('changes propagate to all connected clients', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await Promise.all([
    pageA.goto('/config'),
    pageB.goto('/config'),
  ]);

  // Computer A adds server
  await pageA.click('[data-testid="add-server-button"]');
  await pageA.fill('[data-testid="server-name"]', 'Synced Server');
  await pageA.fill('[data-testid="server-ip"]', '192.168.1.88');
  await pageA.fill('[data-testid="server-dns"]', 'synced.local');
  await pageA.click('[data-testid="save-server"]');

  // Computer B sees server in sidebar (via SSE)
  await expect(pageB.getByText('Synced Server')).toBeVisible({ timeout: 2000 });

  await contextA.close();
  await contextB.close();
});
```

#### Security Tests (~3 tests)
```typescript
// tests/e2e/security.spec.ts
test('SQL injection is blocked', async ({ page }) => {
  await page.goto('/config');
  await page.click('[data-testid="add-server-button"]');
  await page.fill('[data-testid="server-name"]', "'; DROP TABLE servers; --");
  await page.fill('[data-testid="server-ip"]', '192.168.1.1');
  await page.fill('[data-testid="server-dns"]', 'test.local');
  await page.click('[data-testid="save-server"]');

  await expect(page.getByText(/Invalid characters|Invalid server name/)).toBeVisible();

  // App still works
  await page.goto('/dashboard');
  await expect(page.getByText('Dashboard')).toBeVisible();
});

test('XSS is escaped', async ({ page }) => {
  await page.goto('/config');
  await page.click('[data-testid="add-group-button"]');
  await page.fill('[data-testid="group-name"]', '<script>alert("XSS")</script>');
  await page.click('[data-testid="save-group"]');

  await expect(page.getByText('Group created successfully')).toBeVisible();
  await page.reload();

  const groupName = await page.locator('[data-testid="group-list"]').first().textContent();
  expect(groupName).toContain('&lt;script&gt;');
});
```

**Coverage Target:** 100% of critical user journeys (P0 scenarios)

**Execution Time:** <5 minutes total (parallel execution with 4 workers)

---

## NFR Testing Approach

### Security (NFR-S3)

**Status:** ✅ **PASS**

**Tools:** Playwright E2E + Backend Integration Tests

**Coverage:**
- ✅ SQL injection blocked (E2E + integration)
- ✅ XSS escaped (E2E)
- ✅ Input sanitization (backend unit tests)
- ✅ Defense in depth (frontend + backend validation)

**Test Examples:** See ASR-4 and E2E Security Tests above

---

### Performance (NFR-P2, NFR-P5, NFR-P6)

**Status:** ✅ **PASS**

**Tools:** Playwright Performance API

**Coverage:**
- ✅ Config reload <2s (E2E timing assertion)
- ✅ Monitoring gaps <5s (E2E with event gap calculation)
- ✅ SSE propagation <1s (E2E with multi-context)

**Test Examples:**
```typescript
test('config reload completes within 2 seconds', async ({ page, request, sseClient }) => {
  const startTime = Date.now();

  await request.post('/api/config/servers', { data: createServer() });

  await sseClient.waitForEvent('serverAdded');

  const elapsed = Date.now() - startTime;
  expect(elapsed).toBeLessThan(2000); // NFR-P2
});
```

**Note:** For load testing (if needed), use **k6** (not Playwright). Current scope doesn't require load testing (single-user deployment).

---

### Reliability (NFR-R1, NFR-R2)

**Status:** ⚠️ **CONCERNS**

**Tools:** Integration Tests (file I/O) + E2E (error recovery)

**Coverage:**
- ✅ Atomic writes validated (integration with mocked failures)
- ✅ Error recovery tested (E2E with mocked API failures)
- ⚠️ Temp file cleanup needs validation

**Test Examples:** See ASR-3 and Integration Tests above

**Recommendation:** Add explicit temp file cleanup validation in CI pipeline (check for `*.tmp` files after test runs).

---

### Usability (NFR-U1)

**Status:** ✅ **PASS**

**Tools:** Playwright E2E with performance assertions

**Coverage:**
- ✅ 30-second workflow validated (E2E with timing)
- ✅ Inline validation tested (E2E blur events)

**Test Example:** See E2E Server Management tests above

---

## Test Environment Requirements

### Local Development

**Required:**
- ✅ Node.js 18+ (existing)
- ✅ React dev server (Vite, existing)
- ✅ Express backend (existing)
- ⚠️ **NEW:** Test config override (env vars for file paths)
- ⚠️ **NEW:** Playwright installed (`npm install -D @playwright/test`)

**Setup Commands:**
```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install

# Run tests
npm test                  # All tests
npm run test:unit         # Unit only
npm run test:integration  # Integration only
npm run test:e2e          # E2E only
```

---

### CI Pipeline

**Required:**
- ✅ GitHub Actions or similar CI
- ✅ Playwright browsers (Chromium, Firefox)
- ✅ Parallel execution (4 workers)
- ⚠️ **NEW:** Test file isolation (env vars set per worker)

**CI Configuration:**
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e -- --workers=4
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

### Test Data Management

**Required:**
- ✅ Factory functions (Faker.js for unique data)
- ✅ Fixture-based cleanup (auto-delete after test)
- ✅ API-first setup (fast data seeding)

**Factory Example:**
```typescript
// tests/support/factories/server-factory.ts
import { faker } from '@faker-js/faker';

export function createServer(overrides?: Partial<ServerConfig>): ServerConfig {
  return {
    id: overrides?.id || `server-${faker.number.int({ min: 1, max: 999 }).toString().padStart(3, '0')}`,
    name: overrides?.name || faker.internet.domainWord().toUpperCase(),
    ip: overrides?.ip || faker.internet.ipv4(),
    dns: overrides?.dns || faker.internet.domainName(),
    consecutiveSuccesses: overrides?.consecutiveSuccesses || 3,
    consecutiveFailures: overrides?.consecutiveFailures || 3,
    snmpConfig: overrides?.snmpConfig || {
      enabled: false,
      community: 'public',
      storageIndexes: [],
      diskNames: [],
    },
    netappConfig: overrides?.netappConfig || {
      enabled: false,
      apiType: 'rest',
      username: '',
      password: '',
      luns: [],
    },
    ...overrides,
  };
}
```

---

## Testability Concerns

### CONCERN 1: File-Based State Collision

**Problem:** All tests writing to same `servers.json` and `dashboard-layout.json` will fail in parallel execution.

**Impact:**
- ❌ Cannot run tests with `--workers=4` (required for fast CI)
- ❌ Test interference (Test A creates server-001, Test B deletes it → Test A fails)
- ❌ Race conditions in file writes

**Risk Score:** Probability=3 (Likely), Impact=3 (Critical) → **Score 9 (BLOCKER)**

**Mitigation Required:**

1. **Add environment variable support for config paths:**
```typescript
// backend/src/config/file-paths.ts
export const CONFIG_PATHS = {
  servers: process.env.SERVERS_FILE || './backend/servers.json',
  layout: process.env.LAYOUT_FILE || './backend/dashboard-layout.json',
};
```

2. **Update ConfigManager to use CONFIG_PATHS:**
```typescript
// backend/src/services/ConfigManager.ts
import { CONFIG_PATHS } from '../config/file-paths';

export class ConfigManager extends EventEmitter {
  private serversFile = CONFIG_PATHS.servers;
  private layoutFile = CONFIG_PATHS.layout;
  // ...
}
```

3. **Create test fixture for file isolation** (see Reliability section above)

**Owner:** Backend team
**Deadline:** Before Epic 2 implementation
**Validation:** Run tests with `--workers=4` successfully

---

### CONCERN 2: PingService Singleton State

**Problem:** If PingService is a singleton, tests cannot isolate monitoring state.

**Impact:**
- ❌ Test A starts monitoring server-001, Test B deletes it → Test A fails
- ❌ Tests cannot run in parallel (global state collision)

**Risk Score:** Probability=2 (Possible), Impact=2 (Degraded) → **Score 4 (MEDIUM)**

**Mitigation Required:**

**Option 1: Make PingService instantiable (recommended):**
```typescript
// backend/src/services/PingService.ts
export class PingService extends EventEmitter {
  constructor(private configManager: ConfigManager) {
    super();
    this.configManager.on('servers-changed', this.onConfigChange.bind(this));
  }

  public reset(): void {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
    this.servers.clear();
  }
}

// backend/src/server.ts
const configManager = new ConfigManager();
const pingService = new PingService(configManager);

// Tests create isolated instances
const testConfigManager = new ConfigManager({ serversFile: 'test-servers.json' });
const testPingService = new PingService(testConfigManager);
```

**Option 2: Add reset() method for cleanup:**
```typescript
export class PingService {
  private static instance: PingService;

  public static reset(): void {
    if (PingService.instance) {
      PingService.instance.intervals.forEach((interval) => clearInterval(interval));
      PingService.instance.servers.clear();
    }
  }
}

// In test teardown
afterEach(() => {
  PingService.reset();
});
```

**Owner:** Backend team
**Deadline:** Before Epic 4 implementation (Live Updates)
**Validation:** Integration tests for PingService pass with parallel execution

---

### CONCERN 3: SSE Connection Leaks

**Problem:** Tests opening EventSource connections but not closing them.

**Impact:**
- ❌ Node.js hits max connections, tests hang
- ❌ CI pipeline timeout, wasted time

**Risk Score:** Probability=2 (Possible), Impact=2 (Degraded) → **Score 4 (MEDIUM)**

**Mitigation Required:**

Create SSE cleanup fixture (see Reliability section above for full implementation).

**Owner:** Test architect (Murat)
**Deadline:** Before Epic 4 E2E tests
**Validation:** E2E tests with SSE pass without connection leaks

---

## Recommendations for Sprint 0

Before starting Epic 1 implementation, address these items:

### Priority 1 (Blockers - Must Fix)

1. ✅ **Add test config override mechanism**
   - Implementation: Environment variables for file paths
   - Owner: Backend team
   - Effort: 1-2 hours
   - Story: Add to Epic 2 Story 2.6 or create new "Test Infrastructure" story

2. ✅ **Make PingService instantiable**
   - Implementation: Accept ConfigManager in constructor, add reset() method
   - Owner: Backend team
   - Effort: 2-3 hours
   - Story: Add to Epic 4 Story 4.1

3. ✅ **Create SSE cleanup fixture**
   - Implementation: Playwright fixture with EventSource teardown
   - Owner: Test architect (Murat)
   - Effort: 1-2 hours
   - Story: Test infrastructure setup (Sprint 0)

---

### Priority 2 (High Value - Recommended)

4. ✅ **Set up Playwright with fixtures**
   - config-file-fixture (file isolation)
   - sse-fixture (event capture + cleanup)
   - multi-context-fixture (multi-client tests)
   - Owner: Test architect
   - Effort: 4-6 hours
   - Story: Sprint 0 test infrastructure

5. ✅ **Create factory functions**
   - createServer() with Faker.js
   - createGroup() with Faker.js
   - Owner: Test architect
   - Effort: 2-3 hours
   - Story: Sprint 0 test infrastructure

6. ✅ **Define CI pipeline structure**
   - GitHub Actions workflow
   - Unit, integration, e2e stages
   - Parallel execution with 4 workers
   - Owner: DevOps / Test architect
   - Effort: 3-4 hours
   - Story: Sprint 0 CI setup

---

### Priority 3 (Nice to Have - Optional)

7. ⚠️ **Add structured logging with correlation IDs**
   - Implementation: Winston/Pino with request IDs
   - Owner: Backend team
   - Effort: 4-6 hours
   - Story: Epic 4 (observability)

8. ⚠️ **Set up HAR capture**
   - Implementation: Playwright HAR recording on test failure
   - Owner: Test architect
   - Effort: 1-2 hours
   - Story: Sprint 0 debugging tools

9. ⚠️ **Create test data reset script**
   - Implementation: Bash script to clean temp files between runs
   - Owner: Test architect
   - Effort: 1 hour
   - Story: Sprint 0 test infrastructure

---

## Next Steps

1. **Review this document** with the team (PM, Dev, Architect)
2. **Address Priority 1 concerns** before starting Epic 1
3. **Run *framework workflow** to initialize test framework architecture
4. **Run *ci workflow** to scaffold CI/CD quality pipeline
5. **Begin Epic 1 implementation** with test infrastructure in place

---

**Test Design Complete - Ready for Implementation Readiness Gate**

This system-level test design provides:
- ✅ Clear testability assessment (PASS with 3 concerns)
- ✅ Architecturally significant requirements scored and mitigated
- ✅ Test levels strategy (40/30/30 split)
- ✅ NFR coverage approach (security, performance, reliability, usability)
- ✅ Test environment requirements (local, CI, data management)
- ✅ Actionable recommendations for Sprint 0

**Next Workflow:** `/bmad:bmm:workflows:implementation-readiness` to validate PRD + UX + Architecture + Test Design cohesion before Phase 4 implementation.

---

_Generated using BMad Method - Test Design Workflow (System-Level Mode)_
_Document enables AI-assisted test implementation with risk-based test strategy_
