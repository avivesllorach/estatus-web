# Epic Technical Specification: Group Management

Date: 2025-11-24
Author: Arnau
Epic ID: epic-3
Status: Draft

---

## Overview

The Group Management epic enables users to organize servers into dashboard groups with custom layouts, controlling how servers appear on the monitoring dashboard. This epic provides the complete technical foundation for creating, editing, deleting, and reordering groups, then assigning servers to them through the configuration UI. The implementation leverages the existing shadcn/ui component library and follows the established split-view layout pattern from Epic 1.

## Objectives and Scope

### In Scope:
- Complete CRUD operations for dashboard groups (Create, Read, Update, Delete)
- Server assignment interface with multi-select capabilities
- Group display order controls with up/down navigation
- Referential integrity management between servers and groups
- Group deletion with server reassignment handling
- Integration with existing SSE event system for real-time updates
- Atomic file operations for `dashboard-layout.json` persistence

### Out of Scope:
- Drag-and-drop group reordering (simplified to up/down controls for MVP)
- Visual group designer (text-based configuration only)
- Bulk group operations (handled individually)
- Group templates or presets
- Advanced group filtering or search

## System Architecture Alignment

The Group Management epic aligns with the established Estatus Web architecture by extending the existing configuration system without disrupting core monitoring functionality. The implementation adds new `/api/config/groups` endpoints alongside existing server management endpoints, leverages the ConfigManager service for hot-reload capabilities, and integrates with the SSE broadcaster for real-time dashboard updates.

Key architectural alignment points:
- **File Storage**: New `dashboard-layout.json` file follows the same atomic write pattern as `servers.json`
- **API Design**: RESTful endpoints under `/api/config/*` namespace maintain consistency with server management
- **Event System**: New `groupsChanged` SSE event type extends existing event broadcasting pattern
- **UI Components**: Reuses established form patterns from server management (FormSection, FormGroup, PanelHeader)
- **Validation**: Implements the same defense-in-depth validation strategy (frontend + backend)

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Integration Points |
|----------------|----------------|--------------------|
| `ConfigManager` | Load/save group configuration, emit change events | Extended to handle `dashboard-layout.json` |
| `GroupService` | Business logic for group operations (create, update, delete, reassign) | New backend service |
| `GroupValidator` | Input validation for group operations | Shared validation layer |
| `GroupRouter` | Express routes for `/api/config/groups` endpoints | Extends existing config routes |

**Backend Module Structure:**
```
backend/src/
├── routes/config.ts (extended with group endpoints)
├── services/
│   ├── GroupService.ts (NEW)
│   └── ConfigManager.ts (enhanced)
├── types/group.ts (NEW)
└── utils/validation.ts (extended with group validation)
```

### Data Models and Contracts

**GroupConfig Interface:**
```typescript
interface GroupConfig {
  id: string              // "group-1", "group-2" (auto-generated)
  name: string           // "ARAGÓ", "PROVENÇA" (required, unique)
  order: number          // 1, 2, 3... (display order)
  serverIds: string[]    // ["server-001", "server-002"] (assigned servers)
}
```

**dashboard-layout.json Schema:**
```json
{
  "groups": [
    {
      "id": "group-1",
      "name": "ARAGÓ",
      "order": 1,
      "serverIds": ["server-001", "server-002", "server-003"]
    },
    {
      "id": "group-2",
      "name": "PROVENÇA",
      "order": 2,
      "serverIds": ["server-004", "server-005"]
    }
  ]
}
```

**API Request/Response Contracts:**
```typescript
// Create Group Request
interface CreateGroupRequest {
  name: string           // Required, unique
  order?: number         // Optional (defaults to max+1)
  serverIds?: string[]   // Optional (defaults to empty)
}

// Update Group Request
interface UpdateGroupRequest {
  id: string
  name: string
  order: number
  serverIds: string[]
}

// Group Assignment Options (for delete)
interface DeleteGroupOptions {
  reassignStrategy: "unassign" | "default"
  targetGroupId?: string   // Only for "default" strategy
}
```

