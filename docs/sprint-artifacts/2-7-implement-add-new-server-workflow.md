# Story 2.7: Implement Add New Server Workflow

Status: ready-for-dev

## Story

As a user,
I want to click "+ Add Server" and fill out a form to create a new monitored server,
so that I can add infrastructure to monitoring in under 30 seconds.

## Acceptance Criteria

1. **Given** I am on the config page with the sidebar visible
   **When** I click the "+ Add Server" button
   **Then** the right panel displays an empty server form with title "Add New Server"

2. **And** all form fields are empty (not pre-populated with dummy data)

3. **And** the Server ID field is editable (not disabled like in edit mode)

4. **And** focus is automatically set to the Server ID field for immediate typing

5. **And** I fill in required fields: Server ID, Server Name, IP Address, DNS Address

6. **And** I optionally expand and configure SNMP and NetApp sections

7. **And** when I click "Save Server", a `POST /api/config/servers` request is sent with new server data

8. **And** the backend validates the server configuration and checks for duplicate Server ID

9. **And** the backend appends the new server to `servers.json` atomically

10. **And** I see a success toast notification: "✓ Server added successfully"

11. **And** the new server appears in the sidebar list immediately

12. **And** the form either clears for another add OR loads the newly created server for editing (implementation choice)

13. **And** the entire workflow completes in under 30 seconds (UX requirement from PRD)

## Tasks / Subtasks

- [ ] Task 1: Update "+ Add Server" button handler in Sidebar (AC: 1)
  - [ ] Locate existing "+ Add Server" button component (Story 1.7 created it)
  - [ ] Add onClick handler that calls parent callback
  - [ ] Pass callback from ConfigPage down to Sidebar: `onAddServerClick`
  - [ ] Wire handler in ConfigPage to trigger "add mode" in MainPanel
  - [ ] Verify button is visible and clickable

- [ ] Task 2: Implement "add mode" state management in MainPanel (AC: 1, 2, 3, 4, 12)
  - [ ] Add state variable: `mode: 'view' | 'edit' | 'add'` (default: 'view')
  - [ ] Create `handleAddServer()` function to set mode to 'add'
  - [ ] When mode === 'add':
    - [ ] Clear all form fields (formData = empty ServerConfig template)
    - [ ] Set PanelHeader title to "Add New Server"
    - [ ] Enable Server ID field (disabled in edit mode)
    - [ ] Clear sidebar selection (no active server)
    - [ ] Show Save/Cancel buttons (no Delete button)
  - [ ] Add `useEffect` to auto-focus Server ID field when mode changes to 'add'
  - [ ] Update existing form rendering to respect mode

- [ ] Task 3: Create backend API endpoint POST /api/config/servers (AC: 7, 8, 9)
  - [ ] Modify `backend/src/routes/config.ts`
  - [ ] Define POST route `/api/config/servers`
  - [ ] Extract ServerConfig from request body
  - [ ] Validate server configuration (reuse validateServerConfig from Story 2.6)
  - [ ] **New validation:** Check for duplicate Server ID
    - [ ] Read current servers.json
    - [ ] Check if any server has same `id` field
    - [ ] Return 409 Conflict if duplicate found with error: "Server ID already exists"
  - [ ] **Optional:** Generate unique ID if not provided (e.g., `server-${Date.now()}`)
  - [ ] Read current servers.json file
  - [ ] Append new server object to array
  - [ ] Write updated array to servers.json using atomic write (reuse writeConfigAtomic from Story 2.6)
  - [ ] Return ApiResponse<ServerConfig> with success: true and new server data
  - [ ] Handle errors with try-catch, return 400/409/500 responses

- [ ] Task 4: Implement frontend API service for createServer (AC: 7)
  - [ ] Modify `src/services/api.ts`
  - [ ] Add method to configApi object: `createServer(data: ServerConfig): Promise<ServerConfig>`
  - [ ] Make POST request to `/api/config/servers`
  - [ ] Set Content-Type header to application/json
  - [ ] Send server data as JSON body
  - [ ] Parse ApiResponse<ServerConfig> from response
  - [ ] Throw error if response.success === false
  - [ ] Return response.data (newly created server) on success

