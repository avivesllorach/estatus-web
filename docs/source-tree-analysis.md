# Source Tree Analysis

## Project Structure

```
estatus-web/                           # Root - Multi-part repository
│
├── frontend (Part 1: Web Application) # React + Vite frontend
│   ├── src/                           # Frontend source code
│   │   ├── components/                # React UI components
│   │   │   ├── Dashboard.tsx          # Main dashboard orchestrator
│   │   │   ├── ServerContainer.tsx    # Server grouping component
│   │   │   ├── DeviceCard.tsx         # Individual server card display
│   │   │   └── StatusIndicator.tsx    # Status visualization
│   │   │
│   │   ├── services/                  # Frontend services layer
│   │   │   ├── api.ts                 # API client & SSE connection manager
│   │   │   └── audioService.ts        # Audio notifications for status changes
│   │   │
│   │   ├── data/                      # Static data
│   │   │   └── sampleServers.ts       # Sample/test server data
│   │   │
│   │   ├── App.tsx                    # Root React component
│   │   ├── App.css                    # Application styles
│   │   └── main.tsx                   # ⭐ ENTRY POINT - Vite/React bootstrap
│   │
│   ├── public/                        # Static assets (if exists)
│   │
│   ├── index.html                     # HTML entry point
│   ├── vite.config.ts                 # Vite bundler configuration
│   ├── tailwind.config.js             # Tailwind CSS configuration
│   ├── postcss.config.js              # PostCSS configuration
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── tsconfig.node.json             # TypeScript config for Node scripts
│   ├── package.json                   # Frontend dependencies
│   └── package-lock.json
│
└── backend/ (Part 2: API Server)      # Express REST API + monitoring service
    ├── src/                           # Backend source code
    │   ├── routes/                    # API route handlers
    │   │   ├── servers.ts             # Server status endpoints
    │   │   └── events.ts              # SSE real-time events endpoint
    │   │
    │   ├── services/                  # Business logic services
    │   │   ├── pingService.ts         # Ping monitoring & event emission
    │   │   ├── snmpService.ts         # SNMP disk monitoring
    │   │   └── netappService.ts       # NetApp API integration
    │   │
    │   ├── types/                     # TypeScript type definitions
    │   │   ├── server.ts              # Server, API, status types
    │   │   └── net-snmp.d.ts          # SNMP library type declarations
    │   │
    │   ├── config/                    # Configuration constants
    │   │   └── constants.ts           # PORT, CORS_ORIGIN, etc.
    │   │
    │   └── server.ts                  # ⭐ ENTRY POINT - Express app bootstrap
    │
    ├── servers.json                   # 🔧 Server configuration file
    ├── package.json                   # Backend dependencies
    ├── package-lock.json
    └── tsconfig.json                  # TypeScript configuration

```

---

## Critical Folders

### Frontend Critical Directories

**`src/components/`**
- **Purpose:** React UI components for server monitoring dashboard
- **Key Files:**
  - `Dashboard.tsx` - Main layout, server grouping, SSE integration
  - `ServerContainer.tsx` - Logical server grouping with title
  - `DeviceCard.tsx` - Individual server status display with disk info
  - `StatusIndicator.tsx` - Visual status indicator
- **Pattern:** Component-based architecture, functional components with hooks

**`src/services/`**
- **Purpose:** Frontend service layer for API communication
- **Key Files:**
  - `api.ts` - API client, SSE connection manager, local state cache
  - `audioService.ts` - Audio notifications for server status changes
- **Pattern:** Singleton services, EventSource (SSE) management

**`src/data/`**
- **Purpose:** Static/sample data
- **Files:** `sampleServers.ts` - Test data for development

---

### Backend Critical Directories

**`backend/src/routes/`**
- **Purpose:** Express route handlers for REST API
- **Key Files:**
  - `servers.ts` - GET /api/servers, GET /api/servers/:id, GET /api/servers/stats/summary
  - `events.ts` - GET /api/events (Server-Sent Events for real-time updates)
- **Pattern:** Factory functions returning Express Routers

**`backend/src/services/`**
- **Purpose:** Business logic and external integrations
- **Key Files:**
  - `pingService.ts` - Core monitoring service (ping, EventEmitter, state management)
  - `snmpService.ts` - SNMP v2c client for disk space monitoring
  - `netappService.ts` - NetApp REST/ZAPI integration for LUN monitoring
