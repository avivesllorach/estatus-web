# Epic Technical Specification: Configuration UI Foundation

Date: 2025-11-18
Author: Arnau
Epic ID: epic-1
Status: Draft

---

## Overview

Epic 1 establishes the foundational UI infrastructure for the Configuration Management feature of Estatus Web. This epic delivers the `/config` route with a professional split-view layout powered by shadcn/ui components, enabling users to navigate to the configuration interface and view their server and group lists at a glance.

The epic transforms Estatus Web from a developer-configured tool into a self-service platform by providing the visual foundation upon which all configuration features (Server CRUD, Group Management, Live Updates) will be built. Users gain immediate access to a dedicated configuration interface separate from the monitoring dashboard, setting the stage for complete infrastructure self-management.

## Objectives and Scope

**Primary Objectives:**

1. **Install and integrate shadcn/ui component library** with Neutral color theme (gray + blue accents)
2. **Create `/config` route** with React Router integration, accessible via direct URL navigation
3. **Implement split-view layout** (280px fixed sidebar + flexible main panel)
4. **Display server list** in sidebar with name, IP, scroll support, and hover states
5. **Enable server selection** with active state indication and keyboard navigation
6. **Display group list** in sidebar with group name and server count
7. **Show empty state** in main panel when no item is selected
8. **Add action buttons** ("+ Add Server", "+ Add Group") for initiating creation workflows

**In Scope:**

- shadcn/ui installation and configuration (Button, Input, Label, Checkbox, Select, Dialog, Toast, Collapsible, ScrollArea, Separator components)
- React Router 6+ setup with `/` (Dashboard) and `/config` routes
- ConfigLayout, Sidebar, ServerListItem, GroupListItem, MainPanel, EmptyState components
- Fetching servers via existing `GET /api/servers` endpoint
- New backend endpoint: `GET /api/config/groups` (read-only for Epic 1)
- Tailwind CSS styling with Neutral color palette
- Keyboard navigation (arrow keys, tab order)
- ARIA attributes for accessibility (aria-current, aria-label)

**Out of Scope (Deferred to Later Epics):**

- Server CRUD operations (Epic 2)
- Group CRUD operations (Epic 3)
- Form validation and save functionality (Epic 2 & 3)
- SSE-based real-time updates (Epic 4)
- ConfigManager service and hot-reload (Epic 4)

**Success Criteria:**

- User can navigate to `/config` and see split-view layout
- Server list loads from `servers.json` and displays all configured servers
- Clicking a server highlights it with blue background
- Group list displays with server counts
- Empty state shown when nothing selected
- "Back to Dashboard" link navigates to `/`
- Component library operational and styled per UX spec

## System Architecture Alignment

**Frontend Architecture:**

Epic 1 integrates with the existing React 18 + Vite + Tailwind CSS frontend stack, adding:

- **React Router 6+:** New dependency for client-side routing (`/` and `/config` routes)
- **shadcn/ui + Radix UI:** Component library providing accessible primitives (Architectural Decision #5: Route Structure)
- **Component Hierarchy:** New `/src/pages/` and `/src/components/config/` directories per Project Structure (section 9)

**Routing Integration:**

- Follows Architectural Decision #5 (Route Structure): React Router with separate components
- `/` route → existing Dashboard component (unchanged)
- `/config` route → new ConfigPage component
- Browser back/forward navigation works correctly
- No visible navigation link from Dashboard (user types `/config` directly per PRD FR1)

**Backend Integration (Minimal for Epic 1):**

- Reuses existing `GET /api/servers` endpoint (read-only, no changes required)
- New endpoint: `GET /api/config/groups` (returns empty array `[]` initially)
  - Simple implementation for Epic 1: reads `dashboard-layout.json` if exists, else returns `[]`
  - Full CRUD implementation deferred to Epic 3

**Design System Integration:**

- Neutral color palette (UX Design section 3.1) configured in Tailwind config
- Aller font family maintained for consistency with existing dashboard
- 4px base spacing unit (existing Tailwind scale)
- shadcn/ui components customized via Tailwind utility classes

**Component Strategy (per Architecture section 4):**

```
App.tsx (NEW: React Router setup)
├── DashboardPage (route: /) - wrapper for existing Dashboard
└── ConfigPage (route: /config - NEW)
    └── ConfigLayout (NEW: split-view container)
        ├── Sidebar (NEW: 280px fixed width)
        └── MainPanel (NEW: flexible width, empty state)
```

**No Breaking Changes:**

- Existing Dashboard component unchanged
- Existing API endpoints (`/api/servers`, `/api/events`) unchanged
- Brownfield integration: config UI is additive, dashboard works without it

## Detailed Design

### Services and Modules

**Frontend Components (All NEW):**

| Component | Responsibility | Inputs | Outputs | Owner |
|-----------|---------------|--------|---------|-------|
| **ConfigPage** | Top-level route component | Route params | Renders ConfigLayout | Epic 1 |
| **ConfigLayout** | Split-view container (flexbox) | - | Sidebar + MainPanel | Epic 1 |
| **Sidebar** | Server/group list navigation | `servers[]`, `groups[]`, `activeId`, `onSelect()` | Click events | Epic 1 |
| **ServerListItem** | Individual server entry | `server{id, name, ip}`, `isActive`, `onClick()` | Selection event | Epic 1 |
| **GroupListItem** | Individual group entry | `group{id, name, serverIds[]}`, `isActive`, `onClick()` | Selection event | Epic 1 |
| **MainPanel** | Right content area | `children` (form or empty state) | Renders content | Epic 1 |
| **EmptyState** | Placeholder when nothing selected | `message`, `icon` | Displays guidance | Epic 1 |

**shadcn/ui Components (Installed):**

| Component | Usage in Epic 1 | Configuration |
|-----------|----------------|---------------|
| **Button** | "+ Add Server", "+ Add Group", "Back to Dashboard" | Primary, secondary variants |
| **ScrollArea** | Sidebar server/group list overflow | Custom scrollbar styling |
| **Separator** | Visual dividers between sections | 1px gray-200 line |

**Backend Module (Minimal for Epic 1):**

| Module | Responsibility | Inputs | Outputs | Implementation |
|--------|---------------|--------|---------|----------------|
| **GET /api/config/groups** | Return group list | - | `ApiResponse<GroupConfig[]>` | Read `dashboard-layout.json`, return groups array or `[]` |

**State Management:**

- **React useState:** Local component state for `selectedServerId`, `selectedGroupId`
- **No global state library needed:** Simple component communication via props
- **Data fetching:** Standard fetch/axios calls to existing API endpoints

### Data Models and Contracts

**TypeScript Interfaces (Epic 1 Subset):**

```typescript
// Server configuration (existing, from servers.json)
interface ServerConfig {
  id: string               // "server-001"
  name: string            // "ARAGÓ-01"
  ip: string              // "192.168.1.10"
  dns: string             // "arago-01.local"
  // ... other fields (SNMP, NetApp) not used in Epic 1 UI
}

// Group configuration (new, from dashboard-layout.json)
interface GroupConfig {
  id: string              // "group-1"
  name: string           // "ARAGÓ"
  order: number          // 1, 2, 3... (display order)
  serverIds: string[]    // ["server-001", "server-002"]
}

// API response wrapper (existing pattern)
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Component props
interface SidebarProps {
  servers: ServerConfig[]
  groups: GroupConfig[]
  activeServerId?: string
  activeGroupId?: string
  onSelectServer: (id: string) => void
  onSelectGroup: (id: string) => void
  onAddServer: () => void
  onAddGroup: () => void
}

interface ServerListItemProps {
  server: ServerConfig
  isActive: boolean
  onClick: () => void
}

interface GroupListItemProps {
  group: GroupConfig
  isActive: boolean
  onClick: () => void
}
```

**Data Schemas:**

Epic 1 reads existing data structures, no modifications:

- `backend/servers.json` - Unchanged, read-only via `GET /api/servers`
- `backend/dashboard-layout.json` - May not exist yet, returns `[]` if missing

**Normalization:**

- Server list fetched once on mount, stored in component state
- Group list fetched once on mount, stored in component state
- No complex joins required (just display name + IP for servers, name + count for groups)

### APIs and Interfaces

**Existing API (Reused, No Changes):**

```
GET /api/servers
Response: ApiResponse<ServerConfig[]>
Status: 200 (success), 500 (error)

Example:
{
  "success": true,
  "data": [
    {
      "id": "server-001",
      "name": "ARAGÓ-01",
      "ip": "192.168.1.10",
      "dns": "arago-01.local",
      "consecutiveSuccesses": 3,
      "consecutiveFailures": 3,
      "snmpConfig": { ... },
      "netappConfig": { ... }
    }
  ]
}
```

**New API Endpoint (Epic 1 Implementation):**

```
GET /api/config/groups
Response: ApiResponse<GroupConfig[]>
Status: 200 (success), 500 (error)

Implementation (backend/src/routes/config.ts):
- Read dashboard-layout.json file (if exists)
- Parse JSON and extract groups array
- Return { success: true, data: groups }
- If file doesn't exist: return { success: true, data: [] }

Example Response:
{
  "success": true,
  "data": [
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
      "serverIds": ["server-005", "server-006"]
    }
  ]
}

If dashboard-layout.json doesn't exist yet:
{
  "success": true,
  "data": []
}
```

**Component Interfaces:**

```typescript
// ConfigPage exports
export function ConfigPage(): JSX.Element

// Sidebar exports
export function Sidebar(props: SidebarProps): JSX.Element

// ServerListItem exports
export function ServerListItem(props: ServerListItemProps): JSX.Element

// GroupListItem exports
export function GroupListItem(props: GroupListItemProps): JSX.Element

// EmptyState exports
export function EmptyState(props: { message?: string }): JSX.Element
```

**Error Handling:**

- API errors: Display toast notification or inline error (Epic 2)
- Network errors: Retry logic or user-friendly message
- Empty states: Show "No servers configured" or "No groups created" messages

### Workflows and Sequencing

**User Flow: Navigate to Config Page**

```
1. User types `/config` in browser address bar
   ↓
2. React Router renders ConfigPage component
   ↓
3. ConfigPage renders ConfigLayout
   ↓
4. ConfigLayout mounts and triggers data fetch:
   - Parallel fetch: GET /api/servers
   - Parallel fetch: GET /api/config/groups
   ↓
5. Loading state shown (optional spinner or skeleton)
   ↓
6. Data received, state updated
   ↓
7. Sidebar renders:
   - ServerListItem for each server
   - GroupListItem for each group
   - "+ Add Server" and "+ Add Group" buttons (no-op onClick for Epic 1)
   ↓
8. MainPanel renders EmptyState:
   - "Select a server or group from the list to edit"
```

**User Flow: Select Server from List**

```
1. User clicks "ARAGÓ-01" in server list
   ↓
2. ServerListItem onClick handler fires
   ↓
3. Parent component (ConfigPage/ConfigLayout) updates state:
   - setSelectedServerId("server-001")
   - setSelectedGroupId(null)  // Clear group selection
   ↓
4. Re-render:
   - ServerListItem with id="server-001" receives isActive=true
   - Blue background (#eff6ff), blue text (#2563eb) applied
   - Other ServerListItems receive isActive=false (white background)
   ↓
5. MainPanel shows EmptyState (Epic 1)
   - Note: Server form rendering deferred to Epic 2
```

**User Flow: Navigate Back to Dashboard**

```
1. User clicks "Back to Dashboard" link in header
   ↓
2. React Router navigates to `/`
   ↓
3. DashboardPage component renders
   ↓
4. Existing Dashboard component displayed (unchanged)
```

**Sequence Diagram (Component Initialization):**

```
User → Browser: Navigate to /config
Browser → ConfigPage: Mount component
ConfigPage → ConfigLayout: Render
ConfigLayout → API: GET /api/servers
ConfigLayout → API: GET /api/config/groups
API → ConfigLayout: Return servers[]
API → ConfigLayout: Return groups[]
ConfigLayout → Sidebar: Render with data
Sidebar → ServerListItem[]: Render list
Sidebar → GroupListItem[]: Render list
ConfigLayout → MainPanel: Render with EmptyState
MainPanel → User: Display "Select a server..."
```

**Data Flow:**

```
GET /api/servers
  ↓
servers: ServerConfig[]
  ↓
Sidebar → ServerListItem[] → Display name + IP
  ↓
User clicks → setSelectedServerId(id)
  ↓
Active state: isActive={selectedServerId === server.id}
  ↓
CSS: Blue background if active
```

## Non-Functional Requirements

### Performance

**NFR-P3: Config Page Load Time** (from Architecture NFR Coverage)

- **Requirement:** `/config` page must load and render server list within 2 seconds
- **Target for Epic 1:** <2s for ~50 servers
- **Implementation:**
  - Parallel API calls: `GET /api/servers` and `GET /api/config/groups` fetch concurrently
  - No expensive computations during render
  - Simple list rendering with React virtualization if >100 servers (future enhancement)
- **Measurement:** Time from route navigation to fully rendered sidebar list
- **Expected:** <500ms for typical deployment (10-20 servers)

**NFR-P4: Form Responsiveness** (Partial - Epic 1 focuses on selection)

- **Requirement:** Server selection in sidebar must update right panel within 100ms
- **Implementation:**
  - Simple state update (`setSelectedServerId`)
  - No network calls on selection (form data fetching deferred to Epic 2)
  - CSS-only visual feedback (blue background via conditional className)
- **Measurement:** Time from click to blue background applied
- **Expected:** <50ms (instant visual feedback)

**Epic 1 Specific:**

- **Component render time:** <16ms per frame (60 FPS)
- **ScrollArea performance:** Smooth scrolling even with 50+ servers
- **No blocking operations:** All data fetching asynchronous with loading states

### Security

**NFR-S1: Local Network Deployment** (from PRD)

- **Context:** Application designed for trusted local network environment
- **Epic 1 Impact:** No authentication required for accessing `/config` route
- **Rationale:** Explicitly scoped for personal use on local infrastructure

**NFR-S3: Input Sanitization** (Minimal for Epic 1)

- **Epic 1 Scope:** No user input forms yet (read-only display)
- **Preparation:** React auto-escapes JSX content, preventing XSS
- **Future:** Form validation and sanitization implemented in Epic 2

**Component Security:**

- **shadcn/ui components:** Built on Radix UI primitives with accessibility and security best practices
- **No innerHTML usage:** All content rendered via React JSX
- **No eval() or dangerous patterns:** Standard React component patterns only

**API Security (Epic 1):**

- **GET endpoints only:** No mutation operations in Epic 1
- **Read-only access:** Cannot modify `servers.json` or `dashboard-layout.json` via Epic 1 UI
- **CORS:** Existing backend CORS configuration applies (local deployment)

### Reliability/Availability

**NFR-R2: Graceful Error Handling** (from PRD)

- **API fetch failures:**
  - If `GET /api/servers` fails: Show "Failed to load servers" message in sidebar
  - If `GET /api/config/groups` fails: Show "Failed to load groups" message
  - User can manually refresh page to retry
- **Empty states:**
  - No servers configured: Show "No servers found. Add your first server to get started."
  - No groups configured: Show "No groups created yet."
- **Component errors:**
  - React Error Boundaries catch render errors
  - Fallback UI: "Something went wrong. Please refresh the page."

**NFR-C2: Existing Dashboard Compatibility** (from PRD)

- **Brownfield integration:** Dashboard continues to work without `/config` route
- **No breaking changes:** Existing Dashboard component unchanged
- **Graceful degradation:** If shadcn/ui fails to load, dashboard still functional

**Epic 1 Specific:**

- **No data corruption risk:** Read-only operations, no file writes
- **Component stability:** Proper null checks for `servers` and `groups` arrays
- **Loading states:** Skeleton UI or spinner during data fetch (prevents flash of empty content)

### Observability

**Logging Requirements:**

- **Frontend console logging:**
  - API fetch errors: `console.error('Failed to load servers:', error)`
  - Component mount/unmount: `console.debug('ConfigPage mounted')`
  - Route navigation: React Router logs navigation events
- **Backend logging (for new endpoint):**
  - GET /api/config/groups requests: Log timestamp, response status
  - File read errors: Log if `dashboard-layout.json` read fails
  - Format: `[INFO] GET /api/config/groups - 200 OK (15ms)`

**Metrics (Future Enhancement):**

- Config page load time (Lighthouse metrics)
- API response times (server-side timing)
- Component render times (React DevTools Profiler)

**Error Tracking:**

- Frontend errors logged to browser console
- Backend errors logged to stdout/log file
- No third-party error tracking in MVP (local deployment)

**Epic 1 Specific:**

- **Required log events:**
  - User navigates to `/config`
  - API calls initiated
  - API responses received (success/error)
  - Server selection events
- **Debug logging:** Component lifecycle events (mount, unmount, re-render triggers)

## Dependencies and Integrations

**New Frontend Dependencies (to be installed):**

| Dependency | Version | Purpose | Installation Command |
|------------|---------|---------|----------------------|
| **react-router-dom** | ^6.20.0+ | Client-side routing for `/` and `/config` | `npm install react-router-dom` |
| **shadcn/ui** | latest | Component library (copied into project) | `npx shadcn-ui@latest init` |
| **@radix-ui/react-*** | latest | Primitive components (installed with shadcn/ui) | Auto-installed |
| **class-variance-authority** | latest | Component variant styling | Auto-installed with shadcn/ui |
| **clsx** | latest | Conditional className utility | Auto-installed with shadcn/ui |
| **tailwind-merge** | latest | Merge Tailwind classes | Auto-installed with shadcn/ui |

**Existing Frontend Dependencies (unchanged):**

- **react** ^18.2.0 - UI library
- **react-dom** ^18.2.0 - React DOM rendering
- **tailwindcss** ^3.4.3 - Utility-first CSS framework
- **vite** ^4.5.3 - Build tool
- **typescript** ^5.2.2 - Type safety

**Backend Dependencies (Epic 1):**

No new backend dependencies required for Epic 1. New endpoint uses existing Node.js built-ins:

- **fs/promises** - Read `dashboard-layout.json` (built-in)
- **express** - Existing route handler pattern

**Integration Points:**

**1. Existing API Integration:**
```typescript
// Frontend calls existing endpoint
const response = await fetch('/api/servers')
const { data: servers } = await response.json()
```

**2. New API Integration:**
```typescript
// Frontend calls new endpoint
const response = await fetch('/api/config/groups')
const { data: groups } = await response.json()
```

**3. React Router Integration:**
```typescript
// App.tsx modification
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import ConfigPage from './pages/ConfigPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/config" element={<ConfigPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

**4. Tailwind Configuration:**
```javascript
// tailwind.config.ts - Add shadcn/ui color variables
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        primary: {
          DEFAULT: "#2563eb", // Blue 600
          foreground: "#ffffff",
        },
        // ... shadcn/ui color tokens
      },
    },
  },
  plugins: [],
}
```

**External Service Integrations:**

- None for Epic 1 (local deployment, no external APIs)

**File System Integration:**

- **Read:** `backend/servers.json` via `GET /api/servers` (existing)
- **Read:** `backend/dashboard-layout.json` via `GET /api/config/groups` (new, returns `[]` if file doesn't exist)

**Version Constraints:**

- React Router 6+ required (major version, breaking changes from v5)
- shadcn/ui compatible with React 18+
- Tailwind CSS 3.4+ for modern features
- Node.js 18+ (existing backend requirement)

## Acceptance Criteria (Authoritative)

**Epic-Level Acceptance Criteria:**

**AC1: shadcn/ui Component Library Installed**
- **Given** the project uses React 18 + Tailwind CSS
- **When** shadcn/ui is installed via CLI (`npx shadcn-ui@latest init`)
- **Then** the following components are available in `src/components/ui/`:
  - Button, Input, Label, Checkbox, Select
  - Dialog, Toast, Separator, ScrollArea, Collapsible
- **And** Tailwind config includes shadcn/ui color variables (Neutral theme)
- **And** Aller font family is maintained for consistency

**AC2: React Router Configured with `/config` Route**
- **Given** I am a user
- **When** I type `/config` in the browser address bar
- **Then** the config page loads and displays split-view layout
- **And** the browser URL shows `/config`
- **And** clicking "Back to Dashboard" navigates to `/`
- **And** dashboard functionality remains unchanged

**AC3: Split-View Layout Implemented**
- **Given** I navigate to `/config`
- **When** the page loads
- **Then** I see a split-view layout with:
  - Left sidebar: 280px fixed width, white background, gray border-right
  - Right main panel: Flexible width, light gray background (#fafafa)
  - Page header with "Configuration" title (H1, 24px, bold)
  - "Back to Dashboard" link in header

**AC4: Server List Displayed in Sidebar**
- **Given** I am on the `/config` page
- **When** the page loads
- **Then** I see all servers from `servers.json` listed in the sidebar under "SERVERS" section
- **And** each server list item displays:
  - Server name (14px, semibold, gray-900)
  - IP address below name (12px, monospace, gray-600)
- **And** the server list is scrollable if it exceeds sidebar height
- **And** hovering a server shows light gray background (#f5f5f5)

**AC5: Server Selection with Active State**
- **Given** I am on the `/config` page with servers listed
- **When** I click a server in the sidebar
- **Then** that server is highlighted with blue background (#eff6ff) and blue text (#2563eb)
- **And** only one server can be active at a time
- **And** the active selection persists until I select a different server or group
- **And** keyboard navigation is supported:
  - Tab to focus server list
  - Arrow Up/Down to navigate
  - Enter to select highlighted server
- **And** active server has `aria-current="true"` for screen readers

**AC6: Group List Displayed in Sidebar**
- **Given** I am on the `/config` page
- **When** the page loads
- **Then** I see all groups under "GROUPS" section in sidebar
- **And** each group list item displays:
  - Group name (14px, semibold, gray-900)
  - Server count below name (12px, gray-600, e.g., "4 servers")
- **And** the group list supports the same interaction patterns as server list
- **And** groups are visually separated from servers by section label

**AC7: Empty State Shown When Nothing Selected**
- **Given** I am on the `/config` page
- **When** no server or group is selected (initial load or after deletion)
- **Then** the main panel displays an empty state with:
  - Centered icon or illustration
  - Message: "Select a server or group from the list to edit"
  - Secondary message: "Or click '+ Add Server' to create a new monitored server"
- **And** the empty state is vertically and horizontally centered

**AC8: Add Server and Add Group Buttons Present**
- **Given** I am on the `/config` page
- **When** I view the sidebar
- **Then** I see "+ Add Server" button at the top of the SERVERS section
- **And** I see "+ Add Group" button at the top of the GROUPS section
- **And** both buttons use shadcn/ui Button component with:
  - Secondary variant (white background, gray border)
  - Small size (compact for sidebar)
  - Plus icon prefix
  - Full width within sidebar
- **And** buttons are keyboard accessible (tab order, enter to activate)
- **And** clicking buttons does nothing in Epic 1 (event handlers added in Epic 2 & 3)

**Story-Level Acceptance Criteria (from epics.md):**

- **Story 1.1:** shadcn/ui installed and configured ✅ (AC1)
- **Story 1.2:** `/config` route with split-view layout ✅ (AC2, AC3)
- **Story 1.3:** Display server list in sidebar ✅ (AC4)
- **Story 1.4:** Server selection with active state ✅ (AC5)
- **Story 1.5:** Display group list in sidebar ✅ (AC6)
- **Story 1.6:** Empty state for main panel ✅ (AC7)
- **Story 1.7:** Add Server and Add Group buttons ✅ (AC8)

## Traceability Mapping

**Epic 1 → PRD Functional Requirements:**

| AC | Spec Section | Component(s) | Test Idea |
|----|--------------|--------------|-----------|
| **AC1: shadcn/ui Installation** | UX Design 1.1, 6.1 | `src/components/ui/*` | Verify components exist, Tailwind config has color tokens |
| **AC2: React Router** | PRD FR1, FR2 | App.tsx, ConfigPage | Navigate to `/config`, verify route renders, click "Back to Dashboard" |
| **AC3: Split-View Layout** | UX Design 4.1, Architecture Decision #5 | ConfigLayout, Sidebar, MainPanel | Measure sidebar width (280px), verify flexbox layout |
| **AC4: Server List** | PRD FR4, Epics Story 1.3 | Sidebar, ServerListItem | Fetch `GET /api/servers`, verify all servers rendered with name + IP |
| **AC5: Server Selection** | PRD FR11, FR12, Epics Story 1.4 | ServerListItem, useState | Click server, verify blue background, aria-current="true" |
| **AC6: Group List** | PRD FR26, Epics Story 1.5 | Sidebar, GroupListItem | Fetch `GET /api/config/groups`, verify groups rendered with server count |
| **AC7: Empty State** | UX Design 7.1, Epics Story 1.6 | EmptyState | No selection, verify centered message displayed |
| **AC8: Add Buttons** | PRD FR5, FR27, Epics Story 1.7 | Button (shadcn/ui) | Verify buttons render, keyboard accessible, onClick does nothing |

**PRD Functional Requirements Coverage (Epic 1):**

| FR | Description | Coverage | Implementation |
|----|-------------|----------|----------------|
| **FR1** | User can access `/config` URL | ✅ Full | AC2: React Router route |
| **FR2** | Back to Dashboard link | ✅ Full | AC2: Link in header |
| **FR3** | Dashboard unchanged | ✅ Full | No modifications to Dashboard component |
| **FR4** | View server list in sidebar | ✅ Full | AC4: ServerListItem components |
| **FR11** | View server details in right panel | 🔶 Partial | AC7: Empty state (form in Epic 2) |
| **FR12** | Active server visually indicated | ✅ Full | AC5: Blue background, aria-current |
| **FR26** | View group list in sidebar | ✅ Full | AC6: GroupListItem components |

**Architecture Alignment:**

| Arch Decision | Epic 1 Implementation |
|---------------|----------------------|
| **AD#5: Route Structure** | React Router with separate ConfigPage component |
| **AD#6: API Endpoint Design** | New `GET /api/config/groups` endpoint |
| **AD#10: State Management** | React Hook Form not needed yet, useState for selection |

**UX Design Alignment:**

| UX Spec Section | Epic 1 Implementation |
|-----------------|----------------------|
| **1.1 Design System** | shadcn/ui + Radix UI installed |
| **3.1 Color System** | Neutral palette configured in Tailwind |
| **3.2 Typography** | Aller font maintained |
| **4.1 Design Direction** | Balanced Professional split-view (280px sidebar) |
| **5.1 Journey 1** | User can navigate to config, select server (form in Epic 2) |
| **6.1 Component Library** | Button, ScrollArea, Separator installed |
| **8.2 Accessibility** | Keyboard nav, aria-current, WCAG AA contrast |

**Test Coverage Matrix:**

| Test Type | Scope | Example |
|-----------|-------|---------|
| **Unit Tests** | Component rendering | ServerListItem renders name + IP |
| **Unit Tests** | State management | setSelectedServerId updates active state |
| **Integration Tests** | API integration | GET /api/servers returns server list |
| **Integration Tests** | React Router | Navigate to `/config` renders ConfigPage |
| **E2E Tests** | User journey | Navigate → select server → verify blue highlight |
| **Accessibility Tests** | WCAG AA | Keyboard nav, aria attributes, color contrast |

## Risks, Assumptions, Open Questions

**Risks:**

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **shadcn/ui installation conflicts with existing Tailwind config** | Medium | Medium | Follow official shadcn/ui setup guide precisely, test component rendering immediately after install |
| **React Router breaks existing Dashboard routing** | Low | High | Wrap existing Dashboard in DashboardPage route component, test dashboard before/after |
| **Performance degradation with large server lists (>100 servers)** | Low | Medium | Defer optimization to future (React virtualization), acceptable for MVP with <50 servers |
| **Browser compatibility issues (Firefox primary, Chrome secondary)** | Low | Low | Test in Firefox first, shadcn/ui components are widely compatible |

**Assumptions:**

| Assumption | Validation | Impact if Wrong |
|------------|------------|-----------------|
| **Existing `GET /api/servers` endpoint returns all required fields** | Review API response schema | May need backend changes to include additional server fields |
| **`dashboard-layout.json` file doesn't exist yet** | Check backend directory | If exists, need to parse correctly; if schema differs, adjust endpoint |
| **No authentication required for `/config` route** | Confirmed in PRD (local deployment) | If auth needed later, add in Epic 2+ |
| **Users access config via direct URL typing (no nav link)** | Confirmed in PRD FR1 | Acceptable for MVP, nav link in growth features |
| **Server list fits in sidebar without pagination** | Typical deployment ~20 servers | If >50 servers, add search/filter (growth feature) |

**Open Questions:**

| Question | Status | Resolution |
|----------|--------|------------|
| **Should "+ Add Server" button show tooltip on hover?** | ✅ Resolved | No tooltip needed - button text is clear |
| **What happens if both `servers.json` and `dashboard-layout.json` fail to load?** | ✅ Resolved | Show error message in sidebar, allow page refresh retry |
| **Should keyboard navigation support Vim-style keys (j/k)?** | ⏳ Deferred | Standard arrow keys for MVP, Vim keys in growth features |
| **Should we pre-select first server on load?** | ✅ Resolved | No - show empty state, let user explicitly select |
| **Does `GET /api/config/groups` need pagination?** | ✅ Resolved | No pagination for MVP (~10 groups max expected) |

**Design Decisions Requiring Confirmation:**

All major design decisions documented in Architecture document (10 architectural decisions). Epic 1 follows:
- AD#5: Route Structure (React Router)
- AD#6: API Endpoint Design (`/api/config/groups`)
- AD#8: Config Validation Layer (deferred to Epic 2)
- AD#10: State Management (React useState)

## Test Strategy Summary

**Test Levels:**

**1. Unit Tests (Component Level)**

**Framework:** Vitest + React Testing Library

**Scope:**
- Individual component rendering
- Component props handling
- State management (useState hooks)
- Event handlers (onClick, onKeyDown)

**Examples:**
```typescript
// ServerListItem.test.tsx
test('renders server name and IP', () => {
  const server = { id: 'server-001', name: 'ARAGÓ-01', ip: '192.168.1.10' }
  render(<ServerListItem server={server} isActive={false} onClick={vi.fn()} />)
  expect(screen.getByText('ARAGÓ-01')).toBeInTheDocument()
  expect(screen.getByText('192.168.1.10')).toBeInTheDocument()
})

test('applies active styles when isActive=true', () => {
  const server = { id: 'server-001', name: 'ARAGÓ-01', ip: '192.168.1.10' }
  const { container } = render(<ServerListItem server={server} isActive={true} onClick={vi.fn()} />)
  expect(container.firstChild).toHaveClass('bg-blue-50') // Active background
})

test('calls onClick when clicked', () => {
  const onClick = vi.fn()
  const server = { id: 'server-001', name: 'ARAGÓ-01', ip: '192.168.1.10' }
  render(<ServerListItem server={server} isActive={false} onClick={onClick} />)
  fireEvent.click(screen.getByText('ARAGÓ-01'))
  expect(onClick).toHaveBeenCalledTimes(1)
})
```

**2. Integration Tests (API + Component)**

**Framework:** Vitest + MSW (Mock Service Worker)

**Scope:**
- API data fetching
- Component integration with API responses
- Error handling

**Examples:**
```typescript
// ConfigPage.test.tsx
test('fetches and displays server list on mount', async () => {
  server.use(
    rest.get('/api/servers', (req, res, ctx) => {
      return res(ctx.json({
        success: true,
        data: [
          { id: 'server-001', name: 'ARAGÓ-01', ip: '192.168.1.10' },
          { id: 'server-002', name: 'ARAGÓ-02', ip: '192.168.1.11' }
        ]
      }))
    })
  )

  render(<ConfigPage />)
  await waitFor(() => {
    expect(screen.getByText('ARAGÓ-01')).toBeInTheDocument()
    expect(screen.getByText('ARAGÓ-02')).toBeInTheDocument()
  })
})

test('shows error message when API fails', async () => {
  server.use(
    rest.get('/api/servers', (req, res, ctx) => {
      return res(ctx.status(500), ctx.json({ success: false, error: 'Server error' }))
    })
  )

  render(<ConfigPage />)
  await waitFor(() => {
    expect(screen.getByText(/Failed to load servers/i)).toBeInTheDocument()
  })
})
```

**3. End-to-End Tests (User Journey)**

**Framework:** Playwright

**Scope:**
- Complete user workflows
- Cross-browser testing (Firefox primary)
- Accessibility validation

**Examples:**
```typescript
// config-page.spec.ts
test('user can navigate to config page and select server', async ({ page }) => {
  await page.goto('http://localhost:5173')
  await page.goto('http://localhost:5173/config')

  // Verify split-view layout
  await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
  await expect(page.locator('[data-testid="main-panel"]')).toBeVisible()

  // Verify server list loaded
  await expect(page.locator('text=ARAGÓ-01')).toBeVisible()

  // Click server
  await page.click('text=ARAGÓ-01')

  // Verify active state
  await expect(page.locator('text=ARAGÓ-01').locator('..')).toHaveClass(/bg-blue/)
})

test('Back to Dashboard link works', async ({ page }) => {
  await page.goto('http://localhost:5173/config')
  await page.click('text=Back to Dashboard')
  await expect(page).toHaveURL('http://localhost:5173/')
})
```

**4. Accessibility Tests**

**Framework:** axe-playwright

**Scope:**
- WCAG AA compliance
- Keyboard navigation
- Screen reader support

**Examples:**
```typescript
// accessibility.spec.ts
test('config page meets WCAG AA standards', async ({ page }) => {
  await page.goto('http://localhost:5173/config')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('keyboard navigation works', async ({ page }) => {
  await page.goto('http://localhost:5173/config')

  // Tab to server list
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')

  // Arrow down to navigate
  await page.keyboard.press('ArrowDown')

  // Enter to select
  await page.keyboard.press('Enter')

  // Verify selection
  const activeServer = page.locator('[aria-current="true"]')
  await expect(activeServer).toBeVisible()
})
```

**Test Coverage Goals:**

| Category | Target Coverage | Priority |
|----------|----------------|----------|
| **Component Unit Tests** | 80%+ | High |
| **API Integration** | 100% of endpoints | High |
| **User Journeys (E2E)** | All 7 stories | High |
| **Accessibility** | Zero violations | High |
| **Error Scenarios** | All API failures, empty states | Medium |
| **Edge Cases** | Large server lists, no groups | Low |

**Continuous Testing:**

- Run unit tests on every commit (pre-commit hook)
- Run integration tests on PR creation
- Run E2E tests before merge to main
- Accessibility audit in CI pipeline

**Manual Testing Checklist:**

- [ ] Navigate to `/config` in Firefox
- [ ] Verify sidebar 280px width
- [ ] Verify server list loads and displays all servers
- [ ] Click each server, verify active state
- [ ] Verify group list displays
- [ ] Verify empty state when nothing selected
- [ ] Verify "+ Add Server" and "+ Add Group" buttons present
- [ ] Verify "Back to Dashboard" link works
- [ ] Test keyboard navigation (Tab, Arrow keys, Enter)
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Verify color contrast meets WCAG AA
- [ ] Test with 50+ servers (performance)
- [ ] Test with 0 servers (empty state)
- [ ] Test with 0 groups (empty state)

**Acceptance Testing:**

Each AC (AC1-AC8) will be manually verified against the Given/When/Then criteria before marking Epic 1 complete.