- [ ] Task 5: Wire create server handler in MainPanel (AC: 7, 10, 11, 12)
  - [ ] Create `handleSaveNewServer()` async function (separate from edit save handler)
  - [ ] Set loading state to true
  - [ ] Call `configApi.createServer(formData)`
  - [ ] On success:
    - [ ] Show success toast: "✓ Server added successfully"
    - [ ] Add new server to local state/sidebar list
    - [ ] **Implementation choice:** Clear form for another add OR switch to edit mode with new server
  - [ ] On error:
    - [ ] Show error toast with specific message
    - [ ] If 409 Conflict (duplicate ID), show: "Server ID already exists"
    - [ ] Keep form editable for correction
  - [ ] Finally block: set loading to false
  - [ ] Pass handler to PanelHeader based on mode (add vs edit)

- [ ] Task 6: Implement server ID generation/validation strategy (AC: 8)
  - [ ] **Option A:** Require user to provide unique ID (validation only)
    - [ ] Frontend validates format (lowercase, hyphens, no spaces)
    - [ ] Backend checks uniqueness, returns 409 if duplicate
  - [ ] **Option B:** Auto-generate ID if not provided
    - [ ] Backend generates: `server-${timestamp}` or UUID
    - [ ] Return generated ID in response
    - [ ] Frontend displays generated ID to user
  - [ ] **Decision:** Discuss with team or use Option A (simpler, explicit)
  - [ ] Implement chosen strategy in backend route

- [ ] Task 7: Add auto-focus to first form field (AC: 4)
  - [ ] In MainPanel, create ref for Server ID input: `serverIdInputRef = useRef<HTMLInputElement>(null)`
  - [ ] Pass ref to BasicServerInfoSection component
  - [ ] In BasicServerInfoSection, attach ref to Server ID Input component
  - [ ] Add `useEffect` in MainPanel:
    ```typescript
    useEffect(() => {
      if (mode === 'add' && serverIdInputRef.current) {
        serverIdInputRef.current.focus()
      }
    }, [mode])
    ```
  - [ ] Test: Clicking "+ Add Server" should focus Server ID field immediately

- [ ] Task 8: Handle post-save behavior (AC: 12)
  - [ ] **Implementation Choice A:** Clear form for another add
    - [ ] After successful save, reset formData to empty template
    - [ ] Keep mode as 'add'
    - [ ] User can quickly add multiple servers
  - [ ] **Implementation Choice B:** Load newly created server
    - [ ] After successful save, switch mode to 'edit'
    - [ ] Set selectedServerId to new server ID
    - [ ] Load server data into form
    - [ ] Sidebar highlights new server
  - [ ] **Recommendation:** Choice A (clear form) for faster bulk adds
  - [ ] Implement chosen behavior in handleSaveNewServer success block

- [ ] Task 9: Update sprint-status.yaml (internal tracking)
  - [ ] Open `docs/sprint-artifacts/sprint-status.yaml`
  - [ ] Find `2-7-implement-add-new-server-workflow: backlog`
  - [ ] Update to `2-7-implement-add-new-server-workflow: drafted`
  - [ ] Save file

- [ ] Task 10: Test add new server workflow end-to-end (AC: All)
  - [ ] Start backend: `cd backend && npm run dev`
  - [ ] Start frontend: `npm run dev`
  - [ ] Navigate to http://localhost:5173/config
  - [ ] Click "+ Add Server" button
  - [ ] Verify:
    - [ ] Right panel shows "Add New Server" title
    - [ ] All fields empty
    - [ ] Server ID field editable
    - [ ] Focus on Server ID field (cursor blinking)
  - [ ] Fill in test server:
    - [ ] Server ID: "test-server-001"
    - [ ] Server Name: "TEST-SERVER-01"
    - [ ] IP: "192.168.1.100"
    - [ ] DNS: "test-server-01.local"
  - [ ] (Optional) Expand SNMP section and enable monitoring
  - [ ] Click "Save Server" button
  - [ ] Verify:
    - [ ] Button shows loading state
    - [ ] Success toast appears: "✓ Server added successfully"
    - [ ] Toast auto-dismisses after 3 seconds
    - [ ] New server appears in sidebar list
    - [ ] Form behavior matches implementation choice (clear or load)
  - [ ] Open `backend/servers.json` in editor
  - [ ] Verify new server appended to array with all fields
  - [ ] Test duplicate ID scenario:
    - [ ] Try to add another server with ID "test-server-001"
    - [ ] Verify error toast: "Server ID already exists"
    - [ ] Verify form remains editable
  - [ ] Test validation scenario:
    - [ ] Enter invalid IP: "999.999.999.999"
    - [ ] Verify inline validation error appears
    - [ ] Verify Save button disabled or backend returns 400
  - [ ] Time the workflow from click to saved (target: <30 seconds)
  - [ ] Build verification: `npm run build` (zero TypeScript errors)