### APIs and Interfaces

**Group Management Endpoints:**

```
GET    /api/config/groups
  Response: ApiResponse<GroupConfig[]>
  Description: Get all groups with server assignments

POST   /api/config/groups
  Request: CreateGroupRequest
  Response: ApiResponse<GroupConfig>
  Description: Create new group with auto-generated ID

PUT    /api/config/groups/:id
  Request: UpdateGroupRequest
  Response: ApiResponse<GroupConfig>
  Description: Update group name, order, or server assignments

DELETE /api/config/groups/:id?reassign=unassign|default
  Query Params: reassign strategy for assigned servers
  Response: ApiResponse<{deletedId: string, reassignedServers: string[]}>
  Description: Delete group with optional server reassignment
```

**Server-Group Integration Points:**
```
GET /api/config/groups (used by config page to populate group list)
PUT /api/config/groups/:id (updates serverIds array)
DELETE /api/config/servers/:id (extended to remove serverId from all groups)
```

### Workflows and Sequencing

**Group Creation Sequence:**
1. User clicks "+ Add Group" in sidebar
2. ConfigPage renders empty GroupForm in main panel
3. User enters group name (validated for uniqueness)
4. User optionally assigns servers via multi-select interface
5. User clicks "Save Group"
6. Frontend sends POST /api/config/groups
7. Backend validates, auto-generates ID, persists to dashboard-layout.json
8. ConfigManager emits 'groups-changed' event
9. SSE broadcast sends groupsChanged event to all clients
10. Config page updates sidebar list, dashboard reorganizes layout

**Server Assignment Update Sequence:**
1. User selects group in sidebar, loads GroupForm
2. User modifies server assignments via multi-select interface
3. User clicks "Save Group"
4. Frontend sends PUT /api/config/groups/:id with updated serverIds
5. Backend validates all serverIds exist in servers.json
6. Backend updates dashboard-layout.json atomically
7. ConfigManager emits 'groups-changed' event
8. SSE broadcast updates all connected dashboards
9. Dashboard reorganizes server cards into new group layout

**Group Deletion with Reassignment Sequence:**
1. User selects group, clicks "Delete" button
2. Confirmation dialog shows server count and reassignment options
3. User selects reassignment strategy (unassign or move to default)
4. Frontend sends DELETE /api/config/groups/:id?reassign=strategy
5. Backend applies reassignment strategy to all serverIds
6. Backend removes group from dashboard-layout.json
7. ConfigManager emits 'groups-changed' event
8. All clients update: group removed from lists, servers reassigned
9. Dashboard reorganizes layout, servers appear in new groups or unassigned

## Non-Functional Requirements

### Performance

**Group Operation Response Time:** Group CRUD operations must complete within 500ms under normal conditions. This includes database/file operations, validation, and SSE event broadcasting. Group creation and updates should feel instantaneous to users maintaining the efficient UX established in Epic 1.

**Dashboard Layout Update Speed:** When groups change, dashboard reorganization must complete within 1 second. The `groupsChanged` SSE event should trigger immediate DOM updates without full page refresh, leveraging React's efficient diffing for layout changes.

**File I/O Performance:** Atomic writes to `dashboard-layout.json` must complete within 200ms for typical configurations (<50 groups, <200 servers). The temp file + rename pattern ensures data integrity without performance overhead.

### Security

**Input Validation:** All group names and server assignments must be validated server-side to prevent injection attacks. Group names should allow alphanumeric characters, spaces, and basic punctuation (dash, underscore) but reject HTML/JS tags or path traversal characters.

**Referential Integrity:** Backend must validate that all `serverIds` in group configurations exist in `servers.json`. Orphaned server IDs should be logged and cleaned up automatically to maintain data consistency.