- **Pattern:** Class-based services, dependency injection

**`backend/src/types/`**
- **Purpose:** TypeScript type definitions
- **Key Files:**
  - `server.ts` - ServerConfig, ServerStatus, DiskInfo, ApiResponse, etc.
  - `net-snmp.d.ts` - Type declarations for net-snmp library
- **Pattern:** Shared type definitions for type safety

**`backend/src/config/`**
- **Purpose:** Application configuration constants
- **Files:** `constants.ts` - PORT, CORS_ORIGIN
- **Pattern:** Centralized configuration with environment variable fallbacks

---

## Entry Points

### Frontend Entry Point
**File:** `src/main.tsx`
- Bootstraps React application
- Mounts root `<App />` component to DOM
- Imports global CSS

### Backend Entry Point
**File:** `backend/src/server.ts`
- Creates Express application
- Loads server configuration from `servers.json`
- Initializes PingService with loaded servers
- Sets up routes, middleware, error handling
- Starts Express server on PORT (default: 3001)

---

## Integration Points

### Frontend → Backend
**Communication:** HTTP + Server-Sent Events (SSE)

**API Endpoints Called:**
- `GET /api/servers` - Fetch all server statuses (initial load)
- `GET /api/servers/:id` - Fetch specific server (not currently used)
- `GET /api/events` - SSE stream for real-time updates

**Data Flow:**
1. Frontend fetches initial data via REST
2. Frontend connects to SSE stream
3. Backend pushes status changes to all connected clients
4. Frontend updates local state cache and re-renders

**Proxy Configuration:**
- Vite dev server proxies `/api/*` to `http://localhost:3001`
- Configured in `vite.config.ts`

---

## Configuration Files

### Frontend Configuration
- **package.json** - React, TypeScript, Vite, Tailwind dependencies
- **vite.config.ts** - Dev server, proxy to backend API
- **tsconfig.json** - Strict TypeScript, React JSX transform
- **tailwind.config.js** - Custom fonts (Aller), animations, theme extensions
- **postcss.config.js** - Tailwind and Autoprefixer plugins

### Backend Configuration
- **package.json** - Express, CORS, net-snmp, ping dependencies
- **tsconfig.json** - CommonJS output, strict mode
- **servers.json** - Server list with SNMP/NetApp configuration

---

## Multi-Part Architecture

**Repository Type:** Multi-part (Frontend + Backend in same repo)

**Part Organization:**
- **Root level:** Frontend code (Vite/React SPA)
- **backend/ subdirectory:** Backend code (Express API)

**Advantages:**
- Shared TypeScript types (can be extracted to shared/ later)
- Unified version control
- Simple deployment coordination

**Separation:**
- Separate package.json files
- Independent build processes
- Different tech stacks (Vite vs Express)

---

## Development Workflow Indicators

**Frontend Development:**
```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # TypeScript compile + Vite build
npm run lint         # ESLint check
```

**Backend Development:**
```bash
cd backend
npm run dev          # Start with tsx watch (hot reload)
npm run build        # TypeScript compile to dist/
npm start            # Run compiled JavaScript
npm run lint         # ESLint check
```

---

## Key Observations

1. **Clean Separation:** Frontend and backend are logically separated with clear boundaries
2. **Type Safety:** Both parts use TypeScript with strict mode
3. **Real-time Architecture:** SSE provides one-way server→client push without WebSocket complexity
4. **Service Layer:** Both frontend and backend have well-defined service abstractions
5. **Configuration-Driven:** Backend loads server list from JSON, frontend organizes via hardcoded logic
6. **Monitoring Focus:** Application is purpose-built for server status monitoring with ping, SNMP, and NetApp integration
7. **Custom Design System:** Tailwind extended with custom Aller fonts and glow animations

---

## Potential Improvements

- Extract shared types to `shared/` or `common/` directory
- Move frontend server grouping logic to configuration
- Add API documentation (OpenAPI/Swagger)
- Consider monorepo tooling (Turborepo, Nx) for better workspace management
- Add testing directories (currently no test files detected)