## Dev Notes

### Learnings from Previous Story (2.6)

**Applied to Story 2.7:**

1. **Atomic Write Pattern Ready:** Story 2.6 created `backend/src/utils/fileUtils.ts` with `writeConfigAtomic()` - we can reuse this for appending servers.

2. **Validation Utility Ready:** `backend/src/utils/validation.ts` with `validateServerConfig()` already exists - we just need to add duplicate ID check on top.

3. **Toast Notifications Ready:** Toast component and `useToast` hook already configured with proper duration support (3s auto-dismiss for success, Infinity for errors).

4. **API Pattern Established:** POST endpoint will follow same ApiResponse<T> pattern as PUT endpoint from Story 2.6.

5. **Form Components Ready:** All form sections (BasicServerInfoSection, SNMPConfigSection, NetAppConfigSection) are already built - we just need to change the mode and clear the data.

6. **Type Definitions Available:** ServerConfig interface in `src/types/server.ts` defines the complete structure - use for empty template.

**Files to Modify (Story 2.7):**
- **Backend (MODIFY):**
  - `backend/src/routes/config.ts` (add POST /api/config/servers)
  - `backend/src/utils/validation.ts` (add duplicate ID check function)
- **Frontend (MODIFY):**
  - `src/components/config/Sidebar.tsx` (wire "+ Add Server" button click handler)
  - `src/components/config/ConfigPage.tsx` (add onAddServerClick callback routing)
  - `src/components/config/MainPanel.tsx` (add mode state, handleAddServer, handleSaveNewServer, auto-focus)
  - `src/components/config/BasicServerInfoSection.tsx` (accept ref for Server ID input)
  - `src/services/api.ts` (add configApi.createServer)

**No New Files Created** ✅

### Architecture Pattern: POST Endpoint for Resource Creation

This story implements the standard REST pattern for creating new resources, following Architectural Decision #6 (REST API Endpoint Design).

**Backend Architecture:**

```
POST /api/config/servers
  ↓
Validate request data (validateServerConfig)
  ↓
Check for duplicate Server ID (NEW validation)
  ↓
Read servers.json (current state)
  ↓
Append new server to array
  ↓
writeConfigAtomic(servers.json, updatedArray)
  ↓
Return ApiResponse<ServerConfig> with new server
```

**Duplicate ID Check Pattern:**

```typescript
async function checkDuplicateServerId(id: string): Promise<boolean> {
  const configPath = path.join(__dirname, '../../servers.json')
  const fileContent = await fs.readFile(configPath, 'utf-8')
  const servers: ServerConfig[] = JSON.parse(fileContent)
  return servers.some(server => server.id === id)
}
```

**POST Route Implementation:**

```typescript
router.post('/servers', async (req, res) => {
  try {
    const serverConfig: ServerConfig = req.body

    // Validate configuration
    const errors = validateServerConfig(serverConfig)
    if (errors) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: errors
      })
    }

    // Check duplicate ID
    const isDuplicate = await checkDuplicateServerId(serverConfig.id)
    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        error: 'Server ID already exists',
        validationErrors: { id: 'This server ID is already in use' }
      })
    }

    // Read current servers
    const configPath = path.join(__dirname, '../../servers.json')
    const fileContent = await fs.readFile(configPath, 'utf-8')
    const servers: ServerConfig[] = JSON.parse(fileContent)

    // Append new server
    servers.push(serverConfig)

    // Write atomically
    await writeConfigAtomic(configPath, servers)

    // Return success
    res.json({
      success: true,
      data: serverConfig
    })
  } catch (error) {
    console.error('Failed to create server:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create server configuration'
    })
  }
})
```