**Authorization:** Group operations follow the existing security model (single-user local deployment). No additional authentication required, but input sanitization prevents potential security issues.

### Reliability/Availability

**Atomic Configuration Updates:** Group configuration changes must use atomic file writes to prevent corruption. The temp file + rename pattern ensures that `dashboard-layout.json` is never left in a partially written state, even if the process crashes during save.

**Referential Integrity Enforcement:** When servers are deleted, the system must automatically remove those server IDs from all group configurations to prevent orphaned references. This ensures the dashboard never tries to display non-existent servers.

**Error Recovery:** If group configuration becomes corrupted, the system should log the error and fall back to a default configuration (all servers in an "Ungrouped" group) rather than crashing the dashboard.

### Observability

**Configuration Change Logging:** All group operations (create, update, delete, server assignment changes) must be logged with timestamps, user action details, and affected resources. Logs should include group ID, name changes, and server assignment modifications.

**SSE Event Monitoring:** Group-related SSE events (`groupsChanged`) should be monitored for successful delivery to all connected clients. Failed broadcasts should be logged for debugging multi-client synchronization issues.

**Validation Failure Tracking:** Group validation failures (duplicate names, invalid server IDs) should be logged with enough context to diagnose data integrity issues. Include validation rule details and input values that failed validation.

## Dependencies and Integrations

**External Dependencies:**
- **shadcn/ui Components:** Dialog (confirmations), Select (multi-select), Button, Input
- **React Hook Form:** Form state management and validation for group forms
- **Node.js fs/promises:** Atomic file operations for dashboard-layout.json

**Internal Dependencies:**
- **ConfigManager:** Extended to handle group configuration hot-reload
- **SSE Broadcaster:** Extended with `groupsChanged` event type
- **Server Management:** DELETE /api/config/servers updated to clean up group references
- **Validation Utils:** Extended with group-specific validation rules

**Integration Points:**
- **Dashboard Component:** Enhanced to render groups dynamically from dashboard-layout.json
- **Server Management Epic:** DELETE endpoints cascade to remove server from all groups
- **Config Page:** Groups sidebar integrates with existing selection and navigation patterns

## Acceptance Criteria (Authoritative)

1. **Group Creation**: Users can create new groups with unique names via the "+ Add Group" button and group form. Group IDs are auto-generated with format "group-{timestamp}" or sequential numbering.

2. **Group Editing**: Users can edit existing group names and display orders through the group edit form. Group names must be unique across all groups (case-insensitive).

3. **Server Assignment**: Users can assign servers to groups via a multi-select interface showing server name and IP address. Servers can belong to multiple groups simultaneously.

4. **Group Reordering**: Users can change group display order using up/down arrow buttons or direct number input. Groups are displayed on dashboard in ascending order (1, 2, 3...).

5. **Group Deletion**: Users can delete groups with confirmation dialogs that show the number of assigned servers. Users can choose to unassign servers or move them to a default group.

6. **Referential Integrity**: When a server is deleted, it is automatically removed from all group configurations to prevent orphaned references.

7. **Real-Time Updates**: Group changes (create, update, delete, server assignment) trigger `groupsChanged` SSE events that update all connected dashboards in real-time without refresh.

8. **Data Persistence**: All group configurations persist to `dashboard-layout.json` using atomic file writes that prevent corruption even if the process crashes during save.

9. **Validation**: Group names are required and must be unique. Server assignments are validated to ensure all referenced servers exist in the current server configuration.

10. **Error Handling**: Validation errors display inline with specific guidance. Backend errors show non-blocking toast notifications. Failed operations don't lose user data and allow retry.

## Traceability Mapping

