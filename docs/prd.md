# estatus-web - Product Requirements Document

**Author:** Arnau
**Date:** 2025-11-17
**Version:** 1.0

---

## Executive Summary

**Estatus Web** is evolving from a code-configured monitoring dashboard into a fully self-service platform. Currently, managing servers requires manual editing of `servers.json` and `Dashboard.tsx` - a friction point that requires development skills and restarts. This PRD defines a **Configuration UI** (`/config` page) that enables complete server and layout management through a web interface with live, zero-downtime updates.

**Brownfield Context:** Built on React 18 + Express with SSE real-time updates, SNMP disk monitoring, and NetApp storage integration. The new config feature extends this foundation without disrupting existing monitoring capabilities.

### What Makes This Special

This transforms Estatus Web from a **developer tool** (requires code changes) into a **self-service monitoring platform**. The compelling value: manage your entire server infrastructure through a UI - add servers, configure SNMP/NetApp settings, reorganize dashboard groups - all without touching code or restarting services.

---

## Project Classification

**Technical Type:** Web Application (Enhancement)
**Domain:** General IT Infrastructure Monitoring
**Complexity:** Low

**Brownfield Project:** Adding configuration management UI to existing monitoring dashboard
**User Base:** Single user (personal infrastructure monitoring)
**Deployment:** Local server environment

