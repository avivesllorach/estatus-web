# Epic Technical Specification: Server Management

Date: 2025-11-19
Author: Bob (Scrum Master) for Arnau
Epic ID: 2
Epic Title: Server Management
Status: Complete

---

## Overview

Epic 2 delivers complete server management capabilities through a user-friendly configuration interface. Users can create, read, update, and delete monitored servers through the `/config` UI without touching code or restarting services. This epic implements the core value proposition of transforming Estatus Web from a developer tool requiring manual JSON editing into a self-service monitoring platform.

The epic includes comprehensive form implementation for basic server information (ID, name, IP, DNS), advanced collapsible sections for SNMP and NetApp monitoring configurations, real-time validation with immediate feedback, and full backend API integration with atomic file writes. All changes trigger hot-reload mechanisms that update monitoring in real-time while preserving SSE connections.

## Objectives and Scope

**In Scope:**
- Complete server CRUD operations (Create, Read, Update, Delete) via `/config` UI
- Server form with 4 required fields: Server ID, Server Name, IP Address, DNS Address
- Collapsible SNMP configuration section with enable/disable toggle, storage indexes, and dynamic disk mappings
- Collapsible NetApp configuration section with enable/disable toggle, API type selection (REST/ZAPI), credentials, and dynamic LUN paths
- Real-time form validation on field blur (IP format, required fields, ID uniqueness)
- Backend REST API endpoints: POST/PUT/DELETE `/api/config/servers`
- Atomic file writes to `servers.json` using temp file + rename pattern
- Toast notifications for save success/failure
- Modal dialog confirmations for delete operations
- Unsaved changes warning when navigating away from dirty form
- Cancel button to discard changes and revert to original values

**Out of Scope (Epic 3 or 4):**
- Dashboard group management (Epic 3)
- Group assignment of servers (Epic 3)
- Live SSE broadcasting of config changes to other clients (Epic 4 frontend portions)
- Backend hot-reload implementation (Epic 4 backend, though may be implemented early)

**Epic 2 Delivers:**
Users can add a new monitored server in under 30 seconds, edit existing server configurations with immediate validation feedback, and delete servers with confirmation - all without manual JSON editing or service restarts.

## System Architecture Alignment

Epic 2 aligns with Architectural Decision #6 (Backend API Endpoint Design) by implementing RESTful endpoints under `/api/config` namespace. This preserves the existing read-only `/api/servers` endpoint used by the dashboard while adding dedicated write operations for configuration management.