| AC | PRD FRs | Spec Section | Component/API | Test Idea |
|----|---------|---------------|---------------|-----------|
| AC1 (Group Creation) | FR27 | Data Models | POST /api/config/groups | Create group, verify auto-generated ID |
| AC2 (Group Editing) | FR28 | APIs | PUT /api/config/groups/:id | Edit group name, verify uniqueness validation |
| AC3 (Server Assignment) | FR31, FR32, FR33 | Workflows | PUT /api/config/groups/:id | Assign servers via multi-select, verify dashboard update |
| AC4 (Group Reordering) | FR34 | Workflows | PUT /api/config/groups/:id | Change order numbers, verify dashboard sequence |
| AC5 (Group Deletion) | FR29, FR30 | Workflows | DELETE /api/config/groups/:id | Delete with servers, verify reassignment options |
| AC6 (Referential Integrity) | FR70, FR71 | Data Models | DELETE /api/config/servers | Delete server, verify removed from all groups |
| AC7 (Real-Time Updates) | FR47, FR50 | SSE | groupsChanged event | Change group on Computer A, verify updates on Computer B |
| AC8 (Data Persistence) | FR37, FR38 | File Operations | Atomic write utils | Crash process during save, verify file integrity |
| AC9 (Validation) | FR51, FR52, FR58 | Validation | GroupValidator | Test duplicate name, invalid server ID scenarios |
| AC10 (Error Handling) | FR59, FR60 | Error Handling | Toast notifications | Test network failures, validation errors |

## Risks, Assumptions, Open Questions

**Risks:**
- **Concurrent Group Edits**: Multiple users editing groups simultaneously could cause last-write-wins conflicts. Mitigation: Document single-user deployment model, consider adding conflict detection in future enhancements.

- **Large Group Performance**: Dashboard performance with 50+ groups or 500+ servers may degrade layout rendering. Mitigation: Implement virtualization for large server lists, test with realistic data volumes.

- **Dashboard Layout Complexity**: Complex group assignments with many servers per group may make dashboard layout difficult to scan. Mitigation: Implement responsive grid layout that adapts to group sizes.

**Assumptions:**
- **Single User Environment**: Group management assumes single-user local deployment where concurrent edit conflicts are minimal. Multi-user scenarios would require additional conflict resolution mechanisms.

- **Server ID Stability**: Assumes server IDs in `servers.json` remain stable. If server IDs change, group assignments could break. Mitigation: Log warnings for orphaned server IDs during configuration load.

- **File System Permissions**: Assumes the application has read/write permissions to create and modify `dashboard-layout.json` in the backend directory.

**Open Questions:**
- **Default Group Behavior**: Should the system create a default group for unassigned servers, or display them separately? Decision: Default to showing unassigned servers in a special "Ungrouped" section on dashboard.

- **Group Deletion Strategy**: When deleting a group with many servers, should the system default to unassignment or prompt users to choose? Decision: Always prompt with clear options to prevent accidental data loss.

- **Maximum Group Limits**: Should there be limits on number of groups or servers per group for performance reasons? Decision: No artificial limits for MVP, monitor performance and implement if needed.

## Test Strategy Summary

**Unit Testing:**
- GroupService CRUD operations with mock file system
- Validation logic for group names (uniqueness, format)
- Server assignment referential integrity checks
- Atomic file write operations and error recovery

**Integration Testing:**
- End-to-end group creation, editing, deletion workflows
- SSE event broadcasting for group changes
- Dashboard layout updates in response to group modifications
- Server deletion cascading to group cleanup

**Performance Testing:**
- Group operation response times with 100+ groups
- Dashboard rendering performance with complex group assignments
- Concurrent file access during group configuration updates

**Accessibility Testing:**
- Keyboard navigation through group creation/editing forms
- Screen reader announcements for group operation feedback
- ARIA attributes for multi-select server assignment interface

**Error Scenario Testing:**
- Network failures during group save operations
- File corruption scenarios and recovery behavior
- Invalid server ID handling in group configurations

**User Acceptance Testing:**
- Complete group management workflows from user perspective
- Dashboard layout organization using groups
- Multi-client synchronization verification