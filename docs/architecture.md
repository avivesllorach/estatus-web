# Estatus Web - Configuration UI Architecture

**Project:** estatus-web - Server Monitoring Dashboard with Self-Service Configuration
**Version:** 1.0
**Date:** 2025-11-17
**Author:** Arnau Vives Llorach
**Method:** BMad Method - Scale Adaptive Architecture

---

## Executive Summary

This architecture document defines the technical design for extending Estatus Web from a code-configured monitoring dashboard to a **self-service configuration platform**. The new `/config` UI enables admins to manage servers and dashboard layouts with **live, zero-downtime updates** - eliminating manual JSON editing and service restarts.

**Project Context:**
- **Type:** Brownfield enhancement to existing React 18 + Express monitoring dashboard
- **Scope:** 4 epics, 34 stories, 73 functional requirements (100% coverage)
- **Complexity:** Low (single-user, local deployment, no authentication)
- **Key Innovation:** Hot-reload backend configuration without dropping SSE connections

**Architecture Approach:**
- Event-driven hot-reload using ConfigManager service
- Delta-based PingService updates (no monitoring gaps for unchanged servers)
- SSE-based multi-client synchronization (reuses existing real-time infrastructure)
- Defense-in-depth validation (frontend UX + backend security)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architectural Decisions](#architectural-decisions)
3. [Technology Stack](#technology-stack)
4. [Component Architecture](#component-architecture)
5. [Data Architecture](#data-architecture)
6. [API Design](#api-design)
7. [Real-Time Architecture](#real-time-architecture)
8. [Project Structure](#project-structure)
9. [Implementation Patterns](#implementation-patterns)
10. [Cross-Cutting Concerns](#cross-cutting-concerns)
11. [NFR Coverage](#nfr-coverage)
12. [Implementation Roadmap](#implementation-roadmap)

---

## System Overview

### Current State (Brownfield)

**Estatus Web** monitors server availability and disk usage with real-time updates:

```
React Dashboard ← REST + SSE → Express API → PingService → ICMP/SNMP/NetApp
                                                ↓
                                          servers.json (manual edit)
```

**Limitations:**
- Server configuration requires manual editing of `servers.json`
- Dashboard layout hardcoded in `Dashboard.tsx` component
- Changes require service restart (drops SSE connections)
- No visual grouping configuration

### Future State (Target Architecture)

**Estatus Web + Config UI** adds self-service management:

```
┌─────────────────┐         ┌──────────────────────────────────────┐
│  React SPA      │◄─SSE────│  Express API + SSE Broadcaster       │
│                 │         │                                      │
│  ┌────────────┐ │         │  ┌──────────────┐   ┌─────────────┐ │
│  │ Dashboard  │ │◄─REST───┤  │ /api/servers │   │ PingService │ │
│  │ (existing) │ │         │  │  (existing)  │◄──┤  (enhanced) │ │
│  └────────────┘ │         │  └──────────────┘   └──────┬──────┘ │
│                 │         │                            │         │
│  ┌────────────┐ │         │  ┌──────────────┐         │         │
│  │ Config UI  │ │◄─REST───┤  │ /api/config  │         │         │
│  │   (NEW)    │ │────────►│  │    (NEW)     │         │         │
│  └────────────┘ │         │  └──────┬───────┘         │         │
│                 │         │         │                  │         │
└─────────────────┘         │    ┌────▼─────────────┐   │         │
                            │    │ ConfigManager    │───┘         │
                            │    │  (NEW - events)  │             │
                            │    └────┬─────────────┘             │
                            │         │                            │
                            │    ┌────▼──────────────┐            │
                            │    │  Atomic File I/O  │            │
                            │    │    (temp+rename)  │            │
                            │    └────┬──────────────┘            │
                            │         ▼                            │
                            │   servers.json                       │
                            │   dashboard-layout.json (NEW)        │
                            └──────────────────────────────────────┘
```

**Key Capabilities:**
- **Server CRUD:** Add/edit/delete servers via split-view UI
- **Group Management:** Organize servers, control dashboard layout
- **Live Updates:** Configuration changes propagate <1s without restart
- **Multi-Client Sync:** Changes on Computer A appear on Computer B in real-time

---

## Architectural Decisions

All decisions made collaboratively to ensure AI agent consistency during implementation.

### Decision 1: Configuration Hot-Reload Strategy
**Status:** Accepted | **Date:** 2025-11-17

**Decision:** Event-Driven Reload Pattern

**Context:** Backend must reload `servers.json` and `dashboard-layout.json` without restarting Express or dropping SSE connections.

**Implementation:**
```typescript
// ConfigManager extends EventEmitter
POST /api/config/servers → Atomic file write → configManager.emit('config-changed')
  → PingService.onConfigChange() → SSE broadcast
```

**Rationale:**
- Clean separation: API endpoints write files, ConfigManager manages state
- Event pattern allows independent reactions (PingService, SSE broadcaster)
- Extensible for future config sources
- Testable and maintainable

**Trade-offs:**
- ✅ Decoupled design, no tight coupling between endpoints and services
- ⚠️ Slightly more complex than direct calls (acceptable for brownfield integration)

---

### Decision 2: PingService Adaptation Pattern
**Status:** Accepted | **Date:** 2025-11-17

**Decision:** Delta-Based Update

**Context:** PingService must add/remove/update servers dynamically while maintaining monitoring stability for unchanged servers (NFR-P5: no gaps >5 seconds).

**Implementation:**
```typescript
onConfigReload(newServers) {
  const added = newServers.filter(s => !currentServers.has(s.id))
  const removed = currentServers.filter(s => !newServers.has(s.id))
  const updated = newServers.filter(s => hasChanged(s))

  removed.forEach(s => stopMonitoring(s.id))
  added.forEach(s => startMonitoring(s))
  updated.forEach(s => updateMonitoring(s))
}
```

**Rationale:**
- Meets NFR-P5 (monitoring continuity for unaffected servers)
- Minimal disruption - only changed servers experience brief gaps
- Clear audit trail of changes (logging)

**Trade-offs:**
- ✅ Zero monitoring gap for unchanged servers
- ⚠️ Requires diff calculation (O(n) acceptable for <100 servers)

---

### Decision 3: SSE Event Extension
**Status:** Accepted | **Date:** 2025-11-17

**Decision:** Dedicated Event Types

**Context:** Extend existing SSE stream with config-related events for multi-client synchronization.

**Implementation:**
```typescript
// New event types added to /api/events stream
{ type: 'serverAdded', server: {...} }
{ type: 'serverRemoved', serverId: 'server-001' }
{ type: 'serverUpdated', server: {...} }
{ type: 'groupsChanged', groups: [...] }
```

**Rationale:**
- Explicit semantics - clients know exactly what action occurred
- Matches existing pattern (statusChange, diskUpdate are dedicated types)
- Enables precise UI updates (add specific card, not full refresh)
- Type-safe with TypeScript discriminated unions

**Trade-offs:**
- ✅ Granular updates, optimal UX
- ⚠️ More event types to handle (acceptable, 4 new types)

---

### Decision 4: Atomic File Write Implementation
**Status:** Accepted | **Date:** 2025-11-17

**Decision:** Temp File + Rename Pattern

**Context:** Prevent configuration corruption if write fails or process crashes (NFR-R1).

**Implementation:**
```typescript
async function writeConfigAtomic(filePath: string, data: any) {
  const tempPath = `${filePath}.tmp`
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2))
  await fs.rename(tempPath, filePath) // Atomic on POSIX
}
```

**Rationale:**
- Rename operation is atomic on POSIX/Linux systems
- Original file never partially written (either complete or unchanged)
- Industry standard pattern (used by Git, databases)

**Trade-offs:**
- ✅ Simple, effective, battle-tested
- ⚠️ Requires temp file cleanup on error (handled in try-catch)

---

### Decision 5: Route Structure
**Status:** Accepted | **Date:** 2025-11-17

**Decision:** React Router with Separate Components

**Context:** Integrate `/config` route with existing `/` dashboard. Users must access config by typing URL directly (PRD FR1).

**Implementation:**
```typescript
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/config" element={<ConfigPage />} />
  </Routes>
</BrowserRouter>
```

**Rationale:**
- Users can type `/config` directly in browser (PRD requirement)
- Clean separation between Dashboard and Config components
- Browser back/forward navigation works correctly
- Standard approach for multi-page SPAs

**Trade-offs:**
- ✅ Natural browser navigation, proper URL routing
- ⚠️ Adds react-router-dom dependency (~10KB gzipped, acceptable)

---

### Decision 6: Backend API Endpoint Design
**Status:** Accepted | **Date:** 2025-11-17

**Decision:** Nested Under `/api/config` Namespace

**Context:** Design RESTful API for server/group CRUD while preserving existing `/api/servers` endpoint.

**Implementation:**
```
Existing (unchanged):
GET /api/servers - Read-only server list (dashboard)

New config endpoints:
POST   /api/config/servers      - Create server
PUT    /api/config/servers/:id  - Update server
DELETE /api/config/servers/:id  - Delete server
POST   /api/config/groups       - Create group
PUT    /api/config/groups/:id   - Update group
DELETE /api/config/groups/:id   - Delete group
GET    /api/config/groups       - Get all groups
```

**Rationale:**
- Clear separation: `/api/servers` (read) vs `/api/config/*` (write)
- Existing dashboard endpoint unchanged (brownfield safety)
- Namespace allows easy middleware application
- Follows RESTful conventions

**Trade-offs:**
- ✅ Zero risk to existing dashboard
- ⚠️ Two paths for server data (acceptable, different purposes)

---

### Decision 7: Group-to-Server Relationship Model
**Status:** Accepted | **Date:** 2025-11-17

**Decision:** Array of Server IDs (Foreign Key Pattern)

**Context:** Define how `dashboard-layout.json` references servers from `servers.json`.

**Implementation:**
```json
// dashboard-layout.json
{
  "groups": [
    {
      "id": "group-1",
      "name": "ARAGÓ",
      "order": 1,
      "serverIds": ["server-001", "server-002", "server-003"]
    }
  ]
}

// servers.json (unchanged structure)
[
  {"id": "server-001", "name": "ARAGÓ-01", "ip": "...", ...}
]
```

**Rationale:**
- No data duplication (single source of truth)
- Clean separation: servers.json = config, dashboard-layout.json = layout
- Servers can belong to multiple groups (flexibility)
- Standard relational pattern

**Trade-offs:**
- ✅ Clean data model, easy to maintain
- ⚠️ Requires join when rendering (acceptable, in-memory operation)

---

### Decision 8: Config Validation Layer
**Status:** Accepted | **Date:** 2025-11-17

**Decision:** Both Frontend + Backend (Defense in Depth)

**Context:** Balance UX (immediate feedback) with security (data integrity).

**Implementation:**

**Frontend Validation:**
- Real-time validation on field blur (FR55)
- IP format, required fields, uniqueness checks
- Inline error messages

**Backend Validation:**
- All frontend validations re-run server-side
- Referential integrity, input sanitization
- JSON schema validation
- Return 400 with detailed errors

**Rationale:**
- Best UX: Immediate feedback without network round-trip
- Best security: Cannot bypass frontend via direct API calls
- Defense in depth: Two layers catch different issues
- Industry best practice

**Trade-offs:**
- ✅ Optimal UX and security
- ⚠️ Some validation logic duplicated (mitigated with shared constants)

---

### Decision 9: Multi-Client Sync Strategy
**Status:** Accepted | **Date:** 2025-11-17

**Decision:** SSE Events + Optimistic Updates

**Context:** Changes on Computer A must appear on Computer B in real-time (FR66-67).

**Implementation:**
- Config page connects to existing `/api/events` SSE stream
- Listens for serverAdded, serverRemoved, serverUpdated, groupsChanged
- Updates sidebar lists in real-time
- Conflict detection: editing deleted server → warning dialog

**Rationale:**
- Reuses existing SSE infrastructure
- Meets FR66-67 (multi-client synchronization)
- Consistent pattern (dashboard uses SSE)
- 1-2 second sync latency (meets NFR-P2)

**Trade-offs:**
- ✅ Leverages existing real-time infrastructure
- ⚠️ Config page must handle concurrent edit scenarios (acceptable complexity)

---

### Decision 10: State Management Approach
**Status:** Accepted | **Date:** 2025-11-17

**Decision:** React Hook Form for Form State

**Context:** Manage complex form state with validation, dirty tracking, nested objects.

**Implementation:**
```typescript
const { register, handleSubmit, formState } = useForm<ServerFormData>()
// Handles validation, dirty state, errors automatically
```

**Rationale:**
- Purpose-built for complex forms (SNMP/NetApp sections, dynamic arrays)
- Reduces boilerplate vs manual useState
- Excellent TypeScript support
- Integrates with shadcn/ui components
- Handles on-blur validation per UX spec

**Trade-offs:**
- ✅ Significant development speed boost
- ⚠️ Additional dependency (~8KB, acceptable)

---

## Technology Stack

### Frontend Stack

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| **React** | 18 | UI framework | Existing (brownfield), proven for SPAs |
| **TypeScript** | Latest | Type safety | Existing, prevents runtime errors |
| **Vite** | Latest | Build tool | Existing, fast HMR |
| **Tailwind CSS** | Latest | Styling | Existing, utility-first CSS |
| **shadcn/ui** | Latest | Component library | **NEW** - Admin-optimized, accessible components |
| **Radix UI** | Latest | Primitives | Dependency of shadcn/ui, ARIA support |
| **React Router** | 6+ | Routing | **NEW** - `/` and `/config` routes |
| **React Hook Form** | 7+ | Form state | **NEW** - Complex form management |

### Backend Stack

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| **Express** | Latest | Web framework | Existing (brownfield) |
| **TypeScript** | Latest | Type safety | Existing |
| **Node.js** | 18+ | Runtime | Existing |
| **EventEmitter** | Built-in | Event pattern | Native Node.js, for ConfigManager |
| **fs/promises** | Built-in | File I/O | Native, for atomic writes |

### No Changes Required

- **PingService, SNMPService, NetAppService:** Enhanced (delta updates), not replaced
- **SSE Infrastructure:** Extended with new event types, core unchanged
- **Build Tools:** Vite (frontend), tsc (backend) - no changes

---

## Component Architecture

### Frontend Component Hierarchy

```
App.tsx (React Router setup)
├── DashboardPage (route: /)
│   └── Dashboard (existing)
│       └── ServerContainer (existing, enhanced for groups)
│           └── DeviceCard (existing)
│
└── ConfigPage (route: /config - NEW)
    └── ConfigLayout (NEW)
        ├── Sidebar (NEW)
        │   ├── SidebarHeader
        │   └── ServerListItem[] / GroupListItem[]
        │
        └── MainPanel (NEW)
            ├── PanelHeader (actions: Delete, Cancel, Save)
            └── ServerForm | GroupForm (NEW)
                ├── FormSection[] (white cards)
                │   ├── FormRow (2-column grid)
                │   │   └── FormGroup (label + input + error)
                │   └── CollapsibleConfigSection (SNMP/NetApp)
                └── ValidationMessage[]
```

### New Frontend Components (Epic 1-3)

**Layout Components:**
- `ConfigLayout.tsx` - Split-view container (280px sidebar + flexible main)
- `Sidebar.tsx` - Left navigation with server/group lists
- `ServerListItem.tsx` - Individual list entry with name + IP
- `MainPanel.tsx` - Right panel with scrollable form area

**Form Components:**
- `ServerForm.tsx` - Server add/edit form (Epic 2)
- `GroupForm.tsx` - Group add/edit form (Epic 3)
- `FormSection.tsx` - White card wrapper for form groups
- `FormRow.tsx` - Two-column grid layout
- `FormGroup.tsx` - Label + input + helper text + error message
- `CollapsibleConfigSection.tsx` - Expandable SNMP/NetApp panels
- `PanelHeader.tsx` - Fixed header with title + action buttons

**UI Primitives (shadcn/ui):**
- `Button.tsx` - Primary, secondary, destructive variants
- `Input.tsx` - Text fields
- `Label.tsx` - Form labels
- `Checkbox.tsx` - Boolean toggles
- `Select.tsx` - Dropdown fields
- `Dialog.tsx` - Delete confirmations
- `Toast.tsx` - Success/error notifications
- `Separator.tsx` - Section dividers
- `ScrollArea.tsx` - Scrollable containers
- `Collapsible.tsx` - Expandable sections

### Backend Service Architecture

```
Express Server (server.ts)
├── Routes
│   ├── servers.ts (existing - read-only GET /api/servers)
│   └── config.ts (NEW - CRUD /api/config/*)
│
├── Services
│   ├── ConfigManager (NEW - EventEmitter)
│   │   ├── loadServers()
│   │   ├── loadGroups()
│   │   ├── reloadServers() → emit('servers-changed')
│   │   └── reloadGroups() → emit('groups-changed')
│   │
│   ├── PingService (ENHANCED)
│   │   ├── onConfigChange() → delta update (NEW)
│   │   ├── startMonitoring(server) (existing)
│   │   └── stopMonitoring(serverId) (existing)
│   │
│   ├── SNMPService (existing - unchanged)
│   └── NetAppService (existing - unchanged)
│
├── Utils
│   ├── fileUtils.ts (NEW)
│   │   └── writeConfigAtomic() - temp file + rename
│   └── validation.ts (NEW)
│       ├── validateServerConfig()
│       └── validateGroupConfig()
│
└── SSE Broadcaster (enhanced)
    └── Emit new events: serverAdded, serverRemoved, serverUpdated, groupsChanged
```

---

## Data Architecture

### File-Based Persistence

**servers.json** (existing structure - unchanged)
```json
[
  {
    "id": "server-001",
    "name": "ARAGÓ-01",
    "ip": "192.168.1.10",
    "dns": "arago-01.local",
    "consecutiveSuccesses": 3,
    "consecutiveFailures": 3,
    "snmpConfig": {
      "enabled": true,
      "community": "public",
      "storageIndexes": [1, 2, 3],
      "diskNames": ["C:", "D:", "E:"]
    },
    "netappConfig": {
      "enabled": false,
      "apiType": "rest",
      "username": "",
      "password": "",
      "luns": []
    }
  }
]
```

**dashboard-layout.json** (NEW)
```json
{
  "groups": [
    {
      "id": "group-1",
      "name": "ARAGÓ",
      "order": 1,
      "serverIds": ["server-001", "server-002", "server-003", "server-004"]
    },
    {
      "id": "group-2",
      "name": "PROVENÇA",
      "order": 2,
      "serverIds": ["server-005", "server-006", "server-007"]
    }
  ]
}
```

### Data Flow Diagrams

**Add Server Flow:**
```
User fills ServerForm
  ↓
React Hook Form validates (on blur)
  ↓
POST /api/config/servers with ServerFormData
  ↓
Backend validates (defense in depth)
  ↓
writeConfigAtomic(servers.json) - temp + rename
  ↓
configManager.emit('servers-changed')
  ↓
PingService.onConfigChange() → delta update → startMonitoring(newServer)
  ↓
SSE broadcast: { type: 'serverAdded', server: {...} }
  ↓
All clients receive event:
  - Dashboard: Add new DeviceCard
  - Config pages: Update sidebar list
```

**Edit Server Flow:**
```
User selects server in sidebar
  ↓
ServerForm loads with pre-populated values (React Hook Form)
  ↓
User edits fields (IP address, SNMP settings, etc.)
  ↓
Inline validation on blur (immediate feedback)
  ↓
User clicks "Save Server"
  ↓
PUT /api/config/servers/:id
  ↓
Backend validates + writeConfigAtomic()
  ↓
configManager.emit('servers-changed')
  ↓
PingService delta update → updateMonitoring(modifiedServer)
  ↓
SSE broadcast: { type: 'serverUpdated', server: {...} }
  ↓
All clients update:
  - Dashboard: Update DeviceCard (new IP reflected)
  - Config pages on other computers: Show warning if editing same server
```

**Delete Server Flow:**
```
User clicks "Delete" button in PanelHeader
  ↓
Confirmation dialog appears: "Remove [ServerName] from monitoring?"
  ↓
User confirms deletion
  ↓
DELETE /api/config/servers/:id
  ↓
Backend removes from servers.json
  ↓
Backend removes serverId from all groups' serverIds arrays (referential integrity)
  ↓
configManager.emit('servers-changed')
  ↓
PingService delta update → stopMonitoring(deletedServerId)
  ↓
SSE broadcast: { type: 'serverRemoved', serverId: 'server-001' }
  ↓
All clients update:
  - Dashboard: Remove DeviceCard
  - Config pages: Remove from sidebar, clear form if editing
```

### TypeScript Type Definitions

**Shared Types:**
```typescript
// Server configuration (matches servers.json)
interface ServerConfig {
  id: string               // "server-001"
  name: string            // "ARAGÓ-01"
  ip: string              // "192.168.1.10"
  dns: string             // "arago-01.local"
  consecutiveSuccesses: number
  consecutiveFailures: number
  snmpConfig?: {
    enabled: boolean
    community: string
    storageIndexes: number[]
    diskNames: string[]
  }
  netappConfig?: {
    enabled: boolean
    apiType: 'rest' | 'zapi'
    username: string
    password: string
    luns: Array<{
      name: string
      path: string
    }>
  }
}

// Group configuration (matches dashboard-layout.json)
interface GroupConfig {
  id: string              // "group-1"
  name: string           // "ARAGÓ"
  order: number          // 1, 2, 3... (display order)
  serverIds: string[]    // ["server-001", "server-002"]
}

// API response wrapper
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; validationErrors?: Record<string, string> }

// SSE event types
type SSEEvent =
  | { type: 'connected' }
  | { type: 'initial'; servers: ServerData[] }
  | { type: 'statusChange'; serverId: string; status: 'online' | 'offline' }
  | { type: 'diskUpdate'; serverId: string; disks: DiskInfo[] }
  | { type: 'serverAdded'; server: ServerConfig }      // NEW
  | { type: 'serverRemoved'; serverId: string }        // NEW
  | { type: 'serverUpdated'; server: ServerConfig }    // NEW
  | { type: 'groupsChanged'; groups: GroupConfig[] }   // NEW
  | { type: 'heartbeat' }
```

---

## API Design

### Existing Endpoints (Unchanged)

```
GET  /api/servers           - List all servers with status
GET  /api/servers/:id       - Get specific server status
GET  /api/servers/stats/summary - Aggregate statistics
GET  /api/events            - SSE real-time stream (extended with new events)
GET  /health                - Backend health check
```

### New Config Endpoints (Epic 2-3)

**Server Management (Epic 2):**
```
POST   /api/config/servers
  Request body: ServerConfig (without id - generated)
  Response: ApiResponse<ServerConfig>
  Status: 200 (success), 400 (validation), 500 (error)

PUT    /api/config/servers/:id
  Request body: ServerConfig
  Response: ApiResponse<ServerConfig>
  Status: 200 (success), 400 (validation), 404 (not found), 500 (error)

DELETE /api/config/servers/:id
  Response: ApiResponse<{ deletedId: string }>
  Status: 200 (success), 404 (not found), 500 (error)
  Side effect: Remove serverId from all groups' serverIds arrays
```

**Group Management (Epic 3):**
```
GET    /api/config/groups
  Response: ApiResponse<GroupConfig[]>
  Status: 200 (success), 500 (error)

POST   /api/config/groups
  Request body: GroupConfig (without id - generated)
  Response: ApiResponse<GroupConfig>
  Status: 200 (success), 400 (validation), 500 (error)

PUT    /api/config/groups/:id
  Request body: GroupConfig
  Response: ApiResponse<GroupConfig>
  Status: 200 (success), 400 (validation), 404 (not found), 500 (error)

DELETE /api/config/groups/:id
  Response: ApiResponse<{ deletedId: string }>
  Status: 200 (success), 404 (not found), 500 (error)
```

### API Request/Response Examples

**Create Server:**
```http
POST /api/config/servers
Content-Type: application/json

{
  "name": "ARAGÓ-05",
  "ip": "192.168.1.15",
  "dns": "arago-05.local",
  "consecutiveSuccesses": 3,
  "consecutiveFailures": 3,
  "snmpConfig": {
    "enabled": true,
    "community": "public",
    "storageIndexes": [1, 2],
    "diskNames": ["C:", "D:"]
  }
}

Response 200:
{
  "success": true,
  "data": {
    "id": "server-025",  // Generated
    "name": "ARAGÓ-05",
    "ip": "192.168.1.15",
    ...
  }
}

Response 400 (validation error):
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": {
    "ip": "Invalid IPv4 format",
    "name": "Server name is required"
  }
}
```

**Update Group:**
```http
PUT /api/config/groups/group-1
Content-Type: application/json

{
  "id": "group-1",
  "name": "ARAGÓ - Actualitzat",
  "order": 1,
  "serverIds": ["server-001", "server-002", "server-025"]  // Added server-025
}

Response 200:
{
  "success": true,
  "data": {
    "id": "group-1",
    "name": "ARAGÓ - Actualitzat",
    "order": 1,
    "serverIds": ["server-001", "server-002", "server-025"]
  }
}
```

### Validation Rules

**Server Validation (Frontend + Backend):**
- `id`: Auto-generated, format "server-###"
- `name`: Required, 1-50 characters
- `ip`: Required, valid IPv4 format `/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/`
- `dns`: Required, 1-100 characters
- `consecutiveSuccesses`: Number, 1-10
- `consecutiveFailures`: Number, 1-10
- `snmpConfig.storageIndexes`: Array of numbers if enabled
- Uniqueness: Server ID must be unique across all servers

**Group Validation (Frontend + Backend):**
- `id`: Auto-generated, format "group-#" or "group-timestamp"
- `name`: Required, 1-50 characters, unique across groups
- `order`: Number, 1-100
- `serverIds`: Array of valid server IDs (must exist in servers.json)

---

## Real-Time Architecture

### SSE Event Stream Extensions

**Existing Events (unchanged):**
```typescript
{ type: 'connected' }                          // Client connected
{ type: 'initial', servers: ServerData[] }     // Initial data load
{ type: 'statusChange', serverId, status }     // Server up/down
{ type: 'diskUpdate', serverId, disks }        // Disk usage update
{ type: 'heartbeat' }                          // Keep-alive (30s)
```

**New Config Events (Epic 4):**
```typescript
{
  type: 'serverAdded',
  server: ServerConfig    // Full server object
}

{
  type: 'serverRemoved',
  serverId: string       // ID of deleted server
}

{
  type: 'serverUpdated',
  server: ServerConfig   // Updated server object
}

{
  type: 'groupsChanged',
  groups: GroupConfig[]  // Full groups array (reorder, assignments)
}
```

### Multi-Client Synchronization Scenarios

**Scenario 1: User adds server on Computer A**
```
Computer A (Config UI):
  1. POST /api/config/servers
  2. Optimistic update: Add to sidebar immediately
  3. Receive SSE serverAdded event (confirmation)

Computer B (Dashboard):
  1. Receive SSE serverAdded event
  2. Add new DeviceCard to grid
  3. Card appears with "offline" status initially
  4. PingService starts monitoring → status updates via statusChange event

Computer C (Config UI - open):
  1. Receive SSE serverAdded event
  2. Add server to sidebar list
  3. No form disruption (user editing different server)
```

**Scenario 2: User deletes server while another user edits it**
```
Computer A:
  1. DELETE /api/config/servers/server-001
  2. Server removed from sidebar
  3. SSE serverRemoved event sent

Computer B (editing server-001):
  1. Receive SSE serverRemoved event
  2. Detect conflict: currently editing deleted server
  3. Show dialog: "Server deleted by another user"
  4. Options: [Close] (clear form)
  5. Prevent save (button disabled)
```

**Scenario 3: Concurrent edits (last-write-wins)**
```
Computer A & B both editing server-001

Computer A saves first:
  1. PUT /api/config/servers/server-001 → Success
  2. SSE serverUpdated event broadcast

Computer B saves 2 seconds later:
  1. PUT /api/config/servers/server-001 → Success (overwrites A's changes)
  2. SSE serverUpdated event broadcast

Result: Last write wins (Computer B's version persisted)
Acceptable for single-user deployment (low concurrency)
```

### SSE Connection Stability

**Hot-Reload Does NOT Drop Connections:**
- ConfigManager reload happens in-process (no server restart)
- SSE connection (`res` object) remains open
- PingService delta update doesn't affect SSE broadcaster
- Clients experience zero reconnection

**Connection Recovery (existing pattern):**
- Frontend EventSource auto-reconnects on disconnect
- apiService handles reconnection logic
- Dashboard and Config UI resilient to temporary network issues

---

## Project Structure

### Directory Organization

```
estatus-web/
├── src/                                    # Frontend (existing + new)
│   ├── components/
│   │   ├── ui/                            # NEW: shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   └── collapsible.tsx
│   │   │
│   │   ├── config/                        # NEW: Config UI components
│   │   │   ├── ConfigLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ServerListItem.tsx
│   │   │   ├── forms/
│   │   │   │   ├── ServerForm.tsx
│   │   │   │   ├── GroupForm.tsx
│   │   │   │   └── shared/
│   │   │   │       ├── FormSection.tsx
│   │   │   │       ├── FormRow.tsx
│   │   │   │       ├── FormGroup.tsx
│   │   │   │       └── CollapsibleConfigSection.tsx
│   │   │   ├── PanelHeader.tsx
│   │   │   └── __tests__/
│   │   │       ├── ServerForm.test.tsx
│   │   │       └── Sidebar.test.tsx
│   │   │
│   │   ├── Dashboard.tsx                  # Existing (enhanced for groups)
│   │   ├── ServerContainer.tsx            # Existing (modified for grouping)
│   │   └── DeviceCard.tsx                 # Existing (unchanged)
│   │
│   ├── pages/                             # NEW: Route components
│   │   ├── ConfigPage.tsx
│   │   └── DashboardPage.tsx
│   │
│   ├── services/
│   │   ├── api.ts                         # Existing (add config endpoints)
│   │   └── audioService.ts                # Existing (unchanged)
│   │
│   ├── types/
│   │   ├── server.ts                      # Existing (unchanged)
│   │   └── group.ts                       # NEW: Group types
│   │
│   ├── App.tsx                            # Modified: Add React Router
│   └── main.tsx                           # Existing (unchanged)
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── servers.ts                 # Existing (unchanged)
│   │   │   ├── events.ts                  # Existing (add new SSE events)
│   │   │   └── config.ts                  # NEW: Config CRUD routes
│   │   │
│   │   ├── services/
│   │   │   ├── PingService.ts             # Existing (add delta update)
│   │   │   ├── SNMPService.ts             # Existing (unchanged)
│   │   │   ├── NetAppService.ts           # Existing (unchanged)
│   │   │   ├── ConfigManager.ts           # NEW: Hot-reload orchestrator
│   │   │   └── __tests__/
│   │   │       ├── configManager.test.ts
│   │   │       └── pingService.test.ts
│   │   │
│   │   ├── types/
│   │   │   ├── server.ts                  # Existing (unchanged)
│   │   │   └── group.ts                   # NEW: Group types
│   │   │
│   │   ├── utils/
│   │   │   ├── fileUtils.ts               # NEW: Atomic write helper
│   │   │   └── validation.ts              # NEW: Shared validation
│   │   │
│   │   ├── config/
│   │   │   └── constants.ts               # Existing (add validation regex)
│   │   │
│   │   └── server.ts                      # Existing (add config routes)
│   │
│   ├── servers.json                       # Existing (same structure)
│   └── dashboard-layout.json              # NEW: Group definitions
│
├── docs/                                  # Documentation
│   ├── prd.md                             # Product Requirements
│   ├── epics.md                           # Epic breakdown
│   ├── ux-design-specification.md         # UX design
│   ├── architecture.md                    # THIS DOCUMENT
│   └── ...
│
└── .bmad/                                 # BMad Method workflows
```

### Epic-to-Directory Mapping

| Epic | Frontend Components | Backend Components | Config Files |
|------|---------------------|--------------------|--------------  |
| **Epic 1: UI Foundation** | `src/components/ui/`, `src/components/config/`, `src/pages/` | - | - |
| **Epic 2: Server Management** | `ServerForm.tsx` | `backend/src/routes/config.ts` (server endpoints) | `servers.json` |
| **Epic 3: Group Management** | `GroupForm.tsx` | `backend/src/routes/config.ts` (group endpoints) | `dashboard-layout.json` |
| **Epic 4: Live Updates** | - | `ConfigManager.ts`, PingService delta updates, SSE event extensions | - |

---

## Implementation Patterns

### Naming Conventions

**Frontend:**
```typescript
// Components: PascalCase
ConfigLayout.tsx
ServerForm.tsx
FormSection.tsx

// Functions/variables: camelCase
const handleServerSave = () => {}
const selectedServerId = "server-001"
const isFormDirty = true
```

**Backend:**
```typescript
// Files: camelCase
configManager.ts
fileUtils.ts
pingService.ts

// Classes/Interfaces: PascalCase
class ConfigManager extends EventEmitter {}
interface ServerConfig {}
```

**API Endpoints:**
```
// Pattern: Plural nouns for collections
POST   /api/config/servers      ✓
GET    /api/config/groups        ✓
PUT    /api/config/servers/:id   ✓

// NOT acceptable:
POST /api/config/server          ✗ (singular)
POST /api/config/create-server   ✗ (verb in URL)
```

**Configuration Files:**
```
servers.json              ✓ (lowercase, plural)
dashboard-layout.json     ✓ (kebab-case for multi-word)

NOT:
Servers.json             ✗ (capitalized)
dashboardLayout.json     ✗ (camelCase)
```

### Code Structure Patterns

**React Component:**
```typescript
interface ServerFormProps {
  serverId: string
  onSave: (data: ServerFormData) => void
  onCancel: () => void
}

export function ServerForm({ serverId, onSave, onCancel }: ServerFormProps) {
  // 1. Hooks (top of component)
  const { register, handleSubmit, formState } = useForm<ServerFormData>()
  const [isLoading, setIsLoading] = useState(false)

  // 2. Event handlers
  const handleSave = async (data: ServerFormData) => {
    setIsLoading(true)
    try {
      await onSave(data)
    } finally {
      setIsLoading(false)
    }
  }

  // 3. Effects (if needed)
  useEffect(() => { ... }, [])

  // 4. Render
  return (
    <form onSubmit={handleSubmit(handleSave)}>
      {/* JSX */}
    </form>
  )
}
```

**Backend Service:**
```typescript
import { EventEmitter } from 'events'

export class ConfigManager extends EventEmitter {
  // 1. Private properties
  private servers: ServerConfig[] = []
  private groups: GroupConfig[] = []

  // 2. Constructor
  constructor() {
    super()
    this.loadConfigurations()
  }

  // 3. Public methods
  public async reloadServers(): Promise<void> {
    this.servers = await this.loadServersFromFile()
    this.emit('servers-changed', this.servers)
  }

  // 4. Private helper methods
  private async loadConfigurations(): Promise<void> {
    // Implementation
  }
}
```

**API Route Handler:**
```typescript
router.post('/servers', async (req, res) => {
  try {
    // 1. Validate request
    const validationErrors = validateServerConfig(req.body)
    if (validationErrors) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors
      })
    }

    // 2. Process request
    const server = await configManager.createServer(req.body)

    // 3. Respond
    res.json({
      success: true,
      data: server
    })
  } catch (error) {
    logger.error('Server creation failed', { error })
    res.status(500).json({
      success: false,
      error: 'Failed to create server'
    })
  }
})
```

### Data Format Standards

**Server ID Format:**
```
Pattern: "server-" + zero-padded number
Examples: "server-001", "server-025", "server-100"
NOT: "srv-1", "1", "ARAGÓ-01" (use 'name' field)
```

**Group ID Format:**
```
Pattern: "group-" + sequential number
Examples: "group-1", "group-2", "group-3"
NOT: "ARAGÓ", "group_arago" (use 'name' field)
```

**IP Address Format:**
```
Pattern: IPv4 dotted decimal (string)
Example: "192.168.1.10"
Validation: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
```

**Timestamp Format:**
```
Pattern: ISO 8601 string
Example: "2025-11-17T10:30:00.000Z"
Use: new Date().toISOString()
```

---

## Cross-Cutting Concerns

### Error Handling

**Frontend Pattern:**
```typescript
try {
  await api.createServer(data)
  toast.success("✓ Server added successfully")
} catch (error) {
  toast.error("✗ Failed to add server")
  console.error(error)
}
```

**Backend Pattern:**
```typescript
try {
  await writeConfigAtomic(path, data)
  return { success: true, data: server }
} catch (error) {
  logger.error("Config write failed", { error, context })
  return { success: false, error: "Failed to save configuration" }
}
```

**Rules:**
- Frontend: Always try-catch API calls, show toast, log to console
- Backend: Always try-catch file I/O, log with context, return ApiResponse
- Never expose internal errors to user (sanitize messages)

### Logging

**Pattern:**
```typescript
logger.info("Server created", { serverId: "server-001", name: "ARAGÓ-01" })
logger.error("Config write failed", { error, filePath, operation: "create-server" })
logger.warn("Orphaned server ID found in group", { serverId, groupId })
```

**Rules:**
- Use structured logging (JSON context objects)
- Levels: INFO (operations), ERROR (failures), WARN (data issues), DEBUG (development)
- Always log: Config changes, file operations, validation failures, SSE broadcasts
- Never log sensitive data (passwords, credentials)

**Required Log Events:**
- Server created/updated/deleted (INFO)
- Group created/updated/deleted (INFO)
- Config file written (INFO)
- Config hot-reload completed (INFO)
- SSE event broadcast (DEBUG)
- Validation failure (WARN)
- File operation error (ERROR)
- Orphaned server ID detected (WARN)

### API Response Format

**Success:**
```typescript
{
  success: true,
  data: { id: "server-001", name: "ARAGÓ-01", ... }
}
```

**Error:**
```typescript
{
  success: false,
  error: "Server ID already exists"
}
```

**Validation Error:**
```typescript
{
  success: false,
  error: "Validation failed",
  validationErrors: {
    ip: "Invalid IPv4 format",
    serverId: "Server ID already exists"
  }
}
```

**Rules:**
- ALL endpoints return `ApiResponse<T>` type
- HTTP status codes: 200 (success), 400 (validation), 404 (not found), 500 (server error)
- Never return HTML error pages - always JSON

### Testing Strategy

**Unit Tests:**
```typescript
describe('validateServerConfig', () => {
  it('rejects invalid IP addresses', () => {
    expect(validateIP('256.1.1.1')).toBe(false)
  })
})
```

**Integration Tests:**
```typescript
describe('POST /api/config/servers', () => {
  it('creates server and broadcasts SSE event', async () => {
    const response = await request(app).post('/api/config/servers').send(validServer)
    expect(response.status).toBe(200)
    expect(sseEvents).toContain({ type: 'serverAdded' })
  })
})
```

**Test Coverage Requirements:**
- Validation logic (unit tests)
- API endpoints (integration tests)
- ConfigManager reload (integration tests)
- PingService delta updates (unit + integration tests)
- Atomic file writes (integration tests - verify temp file cleanup)
- SSE event broadcasting (integration tests)

---

## NFR Coverage

### Performance (NFR-P)

| ID | Requirement | Solution | Target |
|----|-------------|----------|--------|
| **NFR-P2** | Config reload < 2 seconds | Event-driven ConfigManager, in-memory reload | <2s |
| **NFR-P5** | Monitoring gaps < 5 seconds for unaffected servers | Delta-based PingService updates | <5s (0s for unchanged) |
| **NFR-P6** | SSE event propagation < 1 second | Existing SSE infrastructure extended | <1s |

**Validation:**
- ConfigManager reload: Load JSON → parse → emit event (estimate: 50-200ms for <100 servers)
- PingService delta: Calculate diff → stop/start monitoring (estimate: 10-50ms)
- SSE broadcast: Emit to all connected clients (estimate: 10-100ms per client)
- **Total: <500ms for typical config change** (well under 2-second requirement)

### Reliability (NFR-R)

| ID | Requirement | Solution |
|----|-------------|----------|
| **NFR-R1** | Atomic configuration writes | Temp file + rename pattern (POSIX atomic) |
| **NFR-R2** | Graceful error recovery | Try-catch all file I/O, return ApiResponse with errors |

**Validation:**
- Atomic writes: Industry-standard pattern, proven reliable
- Error recovery: All endpoints handle errors gracefully, no server crashes

### Security (NFR-S)

| ID | Requirement | Solution |
|----|-------------|----------|
| **NFR-S3** | Input sanitization | Frontend + backend validation (defense in depth) |

**Validation:**
- Frontend: React Hook Form validation (on-blur)
- Backend: Re-validate all inputs, JSON schema validation
- Prevent: SQL injection (N/A - no DB), XSS (React auto-escapes), path traversal (validate file paths)

### Usability (NFR-U)

| ID | Requirement | Solution |
|----|-------------|----------|
| **NFR-U1** | Add server in ~30 seconds | React Hook Form efficiency, minimal fields, instant validation |

**Validation:**
- User flow: Click "Add Server" → Fill 4 required fields → Click "Save" = ~20-30 seconds
- Instant validation prevents save errors (no retry needed)

---

## Implementation Roadmap

### Epic Implementation Order

**Recommended Sequence:**

1. **Epic 1: UI Foundation** (Stories 1.1-1.7) - 3-4 days
   - Install shadcn/ui and React Router
   - Build ConfigLayout, Sidebar, and shared form components
   - Set up routing (/, /config)
   - **Deliverable:** Config page skeleton with navigation

2. **Epic 4: Live Updates (Backend Only)** (Stories 4.1-4.2) - 2-3 days
   - Implement ConfigManager service (EventEmitter)
   - Implement atomic file writes (fileUtils.ts)
   - Enhance PingService with delta updates
   - Extend SSE broadcaster with new event types
   - **Deliverable:** Hot-reload infrastructure ready

3. **Epic 2: Server Management** (Stories 2.1-2.8) - 4-5 days
   - Build ServerForm component (React Hook Form)
   - Implement /api/config/servers endpoints
   - Wire up server CRUD with ConfigManager
   - Test add/edit/delete server flows
   - **Deliverable:** Fully functional server management

4. **Epic 3: Group Management** (Stories 3.1-3.7) - 3-4 days
   - Create dashboard-layout.json schema
   - Build GroupForm component
   - Implement /api/config/groups endpoints
   - Wire up group CRUD with ConfigManager
   - Enhance Dashboard to render groups
   - **Deliverable:** Fully functional group management

5. **Epic 4: Live Updates (Frontend)** (Stories 4.3-4.6) - 2-3 days
   - Config page SSE listener
   - Multi-client sync (sidebar updates)
   - Conflict detection (editing deleted server)
   - Dashboard group updates via SSE
   - **Deliverable:** Complete multi-client synchronization

**Total Estimate:** 14-19 days (2-3 weeks)

### Story Dependencies

```
Epic 1 (UI Foundation)
  └─> Epic 2 (Server Management) - requires forms and layout
        └─> Epic 3 (Group Management) - requires servers to exist

Epic 4 (Live Updates - Backend)
  └─> Epic 2 & 3 - provides hot-reload infrastructure
        └─> Epic 4 (Live Updates - Frontend) - requires config operations to sync
```

### Risk Mitigation

**Risk 1: Hot-reload drops SSE connections**
- Mitigation: ConfigManager reloads in-process (no server restart)
- Validation: Integration test - reload config while clients connected, verify no disconnect

**Risk 2: Concurrent edits cause data corruption**
- Mitigation: Atomic file writes (temp + rename), last-write-wins
- Validation: Test concurrent PUT requests, verify file integrity

**Risk 3: PingService monitoring gaps during reload**
- Mitigation: Delta-based updates (only stop/start changed servers)
- Validation: Unit test - verify unchanged servers continue monitoring

**Risk 4: Orphaned server IDs in groups after delete**
- Mitigation: DELETE server endpoint cleans up all group references
- Validation: Integration test - delete server, verify removed from all groups

---

## Appendix

### Related Documents

- **Product Requirements:** [docs/prd.md](./prd.md)
- **Epic Breakdown:** [docs/epics.md](./epics.md)
- **UX Design Specification:** [docs/ux-design-specification.md](./ux-design-specification.md)
- **Project Overview:** [docs/project-overview.md](./project-overview.md)

### Version History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-17 | 1.0 | Initial architecture specification | Arnau Vives Llorach |

### Glossary

- **Brownfield:** Existing project with legacy code (vs greenfield = new project)
- **Hot-reload:** Reload configuration without restarting server process
- **Delta update:** Apply only changes (vs full reload)
- **SSE:** Server-Sent Events - unidirectional push from server to client
- **Atomic write:** Write operation that fully completes or fully fails (no partial writes)
- **Defense in depth:** Multiple layers of validation (frontend + backend)
- **Last-write-wins:** Concurrent edit resolution (most recent save persists)

---

**Architecture Complete - Ready for Implementation**

This architecture provides AI agents with:
- ✅ Clear technical decisions (10 architectural decisions documented)
- ✅ Consistent patterns (naming, structure, error handling)
- ✅ Data flow clarity (add/edit/delete server flows)
- ✅ Component boundaries (Epic-to-directory mapping)
- ✅ Integration points (SSE events, API contracts)
- ✅ NFR coverage (performance, reliability, security validated)

**Next Step:** Begin Epic 1 (UI Foundation) - Install shadcn/ui and build ConfigLayout.

---

_Generated using BMad Method - Scale Adaptive Architecture Workflow v1.0_
_Document facilitates AI-assisted implementation with decision-focused design_