**Key Architectural Components:**
- **Frontend:** `ServerForm` component using React Hook Form (AD#10) for complex form state management with validation and dirty tracking
- **Backend:** New `/api/config/servers` endpoints following `ApiResponse<T>` pattern (AD#6)
- **Persistence:** Atomic file writes using temp file + rename pattern (AD#4) to prevent corruption
- **Validation:** Defense-in-depth with frontend validation (UX feedback) + backend validation (security) per AD#8
- **Data Model:** Preserves existing `servers.json` schema (AD#2, NFR-M2 backward compatibility)

**Component References:**
- Uses shadcn/ui components: Input, Label, Checkbox, Select, Button, Dialog, Toast, Collapsible (UX Design Section 6.1)
- Custom components: FormSection, FormRow, FormGroup, CollapsibleConfigSection, PanelHeader (UX Design Section 6.1)
- Backend services: ConfigManager (for future Epic 4 integration), file utilities for atomic writes

**Constraints:**
- Must maintain compatibility with existing `servers.json` format (NFR-C3)
- Desktop-only UI (1280px minimum width per UX Design Section 8.1)
- WCAG AA accessibility compliance (UX Design Section 8.2)

## Detailed Design

### Services and Modules

**Frontend Modules:**

| Module | Responsibility | Inputs | Outputs | Owner |
|--------|---------------|--------|---------|-------|
| `ServerForm.tsx` | Server add/edit form with validation | `serverId` (for edit), `onSave`, `onCancel` callbacks | Form submission data (`ServerFormData`) | Epic 2 |
| `FormSection.tsx` | White card wrapper for form groups | `title`, `children` | Styled section container | Epic 2 |
| `FormRow.tsx` | Two-column grid layout | `children` (2 FormGroups) | CSS Grid with 16px gap | Epic 2 |
| `FormGroup.tsx` | Label + input + error wrapper | `label`, `error`, `helperText`, `required`, `children` | Complete form field with validation | Epic 2 |
| `CollapsibleConfigSection.tsx` | Expandable SNMP/NetApp panels | `title`, `defaultExpanded`, `children` | Collapsible section with animation | Epic 2 |
| `PanelHeader.tsx` | Fixed header with actions | `title`, `onDelete`, `onCancel`, `onSave`, `isDirty` | Sticky header with button group | Epic 2 |
| `ValidationMessage.tsx` | Inline error display | `message`, `visible` | Red error text with icon | Epic 2 |

**Backend Services:**

| Service | Responsibility | Methods | Dependencies |
|---------|---------------|---------|--------------|
| `ConfigRoutes` | REST API for server CRUD | `POST /servers`, `PUT /servers/:id`, `DELETE /servers/:id` | fileUtils, validation |
| `fileUtils.ts` | Atomic file operations | `writeConfigAtomic(path, data)` | fs/promises |
| `validation.ts` | Server config validation | `validateServerConfig(data)`, `validateIP(ip)`, `checkUniqueness(id)` | servers.json |

**Shared Types (Frontend + Backend):**

```typescript
interface ServerConfig {
  id: string
  name: string
  ip: string
  dns: string
  consecutiveSuccesses: number
  consecutiveFailures: number
  snmpConfig?: SNMPConfig
  netappConfig?: NetAppConfig
}

interface SNMPConfig {
  enabled: boolean
  community: string
  storageIndexes: number[]
  diskNames: string[]
}

interface NetAppConfig {
  enabled: boolean
  apiType: 'rest' | 'zapi'
  username: string
  password: string
  luns: Array<{ name: string; path: string }>
}
```

### Data Models and Contracts

**Server Configuration (servers.json)**

Existing file format - Epic 2 maintains backward compatibility:

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

**Form Data Model (Frontend)**

```typescript
interface ServerFormData {
  id: string                    // "server-025" (auto-gen or user input)
  name: string                  // "ARAGÓ-05"
  ip: string                    // "192.168.1.15"
  dns: string                   // "arago-05.local"
  consecutiveSuccesses: number  // Default: 3
  consecutiveFailures: number   // Default: 3
  snmpEnabled: boolean          // Checkbox state
  snmpCommunity?: string        // "public"
  snmpStorageIndexes?: string   // "1,2,3" (comma-separated string)
  snmpDiskMappings?: Array<{    // Dynamic array
    index: number
    name: string
  }>
  netappEnabled: boolean        // Checkbox state
  netappApiType?: 'rest' | 'zapi'
  netappUsername?: string
  netappPassword?: string
  netappLuns?: Array<{          // Dynamic array
    name: string
    path: string
  }>
}
```

**API Request/Response Contracts**

```typescript
// POST /api/config/servers - Create server
Request: ServerConfig (without id - generated by backend)
Response: ApiResponse<ServerConfig>

// PUT /api/config/servers/:id - Update server
Request: ServerConfig
Response: ApiResponse<ServerConfig>

// DELETE /api/config/servers/:id - Delete server
Response: ApiResponse<{ deletedId: string }>

// Generic API Response
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; validationErrors?: Record<string, string> }
```

**Validation Rules:**

| Field | Type | Constraints | Validation |
|-------|------|-------------|------------|
| `id` | string | Required, unique, format: "server-###" | Frontend + Backend |
| `name` | string | Required, 1-50 chars | Frontend + Backend |
| `ip` | string | Required, valid IPv4 | Regex: `/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/` |
| `dns` | string | Required, 1-100 chars | Frontend + Backend |
| `consecutiveSuccesses` | number | 1-10 | Frontend + Backend |
| `consecutiveFailures` | number | 1-10 | Frontend + Backend |
| `snmpStorageIndexes` | number[] | Array of positive integers (if enabled) | Backend |
| `netappApiType` | enum | 'rest' or 'zapi' (if enabled) | Backend |

### APIs and Interfaces

**Backend API Endpoints**

```
POST /api/config/servers
```
- **Purpose:** Create new server
- **Request Body:** `ServerConfig` (without `id`)
- **Response:** `ApiResponse<ServerConfig>` with generated `id`
- **Status Codes:**
  - 200: Success
  - 400: Validation error (duplicate ID, invalid format)
  - 500: Server error (file write failed)
- **Side Effects:**
  - Appends to `servers.json`
  - Triggers config reload (if Epic 4 implemented)
  - Broadcasts `serverAdded` SSE event (if Epic 4 implemented)

```
PUT /api/config/servers/:id
```
- **Purpose:** Update existing server
- **Request Body:** `ServerConfig`
- **Response:** `ApiResponse<ServerConfig>`
- **Status Codes:**
  - 200: Success
  - 400: Validation error
  - 404: Server ID not found
  - 500: Server error
- **Side Effects:**
  - Updates server in `servers.json`
  - Triggers config reload
  - Broadcasts `serverUpdated` SSE event

```
DELETE /api/config/servers/:id
```
- **Purpose:** Delete server
- **Response:** `ApiResponse<{ deletedId: string }>`
- **Status Codes:**
  - 200: Success
  - 404: Server ID not found
  - 500: Server error
- **Side Effects:**
  - Removes server from `servers.json`
  - Removes server from all groups in `dashboard-layout.json` (referential integrity)
  - Triggers config reload
  - Broadcasts `serverRemoved` SSE event

**Example API Calls**

Create Server:
```http
POST /api/config/servers
Content-Type: application/json

{
  "name": "PROVENÇA-03",
  "ip": "192.168.1.25",
  "dns": "provenca-03.local",
  "consecutiveSuccesses": 3,
  "consecutiveFailures": 3,
  "snmpConfig": {
    "enabled": true,
    "community": "public",
    "storageIndexes": [1, 2],
    "diskNames": ["C:", "D:"]
  },
  "netappConfig": {
    "enabled": false,
    "apiType": "rest",
    "username": "",
    "password": "",
    "luns": []
  }
}

Response 200:
{
  "success": true,
  "data": {
    "id": "server-025",  // Generated
    "name": "PROVENÇA-03",
    "ip": "192.168.1.25",
    ...
  }
}

Response 400 (validation error):
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": {
    "ip": "Invalid IPv4 format",
    "id": "Server ID 'server-025' already exists"
  }
}
```

Update Server:
```http
PUT /api/config/servers/server-001
Content-Type: application/json

{
  "id": "server-001",
  "name": "ARAGÓ-01",
  "ip": "192.168.1.11",  // Changed IP
  ...
}

Response 200:
{
  "success": true,
  "data": { ... updated server ... }
}
```

Delete Server:
```http
DELETE /api/config/servers/server-001

Response 200:
{
  "success": true,
  "data": {
    "deletedId": "server-001"
  }
}
```

**Frontend API Service**

```typescript
// src/services/api.ts (extend existing)

export const configApi = {
  async createServer(data: ServerConfig): Promise<ServerConfig> {
    const response = await fetch('/api/config/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    const result: ApiResponse<ServerConfig> = await response.json()
    if (!result.success) throw new Error(result.error)
    return result.data
  },

  async updateServer(id: string, data: ServerConfig): Promise<ServerConfig> {
    const response = await fetch(`/api/config/servers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    const result: ApiResponse<ServerConfig> = await response.json()
    if (!result.success) throw new Error(result.error)
    return result.data
  },

  async deleteServer(id: string): Promise<string> {
    const response = await fetch(`/api/config/servers/${id}`, {
      method: 'DELETE'
    })
    const result: ApiResponse<{ deletedId: string }> = await response.json()
    if (!result.success) throw new Error(result.error)
    return result.data.deletedId
  }
}
```

### Workflows and Sequencing

**Add Server Workflow (Story 2.7)**

```
User Journey: Add new monitored server in ~30 seconds

1. User clicks "+ Add Server" in sidebar
   └─> Frontend: Clear form, set mode='add', focus Server ID field

2. User fills required fields (ID, Name, IP, DNS)
   └─> Frontend: Validate on blur for each field
       ├─> IP: Check IPv4 format
       ├─> ID: Check uniqueness against existing servers
       └─> Show inline errors immediately

3. User optionally expands SNMP/NetApp sections
   └─> Frontend: Collapsible animation, enable fields based on checkbox

4. User clicks "Save Server"
   └─> Frontend:
       ├─> Validate all fields
       ├─> Show loading state on button
       └─> POST /api/config/servers

5. Backend processes request
   └─> Backend:
       ├─> Validate request (duplicate ID, IP format, required fields)
       ├─> Generate server ID: "server-###" (next available)
       ├─> Append to servers.json using atomic write
       ├─> Return success with generated ID

6. Success response received
   └─> Frontend:
       ├─> Show success toast: "✓ Server added successfully"
       ├─> Add server to sidebar list
       ├─> Clear form or load new server for editing
       └─> Optionally navigate to dashboard to verify

Error Scenarios:
- Duplicate ID: Show error "Server ID 'server-025' already exists"
- Invalid IP: Show error "Invalid IPv4 format (expected: xxx.xxx.xxx.xxx)"
- Save failure: Show error toast "✗ Failed to add server", form remains editable

Performance Target: Complete workflow in <30 seconds (NFR-U1)
```

**Edit Server Workflow (Story 2.6)**

```
User Journey: Update existing server configuration

1. User clicks server name in sidebar
   └─> Frontend: Load server into form (<100ms)

2. User modifies fields (IP, SNMP settings, credentials, etc.)
   └─> Frontend:
       ├─> Track dirty state (compare to original values)
       ├─> Validate on blur
       └─> Show unsaved changes indicator in header

3. User clicks "Save Server"
   └─> Frontend:
       ├─> Validate all fields
       ├─> PUT /api/config/servers/:id

4. Backend processes update
   └─> Backend:
       ├─> Validate request
       ├─> Find server by ID in servers.json
       ├─> Update server object
       ├─> Write atomically to servers.json
       └─> Return updated server

5. Success response
   └─> Frontend:
       ├─> Show success toast
       ├─> Clear dirty state
       └─> Update sidebar display (if name/IP changed)

Unsaved Changes Scenario:
- User clicks another server while form is dirty
  └─> Show dialog: "You have unsaved changes. Discard or save first?"
      ├─> [Discard Changes]: Load new server, lose edits
      ├─> [Cancel]: Stay on current server
      └─> [Save & Continue]: Save current → load new server

Performance Target: Save completes in <500ms (NFR-P1)
```

**Delete Server Workflow (Story 2.8)**

```
User Journey: Remove decommissioned server

1. User selects server, clicks "Delete" button in header
   └─> Frontend: Show confirmation dialog

2. Confirmation dialog appears
   └─> Display:
       ├─> Title: "Delete Server?"
       ├─> Message: "Remove [ServerName] from monitoring? This will stop monitoring immediately."
       └─> Buttons: [Cancel] [Delete Server]

3. User confirms deletion
   └─> Frontend:
       ├─> Close dialog
       ├─> DELETE /api/config/servers/:id

4. Backend processes deletion
   └─> Backend:
       ├─> Find server by ID
       ├─> Remove from servers.json array
       ├─> Remove serverId from all groups in dashboard-layout.json (referential integrity)
       ├─> Write both files atomically
       └─> Return deletedId

5. Success response
   └─> Frontend:
       ├─> Remove server from sidebar list
       ├─> Clear form (show empty state)
       ├─> Show success toast: "✓ Server deleted successfully"
       └─> Update dashboard via SSE (Epic 4)

Error Scenario:
- Delete fails: Show error toast "✗ Failed to delete server", server remains in list

Performance Target: Delete completes in <500ms
```

**Form Validation Workflow**

```
Validation Strategy: On-blur validation (immediate feedback without being aggressive)

1. User fills field and moves to next field (blur event)
   └─> Frontend:
       ├─> Run field-specific validation
       ├─> Display inline error if invalid
       └─> Enable/disable Save button based on form validity

Validation Rules:
- Server ID: Required, unique, format "server-###"
- Server Name: Required, 1-50 characters
- IP Address: Required, valid IPv4 format
- DNS Address: Required, 1-100 characters
- SNMP Storage Indexes: Comma-separated numbers if SNMP enabled
- NetApp API Type: Required if NetApp enabled

Frontend Validation (UX feedback):
- Immediate feedback on blur
- Inline error messages below fields
- Red border on invalid fields
- Save button disabled while errors exist

Backend Validation (security):
- Re-run all frontend validations
- Check ID uniqueness against current servers.json
- Validate JSON schema
- Return 400 with detailed validationErrors object

Defense in Depth: Both layers catch different issues (AD#8)
```

## Non-Functional Requirements

### Performance

**NFR-P1: Configuration Save Response Time**
- **Target:** Save operations complete within 500ms
- **Scope:** POST/PUT/DELETE server endpoints
- **Implementation:**
  - Atomic file writes optimized (write to temp, rename)
  - No complex processing in request path
  - Validation runs in <50ms
- **Measurement:** Response time from frontend request to 200 status
- **Epic 2 Coverage:** Full implementation

**NFR-P4: Form Responsiveness**
- **Target:** Form field validation feedback within 200ms of blur event
- **Scope:** All form inputs (ID, Name, IP, DNS, SNMP, NetApp)
- **Implementation:**
  - Client-side validation (regex, length checks)
  - No server round-trip for instant validation
  - Async uniqueness checks debounced to 300ms
- **Measurement:** Time from blur event to error message display
- **Epic 2 Coverage:** Full implementation

**Performance Optimizations:**
- React Hook Form reduces re-renders (only changed fields update)
- Validation runs incrementally (field-by-field, not whole form)
- Server ID uniqueness check: O(n) scan of servers array (acceptable for <100 servers)
- Atomic writes: Single rename syscall (POSIX atomic operation)

### Security

**NFR-S2: Credential Storage**
- **Requirement:** NetApp credentials stored in plaintext in `servers.json`
- **Rationale:** Local deployment, single-user environment (per PRD)
- **File Permissions:** Backend should set appropriate OS-level permissions (readable only by app user)
- **Epic 2 Implementation:**
  - Password fields use `type="password"` in UI (masked input)
  - No client-side credential encryption (out of scope for local tool)
  - Backend stores credentials as-is in JSON

**NFR-S3: Input Sanitization**
- **Requirement:** All user inputs sanitized to prevent injection attacks
- **Implementation:**
  - IP validation regex prevents command injection: `/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/`
  - Server ID format enforced: "server-###" (alphanumeric only)
  - DNS address validated (no special characters that could break file paths)
  - JSON.stringify escapes special characters automatically
- **Attack Vectors Mitigated:**
  - Command injection: IP/DNS fields validated before use
  - Path traversal: Server IDs constrained to safe format
  - XSS: React auto-escapes all rendered user input
  - SQL injection: N/A (no database, file-based storage)

**NFR-S4: File System Safety**
- **Requirement:** Configuration file writes validate paths to prevent directory traversal
- **Implementation:**
  - Hardcoded file paths: `backend/servers.json` (no user input in path)
  - Atomic writes create temp file in same directory (no path construction)
  - No dynamic path generation based on user input
- **Epic 2 Coverage:** Full implementation (atomic write pattern)

### Reliability/Availability

**NFR-R1: Configuration Data Integrity**
- **Requirement:** File writes must be atomic (no partial/corrupted files)
- **Implementation:** Temp file + rename pattern (AD#4)
  ```typescript
  async function writeConfigAtomic(filePath: string, data: any) {
    const tempPath = `${filePath}.tmp`
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2))
    await fs.rename(tempPath, filePath)  // Atomic on POSIX
  }
  ```
- **Failure Modes:**
  - Write fails (disk full): Temp file not renamed, original untouched
  - Process crashes mid-write: Original file intact
  - Rename fails: Error logged, frontend receives 500 status
- **Epic 2 Coverage:** Full implementation in all POST/PUT/DELETE endpoints

**NFR-R2: Graceful Error Handling**
- **Requirement:** Invalid config must not crash backend, clear error messages shown
- **Implementation:**
  - All file operations wrapped in try-catch
  - Validation errors return 400 with specific `validationErrors` object
  - File I/O errors return 500 with generic message (don't expose internals)
  - Frontend displays specific validation errors inline
  - Generic errors shown as toast: "Failed to save server configuration"
- **Example Error Responses:**
  ```json
  // Validation error (user-fixable)
  { "success": false, "error": "Validation failed",
    "validationErrors": { "ip": "Invalid IPv4 format" } }

  // Server error (system issue)
  { "success": false, "error": "Failed to save configuration" }
  ```
- **Epic 2 Coverage:** Full error handling in all endpoints and UI

### Observability

**NFR-M3: Error Logging**
- **Requirement:** Backend logs all configuration changes and failures with timestamps
- **Implementation:**
  - Structured logging with context objects
  - Log levels: INFO (operations), ERROR (failures), WARN (data issues)
  - Timestamp format: ISO 8601
- **Required Log Events:**
  ```typescript
  // Success operations
  logger.info("Server created", { serverId: "server-025", name: "ARAGÓ-05" })
  logger.info("Server updated", { serverId: "server-001", changes: ["ip"] })
  logger.info("Server deleted", { serverId: "server-001", name: "ARAGÓ-01" })

  // Failures
  logger.error("Config write failed", { error, filePath, operation: "create-server" })
  logger.warn("Validation failed", { serverId, errors: validationErrors })
  logger.error("Atomic write failed", { tempFile, targetFile, error })
  ```
- **Epic 2 Coverage:** Full logging in all CRUD endpoints

**Console Output (Development):**
- Frontend: Errors logged to browser console for debugging
- Backend: Structured logs to stdout (captured by systemd or Docker logs)

**Production Logging (Future Enhancement):**
- Log aggregation (e.g., Winston to file)
- Log rotation to prevent disk fill
- Metrics export (Prometheus/Grafana)

## Dependencies and Integrations

**Frontend Dependencies (New for Epic 2)**

| Dependency | Version | Purpose | Installation |
|------------|---------|---------|--------------|
| `react-hook-form` | ^7.x | Form state management, validation | `npm install react-hook-form` |
| `react-router-dom` | ^6.x | Routing (/config route) | `npm install react-router-dom` |
| `shadcn/ui` | Latest | UI components (Button, Input, Dialog, Toast, Collapsible) | `npx shadcn-ui@latest init` then add components |
| `@radix-ui/*` | Latest | Primitives (dependency of shadcn/ui) | Auto-installed with shadcn |

**Backend Dependencies (Existing + New)**

| Dependency | Version | Purpose | Status |
|------------|---------|---------|--------|
| `express` | ^4.18.2 | Web framework | Existing |
| `cors` | ^2.8.5 | CORS middleware | Existing |
| `fs/promises` | Built-in | File I/O for atomic writes | Built-in (Node.js) |
| `typescript` | ^5.3.3 | Type safety | Existing |

**Integration Points**

**With Epic 1 (UI Foundation):**
- Uses `ConfigLayout`, `Sidebar` components created in Epic 1
- Extends `MainPanel` with `ServerForm` component
- Leverages shadcn/ui components installed in Story 1.1

**With Epic 3 (Group Management):**
- DELETE server endpoint removes serverId from groups (referential integrity)
- Shares form components (FormSection, FormRow, FormGroup)
- Uses same validation patterns

**With Epic 4 (Live Updates):**
- Backend endpoints prepared for ConfigManager integration
- Save operations will trigger `configManager.emit('servers-changed')` event
- SSE broadcast hooks already in place (commented out until Epic 4)

**With Existing Monitoring (Brownfield):**
- Preserves `servers.json` format (backward compatible)
- No changes to existing `/api/servers` endpoint (dashboard continues working)
- PingService reads from same `servers.json` file

**External Systems:**
- **File System:** `backend/servers.json` (read/write)
- **File System:** `backend/dashboard-layout.json` (read for group cleanup on delete)
- **Browser Storage:** None (no localStorage/sessionStorage needed for Epic 2)

**Dependency Installation Order:**
1. shadcn/ui setup (Story 1.1)
2. react-router-dom (Story 1.2)
3. react-hook-form (Story 2.2)

## Acceptance Criteria (Authoritative)

**Epic 2 is considered DONE when all of the following are met:**

### Functional Acceptance Criteria

**FR5-FR12: Server CRUD Operations**
1. ✅ User can create new server with required fields (ID, Name, IP, DNS) via "+ Add Server" button
2. ✅ User can edit existing server by selecting from sidebar list
3. ✅ User can delete server with confirmation dialog showing server name
4. ✅ Server list in sidebar updates immediately after create/update/delete
5. ✅ Selected server highlighted with blue background in sidebar
6. ✅ Server details load in right panel form within 100ms of selection

**FR13-FR18: SNMP Configuration**
7. ✅ User can enable/disable SNMP monitoring via checkbox
8. ✅ SNMP section collapsible (collapsed by default, expands with smooth animation)
9. ✅ User can configure storage indexes (comma-separated input)
10. ✅ User can add/remove disk mappings dynamically (index + name pairs)
11. ✅ SNMP fields only enabled when SNMP checkbox is checked

**FR19-FR25: NetApp Configuration**
12. ✅ User can enable/disable NetApp monitoring via checkbox
13. ✅ NetApp section collapsible (collapsed by default)
14. ✅ User can select API type from dropdown (REST or ZAPI)
15. ✅ User can enter username and password (password field masked)
16. ✅ User can add/remove LUN paths dynamically
17. ✅ NetApp fields only enabled when NetApp checkbox is checked

**FR51-FR58: Form Validation**
18. ✅ Required fields show asterisk (*) indicator
19. ✅ Validation runs on blur (not on every keystroke)
20. ✅ Invalid IP format shows error: "Invalid IPv4 format (expected: xxx.xxx.xxx.xxx)"
21. ✅ Duplicate server ID shows error: "Server ID '[id]' already exists"
22. ✅ Empty required fields show error: "This field is required"
23. ✅ Fields with errors display red border and inline error message below field
24. ✅ Save button disabled while validation errors exist
25. ✅ Backend returns 400 status with `validationErrors` object for invalid data

**FR59-FR65: User Feedback**
26. ✅ Success toast appears after save: "✓ Server configuration saved successfully"
27. ✅ Success toast auto-dismisses after 3 seconds
28. ✅ Error toast appears on save failure: "✗ Failed to save server configuration"
29. ✅ Error toast persists until manually dismissed
30. ✅ Delete confirmation dialog shows before deletion with server name
31. ✅ Unsaved changes dialog appears when switching servers with dirty form
32. ✅ Unsaved changes dialog offers: [Discard Changes] [Cancel] [Save & Continue]
33. ✅ Cancel button reverts form to original values without save

**FR36, FR38: Backend Persistence**
34. ✅ Server create appends to `servers.json` with atomic write
35. ✅ Server update modifies existing entry in `servers.json` with atomic write
36. ✅ Server delete removes entry from `servers.json` with atomic write
37. ✅ Server delete removes serverId from all groups in `dashboard-layout.json`
38. ✅ Backend generates unique server ID in format "server-###"
39. ✅ Atomic writes use temp file + rename pattern (no partial writes)

### Technical Acceptance Criteria

**Backend API**
40. ✅ `POST /api/config/servers` creates server, returns 200 with generated ID
41. ✅ `PUT /api/config/servers/:id` updates server, returns 200 with updated data
42. ✅ `DELETE /api/config/servers/:id` deletes server, returns 200 with deletedId
43. ✅ All endpoints return `ApiResponse<T>` format consistently
44. ✅ Validation errors return 400 with specific `validationErrors` object
45. ✅ File I/O errors return 500 with generic error message
46. ✅ All config changes logged with timestamp and context

**Frontend Components**
47. ✅ `ServerForm` component implemented with React Hook Form
48. ✅ `PanelHeader` component shows title + action buttons (Delete, Cancel, Save)
49. ✅ `FormSection`, `FormRow`, `FormGroup` components reusable
50. ✅ `CollapsibleConfigSection` component for SNMP/NetApp sections
51. ✅ All shadcn/ui components installed: Button, Input, Label, Checkbox, Select, Dialog, Toast, Collapsible

**Accessibility**
52. ✅ All form fields have associated labels (`<label for="id">`)
53. ✅ Keyboard navigation works (Tab through fields, Enter to submit)
54. ✅ Focus indicators visible on all interactive elements
55. ✅ ARIA attributes on validation errors (`aria-invalid`, `aria-describedby`)
56. ✅ Modal dialogs trap focus and announce to screen readers

**Performance**
57. ✅ Save operations complete within 500ms (NFR-P1)
58. ✅ Form validation feedback appears within 200ms of blur (NFR-P4)
59. ✅ Server selection loads form within 100ms

**Compatibility**
60. ✅ Existing `servers.json` format preserved (backward compatible)
61. ✅ Existing `/api/servers` endpoint unchanged
62. ✅ Dashboard continues working without changes

### Definition of Done (DoD)

**Code Quality**
- ✅ TypeScript types defined for all data models
- ✅ No TypeScript errors or warnings
- ✅ Code follows existing patterns (React Hooks, Tailwind CSS)
- ✅ Error handling implemented in all API calls

**Testing**
- ✅ Manual testing of all workflows (add, edit, delete)
- ✅ Validation tested with invalid inputs
- ✅ Error scenarios tested (save failure, network error)
- ✅ Accessibility tested with keyboard-only navigation

**Documentation**
- ✅ API endpoints documented in architecture
- ✅ Component props documented in code comments
- ✅ Story completion notes in story files

**Integration**
- ✅ No breaking changes to existing functionality
- ✅ Dashboard monitoring continues working
- ✅ `servers.json` file remains valid after all operations

## Traceability Mapping

**PRD Requirements → Epic 2 Stories**

| PRD FR | Requirement | Story | Component/Endpoint |
|--------|-------------|-------|-------------------|
| FR5 | Add new server | 2.7 | ServerForm (add mode), POST /servers |
| FR6 | Edit server | 2.6 | ServerForm (edit mode), PUT /servers/:id |
| FR7 | Delete server | 2.8 | Delete button, DELETE /servers/:id |
| FR8 | View server list | Epic 1 | Sidebar component |
| FR13-FR18 | SNMP config | 2.3 | CollapsibleConfigSection (SNMP) |
| FR19-FR25 | NetApp config | 2.4 | CollapsibleConfigSection (NetApp) |
| FR51-FR58 | Form validation | 2.5 | React Hook Form + validation.ts |
| FR59-FR65 | User feedback | 2.9 | Toast, Dialog components |
| FR36, FR38 | Backend persistence | 2.10 | fileUtils.ts (atomic writes) |

**Architecture Decisions → Epic 2 Implementation**

| AD | Decision | Implementation in Epic 2 |
|----|----------|--------------------------|
| AD#2 | Data model (servers.json) | Preserved existing format, backward compatible |
| AD#4 | Atomic file writes | Implemented in fileUtils.ts (temp + rename) |
| AD#6 | REST API design | POST/PUT/DELETE /api/config/servers |
| AD#8 | Validation strategy | Frontend (UX) + Backend (security) |
| AD#10 | Form library | React Hook Form for complex state management |

**NFRs → Epic 2 Coverage**

| NFR | Requirement | Coverage | Implementation |
|-----|-------------|----------|----------------|
| NFR-P1 | Save <500ms | Full | Optimized file I/O, no complex processing |
| NFR-P4 | Validation <200ms | Full | Client-side validation, no server round-trip |
| NFR-S2 | Credential storage | Full | Plaintext in JSON (per PRD requirement) |
| NFR-S3 | Input sanitization | Full | Regex validation, constrained formats |
| NFR-S4 | File system safety | Full | Hardcoded paths, atomic writes |
| NFR-R1 | Data integrity | Full | Atomic writes (temp + rename) |
| NFR-R2 | Error handling | Full | Try-catch, specific error messages |
| NFR-M3 | Error logging | Full | Structured logs with timestamps |
| NFR-U1 | Add server <30sec | Full | Optimized workflow, minimal steps |
| NFR-C3 | Backward compat | Full | Existing servers.json format preserved |
| NFR-A1 | WCAG AA | Full | Keyboard nav, ARIA, color contrast |

**UX Design → Epic 2 Components**

| UX Component | Purpose | Implementation |
|--------------|---------|----------------|
| Split-view layout | Server list + form | ConfigLayout (Epic 1) + ServerForm |
| PanelHeader | Action buttons | PanelHeader component (Delete, Cancel, Save) |
| FormSection | White card wrapper | FormSection component |
| FormRow | Two-column layout | FormRow component |
| CollapsibleConfigSection | SNMP/NetApp panels | CollapsibleConfigSection component |
| ValidationMessage | Inline errors | ValidationMessage component |
| Toast notifications | Success/error feedback | shadcn Toast component |
| Confirmation dialog | Delete protection | shadcn Dialog component |

## Risks, Assumptions, Open Questions

### Assumptions

1. **Single-user deployment:** No concurrent editing conflicts (PRD requirement)
   - Multiple browser tabs may edit simultaneously → last write wins (acceptable)
   - File locking not implemented (not needed for single-user)

2. **File system reliability:** Atomic rename operation is truly atomic on target OS (Linux/macOS)
   - Windows: POSIX rename not atomic, may need `fs.renameSync` with error handling
   - Mitigation: Test on Windows deployment

3. **Server ID generation:** Simple sequential numbering sufficient for uniqueness
   - Format: "server-001", "server-002", etc.
   - No UUID needed (human-readable IDs preferred)

4. **Validation timing:** On-blur validation acceptable for UX (not too aggressive)
   - User feedback: Validation during typing is annoying
   - Trade-off: Faster feedback vs. less interruption

5. **Epic 4 dependency:** Hot-reload mechanism can be implemented later
   - Epic 2 writes to `servers.json`, but PingService may need restart
   - Epic 4 will add ConfigManager to hot-reload without restart

### Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| React Hook Form learning curve | Story 2.2-2.9 delayed | Medium | Team unfamiliar with library → allocate extra time for learning, use simple examples first |
| Atomic writes fail on Windows | Data corruption on Windows deployments | Low | Test atomic rename on Windows, implement fallback (file locking) if needed |
| SNMP/NetApp forms too complex | Poor UX, confusing for users | Medium | User testing after Story 2.3/2.4, simplify if feedback negative |
| Validation rules too strict | Users blocked from valid configs | Low | Allow flexibility (e.g., optional DNS, accept broader IP formats) |
| Backend file I/O bottleneck | Slow saves (>500ms) | Low | File writes are fast (<10ms), network latency dominates |

### Open Questions

**Q1: Should server ID be auto-generated or user-editable?**
- **Current:** Backend generates "server-###" format
- **Alternative:** Allow user to specify custom ID (e.g., "dc1-web-01")
- **Decision needed:** PRD doesn't specify, UX shows auto-gen
- **Recommendation:** Auto-generate in Epic 2, add custom ID option in future enhancement

**Q2: What happens to deleted server's historical data?**
- **Current:** Server removed from monitoring, but ping history may persist in memory
- **Question:** Should we clear historical data when server deleted?
- **Decision:** Out of scope for Epic 2, handled in Epic 4 (state management)

**Q3: Should SNMP community string be masked (password field)?**
- **Current:** Plain text input (like API credentials)
- **Security:** SNMP community is sensitive but not critical (read-only access)
- **Decision:** Use plain text in Epic 2, mask in future security enhancement if needed

**Q4: Dynamic disk/LUN arrays - how many can user add?**
- **Current:** No hard limit, just "+ Add" button
- **Question:** Set max limit (e.g., 20 disks)?
- **Decision:** No limit in Epic 2, address if performance issues arise

**Q5: Should unsaved changes persist across page refresh?**
- **Current:** Form data lost on refresh (no localStorage)
- **Alternative:** Auto-save draft to localStorage
- **Decision:** Not needed for Epic 2 (users complete form quickly), add in future if requested

### Dependencies on Other Epics

**Epic 1 → Epic 2:**
- Story 1.1 (shadcn/ui setup) must complete before Story 2.2 (form components)
- Story 1.6 (empty state) used when no server selected

**Epic 2 → Epic 3:**
- DELETE server endpoint removes serverId from groups (forward compatibility)
- Form components reusable for group management

**Epic 2 → Epic 4:**
- Backend endpoints prepared for ConfigManager integration
- SSE broadcast hooks in place (commented out until Epic 4)

## Test Strategy Summary

### Manual Testing Approach

Epic 2 uses manual testing (no automated tests required for MVP per PRD).

**Test Phases:**

1. **Component Testing (during development)**
   - Test each component in isolation as built
   - Verify props, styling, interactions

2. **Integration Testing (after Story 2.10)**
   - Test full workflows end-to-end
   - Verify frontend + backend integration

3. **Accessibility Testing (final review)**
   - Keyboard-only navigation
   - Screen reader compatibility
   - Color contrast verification

### Test Scenarios

**Scenario 1: Add New Server (Happy Path)**
```
Given: User on /config page
When: User clicks "+ Add Server"
  And: User fills required fields (ID, Name, IP, DNS)
  And: User clicks "Save Server"
Then: Success toast appears
  And: Server appears in sidebar list
  And: servers.json contains new server
  And: Backend logs "Server created"
```

**Scenario 2: Add Server with SNMP Configuration**
```
Given: User creating new server
When: User expands SNMP section
  And: User enables SNMP checkbox
  And: User enters community string "public"
  And: User enters storage indexes "1,2,3"
  And: User adds disk mappings: 1→"C:", 2→"D:", 3→"E:"
  And: User saves
Then: SNMP config saved in snmpConfig object
  And: diskNames array matches mappings
```

**Scenario 3: Edit Existing Server**
```
Given: servers.json has "server-001" with IP "192.168.1.10"
When: User clicks "server-001" in sidebar
  And: User changes IP to "192.168.1.11"
  And: User saves
Then: servers.json updated with new IP
  And: Success toast appears
  And: Sidebar shows updated IP
```

**Scenario 4: Validation Errors**
```
Given: User adding new server
When: User enters invalid IP "999.999.999.999"
  And: User blurs IP field
Then: Inline error appears: "Invalid IPv4 format"
  And: IP field shows red border
  And: Save button disabled
When: User corrects IP to "192.168.1.15"
  And: User blurs field
Then: Error clears
  And: Save button enabled
```

**Scenario 5: Duplicate Server ID**
```
Given: servers.json contains "server-001"
When: User adds new server with ID "server-001"
  And: User saves
Then: Backend returns 400 error
  And: Error toast appears
  And: Form shows validation error: "Server ID 'server-001' already exists"
```

**Scenario 6: Delete Server**
```
Given: servers.json has "server-001" named "ARAGÓ-01"
When: User selects "server-001" in sidebar
  And: User clicks "Delete" button
Then: Confirmation dialog appears with "Remove ARAGÓ-01 from monitoring?"
When: User clicks "Delete Server"
Then: Server removed from servers.json
  And: Server removed from sidebar
  And: Success toast appears
  And: Form clears
```

**Scenario 7: Unsaved Changes Warning**
```
Given: User editing "server-001" with unsaved changes
When: User clicks "server-002" in sidebar
Then: Dialog appears: "You have unsaved changes. Discard or save first?"
When: User clicks "Discard Changes"
Then: Form loads "server-002" (edits lost)
When: User edits "server-001" again with changes
  And: User clicks "server-002"
  And: User clicks "Save & Continue"
Then: "server-001" saved
  And: Form loads "server-002"
```

**Scenario 8: Cancel Button**
```
Given: User editing "server-001" with IP "192.168.1.10"
When: User changes IP to "192.168.1.99"
  And: User clicks "Cancel"
Then: Form reverts to IP "192.168.1.10"
  And: Dirty state cleared
```

**Scenario 9: Atomic Write Failure**
```
Given: Backend cannot write to servers.json (permissions error)
When: User saves server
Then: Backend returns 500 error
  And: Error toast appears: "Failed to save server configuration"
  And: Form remains editable
  And: Backend logs error with context
  And: servers.json unchanged (no partial write)
```

### Accessibility Testing Checklist

**Keyboard Navigation:**
- [ ] Tab through all form fields in logical order
- [ ] Enter key submits form when on Save button
- [ ] Escape key closes dialogs
- [ ] Arrow keys navigate sidebar list (optional enhancement)
- [ ] Shift+Tab navigates backward

**Screen Reader:**
- [ ] Form labels announced correctly
- [ ] Required fields announced as required
- [ ] Validation errors announced on blur
- [ ] Toast notifications announced (aria-live)
- [ ] Dialog announcements clear (aria-labelledby)

**Visual:**
- [ ] Focus indicators visible (2px blue ring)
- [ ] Color contrast ≥4.5:1 for all text
- [ ] Error messages readable (not color-only)

### Performance Testing

**Metrics to Verify:**
- [ ] Save operations complete <500ms (measure with Network tab)
- [ ] Validation feedback <200ms (measure time from blur to error display)
- [ ] Server selection loads form <100ms

### Regression Testing

**After Epic 2 Completion:**
- [ ] Existing dashboard still loads and displays servers
- [ ] Ping monitoring continues working
- [ ] SNMP monitoring still functional (if configured servers exist)
- [ ] NetApp monitoring still functional (if configured)
- [ ] No TypeScript errors in build
- [ ] No console errors on /config page

### Test Environment Setup

**Prerequisites:**
- Backend running on http://localhost:3001
- Frontend running on http://localhost:5173
- `backend/servers.json` exists (create empty [] if missing)
- `backend/dashboard-layout.json` exists

**Test Data:**
```json
// backend/servers.json (sample for testing)
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
      "storageIndexes": [1, 2],
      "diskNames": ["C:", "D:"]
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

### Bug Tracking

**Critical Bugs (block release):**
- Data corruption (servers.json invalid)
- Save/delete operations fail silently
- Form cannot be submitted

**High Priority Bugs (fix before release):**
- Validation errors not showing
- Unsaved changes dialog not appearing
- Toast notifications not displaying

**Medium Priority Bugs (fix in future sprint):**
- UI alignment issues
- Minor accessibility issues
- Performance slightly below target

**Low Priority Bugs (backlog):**
- Cosmetic issues
- Enhancement requests

---

**Test Sign-off:** Epic 2 considered tested when all test scenarios pass and accessibility checklist complete.