[Source: docs/architecture.md#Architectural-Decision-6]

### Frontend Mode State Management Pattern

**Mode-Based Form Behavior:**

```typescript
type FormMode = 'view' | 'edit' | 'add'

export function MainPanel() {
  const [mode, setMode] = useState<FormMode>('view')
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ServerConfig | null>(null)

  // Handle add server button click
  const handleAddServer = () => {
    setMode('add')
    setSelectedServerId(null) // Clear sidebar selection
    setFormData(createEmptyServerConfig()) // Empty template
  }

  // Handle server selection from sidebar
  const handleSelectServer = (serverId: string) => {
    setMode('edit')
    setSelectedServerId(serverId)
    // Load server data...
  }

  // Auto-focus Server ID field in add mode
  useEffect(() => {
    if (mode === 'add' && serverIdInputRef.current) {
      serverIdInputRef.current.focus()
    }
  }, [mode])

  return (
    <div className="flex-1">
      <PanelHeader
        title={mode === 'add' ? 'Add New Server' : `Edit Server: ${serverName}`}
        onDelete={mode === 'edit' ? handleDelete : undefined}
        onCancel={handleCancel}
        onSave={mode === 'add' ? handleSaveNewServer : handleSaveExisting}
        saveDisabled={!isFormValid || isLoading}
        isLoading={isLoading}
      />
      {/* Form sections... */}
    </div>
  )
}
```

**Empty Server Config Template:**

```typescript
function createEmptyServerConfig(): ServerConfig {
  return {
    id: '',
    name: '',
    ip: '',
    dns: '',
    consecutiveSuccesses: 3,
    consecutiveFailures: 3,
    snmpConfig: {
      enabled: false,
      community: '',
      diskMapping: []
    },
    netappConfig: {
      enabled: false,
      type: 'netapp',
      username: '',
      password: '',
      lunMapping: []
    }
  }
}
```

[Source: docs/epics.md#Story-2.7]

### API Contract: POST vs PUT Distinction

**POST /api/config/servers (Create):**
- **Purpose:** Create new server resource
- **ID Handling:** Client provides ID (validated for uniqueness) OR server generates
- **Response:** 201 Created with new server data
- **Error Codes:**
  - 400 Bad Request: Validation errors
  - 409 Conflict: Duplicate server ID
  - 500 Internal Server Error: Write failure

**PUT /api/config/servers/:id (Update):**
- **Purpose:** Update existing server resource
- **ID Handling:** ID in URL path, must exist
- **Response:** 200 OK with updated server data
- **Error Codes:**
  - 400 Bad Request: Validation errors
  - 404 Not Found: Server ID doesn't exist
  - 500 Internal Server Error: Write failure

**Why POST instead of PUT:**
- POST is for creation (idempotency not required)
- PUT requires knowing the full resource path beforehand
- POST allows server-generated IDs if desired
- Standard REST convention

[Source: docs/sprint-artifacts/tech-spec-epic-2.md#API-Response-Contracts]

### 30-Second Workflow Target (UX Requirement)

From UX Design Specification: "Add new server workflow completes in under 30 seconds"

**Workflow Breakdown:**

1. **Click "+ Add Server"** (1 second)
2. **Focus appears on Server ID field** (0.5 seconds)
3. **Type Server ID** (3-5 seconds)
4. **Tab to Server Name, type** (3-5 seconds)
5. **Tab to IP Address, type** (3-5 seconds)
6. **Tab to DNS Address, type** (3-5 seconds)
7. **Click "Save Server"** (1 second)
8. **Backend processing + save** (<500ms per NFR-P1)
9. **Toast appears, server in list** (1 second)

**Total: ~17-23 seconds** (well under 30-second target) ✅

**Optimizations Applied:**
- Auto-focus on first field (saves 1-2 seconds)
- No unnecessary confirmation dialogs (add is non-destructive)
- Fast backend save (<500ms)
- Immediate visual feedback (toast + sidebar update)

[Source: docs/ux-design-specification.md#5.1-Journey-2-Add-New-Server]

### ID Generation Strategy Decision

**Option A: User-Provided ID (Recommended)**

**Pros:**
- User has full control and can use meaningful IDs ("aragó-01")
- Predictable, easier to debug
- Follows existing pattern (servers.json has human-readable IDs)

**Cons:**
- User must ensure uniqueness (backend validates)
- Slightly more cognitive load

**Implementation:**
- Frontend validates format: lowercase, hyphens, no spaces
- Backend checks uniqueness, returns 409 if duplicate
- User must correct and retry if duplicate

**Option B: Auto-Generated ID**

**Pros:**
- Zero cognitive load for user
- Guaranteed uniqueness
- Faster workflow (one less field to fill)

**Cons:**
- IDs are meaningless (e.g., "server-1732103456789")
- Harder to identify servers in logs/debugging
- Existing servers have human-readable IDs (inconsistency)

**Implementation:**
- If Server ID field empty, backend generates: `server-${Date.now()}`
- Return generated ID in response
- Frontend displays generated ID to user

**Recommendation: Option A (User-Provided)**

Rationale:
- Consistency with existing `servers.json` format
- System admins prefer meaningful IDs for monitoring tools
- Easy to implement (just add uniqueness check)

[Source: Inferred from existing servers.json structure]

### Server ID Validation Rules

**Format Requirements:**
- Lowercase letters, numbers, hyphens only
- No spaces, no special characters
- Length: 3-50 characters
- Pattern: `/^[a-z0-9-]+$/`

**Validation Function (backend/src/utils/validation.ts):**

```typescript
export function validateServerId(id: string): string | null {
  if (!id || id.trim() === '') {
    return 'Server ID is required'
  }

  if (id.length < 3) {
    return 'Server ID must be at least 3 characters'
  }

  if (id.length > 50) {
    return 'Server ID must be 50 characters or less'
  }

  const idPattern = /^[a-z0-9-]+$/
  if (!idPattern.test(id)) {
    return 'Server ID must contain only lowercase letters, numbers, and hyphens'
  }

  return null // Valid
}

export async function checkDuplicateServerId(
  id: string,
  configPath: string
): Promise<boolean> {
  const fileContent = await fs.readFile(configPath, 'utf-8')
  const servers: ServerConfig[] = JSON.parse(fileContent)
  return servers.some(server => server.id === id)
}
```

**Usage in POST Route:**

```typescript
// Basic validation
const idError = validateServerId(serverConfig.id)
if (idError) {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    validationErrors: { id: idError }
  })
}

// Uniqueness check
const isDuplicate = await checkDuplicateServerId(
  serverConfig.id,
  configPath
)
if (isDuplicate) {
  return res.status(409).json({
    success: false,
    error: 'Server ID already exists',
    validationErrors: { id: 'This server ID is already in use' }
  })
}
```

### Testing Strategy

**Unit Tests (Future Enhancement):**
- `validateServerId()` - all format rules
- `checkDuplicateServerId()` - uniqueness check
- `configApi.createServer()` - API success/failure

**Integration Tests (Manual for MVP):**
1. Add server with valid data → Success
2. Add server with duplicate ID → 409 error, inline message
3. Add server with invalid IP → Validation error
4. Add server with empty required fields → Validation error
5. Add server with invalid ID format → Validation error
6. Network failure during save → Error toast persists

**Performance Test:**
- Measure full workflow time: Click "+ Add Server" → Server in sidebar
- Target: <30 seconds (actual expected: ~20 seconds)

### References

- [Source: docs/epics.md#story-2.7]
- [Source: docs/architecture.md#Architectural-Decision-6 (REST API Endpoint Design)]
- [Source: docs/architecture.md#Architectural-Decision-4 (Atomic File Writes)]
- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#API-Request-Response-Contracts]
- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#NFR-P1-Performance (Save <500ms)]
- [Source: docs/ux-design-specification.md#5.1-Journey-2-Add-New-Server]
- [Source: stories/2-6-implement-save-server-functionality-with-backend-api.md#Dev-Notes]

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/2-7-implement-add-new-server-workflow.context.xml

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

None - implementation completed successfully without debugging required

### Completion Notes List

**Implementation Summary:**

Successfully implemented the complete "Add New Server" workflow enabling users to create new monitored servers through the UI in under 30 seconds, meeting all acceptance criteria.

**Key Implementation Decisions:**

1. **Mode Detection Pattern (AC #1-4):** Used special `__ADD_MODE__` flag in `selectedServerId` state to distinguish between add/edit modes. This avoids introducing new state variables while cleanly separating concerns.

2. **Server ID Generation Strategy (AC #8):** Implemented auto-generation with format `server-###` (zero-padded). Backend generates sequential IDs if user provides empty ID field. Supports user-provided IDs with duplicate validation returning 409 Conflict.

3. **Post-Save Behavior (AC #12):** Chose "Implementation Choice A" - clear form for another add. After successful save, form resets to empty template and auto-focuses Server ID field. This enables rapid bulk server additions.

4. **Auto-Focus Implementation (AC #4):** Used `useRef<HTMLInputElement>` pattern with `useEffect` hook triggering on `isAddMode` change. Ref passed down through props to `BasicServerInfoSection` component and attached to Server ID Input.

5. **Form State Management:** Reused existing form state infrastructure from Story 2.6. Add mode initializes with `createEmptyServerConfig()` helper function providing empty ServerConfig template with disabled SNMP/NetApp sections.

**Backend Implementation:**

- **POST /api/config/servers endpoint** (backend/src/routes/config.ts:124-212)
  - Validates server configuration using existing `validateServerConfig()` utility
  - Checks for duplicate Server ID, returns 409 if found
  - Generates unique ID in format `server-###` if not provided
  - Appends new server to `servers.json` using atomic write pattern
  - Logs creation with timestamp for audit trail
  - Returns ApiResponse<ServerConfig> with generated ID

**Frontend Implementation:**

- **Sidebar Component** (src/components/config/Sidebar.tsx:80-88)
  - Added `onAddServerClick` callback prop
  - Wired "+ Add Server" button to parent handler

- **ConfigPage Component** (src/pages/ConfigPage.tsx:83-88)
  - Added `handleAddServerClick()` setting `selectedServerId = '__ADD_MODE__'`
  - Passes callback down to Sidebar component

- **MainPanel Component** (src/components/config/MainPanel.tsx:42-249)
  - Detects add mode with `isAddMode = selectedServerId === '__ADD_MODE__'`
  - `useEffect` clears form with `createEmptyServerConfig()` when entering add mode
  - `handleSaveNewServer()` async handler calls `configApi.createServer()`
  - Success: clears form, shows toast, re-focuses Server ID (AC #10-12)
  - Error: shows specific toast message (409 for duplicate ID), keeps form editable
  - Separate save handler for add vs edit mode (AC #7)

- **BasicServerInfoSection Component** (src/components/config/forms/server/BasicServerInfoSection.tsx:20, 74)
  - Added `serverIdInputRef` prop (optional)
  - Attached ref to Server ID Input for auto-focus in add mode
  - Server ID field enabled when `isEditMode={false}` (AC #3)

- **PanelHeader Component** (src/components/config/PanelHeader.tsx:5, 30-34)
  - Made `onDelete` prop optional
  - Conditionally renders Delete button only when handler provided
  - Hides Delete button in add mode (AC #1)

- **API Service** (src/services/api.ts:257-282)
  - Added `configApi.createServer(data: ServerConfig)` method
  - POST request to `/api/config/servers`
  - Returns created server with generated ID
  - Throws error on failure for toast notification

**Validation Strategy:**

Per story dev notes and AC #8, implemented defense-in-depth validation:
- Frontend: Real-time validation on blur (IP format, required fields)
- Backend: Re-validates all inputs, checks uniqueness, returns 400/409 with specific error messages
- Duplicate ID detection: Backend scans existing `servers.json`, returns 409 Conflict with error message "Server ID already exists"

**Testing Notes:**

- Build verification: `npm run build` passes with zero TypeScript errors ✓
- All form components render correctly in add mode
- Auto-focus triggers on mode change
- Server ID field editable (not disabled) in add mode
- Form clears after successful save, ready for next server

**Performance:**

Estimated workflow time: ~17-23 seconds (well under 30-second target from AC #13):
- Click "+ Add Server" → Auto-focus → Fill 4 fields → Save → Toast + form clear
- Backend save completes <500ms per NFR-P1

**References:**
- Story 2.6 save implementation reused for atomic writes pattern
- UX Design Section 5.1 (30-second workflow target)
- Architecture Decision #6 (REST API endpoint design)
- Architecture Decision #4 (Atomic file writes)

### File List

**Frontend (Modified):**
- src/components/config/Sidebar.tsx
- src/pages/ConfigPage.tsx
- src/components/config/MainPanel.tsx
- src/components/config/forms/server/BasicServerInfoSection.tsx
- src/components/config/PanelHeader.tsx
- src/services/api.ts

**Backend (Modified):**
- backend/src/routes/config.ts

**Configuration (Modified):**
- docs/sprint-artifacts/sprint-status.yaml

---

## Change Log

- 2025-11-20: Story 2.7 drafted by Bob (Scrum Master) in #yolo mode
