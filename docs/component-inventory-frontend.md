# Component Inventory - Frontend

## Overview

React component library for the server monitoring dashboard built with TypeScript and Tailwind CSS.

---

## Component Hierarchy

```
App
└── Dashboard
    └── ServerContainer (multiple instances organized in rows)
        └── DeviceCard (multiple instances per container)
            └── StatusIndicator (visual indicator)
```

---

## Components

### 1. App (Root Component)

**File:** `src/App.tsx`

**Purpose:** Root application component

**Features:**
- Application shell
- CSS imports

---

### 2. Dashboard

**File:** `src/components/Dashboard.tsx`

**Purpose:** Main dashboard view that orchestrates server monitoring display

**State Management:**
- `servers` - Array of ServerData
- `loading` - Loading state
- `error` - Error messages
- `connectionStatus` - SSE connection status (commented out)

**Features:**
- Fetches initial server data from API
- Connects to real-time SSE updates
- Organizes servers into logical container groups
- Responsive grid layout with 4 rows
- Loading and error states with retry functionality
- Auto-cleanup on unmount

**Container Organization:**
- **Row 1:** ARAGÓ (4), PROVENÇA (3), DATASTORE ARAGÓ (2), DATASTORE PROVENÇA (2)
- **Row 2:** VIRTUAL CAMPUS (3), VIRTUAL CAMPUS - AULAS (7)
- **Row 3:** ATLAS (3), INTEGRADOR (1), BI (2), IRENE (4)
- **Row 4:** AD (4), COMMVAULT (2), RADIUS (2), CAS (1), LDAP (1), SMTP (1)

**Dependencies:**
- ServerContainer component
- apiService for data fetching and SSE

---

### 3. ServerContainer

**File:** `src/components/ServerContainer.tsx`

**Purpose:** Groups related servers under a title with dynamic grid layout

**Props:**
```typescript
{
  title: string;          // Container title (e.g., "ARAGÓ")
  servers: ServerData[];  // Array of servers to display
  serverCount: number;    // Number of columns in grid
}
```

**Features:**
- Gray background with rounded border
- Centered title
- Dynamic grid columns based on serverCount
- Consistent spacing with gap-2

**Styling:**
- Background: `#888b8d`
- Border: 2px solid `#888b8d`
- Rounded corners
- 2-unit padding

---

### 4. DeviceCard

**File:** `src/components/DeviceCard.tsx`

**Purpose:** Displays individual server status with disk information

**Props:**
```typescript
{
  name: string;              // Server name
  ip: string;                // IP address
  isOnline: boolean;         // Connection status
  diskInfo?: DiskInfo[];     // Up to 3 disk entries
  isDummy?: boolean;         // Test mode indicator
}
```

**Features:**
- Color-coded status (green=online, red=offline)
- Animated glow pulse for offline servers
- Disk usage display (max 3 disks)
- Warning colors for disk usage:
  - Red (90%+): Fast pulsing animation
  - Orange (80-89%): Slow pulsing animation
  - Gray (<80%): No animation
- Fixed height: 140px
- Font: Aller family (custom)

**Visual States:**
- **Online:** Green background (#10b981), green text
- **Offline:** Red background (#ef4444), red text, fast pulse animation
- **Disk Warning (80-89%):** Orange badge, slow pulse
- **Disk Critical (90%+):** Red badge, fast pulse
- **Test Mode:** Blue ring indicator

**Layout:**
- Server name (bold, center-aligned)
- IP address (monospace font, smaller)
- Disk info badges (if available, max 3)

---

### 5. StatusIndicator

**File:** `src/components/StatusIndicator.tsx`

**Purpose:** Simple visual status indicator

**Props:**
```typescript
{
  isOnline: boolean;  // Server online status
}
```

**Features:**
- Small circular indicator (12px diameter)
- Color-coded: Green (online) / Red (offline)

**Note:** Currently defined but not actively used in DeviceCard (replaced by background colors)

---

## Services

### apiService

**File:** `src/services/api.ts`

**Purpose:** Singleton service for API communication and real-time updates

**Methods:**
- `fetchServers()` - GET all servers
- `fetchServerById(id)` - GET specific server
- `connectToStatusUpdates(callback)` - Connect to SSE stream
- `disconnect()` - Close SSE connection
- `getServers()` - Get local server cache

**Features:**
- EventSource (SSE) connection management
- Automatic reconnection on error (5s delay)
- Local server state cache (Map)
- Event handling for status changes and disk updates
- Audio notifications on status changes

**Event Types Handled:**
- `connected` - Initial connection
- `initial` - Initial server data
- `statusChange` - Server online/offline changes
- `diskUpdate` - Disk space updates
- `heartbeat` - Keep-alive messages

---

### audioService

**File:** `src/services/audioService.ts`

**Purpose:** Audio notification service for server status changes

**Methods:**
- `playOnlineSound()` - Play sound when server comes online
- `playOfflineSound()` - Play sound when server goes offline

**Integration:** Called by apiService on status change events

---

## Styling Approach

### Tailwind CSS Configuration

**Custom Theme Extensions:**
- **Font Family:** Aller, Aller Display
- **Animations:**
  - `pulse-glow` - Standard pulse
  - `glow-pulse-red-slow` - Red glow (5s)
  - `glow-pulse-red-fast` - Red glow (1s)
  - `glow-pulse-orange-slow` - Orange glow (5s)
  - `glow-pulse-orange-fast` - Orange glow (1s)

**Color Palette:**
- Green (online): Tailwind green-200/400/700/900
- Red (offline/critical): Tailwind red-200/400/700/900
- Orange (warning): Tailwind orange-100/300/800
- Gray (neutral): Tailwind gray-100/300/800
- Container background: `#888b8d`

---

## Data Flow

1. **Dashboard** mounts and fetches initial server data via `apiService.fetchServers()`
2. **Dashboard** connects to SSE stream via `apiService.connectToStatusUpdates()`
3. **apiService** receives events and updates local Map cache
4. **apiService** triggers callback with updated server array
5. **Dashboard** updates state, re-rendering **ServerContainer** components
6. **ServerContainer** renders **DeviceCard** components with latest data
7. **DeviceCard** displays server status and disk info with appropriate styling

---

## Responsive Layout

**Dashboard Grid:**
- Full viewport height with overflow hidden
- 4 rows with flex-1 (equal height distribution)
- Gap between rows: 1rem
- Padding: 1rem

**Container Flex Sizing:**
- Each container uses `flex: {serverCount}` for proportional width
- Example: Container with 4 servers gets `flex: 4`, container with 2 gets `flex: 2`

**Result:** Servers are evenly distributed within each container, containers are proportionally sized

---

## Component Categories

### Layout Components
- Dashboard (main layout)
- ServerContainer (grouping layout)

### Display Components
- DeviceCard (data display with state)
- StatusIndicator (simple indicator)

### Service Layer
- apiService (data fetching, SSE)
- audioService (notifications)

---

## Reusability

**Highly Reusable:**
- StatusIndicator (pure presentation)
- DeviceCard (configurable via props)
- ServerContainer (configurable grid)

**Application-Specific:**
- Dashboard (hardcoded server grouping logic)

**Potential Improvements:**
- Extract server grouping logic to configuration
- Make container organization data-driven
- Add PropTypes or stricter TypeScript validation