{{#if domain_context_summary}}

### Domain Context

{{domain_context_summary}}
{{/if}}

---

## Success Criteria

**Definition of Success:**

1. **Zero Manual File Editing** - User never needs to edit `servers.json` or `Dashboard.tsx` manually
2. **Live Updates Without Restarts** - Configuration changes apply immediately to both frontend and backend without service interruptions
3. **30-Second Server Addition** - Adding a new monitored server takes under 30 seconds from opening `/config` to seeing it on the dashboard
4. **Visual Layout Control** - Dashboard group organization is managed through UI, not code

**User Experience Success:**
- Config page feels intuitive - no documentation needed for basic operations
- Save operations provide clear feedback (success/error states)
- Dashboard reflects changes instantly after save
- No lost monitoring data during configuration updates

---

## Product Scope

### MVP - Minimum Viable Product

**Core Configuration Management:**

1. **Server Management**
   - Add new servers with all required fields (id, name, ip, dnsAddress)
   - Edit existing servers (all fields including credentials)
   - Delete servers with confirmation
   - View list of all configured servers

2. **SNMP Configuration per Server**
   - Enable/disable SNMP monitoring
   - Configure storage indexes
   - Define disk mappings (index + custom name)

3. **NetApp Configuration per Server**
   - Enable/disable NetApp monitoring
   - Select API type (REST/ZAPI)
   - Set credentials (username/password)
   - Configure LUN paths

4. **Dashboard Group Management**
   - Create new groups
   - Rename existing groups
   - Delete groups (with server reassignment handling)
   - View all groups

5. **Server-to-Group Assignment**
   - Assign servers to groups via dropdown/select
   - Move servers between groups
   - Handle ungrouped servers

6. **Group Layout Control**
   - Reorder groups (affects dashboard display order)
   - Define group arrangement on dashboard

**Live Update Mechanism:**
- Backend API endpoints for CRUD operations on servers and groups
- Backend hot-reloads configuration without restart
- Frontend updates dashboard layout dynamically
- PingService adapts to config changes without dropping connections

**Persistence:**
- All changes save to `servers.json`
- Group/layout configuration saves to new file (e.g., `dashboard-layout.json`)
- File writes are atomic to prevent corruption

### Growth Features (Post-MVP)

**Enhanced Usability:**
- Server connection testing before save (ping + SNMP test)
- Bulk import servers from CSV
- Duplicate server feature (clone config for similar servers)
- Search/filter in server list
- Undo recent changes

**Validation & Safety:**
- Real-time validation (IP format, required fields)
- Warning when deleting server with active monitoring
- Config backup/restore functionality
- Export configuration as JSON

**Advanced Layout:**
- Drag-and-drop server assignment to groups
- Visual grid designer for dashboard layout
- Group collapse/expand in config UI
- Preview mode to see dashboard changes before saving

### Vision (Future)

**Monitoring Configuration:**
- Configure ping intervals per server
- Set custom disk usage thresholds
- Define alert rules (email/webhook on status change)

**Multi-Dashboard Support:**
- Create multiple dashboard views
- Switch between different layouts
- Role-based dashboards (if multi-user added later)

**Integration:**
- Auto-discovery of network devices (SNMP scan)
- Import from existing monitoring tools (Nagios, Zabbix)
- API for external configuration management

---

{{#if domain_considerations}}

## Domain-Specific Requirements

{{domain_considerations}}

This section shapes all functional and non-functional requirements below.
{{/if}}

---

{{#if innovation_patterns}}

## Innovation & Novel Patterns

{{innovation_patterns}}

### Validation Approach

{{validation_approach}}
{{/if}}

---

## Web Application Specific Requirements

### Routing & Navigation

**New Route:**
- `/config` - Configuration management page
- Direct URL access only (no visible navigation link from main dashboard)
- Dashboard at `/` remains unchanged (no visual modifications)

**Navigation Flow:**
- User navigates to `/config` by typing URL directly
- Config page provides way to return to dashboard (header link/button)
- Dashboard and config are separate routes, not modal overlays

### Browser & Platform Support

**Supported Browsers:**
- Firefox (primary)
- Chrome/Edge (secondary - should work but not primary test target)

**Platform Support:**
- Desktop only (responsive design not required for mobile/tablet)
- Minimum resolution: 1280x720 (typical desktop monitor)

### API Specification

**New Backend Endpoints:**

**Server Management:**
- `POST /api/config/servers` - Create new server
- `PUT /api/config/servers/:id` - Update existing server
- `DELETE /api/config/servers/:id` - Delete server
- `GET /api/config/servers` - Get all servers (already exists, may need enhancement)

**Group Management:**
- `GET /api/config/groups` - Get all groups with server assignments
- `POST /api/config/groups` - Create new group
- `PUT /api/config/groups/:id` - Update group (rename, reorder)
- `DELETE /api/config/groups/:id` - Delete group
- `PUT /api/config/groups/:id/servers` - Update server assignments for group

**Configuration Hot-Reload:**
- All config endpoints trigger backend configuration reload
- Backend updates internal state without restart
- PingService adapts to new server list without dropping SSE connections
- Changes broadcast via SSE to all connected dashboard clients

**Data Validation:**
- Frontend validation: Required fields, format checks (IP, ID uniqueness)
- Backend validation: Duplicate detection, referential integrity
- Validation errors returned with 400 status and detailed error messages

### Real-Time Multi-Client Sync

**Cross-Device Update Propagation:**
- Config changes saved from Computer A propagate to dashboard on Computer B
- SSE event types extended to include config updates
- Dashboard subscribes to new SSE events: `serverAdded`, `serverRemoved`, `serverUpdated`, `groupsChanged`
- Dashboard dynamically updates layout when groups/servers change

### Persistence Strategy

**File-Based Configuration:**
- `backend/servers.json` - Server configurations (existing file, modified format)
- `backend/dashboard-layout.json` - New file for group definitions and layout
- Atomic file writes to prevent corruption during save
- Backend loads configuration at startup and on hot-reload

**Configuration Schema:**
```json
// servers.json (existing, unchanged structure)
[
  { "id": "server-001", "name": "...", "ip": "...", ... }
]

// dashboard-layout.json (new file)
{
  "groups": [
    {
      "id": "group-1",
      "name": "ARAGÓ",
      "order": 1,
      "serverIds": ["server-001", "server-002"]
    }
  ]
}
```

---

## User Experience Principles

**Design Philosophy:**
The config UI should feel **utilitarian and efficient** - prioritizing speed and clarity over visual polish. This is an admin tool, not a consumer product.

**Visual Personality:**
- Clean and functional (similar to existing dashboard aesthetic)
- Minimal distractions - focus on the data/forms
- Consistent with existing Tailwind CSS styling
- Use existing Aller font family

**UX Principles:**

1. **Instant Feedback** - Every action shows immediate visual confirmation
2. **Forgiving** - Easy to undo mistakes (delete confirmations, cancel buttons)
3. **Efficient** - Minimize clicks and context switching
4. **Transparent** - Always show what's being edited, what's saved, what's pending

### Key Interactions

**Config Page Layout (Split View):**

```
┌─────────────────────────────────────────────────────┐
│  Config Header    [Save All] [Back to Dashboard]    │
├──────────────┬──────────────────────────────────────┤
│              │                                       │
│  Servers     │     Edit Server Form                 │
│  [+ Add]     │     ┌───────────────────────┐        │
│              │     │ ID: server-001        │        │
│  ○ Server-1  │     │ Name: ARAGÓ-01        │        │
│  ● Server-2  │     │ IP: 192.168.1.10      │        │
│  ○ Server-3  │     │ ...                   │        │
│              │     │ [SNMP Config ▼]       │        │
│  ─────────   │     │ [NetApp Config ▼]     │        │
│              │     └───────────────────────┘        │
│  Groups      │                                       │
│  [+ Add]     │     [Cancel] [Save Server]           │
│              │                                       │
│  ○ Group-1   │                                       │
│  ○ Group-2   │                                       │
│              │                                       │
└──────────────┴──────────────────────────────────────┘
```

**Interaction Patterns:**

1. **Adding a Server:**
   - Click "+ Add Server" in left sidebar
   - Right panel shows empty form
   - Fill required fields (ID, name, IP, dnsAddress)
   - Expand SNMP/NetApp sections if needed
   - Click "Save Server"
   - Server appears in left sidebar list
   - Backend saves to servers.json and hot-reloads

2. **Editing a Server:**
   - Click server name in left sidebar
   - Right panel loads server details into form
   - Modify fields as needed
   - Click "Save Server"
   - Changes persist and propagate to all dashboards

3. **Deleting a Server:**
   - Click server in left sidebar
   - Click "Delete" button in form
   - Confirmation dialog: "Remove [server-name] from monitoring?"
   - Confirm → server removed from backend, SSE notifies dashboards

4. **Managing Groups:**
   - Click group in left sidebar
   - Right panel shows group edit form:
     - Group name (editable)
     - Server assignment (multi-select or drag-drop)
     - Order/position controls
   - Save changes → layout updates across all dashboards

5. **Reordering Groups:**
   - Drag-and-drop groups in left sidebar (Growth feature)
   - OR: Use up/down arrows in group edit form (MVP)
   - Changes reflect immediately in dashboard layout

**Form Behavior:**

- **Unsaved Changes Warning:** If editing and click another server, prompt "Unsaved changes. Discard or save first?"
- **Validation Feedback:** Real-time validation on blur (IP format, required fields)
- **Error Display:** Inline errors below fields, summary at top on save failure
- **Success Confirmation:** Toast/banner notification on successful save

---

## Functional Requirements

### User Interface & Navigation

**FR1:** User can access configuration page by navigating to `/config` URL
**FR2:** Configuration page displays "Back to Dashboard" link to return to `/`
**FR3:** Dashboard at `/` displays monitoring interface with no visual changes from current implementation

### Server Configuration Management

**FR4:** User can view list of all configured servers in left sidebar
**FR5:** User can create new server with required fields: id, name, ip, dnsAddress
**FR6:** User can edit any field of an existing server configuration
**FR7:** User can delete a server with confirmation dialog
**FR8:** System validates server ID uniqueness before save
**FR9:** System validates IP address format (IPv4) before save
**FR10:** System validates all required fields are populated before save
**FR11:** User can view server configuration details in right panel when selected from list
**FR12:** System shows active/selected server visually in left sidebar list

### SNMP Configuration

**FR13:** User can enable/disable SNMP monitoring per server
**FR14:** User can configure SNMP storage indexes for a server
**FR15:** User can define disk mappings with custom names for each storage index
**FR16:** User can add multiple disk configurations to a server
**FR17:** User can remove disk configurations from a server
**FR18:** SNMP configuration section can be expanded/collapsed in server form

### NetApp Configuration

**FR19:** User can enable/disable NetApp monitoring per server
**FR20:** User can select NetApp API type (REST or ZAPI)
**FR21:** User can configure NetApp credentials (username and password)
**FR22:** User can define multiple LUN paths for monitoring
**FR23:** User can add new LUN configurations to a server
**FR24:** User can remove LUN configurations from a server
**FR25:** NetApp configuration section can be expanded/collapsed in server form

### Group Management

**FR26:** User can view list of all dashboard groups in left sidebar
**FR27:** User can create new dashboard group with a name
**FR28:** User can rename an existing dashboard group
**FR29:** User can delete a dashboard group
**FR30:** System prompts for server reassignment when deleting group with assigned servers
**FR31:** User can assign servers to a group via group edit form
**FR32:** User can remove servers from a group
**FR33:** User can move servers between groups
**FR34:** User can reorder groups using up/down controls (affects dashboard display order)
**FR35:** System displays which servers are assigned to each group

### Configuration Persistence

**FR36:** System saves server configurations to `backend/servers.json` file
**FR37:** System saves group and layout configurations to `backend/dashboard-layout.json` file
**FR38:** System performs atomic file writes to prevent corruption
**FR39:** System loads configuration from JSON files on backend startup
**FR40:** System reloads configuration from JSON files after save without backend restart

### Real-Time Configuration Updates

**FR41:** Backend hot-reloads server list when configuration changes
**FR42:** Backend hot-reloads group layout when configuration changes
**FR43:** PingService adapts to new server list without dropping SSE connections
**FR44:** PingService stops monitoring deleted servers immediately
**FR45:** PingService starts monitoring newly added servers immediately
**FR46:** System broadcasts configuration changes via SSE to all connected dashboard clients
**FR47:** Dashboard adds new servers to display when `serverAdded` SSE event received
**FR48:** Dashboard removes servers from display when `serverRemoved` SSE event received
**FR49:** Dashboard updates server details when `serverUpdated` SSE event received
**FR50:** Dashboard reorganizes layout when `groupsChanged` SSE event received

### Form Validation & Error Handling

**FR51:** System validates required fields on form submission
**FR52:** System shows inline validation errors below invalid fields
**FR53:** System displays validation error summary at top of form on save failure
**FR54:** System prevents saving form with validation errors
**FR55:** System shows real-time validation feedback on field blur
**FR56:** Backend returns 400 status with detailed error message for validation failures
**FR57:** System detects duplicate server IDs and prevents creation
**FR58:** System validates IP address format matches IPv4 pattern

### User Feedback & Confirmations

**FR59:** System shows success notification (toast/banner) after successful save
**FR60:** System shows error notification if save fails
**FR61:** System displays confirmation dialog before deleting a server
**FR62:** System displays confirmation dialog before deleting a group with assigned servers
**FR63:** System warns user about unsaved changes when switching to another server/group
**FR64:** User can cancel out of edit form without saving changes
**FR65:** User can discard unsaved changes when prompted

### Multi-Client Synchronization

**FR66:** Configuration changes made on Computer A appear on dashboard on Computer B without refresh
**FR67:** Multiple config pages open simultaneously show consistent data after saves
**FR68:** Dashboard monitoring continues uninterrupted during configuration changes
**FR69:** SSE connections remain active during hot-reload operations

### Data Integrity

**FR70:** System maintains referential integrity between servers and groups
**FR71:** System handles ungrouped servers appropriately (assign to default group or special handling)
**FR72:** System preserves monitoring state during configuration updates
**FR73:** System prevents data loss during concurrent edits (last-write-wins acceptable for single user)

**Total Functional Requirements: 73**

---

## Non-Functional Requirements

### Performance

**NFR-P1: Configuration Save Response Time**
- Configuration save operations (add/edit/delete server or group) must complete within 500ms under normal conditions
- Rationale: Immediate feedback is critical for the "no restart" value proposition

**NFR-P2: Hot-Reload Speed**
- Backend configuration hot-reload must complete within 2 seconds
- Dashboard updates via SSE must propagate within 1 second of backend reload
- Rationale: "Live updates" means users see changes almost immediately

**NFR-P3: Config Page Load Time**
- `/config` page must load and render server list within 2 seconds
- Applies to typical deployment (~50 servers)
- Rationale: Config page should feel responsive for quick edits

**NFR-P4: Form Responsiveness**
- Form field validation feedback must appear within 200ms of blur event
- Server selection in sidebar must update right panel within 100ms
- Rationale: UI should feel instant, not laggy

**NFR-P5: Monitoring Continuity**
- Configuration changes must not cause monitoring gaps > 5 seconds
- SSE connections must remain stable during hot-reload
- Rationale: Critical - monitoring shouldn't go dark during config updates

### Security

**NFR-S1: Local Network Deployment**
- Application designed for trusted local network environment
- No authentication required (single user, private network)
- Rationale: Explicitly scoped for personal use on local infrastructure

**NFR-S2: Credential Storage**
- NetApp credentials stored in plaintext in `servers.json`
- File permissions should restrict access to application user only (OS-level)
- Rationale: Acceptable for local deployment; production hardening is out of scope

**NFR-S3: Input Sanitization**
- All user inputs must be sanitized to prevent injection attacks
- IP addresses validated against format to prevent command injection
- Rationale: Basic security hygiene even for personal tools

**NFR-S4: File System Safety**
- Configuration file writes must validate paths to prevent directory traversal
- Atomic writes prevent partial/corrupted configuration files
- Rationale: Protect system integrity and prevent data loss

### Reliability

**NFR-R1: Configuration Data Integrity**
- File writes must be atomic (write to temp file, then rename)
- Configuration corruption must not occur even if save interrupted
- Rationale: Losing server configuration would require manual reconstruction

**NFR-R2: Graceful Error Handling**
- Invalid configuration must not crash backend
- Backend must log errors and continue with last valid configuration
- Config UI must display clear error messages, never generic "something went wrong"
- Rationale: User should always understand what went wrong and how to fix it

**NFR-R3: State Consistency**
- All dashboards must eventually reflect same server list and layout
- Temporary inconsistencies acceptable during propagation (eventual consistency)
- Rationale: Multi-client sync doesn't need to be perfectly synchronous

**NFR-R4: Monitoring Stability**
- Configuration changes must not cause PingService crashes or hangs
- Adding/removing servers must not affect monitoring of other servers
- Rationale: Core monitoring functionality must remain stable

### Usability

**NFR-U1: Form Clarity**
- All form fields must have clear labels
- Required fields must be visually indicated
- Validation errors must be specific and actionable
- Rationale: User should never be confused about what to enter

**NFR-U2: Error Recovery**
- User can always cancel out of operations and return to safe state
- Validation errors must not lose entered data
- Delete confirmations prevent accidental data loss
- Rationale: Forgiving UI reduces frustration

**NFR-U3: Visual Feedback**
- All actions must provide visual confirmation (success/error)
- Active selections must be clearly indicated
- Unsaved changes must be visually distinct
- Rationale: User should always know system state

### Maintainability

**NFR-M1: Code Consistency**
- Config UI must follow existing code patterns (React Hooks, Tailwind CSS)
- Backend endpoints must follow existing API response format (`ApiResponse<T>`)
- Rationale: Brownfield integration - new code should match existing style

**NFR-M2: Configuration Schema**
- JSON schemas must be backward compatible
- Existing `servers.json` structure must not break
- New `dashboard-layout.json` is additive only
- Rationale: Existing monitoring must continue working during development

**NFR-M3: Error Logging**
- Backend must log all configuration changes with timestamps
- Validation failures must be logged with details
- Rationale: Debugging config issues requires visibility into what changed

### Compatibility

**NFR-C1: Browser Support**
- Config UI must work in Firefox (latest stable version)
- Chrome/Edge support is nice-to-have but not required
- Rationale: Single-user tool, Firefox is primary browser

**NFR-C2: Existing Dashboard Compatibility**
- Dashboard must continue to work without changes if `/config` not used
- Hard-coded groups in `Dashboard.tsx` can be replaced gradually
- Rationale: Phased rollout - monitoring continues during implementation

**NFR-C3: Data Format Compatibility**
- `servers.json` format must remain compatible with current structure
- Existing server entries must load correctly after upgrade
- Rationale: Zero-downtime migration from current implementation

---

## Summary

**What We're Building:**
A self-service configuration UI at `/config` that eliminates manual file editing and service restarts for Estatus Web server monitoring management.

**The Value:**
Transform Estatus Web from a developer tool (requires code changes) into a self-service platform where infrastructure changes happen through a clean, efficient UI with live updates across all connected dashboards.

**Key Metrics:**
- **73 Functional Requirements** covering complete config management
- **Zero manual file edits** - all changes through UI
- **Live updates** - no backend/frontend restarts required
- **30-second workflow** - add new server to monitoring
- **Multi-client sync** - changes propagate via SSE to all dashboards

**Implementation Scope:**
- New `/config` route with split-view UI (server/group list + edit form)
- 9 new REST endpoints for server/group CRUD
- Backend hot-reload mechanism for configuration changes
- New SSE events for config synchronization
- New `dashboard-layout.json` for group management
- Dashboard dynamic layout updates based on configuration

**Brownfield Integration:**
- Preserves existing monitoring functionality
- Compatible with current `servers.json` format
- Dashboard works without changes if `/config` not used
- Phased rollout possible - no breaking changes

---

_This PRD captures the complete vision for transforming Estatus Web into a self-service monitoring platform - enabling infrastructure management through an efficient admin UI with live, zero-downtime updates._

_Created through collaborative discovery between Arnau and PM agent._
